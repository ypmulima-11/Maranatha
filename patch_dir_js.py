with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
js = re.sub(
    r"const isLeader = \['leader', 'section_leader', 'admin'\].includes\(this\.profile\.role\);\n[ \t]*const \{ data, error \} = await this\.supabase\.rpc\(isLeader \? 'directory_full' : 'directory'\);",
    "const isLeader = ['leader', 'section_leader', 'admin'].includes(this.profile.role);\n        const canViewFull = this.profile.role === 'admin' || this.profile.can_view_directory === true;\n        const { data, error } = await this.supabase.rpc(canViewFull ? 'directory_full' : 'directory');",
    js
)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
