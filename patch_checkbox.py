with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

checkbox_code = """          row.appendChild(sel);

          const dirLbl = document.createElement('label');
          dirLbl.style.display = 'flex';
          dirLbl.style.alignItems = 'center';
          dirLbl.style.gap = '4px';
          dirLbl.style.fontSize = '12px';
          const dirChk = document.createElement('input');
          dirChk.type = 'checkbox';
          dirChk.checked = m.can_view_directory === true;
          dirChk.addEventListener('change', async () => {
            const { error } = await this.supabase.rpc('admin_set_directory_access', {
              p_email: m.email,
              p_access: dirChk.checked
            });
            if (error) {
              window.alert('Error setting access: ' + error.message);
              dirChk.checked = !dirChk.checked;
            } else {
              m.can_view_directory = dirChk.checked;
            }
          });
          dirLbl.appendChild(dirChk);
          dirLbl.appendChild(document.createTextNode('Dir. Access'));
          row.appendChild(dirLbl);"""

js = js.replace("          row.appendChild(sel);", checkbox_code)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
