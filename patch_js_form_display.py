with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

# Move form display
pattern1 = r"(\s*)(const form = \$\('adminResourceForm'\);\s*if \(form\) form\.style\.display = '';\s*)"
js = re.sub(pattern1, r"", js) # Remove from where it was

# Add to isLeader block
pattern2 = r"(if \(isLeader\) \{)"
replacement2 = r"if (isLeader) {\n          const form = $('adminResourceForm');\n          if (form) {\n            form.style.display = '';\n            if (!isAdmin) {\n              const aud = $('arAudience');\n              if (aud) {\n                aud.value = 'leader';\n                aud.disabled = true;\n              }\n            }\n          }\n"
js = re.sub(pattern2, replacement2, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
