with open("members.css", "r", encoding="utf-8") as f:
    css = f.read()

import re
css = re.sub(
    r"\.mp-dash-in \{ max-width: 980px; margin: 0 auto; padding: 2rem 1\.2rem 4rem; \}",
    ".mp-dash-in { max-width: 1200px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }",
    css
)

with open("members.css", "w", encoding="utf-8") as f:
    f.write(css)
