import re

with open("members.js", "r", encoding="utf-8") as f:
    js = f.read()

pattern = r"        return card;\n      \}\n\n      renderList"
replacement = """        if (this.profile && this.profile.role === 'admin') {
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
        }
        return card;
      }

      renderList"""
js = re.sub(pattern, replacement, js)

with open("members.js", "w", encoding="utf-8") as f:
    f.write(js)
