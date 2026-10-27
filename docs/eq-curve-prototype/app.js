(() => {
  const BANDS = ['31','62','125','250','500','1K','2K','4K','8K','16K'];
  const NAMES = ['31 Hz','62 Hz','125 Hz','250 Hz','500 Hz','1 kHz','2 kHz','4 kHz','8 kHz','16 kHz'];
  const DEFAULTS = {
    'true-sound': [0,0,0,0,0,0,0,0,0,0],
    custom:       [3.5,4,3.5,2.5,1.5,0.5,1,-3,1.5,0],   // as on the Option 3 board frames
    classical:    [1.5,1.5,1.5,0,6,-1.5,-3,-1.5,0,1.5],
  };
  const LABEL = { 'true-sound': 'True sound', custom: 'Custom', classical: 'Classical' };
  const KEY = 'perl2-eq-custom';
  const ZONES = [['Lo',0,2],['Mid',3,6],['Hi',7,9]];
  let CW = 343, CH = 440, PT = 60, PB = 356, MID = (PT+PB)/2, PER = (PB-PT)/12;
  // Option 1 (B2 on the board) keeps the +6 / 0 / −6 scale; Option 2 (B3) drops it and widens the plot
  const LAYOUTS = {
    'option-1': { PL: 28, PR: 335, scale: true },
    'option-2': { PL: 12, PR: 331, scale: false },
    'option-3': { faders: true },   // D · Slim faders
  };
  let layout = 'option-1', PL = 28, PR = 335, COL = (PR - PL) / 10;
  // Option 3 geometry, in phone coordinates (from the board): 33.5pt columns from x=20, 0 dB at y=385.67, 25.17pt per dB
  let F = { L: 20, W: 33.5, Z: 385.67, P: 302 / 12 };
  const isF = () => layout === 'option-3';
  const X3 = i => F.L + F.W * (i + 0.5), Y3 = g => F.Z - g * F.P;
  const X = i => isF() ? X3(i) : PL + COL*(i+0.5), Y = g => MID - g*PER;
  const fmt3 = g => g === 0 ? '0' : (g < 0 ? '-' : '') + (Number.isInteger(g) ? Math.abs(g) : Math.abs(g).toFixed(1));
  const clamp = g => Math.max(-6, Math.min(6, g));
  const fmt = g => g === 0 ? '0' : (g > 0 ? '+' : '−') + (Number.isInteger(g) ? Math.abs(g) : Math.abs(g).toFixed(1));
  const snap = g => clamp(Math.round(g * 2) / 2);   // gains move in 0.5 dB steps
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- spring motion ----------
  // Dragging is direct: the point stays under the finger 1:1. Springs only move things the finger isn't holding,
  // and they are critically damped (no bounce), so nothing overshoots or wobbles.
  const FEEL = {
    settle: { k: 420, z: 1.00 },   // release onto the nearest 0.5 dB, keyboard steps
    morph:  { k: 170, z: 1.00 },   // preset changes: an even sweep across the bands
    select: { k: 520, z: 1.00 },   // handle sliding between bands with the arrow keys
    appear: { k: 700, z: 1.00 },   // grabber and guide arriving on touch
    fade:   { k: 120, z: 1.00 },   // grabber and guide leaving after release
  };
  const spring = (x, feel) => ({ x, v: 0, t: x, k: feel.k, z: feel.z, start: 0 });
  const aim = (s, t, feel, delay = 0) => { s.t = t; s.k = feel.k; s.z = feel.z; s.start = performance.now() + delay; };

  let presets = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length === 10) presets.custom = saved.map(n => snap(+n || 0));
  } catch (e) {}
  let active = 'classical', gains = presets.classical.slice(), sel = 6;
  const bands = gains.map(g => spring(g, FEEL.settle));
  const selX = spring(X(sel), FEEL.select);
  // active state: the grabber, guide line and gold highlight only show while a band is being touched or adjusted
  const act = spring(0, FEEL.fade);
  let isActive = false, offTimer = 0;
  let drag = null, lastTap = { i: -1, t: 0 }, hover = -1;

  // ---------- build the graph ----------
  const card = document.getElementById('card');
  const phoneEl = document.getElementById('phone');
  function staticSvg() {
    let svg = `<svg viewBox="0 0 ${CW} ${CH}" aria-hidden="true">
      <rect class="surface" x=".5" y=".5" width="${CW-1}" height="${CH-1}" rx="13.5"/>`;
    for (let i = 0; i < 10; i++) svg += `<rect class="band-line" x="${X(i)-0.5}" y="${PT}" width="1" height="${PB-PT}"/>`;
    // a line for every dB from 0 to ±6, with fainter half-step lines between them
    for (let d = -5.5; d <= 5.5; d += 1) svg += `<line class="grid-half" x1="${PL}" x2="${PR}" y1="${Y(d)}" y2="${Y(d)}"/>`;
    for (let d = -6; d <= 6; d++) svg += `<line class="${d===0?'grid-zero':'grid-line'}" x1="${PL}" x2="${PR}" y1="${Y(d)}" y2="${Y(d)}"/>`;
    if (LAYOUTS[layout].scale) for (const [d,l] of [[6,'+6'],[0,'0'],[-6,'−6']]) svg += `<text class="db" x="${Math.max(8, PL - 6)}" y="${Y(d)+3.5}" text-anchor="end">${l}</text>`;
    return svg + '</svg>';
  }
  card.innerHTML = staticSvg();

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  card.appendChild(cv);
  const ctx = cv.getContext('2d');
  let dpr = 1;
  const sizeCanvas = () => {
    const requestedDpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    dpr = Math.min(requestedDpr, Math.sqrt(8_000_000 / (CW * CH)));
    cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
  };
  sizeCanvas();

  const add = (cls, style, text = '') => { const d = document.createElement('div'); d.className = 'abs ' + cls; d.setAttribute('style', style); d.textContent = text; card.appendChild(d); return d; };
  const vals = BANDS.map(() => add('val', ''));
  const freqs = BANDS.map(b => add('freq', '', b));
  const zoneEls = ZONES.map(([name, from, to]) => ({ from, to, bracket: add('bracket', ''), label: add('zone', '', name) }));
  const knobPos = add('grab-pos', '');
  const knob = document.createElement('div'); knob.className = 'grab-knob'; knobPos.appendChild(knob);
  const badge = document.createElement('div'); badge.className = 'badge'; badge.setAttribute('aria-hidden', 'true'); knobPos.appendChild(badge);
  const hits = BANDS.map((_, i) => {
    const h = add('hit', '');
    h.tabIndex = 0;
    h.setAttribute('role', 'slider');
    h.setAttribute('aria-label', NAMES[i]);
    h.setAttribute('aria-valuemin', '-6'); h.setAttribute('aria-valuemax', '6');
    return h;
  });
  // position everything that follows the band columns (re-run when the layout option changes)
  function place() {
    const px = n => `${n}px`;
    vals.forEach((v, i) => { v.style.left = px(X(i) - COL/2); v.style.width = px(COL); });
    freqs.forEach((f, i) => { f.style.left = px(X(i) - COL/2); f.style.width = px(COL); });
    zoneEls.forEach(z => {
      const l = X(z.from) - 0.38*COL, w = (z.to - z.from)*COL + 0.76*COL;
      for (const el of [z.bracket, z.label]) { el.style.left = px(l); el.style.width = px(w); }
    });
    hits.forEach((h, i) => { h.style.left = px(PL + COL*i); h.style.width = px(COL); });
  }
  place();

  // ---------- Option 3: slim faders ----------
  const faders = document.getElementById('faders');
  const fdiv = (cls, style = '', text = '') => { const d = document.createElement('div'); d.className = cls; if (style) d.setAttribute('style', style); d.textContent = text; faders.appendChild(d); return d; };
  const grid3 = [];
  for (let d = 6; d >= -6; d--) grid3.push({ db:d, el:fdiv('f-grid') });
  const tracks3 = BANDS.map(() => fdiv('f-track'));
  const fills3 = BANDS.map(() => fdiv('f-fill'));
  const handles3 = BANDS.map(() => fdiv('f-handle'));
  const vals3 = BANDS.map(() => fdiv('f-val'));
  const freqs3 = BANDS.map(b => fdiv('f-freq', '', b));
  const brackets3 = [], groups3 = [];
  for (const name of ['Lo','Mid','Hi']) {
    brackets3.push(fdiv('f-bracket'));
    groups3.push(fdiv('f-group', '', name));
  }
  const grab3 = fdiv('g3');
  grab3.innerHTML = '<div class="g3-halo"></div><div class="g3-knob"></div><div class="g3-bubble" aria-hidden="true"></div>';
  const knob3 = grab3.querySelector('.g3-knob'), bubble3 = grab3.querySelector('.g3-bubble');
  const hits3 = BANDS.map((_, i) => {
    const h = fdiv('hit3');
    h.tabIndex = 0;
    h.setAttribute('role', 'slider');
    h.setAttribute('aria-label', NAMES[i]);
    h.setAttribute('aria-valuemin', '-6'); h.setAttribute('aria-valuemax', '6');
    return h;
  });
  const curHits = () => isF() ? hits3 : hits;
  const curKnob = () => isF() ? knob3 : knob;
  const curPer = () => isF() ? F.P : PER;

  function reflowFaders() {
    const cardTop = card.offsetTop;
    const trackTop = F.Z - 6 * F.P - 4;
    const trackHeight = 12 * F.P + 8;
    const xLeft = X3(0), xRight = X3(9), groupWidths = [2.75,3.75,2.75];
    grid3.forEach(({db, el}) => { el.style.left = `${xLeft}px`; el.style.width = `${xRight - xLeft}px`; el.style.top = `${Y3(db) - 0.5}px`; });
    tracks3.forEach((el, i) => { el.style.left = `${X3(i) - 4}px`; el.style.top = `${trackTop}px`; el.style.height = `${trackHeight}px`; });
    fills3.forEach((el, i) => { el.style.left = `${X3(i) - 4}px`; });
    vals3.forEach((el, i) => { el.style.left = `${F.L + F.W * i}px`; el.style.width = `${F.W}px`; el.style.top = `${trackTop - 33.58}px`; });
    freqs3.forEach((el, i) => { el.style.left = `${F.L + F.W * i}px`; el.style.width = `${F.W}px`; el.style.top = `${cardTop + CH - 52}px`; });
    const groupLefts = [F.L + 0.125*F.W, F.L + 3.125*F.W, F.L + 7.125*F.W];
    brackets3.forEach((el, i) => { el.style.left = `${groupLefts[i]}px`; el.style.width = `${groupWidths[i]*F.W}px`; el.style.top = `${cardTop + CH - 18.14}px`; });
    groups3.forEach((el, i) => { el.style.left = `${groupLefts[i]}px`; el.style.width = `${groupWidths[i]*F.W}px`; el.style.top = `${cardTop + CH - 7.14}px`; });
    hits3.forEach((el, i) => { el.style.left = `${F.L + F.W * i}px`; el.style.width = `${F.W}px`; el.style.top = `${cardTop + 15}px`; el.style.height = `${Math.max(24, CH - 48)}px`; });
  }

  // ---------- curve shape ----------
  // Shape-preserving cubic (PCHIP): peaks and dips stay rounded and sit exactly on each point, with no overshoot.
  // Harmonic-mean slopes change continuously, so the shape never jumps while a point is dragged past its neighbours.
  function shape() {
    const xs = [PL], ys = [Y(bands[0].x)];
    for (let i = 0; i < 10; i++) { xs.push(X(i)); ys.push(Y(bands[i].x)); }
    xs.push(PR); ys.push(Y(bands[9].x));
    const n = xs.length, d = [], m = new Array(n).fill(0);
    for (let k = 0; k < n - 1; k++) d[k] = (ys[k+1] - ys[k]) / (xs[k+1] - xs[k]);
    for (let k = 1; k < n - 1; k++) {
      const a = d[k-1], b = d[k];
      if (a * b > 0) {
        const h0 = xs[k] - xs[k-1], h1 = xs[k+1] - xs[k];
        const w1 = 2*h1 + h0, w2 = h1 + 2*h0;
        m[k] = (w1 + w2) / (w1 / a + w2 / b);
      }
    }
    return { xs, ys, m };
  }
  function trace(c, s) {
    c.moveTo(s.xs[0], s.ys[0]);
    for (let k = 0; k < s.xs.length - 1; k++) {
      const h = s.xs[k+1] - s.xs[k];
      c.bezierCurveTo(s.xs[k] + h/3, s.ys[k] + s.m[k]*h/3, s.xs[k+1] - h/3, s.ys[k+1] - s.m[k+1]*h/3, s.xs[k+1], s.ys[k+1]);
    }
  }
  function curveY(s, x) {
    let k = 0;
    while (k < s.xs.length - 2 && x > s.xs[k+1]) k++;
    const h = s.xs[k+1] - s.xs[k], t = Math.max(0, Math.min(1, (x - s.xs[k]) / h)), t2 = t*t, t3 = t2*t;
    return (2*t3 - 3*t2 + 1)*s.ys[k] + (t3 - 2*t2 + t)*h*s.m[k] + (-2*t3 + 3*t2)*s.ys[k+1] + (t3 - t2)*h*s.m[k+1];
  }

  // ---------- drawing ----------
  const css = getComputedStyle(document.documentElement);
  const C = name => css.getPropertyValue(name).trim();
  const COPPER = C('--copper') || '#b69c8a', GOLD = C('--gold') || '#f6c57b', INK = C('--almost-black') || '#15161b', GREY = C('--light-grey') || '#d6d6d9';
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  function drawFaders() {
    const a = Math.max(0, Math.min(1, act.x));
    for (let i = 0; i < 10; i++) {
      const g = bands[i].x, y = Y3(g), f = fills3[i];
      // copper fill from 0 dB to the knob (rounded end tucks 4pt past 0 dB, as on the board)
      if (Math.abs(g) < 0.02) f.style.opacity = '0';
      else {
        const top = g > 0 ? y : F.Z - 4, h = g > 0 ? F.Z + 4 - y : y - (F.Z - 4);
        f.style.opacity = String(Math.min(1, Math.abs(g) / 0.25));
        f.style.top = `${top.toFixed(2)}px`; f.style.height = `${h.toFixed(2)}px`;
      }
      const hd = handles3[i];
      hd.style.transform = `translate3d(${(X3(i) - 8.665).toFixed(2)}px, ${(y - 8.665).toFixed(2)}px, 0)`;
      hd.style.opacity = i === sel ? (1 - a).toFixed(3) : '1';   // the active knob cross-fades into the gold grabber
    }
    const gy = Y3(bands[sel].x);
    grab3.style.opacity = a.toFixed(3);
    grab3.style.transform = `translate3d(${selX.x.toFixed(2)}px, ${gy.toFixed(2)}px, 0) scale(${(0.55 + 0.45 * a).toFixed(3)})`;
    const bt = fmt3(gains[sel]);
    if (bubble3.textContent !== bt) bubble3.textContent = bt;
    bubble3.classList.toggle('below', gy < 265);   // near the top the bubble drops below so it never covers the values row
  }

  function draw() {
    if (isF()) { drawFaders(); return; }
    const s = shape();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    const ca = Math.max(0, Math.min(1, act.x));
    if (ca > 0.005) {
      // active column backdrop, fades with the grabber
      ctx.fillStyle = rgba(GREY, 0.035 * ca);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(selX.x - COL/2, PT - 24, COL, PB - PT + 48, 8); else ctx.rect(selX.x - COL/2, PT - 24, COL, PB - PT + 48);
      ctx.fill();
    }
    // active-band guide, only while a band is being touched or adjusted
    const a = Math.max(0, Math.min(1, act.x));
    if (a > 0.005) {
      const gg = ctx.createLinearGradient(0, PT - 6, 0, PB + 6);
      gg.addColorStop(0, rgba(GOLD, 0)); gg.addColorStop(0.5, rgba(GOLD, 0.55 * a)); gg.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = gg; ctx.fillRect(selX.x - 0.5, PT - 6, 1, PB - PT + 12);
    }

    // area between the curve and 0 dB
    const ag = ctx.createLinearGradient(0, PT, 0, PB);
    ag.addColorStop(0, rgba(COPPER, 0.34)); ag.addColorStop(0.5, rgba(COPPER, 0)); ag.addColorStop(1, rgba(COPPER, 0.34));
    ctx.beginPath(); trace(ctx, s); ctx.lineTo(PR, MID); ctx.lineTo(PL, MID); ctx.closePath();
    ctx.fillStyle = ag; ctx.fill();

    // soft glow: a wide faint stroke with a blurred shadow, then the crisp line on top
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.save();
    ctx.shadowColor = rgba(COPPER, 0.6); ctx.shadowBlur = 14 * dpr;
    ctx.strokeStyle = rgba(COPPER, 0.28); ctx.lineWidth = 5;
    ctx.beginPath(); trace(ctx, s); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = COPPER; ctx.lineWidth = 2;
    ctx.beginPath(); trace(ctx, s); ctx.stroke();

    // band points (the selected one is the handle above)
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      // the active band's point cross-fades into the grabber
      ctx.globalAlpha = i === sel ? 1 - a : 1;
      if (ctx.globalAlpha < 0.01) continue;
      ctx.beginPath(); ctx.arc(X(i), Y(bands[i].x), 4, 0, Math.PI*2);
      ctx.fillStyle = INK; ctx.fill();
      ctx.strokeStyle = gains[i] === 0 ? rgba(GREY, 0.7) : COPPER; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    knobPos.style.opacity = a.toFixed(3);
    const ky = curveY(s, selX.x);
    knobPos.style.transform = `translate3d(${selX.x.toFixed(2)}px, ${ky.toFixed(2)}px, 0) scale(${(0.55 + 0.45 * a).toFixed(3)})`;
    const bt = fmt(gains[sel]);
    if (badge.textContent !== bt) badge.textContent = bt;
    badge.classList.toggle('below', ky < 92);   // near the top, the badge drops below the knob so it never covers the values row
  }

  // ---------- labels and state ----------
  const modified = () => gains.some((g, i) => g !== presets[active][i]);
  const readout = document.getElementById('readout');
  const editRow = document.getElementById('editRow');
  function labels() {
    vals.forEach((v, i) => {
      const txt = fmt(gains[i]);
      if (v.textContent !== txt) v.textContent = txt;
      const hl = isActive && i === sel;
      v.classList.toggle('sel', hl);
      v.classList.toggle('zero', !hl && gains[i] === 0);
    });
    freqs.forEach((el, i) => el.classList.toggle('sel', isActive && i === sel));
    vals3.forEach((v, i) => {
      const txt = fmt3(gains[i]);
      if (v.textContent !== txt) v.textContent = txt;
      v.classList.toggle('zero', gains[i] === 0);
    });
    [...hits, ...hits3].forEach((h, k) => { const i = k % 10; h.setAttribute('aria-valuenow', gains[i]); h.setAttribute('aria-valuetext', `${fmt(gains[i])} dB`); });
    const m = modified();
    editRow.classList.toggle('show', m); editRow.inert = !m;
    phoneEl.classList.toggle('modified', m);
    document.querySelectorAll('.tag').forEach(t => t.setAttribute('aria-pressed', String(t.dataset.preset === active)));
    if (readout) readout.innerHTML = `${NAMES[sel]} · ${fmt(gains[sel])} dB <span>· ${LABEL[active]}${m ? ', edited' : ''}</span>`;
  }
  const bump = i => { const v = vals[i]; v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); };

  // ---------- animation loop ----------
  let raf = 0, last = 0;
  function settled(s) { return Math.abs(s.x - s.t) < 0.0004 && Math.abs(s.v) < 0.0004; }
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    let busy = !!drag;
    const springs = [...bands, selX, act];
    for (const s of springs) {
      if (reduce) { s.x = s.t; s.v = 0; continue; }
      if (now < s.start) { busy = true; continue; }
      const c = 2 * s.z * Math.sqrt(s.k), sub = Math.max(1, Math.ceil(dt / (1/240))), h = dt / sub;
      for (let j = 0; j < sub; j++) { const a = -s.k * (s.x - s.t) - c * s.v; s.v += a * h; s.x += s.v * h; }
      if (settled(s)) { s.x = s.t; s.v = 0; } else busy = true;
    }
    draw();
    raf = busy ? requestAnimationFrame(step) : 0;
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }

  function commit(i, g, feel = FEEL.settle) {
    g = snap(g);
    const changed = gains[i] !== g;
    gains[i] = g;
    aim(bands[i], g, feel);
    if (changed) { bump(i); try { navigator.vibrate && navigator.vibrate(3); } catch (e) {} }
    labels(); kick();
  }
  function loadPreset(target) {
    gains = target.slice();
    // stagger outwards from the selected band so the curve sweeps rather than jumps
    bands.forEach((b, i) => aim(b, gains[i], FEEL.morph, Math.abs(i - sel) * 22));
    labels(); kick();
  }
  function select(i, instant = false) {
    sel = Math.max(0, Math.min(9, i));
    aim(selX, X(sel), FEEL.select);
    if (instant) { selX.x = selX.t; selX.v = 0; }   // under the finger straight away when touched
    labels(); kick();
  }

  function setActive(on, delay = 0) {
    clearTimeout(offTimer);
    if (on) {
      if (!isActive) { isActive = true; labels(); }
      aim(act, 1, FEEL.appear); kick();
    } else {
      offTimer = setTimeout(() => { isActive = false; labels(); aim(act, 0, FEEL.fade); kick(); }, delay);
    }
  }

  // ---------- input ----------
  const localY = e => { const r = card.getBoundingClientRect(); return (e.clientY - r.top) * CH / r.height; };
  function wire(h, i) {
    h.addEventListener('pointerdown', e => {
      e.preventDefault();
      const now = performance.now(), dbl = lastTap.i === i && now - lastTap.t < 320;
      lastTap = { i, t: now };
      select(i, true);
      setActive(true);
      h.focus({ preventScroll: true });
      if (dbl) { commit(i, 0); setActive(false, 700); return; }
      // relative grab: the point moves by how far the finger moves, from wherever the column was pressed
      drag = { i, id: e.pointerId, y0: e.clientY, g0: bands[i].x, moved: false };
      try { h.setPointerCapture(e.pointerId); } catch (err) {}
    });
    h.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      if (!drag.moved && Math.abs(e.clientY - drag.y0) < 2) return;
      if (!drag.moved) { drag.moved = true; curKnob().classList.add('dragging'); }
      let raw = drag.g0 - (e.clientY - drag.y0) / curPer();
      // past ±6 dB it eases off like a soft end stop
      if (raw > 6) raw = 6 + (1 - Math.exp(-(raw - 6) * 0.6)) * 0.35;
      if (raw < -6) raw = -6 - (1 - Math.exp((raw + 6) * 0.6)) * 0.35;
      const b = bands[i];
      b.x = b.t = raw; b.v = 0; b.start = 0;
      const g = snap(raw);
      if (gains[i] !== g) { gains[i] = g; try { navigator.vibrate && navigator.vibrate(2); } catch (err) {} labels(); }
      kick();
    });
    const end = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const wasMoved = drag.moved;
      drag = null; knob.classList.remove('dragging'); knob3.classList.remove('dragging');
      if (wasMoved) commit(i, gains[i]); // glide onto the nearest 0.5 dB step
      setActive(false, 450);             // let the settle land, then fade the grabber and guide
    };
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    h.addEventListener('pointerenter', () => { hover = i; kick(); });
    h.addEventListener('pointerleave', () => { if (hover === i) { hover = -1; kick(); } });
    h.addEventListener('focus', () => { if (sel !== i) select(i); });
    h.addEventListener('keydown', e => {
      const k = e.key;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','0','Backspace','Delete'].includes(k)) { setActive(true); setActive(false, 1500); }
      if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); commit(i, gains[i] + (k === 'ArrowUp' ? 0.5 : -0.5)); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); curHits()[Math.max(0, Math.min(9, i + (k === 'ArrowRight' ? 1 : -1)))].focus(); }
      else if (k === '0' || k === 'Backspace' || k === 'Delete') { e.preventDefault(); commit(i, 0); }
    });
  }
  hits.forEach(wire);
  hits3.forEach(wire);

  const toastEl = document.getElementById('toast');
  let toastTimer;
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800); };
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(presets.custom)); } catch (e) {} };

  document.querySelectorAll('.tag').forEach(t => t.addEventListener('click', () => {
    active = t.dataset.preset;
    loadPreset(presets[active]);
  }));
  document.getElementById('saveBtn').addEventListener('click', () => {
    const wasCustom = active === 'custom';
    presets.custom = gains.slice(); persist();
    active = 'custom'; labels();
    toast(wasCustom ? 'Custom saved' : 'Saved to Custom');
  });
  document.getElementById('revertBtn').addEventListener('click', () => { loadPreset(presets[active]); toast(`Reverted to ${LABEL[active]}`); });
  document.getElementById('manageBtn').addEventListener('click', () => toast('Manage preset isn’t part of this prototype'));
  document.getElementById('resetAll')?.addEventListener('click', () => {
    presets = JSON.parse(JSON.stringify(DEFAULTS));
    try { localStorage.removeItem(KEY); } catch (e) {}
    active = 'classical'; select(6); loadPreset(presets.classical);
  });

  // ---------- fit the phone to the window ----------
  const phone = document.getElementById('phone');
  addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) phone.classList.add('kbd'); });
  addEventListener('pointerdown', () => phone.classList.remove('kbd'), true);
  function syncGeometry(wide) {
    const phoneRect = phoneEl.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    CW = Math.max(1, card.clientWidth);
    CH = Math.max(80, card.clientHeight);
    if (wide) {
      PT = Math.min(60, Math.max(32, CH * 0.28));
      PB = Math.max(PT + 36, CH - 68);
    } else {
      PT = Math.min(60, Math.max(40, CH * 0.136));
      PB = Math.max(PT + 36, CH - 84);
    }
    const option = layout === 'option-2' ? 'option-2' : 'option-1';
    PL = CW * LAYOUTS[option].PL / 343;
    PR = CW * LAYOUTS[option].PR / 343;
    MID = (PT + PB) / 2;
    PER = (PB - PT) / 12;
    COL = (PR - PL) / 10;
    F = {
      L: cardRect.left - phoneRect.left + 4,
      W: Math.max(1, (CW - 8) / 10),
      Z: cardRect.top - phoneRect.top + MID + 5.67,
      P: (PB - PT + 6) / 12,
    };
    if (layout !== 'option-3') {
      card.querySelector('svg').outerHTML = staticSvg();
      place();
    }
    selX.x = selX.t = X(sel); selX.v = 0;
    reflowFaders();
    sizeCanvas();
    draw();
  }
  function fit() {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const visualW = viewport ? viewport.width : 0;
    const visualH = viewport ? viewport.height : 0;
    const availW = visualW > 0 ? visualW : root.clientWidth || window.innerWidth;
    const availH = visualH > 0 ? visualH : root.clientHeight || window.innerHeight;
    const offsetX = visualW > 0 ? viewport.offsetLeft : 0;
    const offsetY = visualH > 0 ? viewport.offsetTop : 0;
    const wide = availW > availH;
    phone.classList.toggle('wide', wide);
    phone.style.width = `${availW}px`;
    phone.style.height = `${availH}px`;
    phone.style.left = `${offsetX}px`;
    phone.style.top = `${offsetY}px`;
    phone.style.transform = 'none';
    syncGeometry(wide);
  }
  // ---------- version picker (Options 1–3 on the board) ----------
  const LAYOUT_KEY = 'perl2-eq-layout';
  const switches = [...document.querySelectorAll('.switch [data-layout]')];
  function applyLayout(name, save = true) {
    if (!LAYOUTS[name]) name = 'option-1';
    layout = name;
    const L = LAYOUTS[name];
    if (!L.faders) {
      PL = CW * L.PL / 343;
      PR = CW * L.PR / 343;
      COL = (PR - PL) / 10;
      card.querySelector('svg').outerHTML = staticSvg();
      place();
    }
    card.hidden = !!L.faders;
    faders.hidden = !L.faders;
    // keep keyboard focus on the visible set of bands
    if (document.activeElement && (document.activeElement.classList.contains('hit') || document.activeElement.classList.contains('hit3'))) curHits()[sel].focus({ preventScroll: true });
    selX.x = selX.t = X(sel); selX.v = 0;
    switches.forEach(b => b.setAttribute('aria-checked', String(b.dataset.layout === name)));
    if (save) { try { localStorage.setItem(LAYOUT_KEY, name); } catch (e) {} }
    if (location.hash !== '#' + name) { try { history.replaceState(null, '', '#' + name); } catch (e) {} }
    reflowFaders();
    draw();
  }
  switches.forEach(b => b.addEventListener('click', () => applyLayout(b.dataset.layout)));
  switches.forEach((b, i) => b.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const n = switches[(i + (e.key === 'ArrowRight' ? 1 : switches.length - 1)) % switches.length];
      n.focus(); applyLayout(n.dataset.layout);
    }
  }));
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (LAYOUTS[h] && h !== layout) applyLayout(h); });

  // press and hold "Advanced EQ" inside the phone to pick an option without leaving the screen
  const eqTitle = document.getElementById('eqTitle'), optMenu = document.getElementById('optMenu'), scrim = document.getElementById('menuScrim');
  const menuItems = [...optMenu.querySelectorAll('[data-layout]')];
  let holdTimer = 0;
  function openMenu(fromKeyboard) {
    menuItems.forEach(b => b.setAttribute('aria-checked', String(b.dataset.layout === layout)));
    scrim.hidden = false; optMenu.inert = false; optMenu.classList.add('open');
    eqTitle.setAttribute('aria-expanded', 'true');
    if (fromKeyboard) (menuItems.find(b => b.dataset.layout === layout) || menuItems[0]).focus();
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function closeMenu(refocus) {
    optMenu.classList.remove('open'); optMenu.inert = true; scrim.hidden = true;
    eqTitle.setAttribute('aria-expanded', 'false');
    if (refocus) eqTitle.focus();
  }
  const stopHold = () => { clearTimeout(holdTimer); eqTitle.classList.remove('holding'); };
  eqTitle.addEventListener('pointerdown', () => {
    stopHold();
    eqTitle.classList.add('holding');
    holdTimer = setTimeout(() => { eqTitle.classList.remove('holding'); openMenu(false); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => eqTitle.addEventListener(t, stopHold));
  eqTitle.addEventListener('contextmenu', e => e.preventDefault());
  eqTitle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(true); } });
  scrim.addEventListener('pointerdown', e => { e.preventDefault(); closeMenu(false); });
  menuItems.forEach((b, i) => {
    b.addEventListener('click', () => { applyLayout(b.dataset.layout); closeMenu(false); });
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); menuItems[(i + (e.key === 'ArrowDown' ? 1 : menuItems.length - 1)) % menuItems.length].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
      else if (e.key === 'Tab') closeMenu(false);
    });
  });
  let initial = location.hash.slice(1);
  if (!LAYOUTS[initial]) { try { initial = localStorage.getItem(LAYOUT_KEY) || 'option-1'; } catch (e) { initial = 'option-1'; } }
  applyLayout(initial, false);

  addEventListener('resize', fit, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fit, { passive: true });
    window.visualViewport.addEventListener('scroll', fit, { passive: true });
  }
  fit();
  labels(); draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();
