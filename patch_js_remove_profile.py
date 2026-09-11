with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

# Remove the block populating mpProfile
pattern = r"      \$\('mpProfile'\)\.innerHTML = '';\n[\s\S]*?\$\('mpProfile'\)\.appendChild\(v\);\n        \}\);"
js = re.sub(pattern, "", js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
