#!/usr/bin/env python3
"""Merge parliament CV data into graph nodes"""
import json

DATA_DIR = "public/data"

def main():
    # Load data
    with open(f"{DATA_DIR}/nodes.json", "r") as f:
        nodes = json.load(f)
    
    with open(f"{DATA_DIR}/parliament-cvs.json", "r") as f:
        cvs = json.load(f)
    
    print(f"Loaded {len(nodes)} nodes, {len(cvs)} CVs")
    
    # Build CV lookup by name
    cv_by_name = {}
    for cv in cvs:
        name = cv.get("name", "").strip()
        if name and len(name) > 3:
            # Try full name
            cv_by_name[name] = cv
            # Try last name only
            parts = name.split()
            if len(parts) >= 2:
                cv_by_name[parts[-1]] = cv
    
    # Enrich nodes
    enriched = 0
    for node in nodes:
        name = node.get("name", "").strip()
        if not name:
            continue
        
        # Try to find matching CV
        cv = cv_by_name.get(name)
        if not cv:
            # Try partial match
            for cv_name, cv_data in cv_by_name.items():
                if name in cv_name or cv_name in name:
                    cv = cv_data
                    break
        
        if not cv:
            continue
        
        # Enrich profile
        if not node.get("profile"):
            node["profile"] = {}
        
        profile = node["profile"]
        
        # Add work history
        if cv.get("workHistory") and not profile.get("work_history"):
            profile["work_history"] = cv["workHistory"]
        
        # Add awards
        if cv.get("awards") and not profile.get("awards"):
            profile["awards"] = cv["awards"]
        
        # Add committees
        if cv.get("committees") and not profile.get("committees"):
            profile["committees"] = cv["committees"]
        
        # Add email
        if cv.get("email") and not profile.get("email"):
            profile["email"] = cv["email"]
        
        enriched += 1
    
    print(f"Enriched {enriched} nodes")
    
    # Save
    with open(f"{DATA_DIR}/nodes.json", "w") as f:
        json.dump(nodes, f, ensure_ascii=False, indent=2)
    
    print(f"Saved {len(nodes)} nodes")

if __name__ == "__main__":
    main()
