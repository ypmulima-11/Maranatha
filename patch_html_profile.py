import re

with open("members.html", "r", encoding="utf-8") as f:
    html = f.read()

pattern = r'\s*<div class="mp-card2">\s*<h2 data-i18n="portal\.profile">My profile</h2>\s*<div class="mp-pro" id="mpProfile"></div>\s*<button type="button" class="mp-btn" id="mpEditProfile">Edit profile</button>\s*</div>'
html = re.sub(pattern, '', html)

with open("members.html", "w", encoding="utf-8") as f:
    f.write(html)
