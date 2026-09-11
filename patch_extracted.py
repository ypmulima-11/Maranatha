with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
js = re.sub(
    r"\$\('mpNavAdmin'\)\.hidden = !isAdmin;",
    r"$('mpNavAdmin').hidden = !isAdmin;\n      if (document.getElementById('btn-dview-leader')) document.getElementById('btn-dview-leader').hidden = !isLeader;\n      if (document.getElementById('btn-dview-admin')) document.getElementById('btn-dview-admin').hidden = !isAdmin;",
    js
)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
