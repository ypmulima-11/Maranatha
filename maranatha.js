(function () {
  'use strict';

  /* =====================================================================
     CONTENT SYSTEM
     The site renders its editable sections from content.json (source of
     truth, editable via admin.html). DEFAULT_CONTENT below is a snapshot
     used when the fetch fails (e.g. opening index.html directly from
     disk). Admin edits go into content.json; keep this snapshot in sync.
     ===================================================================== */

  const DEFAULT_CONTENT = {
    news: [
      { date: '2026-07-28', title: 'Rehearsals continue every Thursday', body: 'Our regular rehearsals take place every Thursday at 6:30 PM in the parish hall. New voices are always welcome.', linkText: 'Join us', linkHref: '#join' },
      { date: '2026-07-19', title: 'Thanks for the Annual Concert', body: 'We are grateful to everyone who attended and supported our Annual Concert. Highlights are now on our YouTube channel.', linkText: 'Watch highlights', linkHref: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' },
      { date: '2026-07-05', title: 'Follow our social media', body: 'Stay up to date with our performances by following us on YouTube, Instagram and TikTok.', linkText: 'Follow us', linkHref: '#contact' }
    ],
    events: [
      { date: '2026-08-16', time: '9:00 AM', place: 'Parish Church', title: 'Sunday Mass Performance', tag: 'Liturgy' },
      { date: '2026-09-06', time: '4:00 PM', place: 'Community Hall', title: 'Maranatha Annual Concert', tag: 'Concert' },
      { date: '2026-10-11', time: '9:00 AM', place: 'Parish Church', title: 'Special Worship Service', tag: 'Liturgy' },
      { date: '2026-12-20', time: '5:00 PM', place: 'Main Auditorium', title: 'Christmas Carol Gala', tag: 'Concert' }
    ],
    videos: [
      { title: 'Bwana ni Mchungaji — Live', sub: 'Sunday Mass · 2025', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' },
      { title: 'Maranatha Annual Gala', sub: 'Concert Highlights · 2025', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' },
      { title: 'Christmas Carol Gala', sub: 'Main Auditorium · 2024', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' }
    ],
    team: [
      { initials: 'CD', name: 'Choir Director', role: 'Director & Conductor' },
      { initials: 'AM', name: 'Asst. Music Dir.', role: 'Music Director' },
      { initials: 'KP', name: 'Keyboard Player', role: 'Instrumentalist' },
      { initials: 'SL', name: 'Section Leader', role: 'Soprano Lead' },
      { initials: 'TR', name: 'Treasurer', role: 'Finance' },
      { initials: 'SE', name: 'Secretary', role: 'Administration' }
    ],
    members: [
      { part: 'Soprano', initials: 'EM', name: 'E. Mwaijande', role: 'Soprano Lead' },
      { part: 'Soprano', initials: 'JT', name: 'J. Temu', role: 'Soprano' },
      { part: 'Alto', initials: 'NK', name: 'N. Komba', role: 'Alto Lead' },
      { part: 'Alto', initials: 'LR', name: 'L. Rweyemamu', role: 'Alto' },
      { part: 'Tenor', initials: 'PM', name: 'P. Mwakalinga', role: 'Tenor Lead' },
      { part: 'Tenor', initials: 'KK', name: 'K. Kimaro', role: 'Tenor' },
      { part: 'Bass', initials: 'DN', name: 'D. Nyerere', role: 'Bass Lead' },
      { part: 'Bass', initials: 'MU', name: 'M. Urio', role: 'Bass' }
    ],
    gallery: [
      { src: 'images/gallery1.jpg', cap: 'Choir performance' },
      { src: 'images/gallery2.jpg', cap: 'Choir performance' },
      { src: 'images/gallery3.jpg', cap: 'Choir performance' },
      { src: 'images/gallery4.jpg', cap: 'Choir performance' }
    ],
    works: [
      { title: 'Bwana ni Mchungaji', sub: 'Hymn · Live Recording', year: '2025', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' },
      { title: 'Mungu ni Mwema', sub: 'Praise · Studio', year: '2025', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' },
      { title: 'Neema ya Bwana', sub: 'Worship · Live Recording', year: '2024', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' },
      { title: 'Shangwe na Furaha', sub: 'Hymn · Studio', year: '2024', href: 'https://www.youtube.com/@kwayayamaranatha-udsm3802' }
    ]
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DEMO_SEQS = [
    ['C4', 'E4', 'G4', 'G4', 'A4', 'G4', 'E4', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'C4'],
    ['G4', 'A4', 'B4', 'C5', 'C5', 'B4', 'A4', 'G4'],
    ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4'],
    ['C5', 'D5', 'C5', 'A4', 'G4', 'E4', 'G4', 'A4', 'C4', 'E4', 'G4', 'C5']
  ];

  const $ = id => document.getElementById(id);

  const makeEl = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const pad2 = n => String(n).padStart(2, '0');

  function parseDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return { day: '--', month: '---', year: '----' };
    return {
      day: m[3],
      month: MONTHS[parseInt(m[2], 10) - 1],
      year: m[1],
      full: m[1] + '-' + m[2] + '-' + m[3]
    };
  }

  function toEmbed(url) {
    if (!url) return '';
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return m ? 'https://www.youtube.com/embed/' + m[1] : url;
  }

  /* ---------- Section renderers ---------- */

  function renderNews(list) {
    const g = $('nwList');
    if (!g) return;
    g.replaceChildren(...list.map(n => {
      const d = parseDate(n.date);
      const art = makeEl('article', 'nwc');
      const wd = makeEl('div', 'nwd');
      wd.appendChild(makeEl('span', null, d.day));
      wd.appendChild(makeEl('small', null, d.month + ' ' + d.year));
      art.appendChild(wd);
      art.appendChild(makeEl('h3', null, n.title));
      art.appendChild(makeEl('p', null, n.body));
      const a = makeEl('a', 'nwlink', (n.linkText || 'Read more') + ' \u2192');
      a.href = n.linkHref || '#';
      if (/^https?:/.test(a.href)) a.target = '_blank';
      art.appendChild(a);
      return art;
    }));
  }

  function renderEvents(list) {
    const g = $('evList');
    if (!g) return;
    g.replaceChildren(...list.map(ev => {
      const d = parseDate(ev.date);
      const card = makeEl('div', 'evc');
      const h = makeEl('div', 'evh');
      h.appendChild(makeEl('span', 'evd', d.day));
      const mi = makeEl('div', 'evmi');
      mi.appendChild(makeEl('span', 'evm', d.month));
      mi.appendChild(makeEl('span', 'evy', d.year));
      h.appendChild(mi);
      card.appendChild(h);
      const b = makeEl('div', 'evb');
      b.appendChild(makeEl('div', 'evt', ev.title));
      const mt = (ev.place || '') + (ev.time ? ' \u00b7 ' + ev.time : '');
      b.appendChild(makeEl('div', 'evmt', mt));
      if (ev.tag) b.appendChild(makeEl('span', 'evtg', ev.tag));
      card.appendChild(b);
      return card;
    }));
  }

  function renderVideos(list) {
    const g = $('vidList');
    if (!g) return;
    g.replaceChildren(...list.map(v => {
      const a = makeEl('a', 'vid');
      a.href = v.href || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      const th = makeEl('div', 'vidth');
      const vpc = makeEl('div', 'vpc');
      vpc.appendChild(makeEl('div', 'vpt', null));
      th.appendChild(vpc);
      a.appendChild(th);
      const b = makeEl('div', 'vidb');
      b.appendChild(makeEl('div', 'vidt', v.title));
      b.appendChild(makeEl('div', 'vidp', v.sub));
      a.appendChild(b);
      return a;
    }));
  }

  function renderTeam(list) {
    const g = $('tmList');
    if (!g) return;
    g.replaceChildren(...list.map(t => {
      const c = makeEl('div', 'tmc');
      c.appendChild(makeEl('div', 'tma', t.initials));
      c.appendChild(makeEl('div', 'tmn', t.name));
      c.appendChild(makeEl('div', 'tmr', t.role));
      return c;
    }));
  }

  function renderMembers(list) {
    const g = $('msList');
    if (!g) return;
    const PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];
    const groups = {};
    (list || []).forEach(s => {
      const p = s.part || 'Soprano';
      (groups[p] = groups[p] || []).push(s);
    });
    const order = Object.keys(groups).sort(
      (a, b) => (PARTS.indexOf(a) - PARTS.indexOf(b)) || a.localeCompare(b)
    );
    g.replaceChildren(...order.map(part => {
      const box = makeEl('div', 'msp');
      box.appendChild(makeEl('h3', null, part));
      const l = makeEl('div', 'msl');
      groups[part].forEach(s => {
        const row = makeEl('div', 'msm');
        row.appendChild(makeEl('div', 'msa', s.initials));
        const x = makeEl('div', 'msx');
        x.appendChild(makeEl('div', 'msn', s.name));
        x.appendChild(makeEl('div', 'msr', s.role));
        row.appendChild(x);
        l.appendChild(row);
      });
      box.appendChild(l);
      return box;
    }));
  }

  function renderGallery(list) {
    const g = $('gaList');
    if (!g) return;
    g.replaceChildren(...(list || []).map(item => {
      const card = makeEl('div', 'gam');
      if (item.video) {
        card.dataset.video = item.video;
        card.appendChild(makeEl('div', 'gvthumb', '\u25B6'));
      } else {
        const img = document.createElement('img');
        img.src = item.src || '';
        img.alt = item.cap || 'Choir gallery photo';
        img.onerror = function () { this.style.display = 'none'; };
        card.appendChild(img);
      }
      const ov = makeEl('div', 'gaov');
      ov.appendChild(makeEl('div', 'gapl', '+'));
      card.appendChild(ov);
      return card;
    }));
  }

  function renderWorks(list) {
    const g = $('muList');
    if (!g) return;
    g.replaceChildren(...(list || []).map(w => {
      const a = makeEl('a', 'muc');
      a.href = w.href || '#';
      a.target = '_blank';
      const th = makeEl('div', 'muth');
      const pc = makeEl('div', 'pc');
      pc.appendChild(makeEl('div', 'pt', null));
      th.appendChild(pc);
      th.appendChild(makeEl('div', 'eq', null));
      a.appendChild(th);
      const b = makeEl('div', 'mub');
      b.appendChild(makeEl('div', 'mut', w.title));
      b.appendChild(makeEl('div', 'mutp', w.sub));
      b.appendChild(makeEl('div', 'muy', w.year));
      a.appendChild(b);
      return a;
    }));
  }

  function renderContent(d) {
    if (!d) return;
    renderNews(d.news);
    renderEvents(d.events);
    renderVideos(d.videos);
    renderTeam(d.team);
    renderMembers(d.members);
    renderGallery(d.gallery);
    renderWorks(d.works);
  }

  /* ---------- Static UI: mobile menu, language, scroll ---------- */

  const nmBtn = $('nmBtn');
  const nmMenu = $('nmMenu');
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

  const nav = document.querySelector('nav');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    const totop = $('totop');
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

  function initCountdown() {
    const cdD = $('cdD');
    if (!cdD) return;
    const events = [...document.querySelectorAll('.evc')].map(card => {
      const t = sel => (card.querySelector(sel) || { textContent: '' }).textContent;
      const day = parseInt(t('.evd'), 10);
      const month = t('.evm').trim();
      const year = parseInt(t('.evy'), 10);
      return { date: new Date(year, MONTHS.indexOf(month), day), title: t('.evt').trim() };
    }).filter(e => !isNaN(e.date));
    if (!events.length) return;

    const cdH = $('cdH');
    const cdM = $('cdM');
    const cdS = $('cdS');
    const cdTitle = $('cdTitle');

    function updateCountdown() {
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
      cdD.textContent = pad2(d);
      cdH.textContent = pad2(h);
      cdM.textContent = pad2(m);
      cdS.textContent = pad2(s);
      if (cdTitle) cdTitle.textContent = next.title ? '\u2192 ' + next.title : '';
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  /* ---------- Audio player (Web Audio synth demo) ---------- */

  function initAudio() {
    const plrBtn = $('plrBtn');
    const cards = [...document.querySelectorAll('.muc')];
    if (!cards.length) return;

    const tracks = cards.map((c, i) => ({
      title: (c.querySelector('.mut') || { textContent: '' }).textContent.trim() || 'Song',
      sub: (c.querySelector('.mutp') || { textContent: '' }).textContent.trim() || '',
      seq: DEMO_SEQS[i % DEMO_SEQS.length]
    }));

    const plrEq = $('plrEq');
    const plrName = $('plrName');
    const plrSub = $('plrSub');
    const plrFill = $('plrFill');
    const plrCur = $('plrCur');
    const plrDur = $('plrDur');

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
      return Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60));
    }

    function syncLabels() {
      const t = tracks[trackIdx] || tracks[0];
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
      cards.forEach((c, ci) => c.classList.toggle('playing', playing && ci === trackIdx));
    }

    function schedule() {
      timer = setTimeout(schedule, 60);
      const seq = tracks[trackIdx].seq;
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
      trackIdx = i % tracks.length;
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

    cards.forEach((card, i) => {
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
  }

  /* ---------- Gallery lightbox ---------- */

  function bindLightbox() {
    const gamEls = [...document.querySelectorAll('.gam')];
    const lb = $('lb');
    if (!lb || !gamEls.length) return;
    const lbImg = $('lbImg');
    const lbFrame = $('lbFrame');
    const lbCap = $('lbCap');
    let lbIndex = 0;
    let lbLastFocus = null;

    function updateLb() {
      const g = gamEls[lbIndex];
      if (!g) return;
      const video = g.dataset.video;
      const img = g.querySelector('img');
      if (lbFrame) {
        lbFrame.style.display = video ? 'block' : 'none';
        lbFrame.src = video ? toEmbed(video) : '';
      }
      if (lbImg) {
        lbImg.style.display = video ? 'none' : '';
        if (!video && img) {
          lbImg.src = img.src;
          lbImg.alt = img.alt;
        }
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
      $('lbX').focus();
    }

    function closeLb() {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lbFrame) lbFrame.src = '';
      if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
    }

    gamEls.forEach((g, i) => g.addEventListener('click', () => openLb(i)));
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    $('lbX').addEventListener('click', closeLb);
    $('lbPrev').addEventListener('click', () => openLb(lbIndex - 1));
    $('lbNext').addEventListener('click', () => openLb(lbIndex + 1));
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
      if (e.key === 'ArrowRight') openLb(lbIndex + 1);
    });
  }

  /* ---------- Forms (generic validation) ---------- */

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
  });

  /* ---------- Back to top ---------- */

  const totop = $('totop');
  if (totop) {
    totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Boot: render fallback, then load content.json ---------- */

  const NOTE_F = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00
  };
  const STEP = 0.26;

  renderContent(DEFAULT_CONTENT);

  fetch('content.json?t=' + Date.now())
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(json => {
      if (json && json.news) renderContent(json);
      initCountdown();
      initAudio();
      bindLightbox();
    });
})();
