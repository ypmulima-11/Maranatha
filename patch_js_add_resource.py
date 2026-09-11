with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re

old_addResource = """    async addResource(e) {
      e.preventDefault();
      const msg = $('arMsg');
      const title = $('arTitle').value.trim();
      const body = $('arBody').value.trim();
      const audience = $('arAudience').value;
      if (!title) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Give the resource a title.';
        return;
      }
      const { error } = await this.supabase.from('resources').insert({
        title: title,
        body: body,
        audience: audience
      });
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      $('adminResourceForm').reset();
      msg.className = 'mp-msg ok';
      msg.textContent = 'Resource added.';
      const { data } = await this.supabase.from('resources').select('*').order('created_at', { ascending: true });
      this.resources = data || [];
      this.renderDashboard();
    }"""

new_addResource = """    async addResource(e) {
      e.preventDefault();
      const msg = $('arMsg');
      const title = $('arTitle').value.trim();
      let body = $('arBody').value.trim();
      const audience = $('arAudience').value;
      const fileInput = $('arFile');
      if (!title) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Give the resource a title.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Uploading...';
      
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const path = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const { error: upErr } = await this.supabase.storage.from('documents').upload(path, file);
        if (upErr) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Upload failed: ' + upErr.message;
          return;
        }
        const { data: pubUrlData } = this.supabase.storage.from('documents').getPublicUrl(path);
        if (pubUrlData && pubUrlData.publicUrl) {
          const isPdf = file.name.toLowerCase().endsWith('.pdf');
          const linkHtml = `<br><a href="${pubUrlData.publicUrl}" target="_blank" class="mp-link">Pakua / Download Document</a>`;
          body += linkHtml;
          if (isPdf) {
             body += `<br><iframe src="${pubUrlData.publicUrl}" style="width:100%;height:400px;border:none;margin-top:10px;"></iframe>`;
          }
        }
      }

      const { error } = await this.supabase.from('resources').insert({
        title: title,
        body: body,
        audience: audience
      });
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      $('adminResourceForm').reset();
      msg.className = 'mp-msg ok';
      msg.textContent = 'Resource added.';
      const { data } = await this.supabase.from('resources').select('*').order('created_at', { ascending: true });
      this.resources = data || [];
      this.renderDashboard();
    }"""

# Use regex to find and replace the block
pattern = r"    async addResource\(e\) \{[\s\S]*?this\.renderDashboard\(\);\s*\}"
js = re.sub(pattern, new_addResource, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
