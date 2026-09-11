with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

js = re.sub(r"\$\('mpEditProfile'\)\.addEventListener\('click', \(\) => this\.openProfileForm\(false\)\);\n", "", js)

# And closeProfileEdit references mpEditProfile
js = re.sub(r"\$\('mpEditProfile'\)\.hidden = false;\n", "", js)
js = re.sub(r"\$\('mpEditProfile'\)\.hidden = true;\n", "", js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
