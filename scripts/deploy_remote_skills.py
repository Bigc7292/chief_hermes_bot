#!/usr/bin/env python3
"""Deploys external skills and plugins dynamically to the remote Hermes directories."""

import os
import shutil
import re
from pathlib import Path

EXTERNAL_REPOS_DIR = Path("/home/ubuntu/hermes-agent/ignored/external_repos")
HERMES_SKILLS_DIR = Path("/home/ubuntu/.hermes/skills/external-imports")
HERMES_PLUGINS_DIR = Path("/home/ubuntu/.hermes/plugins")

def find_folders_with_file(root_dir, filename):
    matched = []
    
    def walk(path):
        if not path.is_dir():
            return
        # Skip common VCS and runtime directories
        if path.name in {".git", ".github", "__pycache__", "venv", ".venv", "node_modules", ".hub", ".archive"}:
            return
        
        # Check if the target file exists directly in this directory
        target_file = path / filename
        if target_file.exists() or (path / filename.lower()).exists() or (path / filename.replace(".yaml", ".yml")).exists():
            matched.append(path)
            return  # Stop recursion once matched
            
        for child in path.iterdir():
            if child.is_dir():
                walk(child)
                
    walk(root_dir)
    return matched

def modify_skill_frontmatter(skill_md_path, repo_name):
    """If superpowers-zh, modify frontmatter name to append (ZH) to avoid collision."""
    if repo_name != "superpowers-zh":
        return
    try:
        content = skill_md_path.read_text(encoding="utf-8")
        # Check if frontmatter exists
        match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
        if match:
            frontmatter_text = match.group(1)
            # Find name: line
            name_match = re.search(r"^name:\s*(.*?)\s*$", frontmatter_text, re.MULTILINE)
            if name_match:
                original_name = name_match.group(1).strip("'\" ")
                new_name = f"{original_name} (ZH)"
                # Replace name line
                new_frontmatter = re.sub(
                    r"^name:\s*.*?$",
                    f"name: {new_name}",
                    frontmatter_text,
                    flags=re.MULTILINE
                )
                new_content = content.replace(frontmatter_text, new_frontmatter)
                skill_md_path.write_text(new_content, encoding="utf-8")
                print(f"    [MODIFIED FRONTMATTER] {skill_md_path.name} name: {new_name}")
    except Exception as e:
        print(f"    [WARN] Failed to modify frontmatter for {skill_md_path}: {e}")

def main():
    if not EXTERNAL_REPOS_DIR.exists():
        print(f"Error: External repos folder not found at {EXTERNAL_REPOS_DIR}")
        return
        
    print(f"Deploying external skills and plugins...")
    HERMES_SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    HERMES_PLUGINS_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Process and deploy skills
    print("\nScanning for skills (folders with SKILL.md)...")
    skills_deployed = 0
    
    # We iterate over each cloned repo folder under EXTERNAL_REPOS_DIR
    for repo_path in EXTERNAL_REPOS_DIR.iterdir():
        if not repo_path.is_dir():
            continue
            
        repo_name = repo_path.name
        found_skills = find_folders_with_file(repo_path, "SKILL.md")
        
        for skill_dir in found_skills:
            # Determine destination folder name
            prefix = repo_name.lower().replace("-skills", "").replace("_skills", "")
            dest_name = f"{prefix}-{skill_dir.name}"
            dest_path = HERMES_SKILLS_DIR / dest_name
            
            if dest_path.exists():
                shutil.rmtree(dest_path)
                
            try:
                shutil.copytree(skill_dir, dest_path)
                print(f"  [SKILL] Deployed {dest_name} (from {repo_name}/{skill_dir.relative_to(repo_path)})")
                
                # Check for frontmatter modifications
                skill_md_dest = dest_path / "SKILL.md"
                if not skill_md_dest.exists():
                    skill_md_dest = dest_path / "skill.md"
                if skill_md_dest.exists():
                    modify_skill_frontmatter(skill_md_dest, repo_name)
                    
                skills_deployed += 1
            except Exception as e:
                print(f"  [ERROR] Failed to deploy skill {dest_name}: {e}")
                
    # 2. Process and deploy plugins
    print("\nScanning for plugins (folders with plugin.yaml)...")
    plugins_deployed = 0
    
    for repo_path in EXTERNAL_REPOS_DIR.iterdir():
        if not repo_path.is_dir():
            continue
            
        repo_name = repo_path.name
        found_plugins = find_folders_with_file(repo_path, "plugin.yaml")
        
        for plugin_dir in found_plugins:
            # If the plugin is the repo root itself, name it after the repo
            if plugin_dir == repo_path:
                dest_name = repo_name.lower().replace("-plugins", "").replace("_plugins", "")
            else:
                # Prefix with repo name to avoid namespace collisions
                prefix = repo_name.lower().replace("-plugins", "").replace("_plugins", "")
                dest_name = f"{prefix}-{plugin_dir.name}"
                
            dest_path = HERMES_PLUGINS_DIR / dest_name
            
            if dest_path.exists():
                shutil.rmtree(dest_path)
                
            try:
                shutil.copytree(plugin_dir, dest_path)
                print(f"  [PLUGIN] Deployed {dest_name} (from {repo_name}/{plugin_dir.relative_to(repo_path)})")
                plugins_deployed += 1
            except Exception as e:
                print(f"  [ERROR] Failed to deploy plugin {dest_name}: {e}")
                
    print(f"\nDone! Deployed {skills_deployed} skills and {plugins_deployed} plugins successfully.")

if __name__ == "__main__":
    main()
