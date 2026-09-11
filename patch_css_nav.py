with open("maranatha.css", "r", encoding="utf-8") as f:
    css = f.read()

import re

# Change .nl to display: none always
css = re.sub(r'\.nl \{ display: flex; align-items: center; gap: 1\.7rem; \}', '.nl { display: none; align-items: center; gap: 1.7rem; }', css)

# Change .nm-btn to display: flex always
css = re.sub(r'\.nm-btn \{\s*display: none;', '.nm-btn {\n    display: flex;', css)

with open("maranatha.css", "w", encoding="utf-8") as f:
    f.write(css)
