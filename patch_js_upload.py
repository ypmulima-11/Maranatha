with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

old_upload = r"        const avInput = \$\('pfAvatar'\);\n\s*if \(avInput && avInput\.files && avInput\.files\[0\]\) \{\n\s*const file = avInput\.files\[0\];\n\s*const path = user\.id \+ '/' \+ Date\.now\(\) \+ '_' \+ file\.name\.replace\(/\[\^a-zA-Z0-9_\.-\]/g, '_'\);\n\s*const \{ error: avErr \} = await this\.supabase\.storage\.from\('avatars'\)\.upload\(path, file, \{ upsert: true \}\);\n\s*if \(avErr\) \{\n\s*msg\.className = 'mp-msg err';\n\s*msg\.textContent = 'Failed to upload profile picture: ' \+ avErr\.message;\n\s*return;\n\s*\}\n\s*const \{ data: pubUrlData \} = this\.supabase\.storage\.from\('avatars'\)\.getPublicUrl\(path\);\n\s*if \(pubUrlData && pubUrlData\.publicUrl\) \{\n\s*avatarUrl = pubUrlData\.publicUrl;\n\s*\}\n\s*\}"

new_upload = """        if (this.avatarDelete && avatarUrl) {
          try {
            const oldPath = avatarUrl.split('/').pop();
            await this.supabase.storage.from('avatars').remove([user.id + '/' + oldPath]);
          } catch(e) {}
          avatarUrl = null;
        }

        if (this.avatarBlob) {
          const path = user.id + '/' + Date.now() + '_avatar.jpg';
          const { error: avErr } = await this.supabase.storage.from('avatars').upload(path, this.avatarBlob, { upsert: true, contentType: 'image/jpeg' });
          if (avErr) {
            msg.className = 'mp-msg err';
            msg.textContent = 'Failed to upload profile picture: ' + avErr.message;
            return;
          }
          const { data: pubUrlData } = this.supabase.storage.from('avatars').getPublicUrl(path);
          if (pubUrlData && pubUrlData.publicUrl) {
            avatarUrl = pubUrlData.publicUrl;
          }
        }"""

js = re.sub(old_upload, new_upload, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
