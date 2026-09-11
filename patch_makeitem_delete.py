with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
pattern = r"        if \(it\.date\) \{\n          const d = document\.createElement\('div'\);\n          d\.className = 'mp-date';\n          d\.textContent = it\.date;\n          card\.appendChild\(d\);\n        \}"
replacement = """        if (it.date) {
          const d = document.createElement('div');
          d.className = 'mp-date';
          d.textContent = it.date;
          card.appendChild(d);
        }
        
        if (this.profile && this.profile.role === 'admin') {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'mp-btn small';
          del.style.marginTop = '12px';
          del.style.backgroundColor = 'var(--err)';
          del.style.color = '#fff';
          del.textContent = 'Delete';
          del.addEventListener('click', async () => {
            if (!window.confirm(`Delete resource: ${it.title}?`)) return;
            await this.supabase.from('resources').delete().eq('id', it.id);
            const { data } = await this.supabase.from('resources').select('*').order('created_at', { ascending: true });
            this.resources = data || [];
            this.renderDashboard();
          });
          card.appendChild(del);
        }"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
