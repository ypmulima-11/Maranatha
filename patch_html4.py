import re

with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

pattern = r'(<textarea id="arBody" rows="3"[^>]*></textarea>\s*</label>)'
replacement = r'\1\n                <label class="mp-field"><span>Document Upload (optional)</span>\n                  <input type="file" id="arFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">\n                </label>'
html = re.sub(pattern, replacement, html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
