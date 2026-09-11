import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

# Replace menu logic
menu_logic = """      const menuBtn = $('mpUserMenuBtn');
      const menuDrop = $('mpUserDropdown');
      if (menuBtn && menuDrop) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          menuDrop.style.display = menuDrop.style.display === 'none' ? 'flex' : 'none';
        });
        document.addEventListener('click', (e) => {
          if (!menuDrop.contains(e.target) && !menuBtn.contains(e.target)) {
            menuDrop.style.display = 'none';
          }
        });
      }
      const menuProf = $('mpMenuProfile');
      if (menuProf) menuProf.addEventListener('click', () => {
        if (menuDrop) menuDrop.style.display = 'none';
        this.openProfileForm(false);
      });
      const menuLogout = $('mpMenuLogout');
      if (menuLogout) menuLogout.addEventListener('click', () => {
        if (menuDrop) menuDrop.style.display = 'none';
        this.signOut();
      });"""

js = re.sub(r'const menuBtn = \$\(\'mpUserMenuBtn\'\);[\s\S]*?this\.signOut\(\);\n\s*\}\);', menu_logic, js)

# Replace render avatar logic
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
            .split(/\\s+/).filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join('') || '?';
        }
      }
      
      const globMenu = $('globalUserMenu');
      if (globMenu) globMenu.style.display = 'inline-block';"""

js = re.sub(r'const avatarBtnInitials = \$\(\'mpAvatarInitials\'\);[\s\S]*?\.join\(\'\'\) \|\| \'\?\'\;\n\s*\}\n\s*\}', avatar_logic, js)

# Hide global menu on sign out
js = js.replace('this.hasSession = false;\n          this.setMemberMode(false);\n          this.showAuth();', "this.hasSession = false;\n          this.setMemberMode(false);\n          const globMenu = $('globalUserMenu');\n          if (globMenu) globMenu.style.display = 'none';\n          this.showAuth();")

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
