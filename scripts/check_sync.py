#!/usr/bin/env python3
"""Sync check utility for Hermes Agent.

Compares local files (both workspace files and AppData configurations) with
remote files on the AWS EC2 instance. Provides options to automatically sync
configuration files over SCP/SSH.
"""

import os
import sys
import argparse
import subprocess
import hashlib
from pathlib import Path

# Configuration
REMOTE_HOST = "51.21.254.184"
REMOTE_USER = "ubuntu"
SSH_KEY_NAME = "hermes-key.pem"
REMOTE_REPO_PATH = "/home/ubuntu/hermes-agent"
REMOTE_CONFIG_DIR = "/home/ubuntu/.hermes"

# Local directories
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
LOCAL_APPDATA_DIR = Path(os.environ.get("LOCALAPPDATA", "")).joinpath("hermes")

# Mappings of (Local Path, Remote Path, Description)
FILE_MAPPINGS = [
    # Config files (global to instance)
    (
        LOCAL_APPDATA_DIR / "SOUL.md",
        f"{REMOTE_CONFIG_DIR}/SOUL.md",
        "Global SOUL (Directives)"
    ),
    (
        LOCAL_APPDATA_DIR / "RULES.md",
        f"{REMOTE_CONFIG_DIR}/rules.md",
        "Global RULES (ROE)"
    ),
    (
        LOCAL_APPDATA_DIR / "USER.md",
        f"{REMOTE_CONFIG_DIR}/USER.md",
        "User Profile Context"
    ),
    (
        LOCAL_APPDATA_DIR / "HEARTBEAT.md",
        f"{REMOTE_CONFIG_DIR}/HEARTBEAT.md",
        "Heartbeat / State Tracker"
    ),
    # Repo files (codebase)
    (
        WORKSPACE_DIR / "AGENTS.md",
        f"{REMOTE_REPO_PATH}/AGENTS.md",
        "Workspace AGENTS (Code base)"
    ),
    (
        WORKSPACE_DIR / "AGENTS.md",
        f"{REMOTE_CONFIG_DIR}/AGENTS.md",
        "Remote Home AGENTS (Sync)"
    ),
    (
        WORKSPACE_DIR / ".agents" / "rules.md",
        f"{REMOTE_REPO_PATH}/.agents/rules.md",
        "Workspace IDE Rules"
    )
]

def get_normalized_hash(content: bytes) -> str:
    """Compute MD5 hash after normalizing line endings to LF and stripping trailing whitespaces."""
    try:
        text = content.decode("utf-8", errors="ignore")
        # Normalize CRLF to LF
        normalized = text.replace("\r\n", "\n")
        # Strip trailing newlines/spaces to focus on semantic content
        normalized = normalized.rstrip()
        return hashlib.md5(normalized.encode("utf-8")).hexdigest()
    except Exception:
        return hashlib.md5(content).hexdigest()

def run_ssh_command(ssh_key_path: Path, command: str) -> tuple[int, str, str]:
    """Run a command on the remote EC2 instance via SSH."""
    ssh_cmd = [
        "ssh",
        "-i", str(ssh_key_path),
        "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=5",
        f"{REMOTE_USER}@{REMOTE_HOST}",
        command
    ]
    res = subprocess.run(ssh_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode, res.stdout.decode("utf-8", errors="ignore"), res.stderr.decode("utf-8", errors="ignore")

def run_scp_upload(ssh_key_path: Path, local_file: Path, remote_path: str) -> bool:
    """Upload a file to the remote instance via SCP."""
    scp_cmd = [
        "scp",
        "-i", str(ssh_key_path),
        "-o", "StrictHostKeyChecking=no",
        str(local_file),
        f"{REMOTE_USER}@{REMOTE_HOST}:{remote_path}"
    ]
    res = subprocess.run(scp_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0

def check_sync():
    parser = argparse.ArgumentParser(description="Check synchronization between local and remote Hermes environments.")
    parser.add_argument("--sync", action="store_true", help="Automatically upload out-of-sync configuration files to remote.")
    parser.add_argument("--ssh-key", type=str, default=str(WORKSPACE_DIR / SSH_KEY_NAME), help="Path to SSH key.")
    args = parser.parse_args()

    ssh_key_path = Path(args.ssh_key)
    if not ssh_key_path.exists():
        print(f"\033[91mError: SSH private key not found at {ssh_key_path}\033[0m")
        sys.exit(1)

    print(f"\033[94m[START] Starting Hermes Environment Sync Verification...")
    print(f"Local AppData Dir:  {LOCAL_APPDATA_DIR}")
    print(f"Local Workspace:    {WORKSPACE_DIR}")
    print(f"Remote Host:         {REMOTE_HOST} ({REMOTE_USER})\033[0m\n")

    # Verify SSH connection first
    ret, out, err = run_ssh_command(ssh_key_path, "echo 'OK'")
    if ret != 0:
        print(f"\033[91m[ERROR] Cannot connect to remote EC2 instance at {REMOTE_HOST}.\033[0m")
        print(f"Details: {err.strip()}")
        sys.exit(1)

    print("\033[92m[OK] Connected to remote EC2 instance successfully.\033[0m\n")
    print(f"{'File / Component':<30} | {'Local':<10} | {'Remote':<10} | {'Status':<15} | {'Description'}")
    print("-" * 105)

    any_mismatch = False
    config_mismatches = []
    repo_mismatches = False

    for local_path, remote_path, desc in FILE_MAPPINGS:
        # Check Local File
        local_exists = local_path.exists()
        local_hash = ""
        if local_exists:
            with open(local_path, "rb") as f:
                local_hash = get_normalized_hash(f.read())

        # Check Remote File
        # We cat the file and get its content to hash locally (removes dependency on remote md5sum tool / line ending issues)
        cmd = f"cat {remote_path} 2>/dev/null"
        ret, out_content, err_content = run_ssh_command(ssh_key_path, cmd)
        
        remote_exists = (ret == 0)
        remote_hash = ""
        if remote_exists:
            remote_hash = get_normalized_hash(out_content.encode("utf-8"))

        # Determine status
        status = ""
        color = ""
        
        if not local_exists and not remote_exists:
            status = "MISSING BOTH"
            color = "\033[90m"  # Grey
        elif not local_exists:
            status = "NO LOCAL"
            color = "\033[93m"  # Yellow
            any_mismatch = True
        elif not remote_exists:
            status = "NO REMOTE"
            color = "\033[91m"  # Red
            any_mismatch = True
            if REMOTE_CONFIG_DIR in remote_path:
                config_mismatches.append((local_path, remote_path, desc))
            else:
                repo_mismatches = True
        elif local_hash == remote_hash:
            status = "MATCH"
            color = "\033[92m"  # Green
        else:
            status = "MISMATCH"
            color = "\033[91m"  # Red
            any_mismatch = True
            if REMOTE_CONFIG_DIR in remote_path:
                config_mismatches.append((local_path, remote_path, desc))
            else:
                repo_mismatches = True

        local_lbl = "Yes" if local_exists else "No"
        remote_lbl = "Yes" if remote_exists else "No"
        
        print(f"{local_path.name:<30} | {local_lbl:<10} | {remote_lbl:<10} | {color}{status:<15}\033[0m | {desc}")

    print("-" * 105)

    if not any_mismatch:
        print("\n\033[92m[SUCCESS] ALL FILES ARE IN PERFECT SYNC! OPERATIONAL STATUS: 100%\033[0m")
        sys.exit(0)

    print("\n\033[93m[WARNING] Drift Detected between local and remote environments.\033[0m")

    # Handle automatic sync
    if args.sync:
        if config_mismatches:
            print("\n\033[94mSyncing out-of-sync configuration files...\033[0m")
            for local_file, remote_file, desc in config_mismatches:
                print(f"Uploading {local_file.name} to {remote_file} ({desc})...")
                # Make sure the remote directory exists
                run_ssh_command(ssh_key_path, f"mkdir -p {os.path.dirname(remote_file)}")
                success = run_scp_upload(ssh_key_path, local_file, remote_file)
                if success:
                    print(f"  \033[92m[OK] Synced {local_file.name} successfully.\033[0m")
                else:
                    print(f"  \033[91m[FAIL] Failed to sync {local_file.name}.\033[0m")
            
            # Recheck
            print("\n\033[94mRe-running check after sync...\033[0m")
            check_sync_again(ssh_key_path)
        else:
            print("\n\033[93mNo configuration files needed syncing. Mismatches exist in repo-tracked files.\033[0m")
            print("Please commit and push changes in your local repo, then run 'git pull' on the remote instance:")
            print(f"  ssh -i {ssh_key_path} {REMOTE_USER}@{REMOTE_HOST} \"cd {REMOTE_REPO_PATH} && git pull\"")
    else:
        # Prompt how to sync
        print("\n\033[95mTo sync config files automatically, run this command:\033[0m")
        print("  \033[96mpython scripts/check_sync.py --sync\033[0m")
        
        if repo_mismatches:
            print("\n\033[95mTo sync repository files (AGENTS.md, etc.):\033[0m")
            print("  1. Commit and push local changes to GitHub.")
            print(f"  2. Pull them on remote: ssh -i {ssh_key_path} {REMOTE_USER}@{REMOTE_HOST} \"cd {REMOTE_REPO_PATH} && git pull\"")

def check_sync_again(ssh_key_path: Path):
    """Silent check without command args parsing, called after upload sync."""
    any_mismatch = False
    for local_path, remote_path, desc in FILE_MAPPINGS:
        local_exists = local_path.exists()
        local_hash = ""
        if local_exists:
            with open(local_path, "rb") as f:
                local_hash = get_normalized_hash(f.read())

        cmd = f"cat {remote_path} 2>/dev/null"
        ret, out_content, _ = run_ssh_command(ssh_key_path, cmd)
        remote_exists = (ret == 0)
        remote_hash = ""
        if remote_exists:
            remote_hash = get_normalized_hash(out_content.encode("utf-8"))

        if not local_exists or not remote_exists or local_hash != remote_hash:
            any_mismatch = True
            
    if not any_mismatch:
        print("\n\033[92m[SUCCESS] POST-SYNC VERIFICATION: ALL FILES IN SYNC! OPERATIONAL STATUS: 100%\033[0m")
    else:
        print("\n\033[91m[FAIL] Some files are still out of sync. Please review manually.\033[0m")

if __name__ == "__main__":
    check_sync()
