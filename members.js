(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ---------- Member portal (Supabase auth + dashboard) ---------- */

  class MemberPortal {
    static NET_ERR_MSG = 'Could not reach the Supabase server (request timed out). Check your internet connection, disable ad-blockers for this page, or try again in a private window.';

    static roleLabel(role) {
      return I18n.t('portal.role.' + role);
    }

    constructor() {
      this.supabase = null;
      this.profile = null;
      this.resources = [];
    }

    /* ---------- View switching ---------- */

    showSetupBanner() {
      const banner = $('setupBanner');
      if (banner) banner.hidden = false;
      ['signinForm', 'signupForm'].forEach(id => { if ($(id)) $(id).hidden = true; });
    }

    showAuth() {
      $('dashView').hidden = true;
      $('resetView').hidden = true;
      $('authView').hidden = false;
    }

    showDash() {
      $('resetView').hidden = true;
      $('authView').hidden = true;
      $('dashView').hidden = false;
    }

    showReset() {
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('resetView').hidden = false;
    }

    /* ---------- Timeout guard: never hang silently on a dead request ---------- */

    withTimeout(p, ms) {
      return Promise.race([
        p,
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      ]);
    }

    /* Returns { failed: true } after showing a message, or the raw result. */
    async authCall(fn, msg, ms) {
      try {
        return await this.withTimeout(fn(), ms || 20000);
      } catch (err) {
        if (err && err.message === 'timeout') {
          msg.className = 'mp-msg err';
          msg.textContent = MemberPortal.NET_ERR_MSG;
        } else {
          msg.className = 'mp-msg err';
          msg.textContent = 'Something went wrong: ' + (err && err.message ? err.message : err);
        }
        return { failed: true };
      }
    }

    /* ---------- Auth actions ---------- */

    async onSignIn(e) {
      e.preventDefault();
      const msg = $('siMsg');
      const email = $('siEmail').value.trim().toLowerCase();
      const password = $('siPass').value;
      if (!email || !password) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Enter your email and password.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Signing in\u2026';
      const res = await this.authCall(
        () => this.supabase.auth.signInWithPassword({ email: email, password: password }),
        msg
      );
      if (res.failed) return;
      const error = res.error;
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message;
      }
    }

    async onSignUp(e) {
      e.preventDefault();
      const msg = $('suMsg');
      const name = $('suName').value.trim();
      const email = $('suEmail').value.trim().toLowerCase();
      const password = $('suPass').value;
      const part = $('suPart').value;

      if (!name || !email || !password) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Fill in your name, email and a password.';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Enter a valid email address.';
        return;
      }
      if (password.length < 6) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Password must be at least 6 characters.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Creating account\u2026';

      const res = await this.authCall(
        () => this.supabase.auth.signUp({
          email: email,
          password: password,
          options: { emailRedirectTo: window.location.href, data: { full_name: name, voice_part: part } }
        }),
        msg
      );
      if (res.failed) return;
      const { data, error } = res;

      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      if (data.session) {
        msg.className = 'mp-msg ok';
        msg.textContent = 'Account created \u2014 welcome!';
        return;
      }
      msg.className = 'mp-msg ok';
      msg.textContent = 'Account created! Check your inbox for a confirmation link, then sign in.';
      this.switchTab('signin');
      $('siEmail').value = email;
    }

    async onForgotPassword(e) {
      e.preventDefault();
      const msg = $('siMsg');
      const email = $('siEmail').value.trim().toLowerCase();
      if (!email) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Type your email first, then use the reset link.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Sending reset email\u2026';
      const res = await this.authCall(
        () => this.supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href }),
        msg
      );
      if (res.failed) return;
      const error = res.error;
      msg.className = 'mp-msg ' + (error ? 'err' : 'ok');
      msg.textContent = error
        ? error.message
        : 'Reset email sent \u2014 click the link in it to set a new password.';
    }

    async onResetPassword(e) {
      e.preventDefault();
      const msg = $('rsMsg');
      const pass = $('rsPass').value;
      if (pass.length < 6) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Password must be at least 6 characters.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Updating password\u2026';
      const res = await this.authCall(
        () => this.supabase.auth.updateUser({ password: pass }),
        msg
      );
      if (res.failed) return;
      const error = res.error;
      msg.className = 'mp-msg ' + (error ? 'err' : 'ok');
      msg.textContent = error
        ? error.message
        : 'Password updated \u2014 you can now sign in.';
      $('rsPass').value = '';
    }

    async signOut() {
      await this.supabase.auth.signOut();
      this.showAuth();
    }

    /* ---------- Dashboard data ---------- */

    async loadDashboard() {
      const { data: userData } = await this.supabase.auth.getUser();
      const user = userData && userData.user;
      if (!user) { this.showAuth(); return; }

      let { data: prof } = await this.supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle();

      if (!prof) {
        const meta = (user.user_metadata || {});
        await this.supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: meta.full_name || 'Member',
          voice_part: meta.voice_part || ''
        });
        ({ data: prof } = await this.supabase
          .from('profiles').select('*').eq('id', user.id).maybeSingle());
      }
      this.profile = prof;

      const { data: res } = await this.supabase
        .from('resources').select('*').order('created_at', { ascending: true });
      this.resources = res || [];

      this.renderDashboard();
    }

    /* ---------- Rendering ---------- */

    makeItem(it) {
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

    renderList(box, list, emptyMsg) {
      box.innerHTML = '';
      if (!list || !list.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = emptyMsg;
        box.appendChild(e);
        return;
      }
      list.forEach(it => box.appendChild(this.makeItem(it)));
    }

    renderDashboard() {
      if (!this.profile) return;
      const isLeader = this.profile.role === 'leader' || this.profile.role === 'admin';
      const isAdmin = this.profile.role === 'admin';

      $('mpGreet').textContent = 'Habari, ' + this.profile.full_name;
      $('mpSub').textContent =
        (this.profile.title ? this.profile.title + ' \u00b7 ' : '') +
        'Signed in as ' + MemberPortal.roleLabel(this.profile.role);

      $('mpProfile').innerHTML = '';
      [
        ['Name', this.profile.full_name],
        ['Email', this.profile.email],
        ['Access level', MemberPortal.roleLabel(this.profile.role)],
        ['Title', this.profile.title || '\u2014'],
        ['Voice part', this.profile.voice_part || '\u2014'],
        ['Member since', this.profile.created_at ? new Date(this.profile.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '\u2014']
      ].forEach(r => {
        const k = document.createElement('div');
        k.className = 'mp-k';
        k.textContent = r[0];
        const v = document.createElement('div');
        v.className = 'mp-v';
        v.textContent = r[1];
        $('mpProfile').appendChild(k);
        $('mpProfile').appendChild(v);
      });

      $('mpLeaderCard').hidden = !isLeader;
      $('mpAdminCard').hidden = !isAdmin;
      $('mpNavAdmin').hidden = !isAdmin;

      this.renderList($('mpMemberInfo'),
        this.resources.filter(r => r.audience === 'member'),
        'Nothing here yet \u2014 the leaders will add member resources soon.');
      this.renderList($('mpLeaderInfo'),
        this.resources.filter(r => r.audience === 'leader'),
        'Nothing here yet \u2014 leadership materials will be added soon.');
      this.renderList($('mpAdminInfo'),
        this.resources.filter(r => r.audience === 'admin'),
        'Nothing here yet \u2014 admin tools will be added soon.');

      if (isAdmin) {
        this.loadAdminMembers();
        const form = $('adminResourceForm');
        if (form) form.style.display = '';
      }
    }

    /* ---------- Admin: manage members ---------- */

    async loadAdminMembers() {
      const box = $('adminMembers');
      if (!box) return;
      const { data } = await this.supabase.from('profiles').select('*').order('full_name');
      box.innerHTML = '';
      (data || []).forEach(m => {
        const row = document.createElement('div');
        row.className = 'mp-mrow';
        const who = document.createElement('div');
        who.className = 'mp-mwho';
        const n = document.createElement('div');
        n.textContent = m.full_name + (m.id === this.profile.id ? ' ' + I18n.t('portal.you') : '');
        const em = document.createElement('div');
        em.className = 'mp-date';
        em.textContent = m.email;
        who.appendChild(n);
        who.appendChild(em);
        row.appendChild(who);
        const sel = document.createElement('select');
        ['member', 'leader', 'admin'].forEach(r => {
          const o = document.createElement('option');
          o.value = r;
          o.textContent = MemberPortal.roleLabel(r);
          if (m.role === r) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', async () => {
          const newRole = sel.value;
          if (m.id === this.profile.id && newRole !== 'admin') {
            const ok = window.confirm('Remove admin access from your own account? You will lose access to this panel.');
            if (!ok) { sel.value = m.role; return; }
          }
          const { error } = await this.supabase.rpc('admin_set_role', {
            p_email: m.email,
            p_role: newRole
          });
          if (error) {
            window.alert('Could not change role: ' + error.message);
            sel.value = m.role;
            return;
          }
          m.role = newRole;
          if (m.id === this.profile.id && newRole !== 'admin') {
            this.loadDashboard();
          }
        });
        row.appendChild(sel);
        box.appendChild(row);
      });
    }

    /* ---------- Admin: add a resource ---------- */

    async addResource(e) {
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
      $('arTitle').value = '';
      $('arBody').value = '';
      msg.className = 'mp-msg ok';
      msg.textContent = 'Resource added.';
      this.loadDashboard();
    }

    /* ---------- Tabs ---------- */

    switchTab(view) {
      document.querySelectorAll('.mp-tab').forEach(x => x.classList.toggle('on', x.dataset.view === view));
      document.querySelectorAll('.mp-form').forEach(f => f.classList.toggle('on', f.id === (view === 'signin' ? 'signinForm' : 'signupForm')));
    }

    /* ---------- Wire up + boot ---------- */

    init() {
      I18n.init('portal');

      document.querySelectorAll('.mp-tab').forEach(b =>
        b.addEventListener('click', () => this.switchTab(b.dataset.view))
      );

      document.querySelectorAll('#tblang button').forEach(b =>
        b.addEventListener('click', () => I18n.set(b.dataset.lang))
      );

      $('signinForm').addEventListener('submit', e => this.onSignIn(e));
      $('signupForm').addEventListener('submit', e => this.onSignUp(e));
      $('siForgot').addEventListener('click', e => this.onForgotPassword(e));
      $('resetForm').addEventListener('submit', e => this.onResetPassword(e));
      $('mpOut').addEventListener('click', () => this.signOut());
      $('adminResourceForm').addEventListener('submit', e => this.addResource(e));

      if (!window.supabase || !SUPABASE_READY) {
        this.showSetupBanner();
        return;
      }

      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

      this.supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          this.showDash();
          this.loadDashboard();
        } else if (event === 'SIGNED_OUT') {
          this.showAuth();
        } else if (event === 'PASSWORD_RECOVERY') {
          this.showReset();
        }
      });
    }
  }

  const portal = new MemberPortal();
  portal.init();
})();
