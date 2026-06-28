#!/usr/bin/env python3
"""Sanitizes plain-text credentials in chat logs and stores them in a secure master vault."""

import os
import re
from pathlib import Path

WORKSPACE_DIR = Path(__file__).resolve().parent.parent
VAULT_PATH = WORKSPACE_DIR / "ignored" / "vault.env"

# Key-Value pairs of the secrets to secure
SECRETS = {
    "XAI_API_KEY": "xai-JMxZYDyZFPxFXAS1xeaY03WoCRcKfPSycVtyzXOJq6VMEn0VBhMftSsCIrrRMOfz4mX2fj2y2DP4vO97",
    "CLOUDINARY_API_SECRET": "3aj9cdfvcaUkjGKRuHr3qf5L_o0",
    "SUPABASE_DB_PASSWORD": "DCLrip7292!",
    "FIREBASE_API_KEY_STONE_SIGHT": "AIzaSyACz95Q74k5M-e_ZFYKrKwfM2zFOLf0l0A",
    "FIREBASE_API_KEY_DISCOUNT_HUNTER": "AIzaSyDwA8YDc8OMuaAVqHec1D7qLGaSEnHhd8U",
    "N8N_API_KEY_1": "AIzaSyBQry407hE5VwMaDedHogPuwJeIbAIidQU",
    "N8N_API_KEY_2": "AIzaSyARU7upVG5hzoaMHIMaBEXjcYtayo8vPJ4",
    "NEON_DB_PASSWORD": "npg_mUrkQ3iDvuN9",
    "REPLICATE_API_TOKEN": "r8_MfnLC0gF7kkzhaG1nKptVVKAGBRzzej4V2rKD",
    "STABILITY_API_KEY": "sk-X72piUvP1W76DQMWgApts4vxh8MG9KFEslwfvPKPmbXJiTvk",
    "SUPABASE_ACCESS_TOKEN": "sbp_cbeb8901aec4a5c99291fa46b77cba0e54fe006b",
    "SUPABASE_SECRET_KEY": "sb_secret_n_W90lBheLgkBN-BWbQjBg_b2ApYVLp",
    "VERCEL_OIDC_TOKEN": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9jb2xpbi1sb2FkZXJzLXByb2plY3RzIiwic3ViIjoib3duZXI6Y29saW4tbG9hZGVycy1wcm9qZWN0OmphY2tpcy1iYWNrLWFwcDplbnZpcm9ubWVudDpkZXZlbG9wbWVudCIsInNjb3BlIjoib3duZXI6Y29saW4tbG9hZGVycy1wcm9qZWN0czpwcm9qZWN0OmphY2tpcy1iYWNrLWFwcDplbnZpcm9ubWVudDpkZXZlbG9wbWVudCIsImF1ZCI6Imh0dHBzOi8vdmVyY2VsLmNvbS9jb2xpbi1sb2FkZXJzLXByb2plY3RzIiwib3duZXIiOiJjb2xpbi1sb2FkZXJzLXByb2plY3RzIiwib3duZXJfaWQiOiJ0ZWFtX0RZNGZCbXdDYmViVjBBYko3cktHZjEzVyIsInByb2plY3QiOiJqYWNraXMtYmFjay1hcHAiLCJwcm9qZWN0X2lkIjoicHJqXzZjTzU1TG8wR1I1Z3MzRk9sWFdCUXM0bXU3SEsiLCJlbnZpcm9ubWVudCI6ImRldmVsb3BtZW50IiwicGxhbiI6InBybyIsInVzZXJfaWQiOiJjUUFHNU1KWUw3aVZKVm5ZMG5lSTdtSzkiLCJuYmYiOjE3NjcxMDIyOTMsImlhdCI6MTc2NzEwMjI5MywiZXhwIjoxNzY3MTQ1NDkzfQ.Yd103OhuGRHvxXWW-TB_a8wWGwOonItjDflnXi-jMYf0",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlqYWVtcWpoYm92c3Fhb3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDEyMzEsImV4cCI6MjA4NDQxNzIzMX0.owMAdZ5SDdt4H4K1DUxJXrcktpUFMeTQR2ISZ3rtsGY",
    "SUPABASE_SERVICE_ROLE": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkanlqYWVtcWpoYm92c3Fhb3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0MTIzMSwiZXhwIjoyMDg0NDE3MjMxfQ.Y43iD4FXAVUHVmaR7Zz7Wo7aCP32LqC8Zye8FHXQmhc"
}

def create_vault():
    """Write secrets to git-ignored local vault."""
    VAULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"# Master Secret Vault - Auto-generated\n"]
    for k, v in SECRETS.items():
        lines.append(f"{k}={v}")
    
    VAULT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Created secure master vault at {VAULT_PATH}")
    
    try:
        import stat
        VAULT_PATH.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        pass

def append_to_hermes_env():
    """Append these keys to the remote ~/.hermes/.env or local equivalent."""
    hermes_env = Path(os.path.expanduser("~/.hermes/.env"))
    if not hermes_env.exists():
        hermes_env = Path(os.environ.get("LOCALAPPDATA", "")).joinpath("hermes", ".env")
        
    if not hermes_env.exists():
        print(f"Target .env file not found at {hermes_env}, skipping .env injection.")
        return
        
    content = hermes_env.read_text(encoding="utf-8")
    lines = content.splitlines()
    existing_keys = {l.split("=", 1)[0].strip() for l in lines if "=" in l}
    
    appends = []
    for k, v in SECRETS.items():
        if k not in existing_keys:
            appends.append(f"{k}={v}")
            
    if appends:
        with open(hermes_env, "a", encoding="utf-8") as f:
            f.write("\n" + "\n".join(appends) + "\n")
        print(f"Injected {len(appends)} keys into {hermes_env}")
    else:
        print(f"All keys are already present in {hermes_env}")

def sanitize_files():
    """Scan and redact all plain-text secret occurrences in target files found anywhere under brain/."""
    target_basenames = {
        "Grok_Luxury OpenPlan Kitchen Image.md",
        "grok_chats.md",
        "n8n-knowledge-base-agent.json"
    }
    
    brain_dir = WORKSPACE_DIR / "brain"
    if not brain_dir.exists():
        print(f"Brain directory not found at {brain_dir}")
        return
        
    for root, dirs, files in os.walk(brain_dir):
        for file in files:
            if file in target_basenames:
                path = Path(root) / file
                print(f"Sanitizing {path.relative_to(WORKSPACE_DIR)}...")
                content = path.read_text(encoding="utf-8")
                
                redact_count = 0
                for key_name, secret_val in SECRETS.items():
                    pattern = re.escape(secret_val)
                    if re.search(pattern, content):
                        content = re.sub(pattern, f"env:{key_name}", content)
                        redact_count += 1
                        
                if redact_count > 0:
                    path.write_text(content, encoding="utf-8")
                    print(f"  [REDACTED] Replaced {redact_count} secret types in {file}")

def main():
    create_vault()
    append_to_hermes_env()
    sanitize_files()

if __name__ == "__main__":
    main()
