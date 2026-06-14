# MEMORY.md
# ACTIVE STATE TRACKER & SESSION BOUNDARIES

This file tracks the active state of all projects, core priorities, and upcoming/pending engineering tasks for Colin Daren Loader. Hermes reads this file at the start of every session to ensure perfect operational continuity.

---

## 🔴 IMMEDIATE ACTION ITEMS (URGENT)
1. **Supabase Pause Resolution - Stone Sight AI**:
   * **Status**: PAUSED (Suspended on June 9, 2026, due to free-tier inactivity).
   * **Action**: Restore the database via the Supabase Dashboard. 90-day deletion deadline is active.
2. **Supabase Pause Resolution - AI Lead IQ**:
   * **Status**: PAUSED (Suspended in April 2026 due to inactivity).
   * **Action**: Restore/unpause the database via the Supabase Dashboard.
3. **Firebase Downgrade Resolution - LJ-Stone-Surfaces-LTD**:
   * **Status**: ALERT (Downgraded due to inactivity).
   * **Action**: Verify backend connection and restore billing plan if necessary.

---

## 📊 PORTFOLIO STATE & DEPLOYMENT INDEX

### 1. Stone Sight AI (stonesightai.xyz / LJ Stone Surfaces LTD)
* **Visualizer App**: Vercel deployed.
* **DB Backend**: Supabase (Paused).
* **AI Provider**: Groq / Gemini.
* **Current Task**: Restore DB, then build the unified portfolio page.

### 2. Discount Hunter AI (discounthunterai.xyz)
* **Coupon Agent**: Vercel deployed.
* **AI Provider**: Gemini / Groq.
* **Current Task**: Catalog scraping targets and verify validation scripts.

### 3. AI Lead IQ (formerly Eva AI / Top Loader Agent AI)
* **Voice Ecosystem**: Supabase (Paused), Next.js / Node.
* **Current Task**: Unpause DB and fix the broken CI/CD pipeline.

---

## 🛠️ COMPATIBILITY & SYSTEM STATE
* **OS**: Windows (Local) / Ubuntu Linux (Remote EC2 `51.21.254.184`).
* **Active Profile**: `default` running the Telegram Gateway bot (`@Chief_ai_col_bot`) 24/7.
* **Primary Model**: `minimaxai/minimax-m3` via Nvidia API.
* **Database Target**: Local SQLite `~/.hermes/sessions/` for logs and conversational state.
