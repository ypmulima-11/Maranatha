import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"await this\.supabase\.storage\.from\('documents'\)\.upload\(path, file\);"
replacement = r"await this.supabase.storage.from('documents').upload(path, file, { contentType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream') });"
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
