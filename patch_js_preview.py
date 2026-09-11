import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"const linkHtml = `<br><a href=\"\$\{pubUrlData\.publicUrl\}\" target=\"_blank\" class=\"mp-link\" style=\"display:inline-block; margin-top:8px;\">Pakua / Download Document</a>`;\s*body \+= linkHtml;\s*if \(isPdf\) \{\s*body \+= `<br><iframe src=\"\$\{pubUrlData\.publicUrl\}\" style=\"width:100%;height:400px;border:1px solid rgba\(255,255,255,0\.2\);margin-top:10px;border-radius:8px;\"></iframe>`;\s*\}"

replacement = """const linkHtml = `<br><a href="${pubUrlData.publicUrl}" target="_blank" class="mp-link" style="display:inline-block; margin-top:8px;">Pakua / Download Document</a>`;
          body += linkHtml;
          if (isPdf) {
             body += `<details style="margin-top:12px; background:rgba(0,0,0,0.03); padding:8px; border-radius:8px; border:1px solid rgba(0,0,0,0.05);"><summary style="cursor:pointer; font-weight:bold; color:var(--al); outline:none;">Preview Document / Hakiki</summary><iframe src="${pubUrlData.publicUrl}" style="width:100%;height:500px;border:none;margin-top:12px;border-radius:4px;background:#fff;"></iframe></details>`;
          }"""

js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
