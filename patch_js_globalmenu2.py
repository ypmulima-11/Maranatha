import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

avatar_logic = """      const avatarBtnInitials = $('mpAvatarInitials');
      const avatarBtnImg = $('mpAvatarImg');
      if (this.profile.avatar_url) {
        if (avatarBtnImg) {
          avatarBtnImg.src = this.profile.avatar_url;
          avatarBtnImg.style.display = 'block';
        }
        if (avatarBtnInitials) avatarBtnInitials.style.display = 'none';
      } else {
        if (avatarBtnImg) avatarBtnImg.style.display = 'none';
        if (avatarBtnInitials) {
          avatarBtnInitials.style.display = 'flex';
          avatarBtnInitials.textContent = (this.profile.full_name || '?')
            .split(/\\\\s+/).filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join('') || '?';
        }
      }
      
      const globMenu = $('globalUserMenu');
      if (globMenu) globMenu.style.display = 'inline-block';"""

js = re.sub(r"const avatarBtnInitials = \$\('mpAvatarInitials'\);[\s\S]*?\.join\(''\) \|\| '\?';\n\s*\}\n\s*\}", avatar_logic, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
