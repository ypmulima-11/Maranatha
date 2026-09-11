with open("members.css", "r", encoding="utf-8") as f:
    css = f.read()

import re
css = re.sub(
    r"\.mp-dash-sidebar \{",
    ".mp-dash-sidebar {\n  width: 100%;\n  max-width: 100%;\n  -webkit-overflow-scrolling: touch;",
    css
)

css = re.sub(
    r"\.mp-dash-layout \{",
    ".mp-dash-layout {\n  width: 100%;\n  max-width: 100%;\n  box-sizing: border-box;",
    css
)

with open("members.css", "w", encoding="utf-8") as f:
    f.write(css)
