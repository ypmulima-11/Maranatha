with open('members.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
html = re.sub(r'members\.js\?v=\d+', 'members.js?v=13', html)

with open('members.html', 'w', encoding='utf-8') as f:
    f.write(html)
