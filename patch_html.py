with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

import re

# Add profile picture field
profile_html = """                <label class="mp-field"><span>Full name</span>
                  <input type="text" id="pfName" autocomplete="name">
                </label>
                <label class="mp-field"><span>Profile Picture (optional)</span>
                  <input type="file" id="pfAvatar" accept="image/*">
                </label>"""
html = re.sub(r'                <label class="mp-field"><span>Full name</span>\s*<input type="text" id="pfName" autocomplete="name">\s*</label>', profile_html, html)

# Add Document upload field
resource_html = """                <label class="mp-field"><span>Title</span> <input type="text" id="rsTitle" required></label>
                <label class="mp-field"><span>Content / Link (HTML allowed)</span> <textarea id="rsBody"></textarea></label>
                <label class="mp-field"><span>Document Upload (optional)</span>
                  <input type="file" id="rsFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">
                </label>"""
html = re.sub(r'                <label class="mp-field"><span>Title</span> <input type="text" id="rsTitle" required></label>\s*<label class="mp-field"><span>Content / Link \(HTML allowed\)</span> <textarea id="rsBody" required></textarea></label>', resource_html, html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
