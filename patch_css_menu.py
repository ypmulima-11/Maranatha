import re

with open("maranatha.css", "r", encoding="utf-8") as f:
    css = f.read()

pattern = r'\.nm-menu \{\s*position: fixed; top: 0; left: 0; bottom: 0; width: 260px; z-index: 10000;\s*background: var\(--g9\); border-right: 1px solid rgba\(255,255,255,\.08\); border-bottom: none;\s*padding: 5rem 2rem 2rem; display: flex;\s*flex-direction: column; gap: 6px;\s*transform: translateX\(-100%\); opacity: 1; visibility: hidden; pointer-events: none;\s*transition: transform \.3s cubic-bezier\(0\.4, 0, 0\.2, 1\), visibility \.3s;\s*box-shadow: 10px 0 30px rgba\(0,0,0,0\.5\);\s*\}'

replacement = """.nm-menu {
    position: fixed; top: 0; left: 0; width: 260px; z-index: 10000;
    background: rgba(9, 26, 3, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-right: 1px solid rgba(255,255,255,.08); border-bottom: 1px solid rgba(255,255,255,.08);
    border-bottom-right-radius: 16px;
    padding: 1.5rem 2rem 2rem; display: flex;
    flex-direction: column; gap: 6px;
    transform: translateX(-100%); opacity: 1; visibility: hidden; pointer-events: none;
    transition: transform .3s cubic-bezier(0.4, 0, 0.2, 1), visibility .3s;
    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
  }
  .nm-close {
    background: transparent; border: none; color: #fff; font-size: 24px; cursor: pointer;
    align-self: flex-start; margin-bottom: 1rem; padding: 0; display: flex; align-items: center; justify-content: center;
  }
  .nm-close:hover { color: var(--al); }"""

css = re.sub(pattern, replacement, css)

with open("maranatha.css", "w", encoding="utf-8") as f:
    f.write(css)
