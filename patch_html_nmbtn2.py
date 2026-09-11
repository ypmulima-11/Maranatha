import glob
import re

for file in ["team.html", "works.html"]:
    try:
        with open(file, "r", encoding="utf-16") as f:
            html = f.read()
    except:
        with open(file, "r", encoding="utf-8", errors="ignore") as f:
            html = f.read()
    
    if '<button class="nm-btn"' in html and '<div class="nb">' in html:
        btn_match = re.search(r'(<button class="nm-btn"[^>]*>[\s\S]*?</button>)', html)
        if btn_match:
            btn_str = btn_match.group(1)
            html = html.replace(btn_str, '')
            html = html.replace('<div class="nb">', '<div class="nb">\n      ' + btn_str)
            with open(file, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"Patched {file}")
