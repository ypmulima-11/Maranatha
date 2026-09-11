import glob
import re

for file in glob.glob("*.html"):
    with open(file, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    
    html = re.sub(r'maranatha\.css\?v=\d+', 'maranatha.css?v=22', html)
    html = re.sub(r'members\.css\?v=\d+', 'members.css?v=22', html)
    html = re.sub(r'maranatha\.js\?v=\d+', 'maranatha.js?v=22', html)
    html = re.sub(r'members\.js\?v=\d+', 'members.js?v=22', html)
    
    with open(file, "w", encoding="utf-8") as f:
        f.write(html)
