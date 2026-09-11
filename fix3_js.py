with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
js = re.sub(
    r"^[ \t]*\.hidden = !isAdmin;\n",
    "        $('mpNavAdmin').hidden = !isAdmin;\n",
    js, flags=re.MULTILINE
)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
