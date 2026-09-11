import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"const path = user\.id \+ '_' \+ Date\.now\(\) \+ '_' \+ file\.name\.replace\(/\[\^a-zA-Z0-9_\.-\]/g, '_'\);"
replacement = "const path = user.id + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');"
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
