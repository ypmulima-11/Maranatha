(function () {
  'use strict';

  const ACC_KEY = 'maranathaAccounts';
  const SES_KEY = 'maranathaSession';
  const $ = id => document.getElementById(id);

  const PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

  /* Fallback roster (used if content.json cannot be fetched, e.g. local file preview).
     These should match content.json — role detection on the live site uses content.json. */
  let siteAdmins = ['Choir Director'];
  let team = [];
  let members = [];

  /* ---------- Storage helpers ---------- */

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(ACC_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveUsers(u) {
    localStorage.setItem(ACC_KEY, JSON.stringify(u));
  }
  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SES_KEY) || 'null'); } catch (e) { return null; }
  }
  function saveSession(s) {
    sessionStorage.setItem(SES_KEY, JSON.stringify(s));
  }

  /* ---------- Password hashing (SHA-256 where available) ---------- */

  async function hashPassword(pw, salt) {
    const s = salt + ':' + pw;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { /* fall through */ }
    }
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'x' + h.toString(36);
  }

  function makeSalt() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /* ---------- Role detection (content-driven) ---------- */

  function detectRole(name) {
    const n = (name || '').trim().toLowerCase();
    if (!n) return { role: 'member', title: 'Member' };
    if (siteAdmins.some(a => a.trim().toLowerCase() === n)) return { role: 'admin', title: 'Site Admin' };
    const t = team.find(x => (x.name || '').trim().toLowerCase() === n);
    if (t) return { role: 'leader', title: t.role || t.name };
    const m = members.find(x => (x.name || '').trim().toLowerCase() === n);
    if (m && /lead/i.test(m.role || '')) return { role: 'leader', title: m.role };
    return { role: 'member', title: m ? m.role : 'Member' };
  }

  const ROLE_LABEL = { member: 'Member', leader: 'Leader', admin: 'Admin' };

  /* ---------- Rendering ---------- */

  function makeItem(it) {
    const card = document.createElement('div');
    card.className = 'mp-item';
    const h = document.createElement('h3');
    h.textContent = it.title || 'Untitled';
    card.appendChild(h);
    const p = document.createElement('p');
    p.textContent = it.body || '';
    card.appendChild(p);
    if (it.date) {
      const d = document.createElement('div');
      d.className = 'mp-date';
      d.textContent = it.date;
      card.appendChild(d);
    }
    return card;
  }

  function renderList(box, list, emptyMsg) {
    if (!list || !list.length) {
      box.appendChild((function () {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = emptyMsg;
        return e;
      })());
      return;
    }
    list.forEach(it => box.appendChild(makeItem(it)));
  }

  function renderDashboard() {
    const u = loadSession();
    if (!u) return;
    const users = loadUsers();
    const user = users.find(x => x.email === u.email);
    if (!user) { signOut(); return; }

    $('mpGreet').textContent = 'Habari, ' + user.name;
    $('mpSub').textContent =
      (user.title ? user.title + ' \u00b7 ' : '') + 'Signed in as ' + ROLE_LABEL[user.role];

    $('mpProfile').innerHTML = '';
    const rows = [
      ['Name', user.name],
      ['Email', user.email],
      ['Access level', ROLE_LABEL[user.role]],
      ['Title', user.title || '\u2014'],
      ['Voice part', user.part || '\u2014'],
      ['Joined', user.joined]
    ];
    rows.forEach(r => {
      const k = document.createElement('div');
      k.className = 'mp-k';
      k.textContent = r[0];
      const v = document.createElement('div');
      v.className = 'mp-v';
      v.textContent = r[1];
      $('mpProfile').appendChild(k);
      $('mpProfile').appendChild(v);
    });

    const isLeader = user.role === 'leader' || user.role === 'admin';
    const isAdmin = user.role === 'admin';

    $('mpLeaderCard').hidden = !isLeader;
    $('mpAdminCard').hidden = !isAdmin;
    $('mpNavAdmin').hidden = !isAdmin;

    $('mpMemberInfo').innerHTML = '';
    renderList($('mpMemberInfo'), info.memberInfo, 'Nothing here yet \u2014 the leaders will add member resources soon.');

    if (isLeader) {
      $('mpLeaderInfo').innerHTML = '';
      renderList($('mpLeaderInfo'), info.leaderInfo, 'Nothing here yet \u2014 leadership materials will be added soon.');
    }
    if (isAdmin) {
      $('mpAdminInfo').innerHTML = '';
      renderList($('mpAdminInfo'), info.adminInfo, 'Nothing here yet \u2014 admin tools will be added soon.');
    }
  }

  /* ---------- Auth actions ---------- */

  function signOut() {
    sessionStorage.removeItem(SES_KEY);
    showAuth();
  }

  function showAuth() {
    $('dashView').hidden = true;
    $('authView').hidden = false;
  }

  function showDash() {
    $('authView').hidden = true;
    $('dashView').hidden = false;
    renderDashboard();
  }

  async function signIn(e) {
    e.preventDefault();
    const msg = $('siMsg');
    const email = $('siEmail').value.trim().toLowerCase();
    const pass = $('siPass').value;
    if (!email || !pass) {
      msg.className = 'mp-msg err';
      msg.textContent = 'Enter your email and password.';
      return;
    }
    const users = loadUsers();
    const user = users.find(x => x.email === email);
    if (!user) {
      msg.className = 'mp-msg err';
      msg.textContent = 'No account with that email. Create one first \u2014 or check the spelling.';
      return;
    }
    const hash = await hashPassword(pass, user.salt);
    if (hash !== user.hash) {
      msg.className = 'mp-msg err';
      msg.textContent = 'Incorrect password.';
      return;
    }
    msg.className = 'mp-msg';
    msg.textContent = '';
    saveSession({ email: user.email });
    showDash();
  }

  async function signUp(e) {
    e.preventDefault();
    const msg = $('suMsg');
    const name = $('suName').value.trim();
    const email = $('suEmail').value.trim().toLowerCase();
    const pass = $('suPass').value;
    const part = $('suPart').value;

    if (!name || !email || !pass) {
      msg.className = 'mp-msg err';
      msg.textContent = 'Fill in your name, email and a password.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.className = 'mp-msg err';
      msg.textContent = 'Enter a valid email address.';
      return;
    }
    if (pass.length < 6) {
      msg.className = 'mp-msg err';
      msg.textContent = 'Password must be at least 6 characters.';
      return;
    }
    const users = loadUsers();
    if (users.some(x => x.email === email)) {
      msg.className = 'mp-msg err';
      msg.textContent = 'An account with that email already exists \u2014 sign in instead.';
      return;
    }

    const role = detectRole(name);
    const salt = makeSalt();
    const user = {
      email: email,
      name: name,
      salt: salt,
      hash: await hashPassword(pass, salt),
      role: role.role,
      title: role.title,
      part: part,
      joined: new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
    };
    users.push(user);
    saveUsers(users);
    msg.className = 'mp-msg ok';
    msg.textContent = 'Account created \u2014 you have ' + ROLE_LABEL[role.role].toLowerCase() + ' access.';
    saveSession({ email: user.email });
    showDash();
  }

  function forgot(e) {
    e.preventDefault();
    const email = $('siEmail').value.trim().toLowerCase();
    const msg = $('siMsg');
    if (!email) {
      msg.className = 'mp-msg err';
      msg.textContent = 'Type your email first, then use the reset link.';
      return;
    }
    const users = loadUsers();
    const i = users.findIndex(x => x.email === email);
    if (i === -1) {
      msg.className = 'mp-msg err';
      msg.textContent = 'No account with that email.';
      return;
    }
    users.splice(i, 1);
    saveUsers(users);
    msg.className = 'mp-msg ok';
    msg.textContent = 'Account reset. Switch to "Create account" to set a new one with this email.';
  }

  /* ---------- Role preview on signup ---------- */

  $('suName').addEventListener('input', () => {
    const r = detectRole($('suName').value);
    const box = $('suRole');
    box.style.display = 'none';
    if (r.role !== 'member') {
      box.style.display = 'block';
      box.textContent = 'This name matches the roster \u2014 you will get ' + ROLE_LABEL[r.role].toLowerCase() + ' access (' + r.title + ').';
    }
  });

  /* ---------- Tabs ---------- */

  document.querySelectorAll('.mp-tab').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('.mp-form').forEach(f => f.classList.toggle('on', f.id === (b.dataset.view === 'signin' ? 'signinForm' : 'signupForm')));
    })
  );

  /* ---------- Wire up ---------- */

  $('signinForm').addEventListener('submit', signIn);
  $('signupForm').addEventListener('submit', signUp);
  $('siForgot').addEventListener('click', forgot);
  $('mpOut').addEventListener('click', signOut);

  /* ---------- Content + boot ---------- */

  let info = { memberInfo: [], leaderInfo: [], adminInfo: [] };

  fetch('content.json?t=' + Date.now())
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => {
      if (json) {
        if (Array.isArray(json.siteAdmins) && json.siteAdmins.length) siteAdmins = json.siteAdmins;
        team = json.team || [];
        members = json.members || [];
        info = {
          memberInfo: json.memberInfo || [],
          leaderInfo: json.leaderInfo || [],
          adminInfo: json.adminInfo || []
        };
      }
      $('suRole').style.display = 'none';
      if (loadSession()) showDash();
    });
})();
