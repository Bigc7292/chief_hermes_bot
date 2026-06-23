#!/usr/bin/env python3
"""Deploys selected high-value skills to the remote Hermes configuration home directory."""

import shutil
from pathlib import Path

# Target directories on Ubuntu
EXTERNAL_REPOS_DIR = Path("/home/ubuntu/hermes-agent/ignored/external_repos")
HERMES_SKILLS_DIR = Path("/home/ubuntu/.hermes/skills/external-imports")

# Deploy specifications: (Source path under external_repos, Target folder name)
SKILL_DEPLOY_SPEC = [
    # superpowers-zh skills
    ("superpowers-zh/skills/mcp-builder", "mcp-builder"),
    ("superpowers-zh/skills/workflow-runner", "workflow-runner"),
    ("superpowers-zh/skills/subagent-driven-development", "subagent-driven-development"),
    ("superpowers-zh/skills/systematic-debugging", "systematic-debugging"),
    ("superpowers-zh/skills/brainstorming", "brainstorming"),
    
    # ECC skills
    ("ECC/skills/agent-architecture-audit", "agent-architecture-audit"),
    ("ECC/skills/liquid-glass-design", "liquid-glass-design"),
    ("ECC/skills/seo", "seo"),
    ("ECC/skills/brand-voice", "brand-voice"),
    ("ECC/skills/continuous-learning-v2", "continuous-learning-v2"),
    
    # awesome-claude-code slash commands
    ("awesome-claude-code/resources/slash-commands/optimize", "optimize-code"),
    ("awesome-claude-code/resources/slash-commands/pr-review", "pr-review"),
    ("awesome-claude-code/resources/slash-commands/release", "release-command")
]

def main():
    if not EXTERNAL_REPOS_DIR.exists():
        print(f"Error: Cloned repositories folder not found at {EXTERNAL_REPOS_DIR}")
        return
        
    print(f"Deploying external skills into {HERMES_SKILLS_DIR}...")
    HERMES_SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    
    deployed_count = 0
    for rel_src, dest_name in SKILL_DEPLOY_SPEC:
        src_path = EXTERNAL_REPOS_DIR / rel_src
        dest_path = HERMES_SKILLS_DIR / dest_name
        
        if not src_path.exists():
            print(f"  [MISSING] Source folder not found: {src_path}")
            continue
            
        # Clean destination if exists
        if dest_path.exists():
            shutil.rmtree(dest_path)
            
        try:
            shutil.copytree(src_path, dest_path)
            print(f"  [DEPLOYED] {dest_name} (from {rel_src})")
            deployed_count += 1
        except Exception as e:
            print(f"  [ERROR] Failed to deploy {dest_name}: {e}")
            
    print(f"\nDone! Deployed {deployed_count} skills successfully.")

if __name__ == "__main__":
    main()
