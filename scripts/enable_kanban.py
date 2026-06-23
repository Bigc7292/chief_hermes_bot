#!/usr/bin/env python3
"""Enables the kanban toolset in the chief-hub profile's config.yaml."""

import yaml
from pathlib import Path

config_path = Path("/home/ubuntu/.hermes/profiles/chief-hub/config.yaml")

def main():
    if not config_path.exists():
        print(f"Error: Config file not found at {config_path}")
        return
        
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            
        if not data:
            data = {}
            
        toolsets = data.get("toolsets", [])
        if "kanban" not in toolsets:
            toolsets.append("kanban")
            data["toolsets"] = toolsets
            
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(data, f, default_flow_style=False)
            print("Successfully enabled 'kanban' in chief-hub config.yaml.")
        else:
            print("'kanban' is already enabled in config.yaml.")
    except Exception as e:
        print(f"Error updating config.yaml: {e}")

if __name__ == "__main__":
    main()
