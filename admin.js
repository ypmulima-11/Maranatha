(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ---------- GitHub REST client ---------- */

  class GitHubClient {
    constructor(token) {
      this.token = token || '';
    }

    setToken(token) {
      this.token = token;
    }

    api(url, opts) {
      opts = opts || {};
      opts.headers = opts.headers || {};
      opts.headers.Accept = 'application/vnd.github+json';
      opts.headers.Authorization = 'Bearer ' + this.token;
      return fetch('https://api.github.com' + url, opts).then(r =>
        r.json().catch(() => ({})).then(body => ({ ok: r.ok, status: r.status, body }))
      );
    }

    static b64encode(s) {
      return btoa(unescape(encodeURIComponent(s)));
    }

    static b64decode(s) {
      return decodeURIComponent(escape(atob(s)));
    }
  }

  /* ---------- Admin application ---------- */

  class AdminApp {
    static LS_KEY = 'maranathaAdmin';
    static FILE_PATH = 'content.json';

    static TABS = {
      news:    { title: 'News & updates',        hint: 'Announcements shown in the News section.' },
      events:  { title: 'Upcoming events',        hint: 'Events drive the calendar and the countdown timer.' },
      videos:  { title: 'Recent performances',    hint: 'Video cards under Events — link to your YouTube videos.' },
      team:    { title: 'Team / leadership',      hint: 'The people shown in "Meet the Team".' },
      members: { title: 'Choir members',          hint: 'One row per singer; the site groups them by voice part.' },
      gallery: { title: 'Gallery',                hint: 'Photos and videos from your choir life.' },
      works:   { title: 'Music & recordings',     hint: 'Songs listed in "Our Works" — link each to YouTube or a recording.' }
    };

    /* Row field definitions: [key, label, type, extra] */
    static FIELDS = {
      news: [
        ['date', 'Date', 'date'],
        ['title', 'Headline', 'text'],
        ['body', 'Body', 'textarea'],
        ['linkText', 'Link text', 'text'],
        ['linkHref', 'Link destination', 'text']
      ],
      events: [
        ['title', 'Event name', 'text'],
        ['date', 'Date', 'date'],
        ['time', 'Time (e.g. 9:00 AM)', 'text'],
        ['place', 'Venue', 'text'],
        ['tag', 'Tag (e.g. Liturgy, Concert)', 'text']
      ],
      videos: [
        ['title', 'Video title', 'text'],
        ['sub', 'Subtitle', 'text'],
        ['href', 'YouTube / video link', 'text']
      ],
      team: [
        ['initials', 'Initials (max 2 letters)', 'text'],
        ['name', 'Name / title', 'text'],
        ['role', 'Role', 'text']
      ],
      members: [
        ['part', 'Voice part', 'select', ['Soprano', 'Alto', 'Tenor', 'Bass']],
        ['initials', 'Initials (max 2 letters)', 'text'],
        ['name', 'Name', 'text'],
        ['role', 'Role (e.g. Soprano Lead)', 'text']
      ],
      gallery: [
        ['src', 'Image path or URL', 'text'],
        ['cap', 'Caption / alt text', 'text'],
        ['video', 'Video link (optional — turns this item into a video)', 'text']
      ],
      works: [
        ['title', 'Song title', 'text'],
        ['sub', 'Subtitle (e.g. Hymn · Live)', 'text'],
        ['year', 'Year', 'text'],
        ['href', 'Link to the recording', 'text']
      ]
    };

    constructor() {
      this.repo = '';
      this.token = '';
      this.data = {};
      this.github = new GitHubClient();
    }

    loadSaved() {
      try {
        const saved = JSON.parse(localStorage.getItem(AdminApp.LS_KEY) || '{}');
        if (saved.repo) this.repo = saved.repo;
        if (saved.token) this.token = saved.token;
      } catch (e) { /* ignore */ }
    }

    setStatus(sel, msg, cls) {
      const el = $(sel);
      if (!el) return;
      el.textContent = msg || '';
      el.className = 'adm-status' + (cls ? ' ' + cls : '');
    }

    signIn() {
      const repoEl = $('admRepoIn');
      const tokEl = $('admTok');
      this.repo = repoEl.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
      this.token = tokEl.value.trim();
      this.github.setToken(this.token);
      const msg = $('admLoginMsg');

      if (!/^[\w.-]+\/[\w.-]+$/.test(this.repo) || !this.token) {
        msg.className = 'adm-msg err';
        msg.textContent = 'Enter both the repository (owner/repo) and your token.';
        return;
      }

      msg.className = 'adm-msg';
      $('admSignIn').disabled = true;

      this.github.api('/repos/' + this.repo).then(res => {
        $('admSignIn').disabled = false;
        if (!res.ok) {
          const hint = {
            401: 'The token is invalid or expired.',
            403: 'The token cannot access this repository \u2014 check the repository permissions.',
            404: 'Repository not found, or the token has no access to it.'
          }[res.status] || 'GitHub returned error ' + res.status + '.';
          const ghMsg = res.body && res.body.message ? ' (' + res.body.message + ')' : '';
          msg.className = 'adm-msg err';
          msg.textContent = 'Could not access ' + this.repo + '. ' + hint + ghMsg;
          return;
        }
        localStorage.setItem(AdminApp.LS_KEY, JSON.stringify({ repo: this.repo, token: this.token }));
        this.openWorkspace();
      }).catch(err => {
        $('admSignIn').disabled = false;
        msg.className = 'adm-msg err';
        msg.textContent = 'Could not reach GitHub from this page (' + err.message + '). If you opened admin.html from disk, open the live admin page instead: https://ypmulima-11.github.io/Maranatha/admin.html';
      });
    }

    fetchContent() {
      this.setStatus('admStatus', 'Loading content\u2026', 'busy');
      return this.github.api('/repos/' + this.repo + '/contents/' + AdminApp.FILE_PATH).then(res => {
        if (!res.ok) {
          this.setStatus('admStatus', 'Could not load content.json (error ' + res.status + ').', 'err');
          return false;
        }
        try {
          this.data = JSON.parse(GitHubClient.b64decode(res.body.content));
        } catch (e) {
          this.setStatus('admStatus', 'content.json is not valid JSON.', 'err');
          return false;
        }
        return true;
      }).catch(err => {
        this.setStatus('admStatus', 'Could not reach GitHub from this page (' + err.message + '). Try the live admin page instead.', 'err');
        return false;
      });
    }

    openWorkspace() {
      this.fetchContent().then(ok => {
        if (!ok) return;
        $('admLogin').hidden = true;
        $('admMain').hidden = false;
        $('admOut').hidden = false;
        $('admLogin').style.display = 'none';
        $('admRepo').textContent = this.repo;
        const parts = this.repo.split('/');
        $('admView').href = 'https://' + parts[0] + '.github.io/' + parts[1] + '/';
        this.renderAll();
      });
    }

    /* ---------- Tabs ---------- */

    switchTab(name) {
      document.querySelectorAll('.adm-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
      document.querySelectorAll('.adm-pane-sec').forEach(s => s.classList.toggle('on', s.id === 'pane-' + name));
      $('admPaneTitle').textContent = AdminApp.TABS[name].title;
      $('admPaneHint').textContent = AdminApp.TABS[name].hint;
    }

    /* ---------- Row rendering ---------- */

    fieldInput(field) {
      const key = field[0], label = field[1], type = field[2];
      const wrap = document.createElement('div');
      wrap.className = 'adm-f' + (type === 'textarea' ? ' full' : '');
      const l = document.createElement('label');
      l.textContent = label;
      wrap.appendChild(l);

      let input;
      if (type === 'select') {
        input = document.createElement('select');
        field[3].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          input.appendChild(o);
        });
      } else if (type === 'textarea') {
        input = document.createElement('textarea');
      } else {
        input = document.createElement('input');
        input.type = type;
      }
      input.dataset.field = key;
      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }

    buildRow(tab, item, ix) {
      const row = document.createElement('div');
      row.className = 'adm-row';

      const head = document.createElement('div');
      head.className = 'adm-row-head';
      const title = document.createElement('span');
      title.className = 'adm-row-title';
      title.textContent = tab + ' \u00b7 item ' + (ix + 1);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'adm-del';
      del.textContent = 'Remove';
      del.addEventListener('click', () => {
        this.data[tab].splice(ix, 1);
        this.renderTab(tab);
      });
      head.appendChild(title);
      head.appendChild(del);
      row.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'adm-grid';

      const inputs = {};
      AdminApp.FIELDS[tab].forEach(f => {
        const { wrap: w, input } = this.fieldInput(f);
        input.value = item[f[0]] || '';
        inputs[f[0]] = input;
        grid.appendChild(w);
      });
      row.appendChild(grid);

      if (tab === 'gallery') {
        const up = document.createElement('div');
        up.className = 'adm-upload full';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'adm-btn ghost adm-upbtn';
        btn.textContent = 'Upload image\u2026';
        const msg = document.createElement('span');
        msg.className = 'adm-upmsg';
        const file = document.createElement('input');
        file.type = 'file';
        file.accept = 'image/*';
        file.hidden = true;
        btn.addEventListener('click', () => file.click());
        file.addEventListener('change', () => {
          const f = file.files[0];
          if (!f) return;
          if (f.size > 4 * 1024 * 1024) {
            msg.textContent = 'Image is too large (max 4 MB).';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => this.uploadImage(f, reader.result, inputs.src, msg, btn);
          reader.readAsDataURL(f);
        });
        up.appendChild(btn);
        up.appendChild(file);
        up.appendChild(msg);
        grid.appendChild(up);
      }

      return row;
    }

    renderTab(tab) {
      const box = $('rows-' + tab);
      if (!box) return;
      box.replaceChildren(...(this.data[tab] || []).map((item, ix) => this.buildRow(tab, item, ix)));
    }

    renderAll() {
      Object.keys(AdminApp.TABS).forEach(tab => this.renderTab(tab));
    }

    /* ---------- Collect edited values ---------- */

    collectTab(tab) {
      const rows = document.querySelectorAll('#rows-' + tab + ' .adm-row');
      const out = [];
      rows.forEach(row => {
        const item = {};
        row.querySelectorAll('[data-field]').forEach(inp => {
          if (inp.dataset.field) item[inp.dataset.field] = inp.value.trim();
        });
        out.push(item);
      });
      return out;
    }

    /* ---------- Image upload ---------- */

    uploadImage(file, dataUrl, srcInput, msg, btn) {
      btn.disabled = true;
      msg.textContent = 'Uploading\u2026';
      const base64 = dataUrl.split(',')[1];
      const name = Date.now() + '-' + file.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-');
      const path = 'images/uploads/' + name;
      const put = sha => {
        const body = { message: 'Add image ' + name, content: base64 };
        if (sha) body.sha = sha;
        return this.github.api('/repos/' + this.repo + '/contents/' + path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      };
      put(null).then(res => {
        if (res.status === 422) {
          return this.github.api('/repos/' + this.repo + '/contents/' + path).then(existing => {
            if (existing.ok) return put(existing.body.sha);
            return res;
          });
        }
        return res;
      }).then(res => {
        btn.disabled = false;
        if (res.ok) {
          srcInput.value = path;
          msg.textContent = 'Uploaded \u2713 (will appear after you Save)';
        } else {
          msg.textContent = 'Upload failed (error ' + res.status + ').';
        }
      });
    }

    /* ---------- Save ---------- */

    saveAll() {
      const body = {};
      Object.keys(AdminApp.TABS).forEach(t => { body[t] = this.collectTab(t); });
      const json = JSON.stringify(body, null, 2);
      const b64 = GitHubClient.b64encode(json);

      this.setStatus('admStatus', 'Publishing\u2026', 'busy');
      $('admSave').disabled = true;
      $('admReload').disabled = true;

      this.github.api('/repos/' + this.repo + '/contents/' + AdminApp.FILE_PATH)
        .then(res => {
          if (!res.ok) throw new Error('read ' + res.status);
          const putBody = {
            message: 'Update site content',
            content: b64,
            sha: res.body.sha
          };
          return this.github.api('/repos/' + this.repo + '/contents/' + AdminApp.FILE_PATH, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(putBody)
          });
        })
        .then(res => {
          $('admSave').disabled = false;
          $('admReload').disabled = false;
          if (res.ok) {
            this.data = body;
            this.setStatus('admStatus', 'Saved \u2713 \u2014 the site republishes in about a minute.', 'ok');
          } else {
            this.setStatus('admStatus', 'Save failed (error ' + res.status + '). Check your token permissions.', 'err');
          }
        })
        .catch(err => {
          $('admSave').disabled = false;
          $('admReload').disabled = false;
          this.setStatus('admStatus', 'Save failed: ' + err.message, 'err');
        });
    }

    /* ---------- Sign out ---------- */

    signOut() {
      localStorage.removeItem(AdminApp.LS_KEY);
      this.token = '';
      this.repo = '';
      this.data = {};
      this.github.setToken('');
      $('admMain').hidden = true;
      $('admOut').hidden = true;
      $('admRepo').textContent = '';
      $('admLogin').hidden = false;
      $('admLogin').style.display = '';
      $('admTok').value = '';
      $('admRepoIn').value = '';
    }

    /* ---------- Wire up + boot ---------- */

    init() {
      document.querySelectorAll('.adm-tab').forEach(b =>
        b.addEventListener('click', () => this.switchTab(b.dataset.tab))
      );

      document.querySelectorAll('[data-add]').forEach(b =>
        b.addEventListener('click', () => {
          const tab = b.dataset.add;
          if (!Array.isArray(this.data[tab])) this.data[tab] = [];
          this.data[tab].push({});
          this.renderTab(tab);
        })
      );

      $('admSignIn').addEventListener('click', () => this.signIn());
      $('admTok').addEventListener('keydown', e => { if (e.key === 'Enter') this.signIn(); });

      $('admReload').addEventListener('click', () => {
        this.fetchContent().then(ok => { if (ok) this.renderAll(); });
      });

      $('admSave').addEventListener('click', () => this.saveAll());

      $('admOut').addEventListener('click', () => this.signOut());

      this.loadSaved();
      if (this.repo && this.token) {
        $('admRepoIn').value = this.repo;
        $('admTok').value = this.token;
        $('admLoginMsg').textContent = 'Restored saved session \u2014 signing in\u2026';
        this.openWorkspace();
      }
    }
  }

  const admin = new AdminApp();
  admin.init();
})();
