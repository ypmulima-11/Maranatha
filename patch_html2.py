with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

import re

html = html.replace(
    '<input type="text" id="pfName" autocomplete="name">\n                </label>',
    '<input type="text" id="pfName" autocomplete="name">\n                </label>\n                <label class="mp-field"><span>Profile Picture (optional)</span>\n                  <input type="file" id="pfAvatar" accept="image/*">\n                </label>'
)

html = html.replace(
    '<textarea id="rsBody" required></textarea></label>',
    '<textarea id="rsBody"></textarea></label>\n                <label class="mp-field"><span>Document Upload (optional)</span>\n                  <input type="file" id="rsFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">\n                </label>'
)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
