#!/usr/bin/env python3
"""Clones the 11 external skills repositories on the remote Ubuntu EC2 instance."""

import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPOS = {
    "ECC": "https://github.com/affaan-m/ECC.git",
    "caveman": "https://github.com/JuliusBrussee/caveman.git",
    "career-ops": "https://github.com/santifer/career-ops.git",
    "awesome-claude-code": "https://github.com/hesreallyhim/awesome-claude-code",
    "LibreChat": "https://github.com/danny-avila/LibreChat",
    "claude-plugins-official": "https://github.com/anthropics/claude-plugins-official",
    "MemOS": "https://github.com/MemTensor/MemOS.git",
    "cc-switch": "https://github.com/farion1231/cc-switch",
    "AionUi": "https://github.com/iOfficeAI/AionUi",
    "EverOS": "https://github.com/EverMind-AI/EverOS",
    "superpowers-zh": "https://github.com/jnMetaCode/superpowers-zh"
}

TARGET_DIR = Path("/home/ubuntu/hermes-agent/ignored/external_repos")

def clone_repo(name, url):
    dest = TARGET_DIR / name
    if dest.exists():
        print(f"[{name}] Already exists, skipping clone.")
        return True
    
    print(f"[{name}] Starting clone from {url}...")
    # depth 1 for shallow clone
    cmd = ["git", "clone", "--depth", "1", url, str(dest)]
    
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0:
            print(f"[{name}] Success!")
            return True
        else:
            print(f"[{name}] Failed with error:\n{res.stderr}")
            return False
    except Exception as e:
        print(f"[{name}] Error executing clone: {e}")
        return False

def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"Cloning {len(REPOS)} repositories on Ubuntu into {TARGET_DIR}...")
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(clone_repo, name, url): name for name, url in REPOS.items()}
        for future in futures:
            name = futures[future]
            try:
                future.result()
            except Exception as e:
                print(f"[{name}] Future generated an exception: {e}")

if __name__ == "__main__":
    main()
