import glob
import re

for file in glob.glob("*.html"):
    with open(file, "r", encoding="utf-8") as f:
        html = f.read()
    
    # Check if .nm-btn is outside .nb
    if '<button class="nm-btn"' in html and '<div class="nb">' in html:
        # Extract nmBtn
        btn_match = re.search(r'(<button class="nm-btn"[^>]*>[\s\S]*?</button>)', html)
        if btn_match:
            btn_str = btn_match.group(1)
            # Remove it from current location
            html = html.replace(btn_str, '')
            # Insert it inside .nb as the first child
            html = html.replace('<div class="nb">', '<div class="nb">\n      ' + btn_str)
            
            with open(file, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"Patched {file}")
