import re

with open("maranatha.css", "r", encoding="utf-8") as f:
    css = f.read()

pattern = r'\.nm-menu \{\s*position: fixed; top: 0; left: 0; bottom: 0; width: 260px; z-index: 10000;\s*background: rgba\(13, 42, 4, 0\.85\);\s*border-right: 1px solid rgba\(255,255,255,\.08\); border-bottom: none;\s*padding: 1\.5rem 2rem 2rem; display: flex;'

replacement = """.nm-menu {
    position: fixed; top: 0; left: 0; width: 260px; z-index: 10000;
    background: rgba(13, 42, 4, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    border-right: 1px solid rgba(255,255,255,.08); border-bottom: 1px solid rgba(255,255,255,.08);
    border-bottom-right-radius: 16px;
    padding: 1.5rem 2rem 2rem; display: flex;"""

css = re.sub(pattern, replacement, css)

with open("maranatha.css", "w", encoding="utf-8") as f:
    f.write(css)
