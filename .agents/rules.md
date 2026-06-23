# Antigravity Rules - Hermes Agent Project

## 🌟 GOLDEN RULES FOR HERMES_AGENT PROJECT

1. **Project Isolation & Environment Scoping:**
   - **Local Environment:** Windows developer workspace at `C:\Users\Alfa\Desktop\hermes_agent` (and local configurations at `C:\Users\Alfa\AppData\Local\hermes`).
   - **Remote Environment:** Production AWS EC2 instance at `51.21.254.184` running the 24/7 Telegram Gateway bot.
   - **Strict Sync Protocol:** Always verify if a directive, SOUL.md update, or configuration change is intended for the local developer environment or the remote production bot. Any modifications intended to affect the live Telegram bot must be actively synced to the remote EC2 instance (`ubuntu@51.21.254.184` using `hermes-key.pem`), rather than only applied to local Windows directories.
   - **Strict Remote Execution (Zero Local Scratch Scripts):** NEVER create, edit, or execute temporary/scratch scripts locally on Windows if their logical outcome is intended for the live bot on Ubuntu. All task scripts (e.g. cloning, analyzing, testing) must be written as code base files, committed and pushed to git, and pulled and executed on the remote EC2 instance over SSH.
   - **Verification & Deployment:** Use the sync check tool `python scripts/check_sync.py` to verify status. Run `python scripts/check_sync.py --sync` to automatically deploy local AppData configurations (`SOUL.md`, `RULES.md`, `USER.md`, `HEARTBEAT.md`) to the remote EC2 instance. For codebase files (e.g., `AGENTS.md`), commit to git and pull on remote: `ssh -i hermes-key.pem ubuntu@51.21.254.184 "cd ~/hermes-agent && git pull"`.
2. **Proactive Credentials Scanning & Security:** You must scan every file within the `hermes_agent` repository—including all Gemini data, Grok data, brain data, `.env` files, logs, and zip files—and secure all private keys, API keys, database credentials, usernames, user IDs, crypto private keys, and any other security credentials. Never expose them or leak them.

---

## ⚔️ OPERATIONAL GUIDELINES

1. **Security First:** Zero-trust architecture. Use ephemeral, scoped tokens. Human approval gates are mandatory for all writes, posts, code merges, financials, or destructive actions.
2. **Full-File Fidelity:** When editing or generating code, output the full complete file. Never use snippets or placeholders.
3. **Additive Scaling Logic:** Updated files must contain all existing logic plus the modifications. Never shrink a file unless explicitly instructed.
4. **Communication:** High-signal military format (SOPs, ROE, SITREPs). Proactive status updates.
