import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"const path = Date\.now\(\) \+ '_' \+ file\.name\.replace\(/\[\^a-zA-Z0-9_\.-\]/g, '_'\);\n\s*const \{ error: upErr \} = await this\.supabase\.storage\.from\('documents'\)\.upload\(path, file, \{ contentType: file\.type \|\| \(isPdf \? 'application/pdf' : 'application/octet-stream'\) \}\);"
replacement = r"""const path = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const { error: upErr } = await this.supabase.storage.from('documents').upload(path, file, { contentType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream') });"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
