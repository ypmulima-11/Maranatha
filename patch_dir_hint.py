with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
js = re.sub(
    r"if \(hint\) hint\.textContent = isLeader\n[ \t]*\? 'Names, voice parts and contact details .*?'\n[ \t]*: 'Names and voice parts\. Contact details are visible to leaders only\.';",
    "if (hint) hint.textContent = canViewFull ? 'Names, voice parts and contact details.' : 'Names and voice parts. Contact details are restricted.';",
    js
)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
