import re

with open("maranatha.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"this\.nmMenu\.querySelectorAll\('a'\)\.forEach\(a => a\.addEventListener\('click', \(\) => this\.closeMenu\(\)\)\);"
replacement = "this.nmMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => this.closeMenu()));\n      const nmClose = El.get('nmClose');\n      if (nmClose) nmClose.addEventListener('click', () => this.closeMenu());"

js = re.sub(pattern, replacement, js)

with open("maranatha.js", "w", encoding="utf-8") as f:
    f.write(js)
