import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"(\$\('mpProfile'\)\.innerHTML = '';\n)"
replacement = r"""\1        if (this.profile.avatar_url) {
          const imgWrap = document.createElement('div');
          imgWrap.style.textAlign = 'center';
          imgWrap.style.marginBottom = '16px';
          const img = document.createElement('img');
          img.src = this.profile.avatar_url;
          img.style.width = '100px';
          img.style.height = '100px';
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          img.style.border = '2px solid rgba(255,255,255,0.2)';
          imgWrap.appendChild(img);
          $('mpProfile').appendChild(imgWrap);
        }
"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
