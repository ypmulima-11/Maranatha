import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"      const patch = \{\n        id: user\.id,"
replacement = """      const isLeaderRole = this.profile && (this.profile.role === 'leader' || this.profile.role === 'section_leader' || this.profile.role === 'admin');
      if (isLeaderRole && !avatarUrl) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Profile picture is compulsory for leaders. Please upload an image.';
        return;
      }

      const patch = {
        id: user.id,"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
