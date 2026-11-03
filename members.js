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
      this.activeSection = 'announcements';
    }

    /* ---------- View switching ---------- */

    showSetupBanner() {
      const banner = $('setupBanner');
      if (banner) banner.hidden = false;
      ['signinForm', 'signupForm'].forEach(id => { if ($(id)) $(id).hidden = true; });
    }

    showAuth() {
      this.closeMobileSidebar();
      $('dashView').hidden = true;
      $('resetView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = true;
      $('authView').hidden = false;
      if (window.MaranathaUserMenu) {
        window.MaranathaUserMenu.setLoggedOut();
      } else {
        const globMenu = $('globalUserMenu');
        if (globMenu) globMenu.style.display = 'inline-flex';
        const initialsEl = $('mpAvatarInitials');
        const imgEl = $('mpAvatarImg');
        if (imgEl) {
          imgEl.removeAttribute('src');
          imgEl.style.display = 'none';
        }
        if (initialsEl) {
          initialsEl.innerHTML = '<svg class="mp-avatar-person-icon" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="9" r="3.6" fill="currentColor"/><path d="M5.2 19.33C6.5 16.1 9 14.4 12 14.4s5.5 1.7 6.8 4.93A10 10 0 0 1 5.2 19.33z" fill="currentColor"/></svg>';
          initialsEl.style.display = 'flex';
        }
        const profBtn = $('mpMenuProfile');
        const dd = $('mpUserDropdown');
        const hr = dd ? dd.querySelector('hr') : null;
        if (profBtn) profBtn.style.display = 'none';
        if (hr) hr.style.display = 'none';
        const outBtn = $('mpMenuLogout');
        if (outBtn) outBtn.textContent = 'Log in';
      }
    }

    openSignInView(promptMsg) {
      this.setMemberMode(false);
      this.showAuth();
      this.switchTab('signin');
      const msg = $('siMsg');
      if (msg && promptMsg) {
        msg.className = 'mp-msg';
        msg.textContent = promptMsg;
      }
      const portalEl = $('portal') || $('authView');
      if (portalEl) {
        portalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setTimeout(() => {
        const emailEl = $('siEmail');
        if (emailEl) emailEl.focus({ preventScroll: true });
      }, 250);
    }

    showDash() {
      $('resetView').hidden = true;
      $('authView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = true;
      $('dashView').hidden = false;
      this.syncHeaderHeight();
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

    /* ---------- Sidebar navigation & layout helpers ---------- */

    syncHeaderHeight() {
      const nav = document.querySelector('nav');
      const tb = document.querySelector('.tb');
      const navH = (nav && nav.offsetHeight) || 0;
      const tbH = (tb && tb.offsetHeight) || 0;
      const total = (navH + tbH) || 88;
      document.documentElement.style.setProperty('--mp-header-h', total + 'px');
    }

    toggleMobileSidebar(forceOpen) {
      const sidebar = $('mpSidebar');
      const backdrop = $('mpSidebarBackdrop');
      const toggleBtn = $('mpSidebarToggle');
      if (!sidebar) return;
      const open = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('open');
      sidebar.classList.toggle('open', open);
      if (backdrop) backdrop.hidden = !open;
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    closeMobileSidebar() {
      this.toggleMobileSidebar(false);
    }

    switchDashboardSection(sectionId) {
      const role = this.profile ? this.profile.role : 'member';
      const isLeader = role === 'leader' || role === 'section_leader' || role === 'admin';
      const isAdmin = role === 'admin';

      let target = sectionId || 'announcements';
      if (target === 'leader-resources' && !isLeader) target = 'announcements';
      if (target === 'admin-resources' && !isAdmin) target = 'announcements';
      this.activeSection = target;

      let activeLabel = '';
      document.querySelectorAll('#mpSidebarNav .mp-side-link').forEach(btn => {
        const isMatch = btn.dataset.section === target;
        btn.classList.toggle('active', isMatch);
        if (isMatch) {
          btn.setAttribute('aria-current', 'page');
          const span = btn.querySelector('span');
          activeLabel = span ? span.textContent.trim() : btn.textContent.trim();
        } else {
          btn.removeAttribute('aria-current');
        }
      });

      document.querySelectorAll('#mpMainContent .mp-dash-panel').forEach(panel => {
        const isMatch = panel.dataset.panel === target;
        panel.hidden = !isMatch;
        panel.classList.toggle('active', isMatch);
      });

      const mobLabel = $('mpMobileActiveLabel');
      if (mobLabel && activeLabel) {
        mobLabel.textContent = activeLabel;
      }

      this.closeMobileSidebar();

      if (window.scrollY > 120) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    /* ---------- Hide public page content once signed in ---------- */

    setMemberMode(on) {
      document.body.classList.toggle('member-mode', !!on);
      document.querySelectorAll('.phead, .hero.ph, .msw, footer, #mpIntro').forEach(el => {
        el.style.display = on ? 'none' : '';
      });
      this.syncHeaderHeight();
      if (on) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const passwordConf = $('suPassConf').value;

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
      if (password !== passwordConf) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Passwords do not match.';
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
        $('suName').value = '';
        $('suEmail').value = '';
        $('suPass').value = '';
        $('suPassConf').value = '';
        return;
      }
      
      // Clear the signup form fields so they aren't visible if the user navigates back
      $('suName').value = '';
      $('suEmail').value = '';
      $('suPass').value = '';
      $('suPassConf').value = '';

      msg.className = 'mp-msg ok';
      msg.textContent = 'Account created \u2014 welcome! You can now sign in.';
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
      this.hasSession = false;
      this.activeSection = 'announcements';
      if (window.MaranathaUserMenu) window.MaranathaUserMenu.setLoggedOut();
      if (window.MaranathaNotifier && typeof window.MaranathaNotifier.onMemberSignedOut === 'function') {
        window.MaranathaNotifier.onMemberSignedOut();
      }
      this.setMemberMode(false);
      this.showAuth();
      if (this.supabase) {
        try { await this.supabase.auth.signOut(); } catch (e) { /* ignore */ }
      }
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

    openProfileView() {
      if (!this.hasSession || !this.profile) {
        this.openSignInView('Please sign in to view your profile.');
        return;
      }
      if (!this.profileComplete(this.profile)) {
        this.openProfileForm(true);
        return;
      }
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('resetView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = false;
      if ($('pfSummaryView')) $('pfSummaryView').hidden = false;
      if ($('pfEditWrap')) $('pfEditWrap').hidden = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setProfileStep(step) {
      this.profileStep = step;
      [1, 2, 3].forEach(n => {
        const cat = $('pfCat' + n);
        if (cat) cat.hidden = (n !== step);
        const st = $('pfStep' + n);
        if (st) {
          st.classList.toggle('active', n === step);
          st.classList.toggle('done', n < step);
        }
      });
      const msg = $('pfMsg');
      if (msg) {
        msg.className = 'mp-msg';
        msg.textContent = '';
      }
    }

    validateProfileStep(step) {
      const msg = $('pfMsg');
      const fail = text => {
        if (msg) {
          msg.className = 'mp-msg err';
          msg.textContent = text;
        }
        return false;
      };
      if (step === 1) {
        const name = $('pfName').value.trim();
        if (!name) {
          $('pfName').focus();
          return fail('Enter your full name.');
        }
        if (this._mandatoryProfile) {
          if (!$('pfDob').value) {
            $('pfDob').focus();
            return fail('Enter your date of birth.');
          }
          if (!$('pfPhone').value.trim()) {
            $('pfPhone').focus();
            return fail('Enter your phone number.');
          }
        }
        return true;
      }
      if (step === 2) {
        const study = $('pfStudy').value;
        if (this._mandatoryProfile && !study) {
          $('pfStudy').focus();
          return fail('Choose your study status.');
        }
        if (study === 'studying') {
          if (!$('pfCourse').value.trim()) {
            $('pfCourse').focus();
            return fail('Enter the course you are studying.');
          }
          if (!$('pfUni').value) {
            $('pfUni').focus();
            return fail('Choose your university.');
          }
          if (!(parseInt($('pfExpGrad').value, 10) || null)) {
            $('pfExpGrad').focus();
            return fail('Enter your expected year of graduation.');
          }
        } else if (study === 'alumni') {
          if (!(parseInt($('pfGradYear').value, 10) || null)) {
            $('pfGradYear').focus();
            return fail('Enter your year of graduation.');
          }
        }
        return true;
      }
      return true;
    }

    openProfileForm(mandatory) {
      this._mandatoryProfile = !!mandatory;
      $('authView').hidden = true;
      $('dashView').hidden = true;
      $('resetView').hidden = true;
      $('pendingView').hidden = true;
      $('profileView').hidden = false;
      if ($('pfSummaryView')) $('pfSummaryView').hidden = true;
      if ($('pfEditWrap')) $('pfEditWrap').hidden = false;
      $('pfTitle').textContent = mandatory ? 'Complete your profile' : 'Edit your profile';
      $('pfSub').textContent = mandatory
        ? 'Please fill in these details first \u2014 they help the leaders organise groups and celebrations.'
        : 'Update your details at any time.';
      $('pfCancel').hidden = !!mandatory;
      this.openProfileEdit();
    }

    openProfileEdit() {
      const p = this.profile || {};
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
      this.setProfileStep(1);
      
      this.avatarBlob = null;
      this.avatarDelete = false;
      const avPrev = $('pfAvatarPreview');
      const avDelBtn = $('pfAvatarDelete');
      if (avPrev && avDelBtn) {
        if (this.profile && this.profile.avatar_url) {
          avPrev.src = this.profile.avatar_url;
          avPrev.style.display = 'block';
          avDelBtn.style.display = 'inline-block';
        } else {
          avPrev.src = '';
          avPrev.style.display = 'none';
          avDelBtn.style.display = 'none';
        }
      }
      if ($('pfAvatar')) $('pfAvatar').value = '';

      $('mpProfileForm').hidden = false;
      $('pfName').focus();
    }

    syncProfileForm() {
      $('pfStudying').hidden = $('pfStudy').value !== 'studying';
      $('pfAlumni').hidden = $('pfStudy').value !== 'alumni';
      $('pfResCampus').hidden = $('pfResType').value !== 'campus';
      $('pfResOff').hidden = $('pfResType').value !== 'off_campus';
    }

    closeProfileEdit() {
      if ($('pfEditWrap')) $('pfEditWrap').hidden = true;
    }

    async onSaveProfile(e) {
      e.preventDefault();
      if (this.profileStep === 1) {
        if (this.validateProfileStep(1)) this.setProfileStep(2);
        return;
      }
      if (this.profileStep === 2) {
        if (this.validateProfileStep(2)) this.setProfileStep(3);
        return;
      }
      if (!this.validateProfileStep(1)) {
        this.setProfileStep(1);
        this.validateProfileStep(1);
        return;
      }
      if (!this.validateProfileStep(2)) {
        this.setProfileStep(2);
        this.validateProfileStep(2);
        return;
      }

      const msg = $('pfMsg');
      const name = $('pfName').value.trim();
      const study = $('pfStudy').value;
      const resType = $('pfResType').value;

      let course = '', university = '', expectedGrad = null, gradYear = null;
      if (study === 'studying') {
        course = $('pfCourse').value.trim();
        university = $('pfUni').value;
        expectedGrad = parseInt($('pfExpGrad').value, 10) || null;
      } else if (study === 'alumni') {
        gradYear = parseInt($('pfGradYear').value, 10) || null;
      }

      if (this._mandatoryProfile && !resType) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Choose your place of residence.';
        $('pfResType').focus();
        return;
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

      const { data: userData } = await this.supabase.auth.getUser();
      const user = userData && userData.user;
      if (!user) {
        msg.className = 'mp-msg err';
        msg.textContent = 'User not found. Please sign in again.';
        return;
      }

      msg.className = 'mp-msg';
      msg.textContent = 'Saving\u2026';
      let avatarUrl = this.profile ? this.profile.avatar_url : '';
      if (this.avatarDelete && avatarUrl) {
        try {
          const oldPath = avatarUrl.split('/').pop();
          await this.supabase.storage.from('avatars').remove([user.id + '/' + oldPath]);
        } catch(e) {}
        avatarUrl = '';
      }

      if (this.avatarBlob) {
        const path = user.id + '/' + Date.now() + '_avatar.jpg';
        const { error: avErr } = await this.supabase.storage.from('avatars').upload(path, this.avatarBlob, { upsert: true, contentType: 'image/jpeg' });
        if (avErr) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Failed to upload profile picture: ' + avErr.message;
          return;
        }
        const { data: pubUrlData } = this.supabase.storage.from('avatars').getPublicUrl(path);
        if (pubUrlData && pubUrlData.publicUrl) {
          avatarUrl = pubUrlData.publicUrl;
        }
      }

      const patch = {
        id: user.id,
        email: user.email,
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
      if (this.avatarDelete || this.avatarBlob) {
        patch.avatar_url = avatarUrl;
      } else if (avatarUrl) {
        patch.avatar_url = avatarUrl;
      }

      if (window.MaranathaUserMenu) {
        window.MaranathaUserMenu.render({
          full_name: name,
          avatar_url: patch.avatar_url || '',
          email: user.email || ''
        });
      }

      const res = await this.authCall(
        () => this.supabase.from('profiles').upsert(patch),
        msg
      );
      if (res.failed) return;
      if (res.error) {
        msg.className = 'mp-msg err';
        msg.textContent = res.error.message;
        return;
      }
      this.profile = Object.assign({}, this.profile, patch);
      const wasMandatory = !!this._mandatoryProfile;
      this._mandatoryProfile = false;
      this.closeProfileEdit();
      if (this.profileComplete(this.profile)) {
        await this.loadDashboard();
        if (!wasMandatory) {
          this.openProfileView();
        } else {
          this.showDash();
        }
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

      if (window.MaranathaNotifier && typeof window.MaranathaNotifier.onMemberAuthenticated === 'function') {
        window.MaranathaNotifier.onMemberAuthenticated(this.profile);
      }

      const viewParams = new URLSearchParams(window.location.search);
      const targetSection = viewParams.get('section');
      if (targetSection) {
        viewParams.delete('section');
        const qs = viewParams.toString();
        history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
        this.switchDashboardSection(targetSection);
      }
      if (viewParams.get('view') === 'profile') {
        viewParams.delete('view');
        const qs = viewParams.toString();
        history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
        this.openProfileView();
      }
    }

    /* ---------- Attendance: member check-in ---------- */

    async handleUrlCheckIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (!code) return;
      params.delete('code');
      const qs = params.toString();
      history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
      this.activeSection = 'attendance';
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
      const attended = list.filter(r => r.status === 'present' || r.status === 'late').length;
      const pct = Math.round(100 * attended / list.length);
      const sum = document.createElement('div');
      sum.className = 'att-counts';
      sum.textContent = 'You attended ' + attended + ' of your last ' + list.length +
        ' sessions (' + pct + '%).';
      box.appendChild(sum);
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
        p.innerHTML = it.body || '';
      card.appendChild(p);
      if (it.date) {
        const d = document.createElement('div');
        d.className = 'mp-date';
        d.textContent = it.date;
        card.appendChild(d);
      }
      if (this.profile && this.profile.role === 'admin') {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'mp-btn small danger';
        del.style.marginTop = '12px';
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

      if ($('mpGreet')) $('mpGreet').textContent = 'Habari, ' + this.profile.full_name;
      if ($('mpSub')) {
        $('mpSub').textContent =
          (this.profile.title ? this.profile.title + ' \u00b7 ' : '') +
          'Signed in as ' + MemberPortal.roleLabel(this.profile.role);
      }
      if ($('mpSidebarUser')) {
        $('mpSidebarUser').textContent = this.profile.full_name || 'Member';
      }
      if ($('mpSidebarRole')) {
        $('mpSidebarRole').textContent =
          (this.profile.title ? this.profile.title + ' \u00b7 ' : '') +
          MemberPortal.roleLabel(this.profile.role);
      }
      if ($('mpSideLeader')) $('mpSideLeader').hidden = !isLeader;
      if ($('mpSideAdmin')) $('mpSideAdmin').hidden = !isAdmin;

      if (window.MaranathaUserMenu) {
        window.MaranathaUserMenu.render(this.profile, true);
      } else {
        const avatarBtnInitials = $('mpAvatarInitials');
        const avatarBtnImg = $('mpAvatarImg');
        if (this.profile.avatar_url) {
          if (avatarBtnImg) {
            avatarBtnImg.src = this.profile.avatar_url;
            avatarBtnImg.style.display = 'block';
          }
          if (avatarBtnInitials) avatarBtnInitials.style.display = 'none';
        } else {
          if (avatarBtnImg) avatarBtnImg.style.display = 'none';
          if (avatarBtnInitials) {
            avatarBtnInitials.style.display = 'flex';
            avatarBtnInitials.textContent = (this.profile.full_name || '?')
              .split(/\s+/).filter(Boolean).slice(0, 2)
              .map(w => w[0].toUpperCase()).join('') || '?';
          }
        }
        const profBtn = $('mpMenuProfile');
        const dd = $('mpUserDropdown');
        const hr = dd ? dd.querySelector('hr') : null;
        if (profBtn) profBtn.style.display = '';
        if (hr) hr.style.display = '';
        const outBtn = $('mpMenuLogout');
        if (outBtn) outBtn.textContent = 'Log out';
        const globMenu = $('globalUserMenu');
        if (globMenu) globMenu.style.display = 'inline-block';
      }

      $('mpLeaderCard').hidden = !isLeader;
      $('mpLeaderWork').hidden = !isLeader;
      $('mpAdminCard').hidden = !isAdmin;
      $('mpNavAdmin').hidden = !isAdmin;
      $('mpSessCard').hidden = !isLeader;
      $('mpPostCard').hidden = !isLeader;

      this.switchDashboardSection(this.activeSection || 'announcements');

      if ($('mpProfile')) {
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
          ['Member since', this.profile.created_at ? new Date(this.profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014']
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
      }

      this.renderList($('mpMemberInfo'),
        this.resources.filter(r => r.audience === 'member'),
        'Nothing here yet \u2014 the leaders will add member resources soon.');
      if (!isLeader && $('mpLeaderInfo')) {
        $('mpLeaderInfo').innerHTML = '';
      }
      this.renderList($('mpAdminInfo'),
        this.resources.filter(r => r.audience === 'admin'),
        'Nothing here yet \u2014 admin tools will be added soon.');

      if (isLeader) this.renderLeaderWorkspace();

      $('mpAttendCard').hidden = false;
      this.loadMyAttendance();

      $('mpLibCard').hidden = false;
      this.loadLibrary();

      $('mpDirCard').hidden = false;
      this.loadDirectory();

      if (isLeader) {
        const form = $('adminResourceForm');
        if (form) {
          form.style.display = '';
          const aud = $('arAudience');
          if (aud) {
            if (!isAdmin) {
              const myWs = MemberPortal.workspaceForProfile(this.profile);
              const myRoleVal = myWs && myWs.roleKey ? 'leader:' + myWs.roleKey : 'leader';
              Array.from(aud.options).forEach(opt => {
                const allowed = opt.value === 'leader' || opt.value === myRoleVal;
                opt.disabled = !allowed;
                opt.hidden = !allowed;
              });
              aud.value = myRoleVal;
              aud.disabled = false;
            } else {
              Array.from(aud.options).forEach(opt => {
                opt.disabled = false;
                opt.hidden = false;
              });
              aud.disabled = false;
            }
          }
        }

        $('mpSessCard').hidden = false;
        this.initLeaderSessions();
        $('mpPostCard').hidden = false;
        this.loadMyPosts();
      }

      if (isAdmin) {
        this.subscribeAdminRealtime();
        this.checkAdminNotifications().then(() => {
          this.loadAdminMembers();
          this.loadAdminInbox();
          this.loadAdminPending();
          this.loadAdminResidence();
          this.loadAdminVoice();
          this.loadAdminBirthdays();
        });
      }
    }

    /* ---------- Events + RSVP ---------- */

    makeEventCard(ev, mine) {
      const card = document.createElement('div');
      card.className = 'mp-item';
      const h = document.createElement('h3');
      h.textContent = ev._isScheduleEvent
        ? (ev.title || 'Choir Event')
        : (this.pickLang(ev.title_en, ev.title_sw) || ev.title || 'Untitled');
      card.appendChild(h);
      const d = document.createElement('div');
      d.className = 'mp-date';
      if (ev._isScheduleEvent) {
        const dtLabel = ev.date
          ? new Date(ev.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        const venue = (ev.place || ev.location || '').trim();
        d.textContent = [dtLabel, (ev.time || '').trim(), venue].filter(Boolean).join(' \u00b7 ');
      } else {
        const venue = (ev.location || ev.place || '').trim();
        d.textContent = this.fmtWhen(ev.start_time) + (venue ? ' \u00b7 ' + venue : '');
      }
      card.appendChild(d);
      if (ev.is_mandatory) {
        const m = document.createElement('div');
        m.className = 'mp-badge leader';
        m.textContent = I18n.t('portal.rsvp.mandatory');
        card.appendChild(m);
      } else if (ev.tag || ev.event_type) {
        const m = document.createElement('div');
        m.className = 'mp-badge member';
        m.textContent = ev.tag || MemberPortal.optLabel(ev.event_type);
        card.appendChild(m);
      }
      const desc = ev._isScheduleEvent
        ? (ev.notes || '')
        : this.pickLang(ev.description_en, ev.description_sw);
      if (desc) {
        const p = document.createElement('p');
        p.textContent = desc;
        card.appendChild(p);
      }
      if (!ev._isScheduleEvent && ev.id) {
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
      } else if (window.MaranathaEvents && typeof window.MaranathaEvents.buildCal === 'function') {
        const calUrl = window.MaranathaEvents.buildCal(ev);
        if (calUrl) {
          const rw = document.createElement('div');
          rw.className = 'mp-rsvp';
          const calLink = document.createElement('a');
          calLink.className = 'mp-btn small';
          calLink.href = calUrl;
          calLink.target = '_blank';
          calLink.rel = 'noopener';
          calLink.textContent = 'Add to Calendar';
          rw.appendChild(calLink);
          card.appendChild(rw);
        }
      }
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: evs, error } = await this.supabase
        .from('events')
        .select('*')
        .gte('start_time', today.toISOString())
        .order('start_time', { ascending: true })
        .limit(15);
      if (error) console.warn('events:', error);

      const { data: rsvps } = await this.supabase
        .from('event_rsvps').select('event_id, status');
      const mine = {};
      (rsvps || []).forEach(r => { mine[r.event_id] = r.status; });

      // Consolidate database events + public schedule events so Upcoming Events & Member Directory show all upcoming events
      const dbEvents = (evs || [])
        .filter(ev => {
          if (!ev || !ev.start_time) return false;
          const dt = new Date(ev.start_time);
          return !isNaN(dt) && dt >= today;
        })
        .map(ev => {
          const dt = new Date(ev.start_time);
          const pad = n => String(n).padStart(2, '0');
          return {
            ...ev,
            location: (ev.location || ev.place || '').trim(),
            _sortDate: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
            _isScheduleEvent: false
          };
        });
      const seenKeys = new Set(
        dbEvents.map(ev => `${ev._sortDate}::${(ev.title_en || ev.title_sw || '').trim().toLowerCase()}`)
      );

      let scheduleEvents = [];
      if (window.MaranathaEvents && typeof window.MaranathaEvents.getUpcoming === 'function') {
        scheduleEvents = window.MaranathaEvents.getUpcoming();
      }
      if (!scheduleEvents.length) {
        try {
          const resp = await fetch('content.json', { cache: 'no-cache' });
          if (resp.ok) {
            const json = await resp.json();
            if (json && Array.isArray(json.events)) {
              scheduleEvents = json.events.filter(ev => {
                if (!ev || !ev.date) return false;
                const d = new Date(ev.date + 'T00:00:00');
                return !isNaN(d) && d >= today;
              });
            }
          }
        } catch (e) { /* ignore */ }
      }

      const merged = dbEvents.slice();
      scheduleEvents.forEach(sev => {
        if (!sev || !sev.date) return;
        const dateStr = String(sev.date).slice(0, 10);
        const parts = dateStr.split('-');
        if (parts.length !== 3) return;
        const evDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        if (isNaN(evDate) || evDate < today) return;

        const key = `${dateStr}::${(sev.title || '').trim().toLowerCase()}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        const venue = (sev.place || sev.location || '').trim();
        merged.push({
          ...sev,
          place: venue,
          location: venue,
          _sortDate: dateStr,
          _isScheduleEvent: true
        });
      });

      merged.sort((a, b) => (a._sortDate || '').localeCompare(b._sortDate || ''));
      const upcomingList = merged.slice(0, 12);

      const nextBox = $('mpNextEvent');
      const listBox = $('mpEvents');
      const dirEvBox = $('dirEventsList');
      if (nextBox) nextBox.innerHTML = '';
      if (listBox) listBox.innerHTML = '';
      if (dirEvBox) dirEvBox.innerHTML = '';

      if (!upcomingList.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = I18n.t('portal.noevents');
        if (nextBox) nextBox.appendChild(e.cloneNode(true));
        if (listBox) listBox.appendChild(e.cloneNode(true));
        if (dirEvBox) dirEvBox.appendChild(e);
        return;
      }

      if (nextBox) nextBox.appendChild(this.makeEventCard(upcomingList[0], mine[upcomingList[0].id]));
      if (listBox) {
        upcomingList.forEach(ev => listBox.appendChild(this.makeEventCard(ev, mine[ev.id])));
      }
      if (dirEvBox) {
        upcomingList.forEach(ev => dirEvBox.appendChild(this.makeEventCard(ev, mine[ev.id])));
      }
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

    /* ---------- Role-specific leader workspaces (Katiba Ibara ya 11 - 16 & 23 - 26) ---------- */

    static optLabel(v) {
      if (!v) return '';
      const s = String(v);
      return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
    }

    static fmtTzs(n) {
      const num = Number(n) || 0;
      return 'TZS ' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    static CURRENCY_FIELDS = new Set([
      'amount', 'contribution_amount', 'expense_amount',
      'total_income', 'total_expenses', 'balance_brought_forward',
      'balance_carried_forward', 'asset_value', 'budget_allocated', 'budget_spent'
    ]);

    static FILE_FIELDS = new Set([
      'file_url', 'document_file_url', 'report_file_url',
      'invoice_receipt_url', 'appointment_letter_url', 'media_file_url'
    ]);

    static KATIBA_DOC_URL = 'assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf';

    static ROLE_POSITIONS = [
      { key: 'chairperson', title: 'Mwenyekiti wa Kwaya (Chairperson)', label: 'Mwenyekiti wa Kwaya \u2014 Chairperson (Ibara ya 11)' },
      { key: 'choirmaster', title: 'Mwalimu wa Kwaya (Choir Master)', label: 'Mwalimu wa Kwaya \u2014 Choir Master (Ibara ya 12)' },
      { key: 'secretary', title: 'Katibu wa Kwaya (Secretary)', label: 'Katibu wa Kwaya \u2014 Secretary (Ibara ya 13)' },
      { key: 'asst_secretary', title: 'Katibu Msaidizi (Assistant Secretary)', label: 'Katibu Msaidizi \u2014 Asst. Secretary (Ibara ya 14)' },
      { key: 'treasurer', title: 'Mtunza Hazina (Treasurer)', label: 'Mtunza Hazina \u2014 Treasurer (Ibara ya 15)' },
      { key: 'nidhamu', title: 'Kamati ya Nidhamu (Disciplinary)', label: 'Kamati ya Nidhamu \u2014 Disciplinary (Ibara ya 16.1)' },
      { key: 'liturujia', title: 'Kamati ya Liturujia (Liturgy)', label: 'Kamati ya Liturujia \u2014 Liturgy (Ibara ya 16.2)' },
      { key: 'media', title: 'Kamati ya Media (Media & Comms)', label: 'Kamati ya Media \u2014 Media & Comms (Ibara ya 16.3)' },
      { key: 'kijamii', title: 'Kamati ya Kijamii (Social Welfare)', label: 'Kamati ya Kijamii \u2014 Social Welfare (Ibara ya 16.4)' }
    ];

    static WORKSPACES = {
      chairperson: {
        roleKey: 'chairperson',
        table: 'chairperson_workspace',
        name: 'Mwenyekiti wa Kwaya (Chairperson)',
        shortName: 'Chairperson',
        ibara: 'Ibara ya 11',
        mandateSummary: 'Msemaji na kiongozi mkuu wa Kwaya ya Maranatha, mwenyekiti wa mikutano yote ya kwaya na Kamati Tendaji, na mmoja wa watia saini wa akaunti ya benki (Ibara ya 11 & 24.2).',
        duties: [
          'Kuitisha na kuongoza mikutano yote ya Kwaya na ya Kamati Tendaji (Ibara 11.2a).',
          'Kuwa msemaji mkuu wa Kwaya na mwakilishi kwenye vikao vya Parokia na Jumuiya (Ibara 11.2b).',
          'Kusimamia utekelezaji wa maazimio ya mikutano, Katiba, na nidhamu ya viongozi (Ibara 11.2c).',
          'Kuidhinisha miamala ya fedha na kuwa miongoni mwa watia saini wa akaunti ya Kwaya Mkombozi Bank (Ibara 11.2d & 24.2).',
          'Kuteua wajumbe wa kamati ndogo kwa kushirikiana na Kamati Tendaji (Ibara 16).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 11: Madaraka na Wajibu wa Mwenyekiti',
            body: 'Mwongozo rasmi wa kikatiba kuhusu uongozi wa vikao vya Kamati Tendaji, Mkutano Mkuu wa Kwaya, uwakilishi wa Parokia, na utiaji saini wa nyaraka na miamala ya benki.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 11'
          },
          {
            title: 'Mwongozo wa Uidhinishaji Fedha & Benki (Ibara ya 24)',
            body: 'Miamala yote ya utoaji fedha Mkombozi Bank inahitaji idhini ya Kamati Tendaji na saini za angalau viongozi wawili (2) kati ya Mwenyekiti, Katibu, Mtunza Hazina, na Mlezi wa Kiroho.',
            date: 'Katiba \u00b7 Ibara ya 24.2'
          }
        ],
        kpis: list => {
          const meetings = list.filter(r => r.record_type === 'meeting').length;
          const appts = list.filter(r => r.record_type === 'appointment').length;
          const docs = list.filter(r => r.record_type === 'document').length;
          return [
            { label: 'Executive & General Meetings', val: String(meetings), sub: 'Chaired & logged (Ibara 11.2a)' },
            { label: 'Committee Appointments', val: String(appts), sub: 'Kamati Ndogo (Ibara 16)' },
            { label: 'Official & Bank Authorizations', val: String(docs), sub: 'Signed directives & letters' },
            { label: 'Total Executive Records', val: String(list.length), sub: 'Active leadership term' }
          ];
        },
        types: {
          meeting: {
            label: 'Executive / General Meeting',
            title: r => 'Meeting: ' + (r.meeting_title || ''),
            fields: [
              { k: 'meeting_title', l: 'Meeting title', req: true },
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_type', l: 'Meeting type', t: 'select', opts: ['executive', 'general_assembly', 'sub_committee', 'other'] },
              { k: 'attendees', l: 'Attendees / Quorum summary' },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'minutes', l: 'Resolutions & key summary', t: 'textarea' },
              { k: 'action_items', l: 'Action items & directives', t: 'textarea' },
              { k: 'status', l: 'Status', t: 'select', opts: ['draft', 'submitted', 'approved', 'archived'] },
              { k: 'notes', l: 'Notes', t: 'textarea' }
            ]
          },
          appointment: {
            label: 'Sub-committee Appointment',
            title: r => 'Appointment: ' + (r.committee_name || '') + ' \u2014 ' + (r.appointee_name || ''),
            fields: [
              { k: 'committee_name', l: 'Committee (Kamati Ndogo)', t: 'select', opts: ['Nidhamu', 'Liturujia', 'Media', 'Masuala ya Kijamii', 'Muziki na Ufundi', 'Other'], req: true },
              { k: 'appointee_name', l: 'Appointee name', req: true },
              { k: 'appointment_date', l: 'Appointment date', t: 'date' },
              { k: 'appointment_letter_url', l: 'Appointment letter (File / URL)', file: true },
              { k: 'status', l: 'Status', t: 'select', opts: ['draft', 'submitted', 'approved', 'archived'] },
              { k: 'notes', l: 'Mandate & terms of reference', t: 'textarea' }
            ]
          },
          document: {
            label: 'Bank & Official Authorization',
            title: r => 'Authorization: ' + (r.document_title || ''),
            fields: [
              { k: 'document_title', l: 'Document / Authorization title', req: true },
              { k: 'document_type', l: 'Document type', t: 'select', opts: ['bank_signatory', 'official_letter', 'authorization', 'other'] },
              { k: 'document_date', l: 'Date signed', t: 'date' },
              { k: 'document_file_url', l: 'Signed document (File / URL)', file: true },
              { k: 'notes', l: 'Summary / Co-signatories', t: 'textarea' }
            ]
          }
        }
      },

      choirmaster: {
        roleKey: 'choirmaster',
        table: 'choirmaster_workspace',
        name: 'Mwalimu wa Kwaya (Choir Master)',
        shortName: 'Choir Master',
        ibara: 'Ibara ya 12',
        mandateSummary: 'Msimamizi mkuu wa uimbaji, ufundishaji wa nyimbo, ratiba za mazoezi, na ubora wa muziki wa Kwaya katika adhimisho la Misa na matukio yote (Ibara ya 12).',
        duties: [
          'Kufundisha na kuongoza nyimbo wakati wa mazoezi, Misa Takatifu, na shughuli zote za Kwaya (Ibara 12.2a).',
          'Kupanga ratiba ya mazoezi na kuchagua nyimbo zinazoendana na Kalenda ya Liturujia (Ibara 12.2b).',
          'Kuteua walimu wasaidizi na viongozi wa sauti (Soprano, Alto, Tenor, Bass) kwa kushirikiana na Kamati Tendaji (Ibara 12.2c).',
          'Kutunza maktaba ya nota na kumbukumbu za nyimbo za Kwaya (Ibara 12.2d).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 12: Wajibu wa Mwalimu wa Kwaya',
            body: 'Maelekezo ya kikatiba kuhusu ufundishaji wa sauti nne (SATB), uteuzi wa nyimbo za Liturujia, usimamizi wa walimu wasaidizi, na nidhamu ya mazoezi.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 12'
          },
          {
            title: 'Mwongozo wa Mazoezi na Maktaba ya Nota (SATB)',
            body: 'Tumia sehemu ya Song Library kupakia nota za PDF na sauti za mazoezi, na rekodi ratiba ya mazoezi na nyimbo zilizofundishwa kwenye mfumo huu.',
            date: 'Ufundi na Muziki'
          }
        ],
        kpis: list => {
          const rehearsals = list.filter(r => r.record_type === 'rehearsal');
          const songs = list.filter(r => r.record_type === 'repertoire');
          const readySongs = songs.filter(r => r.status_repertoire === 'performance_ready').length;
          const events = list.filter(r => r.record_type === 'event').length;
          return [
            { label: 'Rehearsals Logged', val: String(rehearsals.length), sub: 'Technical sessions recorded' },
            { label: 'Active Repertoire', val: String(songs.length), sub: readySongs + ' performance-ready' },
            { label: 'Liturgical / Ministry Plans', val: String(events), sub: 'Masses & concerts planned' },
            { label: 'Assistant Trainers', val: String(list.filter(r => r.record_type === 'assistant').length), sub: 'Appointed section trainers' }
          ];
        },
        types: {
          rehearsal: {
            label: 'Rehearsal Log',
            title: r => 'Rehearsal: ' + (r.pieces_practiced || r.rehearsal_date || ''),
            fields: [
              { k: 'rehearsal_date', l: 'Rehearsal date', t: 'date', req: true },
              { k: 'rehearsal_time', l: 'Time', t: 'time' },
              { k: 'venue', l: 'Venue' },
              { k: 'pieces_practiced', l: 'Songs / Pieces practiced', t: 'textarea', req: true },
              { k: 'focus_areas', l: 'Vocal / Technical focus areas', t: 'textarea' },
              { k: 'attendance_count', l: 'Attendance count', t: 'number' },
              { k: 'notes', l: 'Evaluation notes', t: 'textarea' }
            ]
          },
          repertoire: {
            label: 'Song Repertoire',
            title: r => 'Song: ' + (r.song_title || ''),
            fields: [
              { k: 'song_title', l: 'Song title', req: true },
              { k: 'composer', l: 'Composer' },
              { k: 'arrangement', l: 'Key / Arrangement (SATB)' },
              { k: 'difficulty', l: 'Difficulty', t: 'select', opts: ['easy', 'medium', 'hard'] },
              { k: 'status_repertoire', l: 'Mastery status', t: 'select', opts: ['learning', 'polishing', 'performance_ready', 'archived'] },
              { k: 'notes', l: 'Liturgical season / Notes', t: 'textarea' }
            ]
          },
          event: {
            label: 'Ministry & Mass Calendar',
            title: r => 'Ministry Event: ' + (r.event_title || ''),
            fields: [
              { k: 'event_title', l: 'Mass / Event title', req: true },
              { k: 'event_date', l: 'Event date', t: 'date', req: true },
              { k: 'event_type', l: 'Event type', t: 'select', opts: ['mass', 'concert', 'wedding', 'funeral', 'festival', 'rehearsal', 'other'] },
              { k: 'event_venue', l: 'Venue / Parish' },
              { k: 'preparation_notes', l: 'Setlist & liturgical preparation notes', t: 'textarea' }
            ]
          },
          assistant: {
            label: 'Assistant / Voice Trainer',
            title: r => 'Assistant: ' + (r.assistant_name || ''),
            fields: [
              { k: 'assistant_name', l: 'Assistant / Voice leader name', req: true },
              { k: 'assistant_role', l: 'Assigned voice part / Duty (e.g. Soprano Trainer)' },
              { k: 'appointment_date', l: 'Appointment date', t: 'date' },
              { k: 'notes', l: 'Responsibilities', t: 'textarea' }
            ]
          }
        }
      },

      secretary: {
        roleKey: 'secretary',
        table: 'secretary_workspace',
        name: 'Katibu wa Kwaya (Secretary)',
        shortName: 'Secretary',
        ibara: 'Ibara ya 13',
        mandateSummary: 'Mtendaji mkuu wa shughuli za kila siku za Kwaya, mtunzaji wa mihutasari ya vikao, nyaraka rasmi, barua, daftari la wanakwaya, na orodha ya mali za Kwaya (Ibara ya 13).',
        duties: [
          'Kuandaa dondoo (agenda) za mikutano kwa kushirikiana na Mwenyekiti na kuandika mihutasari ya vikao vyote (Ibara 13.2a-b).',
          'Kutunza nyaraka zote rasmi, barua zinazoingia na kutoka, na mihuri ya Kwaya (Ibara 13.2c).',
          'Kutunza daftari la orodha ya wanakwaya hai, walio katika ruhusa, na wahitimu (Ibara 13.2d).',
          'Kutunza na kuhakiki Daftari la Mali za Kwaya (Asset Register \u2014 ala za muziki, sare, na vifaa) (Ibara 13.2e).',
          'Kuwa mmoja wa watia saini wa akaunti ya Kwaya Mkombozi Bank (Ibara 24.2).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 13: Wajibu wa Katibu wa Kwaya',
            body: 'Mwongozo wa utunzaji wa nyaraka za kwaya, uandishi wa mihutasari ya Kamati Tendaji na Mkutano Mkuu, na usimamizi wa daftari la mali za kwaya.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 13'
          },
          {
            title: 'Kigezo cha Mhutasari wa Kikao na Daftari la Barua',
            body: 'Kila mhutasari ujumuishe: Tarehe, Mahali, Mahudhurio, Udhuru, Agenda, Yatokanayo, Maazimio, na Mpango Kazi. Pakia nakala ya PDF kwenye kichupo cha Document & Correspondence Manager au Meeting Minutes.',
            date: 'Mwongozo wa Katibu'
          }
        ],
        kpis: list => {
          const docs = list.filter(r => r.record_type === 'correspondence').length;
          const mins = list.filter(r => r.record_type === 'minutes').length;
          const assets = list.filter(r => r.record_type === 'asset');
          const assetVal = assets.reduce((acc, r) => acc + (Number(r.asset_value) || 0), 0);
          const members = list.filter(r => r.record_type === 'membership').length;
          return [
            { label: 'Official Documents & Letters', val: String(docs), sub: 'Incoming, outgoing & filings' },
            { label: 'Meeting Minutes Logged', val: String(mins), sub: 'Executive & General meetings' },
            { label: 'Choir Assets (' + assets.length + ' items)', val: MemberPortal.fmtTzs(assetVal), sub: 'Total registered asset value' },
            { label: 'Membership Registry Logs', val: String(members), sub: 'Status & leave records' }
          ];
        },
        types: {
          correspondence: {
            label: 'Document & Correspondence Manager',
            title: r => 'Document: ' + (r.subject || ''),
            fields: [
              { k: 'subject', l: 'Document title / Subject', req: true },
              { k: 'correspondence_type', l: 'Document category', t: 'select', opts: ['incoming', 'outgoing', 'internal'], req: true },
              { k: 'correspondence_date', l: 'Document date', t: 'date', req: true },
              { k: 'reference_number', l: 'Reference number (Kumb. Na.)' },
              { k: 'from_to', l: 'Sender / Recipient / Office' },
              { k: 'file_url', l: 'Official document (Upload PDF/File or URL)', file: true },
              { k: 'action_required', l: 'Action required / Follow-up' },
              { k: 'status', l: 'Status', t: 'select', opts: ['draft', 'final', 'distributed', 'archived'] },
              { k: 'notes', l: 'Document summary / Notes', t: 'textarea' }
            ]
          },
          minutes: {
            label: 'Meeting Minutes',
            title: r => 'Minutes: ' + MemberPortal.optLabel(r.meeting_type || 'Meeting') + ' \u00b7 ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_type', l: 'Meeting type', t: 'select', opts: ['executive', 'general', 'sub_committee', 'annual_general', 'other'], req: true },
              { k: 'attendees', l: 'Attendees summary / Quorum', t: 'textarea' },
              { k: 'apologies', l: 'Apologies (Udhuru)', t: 'textarea' },
              { k: 'matters_arising', l: 'Matters arising (Yatokanayo)', t: 'textarea' },
              { k: 'minutes_text', l: 'Proceedings & minutes summary', t: 'textarea', req: true },
              { k: 'decisions_made', l: 'Resolutions passed (Maazimio)', t: 'textarea' },
              { k: 'action_items', l: 'Action items & responsible persons', t: 'textarea' },
              { k: 'next_meeting_date', l: 'Next meeting date', t: 'date' },
              { k: 'file_url', l: 'Signed minutes PDF (Upload or URL)', file: true }
            ]
          },
          asset: {
            label: 'Choir Asset Register (Mali za Kwaya)',
            title: r => 'Asset: ' + (r.asset_name || ''),
            fields: [
              { k: 'asset_name', l: 'Asset / Equipment name', req: true },
              { k: 'asset_category', l: 'Category', t: 'select', opts: ['instruments', 'sound_equipment', 'vestments', 'furniture', 'documents', 'other'], req: true },
              { k: 'asset_condition', l: 'Condition', t: 'select', opts: ['excellent', 'good', 'fair', 'needs_repair', 'disposed'] },
              { k: 'asset_location', l: 'Storage location / Custodian' },
              { k: 'asset_value', l: 'Estimated value (TZS)', t: 'number' },
              { k: 'acquisition_date', l: 'Date acquired', t: 'date' },
              { k: 'notes', l: 'Serial number / Inspection remarks', t: 'textarea' }
            ]
          },
          membership: {
            label: 'Membership Status Log',
            title: r => 'Member: ' + (r.member_name || '') + (r.membership_status ? ' (' + MemberPortal.optLabel(r.membership_status) + ')' : ''),
            fields: [
              { k: 'member_name', l: 'Member full name', req: true },
              { k: 'member_role', l: 'Voice part / Role' },
              { k: 'membership_status', l: 'Status', t: 'select', opts: ['active', 'on_leave', 'resigned', 'suspended'], req: true },
              { k: 'membership_date', l: 'Effective date', t: 'date' },
              { k: 'notes', l: 'Reason / Official remarks', t: 'textarea' }
            ]
          }
        }
      },

      asst_secretary: {
        roleKey: 'asst_secretary',
        table: 'asst_secretary_workspace',
        name: 'Katibu Msaidizi (Assistant Secretary)',
        shortName: 'Asst. Secretary',
        ibara: 'Ibara ya 14',
        mandateSummary: 'Msaidizi mkuu wa Katibu wa Kwaya katika utunzaji wa kumbukumbu za vikao, maandalizi ya nyaraka, na usambazaji wa taarifa rasmi kwa wanakwaya (Ibara ya 14).',
        duties: [
          'Kumsaidia Katibu wa Kwaya katika majukumu yote ya utendaji na utunzaji wa nyaraka (Ibara 14.2a).',
          'Kukaimu nafasi na majukumu ya Katibu wa Kwaya anapokuwa hayupo (Ibara 14.2b).',
          'Kuratibu usambazaji wa matangazo, barua, na taarifa za vikao kwa wanakwaya (Ibara 14.2c).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 14: Wajibu wa Katibu Msaidizi',
            body: 'Maelekezo ya kikatiba kuhusu kumsaidia Katibu Mkuu, uandishi wa rasimu za mihutasari, na uratibu wa mawasiliano ya ndani ya kwaya.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 14'
          }
        ],
        kpis: list => {
          const support = list.filter(r => r.record_type === 'meeting_support').length;
          const backups = list.filter(r => r.record_type === 'backup_minutes').length;
          const comms = list.filter(r => r.record_type === 'communication').length;
          return [
            { label: 'Meeting Support Logs', val: String(support), sub: 'Prep & attendance logs' },
            { label: 'Backup Minutes Drafted', val: String(backups), sub: 'Deputized sessions' },
            { label: 'Communications Prepared', val: String(comms), sub: 'Notices & dispatches' },
            { label: 'Total Secretariat Records', val: String(list.length), sub: 'Active leadership term' }
          ];
        },
        types: {
          meeting_support: {
            label: 'Meeting Support & Prep',
            title: r => 'Support: ' + MemberPortal.optLabel(r.support_role || 'Task') + ' \u00b7 ' + (r.meeting_date || ''),
            fields: [
              { k: 'support_role', l: 'Support task', t: 'select', opts: ['minutes_draft', 'attendance', 'documents_prep', 'distribution', 'other'], req: true },
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_type', l: 'Meeting type', t: 'select', opts: ['executive', 'general', 'sub_committee', 'other'] },
              { k: 'draft_minutes', l: 'Draft minutes / Key notes', t: 'textarea' },
              { k: 'documents_prepared', l: 'Documents prepared', t: 'textarea' },
              { k: 'distribution_list', l: 'Distribution list / Channels', t: 'textarea' }
            ]
          },
          backup_minutes: {
            label: 'Deputized / Backup Minutes',
            title: r => 'Backup Minutes: ' + (r.backup_for_date || ''),
            fields: [
              { k: 'backup_for_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'backup_minutes', l: 'Full minutes text', t: 'textarea', req: true },
              { k: 'notes', l: 'Handover notes to Secretary', t: 'textarea' }
            ]
          },
          communication: {
            label: 'Member Communication & Notices',
            title: r => 'Notice (' + MemberPortal.optLabel(r.comm_type || 'notice') + '): ' + (r.comm_recipients || ''),
            fields: [
              { k: 'comm_type', l: 'Communication type', t: 'select', opts: ['letter', 'email', 'notice', 'announcement', 'other'], req: true },
              { k: 'comm_recipients', l: 'Target recipients (e.g. All Members, Kamati Tendaji)', req: true },
              { k: 'comm_draft', l: 'Message / Notice content', t: 'textarea', req: true },
              { k: 'comm_status', l: 'Dispatch status', t: 'select', opts: ['draft', 'ready_to_send', 'sent'] }
            ]
          }
        }
      },

      treasurer: {
        roleKey: 'treasurer',
        table: 'treasurer_workspace',
        name: 'Mtunza Hazina (Treasurer)',
        shortName: 'Treasurer',
        ibara: 'Ibara ya 15 & Ibara ya 23\u201326',
        mandateSummary: 'Msimamizi mkuu wa fedha, mapato, michango, matumizi, uhamisho wa fedha, na akaunti ya benki ya Kwaya (Mkombozi Bank), pamoja na uandaaji wa taarifa za fedha za kila muhula (Ibara ya 15 & 23\u201326).',
        duties: [
          'Kupokea na kutunza fedha zote za Kwaya (ada za wanakwaya, michango, sadaka za shukrani, na miradi) na kutoa stakabadhi (Ibara 15.2a & 23).',
          'Kupeleka fedha benki (Mkombozi Bank) na kurekodi miamala yote ya kuweka, kutoa, na kuhamisha fedha (Ibara 15.2b & 24).',
          'Kufanya malipo na matumizi yaliyoidhinishwa na Kamati Tendaji kwa kuzingatia bajeti ya Kwaya (Ibara 15.2c & 25).',
          'Kuandaa na kuwasilisha Taarifa ya Mapato na Matumizi ya Kwaya kwa kila muhula (Semester Financial Report) kwenye Mkutano Mkuu (Ibara 15.2d & 26).',
          'Kuwa mmoja wa watia saini wanne wa akaunti ya benki ya Kwaya (ambapo saini 2 kati ya 4 zinahitajika kwa kila muamala \u2014 Ibara 24.2).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 15 & Ibara ya 23\u201326: Usimamizi wa Fedha na Hazina',
            body: 'Mwongozo kamili wa vyanzo vya mapato ya kwaya (Ibara 23), utunzaji wa fedha Mkombozi Bank (Ibara 24), utaratibu wa idhini ya matumizi (Ibara 25), na taarifa za fedha za muhula (Ibara 26).<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 15 & 23\u201326'
          },
          {
            title: 'Kanuni za Akaunti ya Mkombozi Bank & Watia Saini (Ibara ya 24)',
            body: 'Akaunti ya Kwaya inatunzwa katika Benki ya Mkombozi. Watia saini ni wanne: (1) Mwenyekiti wa Kwaya, (2) Katibu wa Kwaya, (3) Mtunza Hazina, na (4) Mlezi wa Kiroho. Muamala wowote wa kutoa au kuhamisha fedha unahitaji saini za angalau wawili.',
            date: 'Udhibiti wa Fedha'
          }
        ],
        kpis: list => {
          const contribs = list.filter(r => r.record_type === 'contribution');
          const expenses = list.filter(r => r.record_type === 'expense');
          const txns = list.filter(r => r.record_type === 'transaction');
          const reports = list.filter(r => r.record_type === 'semester_report');

          const totalContrib = contribs.reduce((s, r) => s + (Number(r.contribution_amount) || 0), 0);
          const totalInterests = txns.filter(r => r.transaction_type === 'interest').reduce((s, r) => s + (Number(r.amount) || 0), 0);
          const totalExp = expenses.reduce((s, r) => s + (Number(r.expense_amount) || 0), 0);
          const totalFees = txns.filter(r => r.transaction_type === 'fee').reduce((s, r) => s + (Number(r.amount) || 0), 0);
          const totalDepositsTransfers = txns
            .filter(r => r.transaction_type === 'deposit' || r.transaction_type === 'transfer' || r.transaction_type === 'withdrawal')
            .reduce((s, r) => s + (Number(r.amount) || 0), 0);

          let incomeVal = totalContrib + totalInterests;
          let expVal = totalExp + totalFees;
          let netVal = incomeVal - expVal;

          if (incomeVal === 0 && expVal === 0 && reports.length > 0) {
            const latest = reports[0];
            incomeVal = Number(latest.total_income) || 0;
            expVal = Number(latest.total_expenses) || 0;
            netVal = latest.balance_carried_forward !== undefined && latest.balance_carried_forward !== null
              ? Number(latest.balance_carried_forward)
              : (Number(latest.balance_brought_forward) || 0) + incomeVal - expVal;
          }

          return [
            { label: 'Total Income & Funds', val: MemberPortal.fmtTzs(incomeVal), sub: contribs.length + ' contribution entries (Ibara 23)' },
            { label: 'Total Expenditure', val: MemberPortal.fmtTzs(expVal), sub: expenses.length + ' approved expenses (Ibara 25)' },
            { label: 'Bank & Fund Transfers', val: MemberPortal.fmtTzs(totalDepositsTransfers), sub: txns.length + ' Mkombozi Bank transactions' },
            { label: 'Net Treasury Balance', val: MemberPortal.fmtTzs(netVal), sub: reports.length + ' semester report(s) filed' }
          ];
        },
        types: {
          contribution: {
            label: 'Record Income & Funds',
            title: r => 'Income: ' + (r.contributor_name || '') + (r.contribution_amount ? ' \u2014 ' + MemberPortal.fmtTzs(r.contribution_amount) : ''),
            fields: [
              { k: 'contributor_name', l: 'Contributor / Fund source name', req: true },
              { k: 'contributor_type', l: 'Fund / Income category (Ibara 23)', t: 'select', opts: ['member', 'donor', 'fundraising', 'parish', 'other'], req: true },
              { k: 'contribution_amount', l: 'Amount received (TZS)', t: 'number', req: true },
              { k: 'contribution_date', l: 'Date received', t: 'date', req: true },
              { k: 'contribution_method', l: 'Payment channel', t: 'select', opts: ['cash', 'mobile_money', 'bank_transfer', 'cheque', 'other'], req: true },
              { k: 'receipt_number', l: 'Receipt / Control number (Stakabadhi Na.)' },
              { k: 'notes', l: 'Fund purpose (e.g. Ada ya Mwaka, Harambee, Sare)', t: 'textarea' }
            ]
          },
          transaction: {
            label: 'Bank & Fund Transfers',
            title: r => MemberPortal.optLabel(r.transaction_type || 'Transaction') + ': ' + (r.description || '') + (r.amount ? ' (' + MemberPortal.fmtTzs(r.amount) + ')' : ''),
            fields: [
              { k: 'transaction_date', l: 'Transaction date', t: 'date', req: true },
              { k: 'transaction_type', l: 'Operation type', t: 'select', opts: ['deposit', 'withdrawal', 'transfer', 'fee', 'interest'], req: true },
              { k: 'amount', l: 'Amount (TZS)', t: 'number', req: true },
              { k: 'description', l: 'Transfer / Transaction details (From \u2192 To)', req: true },
              { k: 'reference_number', l: 'Bank slip / Transfer reference No.' },
              { k: 'bank_statement_ref', l: 'Authorizing signatories (min 2 of 4 \u2014 Ibara 24.2)' },
              { k: 'notes', l: 'Reconciliation notes', t: 'textarea' }
            ]
          },
          expense: {
            label: 'Record Expenditure',
            title: r => 'Expense: ' + (r.expense_description || '') + (r.expense_amount ? ' \u2014 ' + MemberPortal.fmtTzs(r.expense_amount) : ''),
            fields: [
              { k: 'expense_description', l: 'Expenditure purpose / Item', req: true },
              { k: 'expense_category', l: 'Budget category', t: 'select', opts: ['instruments', 'vestments', 'transport', 'venue', 'meals', 'stationery', 'maintenance', 'utilities', 'honoraria', 'other'], req: true },
              { k: 'expense_amount', l: 'Amount paid (TZS)', t: 'number', req: true },
              { k: 'expense_date', l: 'Payment date', t: 'date', req: true },
              { k: 'payee', l: 'Paid to (Payee / Vendor)' },
              { k: 'approved_by', l: 'Approved by (Kamati Tendaji / Signatories)' },
              { k: 'invoice_receipt_url', l: 'Payment voucher / Receipt (Upload File or URL)', file: true },
              { k: 'notes', l: 'Additional voucher notes', t: 'textarea' }
            ]
          },
          semester_report: {
            label: 'Semester Financial Report',
            title: r => 'Financial Report: ' + (r.semester || ''),
            fields: [
              { k: 'semester', l: 'Semester / Financial period (e.g. Semester I 2025/2026)', req: true },
              { k: 'report_date', l: 'Report date', t: 'date', req: true },
              { k: 'balance_brought_forward', l: 'Opening balance B/F (TZS)', t: 'number' },
              { k: 'total_income', l: 'Total semester income (TZS)', t: 'number', req: true },
              { k: 'total_expenses', l: 'Total semester expenses (TZS)', t: 'number', req: true },
              { k: 'balance_carried_forward', l: 'Closing balance C/F (TZS)', t: 'number' },
              { k: 'report_file_url', l: 'Audited / Signed report PDF (Upload File or URL)', file: true },
              { k: 'notes', l: 'Executive summary & audit remarks', t: 'textarea' }
            ]
          }
        }
      },

      nidhamu: {
        roleKey: 'nidhamu',
        committee: 'nidhamu',
        table: 'subcommittee_workspace',
        name: 'Kamati ya Nidhamu (Disciplinary Committee)',
        shortName: 'Nidhamu',
        ibara: 'Ibara ya 16.1 & Ibara ya 29',
        mandateSummary: 'Kusimamia maadili, mahudhurio, utunzaji wa muda, sare za Kwaya, na kushughulikia masuala ya kinidhamu na usuluhishi kwa mujibu wa Katiba (Ibara ya 16.1 & 29).',
        duties: [
          'Kusimamia nidhamu na maadili ya wanakwaya wakati wa mazoezi, Misa, na safari za Kwaya (Ibara 16.1a).',
          'Kufuatilia mahudhurio ya wanakwaya kwa kushirikiana na viongozi wa sauti na Katibu (Ibara 16.1b).',
          'Kupokea na kujadili mashauri ya utovu wa nidhamu na kuwasilisha mapendekezo kwenye Kamati Tendaji (Ibara 16.1c & 29).',
          'Kukagua uvaaji sahihi wa sare za Kwaya katika matukio rasmi.'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 16.1 & 29: Kamati ya Nidhamu na Kanuni za Maadili',
            body: 'Mwongozo wa kikatiba wa kushughulikia masuala ya mahudhurio, maonyo, na taratibu za kinidhamu kwa haki na upendo wa Kikristo.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 16.1 & 29'
          }
        ],
        kpis: list => [
          { label: 'Disciplinary & Conduct Cases', val: String(list.filter(r => r.record_type === 'member_issue').length), sub: 'Logged & counselled' },
          { label: 'Committee Meetings', val: String(list.filter(r => r.record_type === 'meeting').length), sub: 'Nidhamu sessions' },
          { label: 'Inspections & Reports', val: String(list.filter(r => r.record_type === 'activity').length), sub: 'Attendance & uniform checks' }
        ],
        types: {
          member_issue: {
            label: 'Conduct & Attendance Case',
            title: r => 'Case (' + MemberPortal.optLabel(r.issue_type || 'conduct') + '): ' + (r.member_name || ''),
            fields: [
              { k: 'member_name', l: 'Member name', req: true },
              { k: 'issue_type', l: 'Case category', t: 'select', opts: ['attendance', 'conduct', 'uniform', 'conflict', 'other'], req: true },
              { k: 'issue_description', l: 'Case description & date', t: 'textarea', req: true },
              { k: 'resolution', l: 'Guidance / Resolution / Action taken', t: 'textarea' },
              { k: 'follow_up_date', l: 'Follow-up review date', t: 'date' },
              { k: 'status', l: 'Case status', t: 'select', opts: ['draft', 'submitted', 'approved', 'completed'] }
            ]
          },
          meeting: {
            label: 'Committee Meeting',
            title: r => 'Nidhamu Meeting: ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_venue', l: 'Venue' },
              { k: 'attendees', l: 'Committee members present', t: 'textarea' },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'decisions', l: 'Decisions & recommendations', t: 'textarea' },
              { k: 'next_meeting_date', l: 'Next meeting date', t: 'date' }
            ]
          },
          activity: {
            label: 'Inspection / Activity Report',
            title: r => 'Activity: ' + (r.activity_title || ''),
            fields: [
              { k: 'activity_title', l: 'Activity / Inspection title', req: true },
              { k: 'activity_date', l: 'Date', t: 'date', req: true },
              { k: 'activity_description', l: 'Summary of findings', t: 'textarea' },
              { k: 'recommendations', l: 'Recommendations to Kamati Tendaji', t: 'textarea' }
            ]
          }
        }
      },

      liturujia: {
        roleKey: 'liturujia',
        committee: 'liturujia',
        table: 'subcommittee_workspace',
        name: 'Kamati ya Liturujia (Liturgy & Spiritual Committee)',
        shortName: 'Liturujia',
        ibara: 'Ibara ya 16.2',
        mandateSummary: 'Kuratibu maisha ya kiroho ya wanakwaya, semina, mafungo, sala, na maandalizi ya adhimisho la Misa Takatifu kwa kushirikiana na Mwalimu wa Kwaya na Mlezi wa Kiroho (Ibara ya 16.2).',
        duties: [
          'Kuratibu ratiba za masomo ya Misa, zaburi, na nyimbo za Liturujia kwa kushirikiana na Mwalimu wa Kwaya (Ibara 16.2a).',
          'Kuandaa programu za kiroho kama mafungo (retreats), semina, rozari, na sala za wanakwaya (Ibara 16.2b).',
          'Kuhakikisha utaratibu wa kiliturujia wa Kanisa Katoliki unazingatiwa katika huduma zote za Kwaya (Ibara 16.2c).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 16.2: Kamati ya Liturujia na Malezi ya Kiroho',
            body: 'Mwongozo wa uratibu wa Misa Takatifu, masomo ya Dominika na Sikukuu, mafungo ya kiroho, na ushirikiano na Kamati ya Liturujia ya Parokia.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 16.2'
          }
        ],
        kpis: list => [
          { label: 'Liturgical Celebration Plans', val: String(list.filter(r => r.record_type === 'liturgy').length), sub: 'Sunday Masses & Feast days' },
          { label: 'Spiritual Retreats & Seminars', val: String(list.filter(r => r.record_type === 'activity').length), sub: 'Mafungo & prayer programs' },
          { label: 'Committee Meetings', val: String(list.filter(r => r.record_type === 'meeting').length), sub: 'Liturujia planning sessions' }
        ],
        types: {
          liturgy: {
            label: 'Mass & Liturgy Plan',
            title: r => 'Liturgy: ' + MemberPortal.optLabel(r.liturgy_type || 'Mass') + ' \u00b7 ' + (r.liturgy_date || ''),
            fields: [
              { k: 'liturgy_date', l: 'Celebration date', t: 'date', req: true },
              { k: 'liturgy_type', l: 'Celebration type', t: 'select', opts: ['sunday_mass', 'feast_day', 'wedding', 'funeral', 'special', 'other'], req: true },
              { k: 'readings', l: 'Liturgical readings & Readers assigned', t: 'textarea' },
              { k: 'songs_selected', l: 'Selected liturgical hymns (Mwanzo, Bwana Utuhurumie, Utukufu, Sadaka, Komunyo, Shukrani)', t: 'textarea', req: true },
              { k: 'special_notes', l: 'Vestment color / Liturgical notes', t: 'textarea' }
            ]
          },
          activity: {
            label: 'Retreat / Spiritual Program',
            title: r => 'Spiritual Program: ' + (r.activity_title || ''),
            fields: [
              { k: 'activity_title', l: 'Program title (e.g. Mafungo ya Kwaresima)', req: true },
              { k: 'activity_date', l: 'Date', t: 'date', req: true },
              { k: 'participants_count', l: 'Participants count', t: 'number' },
              { k: 'activity_description', l: 'Facilitator / Theme & schedule', t: 'textarea' },
              { k: 'outcome', l: 'Spiritual fruits & follow-up', t: 'textarea' }
            ]
          },
          meeting: {
            label: 'Committee Meeting',
            title: r => 'Liturujia Meeting: ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'meeting_venue', l: 'Venue' },
              { k: 'attendees', l: 'Attendees', t: 'textarea' },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'decisions', l: 'Resolutions', t: 'textarea' }
            ]
          }
        }
      },

      media: {
        roleKey: 'media',
        committee: 'media',
        table: 'subcommittee_workspace',
        name: 'Kamati ya Media na Habari (Media & Communications)',
        shortName: 'Media',
        ibara: 'Ibara ya 16.3',
        mandateSummary: 'Kusimamia habari, picha, video, rekodi za sauti, mitandao ya kijamii, na utangazaji wa kazi za uinjilishaji za Kwaya ya Maranatha (Ibara ya 16.3).',
        duties: [
          'Kurekodi na kuhifadhi picha, video, na sauti za matukio na huduma za Kwaya (Ibara 16.3a).',
          'Kusimamia kurasa rasmi za mitandao ya kijamii na tovuti ya Kwaya kwa maudhui yenye maadili ya Kikatoliki (Ibara 16.3b).',
          'Kuandaa matangazo ya kidijitali (posters) na kushirikiana na Katibu katika kuhabarisha umma (Ibara 16.3c).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 16.3: Kamati ya Media na Mawasiliano',
            body: 'Mwongozo wa usimamizi wa maudhui ya kidijitali, hifadhi ya picha na video za kwaya, na uinjilishaji kupitia mitandao ya kijamii.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 16.3'
          }
        ],
        kpis: list => [
          { label: 'Media Productions & Posts', val: String(list.filter(r => r.record_type === 'media').length), sub: 'Photos, videos & digital posts' },
          { label: 'Coverage & Campaigns', val: String(list.filter(r => r.record_type === 'activity').length), sub: 'Events covered' },
          { label: 'Committee Meetings', val: String(list.filter(r => r.record_type === 'meeting').length), sub: 'Editorial sessions' }
        ],
        types: {
          media: {
            label: 'Media Production & Post',
            title: r => 'Media (' + MemberPortal.optLabel(r.media_type || 'item') + '): ' + (r.media_title || ''),
            fields: [
              { k: 'media_title', l: 'Content / Production title', req: true },
              { k: 'media_type', l: 'Media format', t: 'select', opts: ['photo', 'video', 'audio', 'livestream', 'social_post', 'website_update', 'other'], req: true },
              { k: 'platform', l: 'Platform (YouTube, Instagram, Website, Archive)' },
              { k: 'publish_date', l: 'Publish / Event date', t: 'date', req: true },
              { k: 'media_file_url', l: 'Media asset / Link (Upload File or URL)', file: true },
              { k: 'media_description', l: 'Caption / Production notes', t: 'textarea' }
            ]
          },
          activity: {
            label: 'Event Coverage Report',
            title: r => 'Coverage: ' + (r.activity_title || ''),
            fields: [
              { k: 'activity_title', l: 'Event covered', req: true },
              { k: 'activity_date', l: 'Date', t: 'date', req: true },
              { k: 'activity_description', l: 'Equipment used & crew assigned', t: 'textarea' },
              { k: 'outcome', l: 'Deliverables & archive links', t: 'textarea' }
            ]
          },
          meeting: {
            label: 'Committee Meeting',
            title: r => 'Media Meeting: ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'attendees', l: 'Attendees', t: 'textarea' },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'decisions', l: 'Editorial decisions', t: 'textarea' }
            ]
          }
        }
      },

      kijamii: {
        roleKey: 'kijamii',
        committee: 'kijamii',
        table: 'subcommittee_workspace',
        name: 'Kamati ya Masuala ya Kijamii (Social Welfare Committee)',
        shortName: 'Kijamii',
        ibara: 'Ibara ya 16.4',
        mandateSummary: 'Kuratibu masuala ya ustawi wa kijamii, faraja na rambirambi, pongezi za mahafali na harusi, ukarimu, na matendo ya huruma ya Kwaya (Ibara ya 16.4).',
        duties: [
          'Kuratibu ushiriki wa Kwaya katika matukio ya furaha (mahafali, harusi, kipaimara) na huzuni (ugonjwa, msiba) yanayowahusu wanakwaya (Ibara 16.4a).',
          'Kusimamia matendo ya huruma na ziara za kijamii (yatima, wagonjwa, na wahitaji) (Ibara 16.4b).',
          'Kuandaa bajeti ya matukio ya kijamii kwa kushirikiana na Mtunza Hazina (Ibara 16.4c).'
        ],
        defaultResources: [
          {
            title: 'Katiba ya Kwaya \u2014 Ibara ya 16.4: Kamati ya Masuala ya Kijamii',
            body: 'Mwongozo wa kikatiba kuhusu taratibu za rambirambi, faraja kwa wagonjwa, sherehe za mahafali ya wanakwaya, na matendo ya huruma.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
            date: 'Katiba \u00b7 Ibara ya 16.4'
          }
        ],
        kpis: list => {
          const socials = list.filter(r => r.record_type === 'social_event');
          const spent = socials.reduce((s, r) => s + (Number(r.budget_spent) || 0), 0);
          return [
            { label: 'Welfare & Charity Events', val: String(socials.length), sub: 'Celebrations, visits & condolence' },
            { label: 'Welfare Funds Utilized', val: MemberPortal.fmtTzs(spent), sub: 'Total social expenditure logged' },
            { label: 'Committee Meetings', val: String(list.filter(r => r.record_type === 'meeting').length), sub: 'Welfare planning sessions' }
          ];
        },
        types: {
          social_event: {
            label: 'Social Welfare / Charity Event',
            title: r => 'Welfare: ' + (r.event_title || ''),
            fields: [
              { k: 'event_title', l: 'Event title (e.g. Mahafali, Faraja, Matendo ya Huruma)', req: true },
              { k: 'event_date', l: 'Event date', t: 'date', req: true },
              { k: 'beneficiaries', l: 'Member(s) / Beneficiaries', req: true },
              { k: 'budget_allocated', l: 'Budget allocated (TZS)', t: 'number' },
              { k: 'budget_spent', l: 'Actual amount spent (TZS)', t: 'number' },
              { k: 'event_description', l: 'Event summary & choir participation', t: 'textarea' }
            ]
          },
          activity: {
            label: 'Outreach / Hospitality Report',
            title: r => 'Outreach: ' + (r.activity_title || ''),
            fields: [
              { k: 'activity_title', l: 'Activity title', req: true },
              { k: 'activity_date', l: 'Date', t: 'date', req: true },
              { k: 'participants_count', l: 'Members participated', t: 'number' },
              { k: 'activity_description', l: 'Description & impact', t: 'textarea' }
            ]
          },
          meeting: {
            label: 'Committee Meeting',
            title: r => 'Kijamii Meeting: ' + (r.meeting_date || ''),
            fields: [
              { k: 'meeting_date', l: 'Meeting date', t: 'date', req: true },
              { k: 'attendees', l: 'Attendees', t: 'textarea' },
              { k: 'agenda', l: 'Agenda', t: 'textarea' },
              { k: 'decisions', l: 'Resolutions', t: 'textarea' }
            ]
          }
        }
      }
    };

    static GENERIC_WS = {
      key: 'generic',
      roleKey: 'generic',
      table: 'leader_records',
      name: 'Kiongozi wa Kwaya (Choir Leader)',
      shortName: 'Leader',
      ibara: 'Ibara ya 11\u201316',
      mandateSummary: 'Uongozi wa Kwaya ya Maranatha kwa mujibu wa Katiba (Ibara ya 11\u201316). Wasiliana na Admin kuwekewa cheo mahususi (mf. Mtunza Hazina, Katibu, Mwenyekiti, Mwalimu wa Kwaya, au Kamati Ndogo) ili kupata moduli mahususi za nafasi yako.',
      duties: [
        'Kusimamia utekelezaji wa malengo ya Kwaya ya Maranatha kwa mujibu wa Katiba (Ibara ya 11\u201316).',
        'Kushiriki kikamilifu katika vikao vya uongozi na kuhamasisha nidhamu na uimbaji bora.',
        'Kutunza kumbukumbu za majukumu ya uongozi katika mwaka husika wa uongozi.'
      ],
      defaultResources: [
        {
          title: 'Katiba ya Kwaya ya Maranatha \u2014 Ibara ya 11 hadi 16 (Muundo wa Uongozi)',
          body: 'Soma mwongozo kamili wa madaraka na wajibu wa Kamati Tendaji (Mwenyekiti, Mwalimu wa Kwaya, Katibu, Katibu Msaidizi, Mtunza Hazina) na Kamati Ndogo.<br><a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link" style="display:inline-block;margin-top:8px;">Soma Katiba (PDF)</a>',
          date: 'Katiba \u00b7 Ibara ya 11\u201316'
        }
      ],
      kpis: list => [
        { label: 'Leadership Notes Logged', val: String(list.length), sub: 'Personal leadership records' }
      ],
      types: {
        note: {
          label: 'Leadership Record / Note',
          title: r => r.title || 'Untitled',
          fields: [
            { k: 'title', l: 'Title', req: true },
            { k: 'record_date', l: 'Date', t: 'date' },
            { k: 'body', l: 'Notes & details', t: 'textarea', req: true }
          ]
        }
      }
    };

    static SUB_COMMITTEES = [
      ['nidhamu', /nidhamu|discipline|disciplinary/],
      ['liturujia', /liturujia|liturgy|kiroho/],
      ['media', /\bmedia\b|habari|communication/],
      ['kijamii', /kijamii|\bsocial\b|ustawi|welfare/]
    ];

    static workspaceByKey(roleKey) {
      const W = MemberPortal.WORKSPACES;
      if (roleKey && W[roleKey]) {
        return Object.assign({ key: W[roleKey].committee ? 'subcommittee' : roleKey }, W[roleKey]);
      }
      return null;
    }

    static workspaceForProfile(p) {
      if (!p || !p.title) return null;
      const norm = (' ' + p.title.toLowerCase().replace(/[.,()/\\-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ');
      if (/katibu msaidizi|assistant secretary|asst secretary|asst sec|deputy secretary/.test(norm)) {
        return MemberPortal.workspaceByKey('asst_secretary');
      }
      if (/mtunza hazina|mweka hazina|hazina|treasurer|finance|fedha/.test(norm)) {
        return MemberPortal.workspaceByKey('treasurer');
      }
      if (/mwalimu|mwimbishaji|choir ?master|music director|conductor|trainer/.test(norm)) {
        return MemberPortal.workspaceByKey('choirmaster');
      }
      if (/katibu|secretary/.test(norm)) {
        return MemberPortal.workspaceByKey('secretary');
      }
      for (const [committee, re] of MemberPortal.SUB_COMMITTEES) {
        if (re.test(norm.trim())) {
          return MemberPortal.workspaceByKey(committee);
        }
      }
      if (/mwenyekiti|chairperson|chairman|chair/.test(norm)) {
        return MemberPortal.workspaceByKey('chairperson');
      }
      return null;
    }

    wsTypeKey() {
      return this._wsType && this.ws.types[this._wsType] ? this._wsType : Object.keys(this.ws.types)[0];
    }

    renderRoleSwitcher() {
      const switcher = $('mpLeaderRoleSwitcher');
      if (!switcher || !this.ws) return;
      const isAdmin = this.profile && this.profile.role === 'admin';
      if (!isAdmin) {
        switcher.hidden = true;
        switcher.innerHTML = '';
        return;
      }
      switcher.hidden = false;
      switcher.innerHTML = '';
      const lab = document.createElement('label');
      lab.className = 'mp-field';
      const sp = document.createElement('span');
      sp.textContent = 'Role workspace';
      lab.appendChild(sp);

      const sel = document.createElement('select');
      MemberPortal.ROLE_POSITIONS.forEach(pos => {
        const o = document.createElement('option');
        o.value = pos.key;
        o.textContent = pos.title + ' \u00b7 ' + (MemberPortal.WORKSPACES[pos.key] ? MemberPortal.WORKSPACES[pos.key].ibara : '');
        if (this.ws.roleKey === pos.key) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        this._adminInspectRole = sel.value;
        this.renderLeaderWorkspace();
      });
      lab.appendChild(sel);
      switcher.appendChild(lab);
    }

    renderLeaderResources() {
      const box = $('mpLeaderInfo');
      if (!box || !this.ws) return;
      const roleKey = this.ws.roleKey || 'generic';
      if ($('lrResTitle')) {
        $('lrResTitle').textContent = roleKey === 'generic'
          ? 'Leader resources'
          : this.ws.shortName + ' resources';
      }
      if ($('lrResBadge')) {
        $('lrResBadge').textContent = roleKey === 'generic' ? 'Leader' : this.ws.shortName;
      }

      const dbLeaderResources = (this.resources || []).filter(r => {
        if (r.audience === 'leader:' + roleKey) return true;
        if (r.audience !== 'leader') return false;
        const m = String(r.body || '').match(/data-leader-role="([^"]+)"/);
        if (!m) return true;
        return m[1] === roleKey;
      });

      const combined = (this.ws.defaultResources || []).concat(dbLeaderResources);
      this.renderList(
        box,
        combined,
        'Nothing here yet \u2014 leadership materials will be added soon.'
      );
    }

    renderWorkspaceKpis(records) {
      const grid = $('lrSummaryGrid');
      if (!grid || !this.ws) return;
      grid.innerHTML = '';
      if (!records || !records.length || typeof this.ws.kpis !== 'function') {
        grid.hidden = true;
        return;
      }
      const items = this.ws.kpis(records) || [];
      if (!items.length) {
        grid.hidden = true;
        return;
      }
      grid.hidden = false;
      items.forEach(k => {
        const card = document.createElement('div');
        card.className = 'lr-kpi-card';
        const l = document.createElement('div');
        l.className = 'lr-kpi-label';
        l.textContent = k.label;
        const v = document.createElement('div');
        v.className = 'lr-kpi-val';
        v.textContent = k.val;
        card.appendChild(l);
        card.appendChild(v);
        grid.appendChild(card);
      });
    }

    renderLeaderWorkspace() {
      const isAdmin = this.profile && this.profile.role === 'admin';
      const profileWs = MemberPortal.workspaceForProfile(this.profile);
      if (isAdmin) {
        const targetKey = this._adminInspectRole || (profileWs && profileWs.roleKey) || 'treasurer';
        this._adminInspectRole = targetKey;
        this.ws = MemberPortal.workspaceByKey(targetKey) || MemberPortal.GENERIC_WS;
      } else {
        this.ws = profileWs || MemberPortal.GENERIC_WS;
      }

      this._wsType = Object.keys(this.ws.types)[0];
      this._wsRecords = [];

      this.renderRoleSwitcher();
      this.renderLeaderResources();

      const workTitle = $('lrWorkTitle');
      const workBadge = $('lrWorkBadge');
      const hint = $('lrHint');
      const form = $('lrForm');
      const list = $('lrList');
      if (!form || !list) return;

      if (workTitle) {
        workTitle.textContent = this.ws.roleKey === 'generic'
          ? 'Leader workspace'
          : this.ws.shortName + ' workspace';
      }
      if (workBadge) {
        workBadge.textContent = this.ws.ibara || 'Leader';
      }
      if (hint) {
        hint.textContent = this.ws.roleKey === 'generic'
          ? 'Your personal records for this leadership year \u2014 only you and the admins can see them.'
          : this.ws.name + ' \u2014 records are private to your office and choir admins.';
      }

      form.innerHTML = '';
      list.innerHTML = '';

      const typeKeys = Object.keys(this.ws.types);
      if (typeKeys.length > 1) {
        const typeLbl = document.createElement('label');
        typeLbl.className = 'mp-field';
        const ts = document.createElement('span');
        ts.textContent = 'Record type';
        typeLbl.appendChild(ts);
        const sel = document.createElement('select');
        sel.id = 'lrType';
        typeKeys.forEach(k => {
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
      }

      this.wsFields = document.createElement('div');
      form.appendChild(this.wsFields);

      this.lrMsg = document.createElement('div');
      this.lrMsg.className = 'mp-msg';
      this.lrMsg.setAttribute('role', 'status');
      form.appendChild(this.lrMsg);

      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'mp-btn';
      btn.id = 'lrSubmitBtn';
      btn.textContent = 'Save record';
      form.appendChild(btn);

      this.renderWsFields();
      this.loadLeaderWorkspace();
    }

    renderWsFields() {
      if (!this.wsFields) return;
      const t = this.ws.types[this.wsTypeKey()];
      this.wsFields.innerHTML = '';

      const makeFieldEl = f => {
        const lab = document.createElement('label');
        lab.className = 'mp-field';
        const sp = document.createElement('span');
        sp.textContent = f.l.replace(/\s*\(.*?\)\s*$/, '') + (f.req ? ' *' : '');
        lab.appendChild(sp);

        if (f.file || MemberPortal.FILE_FIELDS.has(f.k)) {
          const fileInp = document.createElement('input');
          fileInp.type = 'file';
          fileInp.dataset.fileFor = f.k;
          fileInp.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
          lab.appendChild(fileInp);
          return lab;
        }

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
          if (f.t === 'number') inp.step = 'any';
        }
        inp.dataset.k = f.k;
        lab.appendChild(inp);
        return lab;
      };

      // Group consecutive short fields into two-column (.mp-two) rows for a balanced layout
      let pairBuf = [];
      const flushPair = () => {
        if (!pairBuf.length) return;
        if (pairBuf.length === 1) {
          this.wsFields.appendChild(pairBuf[0]);
        } else {
          const row = document.createElement('div');
          row.className = 'mp-two';
          row.appendChild(pairBuf[0]);
          row.appendChild(pairBuf[1]);
          this.wsFields.appendChild(row);
        }
        pairBuf = [];
      };

      t.fields.forEach(f => {
        const isWide = f.t === 'textarea' || f.file || MemberPortal.FILE_FIELDS.has(f.k);
        const el = makeFieldEl(f);
        if (isWide) {
          flushPair();
          this.wsFields.appendChild(el);
        } else {
          pairBuf.push(el);
          if (pairBuf.length === 2) flushPair();
        }
      });
      flushPair();
    }

    makeRecord(r) {
      const card = document.createElement('div');
      card.className = 'mp-item';
      const t = this.ws.types[r.record_type];

      const head = document.createElement('div');
      head.className = 'lr-rec-head';

      const h = document.createElement('h3');
      h.textContent = t ? (t.title(r) || 'Untitled') : (r.title || 'Untitled');
      head.appendChild(h);

      if (Object.keys(this.ws.types).length > 1) {
        const b = document.createElement('span');
        b.className = 'mp-badge member';
        b.textContent = t ? t.label : MemberPortal.optLabel(r.record_type || 'record');
        head.appendChild(b);
      }
      card.appendChild(head);

      const fieldsDef = t && t.fields ? t.fields : [];
      const metaParts = [];
      const textBlocks = [];
      let docUrl = '';

      fieldsDef.forEach(f => {
        const raw = r[f.k];
        if (raw === undefined || raw === null || raw === '') return;
        if (f.file || MemberPortal.FILE_FIELDS.has(f.k)) {
          docUrl = String(raw);
          return;
        }
        if (f.t === 'textarea') {
          textBlocks.push(String(raw));
          return;
        }
        const label = f.l.replace(/\s*\(.*?\)\s*$/, '');
        if (MemberPortal.CURRENCY_FIELDS.has(f.k)) {
          metaParts.push(label + ': ' + MemberPortal.fmtTzs(raw));
        } else if (f.t === 'select') {
          metaParts.push(MemberPortal.optLabel(raw));
        } else {
          metaParts.push(String(raw));
        }
      });

      if (metaParts.length) {
        const meta = document.createElement('div');
        meta.className = 'lr-rec-meta';
        meta.textContent = metaParts.join(' \u00b7 ');
        card.appendChild(meta);
      }

      if (textBlocks.length) {
        const p = document.createElement('p');
        p.style.marginTop = '4px';
        p.textContent = textBlocks.join(' \u2014 ');
        card.appendChild(p);
      } else if (!metaParts.length && r.body) {
        const p = document.createElement('p');
        p.textContent = r.body;
        card.appendChild(p);
      }

      if (docUrl) {
        const p = document.createElement('p');
        p.style.marginTop = '6px';
        const openLink = document.createElement('a');
        openLink.href = docUrl;
        openLink.target = '_blank';
        openLink.rel = 'noopener';
        openLink.className = 'mp-link';
        openLink.textContent = 'Open document';
        p.appendChild(openLink);
        card.appendChild(p);
      }

      const foot = document.createElement('div');
      foot.className = 'lr-rec-foot';
      const d = document.createElement('div');
      d.className = 'mp-date';
      d.style.marginTop = '0';
      d.textContent = r.created_at
        ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      foot.appendChild(d);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mp-btn small danger';
      del.textContent = 'Delete';
      del.addEventListener('click', () => {
        if (window.confirm('Delete this record?')) {
          this.deleteRecord(r.id, r._fallbackSource);
        }
      });
      foot.appendChild(del);
      card.appendChild(foot);
      return card;
    }

    renderFilteredWorkspaceRecords() {
      const box = $('lrList');
      const heading = $('lrSavedHeading');
      if (!box) return;
      box.innerHTML = '';

      const all = this._wsRecords || [];
      if (heading) heading.hidden = all.length === 0;

      if (!all.length) {
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = 'No records yet \u2014 add your first one above.';
        box.appendChild(e);
        return;
      }
      all.forEach(r => box.appendChild(this.makeRecord(r)));
    }

    async loadLeaderWorkspace() {
      const box = $('lrList');
      if (!box || !this.supabase || !this.ws) return;

      const isAdmin = this.profile && this.profile.role === 'admin';
      let q = this.supabase.from(this.ws.table).select('*');
      if (this.ws.table === 'leader_records' && !isAdmin) {
        q = q.eq('owner_id', this.profile.id);
      } else if (this.ws.committee) {
        q = q.eq('committee_name', this.ws.committee);
      }
      const { data, error } = await q.order('created_at', { ascending: false });

      if (error && /does not exist|schema cache|relation/i.test(error.message)) {
        const prefix = '[ws:' + this.ws.roleKey + ':';
        let fbQuery = this.supabase.from('leader_records').select('*').order('created_at', { ascending: false });
        if (!isAdmin) fbQuery = fbQuery.eq('owner_id', this.profile.id);
        const { data: fbData, error: fbErr } = await fbQuery;
        if (!fbErr && Array.isArray(fbData)) {
          const parsed = [];
          fbData.forEach(item => {
            if (this.ws.roleKey === 'generic' && (!item.title || item.title.indexOf('[ws:') !== 0)) {
              parsed.push(Object.assign({ record_type: 'note', _fallbackSource: 'leader_records' }, item));
              return;
            }
            if (item.title && item.title.indexOf(prefix) === 0) {
              try {
                const obj = JSON.parse(item.body || '{}');
                parsed.push(Object.assign({}, obj, {
                  id: item.id,
                  created_at: item.created_at,
                  _fallbackSource: 'leader_records'
                }));
              } catch (e) { /* ignore */ }
            }
          });
          this._wsRecords = parsed;
          this.renderWorkspaceKpis(this._wsRecords);
          this.renderFilteredWorkspaceRecords();
          return;
        }
      }

      if (error) {
        console.warn('leader workspace:', error);
        box.innerHTML = '';
        const e = document.createElement('p');
        e.className = 'mp-empty';
        e.textContent = error.message;
        box.appendChild(e);
        return;
      }

      this._wsRecords = data || [];
      this.renderWorkspaceKpis(this._wsRecords);
      this.renderFilteredWorkspaceRecords();
    }

    async onAddRecord(e) {
      e.preventDefault();
      const msg = this.lrMsg;
      if (!msg || !this.supabase || !this.ws) return;
      const tkey = this.wsTypeKey();
      const t = this.ws.types[tkey];
      const row = { owner_id: this.profile.id };
      if (this.ws.table !== 'leader_records') {
        row.record_type = tkey;
      }
      const missing = [];

      this.wsFields.querySelectorAll('[data-k]').forEach(inp => {
        const f = t.fields.find(x => x.k === inp.dataset.k);
        if (!f) return;
        const v = (inp.value || '').trim();
        if (f.req && !v) {
          missing.push(f.l.replace(/\s*\(.*?\)\s*$/, ''));
          return;
        }
        if (!v) return;
        row[f.k] = f.t === 'number' ? Number(v) : v;
      });

      if (missing.length) {
        msg.className = 'mp-msg err';
        msg.textContent = 'Please fill in: ' + missing.join(', ');
        return;
      }

      const fileInputs = Array.from(this.wsFields.querySelectorAll('input[type="file"][data-file-for]'));
      for (const fInp of fileInputs) {
        if (fInp.files && fInp.files[0]) {
          const file = fInp.files[0];
          const fieldKey = fInp.dataset.fileFor;
          msg.className = 'mp-msg';
          msg.textContent = 'Uploading file\u2026';
          const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const storagePath = 'leader_' + (this.ws.roleKey || 'general') + '/' + safeName;
          const isPdf = file.name.toLowerCase().endsWith('.pdf');
          const { error: upErr } = await this.supabase.storage
            .from('documents')
            .upload(storagePath, file, {
              contentType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream')
            });
          if (upErr) {
            msg.className = 'mp-msg err';
            msg.textContent = 'Upload failed: ' + upErr.message;
            return;
          }
          const { data: pubData } = this.supabase.storage.from('documents').getPublicUrl(storagePath);
          if (pubData && pubData.publicUrl) {
            row[fieldKey] = pubData.publicUrl;
          }
        }
      }

      if (this.ws.committee) row.committee_name = this.ws.committee;
      msg.className = 'mp-msg';
      msg.textContent = 'Saving\u2026';

      let { error } = await this.supabase.from(this.ws.table).insert(row);
      if (error && /column .* does not exist|schema cache/i.test(error.message) && !/relation .* does not exist/i.test(error.message)) {
        const cleanRow = Object.assign({}, row);
        delete cleanRow.notes;
        delete cleanRow.action_required;
        const retryRes = await this.supabase.from(this.ws.table).insert(cleanRow);
        error = retryRes.error;
      }
      if (error && /does not exist|schema cache|relation/i.test(error.message) && this.ws.table !== 'leader_records') {
        const fbTitle = '[ws:' + this.ws.roleKey + ':' + tkey + '] ' + (t.title ? t.title(row) : tkey);
        const fbRes = await this.supabase.from('leader_records').insert({
          owner_id: this.profile.id,
          title: fbTitle,
          body: JSON.stringify(Object.assign({}, row, { record_type: tkey })),
          record_date: new Date().toISOString().slice(0, 10)
        });
        error = fbRes.error;
      }

      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      this.wsFields.querySelectorAll('input, textarea').forEach(i => { i.value = ''; });
      this.wsFields.querySelectorAll('select').forEach(s => { s.selectedIndex = 0; });
      msg.className = 'mp-msg ok';
      msg.textContent = 'Record saved.';
      this.loadLeaderWorkspace();
    }

    async deleteRecord(id, fallbackSource) {
      if (!this.supabase || !this.ws) return;
      const targetTable = fallbackSource === 'leader_records' ? 'leader_records' : this.ws.table;
      await this.supabase.from(targetTable).delete().eq('id', id);
      this.loadLeaderWorkspace();
    }

    /* ---------- Leader posting: events + announcements ---------- */

    async onCreateEvent(e) {
      e.preventDefault();
      const msg = $('evMsg');
      if (!msg || !this.supabase) return;
      const titleEn = $('evTitleEn').value.trim();
      const start = $('evStart').value;
      if (!titleEn || !start) {
        msg.className = 'mp-msg err';
        msg.textContent = 'An English title and a start time are required.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Publishing\u2026';
      const locVal = $('evLoc').value.trim();
      const { error } = await this.supabase.from('events').insert({
        title_en: titleEn,
        title_sw: $('evTitleSw').value.trim(),
        description_en: $('evDescEn').value.trim(),
        description_sw: $('evDescSw').value.trim(),
        event_type: $('evType').value,
        start_time: new Date(start).toISOString(),
        location: locVal,
        is_mandatory: $('evMand').checked,
        created_by: this.profile.id
      });
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      if (window.MaranathaNotifier && typeof window.MaranathaNotifier.broadcast === 'function') {
        const whenStr = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        window.MaranathaNotifier.broadcast({
          id: `portal-event:${titleEn}:${start}`,
          type: 'event',
          title: titleEn,
          meta: [whenStr, locVal].filter(Boolean).join(' \u00b7 '),
          href: 'members.html?section=upcoming-events#portal',
          actionLabel: 'View Event'
        });
      }
      ['evTitleEn', 'evTitleSw', 'evDescEn', 'evDescSw', 'evStart', 'evLoc'].forEach(id => { $(id).value = ''; });
      $('evMand').checked = false;
      msg.className = 'mp-msg ok';
      msg.textContent = 'Event published \u2713';
      this.loadMyPosts();
      this.loadEvents();
    }

    async onCreateAnno(e) {
      e.preventDefault();
      const msg = $('anMsg');
      if (!msg || !this.supabase) return;
      const titleEn = $('anTitleEn').value.trim();
      if (!titleEn) {
        msg.className = 'mp-msg err';
        msg.textContent = 'An English title is required.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Publishing\u2026';
      const titleSw = $('anTitleSw').value.trim();
      const bodyEn = $('anBodyEn').value.trim();
      const bodySw = $('anBodySw').value.trim();
      const isPinned = $('anPin').checked;
      const { data: inserted, error } = await this.supabase
        .from('announcements')
        .insert({
          title_en: titleEn,
          title_sw: titleSw,
          content_en: bodyEn,
          content_sw: bodySw,
          is_pinned: isPinned,
          author_id: this.profile.id
        })
        .select('*');
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      const annoRow = (inserted && inserted[0]) || {
        id: Date.now(),
        title_en: titleEn,
        title_sw: titleSw,
        content_en: bodyEn,
        content_sw: bodySw,
        is_pinned: isPinned,
        author_id: this.profile.id,
        created_at: new Date().toISOString()
      };
      if (window.MaranathaNotifier && typeof window.MaranathaNotifier.publishAnnouncement === 'function') {
        window.MaranathaNotifier.publishAnnouncement(annoRow);
      } else if (window.MaranathaNotifier && typeof window.MaranathaNotifier.broadcast === 'function') {
        window.MaranathaNotifier.broadcast({
          id: `anno-db:${annoRow.id}`,
          type: 'announcement',
          title: titleEn,
          meta: bodyEn ? bodyEn.slice(0, 115) + (bodyEn.length > 115 ? '\u2026' : '') : 'New announcement posted in the Member Portal.',
          href: 'members.html?section=announcements#portal',
          actionLabel: 'Read Notice'
        });
      }
      ['anTitleEn', 'anTitleSw', 'anBodyEn', 'anBodySw'].forEach(id => { $(id).value = ''; });
      $('anPin').checked = false;
      msg.className = 'mp-msg ok';
      msg.textContent = 'Announcement published \u2713';
      this.loadMyPosts();
      this.loadAnnouncements();
    }

    async loadMyPosts() {
      const box = $('postList');
      if (!box || !this.supabase) return;
      const { data: evs } = await this.supabase.from('events').select('id,title_en,start_time').order('created_at', { ascending: false }).limit(8);
      const { data: anns } = await this.supabase.from('announcements').select('id,title_en,is_pinned,created_at').order('created_at', { ascending: false }).limit(8);
      box.innerHTML = '';
      const rows = [];
      (evs || []).forEach(ev => rows.push({ kind: 'event', id: ev.id, label: ev.title_en, when: ev.start_time }));
      (anns || []).forEach(an => rows.push({ kind: 'anno', id: String(an.id), label: an.title_en + (an.is_pinned ? ' \ud83d\udccc' : ''), when: an.created_at }));
      rows.sort((a, b) => new Date(b.when) - new Date(a.when));
      if (!rows.length) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = 'Nothing published yet.';
        box.appendChild(p);
        return;
      }
      rows.slice(0, 12).forEach(r => {
        const row = document.createElement('div');
        row.className = 'att-row';
        const who = document.createElement('div');
        const b = document.createElement('span');
        b.className = 'mp-badge ' + (r.kind === 'event' ? 'admin' : 'member');
        b.textContent = r.kind === 'event' ? 'Event' : 'Notice';
        who.appendChild(b);
        const t = document.createElement('span');
        t.textContent = ' ' + r.label;
        who.appendChild(t);
        row.appendChild(who);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'mp-btn small danger';
        del.textContent = 'Delete';
        del.addEventListener('click', () => this.deletePost(r.kind, r.id));
        row.appendChild(del);
        box.appendChild(row);
      });
    }

    async deletePost(kind, id) {
      if (!window.confirm('Delete this ' + (kind === 'event' ? 'event' : 'announcement') + '?')) return;
      const table = kind === 'event' ? 'events' : 'announcements';
      const { error } = await this.supabase.from(table).delete().eq('id', id);
      if (error) {
        window.alert('Could not delete: ' + error.message);
        return;
      }
      this.loadMyPosts();
      this.loadEvents();
      this.loadAnnouncements();
    }

    /* ---------- Music library ---------- */

    async loadLibrary() {
      if (!this.supabase) return;
      const { data, error } = await this.supabase
        .from('library_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80);
      const box = $('libList');
      if (!box) return;
      if (error) {
        console.warn('library:', error);
        box.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = /does not exist|schema cache|relation/i.test(error.message)
          ? 'The library is not set up yet \u2014 ask an admin to run supabase-phase-final.sql.'
          : error.message;
        box.appendChild(p);
        return;
      }
      this.libItems = data || [];
      this.renderLibrary();
      const form = $('libForm');
      if (form && this.profile) {
        form.hidden = !(this.profile.role === 'leader' || this.profile.role === 'section_leader' || this.profile.role === 'admin');
      }
    }

    renderLibrary() {
      const box = $('libList');
      if (!box) return;
      const kind = $('libKind') ? $('libKind').value : '';
      const voice = $('libVoice') ? $('libVoice').value : '';
      box.innerHTML = '';
      const list = (this.libItems || []).filter(it =>
        (!kind || it.kind === kind) && (!voice || it.voice_part === voice));
      if (!list.length) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = (this.libItems || []).length
          ? 'Nothing matches these filters.'
          : 'The library is empty \u2014 leaders can add the first file.';
        box.appendChild(p);
        return;
      }
      list.forEach(it => {
        const row = document.createElement('div');
        row.className = 'att-row';
        const who = document.createElement('div');
        const b = document.createElement('span');
        b.className = 'mp-badge ' + (it.kind === 'score' ? 'admin' : it.kind === 'track' ? 'leader' : 'member');
        b.textContent = it.kind === 'score' ? 'Sheet music' : it.kind === 'track' ? 'Track' : 'File';
        who.appendChild(b);
        const t = document.createElement('span');
        t.textContent = ' ' + it.title;
        who.appendChild(t);
        const v = document.createElement('div');
        v.className = 'mp-date';
        v.textContent = (it.voice_part === 'all' ? 'Full choir' : MemberPortal.optLabel(it.voice_part)) +
          ' \u00b7 ' + new Date(it.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        who.appendChild(v);
        row.appendChild(who);
        const act = document.createElement('div');
        act.className = 'mp-rsvp';
        const dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'mp-btn small';
        dl.textContent = 'Download';
        dl.addEventListener('click', () => this.libDownload(it));
        act.appendChild(dl);
        if (this.profile && ['leader', 'section_leader', 'admin'].includes(this.profile.role)) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'mp-btn small danger';
          del.textContent = 'Delete';
          del.addEventListener('click', () => this.libDelete(it));
          act.appendChild(del);
        }
        row.appendChild(act);
        box.appendChild(row);
      });
    }

    async onLibUpload(e) {
      e.preventDefault();
      const msg = $('libMsg');
      if (!msg || !this.supabase) return;
      const title = $('libTitle').value.trim();
      const file = $('libFile').files[0];
      if (!title || !file) {
        msg.className = 'mp-msg err';
        msg.textContent = 'A title and a file are required.';
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        msg.className = 'mp-msg err';
        msg.textContent = 'That file is larger than 20 MB.';
        return;
      }
      msg.className = 'mp-msg';
      msg.textContent = 'Uploading\u2026';
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = 'lib/' + Date.now() + '-' + safe;
      const up = await this.supabase.storage.from('library').upload(path, file, {
        contentType: file.type || 'application/octet-stream'
      });
      if (up.error) {
        msg.className = 'mp-msg err';
        msg.textContent = up.error.message;
        return;
      }
      const { error } = await this.supabase.from('library_items').insert({
        title: title,
        kind: $('libKindNew').value,
        voice_part: $('libVoiceNew').value,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: this.profile.id
      });
      if (error) {
        msg.className = 'mp-msg err';
        msg.textContent = error.message;
        return;
      }
      $('libTitle').value = '';
      $('libFile').value = '';
      msg.className = 'mp-msg ok';
      msg.textContent = 'Added to the library \u2713';
      this.loadLibrary();
    }

    async libDownload(item) {
      const res = await this.supabase.storage.from('library').createSignedUrl(item.file_path, 300);
      if (res.error || !res.data || !res.data.signedUrl) {
        window.alert('Could not open the file: ' + (res.error ? res.error.message : 'no URL'));
        return;
      }
      window.open(res.data.signedUrl, '_blank');
    }

    async libDelete(item) {
      if (!window.confirm('Delete "' + item.title + '" from the library?')) return;
      await this.supabase.storage.from('library').remove([item.file_path]);
      const { error } = await this.supabase.from('library_items').delete().eq('id', item.id);
      if (error) {
        window.alert('Could not delete: ' + error.message);
        return;
      }
      this.loadLibrary();
    }

    /* ---------- Member directory ---------- */

    async loadDirectory() {
      if (!this.supabase) return;
      const isLeader = ['leader', 'section_leader', 'admin'].includes(this.profile.role);
        const canViewFull = this.profile.role === 'admin' || this.profile.can_view_directory === true;
        const { data, error } = await this.supabase.rpc(canViewFull ? 'directory_full' : 'directory');
      const box = $('dirList');
      if (!box) return;
      if (error) {
        console.warn('directory:', error);
        box.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = /does not exist|schema cache|relation/i.test(error.message)
          ? 'The directory is not set up yet \u2014 ask an admin to run supabase-phase-final.sql.'
          : error.message;
        box.appendChild(p);
        return;
      }
      this.dirRows = data || [];
      const hint = $('dirHint');
      if (hint) hint.textContent = canViewFull ? 'Names, voice parts and contact details.' : 'Names and voice parts. Contact details are restricted.';
      this.renderDirectory();
    }

    renderDirectory() {
      const box = $('dirList');
      if (!box) return;
      const q = ($('dirSearch') ? $('dirSearch').value : '').trim().toLowerCase();
      box.innerHTML = '';
      const list = (this.dirRows || []).filter(r =>
        !q || (r.full_name || '').toLowerCase().includes(q) || (r.voice_part || '').toLowerCase().includes(q));
      if (!list.length) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = (this.dirRows || []).length ? 'Nobody matches that search.' : 'No active members yet.';
        box.appendChild(p);
        return;
      }
      
      const groups = {};
      list.forEach(r => {
        const part = r.voice_part || 'Other';
        if (!groups[part]) groups[part] = [];
        groups[part].push(r);
      });
      
      Object.keys(groups).forEach(part => {
        const h = document.createElement('h3');
        h.className = 'mp-sec';
        h.textContent = part;
        box.appendChild(h);
        
        const groupBox = document.createElement('div');
        
        groups[part].forEach(r => {
          const row = document.createElement('div');
          row.className = 'att-row';
          const who = document.createElement('div');
          const nm = document.createElement('span');
          nm.textContent = r.full_name || 'Member';
          who.appendChild(nm);
          const sub = [r.title, r.role === 'admin' ? 'Admin' : null].filter(Boolean).join(' · ');
          if (sub) {
            const s = document.createElement('div');
            s.className = 'mp-date';
            s.textContent = sub;
            who.appendChild(s);
          }
          if (r.phone || r.email) {
            const c = document.createElement('div');
            c.className = 'mp-date';
            c.textContent = [r.phone, r.email].filter(Boolean).join(' · ');
            who.appendChild(c);
          }
          row.appendChild(who);
          groupBox.appendChild(row);
        });
        
        box.appendChild(groupBox);
        this.applyViewMore(groupBox, part, 3);
      });
    }

      /* ---------- Attendance season report ---------- */

    async loadReport() {
      const box = $('repBox');
      if (!box || !this.supabase) return;
      box.innerHTML = '<p class="mp-empty">Crunching numbers\u2026</p>';
      const { data, error } = await this.supabase.rpc('attendance_overview');
      box.innerHTML = '';
      if (error) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = /does not exist|schema cache|relation/i.test(error.message)
          ? 'Reports are not set up yet \u2014 ask an admin to run supabase-phase-final.sql.'
          : error.message;
        box.appendChild(p);
        return;
      }
      const rows = (data || []).slice().sort((a, b) => (b.pct || 0) - (a.pct || 0));
      if (!rows.length) {
        const p = document.createElement('p');
        p.className = 'mp-empty';
        p.textContent = 'No active members found.';
        box.appendChild(p);
        return;
      }
      rows.forEach(r => {
        const row = document.createElement('div');
        row.className = 'att-row';
        const who = document.createElement('div');
        const nm = document.createElement('span');
        nm.textContent = r.full_name || 'Member';
        who.appendChild(nm);
        const s = document.createElement('div');
        s.className = 'mp-date';
        s.textContent = (r.voice_part ? r.voice_part + ' \u00b7 ' : '') +
          'P' + r.present + ' L' + r.late + ' A' + r.absent + ' E' + r.excused;
        who.appendChild(s);
        row.appendChild(who);
        row.appendChild(this.attBadge(r.marked ? (r.pct >= 85 ? 'present' : r.pct >= 60 ? 'late' : 'absent') : 'excused'))
          .textContent = r.marked ? r.pct + '%' : '\u2014';
        box.appendChild(row);
      });
    }

    
    applyViewMore(box, title, maxItems = 5) {
      if (!box) return;
      // Filter out any elements that shouldn't be counted (e.g. empty messages)
      const items = Array.from(box.children);
      if (items.length <= maxItems) return;
      
      for (let i = maxItems; i < items.length; i++) {
        items[i].style.display = 'none';
      }
      
      const btn = document.createElement('button');
      btn.className = 'mp-btn';
      btn.style.marginTop = '15px';
      btn.style.width = '100%';
      btn.textContent = 'View all';
      
      btn.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '20px';
        
        const content = document.createElement('div');
        content.style.background = 'var(--card)';
        content.style.border = '1px solid var(--line)';
        content.style.borderRadius = '12px';
        content.style.width = '100%';
        content.style.maxWidth = '600px';
        content.style.maxHeight = '85vh';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        
        const header = document.createElement('div');
        header.style.padding = '20px';
        header.style.borderBottom = '1px solid var(--line)';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        
        const h3 = document.createElement('h3');
        h3.textContent = title;
        h3.style.margin = '0';
        
        const close = document.createElement('button');
        close.className = 'mp-btn small danger';
        close.textContent = 'Close';
        
        header.appendChild(h3);
        header.appendChild(close);
        content.appendChild(header);
        
        const list = document.createElement('div');
        list.style.padding = '20px';
        list.style.overflowY = 'auto';
        
        items.forEach(item => {
          item.style.display = '';
          list.appendChild(item);
        });
        
        close.addEventListener('click', () => {
          items.forEach((item, i) => {
            if (i >= maxItems) item.style.display = 'none';
            box.insertBefore(item, btn);
          });
          document.body.removeChild(overlay);
        });
        
        content.appendChild(list);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
      });
      
      box.appendChild(btn);
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
      const { data } = await this.supabase.from('profiles').select('*').eq('status', 'active').order('full_name');
      box.innerHTML = '';
      if (!document.getElementById('mpKatibaTitles')) {
        const dl = document.createElement('datalist');
        dl.id = 'mpKatibaTitles';
        MemberPortal.ROLE_POSITIONS.forEach(pos => {
          const o = document.createElement('option');
          o.value = pos.title;
          dl.appendChild(o);
        });
        document.body.appendChild(dl);
      }
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
        tit.placeholder = 'Title (e.g. Treasurer, Secretary)';
        tit.setAttribute('list', 'mpKatibaTitles');
        tit.maxLength = 60;

        const saveTitle = async val => {
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
          if (val && m.role === 'member') {
            const { error: rErr } = await this.supabase.rpc('admin_set_role', {
              p_email: m.email,
              p_role: 'leader'
            });
            if (!rErr) {
              m.role = 'leader';
              sel.value = 'leader';
            }
          }
          if (m.id === this.profile.id) {
            this.profile.title = val;
            this.renderDashboard();
          }
        };

        tit.addEventListener('change', () => saveTitle(tit.value.trim()));

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'mp-btn small';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', async () => {
          await saveTitle(tit.value.trim());
          saveBtn.textContent = 'Saved!';
          setTimeout(() => { saveBtn.textContent = 'Save'; }, 1500);
        });
        row.appendChild(tit);
        row.appendChild(saveBtn);
        row.appendChild(det);
        box.appendChild(row);
      });
      this.applyViewMore($('adminMembers'), 'Manage Members', 2);
      }

    /* ---------- Admin: members grouped by residence and birthday month ---------- */

    static HALLS = ['Hall 1','Hall 2','Hall 3','Hall 4','Hall 5','Hall 6','Hall 7','Magufuli Hostel','Coict Hostel','Mabibo Hostel'];

    static VOICE_ORDER = ['Soprano', 'Alto', 'Tenor', 'Bass'];

    static MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    async loadAdminResidence() {
      const box = $('adminResidence');
      if (!box) return;
      const { data } = await this.supabase
        .from('profiles').select('full_name, residence_type, residence').order('full_name');
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
          who.appendChild(nm);
          row.appendChild(who);
          box.appendChild(row);
        });
      });
      this.applyViewMore($('adminResidence'), 'Members by Residence', 2);
      }

    async loadAdminVoice() {
      const box = $('adminVoice');
      if (!box) return;
      const { data } = await this.supabase
        .from('profiles').select('full_name, voice_part').order('full_name');
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
          who.appendChild(nm);
          row.appendChild(who);
          box.appendChild(row);
        });
      });
      this.applyViewMore($('adminVoice'), 'Members by Voice Part', 2);
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
      this.applyViewMore($('adminBirthdays'), 'Birthdays by Month', 2);
      }

    
    async checkAdminNotifications() {
      if (this._adminNotified) return;
      this._adminNotified = true;

      let msgParts = [];

      try {
        const { count: pendingCount } = await this.supabase
          .from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        if (pendingCount > 0) msgParts.push(`${pendingCount} pending registration(s)`);
        
        // Removed auditions and contact_msgs from the initial popup to avoid persistent notifications
        // since they don't have a reliable "read" state mechanism for all admins.

        if (msgParts.length > 0) {
          this.showAdminPopup("You have: " + msgParts.join(', '));
        }
      } catch (e) {
        console.warn("Notifications check failed", e);
      }
    }

    showAdminPopup(msg) {
      if (window.MaranathaNotifier && typeof window.MaranathaNotifier.show === 'function') {
        window.MaranathaNotifier.show({
          id: 'admin-alert:' + msg,
          type: 'admin',
          badgeLabel: 'Admin Notice',
          title: 'Admin Notification',
          meta: msg,
          href: 'members.html?section=admin-resources#portal',
          actionLabel: 'Open Admin Tools',
          onAction: () => {
            this.switchDashboardSection('admin-resources');
          }
        }, { allowAnon: true });
        return;
      }
      const p = document.createElement('div');
      p.style.cssText = 'position:fixed;top:20px;right:20px;background:#000000;color:#ffffff;padding:14px 18px;border:1px solid rgba(255,255,255,0.22);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.2);z-index:9999;font-weight:600;cursor:pointer;opacity:0;transition:opacity 0.3s;';
      p.textContent = msg;
      p.onclick = () => p.remove();
      document.body.appendChild(p);
      setTimeout(() => { p.style.opacity = '1'; }, 10);
      setTimeout(() => { p.style.opacity = '0'; setTimeout(() => p.remove(), 300); }, 8000);
    }


    subscribeAdminRealtime() {
      if (this._adminRealtimeSubscribed) return;
      this._adminRealtimeSubscribed = true;

      this.supabase.channel('admin-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_msgs' }, payload => {
           this.showAdminPopup('New contact message from ' + (payload.new.name || 'someone'));
           this.loadAdminInbox();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auditions' }, payload => {
           this.showAdminPopup('New audition request from ' + (payload.new.name || 'someone'));
           this.loadAdminInbox();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, payload => {
           if (payload.new.status === 'pending') {
             this.showAdminPopup('New pending registration: ' + (payload.new.full_name || 'someone'));
             this.loadAdminPending();
           }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
           if (payload.new.status === 'pending' && payload.old.status !== 'pending') {
             this.showAdminPopup('New pending registration: ' + (payload.new.full_name || 'someone'));
             this.loadAdminPending();
           }
        })
        .subscribe();
    }

    /* ---------- Admin: inbox (auditions + contact messages) ---------- */

    async loadAdminInbox() {
      const empty = document.createElement('p');
      empty.className = 'mp-empty';
      empty.textContent = I18n.t('portal.empty');

      const box = $('adminAuditions');
      if (box) {
        box.innerHTML = '';
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const { data, error } = await this.supabase
          .from('auditions').select('*').gte('created_at', fourWeeksAgo.toISOString()).order('created_at', { ascending: false }).limit(30);
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
        let list = data || [];
        
        const now = new Date();
        list = list.filter(m => {
          if (m.viewed_at) {
            const v = new Date(m.viewed_at);
            if ((now - v) > 10 * 60 * 1000) return false;
          }
          return true;
        });

        const unreadIds = list.filter(m => !m.is_read || !m.viewed_at).map(m => m.id);
        if (unreadIds.length > 0) {
           this.supabase.from('contact_msgs').update({ is_read: true, viewed_at: now.toISOString() }).in('id', unreadIds).then();
           list.forEach(m => {
               if (unreadIds.includes(m.id)) m.viewed_at = now.toISOString();
           });
        }

        if (!list.length) { mBox.appendChild(empty); }
        list.forEach(m => {
          const card = document.createElement('div');
          card.className = 'mp-item';
          card.style.transition = 'opacity 0.3s';
          
          if (m.viewed_at) {
             const timeToHide = (10 * 60 * 1000) - (Date.now() - new Date(m.viewed_at).getTime());
             if (timeToHide > 0) {
                 setTimeout(() => {
                     card.style.opacity = '0';
                     setTimeout(() => card.remove(), 300);
                 }, timeToHide);
             }
          }
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
      let body = $('arBody').value.trim();
      const audience = $('arAudience').value;
      const fileInput = $('arFile');
      if (!title) {
        if (msg) {
          msg.className = 'mp-msg err';
          msg.textContent = 'Give the resource a title.';
        }
        return;
      }
      if (msg) {
        msg.className = 'mp-msg';
        msg.textContent = 'Uploading...';
      }
      
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const path = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const { error: upErr } = await this.supabase.storage.from('documents').upload(path, file, { contentType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream') });
        if (upErr) {
          if (msg) {
            msg.className = 'mp-msg err';
            msg.textContent = 'Upload failed: ' + upErr.message;
          }
          return;
        }
        const { data: pubUrlData } = this.supabase.storage.from('documents').getPublicUrl(path);
        if (pubUrlData && pubUrlData.publicUrl) {
          const isPdf = file.name.toLowerCase().endsWith('.pdf');
          const linkHtml = `<br><a href="${pubUrlData.publicUrl}" target="_blank" class="mp-link" style="display:inline-block; margin-top:8px;">Pakua / Download Document</a>`;
          body += linkHtml;
          if (isPdf) {
             body += `<details style="margin-top:12px; background:#F8F8F8; padding:10px; border-radius:8px; border:1px solid var(--line);"><summary style="cursor:pointer; font-weight:600; color:var(--ink); outline:none;">Preview Document / Hakiki</summary><iframe src="${pubUrlData.publicUrl}" style="width:100%;height:500px;border:none;margin-top:12px;border-radius:4px;background:#fff;"></iframe></details>`;
          }
        }
      }

      let dbAudience = audience;
      if (audience && audience.indexOf('leader:') === 0) {
        const targetRole = audience.slice(7).replace(/[^a-z0-9_]/gi, '');
        dbAudience = 'leader';
        body = `<span class="mp-res-role-tag" data-leader-role="${targetRole}" hidden></span>` + body;
      }

      const { error } = await this.supabase.from('resources').insert({
        title: title,
        body: body,
        audience: dbAudience
      });
      if (error) {
        if (msg) {
          msg.className = 'mp-msg err';
          msg.textContent = error.message;
        }
        return;
      }
      $('arTitle').value = '';
      $('arBody').value = '';
      if (fileInput) fileInput.value = '';
      if (msg) {
        msg.className = 'mp-msg ok';
        msg.textContent = 'Resource added.';
      }
      this.loadDashboard();
    }

    /* ---------- Tabs ---------- */

    switchTab(view) {
      document.querySelectorAll('.mp-tab').forEach(x => x.classList.toggle('on', x.dataset.view === view));
      document.querySelectorAll('#authView .mp-form').forEach(f => f.classList.toggle('on', f.id === (view === 'signin' ? 'signinForm' : 'signupForm')));
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
      $('pvOut').addEventListener('click', () => this.signOut());

      if (!window.MaranathaUserMenu) {
        const menuBtn = $('mpUserMenuBtn');
        const menuDrop = $('mpUserDropdown');
        if (menuBtn && menuDrop) {
          menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDrop.style.display = menuDrop.style.display === 'none' || !menuDrop.style.display ? 'flex' : 'none';
          });
          document.addEventListener('click', (e) => {
            if (!menuDrop.contains(e.target) && !menuBtn.contains(e.target)) {
              menuDrop.style.display = 'none';
            }
          });
        }
        const menuProf = $('mpMenuProfile');
        if (menuProf) menuProf.addEventListener('click', () => {
          if (menuDrop) menuDrop.style.display = 'none';
          this.openProfileView();
        });
        const menuLogout = $('mpMenuLogout');
        if (menuLogout) menuLogout.addEventListener('click', () => {
          if (menuDrop) menuDrop.style.display = 'none';
          if (this.hasSession) this.signOut();
          else this.openSignInView();
        });
      }

      $('adminResourceForm').addEventListener('submit', e => this.addResource(e));
      $('adminInviteForm').addEventListener('submit', e => this.onInvite(e));
      const lrForm = $('lrForm');
      if (lrForm) lrForm.addEventListener('submit', e => this.onAddRecord(e));
      const ciForm = $('ciForm');
      if (ciForm) ciForm.addEventListener('submit', e => this.onCheckIn(e));
      const sessForm = $('sessForm');
      if (sessForm) sessForm.addEventListener('submit', e => this.onCreateSession(e));
      const evForm = $('evForm');
      if (evForm) evForm.addEventListener('submit', e => this.onCreateEvent(e));
      const anForm = $('anForm');
      if (anForm) anForm.addEventListener('submit', e => this.onCreateAnno(e));
      const libForm = $('libForm');
      if (libForm) libForm.addEventListener('submit', e => this.onLibUpload(e));
      ['libKind', 'libVoice'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('change', () => this.renderLibrary());
      });
      const dirSearch = $('dirSearch');
      if (dirSearch) dirSearch.addEventListener('input', () => this.renderDirectory());
      const repBtn = $('repBtn');
      if (repBtn) repBtn.addEventListener('click', () => this.loadReport());
      $('mpInviteCopy').addEventListener('click', () => this.copyInvite());
      $('pfCancel').addEventListener('click', () => {
        this.closeProfileEdit();
        if (this.profileComplete(this.profile)) {
          this.openProfileView();
        } else {
          this.showDash();
          this.loadDashboard();
        }
      });
      if ($('pfNext1')) {
        $('pfNext1').addEventListener('click', () => {
          if (this.validateProfileStep(1)) this.setProfileStep(2);
        });
      }
      if ($('pfBack2')) {
        $('pfBack2').addEventListener('click', () => this.setProfileStep(1));
      }
      if ($('pfNext2')) {
        $('pfNext2').addEventListener('click', () => {
          if (this.validateProfileStep(2)) this.setProfileStep(3);
        });
      }
      if ($('pfBack3')) {
        $('pfBack3').addEventListener('click', () => this.setProfileStep(2));
      }
      if ($('pfBackToDash')) $('pfBackToDash').addEventListener('click', () => this.showDash());
      if ($('pfOut')) $('pfOut').addEventListener('click', () => this.signOut());
      if ($('mpOut')) $('mpOut').addEventListener('click', () => this.signOut());
      if ($('mpEditProfile')) $('mpEditProfile').addEventListener('click', () => this.openProfileForm(false));

      document.querySelectorAll('#mpSidebarNav .mp-side-link').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchDashboardSection(btn.dataset.section);
        });
      });

      if ($('mpSidebarToggle')) {
        $('mpSidebarToggle').addEventListener('click', () => this.toggleMobileSidebar());
      }
      if ($('mpSidebarBackdrop')) {
        $('mpSidebarBackdrop').addEventListener('click', () => this.closeMobileSidebar());
      }

      window.addEventListener('resize', () => this.syncHeaderHeight());
      this.syncHeaderHeight();
        
        const avInput = $('pfAvatar');
        const cropModal = $('cropModal');
        const cropImage = $('cropImage');
        const cropCancel = $('cropCancel');
        const cropSave = $('cropSave');
        const avDelBtn = $('pfAvatarDelete');
        const avPrev = $('pfAvatarPreview');

        if (avInput && cropModal) {
          avInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
              const reader = new FileReader();
              reader.onload = (re) => {
                cropImage.src = re.target.result;
                cropModal.style.display = 'flex';
                if (this.cropper) { this.cropper.destroy(); }
                this.cropper = new Cropper(cropImage, {
                  aspectRatio: 1,
                  viewMode: 1,
                  background: false,
                  autoCropArea: 1,
                  responsive: true
                });
              };
              reader.readAsDataURL(e.target.files[0]);
            }
          });
          
          cropCancel.addEventListener('click', () => {
            cropModal.style.display = 'none';
            avInput.value = '';
            if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
          });
          
          cropSave.addEventListener('click', () => {
            if (!this.cropper) return;
            const canvas = this.cropper.getCroppedCanvas({ width: 400, height: 400 });
            canvas.toBlob((blob) => {
              this.avatarBlob = blob;
              this.avatarDelete = false;
              avPrev.src = URL.createObjectURL(blob);
              avPrev.style.display = 'block';
              avDelBtn.style.display = 'inline-block';
              cropModal.style.display = 'none';
              if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
            }, 'image/jpeg', 0.9);
          });
        }
        
        if (avDelBtn) {
          avDelBtn.addEventListener('click', () => {
            this.avatarBlob = null;
            this.avatarDelete = true;
            if (avInput) avInput.value = '';
            avPrev.src = '';
            avPrev.style.display = 'none';
            avDelBtn.style.display = 'none';
          });
        }

      $('mpProfileForm').addEventListener('submit', e => this.onSaveProfile(e));
      $('pfStudy').addEventListener('change', () => this.syncProfileForm());
      $('pfResType').addEventListener('change', () => this.syncProfileForm());

      document.querySelectorAll('.mp-passbtn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.target;
          const input = $(targetId);
          if (!input) return;
          const isHidden = input.type === 'password';
          input.type = isHidden ? 'text' : 'password';
          const svg = btn.querySelector('svg');
          if (svg) {
            if (isHidden) {
              svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7.06 0-11.07-2.5-11.07-8.5 0-2.5.6-4.85 1.65-6.9l-1.65 1.65A12.06 12.06 0 0 0 1 12c0 5 3.5 9 9.5 9a10 10 0 0 0 4.95-1.52l1.55 1.55"/>';
            } else {
              svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            }
          }
        });
      });

      if (!window.supabase || !SUPABASE_READY) {
        this.showSetupBanner();
        return;
      }

      this.supabase = window.__maranathaSb || (window.__maranathaSb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey));

      this.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
          this.hasSession = true;
          this.lastActive = Date.now();
          this.setMemberMode(true);
          this.showDash();
          this.loadDashboard();
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          this.hasSession = false;
          this.setMemberMode(false);
          this.showAuth();
          const viewParams = new URLSearchParams(window.location.search);
          const view = viewParams.get('view');
          if (view === 'signin' || view === 'profile') {
            viewParams.delete('view');
            const qs = viewParams.toString();
            history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
            this.openSignInView(view === 'profile' ? 'Please sign in to view your profile.' : '');
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          this.hasSession = true;
          this.setMemberMode(true);
          this.showReset();
        }
      });

      this.initIdleTimeout();
    }

    /* ---------- Auto sign-out after 15 min of inactivity ---------- */

    onIdleTimeout() {
      if (!this.supabase || !this.hasSession) return;
      this.hasSession = false;
      this.profile = null;
      const msg = $('siMsg');
      if (msg) {
        msg.className = 'mp-msg';
        msg.textContent = this.pickLang(
          'Signed out automatically after 15 minutes of inactivity.',
          'Kutoka kiotomatiki baada ya dakika 15 bila shughuli.'
        );
      }
      if (window.MaranathaUserMenu) window.MaranathaUserMenu.setLoggedOut();
      if (window.MaranathaNotifier && typeof window.MaranathaNotifier.onMemberSignedOut === 'function') {
        window.MaranathaNotifier.onMemberSignedOut();
      }
      this.supabase.auth.signOut();
      this.setMemberMode(false);
      this.showAuth();
    }

    initIdleTimeout() {
      const IDLE_MS = 15 * 60 * 1000;
      const bump = () => { this.lastActive = Date.now(); };
      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(ev =>
        window.addEventListener(ev, bump, { passive: true })
      );
      this.lastActive = Date.now();
      this.hasSession = false;
      setInterval(() => {
        if (!this.supabase || !this.hasSession) return;
        if (Date.now() - this.lastActive > IDLE_MS) {
          this.onIdleTimeout();
        }
      }, 15000);
    }
  }

  const portal = new MemberPortal();
  window.MemberPortal = MemberPortal;
  window.portal = portal;
  window.switchDashboardSection = sectionId => portal.switchDashboardSection(sectionId);
  portal.init();
})();

