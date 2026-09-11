with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

target = "$('mpGreet').textContent = 'Habari, ' + this.profile.full_name;\n      $('mpSub').textContent =\n        (this.profile.title ? this.profile.title + ' \\u00b7 ' : '') +\n        'Signed in as ' + MemberPortal.roleLabel(this.profile.role);"

replacement = target + """

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
            .split(/\\s+/).filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join('') || '?';
        }
      }"""

if target in js:
    js = js.replace(target, replacement)
else:
    print("NOT FOUND")

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
