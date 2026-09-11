with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = """      $('mpGreet').textContent = 'Habari, ' + this.profile.full_name;
      $('mpSub').textContent =
        (this.profile.title ? this.profile.title + ' \u00b7 ' : '') +
        'Signed in as ' + MemberPortal.roleLabel(this.profile.role);"""

replacement = """      $('mpGreet').textContent = 'Habari, ' + this.profile.full_name;
      $('mpSub').textContent =
        (this.profile.title ? this.profile.title + ' \u00b7 ' : '') +
        'Signed in as ' + MemberPortal.roleLabel(this.profile.role);

      const avatarBtnInitials = $('mpAvatarInitials');
      const avatarBtnImg = $('mpAvatarImg');
      if (this.profile.avatar_url) {
        if (avatarBtnImg) {
          avatarBtnImg.src = this.profile.avatar_url;
          avatarBtnImg.hidden = false;
        }
        if (avatarBtnInitials) avatarBtnInitials.hidden = true;
      } else {
        if (avatarBtnImg) avatarBtnImg.hidden = true;
        if (avatarBtnInitials) {
          avatarBtnInitials.hidden = false;
          avatarBtnInitials.textContent = (this.profile.full_name || '?')
            .split(/\s+/).filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join('') || '?';
        }
      }"""
js = js.replace(pattern, replacement)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
