with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
match = re.search(r'residence = \$\(\'pfResName\'\)\.value\.trim\(\);\s*if \(\!residence\) \{.*?\}', js, re.DOTALL)
if match:
    end_idx = js.find('this.loadDashboard();', match.end())
    if end_idx != -1:
        print(js[match.end():end_idx + 30])
