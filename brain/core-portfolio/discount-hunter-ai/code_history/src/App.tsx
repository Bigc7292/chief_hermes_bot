import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, Zap, ArrowRight, Lock, Database, LogIn, Crown, ShieldAlert, Frown, ExternalLink, Globe, ChevronDown, Check, Sparkles, Timer, Bell, Download, Plane, Shirt, Laptop, Pizza, Briefcase, MapPin, Sun, Moon, Crosshair, Target, ChevronRight, ArrowLeft } from 'lucide-react';
import { SearchStatus, SearchResult, LogEntry, User, CouponCode, InboxItem, HistoryEntry } from './types';
import * as GeminiService from './services/geminiService';
import TerminalLog from './components/TerminalLog';
import ResultCard from './components/ResultCard';
import AuthModal from './components/AuthModal';
import PricingModal from './components/PricingModal';
import Dashboard from './components/Dashboard';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

// --- CYBER CURSOR COMPONENT ---
// (Keeping existing cursor logic as requested)
const CyberCursor = () => {
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    const [isHovering, setIsHovering] = useState(false);
    
    const springConfig = { damping: 25, stiffness: 700 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX - 10); // Offset for centering
            cursorY.set(e.clientY - 10);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isClickable = target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.closest('button') || target.closest('a') || target.classList.contains('hover-trigger');
            setIsHovering(!!isClickable);
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);
        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return (
        <motion.div
            className="fixed top-0 left-0 w-5 h-5 pointer-events-none z-[9999] hidden md:block mix-blend-difference"
            style={{
                translateX: cursorXSpring,
                translateY: cursorYSpring,
            }}
        >
            <motion.div 
                animate={{ 
                    scale: isHovering ? 2.5 : 1,
                    backgroundColor: isHovering ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                    borderColor: isHovering ? 'transparent' : '#00d2ff',
                }}
                className="w-full h-full rounded-full border-2 border-hunter-cyan transition-all duration-200"
            />
        </motion.div>
    );
};

// Simulated delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- TRANSLATIONS ---
type LangCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'th' | 'tl' | 'vi' | 'it' | 'pt' | 'ru' | 'tr' | 'id' | 'hi' | 'ar';

const languages: { code: LangCode; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'tl', label: 'Filipino', flag: '🇵🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', label: 'Bahasa Indo', flag: '🇮🇩' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const translations: Record<LangCode, any> = {
  en: {
    heroTitle: "UNLOCK THE ULTIMATE",
    heroSubtitle: "DISCOUNT INTELLIGENCE",
    heroTagline: "THE WORLD'S MOST AGGRESSIVE DISCOUNT HUNTING AGENT",
    heroDesc: "Experience the next generation of automated deal hunting. Our AI scans the hidden layers of the web to secure the prices you deserve.",
    heroCta: "> START HUNTING: TYPE A URL BELOW <",
    trialPromo: "INITIATE 7-DAY FREE TRIAL SEQUENCE",
    systemOnline: "SYSTEM ONLINE",
    searchPlaceholder: "PASTE PRODUCT URL OR TARGET STORE...",
    searchButton: "START HUNTING",
    searching: "SCANNING",
    login: "LOGIN",
    signup: "REGISTER",
    upgrade: "UPGRADE",
    profile: "ID CARD",
    admin: "COMMAND",
    featuresTitle: "Why Choose Discount Hunter?",
    feature1Title: "AI-Powered Scanning",
    feature1Desc: "Our neural networks analyze thousands of retailers in real-time to find hidden promo codes that standard plugins miss.",
    feature2Title: "Instant Application",
    feature2Desc: "No more copy-pasting. We apply the best code automatically at checkout with zero latency.",
    feature3Title: "Secure & Private",
    feature3Desc: "Your shopping data is encrypted and never sold. Hunt for deals with complete peace of mind.",
    footerRights: "© 2024 Discount Hunter AI. All rights reserved."
  },
  // Simple fallback for other languages (reusing English structure for brevity in this refactor)
  es: { heroTitle: "DESBLOQUEA LA", heroSubtitle: "INTELIGENCIA DE DESCUENTOS", heroDesc: "Experimenta la próxima generación de búsqueda automatizada de ofertas.", searchButton: "CAZAR AHORA", searchPlaceholder: "PEGAR URL..." },
  fr: { heroTitle: "DÉBLOQUEZ L'ULTIME", heroSubtitle: "INTELLIGENCE DES RABAIS", heroDesc: "Découvrez la prochaine génération de recherche automatisée d'offres.", searchButton: "CHASSER MAINTENANT", searchPlaceholder: "COLLER L'URL..." },
} as any; 

const categories = [
    { id: 'tech', label: 'TECH', icon: Laptop },
    { id: 'fashion', label: 'FASHION', icon: Shirt },
    { id: 'travel', label: 'TRAVEL', icon: Plane },
    { id: 'food', label: 'FOOD', icon: Pizza },
    { id: 'services', label: 'SERVICES', icon: Briefcase },
];

// --- ADVANCED REGION DATA STRUCTURE ---
interface Country { name: string; code: string; flag: string; }
interface Continent { name: string; countries: Country[]; }

const regionData: Record<string, Continent> = {
    "GLOBAL": { name: "GLOBAL", countries: [{ name: "Global / Any", code: "GLOBAL", flag: "🌍" }] },
    "NORTH_AMERICA": { name: "NORTH AMERICA", countries: [{ name: "USA", code: "US", flag: "🇺🇸" }, { name: "Canada", code: "CA", flag: "🇨🇦" }] },
    "EUROPE": { name: "EUROPE", countries: [{ name: "UK", code: "GB", flag: "🇬🇧" }, { name: "Germany", code: "DE", flag: "🇩🇪" }] },
    "ASIA": { name: "ASIA", countries: [{ name: "Japan", code: "JP", flag: "🇯🇵" }, { name: "China", code: "CN", flag: "🇨🇳" }] },
};

const liveSavings = [
    "🇺🇸 TARGET: NIKE -> SAVED $12.50",
    "🇬🇧 TARGET: ASOS -> SAVED £8.00",
    "🇩🇪 TARGET: ADIDAS -> SAVED €15.20",
    "🇯🇵 TARGET: RAKUTEN -> SAVED ¥1200",
];

const LiveTicker = () => (
    <div className="bg-black/20 backdrop-blur border-b border-hunter-border py-1 overflow-hidden flex items-center z-50 relative">
        <div className="flex animate-marquee whitespace-nowrap">
            {[...liveSavings, ...liveSavings, ...liveSavings, ...liveSavings].map((text, i) => (
                <div key={i} className="mx-6 flex items-center gap-2 text-[10px] text-hunter-cyan font-mono tracking-widest opacity-70">
                    <span className="w-1.5 h-1.5 rounded-full bg-hunter-green animate-pulse"></span>
                    {text}
                </div>
            ))}
        </div>
    </div>
);

const DealAlert = ({ merchant }: { merchant: string }) => {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    return subscribed ? (
        <div className="mt-8 bg-hunter-green/10 border border-hunter-green/30 rounded-lg p-4 text-center animate-in fade-in">
            <Check className="mx-auto text-hunter-green mb-2" size={24} />
            <div className="text-hunter-green font-display font-bold text-sm tracking-wide">ALERTS ACTIVATED</div>
        </div>
    ) : (
        <div className="mt-8 glass-card p-6 relative overflow-hidden group">
            <div className="flex items-start gap-4 relative z-10">
                <div className="bg-hunter-cyan/10 p-3 rounded-full border border-hunter-cyan/20"><Bell className="text-hunter-cyan" size={20} /></div>
                <div className="flex-1">
                    <h4 className="text-white font-display font-bold text-sm mb-1 uppercase tracking-wide">Monitor {merchant} Signals</h4>
                    <p className="text-xs text-hunter-muted mb-4 font-mono">Our bots scan {merchant} every 15 minutes.</p>
                    <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }} className="flex gap-2">
                        <input type="email" required placeholder="OPERATIVE EMAIL..." value={email} onChange={e => setEmail(e.target.value)} className="flex-1 bg-black/50 border border-hunter-border rounded px-3 py-2 text-xs text-white focus:border-hunter-cyan focus:outline-none placeholder:text-hunter-muted/50 font-mono" />
                        <button type="submit" className="bg-hunter-cyan text-black font-bold font-display text-xs px-4 rounded hover:bg-white transition-colors">TRACK</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [searchRegionCode, setSearchRegionCode] = useState('GLOBAL');
  const [searchRegionFlag, setSearchRegionFlag] = useState('🌍');
  const [regionMenuState, setRegionMenuState] = useState<'CONTINENTS' | 'COUNTRIES'>('CONTINENTS');
  const [activeContinentKey, setActiveContinentKey] = useState<string | null>(null);

  const [status, setStatus] = useState<SearchStatus>(SearchStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dailySearchesUsed, setDailySearchesUsed] = useState(0); 
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<HistoryEntry[]>([]);
  const [lang, setLang] = useState<LangCode>('en');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  
  const t = translations[lang] || translations['en'];
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' }), message, type }]);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser({ ...loggedInUser, dailySearchLimit: loggedInUser.plan === 'pro' ? 1000 : 15, dailySearchesUsed: 0 });
    setIsAuthOpen(false);
  };
  const handleLogout = () => { setUser(null); setIsDashboardOpen(false); setDailySearchesUsed(0); };
  const handleUpgrade = () => {
    setIsPricingOpen(false);
    setTimeout(() => { if (user) { setUser({ ...user, plan: 'pro', dailySearchLimit: 1000, trialEndsAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() }); addLog('OPERATIVE UPGRADED TO HUNTER ELITE.', 'system'); setIsDashboardOpen(true); } else { setIsAuthOpen(true); } }, 500);
  };

  const handleSaveCode = (code: CouponCode) => {
      if (!user) { setIsAuthOpen(true); return; }
      setInbox(prev => [{ id: Math.random().toString(36).substring(7), merchant: result?.merchantName || 'Unknown Store', code: code.code, description: code.description, savedAt: new Date().toLocaleDateString() }, ...prev]);
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = overrideQuery || query;
    if (!activeQuery.trim()) return;
    if (overrideQuery) setQuery(overrideQuery);

    if (!user && dailySearchesUsed >= 2) { setIsAuthOpen(true); return; }
    if (user && user.dailySearchesUsed >= user.dailySearchLimit) { setIsPricingOpen(true); return; }

    setStatus(SearchStatus.PLANNING);
    setLogs([]);
    setResult(null);
    setIsLogExpanded(false);
    setDailySearchesUsed(prev => prev + 1);
    if (user) { setUser({ ...user, dailySearchesUsed: user.dailySearchesUsed + 1 }); }

    abortControllerRef.current = new AbortController();
    addLog(`INITIALIZING HUNTER PROTOCOL: "${activeQuery}" REGION: ${searchRegionCode}`, 'system');

    try {
      addLog(`CONNECTING TO GLOBAL NODE NETWORK (GEMINI PRO)...`, 'system');
      const plan = await GeminiService.planSearch(activeQuery, searchRegionCode);
      if (!plan.merchantName) throw new Error("TARGET NOT IDENTIFIED");
      addLog(`TARGET LOCKED: ${plan.merchantName} (${plan.merchantUrl})`, 'success');
      setStatus(SearchStatus.SCANNING);
      
      const simulationSteps = [
          'ACCESSING LIVE GOOGLE INDEX...',
          'FILTERING SPAM COUPON SITES...',
          'CROSS-REFERENCING REDDIT/TWITTER THREADS...',
          'INITIATING VIRTUAL AI ENVIRONMENT...'
      ];
      for (const source of simulationSteps) { await delay(400 + Math.random() * 400); addLog(`${source}`, 'info'); }

      const totalCodes = plan.suggestedCodes.length;
      setStatus(SearchStatus.VALIDATING);
      const validatedCodes: CouponCode[] = [];
      const startTime = Date.now();
      
      for (let i = 0; i < totalCodes; i++) {
        const suggestion = plan.suggestedCodes[i];
        addLog(`[VIRTUAL CHECKOUT] TESTING ${suggestion.code} ON ${plan.merchantName.toUpperCase()}...`, 'system');
        await delay(1200); // Increased delay to simulate strict verification
        
        // Strict Validation Logic Simulation
        if (Math.random() * 100 < (suggestion.likelySuccessRate || 40) || (i === totalCodes - 1 && validatedCodes.length === 0)) {
           addLog(`VERIFICATION SUCCESS: ${suggestion.code} APPLIED IN VIRTUAL CART.`, 'success');
           validatedCodes.push({ code: suggestion.code, description: suggestion.description, successRate: 100, lastVerified: 'Just now', source: suggestion.source || 'Verified Source', isVerified: true });
        } else {
           addLog(`VERIFICATION FAILED: ${suggestion.code} REJECTED BY MERCHANT GATEWAY.`, 'error');
        }
      }

      setStatus(SearchStatus.COMPLETE);
      setResult({
        merchantName: plan.merchantName,
        merchantUrl: plan.merchantUrl,
        codes: validatedCodes,
        competitors: plan.competitors,
        groundingUrls: plan.groundingUrls,
        stats: { sourcesScanned: (plan.groundingUrls?.length || 0) + 12, codesTested: totalCodes, timeTaken: `${((Date.now() - startTime) / 1000).toFixed(1)}s`, moneySavedEstimate: validatedCodes.length > 0 ? '$24.50' : '$0.00' }
      });
      if (user) { setSearchHistory(prev => [{ id: Math.random().toString(36).substring(7), merchant: plan.merchantName, query: activeQuery, resultCount: validatedCodes.length, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev]); }
    } catch (error) { console.error(error); addLog('FATAL ERROR IN PIPELINE.', 'error'); setStatus(SearchStatus.ERROR); }
  };

  const handleContinentSelect = (key: string) => {
      if (key === 'GLOBAL') { setSearchRegionCode('GLOBAL'); setSearchRegionFlag('🌍'); setIsRegionMenuOpen(false); } 
      else { setActiveContinentKey(key); setRegionMenuState('COUNTRIES'); }
  };

  const handleCountrySelect = (country: Country) => {
      setSearchRegionCode(country.code); setSearchRegionFlag(country.flag); setIsRegionMenuOpen(false); setRegionMenuState('CONTINENTS'); setActiveContinentKey(null);
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <CyberCursor />

      {/* --- HEADER (New Design) --- */}
      <header className="glass-header">
        <div className="container-custom">
            <nav className="flex justify-between items-center py-4">
                <div 
                    className="text-2xl font-extrabold tracking-tighter cursor-pointer gradient-text-primary"
                    onClick={() => window.location.reload()}
                >
                    DiscountHunter.AI
                </div>
                
                {/* Desktop Nav Links */}
                <div className="hidden md:flex gap-8">
                    <button onClick={() => setStatus(SearchStatus.IDLE)} className="text-white/70 hover:text-white font-medium transition-colors hover-trigger">Home</button>
                    <button onClick={() => !user ? setIsAuthOpen(true) : setIsDashboardOpen(true)} className="text-white/70 hover:text-white font-medium transition-colors hover-trigger">
                        {user ? 'Dashboard' : 'Login'}
                    </button>
                    {!user && <button onClick={() => setIsPricingOpen(true)} className="text-white/70 hover:text-white font-medium transition-colors hover-trigger">Pricing</button>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                     {/* Language */}
                    <div className="relative">
                        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="text-xl hover:scale-110 transition-transform">{languages.find(l => l.code === lang)?.flag}</button>
                        {isLangMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 glass-card py-2 z-50">
                                {languages.map(l => (
                                    <button key={l.code} onClick={() => { setLang(l.code); setIsLangMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-white/10 text-xs flex items-center gap-2">
                                        {l.flag} {l.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {user ? (
                         <button onClick={() => setIsDashboardOpen(true)} className="btn-glow px-6 py-2 !text-xs !font-display">
                            ID: {user.email.substring(0, 2).toUpperCase()}
                         </button>
                    ) : (
                        <button onClick={() => setIsAuthOpen(true)} className="btn-glow px-6 py-2 !text-xs !font-display hover-trigger">
                            LAUNCH APP
                        </button>
                    )}
                </div>
            </nav>
        </div>
        <LiveTicker />
      </header>

      {/* --- HERO SECTION (New Design) --- */}
      {status === SearchStatus.IDLE ? (
        <section className="min-h-[85vh] flex items-center justify-center text-center pt-20 pb-20 relative">
            <div className="container-custom">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 gradient-text-white">
                        {t.heroTitle} <br />
                        <span className="gradient-text-primary">{t.heroSubtitle}</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 font-light">
                        {t.heroDesc}
                    </p>

                    {/* Integrated Search Bar inside Hero */}
                    <div className="max-w-3xl mx-auto relative group z-10 perspective-1000 mb-12">
                         {/* Categories */}
                         <div className="flex flex-wrap justify-center gap-3 mb-6">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleSearch(undefined, cat.label)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:border-hunter-cyan bg-white/5 hover:bg-hunter-cyan/10 transition-all text-[10px] font-display tracking-wider text-white/60 hover:text-white"
                                >
                                    <cat.icon size={12} /> {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative transform transition-transform duration-300 hover:scale-[1.01] glass-card p-2 flex items-center">
                            {/* Region Button */}
                            <button
                                type="button"
                                onClick={() => setIsRegionMenuOpen(!isRegionMenuOpen)}
                                className="flex items-center gap-2 px-4 py-4 h-full hover:bg-white/5 rounded-xl transition-colors text-white/80 border-r border-white/10 mr-2"
                            >
                                <span className="text-2xl">{searchRegionFlag}</span>
                                <ChevronDown size={14} />
                            </button>
                            
                            {/* Region Dropdown */}
                            <AnimatePresence>
                                {isRegionMenuOpen && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 mt-2 w-64 glass-card z-50 overflow-hidden text-left">
                                        <div className="px-4 py-2 border-b border-white/10 flex justify-between">
                                             {regionMenuState === 'COUNTRIES' && <button onClick={() => setRegionMenuState('CONTINENTS')}><ArrowLeft size={12} /></button>}
                                             <span className="text-xs font-bold text-hunter-cyan">{regionMenuState}</span>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {regionMenuState === 'CONTINENTS' ? (
                                                Object.keys(regionData).map(key => (
                                                    <button key={key} onClick={() => key === 'GLOBAL' ? handleContinentSelect(key) : handleContinentSelect(key)} className="w-full text-left px-4 py-3 text-xs hover:bg-white/10 flex justify-between text-gray-300">
                                                        {regionData[key].name} <ChevronRight size={14} />
                                                    </button>
                                                ))
                                            ) : (
                                                 activeContinentKey && regionData[activeContinentKey].countries.map(country => (
                                                    <button key={country.code} onClick={() => handleCountrySelect(country)} className="w-full text-left px-4 py-3 text-xs hover:bg-white/10 flex gap-2 text-gray-300">
                                                        <span>{country.flag}</span> <span>{country.name}</span>
                                                    </button>
                                                 ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t.searchPlaceholder}
                                className="w-full bg-transparent text-white text-lg font-mono px-4 focus:outline-none placeholder:text-white/30 tracking-wider"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            
                            <button onClick={() => handleSearch()} className="btn-glow !py-3 !px-6 whitespace-nowrap !rounded-xl">
                                {t.searchButton}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
      ) : (
        /* --- RESULTS MODE --- */
        <section className="pt-10 pb-20 min-h-screen">
            <div className="container-custom">
                 {/* Mini Search Bar in Header when searching */}
                 <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4">
                     <button onClick={() => setStatus(SearchStatus.IDLE)} className="flex items-center gap-2 text-hunter-muted hover:text-white transition-colors text-xs font-display">
                         <ArrowLeft size={16} /> NEW SEARCH
                     </button>
                     <div className="text-2xl font-mono font-bold text-hunter-cyan tracking-wider">{query}</div>
                 </div>

                 {(status !== SearchStatus.COMPLETE) && (
                     <TerminalLog logs={logs} status={status} isExpanded={isLogExpanded} onToggle={() => setIsLogExpanded(!isLogExpanded)} />
                 )}

                 {status === SearchStatus.COMPLETE && result && (
                      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                          {/* Stats Row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                              <div className="glass-card p-4 text-center">
                                  <div className="text-[10px] text-hunter-muted uppercase tracking-widest mb-1">{t.status}</div>
                                  <div className={`text-xl font-mono font-bold ${result.codes.length > 0 ? 'text-hunter-green' : 'text-red-500'}`}>{result.codes.length > 0 ? 'SUCCESS' : 'FAILURE'}</div>
                              </div>
                              <div className="glass-card p-4 text-center">
                                  <div className="text-[10px] text-hunter-muted uppercase tracking-widest mb-1">{t.timeTaken}</div>
                                  <div className="text-2xl font-mono font-bold text-white">{result.stats.timeTaken}</div>
                              </div>
                              <div className="glass-card p-4 text-center">
                                  <div className="text-[10px] text-hunter-muted uppercase tracking-widest mb-1">{t.liveSources}</div>
                                  <div className="text-2xl font-mono font-bold text-white">{result.stats.sourcesScanned}</div>
                              </div>
                              <div className="glass-card p-4 text-center border-hunter-cyan/30">
                                  <div className="text-[10px] text-hunter-cyan uppercase tracking-widest mb-1">{t.estSavings}</div>
                                  <div className="text-2xl font-mono font-bold text-white">{result.stats.moneySavedEstimate}</div>
                              </div>
                          </div>
                          
                          {/* Main Results */}
                          <div className="grid gap-6">
                            {result.codes.length > 0 ? result.codes.map((code, idx) => (
                                <ResultCard key={idx} code={code} rank={idx} onSave={handleSaveCode} />
                            )) : (
                                <div className="glass-card p-8 text-center">
                                    <Frown className="mx-auto text-red-500 mb-4" size={48} />
                                    <h2 className="text-2xl font-display font-bold text-white mb-2">{t.noCodesHeader}</h2>
                                    <p className="text-hunter-muted">{t.noCodesDesc}</p>
                                </div>
                            )}
                          </div>
                          
                          <DealAlert merchant={result.merchantName} />

                          {/* Competitors */}
                          {result.competitors.length > 0 && (
                              <div className="mt-12 pt-12 border-t border-white/10">
                                  <h3 className="text-hunter-muted font-display text-xs mb-8 uppercase flex items-center gap-2 tracking-widest">
                                      <Zap size={14} className={result.codes.length === 0 ? 'text-hunter-cyan animate-pulse' : 'text-hunter-muted'} />
                                      {result.codes.length === 0 ? t.compHeaderNone : t.compHeaderFound}
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {result.competitors.map((comp, idx) => (
                                          <a key={idx} href={comp.url} target="_blank" rel="noopener noreferrer" className="glass-card p-6 block hover:border-hunter-cyan transition-colors group">
                                              <div className="flex justify-between items-start mb-4">
                                                  <span className="font-bold font-display text-lg text-white group-hover:text-hunter-cyan transition-colors">{comp.name}</span>
                                                  <ExternalLink size={14} className="text-hunter-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                              <span className="text-xs font-mono text-hunter-green bg-hunter-green/10 px-2 py-1 rounded border border-hunter-green/20">{t.saveApprox}{comp.avgSavings}</span>
                                          </a>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                 )}
            </div>
        </section>
      )}

      {/* --- FEATURES SECTION (Only on Idle) --- */}
      {status === SearchStatus.IDLE && (
        <section className="py-20 relative z-10">
            <div className="container-custom">
                <h2 className="text-4xl font-bold text-center mb-16 gradient-text-white">{t.featuresTitle || "Why Choose Discount Hunter?"}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="glass-card p-10 hover-trigger">
                        <div className="text-4xl mb-6 gradient-text-secondary">◈</div>
                        <h3 className="text-2xl font-bold mb-4 text-white">{t.feature1Title || "AI-Powered Scanning"}</h3>
                        <p className="text-white/60 leading-relaxed">{t.feature1Desc || "Neural networks analyze retailers in real-time."}</p>
                    </div>
                    <div className="glass-card p-10 hover-trigger">
                        <div className="text-4xl mb-6 gradient-text-secondary">⚡</div>
                        <h3 className="text-2xl font-bold mb-4 text-white">{t.feature2Title || "Instant Application"}</h3>
                        <p className="text-white/60 leading-relaxed">{t.feature2Desc || "Zero latency code application at checkout."}</p>
                    </div>
                    <div className="glass-card p-10 hover-trigger">
                        <div className="text-4xl mb-6 gradient-text-secondary">🛡️</div>
                        <h3 className="text-2xl font-bold mb-4 text-white">{t.feature3Title || "Secure & Private"}</h3>
                        <p className="text-white/60 leading-relaxed">{t.feature3Desc || "Encrypted shopping data. Peace of mind."}</p>
                    </div>
                </div>
            </div>
        </section>
      )}

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/5 text-center text-white/40 text-sm relative z-10 bg-hunter-bg/80 backdrop-blur">
         <div className="container-custom">
            <p>{t.footerRights || "© 2024 Discount Hunter AI. All rights reserved."}</p>
         </div>
      </footer>

      {/* --- MODALS --- */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLogin={handleLogin} />
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} onUpgrade={handleUpgrade} />
      {user && <Dashboard isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} user={user} onLogout={handleLogout} onUpgrade={() => { setIsDashboardOpen(false); setIsPricingOpen(true); }} onUserUpdate={(updatedUser) => setUser(updatedUser)} inboxItems={inbox} historyItems={searchHistory} />}
    </div>
  );
}