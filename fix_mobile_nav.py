import re

with open("maranatha.css", "r", encoding="utf-8") as f:
    css = f.read()

# Fix nm-btn inside media query
css = re.sub(r'\.nm-btn \{\s*display: none; \}', '.nm-btn { display: flex; }', css)

with open("maranatha.css", "w", encoding="utf-8") as f:
    f.write(css)
