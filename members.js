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
      $('pendingView').hidden = true;
      $('authView').hidden = false;
    }

    showDash() {
      $('resetView').hidden = true;
      $('authView').hidden = true;
      $('pendingView').hidden = true;
      $('dashView').hidden = false;
    }

    showReset() {
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('pendingView').hidden = true;
      $('resetView').hidden = false;
    }

    showPending() {
      $('resetView').hidden = true;
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('pendingView').hidden = false;
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

    async onGoogleSignIn(e) {
      e.preventDefault();
      if (!this.supabase) return;
      const msg = $('siMsg');
      msg.className = 'mp-msg';
      msg.textContent = 'Opening Google sign-in\u2026';
      const res = await this.authCall(
        () => this.supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname }
        }),
        msg
      );
      if (res.failed) return;
      if (res.error) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Could not start Google sign-in: ' + res.error.message;
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
      this.profile = null;
      await this.supabase.auth.signOut();
      this.showAuth();
    }

    /* ---------- Dashboard data ---------- */

    pickLang(en, sw) {
      return (I18n.lang === 'sw' && sw) ? sw : en;
    }

    fmtWhen(iso) {
      return new Date(iso).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    }

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

      if (prof && prof.status !== 'active') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('invite');
        const pvMsg = $('pvMsg');
        if (prof.status === 'pending' && code) {
          const { data: claim, error: claimErr } = await this.supabase
            .rpc('claim_invite', { p_code: code });
          if (!claimErr && (claim === 'activated' || claim === 'already-active')) {
            if (pvMsg) {
              pvMsg.className = 'mp-msg ok';
              pvMsg.textContent = I18n.t('portal.invite.activating');
            }
            await this.loadDashboard();
            return;
          }
          if (pvMsg && claimErr) {
            pvMsg.className = 'mp-msg err';
            pvMsg.textContent = claimErr.message || '';
          }
        } else if (pvMsg && prof.status === 'rejected') {
          pvMsg.className = 'mp-msg err';
          pvMsg.textContent = I18n.t('portal.pend.rejected');
        }
        this.showPending();
        return;
      }

      const { data: res } = await this.supabase
        .from('resources').select('*').order('created_at', { ascending: true });
      this.resources = res || [];

      this.renderDashboard();
      this.loadEvents();
      this.loadAnnouncements();
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
        this.loadAdminInbox();
        this.loadAdminPending();
        const form = $('adminResourceForm');
        if (form) form.style.display = '';
      }
    }

    /* ---------- Events + RSVP ---------- */

    makeEventCard(ev, mine) {
      const card = document.createElement('div');
      card.className = 'mp-item';
      const h = document.createElement('h3');
      h.textContent = this.pickLang(ev.title_en, ev.title_sw) || 'Untitled';
      card.appendChild(h);
      const d = document.createElement('div');
      d.className = 'mp-date';
      d.textContent = this.fmtWhen(ev.start_time) + (ev.location ? ' \u00b7 ' + ev.location : '');
      card.appendChild(d);
      if (ev.is_mandatory) {
        const m = document.createElement('div');
        m.className = 'mp-badge leader';
        m.textContent = I18n.t('portal.rsvp.mandatory');
        card.appendChild(m);
      }
      const desc = this.pickLang(ev.description_en, ev.description_sw);
      if (desc) {
        const p = document.createElement('p');
        p.textContent = desc;
        card.appendChild(p);
      }
      const rw = document.createElement('div');
      rw.className = 'mp-rsvp';
      const lbl = document.createElement('span');
      lbl.textContent = I18n.t('portal.rsvp') + ':';
      rw.appendChild(lbl);
      ['attending', 'not_attending', 'maybe'].forEach(s => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mp-btn small' + (mine === s ? ' on' : '');
        b.textContent = I18n.t('portal.rsvp.' + s);
        b.addEventListener('click', () => this.setRsvp(ev, s));
        rw.appendChild(b);
      });
      card.appendChild(rw);
      return card;
    }

    async setRsvp(ev, status) {
      const { error } = await this.supabase.from('event_rsvps').upsert(
        {
          event_id: ev.id,
          member_id: this.profile.id,
          status: status,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'event_id,member_id' }
      );
      if (error) {
        window.alert(I18n.t('portal.rsvp.err') + '\n' + error.message);
        return;
      }
      this.loadEvents();
    }

    async loadEvents() {
      if (!this.profile) return;
      const { data: evs, error } = await this.supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);
      if (error) console.warn('events:', error);

      const { data: rsvps } = await this.supabase
        .from('event_rsvps').select('event_id, status');
      const mine = {};
      (rsvps || []).forEach(r => { mine[r.event_id] = r.status; });

      const nextBox = $('mpNextEvent');
      const listBox = $('mpEvents');
      if (!nextBox || !listBox) return;
      nextBox.innerHTML = '';
      listBox.innerHTML = '';
      const list = evs || [];
      if (!list.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = I18n.t('portal.noevents');
        nextBox.appendChild(e);
        listBox.appendChild(e.cloneNode(true));
        return;
      }
      nextBox.appendChild(this.makeEventCard(list[0], mine[list[0].id]));
      list.forEach(ev => listBox.appendChild(this.makeEventCard(ev, mine[ev.id])));
    }

    /* ---------- Announcements ---------- */

    async loadAnnouncements() {
      const box = $('mpAnnounce');
      if (!box) return;
      const { data, error } = await this.supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) console.warn('announcements:', error);
      box.innerHTML = '';
      const list = data || [];
      if (!list.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = I18n.t('portal.noanno');
        box.appendChild(e);
        return;
      }
      list.forEach(a => {
        const card = document.createElement('div');
        card.className = 'mp-item' + (a.is_pinned ? ' mp-pinned' : '');
        const h = document.createElement('h3');
        h.textContent = this.pickLang(a.title_en, a.title_sw);
        card.appendChild(h);
        const body = this.pickLang(a.content_en, a.content_sw);
        if (body) {
          const p = document.createElement('p');
          p.textContent = body;
          card.appendChild(p);
        }
        const d = document.createElement('div');
        d.className = 'mp-date';
        d.textContent = new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        card.appendChild(d);
        box.appendChild(card);
      });
    }

    /* ---------- Admin: pending registrations + invites ---------- */

    async setMemberStatus(email, status) {
      const { error } = await this.supabase.rpc('admin_set_status', {
        p_email: email,
        p_status: status
      });
      if (error) {
        window.alert(I18n.t('portal.status.err') + '\n' + error.message);
        return;
      }
      this.loadAdminPending();
    }

    async loadAdminPending() {
      const box = $('adminPending');
      if (!box) return;
      const { data } = await this.supabase
        .from('profiles').select('*').eq('status', 'pending').order('created_at');
      box.innerHTML = '';
      const list = data || [];
      if (!list.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = I18n.t('portal.pending.none');
        box.appendChild(e);
        return;
      }
      list.forEach(m => {
        const row = document.createElement('div');
        row.className = 'mp-mrow';
        const who = document.createElement('div');
        who.className = 'mp-mwho';
        const n = document.createElement('div');
        n.textContent = m.full_name;
        const em = document.createElement('div');
        em.className = 'mp-date';
        em.textContent = m.email + (m.voice_part ? ' \u00b7 ' + m.voice_part : '');
        who.appendChild(n);
        who.appendChild(em);
        row.appendChild(who);
        const ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'mp-btn small';
        ok.textContent = I18n.t('portal.approve');
        ok.addEventListener('click', () => this.setMemberStatus(m.email, 'active'));
        const no = document.createElement('button');
        no.type = 'button';
        no.className = 'mp-btn small danger';
        no.textContent = I18n.t('portal.reject');
        no.addEventListener('click', () => this.setMemberStatus(m.email, 'rejected'));
        row.appendChild(ok);
        row.appendChild(no);
        box.appendChild(row);
      });
    }

    async onInvite(e) {
      e.preventDefault();
      const msg = $('ivMsg');
      const email = $('ivEmail').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Enter a valid email address.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Creating invite link\u2026';
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let code = '';
      for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];
      const { error } = await this.supabase.from('invites').insert({
        code: code,
        email: email,
        role: $('ivRole').value
      });
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = I18n.t('portal.invite.err') + '\n' + error.message;
        return;
      }
      $('mpInviteLink').textContent =
        window.location.origin + window.location.pathname + '?invite=' + code;
      $('mpInviteBox').hidden = false;
      msg.textContent = '';
      $('ivEmail').value = '';
    }

    copyInvite() {
      const link = $('mpInviteLink').textContent;
      const done = () => {
        const b = $('mpInviteCopy');
        const orig = b.textContent;
        b.textContent = I18n.t('portal.invite.copied');
        setTimeout(() => { b.textContent = orig; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(done).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { /* ignore */ }
        document.body.removeChild(ta);
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
        ['member', 'leader', 'section_leader', 'admin'].forEach(r => {
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

    /* ---------- Admin: inbox (auditions + contact messages) ---------- */

    async loadAdminInbox() {
      const empty = document.createElement('p');
      empty.className = 'mp-empty';
      empty.textContent = I18n.t('portal.empty');

      const box = $('adminAuditions');
      if (box) {
        box.innerHTML = '';
        const { data, error } = await this.supabase
          .from('auditions').select('*').order('created_at', { ascending: false }).limit(30);
        if (error) { console.warn('auditions:', error); }
        const list = data || [];
        if (!list.length) { box.appendChild(empty.cloneNode(true)); }
        list.forEach(a => {
          const card = document.createElement('div');
          card.className = 'mp-item';
          const h = document.createElement('h3');
          h.textContent = a.name + (a.voice_part ? ' \u2014 ' + a.voice_part : '');
          card.appendChild(h);
          const p = document.createElement('p');
          p.textContent = a.email + (a.experience ? ' \u00b7 ' + a.experience : '');
          card.appendChild(p);
          if (a.message) {
            const m = document.createElement('p');
            m.textContent = a.message;
            card.appendChild(m);
          }
          if (a.created_at) {
            const d = document.createElement('div');
            d.className = 'mp-date';
            d.textContent = new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            card.appendChild(d);
          }
          box.appendChild(card);
        });
      }

      const mBox = $('adminMsgs');
      if (mBox) {
        mBox.innerHTML = '';
        const { data, error } = await this.supabase
          .from('contact_msgs').select('*').order('created_at', { ascending: false }).limit(30);
        if (error) { console.warn('contact_msgs:', error); }
        const list = data || [];
        if (!list.length) { mBox.appendChild(empty); }
        list.forEach(m => {
          const card = document.createElement('div');
          card.className = 'mp-item';
          const h = document.createElement('h3');
          h.textContent = m.subject || '(no subject)';
          card.appendChild(h);
          const p = document.createElement('p');
          p.textContent = m.name + ' \u00b7 ' + m.email;
          card.appendChild(p);
          const body = document.createElement('p');
          body.textContent = m.message;
          card.appendChild(body);
          if (m.created_at) {
            const d = document.createElement('div');
            d.className = 'mp-date';
            d.textContent = new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            card.appendChild(d);
          }
          mBox.appendChild(card);
        });
      }
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

      document.querySelectorAll('.tblang button').forEach(b =>
        b.addEventListener('click', () => {
          I18n.set(b.dataset.lang);
          if (this.profile && !$('dashView').hidden) this.loadDashboard();
        })
      );

      $('signinForm').addEventListener('submit', e => this.onSignIn(e));
      $('signupForm').addEventListener('submit', e => this.onSignUp(e));
      $('siForgot').addEventListener('click', e => this.onForgotPassword(e));
      const gBtn = $('googleBtn');
      if (gBtn) gBtn.addEventListener('click', e => this.onGoogleSignIn(e));
      $('resetForm').addEventListener('submit', e => this.onResetPassword(e));
      $('mpOut').addEventListener('click', () => this.signOut());
      $('pvOut').addEventListener('click', () => this.signOut());
      $('adminResourceForm').addEventListener('submit', e => this.addResource(e));
      $('adminInviteForm').addEventListener('submit', e => this.onInvite(e));
      $('mpInviteCopy').addEventListener('click', () => this.copyInvite());

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
