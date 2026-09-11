import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

# Remove from profileComplete
pattern1 = r"const isLeaderRole = p\.role === 'leader' \|\| p\.role === 'section_leader' \|\| p\.role === 'admin';\n\s*if \(isLeaderRole && !p\.avatar_url\) return false;"
js = re.sub(pattern1, "", js)

# Remove from onSaveProfile
pattern2 = r"const isLeaderRole = this\.profile && \(this\.profile\.role === 'leader' \|\| this\.profile\.role === 'section_leader' \|\| this\.profile\.role === 'admin'\);\n\s*if \(isLeaderRole && !avatarUrl\) \{\n\s*msg\.className = 'mp-msg err';\n\s*msg\.textContent = 'Profile picture is compulsory for leaders\. Please upload an image\.';\n\s*return;\n\s*\}"
js = re.sub(pattern2, "", js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
