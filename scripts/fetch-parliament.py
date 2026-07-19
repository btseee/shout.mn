#!/usr/bin/env python3
"""Fetch all MP CVs from parliament.mn using requests"""
import json
import re
import urllib.request
import ssl
import time

DATA_DIR = "public/data"

# Disable SSL verification for simplicity
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        return resp.read().decode("utf-8")

def parse_cv(html, mp_id):
    """Parse MP CV from HTML"""
    # Extract name
    name_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    name = ""
    if name_match:
        name = re.sub(r'<[^>]+>', ' ', name_match.group(1)).strip()
        name = re.sub(r'\s+', ' ', name)
    
    # Extract sections
    sections = {}
    section_pattern = r'(ТӨГССӨН СУРГУУЛЬ, МЭРГЭЖИЛ|АЖИЛЛАСАН БАЙДАЛ|ШАГНАЛ|ГАДААД ХЭЛ|ЦАХИМ ШУУДАН|УТАСНЫ ДУГААР|ӨРӨӨНИЙ ДУГААР|БАЙНГЫН ХОРООДОР|АЛБАН ТУШААЛААР|ДЭД ХОРООДООР)'
    
    # Find all section starts
    section_starts = [(m.start(), m.group(1)) for m in re.finditer(section_pattern, html)]
    
    for i, (start, section_name) in enumerate(section_starts):
        end = section_starts[i+1][0] if i+1 < len(section_starts) else start + 5000
        section_html = html[start:end]
        # Extract text content
        section_text = re.sub(r'<[^>]+>', '\n', section_html)
        section_text = re.sub(r'\n+', '\n', section_text)
        lines = [l.strip() for l in section_text.split('\n') if l.strip() and l.strip() != section_name]
        sections[section_name] = lines
    
    return {
        "id": mp_id,
        "name": name,
        "education": sections.get("ТӨГССӨН СУРГУУЛЬ, МЭРГЭЖИЛ", []),
        "workHistory": sections.get("АЖИЛЛАСАН БАЙДАЛ", []),
        "awards": sections.get("ШАГНАЛ", []),
        "languages": sections.get("ГАДААД ХЭЛ", []),
        "email": sections.get("ЦАХИМ ШУУДАН", [""])[0] if sections.get("ЦАХИМ ШУУДАН") else "",
        "phone": sections.get("УТАСНЫ ДУГААР", [""])[0] if sections.get("УТАСНЫ ДУГААР") else "",
        "committees": sections.get("БАЙНГЫН ХОРООДОР", []),
        "positions": sections.get("АЛБАН ТУШААЛААР", []),
    }

def main():
    # First get all member IDs from the main page
    print("Fetching member list...")
    main_html = fetch_url("http://parliament.mn/cv")
    
    # Extract member IDs
    member_ids = list(set(re.findall(r'/cv/(\d+)/', main_html)))
    print(f"Found {len(member_ids)} unique MP IDs")
    
    # Scrape each MP
    mps = []
    for i, mp_id in enumerate(member_ids):
        url = f"https://www.parliament.mn/cv/{mp_id}/"
        try:
            html = fetch_url(url)
            cv = parse_cv(html, mp_id)
            cv["url"] = url
            mps.append(cv)
            
            if (i + 1) % 10 == 0:
                print(f"  Scraped {i + 1}/{len(member_ids)}")
            
            time.sleep(0.5)  # Be nice to the server
            
        except Exception as e:
            print(f"  Error {mp_id}: {e}")
    
    # Save
    with open(f"{DATA_DIR}/parliament-cvs.json", "w") as f:
        json.dump(mps, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved {len(mps)} MP CVs")
    
    # Summary
    if mps:
        print("\nSample MPs:")
        for mp in mps[:5]:
            print(f"  {mp['name']}: {len(mp['workHistory'])} work, {len(mp['awards'])} awards, {len(mp['committees'])} committees")

if __name__ == "__main__":
    main()
