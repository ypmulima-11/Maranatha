(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ---------- API client: everything goes through the Edge Function ---------- */

  class ApiClient {
    constructor() {
      this.fnUrl = '';
      this.supabase = null;
    }

    async call(action, data) {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session) throw new Error('not signed in');
      const res = await fetch(this.fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify(Object.assign({ action: action }, data || {}))
      });
      let body = null;
      try { body = await res.json(); } catch (e) { body = null; }
      if (!res.ok) {
        let err = body && body.error ? body.error : ('HTTP ' + res.status);
        if (res.status === 404) err = 'The admin helper service is not deployed yet. Deploy the "admin-github" Edge Function on Supabase.';
        throw new Error(err);
      }
      return body;
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
        ['role', 'Role', 'text'],
        ['avatar', 'Avatar URL', 'text']
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
      this.data = {};
      this.api = new ApiClient();
      this.supabase = null;
    }

    setStatus(sel, msg, cls) {
      const el = $(sel);
      if (!el) return;
      el.textContent = msg || '';
      el.className = 'adm-status' + (cls ? ' ' + cls : '');
    }

    async signIn() {
      const email = $('admEmail').value.trim().toLowerCase();
      const password = $('admPass').value;
      const msg = $('admLoginMsg');

      if (!email || !password) {
        msg.className = 'adm-msg err';
        msg.textContent = 'Enter your email and password.';
        return;
      }
      if (!window.supabase || !SUPABASE_READY) {
        msg.className = 'adm-msg err';
        msg.textContent = 'Supabase is not configured. Check supabase-config.js.';
        return;
      }

      msg.className = 'adm-msg';
      $('admSignIn').disabled = true;

      try {
        const { error } = await this.supabase.auth.signInWithPassword({ email: email, password: password });
        if (error) {
          msg.className = 'adm-msg err';
          msg.textContent = error.message === 'Invalid login credentials'
            ? 'Incorrect email or password.'
            : error.message;
          $('admSignIn').disabled = false;
          return;
        }
      } catch (err) {
        msg.className = 'adm-msg err';
        msg.textContent = 'Could not reach Supabase (' + err.message + ').';
        $('admSignIn').disabled = false;
        return;
      }

      this.openWorkspace();
    }

    async fetchContent() {
      this.setStatus('admStatus', 'Loading content\u2026', 'busy');
      try {
        const res = await this.api.call('read');
        this.data = JSON.parse(ApiClient.b64decode(res.content));
        return { ok: true };
      } catch (err) {
        const msg = 'Could not load content: ' + err.message;
        this.setStatus('admStatus', msg, 'err');
        return { ok: false, message: msg };
      }
    }

    async openWorkspace() {
      const msg = $('admLoginMsg');
      const res = await this.fetchContent();
      if (!res.ok) {
        msg.className = 'adm-msg err';
        msg.textContent = 'Could not open the editor. ' + (res.message || '');
        try { await this.supabase.auth.signOut(); } catch (e) { /* ignore */ }
        $('admSignIn').disabled = false;
        return;
      }
      $('admLogin').hidden = true;
      $('admMain').hidden = false;
      $('admOut').hidden = false;
      $('admLogin').style.display = 'none';
      $('admRepo').textContent = 'Maranatha CMS';
      $('admView').href = 'https://ypmulima-11.github.io/Maranatha/';
      this.renderAll();
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

      if (tab === 'team') {
        const up = document.createElement('div');
        up.className = 'adm-upload full';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'adm-btn ghost adm-upbtn';
        btn.textContent = 'Upload avatar\u2026';
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
          if (f.size > 2 * 1024 * 1024) {
            msg.textContent = 'Avatar is too large (max 2 MB).';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => this.uploadImage(f, reader.result, inputs.avatar, msg, btn);
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
      this.api.call('upload', { path: path, content: base64 })
        .then(() => {
          btn.disabled = false;
          srcInput.value = path;
          msg.textContent = 'Uploaded \u2713 (will appear after you Save)';
        })
        .catch(err => {
          btn.disabled = false;
          msg.textContent = 'Upload failed: ' + err.message;
        });
    }

    /* ---------- Save ---------- */

    saveAll() {
      const body = {};
      Object.keys(AdminApp.TABS).forEach(t => { body[t] = this.collectTab(t); });
      const json = JSON.stringify(body, null, 2);
      const b64 = ApiClient.b64encode(json);

      this.setStatus('admStatus', 'Publishing\u2026', 'busy');
      $('admSave').disabled = true;
      $('admReload').disabled = true;

      this.api.call('save', { content: b64 })
        .then(() => {
          this.data = body;
          this.setStatus('admStatus', 'Saved \u2713 \u2014 the site republishes in about a minute.', 'ok');
        })
        .catch(err => {
          this.setStatus('admStatus', 'Save failed: ' + err.message, 'err');
        })
        .finally(() => {
          $('admSave').disabled = false;
          $('admReload').disabled = false;
        });
    }

    /* ---------- Sign out ---------- */

    signOut() {
      this.data = {};
      if (this.supabase) this.supabase.auth.signOut();
      $('admMain').hidden = true;
      $('admOut').hidden = true;
      $('admRepo').textContent = '';
      $('admLogin').hidden = false;
      $('admLogin').style.display = '';
      $('admPass').value = '';
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
      $('admPass').addEventListener('keydown', e => { if (e.key === 'Enter') this.signIn(); });

      $('admReload').addEventListener('click', () => {
        this.fetchContent().then(res => { if (res.ok) this.renderAll(); });
      });

      $('admSave').addEventListener('click', () => this.saveAll());

      $('admOut').addEventListener('click', () => this.signOut());

      if (!window.supabase || !SUPABASE_READY) {
        $('admLoginMsg').className = 'adm-msg err';
        $('admLoginMsg').textContent = 'Supabase is not configured. Check supabase-config.js.';
        return;
      }

      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      this.api.fnUrl = SUPABASE_CONFIG.url.replace(/\/+$/, '') + '/functions/v1/admin-github';
      this.api.supabase = this.supabase;

      this.supabase.auth.getSession().then(({ data }) => {
        if (data.session) this.openWorkspace();
      });
    }
  }

  const admin = new AdminApp();
  admin.init();
})();
