(function () {
  'use strict';

  const LS_KEY = 'maranathaAdmin';
  const FILE_PATH = 'content.json';

  const $ = id => document.getElementById(id);

  const TABS = {
    news:    { title: 'News & updates',        hint: 'Announcements shown in the News section.' },
    events:  { title: 'Upcoming events',        hint: 'Events drive the calendar and the countdown timer.' },
    videos:  { title: 'Recent performances',    hint: 'Video cards under Events — link to your YouTube videos.' },
    team:    { title: 'Team / leadership',      hint: 'The people shown in "Meet the Team".' },
    members: { title: 'Choir members',          hint: 'One row per singer; the site groups them by voice part.' },
    gallery: { title: 'Gallery',                hint: 'Photos and videos from your choir life.' },
    works:   { title: 'Music & recordings',     hint: 'Songs listed in "Our Works" — link each to YouTube or a recording.' },
    admins:  { title: 'Portal admins',          hint: 'Names that get admin access in the member portal (must match sign-up names).' },
    memberInfo: { title: 'Member resources',    hint: 'Shown to every signed-in member in the member portal.' },
    leaderInfo: { title: 'Leader resources',    hint: 'Shown only to leaders (and admins) in the member portal.' },
    adminInfo:  { title: 'Admin resources',     hint: 'Shown only to admins in the member portal.' }
  };

  /* Row field definitions: [key, label, type, extra] */
  const FIELDS = {
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
    ],
    admins: [
      ['name', 'Full name (as used when signing up)', 'text']
    ],
    memberInfo: [
      ['title', 'Title', 'text'],
      ['body', 'Body', 'textarea'],
      ['date', 'Date (optional)', 'text']
    ],
    leaderInfo: [
      ['title', 'Title', 'text'],
      ['body', 'Body', 'textarea'],
      ['date', 'Date (optional)', 'text']
    ],
    adminInfo: [
      ['title', 'Title', 'text'],
      ['body', 'Body', 'textarea'],
      ['date', 'Date (optional)', 'text']
    ]
  };

  /* ---------- GitHub API ---------- */

  let repo = '';
  let token = '';
  let data = {};

  function gh(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    opts.headers.Accept = 'application/vnd.github+json';
    opts.headers.Authorization = 'Bearer ' + token;
    return fetch('https://api.github.com' + url, opts).then(r =>
      r.json().catch(() => ({})).then(body => ({ ok: r.ok, status: r.status, body }))
    );
  }

  const b64encode = s => btoa(unescape(encodeURIComponent(s)));
  const b64decode = s => decodeURIComponent(escape(atob(s)));

  /* ---------- Login / boot ---------- */

  function loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if (saved.repo) repo = saved.repo;
      if (saved.token) token = saved.token;
    } catch (e) { /* ignore */ }
  }

  function setStatus(sel, msg, cls) {
    const el = $(sel);
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'adm-status' + (cls ? ' ' + cls : '');
  }

  function signIn() {
    const repoEl = $('admRepoIn');
    const tokEl = $('admTok');
    repo = repoEl.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    token = tokEl.value.trim();
    const msg = $('admLoginMsg');

    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) {
      msg.className = 'adm-msg err';
      msg.textContent = 'Enter both the repository (owner/repo) and your token.';
      return;
    }

    msg.className = 'adm-msg';
    msg.textContent = 'Checking credentials\u2026';
    $('admSignIn').disabled = true;

    gh('/repos/' + repo).then(res => {
      $('admSignIn').disabled = false;
      if (!res.ok) {
        const hint = {
          401: 'The token is invalid or expired.',
          403: 'The token cannot access this repository \u2014 check the repository permissions.',
          404: 'Repository not found, or the token has no access to it.'
        }[res.status] || 'GitHub returned error ' + res.status + '.';
        const ghMsg = res.body && res.body.message ? ' (' + res.body.message + ')' : '';
        msg.className = 'adm-msg err';
        msg.textContent = 'Could not access ' + repo + '. ' + hint + ghMsg;
        return;
      }
      localStorage.setItem(LS_KEY, JSON.stringify({ repo: repo, token: token }));
      openWorkspace();
    }).catch(err => {
      $('admSignIn').disabled = false;
      msg.className = 'adm-msg err';
      msg.textContent = 'Could not reach GitHub from this page (' + err.message + '). If you opened admin.html from disk, open the live admin page instead: https://ypmulima-11.github.io/Maranatha/admin.html';
    });
  }

  function fetchContent() {
    setStatus('admStatus', 'Loading content\u2026', 'busy');
    return gh('/repos/' + repo + '/contents/' + FILE_PATH).then(res => {
      if (!res.ok) {
        setStatus('admStatus', 'Could not load content.json (error ' + res.status + ').', 'err');
        return false;
      }
      try {
        data = JSON.parse(b64decode(res.body.content));
        data.admins = (Array.isArray(data.siteAdmins) ? data.siteAdmins : []).map(n => ({ name: n }));
      } catch (e) {
        setStatus('admStatus', 'content.json is not valid JSON.', 'err');
        return false;
      }
      return true;
    }).catch(err => {
      setStatus('admStatus', 'Could not reach GitHub from this page (' + err.message + '). Try the live admin page instead.', 'err');
      return false;
    });
  }

  function openWorkspace() {
    fetchContent().then(ok => {
      if (!ok) return;
      $('admLogin').hidden = true;
      $('admMain').hidden = false;
      $('admOut').hidden = false;
      $('admRepo').textContent = repo;
      const parts = repo.split('/');
      $('admView').href = 'https://' + parts[0] + '.github.io/' + parts[1] + '/';
      renderAll();
    });
  }

  /* ---------- Tabs ---------- */

  function switchTab(name) {
    document.querySelectorAll('.adm-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.adm-pane-sec').forEach(s => s.classList.toggle('on', s.id === 'pane-' + name));
    $('admPaneTitle').textContent = TABS[name].title;
    $('admPaneHint').textContent = TABS[name].hint;
  }

  /* ---------- Row rendering ---------- */

  function fieldInput(field) {
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

  function buildRow(tab, item, ix) {
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
      data[tab].splice(ix, 1);
      renderTab(tab);
    });
    head.appendChild(title);
    head.appendChild(del);
    row.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'adm-grid';

    const inputs = {};
    FIELDS[tab].forEach(f => {
      const { wrap: w, input } = fieldInput(f);
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
        reader.onload = () => uploadImage(f, reader.result, inputs.src, msg, btn);
        reader.readAsDataURL(f);
      });
      up.appendChild(btn);
      up.appendChild(file);
      up.appendChild(msg);
      grid.appendChild(up);
    }

    return row;
  }

  function renderTab(tab) {
    const box = $('rows-' + tab);
    if (!box) return;
    box.replaceChildren(...(data[tab] || []).map((item, ix) => buildRow(tab, item, ix)));
  }

  function renderAll() {
    Object.keys(TABS).forEach(renderTab);
  }

  /* ---------- Collect edited values ---------- */

  function collectTab(tab) {
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

  function uploadImage(file, dataUrl, srcInput, msg, btn) {
    btn.disabled = true;
    msg.textContent = 'Uploading\u2026';
    const base64 = dataUrl.split(',')[1];
    const name = Date.now() + '-' + file.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-');
    const path = 'images/uploads/' + name;
    const put = sha => {
      const body = { message: 'Add image ' + name, content: base64 };
      if (sha) body.sha = sha;
      return gh('/repos/' + repo + '/contents/' + path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };
    put(null).then(res => {
      if (res.status === 422) {
        return gh('/repos/' + repo + '/contents/' + path).then(existing => {
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

  function saveAll() {
    const body = {};
    Object.keys(TABS).forEach(t => { body[t] = collectTab(t); });
    body.siteAdmins = (body.admins || []).map(a => (a.name || '').trim()).filter(Boolean);
    delete body.admins;
    const json = JSON.stringify(body, null, 2);
    const b64 = b64encode(json);

    setStatus('admStatus', 'Publishing\u2026', 'busy');
    $('admSave').disabled = true;
    $('admReload').disabled = true;

    gh('/repos/' + repo + '/contents/' + FILE_PATH)
      .then(res => {
        if (!res.ok) throw new Error('read ' + res.status);
        const putBody = {
          message: 'Update site content',
          content: b64,
          sha: res.body.sha
        };
        return gh('/repos/' + repo + '/contents/' + FILE_PATH, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(putBody)
        });
      })
      .then(res => {
        $('admSave').disabled = false;
        $('admReload').disabled = false;
        if (res.ok) {
          data = body;
          data.admins = body.siteAdmins.map(n => ({ name: n }));
          setStatus('admStatus', 'Saved \u2713 \u2014 the site republishes in about a minute.', 'ok');
        } else {
          setStatus('admStatus', 'Save failed (error ' + res.status + '). Check your token permissions.', 'err');
        }
      })
      .catch(err => {
        $('admSave').disabled = false;
        $('admReload').disabled = false;
        setStatus('admStatus', 'Save failed: ' + err.message, 'err');
      });
  }

  /* ---------- Wire up ---------- */

  document.querySelectorAll('.adm-tab').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab))
  );

  document.querySelectorAll('[data-add]').forEach(b =>
    b.addEventListener('click', () => {
      const tab = b.dataset.add;
      if (!Array.isArray(data[tab])) data[tab] = [];
      data[tab].push({});
      renderTab(tab);
    })
  );

  $('admSignIn').addEventListener('click', signIn);
  $('admTok').addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });

  $('admReload').addEventListener('click', () => {
    fetchContent().then(ok => { if (ok) renderAll(); });
  });

  $('admSave').addEventListener('click', saveAll);

  $('admOut').addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    token = '';
    repo = '';
    data = {};
    $('admMain').hidden = true;
    $('admOut').hidden = true;
    $('admRepo').textContent = '';
    $('admLogin').hidden = false;
    $('admTok').value = '';
    $('admRepoIn').value = '';
  });

  loadSaved();
  if (repo && token) {
    $('admRepoIn').value = repo;
    $('admTok').value = token;
    $('admLoginMsg').textContent = 'Restored saved session \u2014 signing in\u2026';
    openWorkspace();
  }
})();
