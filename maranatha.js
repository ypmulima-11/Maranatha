(function () {
  'use strict';

  /* =====================================================================
     CONTENT SYSTEM
     The site renders its editable sections from content.json (source of
     truth, editable via admin.html). SiteContent.DEFAULT is a snapshot
     used when the fetch fails (e.g. opening index.html directly from
     disk). Admin edits go into content.json; keep the snapshot in sync.
     ===================================================================== */

  /* ---------- DOM / formatting utilities ---------- */

  class El {
    static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    static get(id) {
      return document.getElementById(id);
    }

    static make(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    static pad2(n) {
      return String(n).padStart(2, '0');
    }

    static parseDate(iso) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
      if (!m) return { day: '--', month: '---', year: '----' };
      return {
        day: m[3],
        month: El.MONTHS[parseInt(m[2], 10) - 1],
        year: m[1],
        full: m[1] + '-' + m[2] + '-' + m[3]
      };
    }

    static toEmbed(url) {
      if (!url) return '';
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
      return m ? 'https://www.youtube.com/embed/' + m[1] : url;
    }
  }

  /* ---------- Content source ---------- */

  class SiteContent {
    static DEFAULT = {
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

    static async fetchLive() {
      try {
        const r = await fetch('content.json?t=' + Date.now());
        if (!r.ok) return null;
        const json = await r.json();
        return json && json.news ? json : null;
      } catch (err) {
        return null;
      }
    }
  }

  /* ---------- Section renderers ---------- */

  class SectionRenderer {
    renderNews(list) {
      const g = El.get('nwList');
      if (!g) return;
      g.replaceChildren(...list.map(n => {
        const d = El.parseDate(n.date);
        const art = El.make('article', 'nwc');
        const wd = El.make('div', 'nwd');
        wd.appendChild(El.make('span', null, d.day));
        wd.appendChild(El.make('small', null, d.month + ' ' + d.year));
        art.appendChild(wd);
        art.appendChild(El.make('h3', null, n.title));
        art.appendChild(El.make('p', null, n.body));
        const a = El.make('a', 'nwlink', (n.linkText || 'Read more') + ' \u2192');
        a.href = n.linkHref || '#';
        if (/^https?:/.test(a.href)) a.target = '_blank';
        art.appendChild(a);
        return art;
      }));
    }

    renderEvents(list) {
      const g = El.get('evList');
      if (!g) return;
      g.replaceChildren(...list.map(ev => {
        const d = El.parseDate(ev.date);
        const card = El.make('div', 'evc');
        const h = El.make('div', 'evh');
        h.appendChild(El.make('span', 'evd', d.day));
        const mi = El.make('div', 'evmi');
        mi.appendChild(El.make('span', 'evm', d.month));
        mi.appendChild(El.make('span', 'evy', d.year));
        h.appendChild(mi);
        card.appendChild(h);
        const b = El.make('div', 'evb');
        b.appendChild(El.make('div', 'evt', ev.title));
        const mt = (ev.place || '') + (ev.time ? ' \u00b7 ' + ev.time : '');
        b.appendChild(El.make('div', 'evmt', mt));
        if (ev.tag) b.appendChild(El.make('span', 'evtg', ev.tag));
        card.appendChild(b);
        return card;
      }));
    }

    renderVideos(list) {
      const g = El.get('vidList');
      if (!g) return;
      g.replaceChildren(...list.map(v => {
        const a = El.make('a', 'vid');
        a.href = v.href || '#';
        a.target = '_blank';
        a.rel = 'noopener';
        const th = El.make('div', 'vidth');
        const vpc = El.make('div', 'vpc');
        vpc.appendChild(El.make('div', 'vpt', null));
        th.appendChild(vpc);
        a.appendChild(th);
        const b = El.make('div', 'vidb');
        b.appendChild(El.make('div', 'vidt', v.title));
        b.appendChild(El.make('div', 'vidp', v.sub));
        a.appendChild(b);
        return a;
      }));
    }

    renderTeam(list) {
      const g = El.get('tmList');
      if (!g) return;
      g.replaceChildren(...list.map(t => {
        const c = El.make('div', 'tmc');
        c.appendChild(El.make('div', 'tma', t.initials));
        c.appendChild(El.make('div', 'tmn', t.name));
        c.appendChild(El.make('div', 'tmr', t.role));
        return c;
      }));
    }

    renderMembers(list) {
      const g = El.get('msList');
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
        const box = El.make('div', 'msp');
        box.appendChild(El.make('h3', null, part));
        const l = El.make('div', 'msl');
        groups[part].forEach(s => {
          const row = El.make('div', 'msm');
          row.appendChild(El.make('div', 'msa', s.initials));
          const x = El.make('div', 'msx');
          x.appendChild(El.make('div', 'msn', s.name));
          x.appendChild(El.make('div', 'msr', s.role));
          row.appendChild(x);
          l.appendChild(row);
        });
        box.appendChild(l);
        return box;
      }));
    }

    renderGallery(list) {
      const g = El.get('gaList');
      if (!g) return;
      g.replaceChildren(...(list || []).map(item => {
        const card = El.make('div', 'gam');
        if (item.video) {
          card.dataset.video = item.video;
          card.appendChild(El.make('div', 'gvthumb', '\u25B6'));
        } else {
          const img = document.createElement('img');
          img.src = item.src || '';
          img.alt = item.cap || 'Choir gallery photo';
          img.onerror = function () { this.style.display = 'none'; };
          card.appendChild(img);
        }
        const ov = El.make('div', 'gaov');
        ov.appendChild(El.make('div', 'gapl', '+'));
        card.appendChild(ov);
        return card;
      }));
    }

    renderWorks(list) {
      const g = El.get('muList');
      if (!g) return;
      g.replaceChildren(...(list || []).map(w => {
        const a = El.make('a', 'muc');
        a.href = w.href || '#';
        a.target = '_blank';
        const th = El.make('div', 'muth');
        const pc = El.make('div', 'pc');
        pc.appendChild(El.make('div', 'pt', null));
        th.appendChild(pc);
        th.appendChild(El.make('div', 'eq', null));
        a.appendChild(th);
        const b = El.make('div', 'mub');
        b.appendChild(El.make('div', 'mut', w.title));
        b.appendChild(El.make('div', 'mutp', w.sub));
        b.appendChild(El.make('div', 'muy', w.year));
        a.appendChild(b);
        return a;
      }));
    }

    renderAll(d) {
      if (!d) return;
      this.renderNews(d.news);
      this.renderEvents(d.events);
      this.renderVideos(d.videos);
      this.renderTeam(d.team);
      this.renderMembers(d.members);
      this.renderGallery(d.gallery);
      this.renderWorks(d.works);
    }
  }

  /* ---------- Static UI: mobile menu, language, scroll ---------- */

  class NavUI {
    constructor() {
      this.nmBtn = El.get('nmBtn');
      this.nmMenu = El.get('nmMenu');
    }

    closeMenu() {
      if (!this.nmMenu || !this.nmBtn) return;
      this.nmMenu.classList.remove('open');
      this.nmBtn.classList.remove('open');
      this.nmBtn.setAttribute('aria-expanded', 'false');
      this.nmBtn.setAttribute('aria-label', 'Open menu');
    }

    bindMenu() {
      if (!this.nmBtn || !this.nmMenu) return;
      this.nmBtn.addEventListener('click', () => {
        const open = this.nmMenu.classList.toggle('open');
        this.nmBtn.classList.toggle('open', open);
        this.nmBtn.setAttribute('aria-expanded', open);
        this.nmBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      this.nmMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => this.closeMenu()));
    }

    bindLanguage() {
      const langBtns = [...document.querySelectorAll('#tblang button')];
      langBtns.forEach(b => {
        b.addEventListener('click', () => I18n.set(b.dataset.lang));
      });
    }

    bindScroll() {
      const nav = document.querySelector('nav');
      const onScroll = () => {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
        const totop = El.get('totop');
        if (totop) totop.classList.toggle('show', window.scrollY > 500);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    bindSpy() {
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
    }

    bindReveal() {
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
    }

    bindCounters() {
      const counters = [...document.querySelectorAll('.sn[data-count]')];
      if (!counters.length || !('IntersectionObserver' in window)) return;
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

    bindToTop() {
      const totop = El.get('totop');
      if (totop) {
        totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      }
    }

    bindAll() {
      this.bindMenu();
      this.bindLanguage();
      this.bindScroll();
      this.bindSpy();
      this.bindReveal();
      this.bindCounters();
      this.bindToTop();
    }
  }

  /* ---------- Event countdown ---------- */

  class EventCountdown {
    constructor() {
      this.cdD = El.get('cdD');
      this.cdH = null;
      this.cdM = null;
      this.cdS = null;
      this.cdTitle = null;
      this.events = this.collect();
    }

    collect() {
      return [...document.querySelectorAll('.evc')].map(card => {
        const t = sel => (card.querySelector(sel) || { textContent: '' }).textContent;
        const day = parseInt(t('.evd'), 10);
        const month = t('.evm').trim();
        const year = parseInt(t('.evy'), 10);
        return { date: new Date(year, El.MONTHS.indexOf(month), day), title: t('.evt').trim() };
      }).filter(e => !isNaN(e.date));
    }

    update() {
      const now = new Date();
      let next = this.events.find(e => e.date >= now) || this.events[0];
      let diff = Math.max(0, next.date - now);
      if (diff === 0 && this.events.some(e => e.date > now)) {
        next = this.events.find(e => e.date > now);
        diff = next.date - now;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor(diff % 86400000 / 3600000);
      const m = Math.floor(diff % 3600000 / 60000);
      const s = Math.floor(diff % 60000 / 1000);
      this.cdD.textContent = El.pad2(d);
      this.cdH.textContent = El.pad2(h);
      this.cdM.textContent = El.pad2(m);
      this.cdS.textContent = El.pad2(s);
      if (this.cdTitle) this.cdTitle.textContent = next.title ? '\u2192 ' + next.title : '';
    }

    start() {
      if (!this.cdD || !this.events.length) return;
      this.cdH = El.get('cdH');
      this.cdM = El.get('cdM');
      this.cdS = El.get('cdS');
      this.cdTitle = El.get('cdTitle');
      this.update();
      setInterval(() => this.update(), 1000);
    }
  }

  /* ---------- Audio player (Web Audio synth demo) ---------- */

  class DemoPlayer {
    static NOTE_F = {
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00
    };
    static STEP = 0.26;
    static DEMO_SEQS = [
      ['C4', 'E4', 'G4', 'G4', 'A4', 'G4', 'E4', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'C4'],
      ['G4', 'A4', 'B4', 'C5', 'C5', 'B4', 'A4', 'G4'],
      ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4'],
      ['C5', 'D5', 'C5', 'A4', 'G4', 'E4', 'G4', 'A4', 'C4', 'E4', 'G4', 'C5']
    ];

    constructor() {
      this.btn = El.get('plrBtn');
      this.cards = [...document.querySelectorAll('.muc')];
      this.tracks = this.cards.map((c, i) => ({
        title: (c.querySelector('.mut') || { textContent: '' }).textContent.trim() || 'Song',
        sub: (c.querySelector('.mutp') || { textContent: '' }).textContent.trim() || '',
        seq: DemoPlayer.DEMO_SEQS[i % DemoPlayer.DEMO_SEQS.length]
      }));
      this.plrEq = El.get('plrEq');
      this.plrName = El.get('plrName');
      this.plrSub = El.get('plrSub');
      this.plrFill = El.get('plrFill');
      this.plrCur = El.get('plrCur');
      this.plrDur = El.get('plrDur');
      this.actx = null;
      this.master = null;
      this.trackIdx = 0;
      this.state = 'stopped';
      this.timer = null;
      this.nextTime = 0;
      this.pos = 0;
      this.noteIndex = 0;
    }

    ensureCtx() {
      if (!this.actx) {
        this.actx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.actx.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.actx.destination);
      }
      if (this.actx.state === 'suspended') this.actx.resume();
      return this.actx;
    }

    playNote(t, name) {
      const f = DemoPlayer.NOTE_F[name];
      if (!f) return;
      const o = this.actx.createOscillator();
      const g = this.actx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const d = DemoPlayer.STEP * 0.92;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + d + 0.02);
    }

    fmt(s) {
      return Math.floor(s / 60) + ':' + El.pad2(Math.floor(s % 60));
    }

    syncLabels() {
      const t = this.tracks[this.trackIdx] || this.tracks[0];
      if (this.plrName) this.plrName.textContent = t.title;
      if (this.plrSub) this.plrSub.textContent = t.sub;
      if (this.plrDur) this.plrDur.textContent = this.fmt(t.seq.length * DemoPlayer.STEP);
      if (this.plrFill) this.plrFill.style.width = '0%';
      if (this.plrCur) this.plrCur.textContent = '0:00';
    }

    setUI(playing) {
      this.plrBtn.innerHTML = playing ? '&#10073;&#10073;' : '&#9654;';
      this.plrBtn.setAttribute('aria-label', playing ? 'Pause demo song' : 'Play demo song');
      if (this.plrEq) this.plrEq.classList.toggle('playing', playing);
      this.cards.forEach((c, ci) => c.classList.toggle('playing', playing && ci === this.trackIdx));
    }

    schedule() {
      this.timer = setTimeout(() => this.schedule(), 60);
      const seq = this.tracks[this.trackIdx].seq;
      const total = seq.length * DemoPlayer.STEP;
      while (this.nextTime < this.actx.currentTime + 0.08) {
        const n = seq[this.noteIndex % seq.length];
        this.playNote(this.nextTime, n);
        this.noteIndex = (this.noteIndex + 1) % seq.length;
        this.nextTime += DemoPlayer.STEP;
        this.pos += DemoPlayer.STEP;
        if (this.plrFill) this.plrFill.style.width = ((this.pos % total) / total * 100) + '%';
        if (this.plrCur) this.plrCur.textContent = this.fmt(this.pos % total);
      }
    }

    stopSched() {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    }

    begin(i) {
      this.stopSched();
      this.ensureCtx();
      this.trackIdx = i % this.tracks.length;
      this.noteIndex = 0;
      this.pos = 0;
      this.nextTime = this.actx.currentTime + 0.08;
      this.syncLabels();
      this.state = 'playing';
      this.schedule();
      this.setUI(true);
    }

    pauseSong() {
      this.stopSched();
      if (this.master && this.actx) this.master.gain.setTargetAtTime(0, this.actx.currentTime, 0.02);
      this.state = 'paused';
      this.setUI(false);
    }

    resumeSong() {
      this.ensureCtx();
      if (this.master) this.master.gain.setTargetAtTime(0.18, this.actx.currentTime, 0.02);
      this.nextTime = this.actx.currentTime + 0.06;
      this.state = 'playing';
      this.schedule();
      this.setUI(true);
    }

    bind() {
      if (!this.btn || !this.cards.length) return;
      this.btn.addEventListener('click', () => {
        if (this.state === 'playing') this.pauseSong();
        else if (this.state === 'paused') this.resumeSong();
        else this.begin(this.trackIdx);
      });
      this.syncLabels();
      this.cards.forEach((card, i) => {
        const btn = card.querySelector('.pc');
        if (!btn) return;
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          if (i === this.trackIdx && this.state === 'playing') this.pauseSong();
          else this.begin(i);
        });
      });
    }
  }

  /* ---------- Gallery lightbox ---------- */

  class GalleryLightbox {
    constructor() {
      this.items = [...document.querySelectorAll('.gam')];
      this.lb = El.get('lb');
      this.lbImg = El.get('lbImg');
      this.lbFrame = El.get('lbFrame');
      this.lbCap = El.get('lbCap');
      this.index = 0;
      this.lastFocus = null;
    }

    update() {
      const g = this.items[this.index];
      if (!g) return;
      const video = g.dataset.video;
      const img = g.querySelector('img');
      if (this.lbFrame) {
        this.lbFrame.style.display = video ? 'block' : 'none';
        this.lbFrame.src = video ? El.toEmbed(video) : '';
      }
      if (this.lbImg) {
        this.lbImg.style.display = video ? 'none' : '';
        if (!video && img) {
          this.lbImg.src = img.src;
          this.lbImg.alt = img.alt;
        }
      }
      if (this.lbCap) this.lbCap.textContent = (this.index + 1) + ' / ' + this.items.length;
    }

    open(i) {
      this.lastFocus = document.activeElement;
      this.index = (i + this.items.length) % this.items.length;
      this.update();
      this.lb.classList.add('open');
      this.lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      El.get('lbX').focus();
    }

    close() {
      this.lb.classList.remove('open');
      this.lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (this.lbFrame) this.lbFrame.src = '';
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    }

    bind() {
      if (!this.lb || !this.items.length) return;
      const lbX = El.get('lbX');
      const lbPrev = El.get('lbPrev');
      const lbNext = El.get('lbNext');
      this.items.forEach((g, i) => g.addEventListener('click', () => this.open(i)));
      this.lb.addEventListener('click', e => { if (e.target === this.lb) this.close(); });
      lbX.addEventListener('click', () => this.close());
      lbPrev.addEventListener('click', () => this.open(this.index - 1));
      lbNext.addEventListener('click', () => this.open(this.index + 1));
      document.addEventListener('keydown', e => {
        if (!this.lb.classList.contains('open')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.open(this.index - 1);
        if (e.key === 'ArrowRight') this.open(this.index + 1);
      });
    }
  }

  /* ---------- Forms (generic validation) ---------- */

  class FormValidator {
    static bindAll() {
      document.querySelectorAll('form[data-validate]').forEach(form => new FormValidator(form).bind());
    }

    constructor(form) {
      this.form = form;
      this.inputs = [...form.querySelectorAll('input, textarea, select')];
    }

    wrap(el) {
      return el.closest('.fld') || el;
    }

    msgFor(el) {
      return el.tagName === 'SELECT' ? 'Please choose an option.' : 'Please fill in this field.';
    }

    showErr(el, msg) {
      const w = this.wrap(el);
      w.classList.add('err');
      let m = w.querySelector('.fmsg');
      if (!m) {
        m = document.createElement('span');
        m.className = 'fmsg';
        w.appendChild(m);
      }
      m.textContent = msg;
    }

    clearErr(el) {
      const w = this.wrap(el);
      w.classList.remove('err');
      const m = w.querySelector('.fmsg');
      if (m) m.remove();
    }

    bind() {
      this.inputs.forEach(el => el.addEventListener('input', () => this.clearErr(el)));

      this.form.addEventListener('submit', e => {
        e.preventDefault();
        let ok = true;
        this.form.querySelectorAll('[required]').forEach(el => {
          const v = el.value.trim();
          if (!v) {
            this.showErr(el, this.msgFor(el));
            ok = false;
          } else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            this.showErr(el, 'Please enter a valid email address.');
            ok = false;
          }
        });
        if (!ok) return;
        this.form.reset();
        const okEl = this.form.querySelector('.form-ok');
        if (okEl) {
          okEl.classList.add('show');
          okEl.setAttribute('role', 'status');
          setTimeout(() => okEl.classList.remove('show'), 5000);
        }
      });
    }
  }

  /* ---------- App bootstrap ---------- */

  class SiteApp {
    constructor() {
      this.renderer = new SectionRenderer();
      this.nav = new NavUI();
    }

    async boot() {
      I18n.init();
      this.nav.bindAll();
      FormValidator.bindAll();
      this.renderer.renderAll(SiteContent.DEFAULT);
      const live = await SiteContent.fetchLive();
      if (live) this.renderer.renderAll(live);
      new EventCountdown().start();
      const player = new DemoPlayer();
      player.bind();
      new GalleryLightbox().bind();
    }
  }

  new SiteApp().boot();
})();
