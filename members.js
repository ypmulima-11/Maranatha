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
      $('profileView').hidden = true;
      $('authView').hidden = false;
    }

    showDash() {
      $('resetView').hidden = true;
      $('authView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = true;
      $('dashView').hidden = false;
    }

    showReset() {
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = true;
      $('resetView').hidden = false;
    }

    showPending() {
      $('resetView').hidden = true;
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('profileView').hidden = true;
      $('pendingView').hidden = false;
    }

    /* ---------- Hide public page content once signed in ---------- */

    setMemberMode(on) {
      document.querySelectorAll('.hero.ph, .msw, footer').forEach(el => {
        el.style.display = on ? 'none' : '';
      });
      if (on) {
        const portal = $('portal');
        if (portal && portal.scrollIntoView) portal.scrollIntoView({ block: 'start' });
      }
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
      const res = await this.authCall(
        () => this.supabase.auth.signUp({
          email: email,
          password: password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname, data: { full_name: name } }
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
      const res = await this.authCall(
        () => this.supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }),
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

    /* ---------- Profile field helpers ---------- */

    fmtDob(iso) {
      if (!iso) return '\u2014';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '\u2014';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    studyLabel(p) {
      if (p.study_status === 'studying') {
        let s = 'Current Studying';
        if (p.course_program) s += ' \u00b7 ' + p.course_program;
        if (p.university) s += ' \u00b7 ' + p.university;
        if (p.expected_grad_year) s += ' \u00b7 class of ' + p.expected_grad_year;
        return s;
      }
      if (p.study_status === 'alumni') {
        let s = 'Alumni';
        if (p.grad_year) s += ' \u00b7 class of ' + p.grad_year;
        return s;
      }
      return '\u2014';
    }

    residenceLabel(p) {
      if (p.residence_type === 'campus') return p.residence || 'UDSM Campus';
      if (p.residence_type === 'off_campus') {
        return p.residence ? 'Out of campus \u00b7 ' + p.residence : 'Out of campus';
      }
      return '\u2014';
    }

    /* ---------- Profile editing ---------- */

    profileComplete(p) {
      if (!p) return false;
      if (!(p.dob && p.phone && p.study_status && p.residence_type)) return false;
      if (p.study_status === 'studying') {
        if (!(p.course_program && p.university && p.expected_grad_year)) return false;
      } else if (p.study_status === 'alumni') {
        if (!p.grad_year) return false;
      }
      if (p.residence_type === 'campus' && !p.residence) return false;
      if (p.residence_type === 'off_campus' && !p.residence) return false;
      return true;
    }

    openProfileForm(mandatory) {
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('resetView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = false;
      $('pfTitle').textContent = mandatory ? 'Complete your profile' : 'Edit your profile';
      $('pfSub').textContent = mandatory
        ? 'Please fill in these details first — they help the leaders organise groups and celebrations.'
        : 'Update your details at any time.';
      $('pfCancel').hidden = !!mandatory;
      this.openProfileEdit();
    }

    openProfileEdit() {
      const p = this.profile;
      if (!p) return;
      $('pfName').value = p.full_name || '';
      $('pfDob').value = p.dob || '';
      $('pfPhone').value = p.phone || '';
      $('pfEmail').value = p.email || '';
      $('pfVoice').value = p.voice_part || '';
      $('pfStudy').value = p.study_status || '';
      $('pfCourse').value = p.course_program || '';
      $('pfUni').value = p.university || '';
      $('pfExpGrad').value = p.expected_grad_year || '';
      $('pfGradYear').value = p.grad_year || '';
      $('pfResType').value = p.residence_type || '';
      $('pfHall').value = (p.residence_type === 'campus') ? (p.residence || '') : '';
      $('pfPlace').value = (p.residence_type === 'off_campus') ? (p.residence || '') : '';
      this.syncProfileForm();
      $('pfMsg').className = 'mp-msg';
      $('pfMsg').textContent = '';
      $('mpProfileForm').hidden = false;
      $('mpEditProfile').hidden = true;
      $('pfName').focus();
    }

    syncProfileForm() {
      $('pfStudying').hidden = $('pfStudy').value !== 'studying';
      $('pfAlumni').hidden = $('pfStudy').value !== 'alumni';
      $('pfResCampus').hidden = $('pfResType').value !== 'campus';
      $('pfResOff').hidden = $('pfResType').value !== 'off_campus';
    }

    closeProfileEdit() {
      $('mpProfileForm').hidden = true;
      $('mpEditProfile').hidden = false;
    }

    async onSaveProfile(e) {
      e.preventDefault();
      const msg = $('pfMsg');
      const name = $('pfName').value.trim();
      const study = $('pfStudy').value;
      const resType = $('pfResType').value;

      if (!name) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Enter your full name.';
        return;
      }

      let course = '', university = '', expectedGrad = null, gradYear = null;
      if (study === 'studying') {
        course = $('pfCourse').value.trim();
        university = $('pfUni').value;
        expectedGrad = parseInt($('pfExpGrad').value, 10) || null;
        if (!course) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Enter the course you are studying.';
          return;
        }
        if (!university) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Choose your university.';
          return;
        }
        if (!expectedGrad) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Enter your expected year of graduation.';
          return;
        }
      } else if (study === 'alumni') {
        gradYear = parseInt($('pfGradYear').value, 10) || null;
        if (!gradYear) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Enter your year of graduation.';
          return;
        }
      }

      let residence = '';
      if (resType === 'campus') {
        residence = $('pfHall').value;
        if (!residence) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Choose your hall or hostel.';
          return;
        }
      } else if (resType === 'off_campus') {
        residence = $('pfPlace').value.trim();
        if (!residence) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Enter the name of the place.';
          return;
        }
      }

      msg.className = 'mp-msg';
      msg.textContent = 'Saving\u2026';
      const patch = {
        full_name: name,
        dob: $('pfDob').value || null,
        phone: $('pfPhone').value.trim(),
        voice_part: $('pfVoice').value,
        study_status: study,
        course_program: course,
        university: university,
        expected_grad_year: expectedGrad,
        grad_year: gradYear,
        residence_type: resType,
        residence: residence
      };
      const res = await this.authCall(
        () => this.supabase.from('profiles').update(patch).eq('id', this.profile.id),
        msg
      );
      if (res.failed) return;
      if (res.error) {
        msg.className = 'mp-msg err';
        msg.textContent = res.error.message;
        return;
      }
      this.profile = Object.assign({}, this.profile, patch);
      this.closeProfileEdit();
      if (this.profileComplete(this.profile)) {
        this.showDash();
        this.loadDashboard();
      } else {
        this.renderDashboard();
      }
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

      if (prof && !this.profileComplete(prof)) {
        this.openProfileForm(true);
        return;
      }

      const { data: res } = await this.supabase
        .from('resources').select('*').order('created_at', { ascending: true });
      this.resources = res || [];

      await this.handleUrlCheckIn();
      this.renderDashboard();
      this.loadEvents();
      this.loadAnnouncements();
    }

    /* ---------- Attendance: member check-in ---------- */

    async handleUrlCheckIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (!code) return;
      params.delete('code');
      const qs = params.toString();
      history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
      const res = await this.supabase.rpc('check_in_with_code', { p_code: code });
      this.applyCheckInResult(res);
    }

    applyCheckInResult(res) {
      const msg = $('ciMsg');
      if (!msg) return;
      if (res && res.error) {
        msg.className = 'mp-msg err';
        msg.textContent = res.error.message;
        return;
      }
      let val = '';
      const d = res && res.data;
      if (typeof d === 'string') val = d;
      else if (d && typeof d === 'object') val = String(Object.values(d[0] !== undefined ? d[0] : d)[0]);
      if (val.indexOf('present:') === 0 || val === 'present') {
        msg.className = 'mp-msg ok';
        msg.textContent = val === 'present' ? 'Checked in \u2713' : 'Checked in \u2014 ' + val.slice(9) + ' \u2713';
      } else if (val.indexOf('late:') === 0 || val === 'late') {
        msg.className = 'mp-msg ok';
        msg.textContent = val === 'late' ? 'Checked in (late)' : 'Checked in (late) \u2014 ' + val.slice(5);
      } else if (val === 'already') {
        msg.className = 'mp-msg';
        msg.textContent = 'You were already checked in.';
      } else if (val === 'closed') {
        msg.className = 'mp-msg err';
        msg.textContent = 'That code has expired \u2014 ask your leader for the new one.';
      } else {
        msg.className = 'mp-msg err';
        msg.textContent = 'Code not recognised \u2014 check it and try again.';
      }
      this.loadMyAttendance();
    }

    async onCheckIn(e) {
      e.preventDefault();
      const code = $('ciCode').value.trim();
      const msg = $('ciMsg');
      if (!msg || !this.supabase) return;
      if (!code) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Type the check-in code first.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Checking in\u2026';
      const res = await this.supabase.rpc('check_in_with_code', { p_code: code });
      this.applyCheckInResult(res);
      $('ciCode').value = '';
    }

    async loadMyAttendance() {
      const box = $('attMine');
      if (!box || !this.supabase) return;
      const { data, error } = await this.supabase.rpc('my_attendance');
      box.innerHTML = '';
      if (error) {
        console.warn('my_attendance:', error);
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = /not found|schema cache|does not exist/i.test(error.message)
          ? 'Attendance is not set up yet \u2014 ask an admin to run supabase-attendance.sql.'
          : error.message;
        box.appendChild(p);
        return;
      }
      const list = data || [];
      if (!list.length) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = 'No attendance yet \u2014 your check-ins will appear here.';
        box.appendChild(p);
        return;
      }
      list.forEach(r => {
        const row = document.createElement('div');
        row.className = 'att-row';
        const who = document.createElement('div');
        const t = document.createElement('span');
        t.textContent = r.session_title || 'Session';
        who.appendChild(t);
        const d = document.createElement('div');
        d.className = 'mp-date';
        d.textContent = new Date(r.started_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        who.appendChild(d);
        row.appendChild(who);
        row.appendChild(this.attBadge(r.status));
        box.appendChild(row);
      });
    }

    attBadge(status) {
      const b = document.createElement('span');
      b.className = 'att-status' + (status ? ' att-' + status : '');
      b.textContent = status ? MemberPortal.optLabel(status) : '\u2014';
      return b;
    }

    /* ---------- Attendance: leader sessions ---------- */

    async initLeaderSessions() {
      const sel = $('ssEvent');
      if (sel && !sel.options.length) {
        const none = document.createElement('option');
        none.value = '';
        none.textContent = '\u2014 none \u2014';
        sel.appendChild(none);
        const { data: evs } = await this.supabase
          .from('events')
          .select('id,title_en,title_sw,start_time')
          .gte('start_time', new Date(Date.now() - 86400000).toISOString())
          .order('start_time', { ascending: true })
          .limit(20);
        (evs || []).forEach(ev => {
          const o = document.createElement('option');
          o.value = ev.id;
          o.textContent = this.fmtWhen(ev.start_time) + ' \u00b7 ' + this.pickLang(ev.title_en, ev.title_sw);
          sel.appendChild(o);
        });
      }
      this.loadSessions();
      this.startSessionTicker();
    }

    startSessionTicker() {
      if (this._sessTick) return;
      this._sessTick = setInterval(() => {
        if (!this.supabase || !this.profile || !$('dashView')) return;
        if ($('dashView').hidden) return;
        this.loadSessions(true);
      }, 60000);
    }

    async onCreateSession(e) {
      e.preventDefault();
      const msg = $('ssMsg');
      if (!msg || !this.supabase) return;
      const title = $('ssTitle').value.trim();
      if (title.length < 2) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Give the session a title.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Opening\u2026';
      const evId = $('ssEvent').value || null;
      const { data, error } = await this.supabase.rpc('leader_create_session', {
        p_title: title,
        p_event_id: evId,
        p_code_minutes: 20
      });
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      $('ssTitle').value = '';
      msg.className = 'mp-msg ok';
      msg.textContent = 'Session open \u2014 show the QR or share the code.';
      this.loadSessions();
    }

    async loadSessions(silent) {
      const openBox = $('sessOpen');
      const pastBox = $('sessPast');
      if (!openBox || !pastBox || !this.supabase || !this.profile) return;
      const { data, error } = await this.supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) {
        if (!silent) {
          console.warn('sessions:', error);
          openBox.innerHTML = '';
          const p = document.createElement('p');
          p.className = 'mp-empty';
          p.textContent = /does not exist|schema cache|relation/i.test(error.message)
            ? 'Sessions are not set up yet \u2014 ask an admin to run supabase-attendance.sql.'
            : error.message;
          openBox.appendChild(p);
        }
        return;
      }
      const list = data || [];
      const isAdmin = this.profile.role === 'admin';
      const manageable = s => s.created_by === this.profile.id || isAdmin;
      const open = list.filter(s => s.is_open && manageable(s));
      const past = list.filter(s => !s.is_open).slice(0, 8);

      openBox.innerHTML = '';
      open.forEach(s => openBox.appendChild(this.makeOpenSession(s)));

      pastBox.innerHTML = '';
      if (!past.length) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = 'No closed sessions yet.';
        pastBox.appendChild(p);
      } else {
        past.forEach(s => {
          const wrap = document.createElement('div');
          wrap.style.width = '100%';
          const row = document.createElement('div');
          row.className = 'att-row';
          const left = document.createElement('div');
          const t = document.createElement('span');
          t.textContent = s.title;
          left.appendChild(t);
          const dt = document.createElement('div');
          dt.className = 'mp-date';
          dt.textContent = new Date(s.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          left.appendChild(dt);
          row.appendChild(left);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'mp-btn small';
          btn.textContent = 'View roll';
          row.appendChild(btn);
          const roll = document.createElement('div');
          btn.addEventListener('click', () => {
            if (roll.childNodes.length) { roll.innerHTML = ''; return; }
            this.loadRoll(s.id, roll);
          });
          wrap.appendChild(row);
          wrap.appendChild(roll);
          pastBox.appendChild(wrap);
        });
      }
    }

    makeOpenSession(s) {
      const card = document.createElement('div');
      card.className = 'mp-item sess-live';
      const h = document.createElement('h3');
      h.textContent = s.title;
      card.appendChild(h);
      const d = document.createElement('div');
      d.className = 'mp-date';
      d.textContent = 'Started ' + this.fmtWhen(s.starts_at);
      card.appendChild(d);

      const qrWrap = document.createElement('div');
      qrWrap.className = 'qr-wrap';
      qrWrap.id = 'qr-' + s.id;
      let drew = false;
      if (typeof QRCode !== 'undefined' && s.code) {
        const link = window.location.origin + window.location.pathname + '?code=' + encodeURIComponent(s.code);
        try {
          new QRCode(qrWrap, { text: link, width: 170, height: 170, correctLevel: QRCode.CorrectLevel.M });
          drew = true;
        } catch (err) { drew = false; }
      }
      if (!drew) qrWrap.textContent = 'QR unavailable \u2014 use the code below.';
      card.appendChild(qrWrap);

      const code = document.createElement('div');
      code.className = 'att-code';
      code.textContent = s.code || '\u2014';
      card.appendChild(code);

      const exp = document.createElement('div');
      exp.className = 'mp-date';
      exp.textContent = s.code_expires_at ? 'Code expires ' + this.fmtWhen(s.code_expires_at) : 'No live code';
      card.appendChild(exp);

      const acts = document.createElement('div');
      acts.className = 'mp-rsvp';
      const rot = document.createElement('button');
      rot.type = 'button';
      rot.className = 'mp-btn small';
      rot.textContent = 'New code';
      rot.addEventListener('click', () => this.rotateCode(s.id));
      acts.appendChild(rot);
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'mp-btn small danger';
      close.textContent = 'Close session';
      close.addEventListener('click', () => this.closeSession(s.id));
      acts.appendChild(close);
      card.appendChild(acts);

      const roll = document.createElement('div');
      roll.id = 'roll-' + s.id;
      card.appendChild(roll);
      this.loadRoll(s.id, roll);
      return card;
    }

    async rotateCode(sid) {
      const { error } = await this.supabase.rpc('leader_rotate_code', { p_session_id: sid });
      if (error) window.alert('Could not rotate code: ' + error.message);
      this.loadSessions(true);
    }

    async closeSession(sid) {
      const { error } = await this.supabase.rpc('leader_close_session', { p_session_id: sid });
      if (error) window.alert('Could not close session: ' + error.message);
      this.loadSessions(true);
    }

    async loadRoll(sid, box) {
      if (!box) return;
      box.innerHTML = '<p class="mp-empty">Loading roll\u2026</p>';
      const { data, error } = await this.supabase.rpc('session_roll', { p_session_id: sid });
      box.innerHTML = '';
      if (error) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = error.message;
        box.appendChild(p);
        return;
      }
      const rows = data || [];
      const count = st => rows.filter(r => r.status === st).length;
      const counts = document.createElement('div');
      counts.className = 'att-counts';
      counts.textContent =
        'Present ' + count('present') +
        ' \u00b7 Late ' + count('late') +
        ' \u00b7 Excused ' + count('excused') +
        ' \u00b7 Absent ' + count('absent') +
        ' \u00b7 Not marked ' + rows.filter(r => !r.status).length;
      box.appendChild(counts);
      rows.forEach(r => {
        const row = document.createElement('div');
        row.className = 'att-row';
        const who = document.createElement('div');
        const nm = document.createElement('span');
        nm.textContent = r.full_name || 'Member';
        who.appendChild(nm);
        if (r.voice_part) {
          const vp = document.createElement('div');
          vp.className = 'mp-date';
          vp.textContent = r.voice_part;
          who.appendChild(vp);
        }
        row.appendChild(who);
        if (r.status) {
          const b = this.attBadge(r.status);
          b.title = 'Click to unmark';
          b.addEventListener('click', () => this.markAttendance(sid, r.member_id, null));
          row.appendChild(b);
        } else {
          const mk = document.createElement('div');
          mk.className = 'mp-rsvp';
          ['present', 'late', 'excused', 'absent'].forEach(st => {
            const bb = document.createElement('button');
            bb.type = 'button';
            bb.className = 'mp-btn small';
            bb.textContent = st.charAt(0).toUpperCase();
            bb.title = MemberPortal.optLabel(st);
            bb.addEventListener('click', () => this.markAttendance(sid, r.member_id, st));
            mk.appendChild(bb);
          });
          row.appendChild(mk);
        }
        box.appendChild(row);
      });
    }

    async markAttendance(sid, memberId, status) {
      let res;
      if (status === null) {
        res = await this.supabase.rpc('leader_unmark_attendance', {
          p_session_id: sid,
          p_member_id: memberId
        });
      } else {
        res = await this.supabase.rpc('leader_mark_attendance', {
          p_session_id: sid,
          p_member_id: memberId,
          p_status: status
        });
      }
      if (res && res.error) {
        window.alert('Could not save: ' + res.error.message);
        return;
      }
      const box = $('roll-' + sid);
      if (box) this.loadRoll(sid, box);
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
      const isLeader = this.profile.role === 'leader' || this.profile.role === 'section_leader' || this.profile.role === 'admin';
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
        ['Date of birth', this.fmtDob(this.profile.dob)],
        ['Phone', this.profile.phone || '\u2014'],
        ['Study status', this.studyLabel(this.profile)],
        ['Residence', this.residenceLabel(this.profile)],
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
      $('mpLeaderWork').hidden = !isLeader;
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

      if (isLeader) this.renderLeaderWorkspace();

      $('mpAttendCard').hidden = false;
      this.loadMyAttendance();

      if (isLeader) {
        $('mpSessCard').hidden = false;
        this.initLeaderSessions();
      }

      if (isAdmin) {
        this.loadAdminMembers();
        this.loadAdminInbox();
        this.loadAdminPending();
        this.loadAdminResidence();
        this.loadAdminVoice();
        this.loadAdminBirthdays();
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

    /* ---------- Role-specific leader workspaces ---------- */

    static optLabel(v) {
      return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
    }

    static WORKSPACES = {
      chairperson: {
        table: 'chairperson_workspace',
        name: 'Chairperson',
        types: {
          meeting: {
            label: 'Meeting',
            title: r => 'Meeting: ' + (r.meeting_title || ''),
            fields: [
              { k: 'meeting_title', l: 'Meeting title', req: true },
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_type', l: 'Meeting type', t: 'select', opts: ['executive', 'general_assembly', 'sub_committee', 'other'] },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'attendees', l: 'Attendees' },
              { k: 'minutes', l: 'Minutes', t: 'textarea' },
              { k: 'action_items', l: 'Action items', t: 'textarea' }
            ]
          },
          appointment: {
            label: 'Sub-committee appointment',
            title: r => 'Appointment: ' + (r.committee_name || '') + ' \u2014 ' + (r.appointee_name || ''),
            fields: [
              { k: 'committee_name', l: 'Committee', req: true },
              { k: 'appointee_name', l: 'Appointee name', req: true },
              { k: 'appointment_date', l: 'Appointment date', t: 'date' },
              { k: 'appointment_letter_url', l: 'Letter link (URL)' }
            ]
          },
          document: {
            label: 'Bank & official document',
            title: r => 'Document: ' + (r.document_title || ''),
            fields: [
              { k: 'document_title', l: 'Document title', req: true },
              { k: 'document_type', l: 'Document type', t: 'select', opts: ['bank_signatory', 'official_letter', 'authorization', 'other'] },
              { k: 'document_date', l: 'Document date', t: 'date' },
              { k: 'document_file_url', l: 'File link (URL)' }
            ]
          }
        }
      },

      choirmaster: {
        table: 'choirmaster_workspace',
        name: 'Choir Master',
        types: {
          rehearsal: {
            label: 'Rehearsal',
            title: r => 'Rehearsal: ' + (r.pieces_practiced || r.rehearsal_date || ''),
            fields: [
              { k: 'rehearsal_date', l: 'Rehearsal date', t: 'date', req: true },
              { k: 'rehearsal_time', l: 'Time', t: 'time' },
              { k: 'venue', l: 'Venue' },
              { k: 'pieces_practiced', l: 'Pieces practiced', t: 'textarea' },
              { k: 'focus_areas', l: 'Focus areas', t: 'textarea' },
              { k: 'attendance_count', l: 'Attendance count', t: 'number' }
            ]
          },
          repertoire: {
            label: 'Song repertoire',
            title: r => 'Song: ' + (r.song_title || ''),
            fields: [
              { k: 'song_title', l: 'Song title', req: true },
              { k: 'composer', l: 'Composer' },
              { k: 'arrangement', l: 'Arrangement' },
              { k: 'difficulty', l: 'Difficulty', t: 'select', opts: ['easy', 'medium', 'hard'] },
              { k: 'status_repertoire', l: 'Status', t: 'select', opts: ['learning', 'polishing', 'performance_ready', 'archived'] }
            ]
          },
          event: {
            label: 'Ministry calendar',
            title: r => 'Event: ' + (r.event_title || ''),
            fields: [
              { k: 'event_title', l: 'Event title', req: true },
              { k: 'event_date', l: 'Event date', t: 'date', req: true },
              { k: 'event_type', l: 'Event type', t: 'select', opts: ['mass', 'concert', 'wedding', 'funeral', 'festival', 'rehearsal', 'other'] },
              { k: 'event_venue', l: 'Venue' },
              { k: 'preparation_notes', l: 'Preparation notes', t: 'textarea' }
            ]
          },
          assistant: {
            label: 'Assistant',
            title: r => 'Assistant: ' + (r.assistant_name || ''),
            fields: [
              { k: 'assistant_name', l: 'Assistant name', req: true },
              { k: 'assistant_role', l: 'Role given' },
              { k: 'appointment_date', l: 'Appointment date', t: 'date' }
            ]
          }
        }
      },

      secretary: {
        table: 'secretary_workspace',
        name: 'Secretary',
        types: {
          minutes: {
            label: 'Meeting minutes',
            title: r => 'Minutes: ' + (r.meeting_type || '') + ' \u00b7 ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_type', l: 'Meeting type', t: 'select', opts: ['executive', 'general', 'sub_committee', 'annual_general', 'other'] },
              { k: 'attendees', l: 'Attendees', t: 'textarea' },
              { k: 'apologies', l: 'Apologies', t: 'textarea' },
              { k: 'minutes_text', l: 'Minutes', t: 'textarea' },
              { k: 'matters_arising', l: 'Matters arising', t: 'textarea' },
              { k: 'decisions_made', l: 'Decisions made', t: 'textarea' },
              { k: 'action_items', l: 'Action items', t: 'textarea' },
              { k: 'next_meeting_date', l: 'Next meeting date', t: 'date' }
            ]
          },
          asset: {
            label: 'Asset register',
            title: r => 'Asset: ' + (r.asset_name || ''),
            fields: [
              { k: 'asset_name', l: 'Asset name', req: true },
              { k: 'asset_category', l: 'Category', t: 'select', opts: ['instruments', 'sound_equipment', 'furniture', 'vestments', 'documents', 'other'] },
              { k: 'asset_condition', l: 'Condition', t: 'select', opts: ['excellent', 'good', 'fair', 'needs_repair', 'disposed'] },
              { k: 'asset_location', l: 'Location' },
              { k: 'asset_value', l: 'Value (TZS)', t: 'number' },
              { k: 'acquisition_date', l: 'Acquired on', t: 'date' }
            ]
          },
          correspondence: {
            label: 'Correspondence',
            title: r => 'Correspondence: ' + (r.subject || ''),
            fields: [
              { k: 'subject', l: 'Subject', req: true },
              { k: 'correspondence_type', l: 'Direction', t: 'select', opts: ['incoming', 'outgoing', 'internal'] },
              { k: 'correspondence_date', l: 'Date', t: 'date' },
              { k: 'from_to', l: 'From / To' },
              { k: 'reference_number', l: 'Reference number' },
              { k: 'file_url', l: 'File link (URL)' }
            ]
          },
          membership: {
            label: 'Membership record',
            title: r => 'Member: ' + (r.member_name || ''),
            fields: [
              { k: 'member_name', l: 'Member name', req: true },
              { k: 'member_role', l: 'Role' },
              { k: 'membership_status', l: 'Status', t: 'select', opts: ['active', 'on_leave', 'resigned', 'suspended'] },
              { k: 'membership_date', l: 'Effective date', t: 'date' }
            ]
          }
        }
      },

      asst_secretary: {
        table: 'asst_secretary_workspace',
        name: 'Assistant Secretary',
        types: {
          meeting_support: {
            label: 'Meeting support',
            title: r => 'Support: ' + (r.support_role || '') + ' \u00b7 ' + (r.meeting_date || ''),
            fields: [
              { k: 'support_role', l: 'Support task', t: 'select', opts: ['minutes_draft', 'attendance', 'documents_prep', 'distribution', 'other'], req: true },
              { k: 'meeting_date', l: 'Meeting date', t: 'date' },
              { k: 'meeting_type', l: 'Meeting type', t: 'select', opts: ['executive', 'general', 'sub_committee', 'other'] },
              { k: 'draft_minutes', l: 'Draft minutes', t: 'textarea' },
              { k: 'documents_prepared', l: 'Documents prepared', t: 'textarea' },
              { k: 'distribution_list', l: 'Distribution list', t: 'textarea' }
            ]
          },
          backup_minutes: {
            label: 'Backup minutes',
            title: r => 'Backup minutes: ' + (r.backup_for_date || ''),
            fields: [
              { k: 'backup_for_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'backup_minutes', l: 'Minutes', t: 'textarea' }
            ]
          },
          communication: {
            label: 'Communication draft',
            title: r => 'Communication: ' + (r.comm_type || ''),
            fields: [
              { k: 'comm_type', l: 'Type', t: 'select', opts: ['letter', 'email', 'notice', 'announcement', 'other'], req: true },
              { k: 'comm_draft', l: 'Draft', t: 'textarea' },
              { k: 'comm_recipients', l: 'Recipients' },
              { k: 'comm_status', l: 'Status', t: 'select', opts: ['draft', 'ready_to_send', 'sent'] }
            ]
          }
        }
      },

      treasurer: {
        table: 'treasurer_workspace',
        name: 'Treasurer',
        types: {
          semester_report: {
            label: 'Semester report',
            title: r => 'Report: ' + (r.semester || ''),
            fields: [
              { k: 'semester', l: 'Semester (e.g. 2026-1)', req: true },
              { k: 'report_date', l: 'Report date', t: 'date' },
              { k: 'total_income', l: 'Total income', t: 'number' },
              { k: 'total_expenses', l: 'Total expenses', t: 'number' },
              { k: 'balance_brought_forward', l: 'Balance b/f', t: 'number' },
              { k: 'balance_carried_forward', l: 'Balance c/f', t: 'number' },
              { k: 'report_file_url', l: 'Report file link (URL)' }
            ]
          },
          transaction: {
            label: 'Bank transaction',
            title: r => 'Transaction: ' + (r.description || ''),
            fields: [
              { k: 'transaction_date', l: 'Date', t: 'date', req: true },
              { k: 'transaction_type', l: 'Type', t: 'select', opts: ['deposit', 'withdrawal', 'transfer', 'fee', 'interest'], req: true },
              { k: 'amount', l: 'Amount (TZS)', t: 'number', req: true },
              { k: 'description', l: 'Description', req: true },
              { k: 'reference_number', l: 'Reference number' },
              { k: 'bank_statement_ref', l: 'Statement reference' }
            ]
          },
          contribution: {
            label: 'Contribution received',
            title: r => 'Contribution: ' + (r.contributor_name || ''),
            fields: [
              { k: 'contributor_name', l: 'Contributor', req: true },
              { k: 'contributor_type', l: 'Source', t: 'select', opts: ['member', 'donor', 'fundraising', 'parish', 'other'] },
              { k: 'contribution_amount', l: 'Amount (TZS)', t: 'number' },
              { k: 'contribution_date', l: 'Date', t: 'date' },
              { k: 'contribution_method', l: 'Method', t: 'select', opts: ['cash', 'mobile_money', 'bank_transfer', 'cheque', 'other'] },
              { k: 'receipt_number', l: 'Receipt number' }
            ]
          },
          expense: {
            label: 'Expense',
            title: r => 'Expense: ' + (r.expense_description || ''),
            fields: [
              { k: 'expense_description', l: 'Description', req: true },
              { k: 'expense_category', l: 'Category', t: 'select', opts: ['instruments', 'vestments', 'transport', 'venue', 'meals', 'stationery', 'maintenance', 'utilities', 'honoraria', 'other'] },
              { k: 'expense_amount', l: 'Amount (TZS)', t: 'number' },
              { k: 'expense_date', l: 'Date', t: 'date' },
              { k: 'payee', l: 'Paid to' },
              { k: 'invoice_receipt_url', l: 'Invoice/receipt link (URL)' },
              { k: 'approved_by', l: 'Approved by' }
            ]
          }
        }
      },

      subcommittee: {
        table: 'subcommittee_workspace',
        types: {
          meeting: {
            label: 'Committee meeting',
            title: r => 'Meeting: ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date' },
              { k: 'meeting_venue', l: 'Venue' },
              { k: 'attendees', l: 'Attendees', t: 'textarea' },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'minutes', l: 'Minutes', t: 'textarea' },
              { k: 'decisions', l: 'Decisions', t: 'textarea' },
              { k: 'action_items', l: 'Action items', t: 'textarea' },
              { k: 'next_meeting_date', l: 'Next meeting date', t: 'date' }
            ]
          },
          activity: {
            label: 'Activity report',
            title: r => 'Activity: ' + (r.activity_title || ''),
            fields: [
              { k: 'activity_title', l: 'Activity title', req: true },
              { k: 'activity_date', l: 'Date', t: 'date' },
              { k: 'participants_count', l: 'Participants', t: 'number' },
              { k: 'activity_description', l: 'Description', t: 'textarea' },
              { k: 'outcome', l: 'Outcome', t: 'textarea' },
              { k: 'challenges', l: 'Challenges', t: 'textarea' },
              { k: 'recommendations', l: 'Recommendations', t: 'textarea' }
            ]
          },
          member_issue: {
            label: 'Member issue',
            title: r => 'Issue: ' + (r.member_name || ''),
            fields: [
              { k: 'member_name', l: 'Member name', req: true },
              { k: 'issue_type', l: 'Issue type', t: 'select', opts: ['attendance', 'conduct', 'uniform', 'conflict', 'other'] },
              { k: 'issue_description', l: 'Description', t: 'textarea' },
              { k: 'resolution', l: 'Resolution', t: 'textarea' },
              { k: 'follow_up_date', l: 'Follow-up date', t: 'date' }
            ]
          },
          liturgy: {
            label: 'Liturgy plan',
            title: r => 'Liturgy: ' + (r.liturgy_type || '') + ' \u00b7 ' + (r.liturgy_date || ''),
            fields: [
              { k: 'liturgy_date', l: 'Date', t: 'date' },
              { k: 'liturgy_type', l: 'Celebration', t: 'select', opts: ['sunday_mass', 'feast_day', 'wedding', 'funeral', 'special', 'other'] },
              { k: 'readings', l: 'Readings', t: 'textarea' },
              { k: 'songs_selected', l: 'Songs selected', t: 'textarea' },
              { k: 'special_notes', l: 'Special notes', t: 'textarea' }
            ]
          },
          media: {
            label: 'Media item',
            title: r => 'Media: ' + (r.media_title || ''),
            fields: [
              { k: 'media_title', l: 'Title', req: true },
              { k: 'media_type', l: 'Type', t: 'select', opts: ['photo', 'video', 'audio', 'livestream', 'social_post', 'website_update', 'other'] },
              { k: 'media_description', l: 'Description', t: 'textarea' },
              { k: 'platform', l: 'Platform' },
              { k: 'publish_date', l: 'Publish date', t: 'date' },
              { k: 'media_file_url', l: 'File link (URL)' }
            ]
          },
          social_event: {
            label: 'Social event',
            title: r => 'Social: ' + (r.event_title || ''),
            fields: [
              { k: 'event_title', l: 'Event title', req: true },
              { k: 'event_date', l: 'Date', t: 'date' },
              { k: 'beneficiaries', l: 'Beneficiaries' },
              { k: 'budget_allocated', l: 'Budget allocated', t: 'number' },
              { k: 'budget_spent', l: 'Budget spent', t: 'number' },
              { k: 'event_description', l: 'Description', t: 'textarea' }
            ]
          }
        }
      }
    };

    static GENERIC_WS = {
      key: 'generic',
      table: 'leader_records',
      name: 'Leader',
      types: {
        note: {
          label: 'Note',
          title: r => r.title || 'Untitled',
          fields: [
            { k: 'title', l: 'Title', req: true },
            { k: 'body', l: 'Notes', t: 'textarea' },
            { k: 'record_date', l: 'Date', t: 'date' }
          ]
        }
      }
    };

    static SUB_COMMITTEES = [
      ['nidhamu', /nidhamu|discipline/],
      ['liturujia', /liturujia|liturgy/],
      ['media', /\bmedia\b/],
      ['kijamii', /kijamii|\bsocial\b/]
    ];

    static workspaceForProfile(p) {
      if (!p || !p.title) return null;
      const norm = (' ' + p.title.toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim() + ' ');
      const W = MemberPortal.WORKSPACES;
      const mk = key => Object.assign({ key: key }, W[key]);
      if (/katibu msaidizi|assistant secretary|asst secretary|asst sec/.test(norm)) return mk('asst_secretary');
      if (/mwenyekiti|chair/.test(norm)) return mk('chairperson');
      if (/mwalimu mkuu|mwaimaji|choir ?master/.test(norm)) return mk('choirmaster');
      if (/mtunza hazina|hazina|treasurer/.test(norm)) return mk('treasurer');
      if (/katibu|secretary/.test(norm)) return mk('secretary');
      for (const [committee, re] of MemberPortal.SUB_COMMITTEES) {
        if (re.test(norm.trim())) {
          const ws = mk('subcommittee');
          ws.committee = committee;
          ws.name = MemberPortal.optLabel(committee) + ' sub-committee';
          return ws;
        }
      }
      return null;
    }

    wsTypeKey() {
      return this._wsType && this.ws.types[this._wsType] ? this._wsType : Object.keys(this.ws.types)[0];
    }

    renderLeaderWorkspace() {
      this.ws = MemberPortal.workspaceForProfile(this.profile) || MemberPortal.GENERIC_WS;
      this._wsType = null;
      const hint = $('lrHint');
      const form = $('lrForm');
      const list = $('lrList');
      if (!form || !list) return;

      if (hint) {
        hint.textContent = this.ws.key === 'generic'
          ? 'Your personal records for this leadership year \u2014 only you and the admins can see them.'
          : this.ws.name + ' workspace \u2014 your structured records, visible only to you and the admins.';
      }

      form.innerHTML = '';
      list.innerHTML = '';

      const typeLbl = document.createElement('label');
      typeLbl.className = 'mp-field';
      const ts = document.createElement('span');
      ts.textContent = 'Record type';
      typeLbl.appendChild(ts);
      const sel = document.createElement('select');
      sel.id = 'lrType';
      Object.keys(this.ws.types).forEach(k => {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = this.ws.types[k].label;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        this._wsType = sel.value;
        this.renderWsFields();
      });
      typeLbl.appendChild(sel);
      form.appendChild(typeLbl);

      this.wsFields = document.createElement('div');
      form.appendChild(this.wsFields);

      this.lrMsg = document.createElement('div');
      this.lrMsg.className = 'mp-msg';
      this.lrMsg.setAttribute('role', 'status');
      form.appendChild(this.lrMsg);

      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'mp-btn';
      btn.textContent = 'Save record';
      form.appendChild(btn);

      this.renderWsFields();
      this.loadLeaderWorkspace();
    }

    renderWsFields() {
      if (!this.wsFields) return;
      const t = this.ws.types[this.wsTypeKey()];
      this.wsFields.innerHTML = '';
      t.fields.forEach(f => {
        const lab = document.createElement('label');
        lab.className = 'mp-field';
        const sp = document.createElement('span');
        sp.textContent = f.l + (f.req ? ' *' : '');
        lab.appendChild(sp);
        let inp;
        if (f.t === 'textarea') {
          inp = document.createElement('textarea');
          inp.rows = 2;
        } else if (f.t === 'select') {
          inp = document.createElement('select');
          [''].concat(f.opts).forEach(v => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v === '' ? '\u2014' : MemberPortal.optLabel(v);
            inp.appendChild(o);
          });
        } else {
          inp = document.createElement('input');
          inp.type = f.t || 'text';
        }
        inp.dataset.k = f.k;
        lab.appendChild(inp);
        this.wsFields.appendChild(lab);
      });
    }

    makeRecord(r) {
      const card = document.createElement('div');
      card.className = 'mp-item';
      const t = this.ws.types[r.record_type];
      if (Object.keys(this.ws.types).length > 1) {
        const b = document.createElement('span');
        b.className = 'mp-badge member';
        b.textContent = t ? t.label : MemberPortal.optLabel(r.record_type || 'record');
        card.appendChild(b);
      }
      const h = document.createElement('h3');
      h.textContent = t ? (t.title(r) || 'Untitled') : (r.title || 'Untitled');
      card.appendChild(h);
      const d = document.createElement('div');
      d.className = 'mp-date';
      d.textContent = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      card.appendChild(d);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mp-btn small danger';
      del.textContent = 'Delete';
      del.addEventListener('click', () => this.deleteRecord(r.id));
      card.appendChild(del);
      return card;
    }

    async loadLeaderWorkspace() {
      const box = $('lrList');
      if (!box || !this.supabase || !this.ws) return;
      const { data, error } = await this.supabase
        .from(this.ws.table)
        .select('*')
        .eq('owner_id', this.profile.id)
        .order('created_at', { ascending: false });
      box.innerHTML = '';
      if (error) {
        console.warn('leader workspace:', error);
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = /does not exist|schema cache|relation/i.test(error.message)
          ? 'This workspace is not set up yet \u2014 ask an admin to run supabase-leader-workspaces.sql in Supabase first.'
          : error.message;
        box.appendChild(e);
        return;
      }
      const list = data || [];
      if (!list.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = 'No records yet \u2014 add your first one above.';
        box.appendChild(e);
        return;
      }
      list.forEach(r => box.appendChild(this.makeRecord(r)));
    }

    async onAddRecord(e) {
      e.preventDefault();
      const msg = this.lrMsg;
      if (!msg || !this.supabase || !this.ws) return;
      const tkey = this.wsTypeKey();
      const t = this.ws.types[tkey];
      const row = { owner_id: this.profile.id, record_type: tkey };
      const missing = [];
      this.wsFields.querySelectorAll('[data-k]').forEach(inp => {
        const f = t.fields.find(x => x.k === inp.dataset.k);
        if (!f) return;
        const v = (inp.value || '').trim();
        if (f.req && !v) { missing.push(f.l); return; }
        if (!v) return;
        row[f.k] = f.t === 'number' ? Number(v) : v;
      });
      if (missing.length) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Please fill in: ' + missing.join(', ');
        return;
      }
      if (this.ws.key === 'subcommittee') row.committee_name = this.ws.committee;
      msg.className = 'mp-msg';
      msg.textContent = 'Saving\u2026';
      const { error } = await this.supabase.from(this.ws.table).insert(row);
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      this.wsFields.querySelectorAll('input, textarea').forEach(i => { i.value = ''; });
      this.wsFields.querySelectorAll('select').forEach(s => { s.selectedIndex = 0; });
      msg.className = 'mp-msg ok';
      msg.textContent = 'Record saved \u2713';
      this.loadLeaderWorkspace();
    }

    async deleteRecord(id) {
      if (!this.supabase || !this.ws) return;
      await this.supabase.from(this.ws.table).delete().eq('id', id);
      this.loadLeaderWorkspace();
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
        const det = document.createElement('div');
        det.className = 'mp-date';
        det.hidden = true;
        det.textContent = [
          m.phone ? 'Phone: ' + m.phone : '',
          m.dob ? 'Born: ' + this.fmtDob(m.dob) : '',
          this.studyLabel(m),
          this.residenceLabel(m)
        ].filter(s => s && s !== '\u2014').join(' \u00b7 ') || 'No extra details yet';
        const detBtn = document.createElement('button');
        detBtn.type = 'button';
        detBtn.className = 'mp-btn small';
        detBtn.textContent = 'Profile';
        detBtn.addEventListener('click', () => { det.hidden = !det.hidden; });
        row.appendChild(detBtn);
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
        const tit = document.createElement('input');
        tit.type = 'text';
        tit.className = 'mp-mtitle';
        tit.value = m.title || '';
        tit.placeholder = 'Title (e.g. Chairperson)';
        tit.maxLength = 60;
        tit.addEventListener('change', async () => {
          const val = tit.value.trim();
          if (val === (m.title || '')) return;
          const { error } = await this.supabase.rpc('admin_set_title', {
            p_email: m.email,
            p_title: val
          });
          if (error) {
            window.alert('Could not change title: ' + error.message);
            tit.value = m.title || '';
            return;
          }
          m.title = val;
        });
        row.appendChild(tit);
        row.appendChild(det);
        box.appendChild(row);
      });
    }

    /* ---------- Admin: members grouped by residence and birthday month ---------- */

    static HALLS = ['Hall 1','Hall 2','Hall 3','Hall 4','Hall 5','Hall 6','Hall 7','Magufuli Hostel','Coict Hostel','Mabibo Hostel'];

    static VOICE_ORDER = ['Soprano', 'Alto', 'Tenor', 'Bass'];

    static MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    async loadAdminResidence() {
      const box = $('adminResidence');
      if (!box) return;
      const { data } = await this.supabase
        .from('profiles').select('full_name, email, residence_type, residence').order('full_name');
      box.innerHTML = '';
      const groups = {};
      (data || []).forEach(m => {
        const key = m.residence_type === 'campus' ? m.residence
          : m.residence_type === 'off_campus' ? (m.residence || 'Out of campus (not specified)')
          : null;
        if (!key) return;
        (groups[key] = groups[key] || []).push(m);
      });
      const keys = Object.keys(groups).sort((a, b) => {
        const ia = MemberPortal.HALLS.indexOf(a);
        const ib = MemberPortal.HALLS.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
      });
      if (!keys.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = 'No member has filled in a residence yet.';
        box.appendChild(e);
        return;
      }
      keys.forEach(key => {
        const head = document.createElement('div');
        head.className = 'mp-mwho';
        const n = document.createElement('div');
        n.textContent = key + ' \u00b7 ' + groups[key].length;
        head.appendChild(n);
        box.appendChild(head);
        groups[key].forEach(m => {
          const row = document.createElement('div');
          row.className = 'mp-mrow';
          const who = document.createElement('div');
          who.className = 'mp-mwho';
          const nm = document.createElement('div');
          nm.textContent = m.full_name;
          const em = document.createElement('div');
          em.className = 'mp-date';
          em.textContent = m.email;
          who.appendChild(nm);
          who.appendChild(em);
          row.appendChild(who);
          box.appendChild(row);
        });
      });
    }

    async loadAdminVoice() {
      const box = $('adminVoice');
      if (!box) return;
      const { data } = await this.supabase
        .from('profiles').select('full_name, email, voice_part').order('full_name');
      box.innerHTML = '';
      const groups = {};
      (data || []).forEach(m => {
        const key = m.voice_part || 'Not set';
        (groups[key] = groups[key] || []).push(m);
      });
      const keys = Object.keys(groups).sort((a, b) => {
        const ia = MemberPortal.VOICE_ORDER.indexOf(a);
        const ib = MemberPortal.VOICE_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
      });
      if (!keys.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = 'No member has chosen a voice part yet.';
        box.appendChild(e);
        return;
      }
      keys.forEach(key => {
        const head = document.createElement('div');
        head.className = 'mp-mwho';
        const n = document.createElement('div');
        n.textContent = key + ' \u00b7 ' + groups[key].length;
        head.appendChild(n);
        box.appendChild(head);
        groups[key].forEach(m => {
          const row = document.createElement('div');
          row.className = 'mp-mrow';
          const who = document.createElement('div');
          who.className = 'mp-mwho';
          const nm = document.createElement('div');
          nm.textContent = m.full_name;
          const em = document.createElement('div');
          em.className = 'mp-date';
          em.textContent = m.email;
          who.appendChild(nm);
          who.appendChild(em);
          row.appendChild(who);
          box.appendChild(row);
        });
      });
    }

    async loadAdminBirthdays() {
      const box = $('adminBirthdays');
      if (!box) return;
      const { data } = await this.supabase
        .from('profiles').select('full_name, dob').order('full_name');
      box.innerHTML = '';
      const groups = {};
      (data || []).forEach(m => {
        if (!m.dob) return;
        const d = new Date(m.dob);
        if (isNaN(d.getTime())) return;
        const month = d.getMonth();
        (groups[month] = groups[month] || []).push({ name: m.full_name, day: d.getDate() });
      });
      if (!Object.keys(groups).length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = 'No member has filled in a date of birth yet.';
        box.appendChild(e);
        return;
      }
      MemberPortal.MONTHS.forEach((monthName, month) => {
        if (!groups[month]) return;
        const head = document.createElement('div');
        head.className = 'mp-mwho';
        const n = document.createElement('div');
        n.textContent = monthName + ' \u00b7 ' + groups[month].length;
        head.appendChild(n);
        box.appendChild(head);
        groups[month].sort((a, b) => a.day - b.day).forEach(m => {
          const row = document.createElement('div');
          row.className = 'mp-mrow';
          const who = document.createElement('div');
          who.className = 'mp-mwho';
          const nm = document.createElement('div');
          nm.textContent = m.name + ' \u2014 ' + m.day + ' ' + monthName;
          who.appendChild(nm);
          row.appendChild(who);
          box.appendChild(row);
        });
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
      const lrForm = $('lrForm');
      if (lrForm) lrForm.addEventListener('submit', e => this.onAddRecord(e));
      const ciForm = $('ciForm');
      if (ciForm) ciForm.addEventListener('submit', e => this.onCheckIn(e));
      const sessForm = $('sessForm');
      if (sessForm) sessForm.addEventListener('submit', e => this.onCreateSession(e));
      $('mpInviteCopy').addEventListener('click', () => this.copyInvite());
      $('mpEditProfile').addEventListener('click', () => this.openProfileForm(false));
      $('pfCancel').addEventListener('click', () => {
        this.closeProfileEdit();
        this.showDash();
        this.loadDashboard();
      });
      $('pfOut').addEventListener('click', () => this.signOut());
      $('mpProfileForm').addEventListener('submit', e => this.onSaveProfile(e));
      $('pfStudy').addEventListener('change', () => this.syncProfileForm());
      $('pfResType').addEventListener('change', () => this.syncProfileForm());

      if (!window.supabase || !SUPABASE_READY) {
        this.showSetupBanner();
        return;
      }

      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

      this.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
          this.hasSession = true;
          this.setMemberMode(true);
          this.showDash();
          this.loadDashboard();
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          this.hasSession = false;
          this.setMemberMode(false);
          this.showAuth();
        } else if (event === 'PASSWORD_RECOVERY') {
          this.hasSession = true;
          this.setMemberMode(true);
          this.showReset();
        }
      });

      this.initIdleTimeout();
    }

    /* ---------- Auto sign-out after 10 min of inactivity ---------- */

    initIdleTimeout() {
      const IDLE_MS = 10 * 60 * 1000;
      const bump = () => { this.lastActive = Date.now(); };
      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(ev =>
        window.addEventListener(ev, bump, { passive: true })
      );
      this.lastActive = Date.now();
      this.hasSession = false;
      setInterval(() => {
        if (!this.supabase || !this.hasSession) return;
        if (Date.now() - this.lastActive > IDLE_MS) {
          this.hasSession = false;
          const msg = $('siMsg');
          if (msg) {
            msg.className = 'mp-msg';
            msg.textContent = this.pickLang(
              'Signed out automatically after 10 minutes of inactivity.',
              'Kutoka kiotomatiki baada ya dakika 10 bila shughuli.'
            );
          }
          this.supabase.auth.signOut();
        }
      }, 30000);
    }
  }

  const portal = new MemberPortal();
  window.MemberPortal = MemberPortal;
  window.portal = portal;
  portal.init();
})();
