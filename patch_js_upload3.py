with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

target = """        const avInput = $('pfAvatar');
        if (avInput && avInput.files && avInput.files[0]) {
          const file = avInput.files[0];
          const path = user.id + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const { error: avErr } = await this.supabase.storage.from('avatars').upload(path, file, { upsert: true });
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

js = js.replace(target, new_upload)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
