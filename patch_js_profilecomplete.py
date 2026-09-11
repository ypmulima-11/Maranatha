import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"    profileComplete\(p\) \{\n      if \(\!p\) return false;\n      if \(\!\(p\.dob && p\.phone && p\.study_status && p\.residence_type\)\) return false;\n      if \(p\.study_status === 'studying'\) \{\n        if \(\!\(p\.course_program && p\.university && p\.expected_grad_year\)\) return false;\n      \} else if \(p\.study_status === 'alumni'\) \{\n        if \(\!p\.grad_year\) return false;\n      \}\n      if \(p\.residence_type === 'campus' && \!p\.residence\) return false;\n      if \(p\.residence_type === 'off_campus' && \!p\.residence\) return false;\n      return true;\n    \}"

replacement = """    profileComplete(p) {
      if (!p) return false;
      if (!(p.dob && p.phone && p.study_status && p.residence_type)) return false;
      if (p.study_status === 'studying') {
        if (!(p.course_program && p.university && p.expected_grad_year)) return false;
      } else if (p.study_status === 'alumni') {
        if (!p.grad_year) return false;
      }
      if (p.residence_type === 'campus' && !p.residence) return false;
      if (p.residence_type === 'off_campus' && !p.residence) return false;
      
      const isLeaderRole = p.role === 'leader' || p.role === 'section_leader' || p.role === 'admin';
      if (isLeaderRole && !p.avatar_url) return false;
      
      return true;
    }"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
