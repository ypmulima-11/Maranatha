/* =====================================================================
   UI KIT — custom select + calendar + lightbox
   ---------------------------------------------------------------------
   Progressive enhancement. The native <select> / <input type="date"> stay
   in the DOM and keep owning the value, so every existing form handler,
   validator and database insert keeps working. We only replace the look.

   window.UI.enhanceAll()  — run once per page (auto-runs on DOMContentLoaded)
   window.UI.select(el)     — upgrade a single <select>
   window.UI.date(el)       — upgrade a single date input
   window.UI.lightbox(src, caption)
   ===================================================================== */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SPRITE = 'assets/icons.svg';

  function icon(id, cls) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'ic ' + (cls || 'ic-16'));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', SPRITE + '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /* Read the caption of the field a control belongs to. The control may be
     wrapped by a <label>, which then also contains the generated dropdown
     list, so the clone is stripped before the text is read. */
  function labelText(el) {
    const id = el.id;
    if (id) {
      const forEl = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (forEl) {
        const t = forEl.textContent.replace(/\s+/g, ' ').trim();
        if (t) return t;
      }
    }
    const lab = el.closest('label');
    if (lab) {
      const copy = lab.cloneNode(true);
      const c = copy.querySelector(el.tagName.toLowerCase());
      const holder = c && c.parentElement;
      if (holder && (holder.classList.contains('ui-sel') || holder.classList.contains('ui-date'))) holder.remove();
      copy.querySelectorAll('select, option, input, textarea, button').forEach(n => n.remove());
      const t = copy.textContent.replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
    return '';
  }

  function todayISO() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }

  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function fmtDate(d, lang) {
    try {
      return new Intl.DateTimeFormat(lang || document.documentElement.lang || 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    } catch (e) {
      return d.toDateString();
    }
  }

  /* =====================================================================
     SELECT
     ===================================================================== */

  class Select {
    constructor(sel) {
      this.sel = sel;
      this.isOpen = false;
      this.active = 0;
      this.typeahead = '';
      this.typeaheadTimer = null;
      this.build();
    }

    build() {
      const sel = this.sel;
      if (sel.dataset.uiSel) return;
      sel.dataset.uiSel = '1';

      const wrap = document.createElement('span');
      wrap.className = 'ui-sel';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);

      this.btn = document.createElement('button');
      this.btn.type = 'button';
      this.btn.className = 'ui-ctl';
      this.btn.setAttribute('aria-haspopup', 'listbox');
      this.btn.setAttribute('aria-expanded', 'false');
      this.val = document.createElement('span');
      this.val.className = 'ui-ctl-val';
      this.btn.appendChild(this.val);
      this.btn.appendChild(icon('i-chevronDown', 'ic-16 ui-ctl-ic chev'));
      wrap.appendChild(this.btn);

      this.list = document.createElement('div');
      this.list.className = 'ui-sel-list';
      this.list.setAttribute('role', 'listbox');
      wrap.appendChild(this.list);

      sel.classList.add('ui-sel-native');
      sel.setAttribute('tabindex', '-1');
      sel.setAttribute('aria-hidden', 'true');

      if (sel.disabled) {
        this.btn.disabled = true;
      }

      this.btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        this.isOpen ? this.close() : this.open();
      });

      this.btn.addEventListener('keydown', e => this.onKey(e));

      sel.addEventListener('change', () => this.sync());

      this.observer = new MutationObserver(() => this.rebuild());
      this.observer.observe(sel, { childList: true, subtree: true });

      const form = sel.form;
      if (form) form.addEventListener('reset', () => setTimeout(() => this.sync(), 0));

      watch(this.sel, () => this.sel.selectedIndex, () => this.sync());
      this.rebuild();
    }

    options() {
      return Array.from(this.sel.options);
    }

    rebuild() {
      const opts = this.options();
      this.list.replaceChildren();
      opts.forEach((opt, ix) => {
        const o = document.createElement('div');
        o.className = 'ui-sel-opt';
        o.setAttribute('role', 'option');
        o.setAttribute('data-ix', String(ix));
        o.id = 'uisel-' + Math.random().toString(36).slice(2, 9);
        o.textContent = opt.textContent;
        if (opt.disabled) {
          o.setAttribute('aria-disabled', 'true');
          o.style.opacity = '.45';
        }
        o.addEventListener('mousedown', e => e.preventDefault());
        o.addEventListener('click', () => this.pick(ix));
        this.list.appendChild(o);
      });
      this.active = Math.max(0, opts.findIndex(o => o.selected));
      this.sync();
    }

    sync() {
      const opts = this.options();
      const ix = this.sel.selectedIndex;
      const opt = opts[ix];
      const text = opt ? opt.textContent.trim() : '';
      const isPlaceholder = !this.sel.value || (ix === 0 && opts.length > 1 && opts[0].value === '' && this.sel.multiple !== true);
      this.val.textContent = text || this.placeholder();
      this.val.classList.toggle('is-ph', isPlaceholder);
      const base = this.sel.getAttribute('aria-label') || this.fieldLabel();
      const state = text && text !== base ? ': ' + text : '';
      this.btn.setAttribute('aria-label', base ? base + state : (text || 'Select'));
      Array.from(this.list.children).forEach((o, i) => {
        const oo = opts[i];
        o.setAttribute('aria-selected', oo && oo.selected ? 'true' : 'false');
      });
    }

    fieldLabel() {
      return labelText(this.sel);
    }

    placeholder() {
      const opts = this.options();
      if (opts.length && opts[0].value === '' && opts[0].textContent.trim()) return opts[0].textContent.trim();
      return this.sel.getAttribute('data-ph') || 'Select…';
    }

    open() {
      if (this.sel.disabled) return;
      if (this.isOpen) return;
      this.isOpen = true;
      this.wrap = this.sel.parentNode;
      this.wrap.classList.add('open');
      this.btn.setAttribute('aria-expanded', 'true');
      this.sync();
      this.setActive(this.active, false);
      // flip up when there is no room below
      const r = this.btn.getBoundingClientRect();
      const room = window.innerHeight - r.bottom;
      if (room < 260 && r.top > 260) this.list.classList.add('up');
      else this.list.classList.remove('up');
      setTimeout(() => document.addEventListener('click', this.onDocClick, true), 0);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.wrap.classList.remove('open');
      this.btn.setAttribute('aria-expanded', 'false');
      this.list.classList.remove('up');
      document.removeEventListener('click', this.onDocClick, true);
    }

    onDocClick = e => {
      if (this.wrap && !this.wrap.contains(e.target)) this.close();
    };

    setActive(ix, scroll) {
      const opts = this.options();
      if (!opts.length) return;
      this.active = (ix + opts.length) % opts.length;
      Array.from(this.list.children).forEach((o, i) => {
        o.classList.toggle('act', i === this.active);
      });
      const el = this.list.children[this.active];
      if (el) {
        this.btn.setAttribute('aria-activedescendant', el.id);
        if (scroll !== false && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      }
    }

    pick(ix) {
      const opts = this.options();
      if (!opts[ix] || opts[ix].disabled) return;
      this.sel.selectedIndex = ix;
      this.sel.dispatchEvent(new Event('input', { bubbles: true }));
      this.sel.dispatchEvent(new Event('change', { bubbles: true }));
      this.close();
      this.btn.focus();
    }

    onKey(e) {
      const k = e.key;
      if (!this.isOpen) {
        if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
          e.preventDefault();
          this.open();
          if (k === 'ArrowUp') this.setActive(this.active - 1);
        }
        return;
      }
      if (k === 'Escape') { e.preventDefault(); this.close(); this.btn.focus(); return; }
      if (k === 'ArrowDown') { e.preventDefault(); this.setActive(this.active + 1); return; }
      if (k === 'ArrowUp') { e.preventDefault(); this.setActive(this.active - 1); return; }
      if (k === 'Home') { e.preventDefault(); this.setActive(0); return; }
      if (k === 'End') { e.preventDefault(); this.setActive(this.options().length - 1); return; }
      if (k === 'Enter' || k === ' ') { e.preventDefault(); this.pick(this.active); return; }
      if (k === 'Tab') { this.close(); return; }
      if (k.length === 1) {
        this.typeahead += k.toLowerCase();
        clearTimeout(this.typeaheadTimer);
        this.typeaheadTimer = setTimeout(() => { this.typeahead = ''; }, 700);
        const opts = this.options();
        const ix = opts.findIndex(o => o.textContent.toLowerCase().startsWith(this.typeahead));
        if (ix >= 0) this.setActive(ix);
      }
    }
  }

  /* =====================================================================
     DATE / DATE-TIME
     ===================================================================== */

  const MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sw: ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
  };
  const DAYS = {
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    sw: ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili']
  };

  class DateField {
    constructor(input) {
      this.input = input;
      this.withTime = input.type === 'datetime-local';
      this.isOpen = false;
      this.view = new Date();
      this.build();
    }

    build() {
      const input = this.input;
      if (input.dataset.uiDate) return;
      input.dataset.uiDate = '1';

      const wrap = document.createElement('span');
      wrap.className = 'ui-date';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      this.btn = document.createElement('button');
      this.btn.type = 'button';
      this.btn.className = 'ui-ctl';
      this.val = document.createElement('span');
      this.val.className = 'ui-ctl-val';
      this.btn.appendChild(this.val);
      this.btn.appendChild(icon('i-calendar', 'ic-16 ui-ctl-ic ic-cal'));
      wrap.appendChild(this.btn);

      this.cal = document.createElement('div');
      this.cal.className = 'ui-cal';
      wrap.appendChild(this.cal);

      input.classList.add('ui-date-native');
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
      if (input.disabled) this.btn.disabled = true;

      this.btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        this.isOpen ? this.close() : this.open();
      });
      this.btn.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); this.btn.focus(); }
      });
      input.addEventListener('change', () => this.sync());
      const form = input.form;
      if (form) form.addEventListener('reset', () => setTimeout(() => this.sync(), 0));

      watch(this.input, () => this.input.value, () => this.sync());
      this.render();
      this.sync();
    }

    sync() {
      const v = this.input.value;
      const base = this.input.getAttribute('aria-label') || labelText(this.input) ||
        (this.withTime ? 'Date & time' : 'Date');
      if (!v) {
        this.val.textContent = this.input.getAttribute('data-ph') || (this.withTime ? 'Date & time' : 'Date');
        this.val.classList.add('is-ph');
        this.btn.setAttribute('aria-label', base);
        return;
      }
      this.val.classList.remove('is-ph');
      const d = parseISO(v);
      if (!d) { this.val.textContent = v; return; }
      let s = fmtDate(d);
      if (this.withTime) {
        const t = v.indexOf('T');
        if (t > -1) s += ' · ' + v.slice(t + 1, t + 6);
      }
      this.val.textContent = s;
      this.btn.setAttribute('aria-label', base + ': ' + this.val.textContent);
    }

    open() {
      if (this.input.disabled) return;
      if (this.isOpen) return;
      this.isOpen = true;
      this.wrap = this.input.parentNode;
      this.wrap.classList.add('open');
      const d = parseISO(this.input.value) || new Date();
      this.view = new Date(d.getFullYear(), d.getMonth(), 1);
      this.render();
      const r = this.btn.getBoundingClientRect();
      if (window.innerHeight - r.bottom < 340 && r.top > 340) this.cal.classList.add('up');
      else this.cal.classList.remove('up');
      setTimeout(() => document.addEventListener('click', this.onDocClick, true), 0);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.wrap.classList.remove('open');
      this.cal.classList.remove('up');
      document.removeEventListener('click', this.onDocClick, true);
    }

    onDocClick = e => {
      if (this.wrap && !this.wrap.contains(e.target)) this.close();
    };

    lang() {
      return (document.documentElement.lang || 'en').slice(0, 2);
    }

    render() {
      const L = this.lang();
      const names = MONTHS[L] || MONTHS.en;
      const days = DAYS[L] || DAYS.en;
      const y = this.view.getFullYear(), m = this.view.getMonth();

      const hd = document.createElement('div');
      hd.className = 'ui-cal-hd';
      const prev = document.createElement('button');
      prev.type = 'button'; prev.className = 'ui-cal-nav';
      prev.setAttribute('aria-label', 'Previous month');
      prev.appendChild(icon('i-chevronLeft', 'ic-16'));
      const title = document.createElement('div');
      title.className = 'ui-cal-title';
      title.textContent = names[m] + ' ' + y;
      const next = document.createElement('button');
      next.type = 'button'; next.className = 'ui-cal-nav';
      next.setAttribute('aria-label', 'Next month');
      next.appendChild(icon('i-chevronRight', 'ic-16'));
      prev.addEventListener('click', e => { e.stopPropagation(); this.shift(-1); });
      next.addEventListener('click', e => { e.stopPropagation(); this.shift(1); });
      hd.append(prev, title, next);

      const wd = document.createElement('div');
      wd.className = 'ui-cal-wd';
      days.forEach(d => {
        const s = document.createElement('span');
        s.textContent = d;
        wd.appendChild(s);
      });

      const grid = document.createElement('div');
      grid.className = 'ui-cal-grid';

      const first = new Date(y, m, 1);
      const lead = (first.getDay() + 6) % 7;           // Monday-first
      const start = new Date(y, m, 1 - lead);
      const today = todayISO();

      for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const iso = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ui-cal-day';
        b.textContent = String(d.getDate());
        if (d.getMonth() !== m) b.classList.add('mut');
        if (iso === today) b.classList.add('today');
        if (iso === (this.input.value || '').slice(0, 10)) b.classList.add('sel');
        b.setAttribute('aria-label', iso);
        b.addEventListener('click', e => { e.stopPropagation(); this.pick(iso); });
        grid.appendChild(b);
      }

      this.cal.replaceChildren(hd, wd, grid);

      if (this.withTime) {
        const row = document.createElement('div');
        row.className = 'ui-cal-time';
        const lbl = document.createElement('label');
        lbl.textContent = L === 'sw' ? 'Saa' : 'Time';
        const t = document.createElement('input');
        t.type = 'time';
        const cur = this.input.value;
        t.value = cur && cur.indexOf('T') > -1 ? cur.slice(cur.indexOf('T') + 1, cur.indexOf('T') + 6) : '09:00';
        t.addEventListener('change', () => this.pick((this.input.value || '').slice(0, 10), t.value));
        row.append(lbl, t);
        this.cal.appendChild(row);
      }

      const ft = document.createElement('div');
      ft.className = 'ui-cal-ft';
      const left = document.createElement('div');
      left.className = 'ui-cal-ft-b';
      const todayBtn = document.createElement('button');
      todayBtn.type = 'button'; todayBtn.className = 'ui-cal-tb';
      todayBtn.textContent = L === 'sw' ? 'Leo' : 'Today';
      todayBtn.addEventListener('click', e => {
        e.stopPropagation();
        const t = this.input.value;
        this.pick(todayISO(), this.withTime && t && t.indexOf('T') > -1 ? t.slice(t.indexOf('T') + 1, t.indexOf('T') + 6) : (this.withTime ? '09:00' : null));
      });
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button'; clearBtn.className = 'ui-cal-tb plain';
      clearBtn.textContent = L === 'sw' ? 'Futa' : 'Clear';
      clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.input.value = '';
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
        this.sync();
      });
      left.append(todayBtn, clearBtn);
      ft.appendChild(left);
      this.cal.appendChild(ft);
    }

    shift(n) {
      this.view = new Date(this.view.getFullYear(), this.view.getMonth() + n, 1);
      this.render();
    }

    pick(iso, time) {
      let v = iso;
      if (this.withTime) v = iso + 'T' + (time || '09:00');
      this.input.value = v;
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
      this.sync();
      if (!this.withTime) this.close();
    }
  }

  /* =====================================================================
     LIGHTBOX
     ===================================================================== */

  function lightbox(src, caption) {
    const lb = document.createElement('div');
    lb.className = 'ui-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    const img = document.createElement('img');
    img.src = src;
    img.alt = caption || '';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'ui-lb-x';
    x.setAttribute('aria-label', 'Close');
    x.appendChild(icon('i-close', 'ic-20'));
    lb.append(img, x);
    if (caption) {
      const cap = document.createElement('div');
      cap.className = 'ui-lb-cap';
      cap.textContent = caption;
      lb.appendChild(cap);
    }
    const close = () => {
      lb.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    x.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(lb);
    x.focus();
    return lb;
  }

  /* =====================================================================
     INIT
     ===================================================================== */

  const selects = new WeakMap();
  const dates = new WeakMap();

  function select(el) {
    if (!el || el.dataset.uiSel) return selects.get(el);
    const s = new Select(el);
    selects.set(el, s);
    return s;
  }

  function date(el) {
    if (!el || el.dataset.uiDate) return dates.get(el);
    const d = new DateField(el);
    dates.set(el, d);
    return d;
  }

  function enhanceAll(root) {
    const scope = root || document;
    scope.querySelectorAll('select').forEach(el => {
      if (el.dataset.uiSkip) return;
      select(el);
    });
    scope.querySelectorAll('input[type="date"], input[type="datetime-local"]').forEach(el => {
      if (el.dataset.uiSkip) return;
      date(el);
    });
  }

  /* ---------------------------------------------------------------------
     Value watcher
     Code elsewhere may set `select.selectedIndex = 0` or
     `input.value = '2026-01-01'` programmatically. Those do not fire a
     `change` event, so the visible control would drift out of sync.
     One shared rAF loop watches the raw values and re-syncs on change.
     --------------------------------------------------------------------- */
  const watched = [];

  function watch(el, read, sync) {
    watched.push({ el: el, read: read, sync: sync, last: read() });
  }

  function startWatcher() {
    if (watched.length < 1) return;
    const tick = () => {
      for (let i = 0; i < watched.length; i++) {
        const w = watched[i];
        const v = w.read();
        if (v !== w.last) { w.last = v; w.sync(); }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // pick up controls added later by scripts
  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('select')) select(n);
        if (n.matches && n.matches('input[type="date"], input[type="datetime-local"]')) date(n);
        if (n.querySelectorAll) {
          n.querySelectorAll('select').forEach(el => select(el));
          n.querySelectorAll('input[type="date"], input[type="datetime-local"]').forEach(el => date(el));
        }
      });
    });
  });

  function boot() {
    enhanceAll(document);
    startWatcher();
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
  }

  window.UI = { enhanceAll, select, date, lightbox, icon };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
