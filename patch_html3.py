import re

with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace profile form
pattern1 = r'(<input type="text" id="pfName" autocomplete="name">\s*</label>)'
replacement1 = r'\1\n                <label class="mp-field"><span>Profile Picture (optional)</span>\n                  <input type="file" id="pfAvatar" accept="image/*">\n                </label>'
html = re.sub(pattern1, replacement1, html)

# Replace resource form
pattern2 = r'(<textarea id="rsBody" required></textarea></label>)'
replacement2 = r'<textarea id="rsBody"></textarea></label>\n                <label class="mp-field"><span>Document Upload (optional)</span>\n                  <input type="file" id="rsFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">\n                </label>'
html = re.sub(pattern2, replacement2, html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
