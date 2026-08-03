(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  const nmBtn = document.getElementById('nmBtn');
  const nmMenu = document.getElementById('nmMenu');
  const closeMenu = () => {
    if (!nmMenu || !nmBtn) return;
    nmMenu.classList.remove('open');
    nmBtn.classList.remove('open');
    nmBtn.setAttribute('aria-expanded', 'false');
    nmBtn.setAttribute('aria-label', 'Open menu');
  };
  if (nmBtn && nmMenu) {
    nmBtn.addEventListener('click', () => {
      const open = nmMenu.classList.toggle('open');
      nmBtn.classList.toggle('open', open);
      nmBtn.setAttribute('aria-expanded', open);
      nmBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nmMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  }

  /* ---------- Language switcher (visual) ---------- */
  const langBtns = [...document.querySelectorAll('#tblang button')];
  langBtns.forEach(b => {
    b.addEventListener('click', () => {
      langBtns.forEach(x => {
        x.classList.remove('on');
        x.setAttribute('aria-pressed', 'false');
      });
      b.classList.add('on');
      b.setAttribute('aria-pressed', 'true');
    });
  });

  /* ---------- Navbar: shadow on scroll + scrollspy ---------- */
  const nav = document.querySelector('nav');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    const totop = document.getElementById('totop');
    if (totop) totop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = [...document.querySelectorAll('.nl a[href^="#"]')];
  const spyMap = new Map();
  navLinks.forEach(a => {
    const sec = document.getElementById(a.getAttribute('href').slice(1));
    if (sec) spyMap.set(sec.id, a);
  });
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = spyMap.get(e.target.id);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  spyMap.forEach((link, id) => spy.observe(document.getElementById(id)));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal, .rev-stagger');
  if ('IntersectionObserver' in window) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => ro.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Animated stats counters ---------- */
  const counters = [...document.querySelectorAll('.sn[data-count]')];
  if (counters.length && 'IntersectionObserver' in window) {
    const co = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const dur = 1200;
        const start = performance.now();
        const step = now => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + '+';
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target + '+';
        };
        requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => co.observe(c));
  }

  /* ---------- Event countdown ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const events = [...document.querySelectorAll('.evc')].map(card => {
    const t = el => (card.querySelector(el) || { textContent: '' }).textContent;
    const day = parseInt(t('.evd'), 10);
    const month = t('.evm').trim();
    const year = parseInt(t('.evy'), 10);
    return { date: new Date(year, MONTHS.indexOf(month), day), title: t('.evt').trim() };
  }).filter(e => !isNaN(e.date));

  const cdD = document.getElementById('cdD');
  const cdH = document.getElementById('cdH');
  const cdM = document.getElementById('cdM');
  const cdS = document.getElementById('cdS');
  const cdTitle = document.getElementById('cdTitle');

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    if (!cdD || !events.length) return;
    const now = new Date();
    let next = events.find(e => e.date >= now) || events[0];
    let diff = Math.max(0, next.date - now);
    if (diff === 0 && events.some(e => e.date > now)) {
      next = events.find(e => e.date > now);
      diff = next.date - now;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff % 86400000 / 3600000);
    const m = Math.floor(diff % 3600000 / 60000);
    const s = Math.floor(diff % 60000 / 1000);
    cdD.textContent = pad(d);
    cdH.textContent = pad(h);
    cdM.textContent = pad(m);
    cdS.textContent = pad(s);
    if (cdTitle) cdTitle.textContent = next.title ? '→ ' + next.title : '';
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------- Audio player (Web Audio demo) ---------- */
  const NOTE_F = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00
  };
  const TRACKS = [
    { title: 'Bwana ni Mchungaji', sub: 'Hymn · Live Demo', seq: ['C4', 'E4', 'G4', 'G4', 'A4', 'G4', 'E4', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'C4'] },
    { title: 'Mungu ni Mwema', sub: 'Praise · Studio Demo', seq: ['G4', 'A4', 'B4', 'C5', 'C5', 'B4', 'A4', 'G4'] },
    { title: 'Neema ya Bwana', sub: 'Worship · Live Demo', seq: ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4'] },
    { title: 'Shangwe na Furaha', sub: 'Hymn · Studio Demo', seq: ['C5', 'D5', 'C5', 'A4', 'G4', 'E4', 'G4', 'A4', 'C4', 'E4', 'G4', 'C5'] }
  ];
  const STEP = 0.26;

  const plrEq = document.getElementById('plrEq');
  const plrName = document.getElementById('plrName');
  const plrSub = document.getElementById('plrSub');
  const plrBtn = document.getElementById('plrBtn');
  const plrFill = document.getElementById('plrFill');
  const plrCur = document.getElementById('plrCur');
  const plrDur = document.getElementById('plrDur');

  let actx = null, master = null;
  let trackIdx = 0, state = 'stopped';
  let timer = null, nextTime = 0, pos = 0, noteIndex = 0;

  function ensureCtx() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.18;
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function playNote(t, name) {
    const f = NOTE_F[name];
    if (!f) return;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    const d = STEP * 0.92;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + d + 0.02);
  }
  function fmt(s) {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return m + ':' + String(ss).padStart(2, '0');
  }
  function syncLabels() {
    const t = TRACKS[trackIdx];
    if (plrName) plrName.textContent = t.title;
    if (plrSub) plrSub.textContent = t.sub;
    if (plrDur) plrDur.textContent = fmt(t.seq.length * STEP);
    if (plrFill) plrFill.style.width = '0%';
    if (plrCur) plrCur.textContent = '0:00';
  }
  function setUI(playing) {
    plrBtn.innerHTML = playing ? '&#10073;&#10073;' : '&#9654;';
    plrBtn.setAttribute('aria-label', playing ? 'Pause demo song' : 'Play demo song');
    if (plrEq) plrEq.classList.toggle('playing', playing);
    document.querySelectorAll('.muc').forEach((c, ci) =>
      c.classList.toggle('playing', playing && ci === trackIdx)
    );
  }
  function schedule() {
    timer = setTimeout(schedule, 60);
    const seq = TRACKS[trackIdx].seq;
    const total = seq.length * STEP;
    while (nextTime < actx.currentTime + 0.08) {
      const n = seq[noteIndex % seq.length];
      playNote(nextTime, n);
      noteIndex = (noteIndex + 1) % seq.length;
      nextTime += STEP;
      pos += STEP;
      if (plrFill) plrFill.style.width = ((pos % total) / total * 100) + '%';
      if (plrCur) plrCur.textContent = fmt(pos % total);
    }
  }
  function stopSched() {
    if (timer) { clearTimeout(timer); timer = null; }
  }
  function begin(i) {
    stopSched();
    ensureCtx();
    trackIdx = i;
    noteIndex = 0;
    pos = 0;
    nextTime = actx.currentTime + 0.08;
    syncLabels();
    state = 'playing';
    schedule();
    setUI(true);
  }
  function pauseSong() {
    stopSched();
    if (master && actx) master.gain.setTargetAtTime(0, actx.currentTime, 0.02);
    state = 'paused';
    setUI(false);
  }
  function resumeSong() {
    ensureCtx();
    if (master) master.gain.setTargetAtTime(0.18, actx.currentTime, 0.02);
    nextTime = actx.currentTime + 0.06;
    state = 'playing';
    schedule();
    setUI(true);
  }

  if (plrBtn) {
    plrBtn.addEventListener('click', () => {
      if (state === 'playing') pauseSong();
      else if (state === 'paused') resumeSong();
      else begin(trackIdx);
    });
    syncLabels();
  }

  document.querySelectorAll('.muc').forEach((card, i) => {
    const btn = card.querySelector('.pc');
    if (!btn) return;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (i === trackIdx && state === 'playing') pauseSong();
      else begin(i);
    });
  });

  /* ---------- Gallery lightbox ---------- */
  const gamEls = [...document.querySelectorAll('.gam')];
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lbImg');
  const lbCap = document.getElementById('lbCap');
  let lbIndex = 0;
  let lbLastFocus = null;

  function updateLb() {
    if (!gamEls[lbIndex]) return;
    const img = gamEls[lbIndex].querySelector('img');
    if (img) {
      lbImg.src = img.src;
      lbImg.alt = img.alt;
    }
    if (lbCap) lbCap.textContent = (lbIndex + 1) + ' / ' + gamEls.length;
  }
  function openLb(i) {
    lbLastFocus = document.activeElement;
    lbIndex = (i + gamEls.length) % gamEls.length;
    updateLb();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('lbX').focus();
  }
  function closeLb() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
  }

  if (lb && gamEls.length) {
    gamEls.forEach((g, i) => g.addEventListener('click', () => openLb(i)));
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    document.getElementById('lbX').addEventListener('click', closeLb);
    document.getElementById('lbPrev').addEventListener('click', () => openLb(lbIndex - 1));
    document.getElementById('lbNext').addEventListener('click', () => openLb(lbIndex + 1));
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
      if (e.key === 'ArrowRight') openLb(lbIndex + 1);
    });
  }

  /* ---------- Form validation (contact + audition) ---------- */
  document.querySelectorAll('form[data-validate]').forEach(form => {
    const inputs = [...form.querySelectorAll('input, textarea, select')];
    const wrap = el => el.closest('.fld') || el;
    const showErr = (el, msg) => {
      const w = wrap(el);
      w.classList.add('err');
      let m = w.querySelector('.fmsg');
      if (!m) {
        m = document.createElement('span');
        m.className = 'fmsg';
        w.appendChild(m);
      }
      m.textContent = msg;
    };
    const clearErr = el => {
      const w = wrap(el);
      w.classList.remove('err');
      const m = w.querySelector('.fmsg');
      if (m) m.remove();
    };
    const msgFor = el => el.tagName === 'SELECT' ? 'Please choose an option.' : 'Please fill in this field.';

    inputs.forEach(el => el.addEventListener('input', () => clearErr(el)));

    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[required]').forEach(el => {
        const v = el.value.trim();
        if (!v) {
          showErr(el, msgFor(el));
          ok = false;
        } else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          showErr(el, 'Please enter a valid email address.');
          ok = false;
        }
      });
      if (!ok) return;
      form.reset();
      const okEl = form.querySelector('.form-ok');
      if (okEl) {
        okEl.classList.add('show');
        okEl.setAttribute('role', 'status');
        setTimeout(() => okEl.classList.remove('show'), 5000);
      }
    });
  }

  /* ---------- Back to top ---------- */
  const totop = document.getElementById('totop');
  if (totop) {
    totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
})();
