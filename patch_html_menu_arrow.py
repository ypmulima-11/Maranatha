import glob
import re

for file in glob.glob("*.html"):
    with open(file, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    
    # Check if we already added it
    if 'id="nmClose"' not in html:
        # We need to insert <button class="nm-close" id="nmClose" aria-label="Close menu">&larr;</button> inside nm-menu
        html = html.replace('<div class="nm-menu" id="nmMenu">', '<div class="nm-menu" id="nmMenu">\n    <button class="nm-close" id="nmClose" aria-label="Close menu">&larr;</button>')
        
        # Also remove Member Portal link
        html = re.sub(r'<a href="#portal" data-i18n="nav\.portal">Member Portal</a>\s*', '', html)
        
        with open(file, "w", encoding="utf-8") as f:
            f.write(html)
