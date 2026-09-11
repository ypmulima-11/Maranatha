with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
js = re.sub(
    r"const p = document\.createElement\('p'\);\n\s*p\.textContent = it\.body \|\| '';",
    "const p = document.createElement('p');\n        p.innerHTML = it.body || '';",
    js
)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
