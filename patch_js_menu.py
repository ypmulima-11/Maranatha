import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"\$\('mpOut'\)\.addEventListener\('click', \(\) => this\.signOut\(\)\);\n\s*\$\('pvOut'\)\.addEventListener\('click', \(\) => this\.signOut\(\)\);"
replacement = """$('pvOut').addEventListener('click', () => this.signOut());
      
      const menuBtn = $('mpUserMenuBtn');
      const menuDrop = $('mpUserDropdown');
      if (menuBtn && menuDrop) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          menuDrop.hidden = !menuDrop.hidden;
        });
        document.addEventListener('click', (e) => {
          if (!menuDrop.contains(e.target) && !menuBtn.contains(e.target)) {
            menuDrop.hidden = true;
          }
        });
      }
      const menuProf = $('mpMenuProfile');
      if (menuProf) menuProf.addEventListener('click', () => {
        if (menuDrop) menuDrop.hidden = true;
        this.openProfileForm(false);
      });
      const menuLogout = $('mpMenuLogout');
      if (menuLogout) menuLogout.addEventListener('click', () => {
        if (menuDrop) menuDrop.hidden = true;
        this.signOut();
      });"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
