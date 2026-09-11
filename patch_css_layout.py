import re

with open("maranatha.css", "r", encoding="utf-8") as f:
    css = f.read()

# 1. Restore .nl on desktop
css = re.sub(r'\.nl \{ display: none; align-items: center; gap: 1\.7rem; \}', '.nl { display: flex; align-items: center; gap: 1.7rem; }', css)

# 2. Hide .nm-btn on desktop
css = re.sub(r'\.nm-btn \{\s*display: flex;', '.nm-btn {\n    display: none;', css)

# 3. Modify .nm-menu to be a left-to-right side drawer
old_menu = r'\.nm-menu \{\s*position: fixed; top: 100px; left: 0; right: 0; z-index: 998;\s*background: var\(--g9\); border-bottom: 1px solid rgba\(255,255,255,\.08\);\s*padding: 1rem 2\.5rem 1\.5rem; display: flex;\s*flex-direction: column; gap: 6px;\s*transform: translateY\(-15px\); opacity: 0; visibility: hidden; pointer-events: none;\s*transition: transform \.3s ease, opacity \.3s ease, visibility \.3s ease;\s*\}'

new_menu = """.nm-menu {
    position: fixed; top: 0; left: 0; bottom: 0; width: 260px; z-index: 10000;
    background: var(--g9); border-right: 1px solid rgba(255,255,255,.08); border-bottom: none;
    padding: 5rem 2rem 2rem; display: flex;
    flex-direction: column; gap: 6px;
    transform: translateX(-100%); opacity: 1; visibility: hidden; pointer-events: none;
    transition: transform .3s cubic-bezier(0.4, 0, 0.2, 1), visibility .3s;
    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
  }"""
css = re.sub(old_menu, new_menu, css)

old_menu_open = r'\.nm-menu\.open \{ visibility: visible; transform: translateY\(0\); opacity: 1; pointer-events: auto; \}'
new_menu_open = '.nm-menu.open { visibility: visible; transform: translateX(0); opacity: 1; pointer-events: auto; }'
css = re.sub(old_menu_open, new_menu_open, css)

with open("maranatha.css", "w", encoding="utf-8") as f:
    f.write(css)
