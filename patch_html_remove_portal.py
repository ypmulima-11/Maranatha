import glob
import re

for file in glob.glob("*.html"):
    with open(file, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    
    # Remove any remaining "Member Portal" links everywhere (especially in footer)
    html = re.sub(r'<a href="[^"]*#portal"[^>]*>Member Portal</a>\s*', '', html)
    html = re.sub(r'<a href="#portal"[^>]*>Member Portal</a>\s*', '', html)
    
    with open(file, "w", encoding="utf-8") as f:
        f.write(html)
