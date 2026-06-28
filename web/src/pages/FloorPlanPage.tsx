import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, Volume2, Settings, 
  Activity, ArrowRight, Sparkles, Building, Lock, X, AlertCircle
} from "lucide-react";
import { Button } from "@nous-research/ui/ui/components/button";
import { Typography } from "@nous-research/ui/ui/components/typography/index";
import { api, fetchJSON } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Subagent {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "blocked" | "completed";
  room: string;
}

interface KanbanTask {
  id: string;
  title: string;
  status: string;
  assignee?: string;
}

export default function FloorPlanPage() {
  // State for locking/security
  const [isLocked, setIsLocked] = useState(true);
  const [secretInput, setSecretInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isListeningForClaps, setIsListeningForClaps] = useState(false);
  const [clapsDetected, setClapsDetected] = useState(0);

  // Connection settings modal
  const [showConnSettings, setShowConnSettings] = useState(false);
  const [connUrl, setConnUrl] = useState(() => localStorage.getItem("hermes.backendUrl") || "");
  const [connToken, setConnToken] = useState(() => localStorage.getItem("hermes.backendToken") || "");

  // Core metrics & data
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [subagents, setSubagents] = useState<Subagent[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  // Chat & Voice Assistant state
  const [isRecording, setIsRecording] = useState(false);
  const [assistantText, setAssistantText] = useState("System standby. Awaiting authentication...");
  const [transcriptText, setTranscriptText] = useState("");
  const [voiceVolume, setVoiceVolume] = useState(0);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Load backend data
  const loadData = async () => {
    try {
      // Fetch system status
      const statusRes = await api.getStatus();
      setSystemStatus(statusRes);

      // Fetch sessions (mapped to active subagents)
      const sessionsRes = await api.getSessions(50, 0);
      const activeAgents: Subagent[] = (sessionsRes.sessions || []).map((s: any) => {
        const titleLower = (s.title || "").toLowerCase();
        let room = "Boardroom";
        
        if (titleLower.includes("content") || titleLower.includes("write") || titleLower.includes("article") || titleLower.includes("post")) {
          room = "Content";
        } else if (titleLower.includes("marketing") || titleLower.includes("sales") || titleLower.includes("lead") || titleLower.includes("campaign")) {
          room = "Marketing & Sales";
        } else if (titleLower.includes("social") || titleLower.includes("twitter") || titleLower.includes("x.com") || titleLower.includes("instagram") || titleLower.includes("telegram")) {
          room = "Social Media";
        } else if (titleLower.includes("creative") || titleLower.includes("design") || titleLower.includes("art") || titleLower.includes("logo") || titleLower.includes("image")) {
          room = "Creativity";
        } else if (titleLower.includes("security") || titleLower.includes("audit") || titleLower.includes("firewall") || titleLower.includes("sandbox") || titleLower.includes("osint")) {
          room = "Security";
        } else if (titleLower.includes("brainstorm") || titleLower.includes("concept") || titleLower.includes("mindmap") || titleLower.includes("idea")) {
          room = "Brainstorming";
        } else if (titleLower.includes("research") || titleLower.includes("paper") || titleLower.includes("arxiv") || titleLower.includes("literature") || titleLower.includes("pubmed")) {
          room = "Research";
        } else if (titleLower.includes("kanban") || titleLower.includes("task") || titleLower.includes("project") || titleLower.includes("sprint") || titleLower.includes("operations")) {
          room = "Operations";
        } else if (titleLower.includes("fleet") || titleLower.includes("subagent") || titleLower.includes("worker") || titleLower.includes("agent")) {
          room = "Sub-agent Fleet";
        } else if (titleLower.includes("finance") || titleLower.includes("pay") || titleLower.includes("wallet") || titleLower.includes("bank") || titleLower.includes("invoice") || titleLower.includes("crypto")) {
          room = "Finance";
        }
        
        return {
          id: s.id,
          name: s.title || "Subagent",
          role: s.source || "Worker",
          status: s.is_active ? "running" : "idle",
          room: room
        };
      });
      setSubagents(activeAgents);

      // Fetch Kanban tasks
      try {
        const kanbanRes = await fetchJSON<any>("/api/plugins/kanban/board");
        if (kanbanRes && kanbanRes.tasks) {
          const tasks: KanbanTask[] = kanbanRes.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            assignee: t.assignee
          }));
          setKanbanTasks(tasks);
        }
      } catch (err) {
        console.warn("Failed to fetch kanban board from plugins API:", err);
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  useEffect(() => {
    if (!isLocked) {
      loadData();
      const interval = setInterval(loadData, 8000);
      return () => clearInterval(interval);
    }
  }, [isLocked]);

  // Audio Analyzer for Voice Level / Clap detection
  const startAudioAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastPeakTime = 0;
      let claps = 0;

      const detectClaps = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const volume = sum / bufferLength;
        setVoiceVolume(volume);

        // Clap detection: sharp spike above threshold
        const threshold = 70;
        const now = Date.now();
        if (volume > threshold && now - lastPeakTime > 250) {
          lastPeakTime = now;
          claps += 1;
          setClapsDetected(claps);
          speakAssistant("Pulse detected");
          
          if (claps >= 2) {
            claps = 0;
            setClapsDetected(0);
            stopAudioAnalyzer();
            triggerWakeUp();
          }
        }
        
        if (isLocked) {
          requestAnimationFrame(detectClaps);
        }
      };

      setIsListeningForClaps(true);
      requestAnimationFrame(detectClaps);

    } catch (err) {
      console.error("Error accessing mic for clap detection:", err);
      setIsListeningForClaps(false);
    }
  };

  const stopAudioAnalyzer = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListeningForClaps(false);
    setClapsDetected(0);
  };

  // Text/Voice Activation
  const triggerWakeUp = () => {
    setIsLocked(false);
    setUnlockError("");
    speakAssistant("Welcome back, Chief. All agent departments are standing by. Initiating systems scan...");
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = secretInput.toLowerCase().trim();
    if (cleanInput.includes("wake up") || cleanInput === "1" || cleanInput.includes("work")) {
      triggerWakeUp();
    } else {
      setUnlockError("Access Denied. Secret activation phrase incorrect.");
    }
  };

  // Text-To-Speech
  const speakAssistant = (text: string) => {
    setAssistantText(text);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      
      // Select a male voice if available (user preference)
      const voices = window.speechSynthesis.getVoices();
      const maleVoice = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        return v.lang.startsWith("en") && (
          nameLower.includes("male") || 
          nameLower.includes("david") || 
          nameLower.includes("mark") || 
          nameLower.includes("george") ||
          nameLower.includes("ravi") || 
          nameLower.includes("harry") || 
          nameLower.includes("guy")
        );
      });

      if (maleVoice) {
        utterance.voice = maleVoice;
      } else {
        const preferredVoice = voices.find(v => 
          (v.name.includes("Google") || v.name.includes("Natural")) && v.lang.startsWith("en")
        );
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // Speech-To-Text (Browser Web Speech API)
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakAssistant("Speech recognition is not supported on this browser.");
      return;
    }

    if (isRecording) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setTranscriptText("Listening...");
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscriptText(text);
        speakAssistant("Processing your command...");
        
        // Send command to remote active session
        try {
          const sessions = await api.getSessions(5, 0);
          if (sessions && sessions.sessions && sessions.sessions.length > 0) {
            const activeSessionId = sessions.sessions[0].id;
            const res = await fetchJSON<any>(`/api/sessions/${encodeURIComponent(activeSessionId)}/prompt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: text })
            });
            
            if (res && res.response) {
              const summary = res.response.substring(0, 150) + (res.response.length > 150 ? "..." : "");
              speakAssistant(summary);
            } else {
              speakAssistant("Command processed successfully.");
            }
          } else {
            speakAssistant("No active AI session found to route the command.");
          }
        } catch (err) {
          console.error("Failed to route voice command to remote agent:", err);
          speakAssistant("Failed to communicate with remote agent.");
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
        speakAssistant("Sorry, I could not hear you clearly.");
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      speechRecognitionRef.current = rec;
      rec.start();
    }
  };

  // Rooms Data Grouping
  const getRoomTasks = (roomName: string) => {
    return kanbanTasks.filter(t => {
      const titleLower = t.title.toLowerCase();
      if (roomName === "Content") return titleLower.includes("content") || titleLower.includes("write") || titleLower.includes("article") || titleLower.includes("post");
      if (roomName === "Marketing & Sales") return titleLower.includes("marketing") || titleLower.includes("sales") || titleLower.includes("lead") || titleLower.includes("campaign");
      if (roomName === "Social Media") return titleLower.includes("social") || titleLower.includes("twitter") || titleLower.includes("x.com") || titleLower.includes("instagram") || titleLower.includes("telegram");
      if (roomName === "Creativity") return titleLower.includes("creative") || titleLower.includes("design") || titleLower.includes("art") || titleLower.includes("logo") || titleLower.includes("image");
      if (roomName === "Security") return titleLower.includes("security") || titleLower.includes("audit") || titleLower.includes("firewall") || titleLower.includes("sandbox") || titleLower.includes("osint");
      if (roomName === "Brainstorming") return titleLower.includes("brainstorm") || titleLower.includes("concept") || titleLower.includes("mindmap") || titleLower.includes("idea");
      if (roomName === "Research") return titleLower.includes("research") || titleLower.includes("paper") || titleLower.includes("arxiv") || titleLower.includes("literature") || titleLower.includes("pubmed");
      if (roomName === "Operations") return titleLower.includes("kanban") || titleLower.includes("task") || titleLower.includes("project") || titleLower.includes("sprint") || titleLower.includes("operations");
      if (roomName === "Sub-agent Fleet") return titleLower.includes("fleet") || titleLower.includes("subagent") || titleLower.includes("worker") || titleLower.includes("agent");
      if (roomName === "Finance") return titleLower.includes("finance") || titleLower.includes("pay") || titleLower.includes("wallet") || titleLower.includes("bank") || titleLower.includes("invoice") || titleLower.includes("crypto");
      return false;
    });
  };

  const getRoomWorkers = (roomName: string) => {
    return subagents.filter(s => s.room === roomName);
  };

  const handleSaveConn = () => {
    if (connUrl.trim()) {
      localStorage.setItem("hermes.backendUrl", connUrl.trim());
    } else {
      localStorage.removeItem("hermes.backendUrl");
    }
    if (connToken.trim()) {
      localStorage.setItem("hermes.backendToken", connToken.trim());
    } else {
      localStorage.removeItem("hermes.backendToken");
    }
    setShowConnSettings(false);
    window.location.reload();
  };

  const handleClearConn = () => {
    localStorage.removeItem("hermes.backendUrl");
    localStorage.removeItem("hermes.backendToken");
    setConnUrl("");
    setConnToken("");
    setShowConnSettings(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030712] text-slate-100 p-6 font-sans relative overflow-hidden">
      
      {/* 0. INJECTED STYLES FOR FUTURISTIC BLUEPRINTS */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0.05; }
          50% { opacity: 0.35; }
          100% { transform: translateY(480px); opacity: 0.05; }
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 1px var(--glow-color)); opacity: 0.65; }
          50% { filter: drop-shadow(0 0 8px var(--glow-color)); opacity: 0.95; }
        }
        @keyframes waveMove {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
        @keyframes idleWave {
          0%, 100% { transform: scaleY(0.15); }
          50% { transform: scaleY(0.5); }
        }
        .laser-scan-line {
          animation: scan 6s linear infinite;
        }
        .active-pulse {
          animation: pulseGlow 2.5s infinite ease-in-out;
        }
        .wave-bar {
          animation: waveMove 1s infinite ease-in-out;
          transform-origin: bottom;
        }
        .idle-wave-bar {
          animation: idleWave 2.5s infinite ease-in-out;
          transform-origin: bottom;
        }
        .blueprint-card {
          background: rgba(17, 24, 39, 0.35);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .blueprint-card-interactive:hover {
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px 0 rgba(99, 102, 241, 0.08);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Background Cyber-Mesh Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* 1. LOCKSCREEN OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712]/95 backdrop-blur-2xl transition-all duration-700">
          <div className="p-8 max-w-md w-full bg-slate-900/30 border border-white/5 rounded-3xl shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            
            <div className="flex justify-center">
              <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-pulse">
                <Lock className="w-12 h-12 text-blue-400/90" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Typography className="text-white font-bold tracking-wider text-2xl font-mono">
                CHIEF-HUB SECURE PORTAL
              </Typography>
              <Typography className="text-slate-400 text-xs">
                Scan command authorization or verify dual-clap key to access.
              </Typography>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="AUTHENTICATION PHRASE..."
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                className="w-full bg-[#070b14] border border-white/10 focus:border-blue-500/50 text-slate-200 px-4 py-3 rounded-xl outline-none text-center tracking-widest text-xs font-mono"
              />
              
              {unlockError && (
                <div className="flex items-center justify-center space-x-2 text-red-400/90 text-xs font-mono">
                  <AlertCircle className="w-4 h-4" />
                  <span>{unlockError}</span>
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600/80 hover:bg-blue-500 text-white rounded-xl py-3 text-xs tracking-wider font-mono">
                INITIALIZE HUB <ArrowRight className="ml-2 w-4 h-4 inline" />
              </Button>
            </form>

            <div className="border-t border-white/5 pt-4 flex flex-col items-center space-y-3">
              {!isListeningForClaps ? (
                <Button 
                  onClick={startAudioAnalyzer} 
                  outlined
                  className="border-white/5 text-slate-300 hover:bg-white/5 rounded-xl text-xs font-mono"
                >
                  <Mic className="w-3.5 h-3.5 mr-2" /> WAKE-ON-VOICE
                </Button>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-3 text-emerald-400 text-xs font-mono animate-pulse">
                    <Activity className="w-3.5 h-3.5" />
                    <span>LISTENING... ({clapsDetected}/2 PULSES)</span>
                  </div>
                  <div className="w-32 bg-[#070b14] h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-emerald-500/80 h-full transition-all duration-75"
                      style={{ width: `${Math.min(100, voiceVolume * 1.5)}%` }}
                    />
                  </div>
                  <Button 
                    onClick={stopAudioAnalyzer} 
                    outlined
                    className="border-red-950/40 text-red-400 hover:bg-red-950/20 rounded-xl py-1 text-[10px] font-mono"
                  >
                    ABORT SCAN
                  </Button>
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={() => setShowConnSettings(true)} 
                ghost
                className="text-slate-500 hover:text-slate-300 text-[10px] font-mono"
              >
                <Settings className="w-3 h-3 mr-1" /> CONFIG REMOTE IP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 mb-6 z-10">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.05)]">
            <Building className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <Typography className="text-white font-bold tracking-wider text-xl font-mono">
              FLEET OPERATING SYSTEM // BLUEPRINT
            </Typography>
            <Typography className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-0.5">
              Autonomous Fleet Orchestrator & Live Diagnostic Console
            </Typography>
          </div>
        </div>

        {/* System Stats & Connection Badges */}
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <Button 
            onClick={() => setShowConnSettings(true)} 
            outlined
            className="border-white/5 hover:bg-white/5 text-slate-450 rounded-xl p-2 text-xs font-mono"
          >
            <Settings className="w-3.5 h-3.5 mr-2" /> PORTAL CONFIG
          </Button>

          {systemStatus && (
            <div className="flex items-center space-x-4 bg-slate-900/10 border border-white/5 rounded-2xl p-3 text-xs font-mono">
              <div className="text-slate-400 space-y-1">
                <div>PROFILE: <span className="text-indigo-400 font-bold">{systemStatus.active_profile || "chief-hub"}</span></div>
                <div>CORE: <span className="text-indigo-450 font-bold">Minimax-M3</span></div>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="text-slate-400 space-y-1">
                <div>SYS-CPU: <span className="text-white font-bold">{systemStatus.cpu_percent || 0}%</span></div>
                <div>SYS-RAM: <span className="text-white font-bold">{systemStatus.ram_percent || 0}%</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. ASSISTANT VOICE PANEL */}
      <div className="blueprint-card rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 z-10">
        <div className="flex items-center space-x-4 w-full md:w-2/3">
          <div className={cn(
            "p-3 rounded-full border transition-all duration-300 shadow-md",
            isRecording 
              ? "bg-red-500/5 border-red-500/20 text-red-400 animate-pulse" 
              : "bg-indigo-500/5 border-indigo-500/10 text-indigo-400"
          )}>
            {isRecording ? <Volume2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest">A.I. FLEET CAPTAIN (MALE VOICE ACTIVE)</div>
            <div className="text-slate-200 font-mono text-sm leading-relaxed">{assistantText}</div>
            {transcriptText && (
              <div className="text-xs text-slate-500 font-mono">Input Captured: "{transcriptText}"</div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Animated Waveform Visualizer */}
          <div className="flex items-end space-x-1 h-6 w-16 px-2">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1 rounded-full",
                  isRecording ? "bg-red-500 wave-bar" : "bg-indigo-500 idle-wave-bar"
                )} 
                style={{ 
                  height: "100%",
                  animationDelay: `${i * 0.15}s`,
                  filter: isRecording ? "drop-shadow(0 0 3px rgba(239, 68, 68, 0.5))" : "drop-shadow(0 0 3px rgba(99, 102, 241, 0.5))"
                }} 
              />
            ))}
          </div>

          <Button 
            onClick={toggleRecording} 
            className={cn(
              "rounded-xl px-5 py-3 text-xs font-mono font-semibold text-white transition-all",
              isRecording 
                ? "bg-red-600/80 hover:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                : "bg-indigo-600/80 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            )}
          >
            {isRecording ? <MicOff className="w-4 h-4 mr-2 inline" /> : <Mic className="w-4 h-4 mr-2 inline" />}
            {isRecording ? "STOP AUTH" : "TRANSMIT"}
          </Button>
        </div>
      </div>

      {/* 4. MAIN OFFICE FLOOR PLAN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
        
        {/* Floor Visualizer Map (2 columns width) */}
        <div className="lg:col-span-2 blueprint-card rounded-3xl p-6 relative overflow-hidden min-h-[500px]">
          <div className="absolute top-4 left-4 text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-ping" />
            <span>OPERATIONS BLUEPRINT // SCANNER SWEEP</span>
          </div>

          {/* SVG Floor Map */}
          <div className="flex items-center justify-center h-full mt-6">
            <svg viewBox="0 0 800 500" className="w-full h-auto max-w-[750px]">
              
              {/* Defs for Grid Pattern and Accents */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.75" />
                </pattern>
                
                {/* Glow Filter for pulsating status nodes */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background */}
              <rect width="800" height="500" fill="url(#grid)" />

              {/* Outer Blueprint Frame */}
              <rect x="10" y="10" width="780" height="480" rx="15" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" strokeDasharray="5 5" />
              <rect x="15" y="15" width="770" height="470" rx="12" fill="none" stroke="rgba(99, 102, 241, 0.08)" strokeWidth="1" />
              
              {/* ──────────────────────────────────────────────────────── */}
              {/* ROW 1 (y: 30 to 180, h: 150) */}
              {/* ──────────────────────────────────────────────────────── */}
              
              {/* Room 1: Content Pod */}
              <g 
                onClick={() => setActiveRoom("Content")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(99, 102, 241, 0.6)" } as React.CSSProperties}
              >
                <rect x="30" y="30" width="140" height="150" rx="8" 
                  fill={activeRoom === "Content" ? "rgba(99, 102, 241, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Content" ? "#6366f1" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Visual furniture inside room */}
                <rect x="40" y="85" width="22" height="12" rx="1.5" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="0.75" />
                <rect x="108" y="85" width="22" height="12" rx="1.5" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="0.75" />
                
                <text x="40" y="55" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold" fontFamily="monospace">01 // CONTENT</text>
                {getRoomWorkers("Content").some(w => w.status === "running") && (
                  <circle cx="150" cy="50" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="65" cy="115" r="10" fill="rgba(99, 102, 241, 0.1)" stroke="rgba(99, 102, 241, 0.3)" />
                <text x="62" y="118" fill="#6366f1" fontSize="9" fontWeight="bold" fontFamily="monospace">C</text>
                <text x="40" y="155" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Content").length}
                </text>
              </g>

              {/* Room 2: Marketing & Sales */}
              <g 
                onClick={() => setActiveRoom("Marketing & Sales")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(236, 72, 153, 0.6)" } as React.CSSProperties}
              >
                <rect x="185" y="30" width="140" height="150" rx="8" 
                  fill={activeRoom === "Marketing & Sales" ? "rgba(236, 72, 153, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Marketing & Sales" ? "#ec4899" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                {/* Visual line graph blueprint */}
                <path d="M 205 125 L 230 100 L 255 115 L 290 85" fill="none" stroke="rgba(236, 72, 153, 0.15)" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="290" cy="85" r="2.5" fill="#ec4899" fillOpacity="0.4" />
                
                <text x="195" y="55" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold" fontFamily="monospace">02 // MARKETING</text>
                {getRoomWorkers("Marketing & Sales").some(w => w.status === "running") && (
                  <circle cx="305" cy="50" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="220" cy="115" r="10" fill="rgba(236, 72, 153, 0.1)" stroke="rgba(236, 72, 153, 0.3)" />
                <text x="216" y="118" fill="#ec4899" fontSize="9" fontWeight="bold" fontFamily="monospace">M</text>
                <text x="195" y="155" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Marketing & Sales").length}
                </text>
              </g>

              {/* Room 3: Social Media Pod */}
              <g 
                onClick={() => setActiveRoom("Social Media")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(14, 165, 233, 0.6)" } as React.CSSProperties}
              >
                <rect x="340" y="30" width="140" height="150" rx="8" 
                  fill={activeRoom === "Social Media" ? "rgba(14, 165, 233, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Social Media" ? "#0ea5e9" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Dialogue bubble decoration */}
                <rect x="360" y="95" width="24" height="12" rx="2.5" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(14, 165, 233, 0.2)" strokeWidth="0.75" />
                <path d="M 368 107 L 372 113 L 376 107" fill="rgba(17, 24, 39, 0.45)" stroke="rgba(14, 165, 233, 0.2)" strokeWidth="0.75" />

                <text x="350" y="55" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold" fontFamily="monospace">03 // SOCIAL</text>
                {getRoomWorkers("Social Media").some(w => w.status === "running") && (
                  <circle cx="460" cy="50" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="375" cy="115" r="10" fill="rgba(14, 165, 233, 0.1)" stroke="rgba(14, 165, 233, 0.3)" />
                <text x="371" y="118" fill="#0ea5e9" fontSize="9" fontWeight="bold" fontFamily="monospace">S</text>
                <text x="350" y="155" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Social Media").length}
                </text>
              </g>

              {/* Room 4: Creativity Studio */}
              <g 
                onClick={() => setActiveRoom("Creativity")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(168, 85, 247, 0.6)" } as React.CSSProperties}
              >
                <rect x="495" y="30" width="140" height="150" rx="8" 
                  fill={activeRoom === "Creativity" ? "rgba(168, 85, 247, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Creativity" ? "#a855f7" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Palette ring decoration */}
                <circle cx="590" cy="95" r="12" fill="none" stroke="rgba(168, 85, 247, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
                
                <text x="505" y="55" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold" fontFamily="monospace">04 // CREATIVE</text>
                {getRoomWorkers("Creativity").some(w => w.status === "running") && (
                  <circle cx="615" cy="50" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="530" cy="115" r="10" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" />
                <text x="526" y="118" fill="#a855f7" fontSize="9" fontWeight="bold" fontFamily="monospace">A</text>
                <text x="505" y="155" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Creativity").length}
                </text>
              </g>

              {/* Room 5: Brainstorming Zone */}
              <g 
                onClick={() => setActiveRoom("Brainstorming")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(20, 184, 166, 0.6)" } as React.CSSProperties}
              >
                <rect x="650" y="30" width="120" height="150" rx="8" 
                  fill={activeRoom === "Brainstorming" ? "rgba(20, 184, 166, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Brainstorming" ? "#20b8a6" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Node tree diagram */}
                <circle cx="710" cy="100" r="4" fill="rgba(20, 184, 166, 0.3)" />
                <line x1="710" y1="100" x2="685" y2="90" stroke="rgba(20, 184, 166, 0.15)" strokeWidth="0.75" />
                <line x1="710" y1="100" x2="735" y2="90" stroke="rgba(20, 184, 166, 0.15)" strokeWidth="0.75" />
                <circle cx="685" cy="90" r="2.5" fill="rgba(20, 184, 166, 0.2)" />
                <circle cx="735" cy="90" r="2.5" fill="rgba(20, 184, 166, 0.2)" />

                <text x="658" y="55" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold" fontFamily="monospace">05 // BRAIN</text>
                {getRoomWorkers("Brainstorming").some(w => w.status === "running") && (
                  <circle cx="750" cy="50" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="680" cy="115" r="10" fill="rgba(20, 184, 166, 0.1)" stroke="rgba(20, 184, 166, 0.3)" />
                <text x="676" y="118" fill="#20b8a6" fontSize="9" fontWeight="bold" fontFamily="monospace">B</text>
                <text x="658" y="155" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Brainstorming").length}
                </text>
              </g>

              {/* ──────────────────────────────────────────────────────── */}
              {/* ROW 2 (y: 200 to 320, h: 120) */}
              {/* ──────────────────────────────────────────────────────── */}

              {/* Room 6: Security Fort */}
              <g 
                onClick={() => setActiveRoom("Security")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(239, 68, 68, 0.6)" } as React.CSSProperties}
              >
                <rect x="30" y="200" width="180" height="120" rx="8" 
                  fill={activeRoom === "Security" ? "rgba(239, 68, 68, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Security" ? "#ef4444" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Shield schematic */}
                <path d="M 125 250 L 140 235 L 155 250 L 148 275 L 125 250 Z" fill="none" stroke="rgba(239, 68, 68, 0.1)" strokeWidth="1" />
                
                <text x="45" y="225" fill="rgba(255,255,255,0.4)" fontSize="11" fontWeight="bold" fontFamily="monospace">06 // SECURITY FORT</text>
                {getRoomWorkers("Security").some(w => w.status === "running") && (
                  <circle cx="190" cy="220" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="60" cy="265" r="10" fill="rgba(239, 68, 68, 0.1)" stroke="rgba(239, 68, 68, 0.3)" />
                <text x="56" y="268" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="monospace">S</text>
                <text x="45" y="300" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Security").length}
                </text>
              </g>

              {/* Room 7: Boardroom (Center Oval) */}
              <g 
                onClick={() => setActiveRoom("Boardroom")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(16, 185, 129, 0.6)" } as React.CSSProperties}
              >
                <ellipse cx="400" cy="260" rx="150" ry="55" 
                  fill={activeRoom === "Boardroom" ? "rgba(16, 185, 129, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Boardroom" ? "#10b981" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Conference table schematic */}
                <ellipse cx="400" cy="260" rx="70" ry="25" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1" strokeDasharray="3 2" />
                
                <text x="350" y="255" fill="rgba(255,255,255,0.4)" fontSize="13" fontWeight="bold" fontFamily="monospace">00 // BOARDROOM</text>
                <text x="330" y="275" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  ACTIVE PROFILE: {systemStatus?.active_profile || "chief-hub"}
                </text>
              </g>

              {/* Room 8: Sub-agent Fleet Area */}
              <g 
                onClick={() => setActiveRoom("Sub-agent Fleet")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(249, 115, 22, 0.6)" } as React.CSSProperties}
              >
                <rect x="590" y="200" width="180" height="120" rx="8" 
                  fill={activeRoom === "Sub-agent Fleet" ? "rgba(249, 115, 22, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Sub-agent Fleet" ? "#f97316" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Server tower blueprint */}
                <rect x="670" y="240" width="28" height="42" rx="2" fill="none" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="1.25" />
                <line x1="675" y1="248" x2="693" y2="248" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="1.25" />
                <line x1="675" y1="256" x2="693" y2="256" stroke="rgba(249, 115, 22, 0.12)" strokeWidth="1.25" />
                <circle cx="678" cy="270" r="1.5" fill="#f97316" fillOpacity="0.4" />
                <circle cx="688" cy="270" r="1.5" fill="#10b981" fillOpacity="0.4" />

                <text x="605" y="225" fill="rgba(255,255,255,0.4)" fontSize="11" fontWeight="bold" fontFamily="monospace">07 // FLEET RACKS</text>
                {getRoomWorkers("Sub-agent Fleet").some(w => w.status === "running") && (
                  <circle cx="750" cy="220" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="620" cy="265" r="10" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" />
                <text x="616" y="268" fill="#f97316" fontSize="9" fontWeight="bold" fontFamily="monospace">F</text>
                <text x="605" y="300" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Sub-agent Fleet").length}
                </text>
              </g>

              {/* ──────────────────────────────────────────────────────── */}
              {/* ROW 3 (y: 340 to 470, h: 130) */}
              {/* ──────────────────────────────────────────────────────── */}

              {/* Room 9: Research Lab */}
              <g 
                onClick={() => setActiveRoom("Research")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(56, 189, 248, 0.6)" } as React.CSSProperties}
              >
                <rect x="30" y="340" width="230" height="130" rx="8" 
                  fill={activeRoom === "Research" ? "rgba(56, 189, 248, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Research" ? "#38bdf8" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* DNA helix schematic */}
                <path d="M 120 405 Q 135 390 150 405 T 180 405" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />
                <path d="M 120 395 Q 135 410 150 395 T 180 395" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" />
                
                <text x="45" y="365" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold" fontFamily="monospace">08 // RESEARCH LAB</text>
                {getRoomWorkers("Research").some(w => w.status === "running") && (
                  <circle cx="240" cy="360" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="60" cy="405" r="10" fill="rgba(56, 189, 248, 0.1)" stroke="rgba(56, 189, 248, 0.3)" />
                <text x="56" y="408" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">R</text>
                <text x="45" y="445" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Research").length}
                </text>
              </g>

              {/* Room 10: Operations & Project Management */}
              <g 
                onClick={() => setActiveRoom("Operations")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(59, 130, 246, 0.6)" } as React.CSSProperties}
              >
                <rect x="280" y="340" width="240" height="130" rx="8" 
                  fill={activeRoom === "Operations" ? "rgba(59, 130, 246, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Operations" ? "#3b82f6" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Miniature Kanban board layout inside SVG */}
                <rect x="295" y="385" width="40" height="35" rx="2" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.75" />
                <rect x="345" y="385" width="40" height="35" rx="2" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.75" />
                <rect x="395" y="385" width="40" height="35" rx="2" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.75" />
                <text x="303" y="396" fill="rgba(59, 130, 246, 0.2)" fontSize="5">TODO</text>
                <text x="353" y="396" fill="rgba(59, 130, 246, 0.2)" fontSize="5">DOING</text>
                <text x="403" y="396" fill="rgba(59, 130, 246, 0.2)" fontSize="5">DONE</text>

                <text x="295" y="365" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold" fontFamily="monospace">09 // OPERATIONS & PM</text>
                {getRoomWorkers("Operations").some(w => w.status === "running") && (
                  <circle cx="500" cy="360" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                
                <text x="295" y="445" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  CARDS: {kanbanTasks.length} | AGENTS: {getRoomWorkers("Operations").length}
                </text>
              </g>

              {/* Room 11: Finance Vault */}
              <g 
                onClick={() => setActiveRoom("Finance")} 
                className="cursor-pointer room-group"
                style={{ "--glow-color": "rgba(245, 158, 11, 0.6)" } as React.CSSProperties}
              >
                <rect x="540" y="340" width="230" height="130" rx="8" 
                  fill={activeRoom === "Finance" ? "rgba(245, 158, 11, 0.06)" : "rgba(17, 24, 39, 0.45)"} 
                  stroke={activeRoom === "Finance" ? "#f59e0b" : "rgba(255, 255, 255, 0.05)"} 
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                
                {/* Safe wheel combinations dial blueprint */}
                <circle cx="655" cy="405" r="16" fill="none" stroke="rgba(245, 158, 11, 0.12)" strokeWidth="1" />
                <circle cx="655" cy="405" r="5" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" />

                <text x="555" y="365" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold" fontFamily="monospace">10 // FINANCE VAULT</text>
                {getRoomWorkers("Finance").some(w => w.status === "running") && (
                  <circle cx="750" cy="360" r="4.5" fill="#10b981" filter="url(#glow)" />
                )}
                <circle cx="570" cy="405" r="10" fill="rgba(245, 158, 11, 0.15)" stroke="rgba(245, 158, 11, 0.3)" />
                <text x="566" y="408" fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">F</text>
                <text x="555" y="445" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                  AGENTS: {getRoomWorkers("Finance").length}
                </text>
              </g>

              {/* Sweeping Laser Scanner Line */}
              <line x1="10" y1="10" x2="790" y2="10" 
                stroke="rgba(99, 102, 241, 0.35)" 
                strokeWidth="1.5" 
                className="laser-scan-line" 
                style={{ filter: "drop-shadow(0 0 3px rgba(99, 102, 241, 0.7))" }} 
              />
            </svg>
          </div>
        </div>

        {/* Details & Inspector Sidebar (1 column width) */}
        <div className="blueprint-card rounded-3xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-white/5 pb-3">
              <Typography className="text-white font-bold tracking-wider text-lg font-mono">
                {activeRoom ? `${activeRoom.toUpperCase()} DEPT` : "DIAGNOSTIC PROBE"}
              </Typography>
              <Typography className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-wider">
                {activeRoom ? "Live telemetric link engaged" : "Select room node to initialize capture link"}
              </Typography>
            </div>

            {activeRoom ? (
              <div className="space-y-6 font-mono">
                {/* Active Workers Section */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>AGENT SUBSYSTEMS</span>
                    <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full text-[9px] border border-indigo-500/20">
                      {getRoomWorkers(activeRoom).length}
                    </span>
                  </div>
                  {getRoomWorkers(activeRoom).length === 0 ? (
                    <div className="text-slate-655 text-xs py-2 italic border border-white/2-5 rounded-xl p-3 bg-white/[0.01]">
                      No active taskworkers mapped to this segment.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {getRoomWorkers(activeRoom).map(worker => (
                        <div key={worker.id} className="flex items-center justify-between bg-slate-950/40 border border-white/5 p-3 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              worker.status === "running" ? "bg-emerald-500 animate-ping" : "bg-slate-700"
                            )} />
                            <div>
                              <div className="text-xs text-white font-semibold">{worker.name}</div>
                              <div className="text-[9px] text-slate-500 uppercase tracking-tight">{worker.role}</div>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[8px] font-bold px-2 py-0.5 rounded-full border",
                            worker.status === "running" 
                              ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" 
                              : "bg-slate-800/40 text-slate-400 border-white/5"
                          )}>
                            {worker.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Department Kanban Tasks Section */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>ACTIVE TASKS QUEUE</span>
                    <span className="bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full text-[9px] border border-pink-500/20">
                      {activeRoom === "Operations" ? kanbanTasks.length : getRoomTasks(activeRoom).length}
                    </span>
                  </div>
                  
                  {activeRoom === "Operations" ? (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {["todo", "running", "blocked", "done"].map(columnStatus => {
                        const tasks = kanbanTasks.filter(t => t.status === columnStatus);
                        if (tasks.length === 0) return null;
                        return (
                          <div key={columnStatus} className="space-y-1.5">
                            <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider flex items-center space-x-1.5">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                columnStatus === "running" ? "bg-blue-500" : columnStatus === "done" ? "bg-emerald-500" : "bg-slate-655"
                              )} />
                              <span>{columnStatus} ({tasks.length})</span>
                            </div>
                            {tasks.map(task => (
                              <div key={task.id} className="bg-slate-950/40 border border-white/5 p-2.5 rounded-lg text-xs space-y-1">
                                <div className="text-slate-200 font-medium">{task.title}</div>
                                <div className="text-[9px] text-slate-500">ID: {task.id}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    getRoomTasks(activeRoom).length === 0 ? (
                      <div className="text-slate-655 text-xs py-2 italic border border-white/2-5 rounded-xl p-3 bg-white/[0.01]">
                        Queue vacant. No diagnostic commands active.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {getRoomTasks(activeRoom).map(task => (
                          <div key={task.id} className="bg-slate-950/40 border border-white/5 p-3 rounded-xl text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-500">ID: {task.id}</span>
                              <span className={cn(
                                "text-[8px] font-bold px-1.5 py-0.5 rounded border",
                                task.status === "running" 
                                  ? "bg-blue-500/5 text-blue-400 border-blue-500/20" 
                                  : task.status === "done" 
                                    ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" 
                                    : "bg-slate-800/40 text-slate-400 border-white/5"
                              )}>
                                {task.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-slate-200">{task.title}</div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-white/5 rounded-2xl bg-white/[0.005] p-6 text-center">
                <Activity className="w-8 h-8 text-slate-655 animate-pulse mb-3" />
                <span className="text-xs text-slate-500 font-mono">TELEMETRY LINK STANDBY</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-between text-[9px] font-mono text-slate-600">
            <span>SYS-SECURE // AES-256</span>
            <span>AUTH LEVEL: CHIEF</span>
          </div>
        </div>

      </div>

      {/* 5. CONNECTION CONFIG MODAL */}
      {showConnSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030712]/90 backdrop-blur-md">
          <div className="bg-slate-900/60 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <Typography className="text-white font-bold text-lg font-mono">PORTAL ROUTING PANEL</Typography>
              <Button ghost size="icon" onClick={() => setShowConnSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-3 font-mono">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">TARGET BACKEND API URL</label>
                <input
                  type="text"
                  placeholder="e.g. https://hermes.yourdomain.com"
                  value={connUrl}
                  onChange={(e) => setConnUrl(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/10 focus:border-indigo-500/50 text-slate-200 px-3 py-2 rounded-xl outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">SESSION SECURITY TOKEN</label>
                <input
                  type="password"
                  placeholder="Enter token credentials..."
                  value={connToken}
                  onChange={(e) => setConnToken(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/10 focus:border-indigo-500/50 text-slate-200 px-3 py-2 rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2 font-mono">
              <Button 
                onClick={handleSaveConn} 
                className="flex-1 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl py-2 text-xs font-semibold"
              >
                APPLY & RECONNECT
              </Button>
              <Button 
                onClick={handleClearConn} 
                outlined
                className="border-white/5 text-slate-400 hover:bg-white/5 rounded-xl py-2 text-xs"
              >
                RESET ROUTING
              </Button>
            </div>
            
            <p className="text-[9px] text-slate-500 text-center leading-relaxed font-mono">
              Enables client connections to route commands to your 24/7 remote AWS EC2 instance. Automatically restarts session context upon save.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
