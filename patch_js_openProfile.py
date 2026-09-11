with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

# Add openProfileForm initialization
openProfilePattern = r"      \$\('pfMsg'\)\.className = 'mp-msg';\n      \$\('pfMsg'\)\.textContent = '';"
openProfileReplace = """      $('pfMsg').className = 'mp-msg';
      $('pfMsg').textContent = '';
      
      this.avatarBlob = null;
      this.avatarDelete = false;
      const avPrev = $('pfAvatarPreview');
      const avDelBtn = $('pfAvatarDelete');
      if (avPrev && avDelBtn) {
        if (this.profile && this.profile.avatar_url) {
          avPrev.src = this.profile.avatar_url;
          avPrev.style.display = 'block';
          avDelBtn.style.display = 'inline-block';
        } else {
          avPrev.src = '';
          avPrev.style.display = 'none';
          avDelBtn.style.display = 'none';
        }
      }
      if ($('pfAvatar')) $('pfAvatar').value = '';
"""
js = re.sub(openProfilePattern, openProfileReplace, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
