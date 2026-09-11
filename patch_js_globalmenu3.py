import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

menu_logic = """const menuBtn = $('mpUserMenuBtn');
      const menuDrop = $('mpUserDropdown');
      if (menuBtn && menuDrop) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          menuDrop.style.display = menuDrop.style.display === 'none' || !menuDrop.style.display ? 'flex' : 'none';
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

js = re.sub(r"const menuBtn = \$\('mpUserMenuBtn'\);[\s\S]*?this\.signOut\(\);\n\s*\}\);", menu_logic, js)

js = js.replace('this.hasSession = false;\n            this.setMemberMode(false);\n            this.showAuth();', "this.hasSession = false;\n            this.setMemberMode(false);\n            const globMenu = $('globalUserMenu');\n            if (globMenu) globMenu.style.display = 'none';\n            this.showAuth();")

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
