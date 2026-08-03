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

  /* ---------- Music player (visual demo) ---------- */
  document.querySelectorAll('.muc').forEach(card => {
    const btn = card.querySelector('.pc');
    if (!btn) return;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const wasPlaying = card.classList.contains('playing');
      document.querySelectorAll('.muc.playing').forEach(c => c.classList.remove('playing'));
      if (!wasPlaying) card.classList.add('playing');
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
