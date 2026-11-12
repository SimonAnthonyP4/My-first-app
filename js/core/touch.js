// Touch controls: play on a phone or tablet. An on-screen controller (a stick on one side, the
// fighting buttons on the other) feeds the same virtual keys the keyboard does, so every mode,
// menu and story quick-time event works with it unchanged.
//
//   RF.touch.active        true while the controller is showing
//   RF.touch.takeTap()     the last tap on the game screen ({x, y} in game pixels), or null
//   RF.touch.pulse(code)   press-and-release a key (a tap that should act like a key press)
//   RF.touch.fit(w, h)     size the canvas for the current screen (used by main.js)
//
// Settings (Settings -> TOUCH CONTROLS): AUTO shows the controller on touch screens and hides it
// when a keyboard or controller is used; ALWAYS ON / OFF force it. Also: size, and left-handed.
// Taps on the screen work in menus and the story (tap a menu row, tap to read on).
(function () {
  const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
  const doc = document, canvas = doc.getElementById('game');
  const C1 = () => RF.CONTROLS.p1;
  const kb = () => RF.game && RF.game.kb;

  // ------------------------------------------------------------------ the controller's layout
  // x, y, d are in "u" (one unit is about the width of a thumb pad); x/y are the button's centre
  // inside its cluster. The four big buttons wear the same symbols and colours as the story's
  // quick-time prompts, so "press square" means the pink square.
  const BTNS = {
    light: { keys: ['light'], c: '#ff7ac8', x: 2.05, y: 2.75, d: 1.35, shape: 'square', label: 'LIGHT', menu: 'OK' },
    heavy: { keys: ['heavy'], c: '#40e0a0', x: 3.0, y: 1.8, d: 1.35, shape: 'triangle', label: 'HEAVY' },
    block: { keys: ['block'], c: '#ff5050', x: 3.95, y: 2.75, d: 1.35, shape: 'circle', label: 'BLOCK', menu: 'BACK' },
    throw: { keys: ['throw'], c: '#6aa0ff', x: 3.0, y: 3.7, d: 1.35, shape: 'cross', label: 'THROW' },
    dash: { keys: ['dash'], c: '#ffd040', x: 0.7, y: 3.2, d: 1.15, label: 'DASH' },
    ex: { keys: ['ex'], c: '#ff9a40', x: 0.58, y: 1.95, d: 1.15, label: 'EX' },
    super: { keys: ['light', 'heavy'], c: '#ffe9b0', x: 1.9, y: 0.65, d: 1.15, label: 'SUPER' },
    taunt: { keys: ['taunt'], c: '#c0a0ff', x: 4.1, y: 0.65, d: 1.15, label: 'TAUNT' },
  };
  const SHAPES = {
    square: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    triangle: '<path d="M12 4 L20.5 19 L3.5 19 Z"/>',
    cross: '<path d="M5 5 L19 19 M19 5 L5 19"/>',
  };
  const ICON = {
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  };

  // ------------------------------------------------------------------ styles (injected, so every page that loads this gets them)
  const css = `
  #game { touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  html body.touch { position: fixed; inset: 0; width: 100%; height: 100%; margin: 0; overflow: hidden; box-sizing: border-box;
    padding: 0 !important; overscroll-behavior: none; touch-action: none; background: #000; }
  body.touch.portrait { justify-content: flex-start !important; padding-top: env(safe-area-inset-top, 0px) !important; }
  body.touch #help, body.touch .help { display: none !important; }
  body.touch #game { max-width: none !important; }
  #touch { position: fixed; inset: 0; z-index: 5; display: none; pointer-events: none; touch-action: none; --u: 42px; --m: 10px; --mb: 10px; --a: .6;
    -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
    font: 700 calc(var(--u) * .2) ui-monospace, Menlo, Consolas, monospace; letter-spacing: .04em; }
  body.touch #touch { display: block; }
  #touch .z { position: absolute; pointer-events: auto; touch-action: none; }
  #touch .stick { left: calc(var(--m) + env(safe-area-inset-left, 0px)); bottom: calc(var(--mb) + env(safe-area-inset-bottom, 0px)); width: calc(var(--u) * 4.6); height: calc(var(--u) * 4.6); }
  #touch .btns { right: calc(var(--m) + env(safe-area-inset-right, 0px)); bottom: calc(var(--mb) + env(safe-area-inset-bottom, 0px)); width: calc(var(--u) * 4.7); height: calc(var(--u) * 4.4); pointer-events: none; }
  #touch.swap .stick { left: auto; right: calc(var(--m) + env(safe-area-inset-right, 0px)); }
  #touch.swap .btns { right: auto; left: calc(var(--m) + env(safe-area-inset-left, 0px)); }
  #touch .base { position: absolute; left: 50%; top: 50%; width: calc(var(--u) * 3.4); height: calc(var(--u) * 3.4); margin: calc(var(--u) * -1.7) 0 0 calc(var(--u) * -1.7);
    border-radius: 50%; border: 2px solid rgba(255,255,255,calc(var(--a) * .7)); background: rgba(14,8,22,calc(var(--a) * .55)); box-shadow: inset 0 0 0 calc(var(--u) * .5) rgba(255,255,255,.03); pointer-events: none; }
  #touch .base i { position: absolute; width: 0; height: 0; border: calc(var(--u) * .22) solid transparent; opacity: calc(var(--a) * .9); }
  #touch .base i.u { left: 50%; top: calc(var(--u) * .1); margin-left: calc(var(--u) * -.22); border-bottom-color: #fff; border-top-width: 0; }
  #touch .base i.d { left: 50%; bottom: calc(var(--u) * .1); margin-left: calc(var(--u) * -.22); border-top-color: #fff; border-bottom-width: 0; }
  #touch .base i.l { top: 50%; left: calc(var(--u) * .1); margin-top: calc(var(--u) * -.22); border-right-color: #fff; border-left-width: 0; }
  #touch .base i.r { top: 50%; right: calc(var(--u) * .1); margin-top: calc(var(--u) * -.22); border-left-color: #fff; border-right-width: 0; }
  #touch .base i.on { border-color: transparent; }
  #touch .base i.u.on { border-bottom-color: #ffd040; } #touch .base i.d.on { border-top-color: #ffd040; }
  #touch .base i.l.on { border-right-color: #ffd040; } #touch .base i.r.on { border-left-color: #ffd040; }
  #touch .knob { position: absolute; left: 50%; top: 50%; width: calc(var(--u) * 1.35); height: calc(var(--u) * 1.35); margin: calc(var(--u) * -.675) 0 0 calc(var(--u) * -.675);
    border-radius: 50%; background: rgba(240,230,255,calc(var(--a) * .55)); border: 2px solid rgba(255,255,255,calc(var(--a) + .1)); pointer-events: none; transition: transform 40ms linear; }
  #touch .knob.on { background: rgba(255,208,64,.7); border-color: #ffd040; }
  #touch .b { position: absolute; pointer-events: auto; touch-action: none; box-sizing: border-box; border-radius: 50%; color: var(--c); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
    left: calc((var(--x) - var(--d) / 2) * var(--u)); top: calc((var(--y) - var(--d) / 2) * var(--u)); width: calc(var(--d) * var(--u)); height: calc(var(--d) * var(--u));
    background: rgba(14,8,22,calc(var(--a) * .85)); border: 2px solid var(--c); box-shadow: 0 0 0 1px rgba(0,0,0,.55), inset 0 0 calc(var(--u) * .3) rgba(0,0,0,.5); opacity: calc(.45 + var(--a) * .55); transition: transform 50ms, background 50ms; }
  #touch .b svg { width: calc(var(--d) * var(--u) * .46); height: calc(var(--d) * var(--u) * .46); fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; pointer-events: none; }
  #touch .b span { pointer-events: none; font-size: calc(var(--u) * .2); line-height: 1; }
  #touch .b.sm span { font-size: calc(var(--u) * .27); }
  #touch .b.on { background: var(--c); color: #1a0e08; transform: scale(1.1); opacity: 1; }
  #touch .b.on svg { stroke: #1a0e08; }
  #touch.menu .b { opacity: calc(.18 + var(--a) * .2); }
  #touch.menu .stick { transform: scale(.7); transform-origin: left bottom; }       /* menus are tapped: keep the stick out of the way of the rows */
  #touch.menu.swap .stick { transform-origin: right bottom; }
  #touch.col .top { flex-direction: column; }
  #touch.tight [data-t=full] { display: none; }
  #touch.menu .b.menuok { opacity: calc(.45 + var(--a) * .55); }
  #touch .top { position: absolute; top: calc(var(--tt, 6px)); right: calc(var(--tr, 6px)); display: flex; gap: calc(var(--u) * .25); pointer-events: none; }
  #touch.swap .top { right: auto; left: calc(var(--tr, 6px)); }
  #touch .top button { pointer-events: auto; touch-action: none; width: calc(var(--u) * .95); height: calc(var(--u) * .95); min-width: 34px; min-height: 34px; padding: calc(var(--u) * .2); box-sizing: border-box; border-radius: 50%;
    background: rgba(14,8,22,calc(var(--a) * .8)); border: 2px solid rgba(255,255,255,calc(var(--a) * .8)); color: #fff; opacity: calc(.5 + var(--a) * .5); font: inherit; }
  #touch .top button svg { width: 100%; height: 100%; display: block; pointer-events: none; }
  #touch .top button.on { background: #ffd040; color: #000; }
  #touch .top button.off { color: #ff6a6a; }
  `;
  const style = doc.createElement('style'); style.textContent = css; doc.head.appendChild(style);

  // ------------------------------------------------------------------ DOM
  const root = doc.createElement('div'); root.id = 'touch'; root.setAttribute('aria-hidden', 'true');
  const stick = doc.createElement('div'); stick.className = 'z stick'; stick.dataset.z = 'stick';
  stick.innerHTML = '<div class="base"><i class="u"></i><i class="d"></i><i class="l"></i><i class="r"></i></div><div class="knob"></div>';
  const btns = doc.createElement('div'); btns.className = 'z btns';
  const els = {};
  for (const [name, b] of Object.entries(BTNS)) {
    const el = doc.createElement('div'); el.className = 'b' + (b.d < 1.3 ? ' sm' : '') + (b.menu ? ' menuok' : ''); el.dataset.b = name;
    el.style.setProperty('--x', b.x); el.style.setProperty('--y', b.y); el.style.setProperty('--d', b.d); el.style.setProperty('--c', b.c);
    el.innerHTML = (b.shape ? '<svg viewBox="0 0 24 24">' + SHAPES[b.shape] + '</svg>' : '') + '<span>' + b.label + '</span>';
    els[name] = el; btns.appendChild(el);
  }
  const top = doc.createElement('div'); top.className = 'top';
  const mk = (id, icon, label) => { const b = doc.createElement('button'); b.type = 'button'; b.dataset.t = id; b.setAttribute('aria-label', label); b.innerHTML = icon; return b; };
  const bSound = mk('sound', ICON.sound, 'sound'), bFull = mk('full', ICON.full, 'fullscreen'), bPause = mk('pause', ICON.pause, 'pause');
  const fsOK = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  top.append(bSound); if (fsOK) top.append(bFull); top.append(bPause);
  root.append(stick, btns, top); doc.body.appendChild(root);
  const knob = stick.querySelector('.knob'), arrows = { up: stick.querySelector('.u'), down: stick.querySelector('.d'), left: stick.querySelector('.l'), right: stick.querySelector('.r') };

  // ------------------------------------------------------------------ virtual keys (several fingers can hold the same one)
  const MIN_HOLD = 55;                        // a quick tap is still held for a few frames, so a step never misses it
  const count = {}, since = {};
  function hold(code) { if (!kb()) return; if (!count[code]) { count[code] = 0; } if (count[code]++ === 0) { since[code] = performance.now(); kb().press(code); } }
  function drop(code) {
    if (!count[code]) return;
    if (--count[code] > 0) return;
    const wait = MIN_HOLD - (performance.now() - since[code]);
    if (wait > 0) setTimeout(() => { if (!count[code] && kb()) kb().release(code); }, wait); else if (kb()) kb().release(code);
  }
  // (the press is made between game steps, not inside one: a step only sees keys pressed since the last)
  function pulse(code) { setTimeout(() => { hold(code); setTimeout(() => drop(code), 30); }, 0); }
  const codesOf = (b) => b.keys.map((a) => C1()[a][0]);
  const buzz = () => { try { if (RF.CONFIG.RUMBLE && navigator.vibrate) navigator.vibrate(7); } catch (e) { /* not supported */ } };

  // ------------------------------------------------------------------ the stick: 8 ways, like a real one (same sectors as the controller code)
  const DIR = { up: 'up', down: 'down', left: 'left', right: 'right' };
  const dirs = new Set(); let sector = null;
  function setDirs(next) {
    for (const d of Object.keys(DIR)) {
      const had = dirs.has(d), has = next.has(d);
      if (has && !had) hold(C1()[d][0]); else if (!has && had) drop(C1()[d][0]);
      arrows[d].classList.toggle('on', has);
    }
    dirs.clear(); next.forEach((d) => dirs.add(d));
    knob.classList.toggle('on', next.size > 0);
  }
  function readStick(e) {
    const r = stick.getBoundingClientRect(), R = r.width * 0.37, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy, mag = Math.hypot(dx, dy) / R, next = new Set();
    if (mag > (sector != null ? 0.3 : 0.4)) {
      const exact = Math.atan2(dy, dx) / (Math.PI / 4);
      let sec = Math.round(exact);
      if (sector != null && Math.abs(exact - sector) < 0.62) sec = sector;
      else if (sector != null && Math.abs(Math.abs(exact) - 4) < 0.62 && Math.abs(sector) === 4) sec = sector;
      sector = sec;
      const s = ((sec % 8) + 8) % 8;
      if (s === 7 || s === 0 || s === 1) next.add('right');
      if (s === 3 || s === 4 || s === 5) next.add('left');
      if (s === 1 || s === 2 || s === 3) next.add('down');
      if (s === 5 || s === 6 || s === 7) next.add('up');
    } else sector = null;
    const k = Math.min(1, mag) * R * 0.55, a = Math.atan2(dy, dx);
    knob.style.transform = mag > 0.05 ? 'translate(' + Math.cos(a) * k + 'px,' + Math.sin(a) * k + 'px)' : '';
    setDirs(next);
  }
  function releaseStick() { sector = null; knob.style.transform = ''; setDirs(new Set()); }

  // ------------------------------------------------------------------ fingers
  const fingers = new Map();                  // pointerId -> { kind: 'stick' | 'btn' | 'top', name }
  const target = (x, y) => { const el = doc.elementFromPoint(x, y); return el && el.closest ? el.closest('[data-b],[data-t],[data-z]') : null; };
  function pressBtn(name) { const b = BTNS[name]; if (!b) return; codesOf(b).forEach(hold); els[name].classList.add('on'); buzz(); }
  function dropBtn(name) { const b = BTNS[name]; if (!b) return; codesOf(b).forEach(drop); els[name].classList.remove('on'); }
  function topPress(id) {
    if (id === 'pause') { hold('Escape'); bPause.classList.add('on'); }
    else if (id === 'sound') { pulse('KeyM'); }
    else if (id === 'full') toggleFullscreen();
    buzz();
  }
  function topDrop(id) { if (id === 'pause') { drop('Escape'); bPause.classList.remove('on'); } }
  function begin(e, el) {
    const f = { kind: el.dataset.z ? 'stick' : el.dataset.t ? 'top' : 'btn', name: el.dataset.b || el.dataset.t };
    fingers.set(e.pointerId, f);
    if (f.kind === 'stick') readStick(e); else if (f.kind === 'btn') pressBtn(f.name); else topPress(f.name);
  }
  function end(id) {
    const f = fingers.get(id); if (!f) return;
    fingers.delete(id);
    if (f.kind === 'stick') releaseStick(); else if (f.kind === 'btn') { if (f.name) dropBtn(f.name); } else topDrop(f.name);
  }
  root.addEventListener('pointerdown', (e) => {
    const el = e.target.closest && e.target.closest('[data-b],[data-t],[data-z]'); if (!el) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    RF.audio && RF.audio.unlock && RF.audio.unlock();
    begin(e, el);
  });
  root.addEventListener('pointermove', (e) => {
    const f = fingers.get(e.pointerId); if (!f) return;
    e.preventDefault();
    if (f.kind === 'stick') return readStick(e);
    if (f.kind !== 'btn') return;
    const el = target(e.clientX, e.clientY), now = el && el.dataset.b;      // sliding a thumb from one button to the next
    if (now === f.name) return;
    if (f.name) dropBtn(f.name);
    f.name = now && BTNS[now] ? now : null;
    if (f.name) pressBtn(f.name);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, (e) => end(e.pointerId));
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  const releaseAll = () => { for (const id of [...fingers.keys()]) end(id); };
  window.addEventListener('blur', releaseAll);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) releaseAll(); });

  // ------------------------------------------------------------------ taps on the game screen
  let tap = null; const down = new Map();
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    down.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (e.pointerType === 'touch') { seenTouch(); }
    RF.audio && RF.audio.unlock && RF.audio.unlock();
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = down.get(e.pointerId); down.delete(e.pointerId);
    if (!d || performance.now() - d.t > 600 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 16) return;
    const r = canvas.getBoundingClientRect();
    tap = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H, at: performance.now() };
  });
  canvas.addEventListener('pointercancel', (e) => down.delete(e.pointerId));
  function takeTap() { const t = tap; tap = null; return t && performance.now() - t.at < 500 ? t : null; }

  // ------------------------------------------------------------------ when to show it
  const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)') : { matches: false };
  const ipad = /Mac/.test(navigator.platform || '') && (navigator.maxTouchPoints || 0) > 1;      // iPadOS says it is a Mac
  const phone = coarse.matches || ipad || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  let touched = false, quiet = false;         // a real finger was seen / a keyboard or controller took over
  function want() {
    const m = RF.CONFIG.TOUCH_MODE;
    if (m === 'on') return true;
    if (m === 'off') return false;
    return (phone || touched) && !quiet;
  }
  function seenTouch() { touched = true; if (quiet) { quiet = false; refresh(); } else refresh(); }
  window.addEventListener('keydown', (e) => { if (e.isTrusted && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) && !quiet) { quiet = true; refresh(); } });
  window.addEventListener('gamepadconnected', () => { quiet = true; refresh(); });
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && (touched === false || quiet)) { touched = true; quiet = false; refresh(); } }, true);

  // ------------------------------------------------------------------ layout
  const probe = doc.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  doc.body.appendChild(probe);
  function insets() { const s = getComputedStyle(probe); return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Sizes the canvas for the screen and the controller around it. Returns the canvas size in CSS pixels.
  function fit(gw, gh) {
    const vw = window.innerWidth, vh = window.innerHeight, ins = insets(), portrait = vh > vw * 1.08;
    const availW = vw - ins.l - ins.r;
    let scale;
    if (portrait) scale = availW / gw;
    else {
      scale = Math.min(availW / gw, (vh - ins.t - ins.b) / gh);
      const f = Math.floor(scale); if (f >= 2 && f >= scale * 0.9) scale = f;   // whole pixels when it costs little
    }
    const w = Math.floor(gw * scale), h = Math.floor(gh * scale);
    const size = RF.CONFIG.TOUCH_SIZE || 1, m = portrait ? 14 : 10;
    let u = (portrait ? clamp(vw * 0.11, 34, 64) : clamp(vh * 0.105, 34, 62)) * size;
    u = Math.min(u, (availW - 3 * m) / 9.5, portrait ? 1e9 : (vw * 0.64 - 2 * m) / 9.3);
    root.style.setProperty('--u', u.toFixed(1) + 'px');
    root.style.setProperty('--m', m + 'px');
    root.style.setProperty('--mb', (portrait ? Math.max(14, Math.round((vh - ins.t - h) * 0.07)) : 10) + 'px');
    // The pause / sound / fullscreen buttons go where the picture is not: under it (portrait), in the
    // side margin, or the band above it. On a screen with neither, a small column below the health bars.
    const bs = Math.max(34, u * 0.95), gx = (vw - w) / 2, gy = (vh - h) / 2;
    let tt, tr, col = false, tight = false;
    if (portrait) { tt = ins.t + h + 8; tr = ins.r + 8; }
    else if (gx - Math.max(ins.l, ins.r) >= bs + 12) { col = true; tt = ins.t + 8; tr = Math.max(ins.r + 4, (gx - bs) / 2); }
    else if (gy >= bs + 10) { tt = (gy - bs) / 2; tr = ins.r + 10; }
    else { col = true; tight = true; tt = gy + h * 0.22; tr = ins.r + 6; }
    root.style.setProperty('--tt', Math.round(tt) + 'px');
    root.style.setProperty('--tr', Math.round(tr) + 'px');
    doc.body.classList.toggle('portrait', portrait); root.classList.toggle('col', col); root.classList.toggle('tight', tight);
    return { w, h, portrait };
  }

  // ------------------------------------------------------------------ keep the screen in step with the mode
  let shown = null, hintShown = false;
  function refresh() {
    const on = want(), swap = !!RF.CONFIG.TOUCH_SWAP, size = RF.CONFIG.TOUCH_SIZE;
    root.classList.toggle('swap', swap);
    api.active = on;
    doc.body.classList.toggle('touch', on);
    const key = on + '|' + swap + '|' + size;
    if (key !== shown) { shown = key; window.dispatchEvent(new Event('resize')); }
    if (!on) releaseAll();
    else if (!hintShown && RF.game && window.innerHeight > window.innerWidth * 1.08) { hintShown = true; RF.game.toast = { text: 'TURN YOUR PHONE SIDEWAYS FOR A BIGGER SCREEN', t: 260 }; }
  }
  // Menu screens show the controller in a quiet mode: stick + OK/BACK; the rest fades out.
  let menuMode = null;
  function tick() {
    if (!api.active) return;
    const sc = RF.game && RF.game.scene, inMenu = !!sc && !(sc.fighters && !sc.paused && sc.phase !== 'matchOver') && !(RF.StoryScene && sc instanceof RF.StoryScene);
    if (inMenu !== menuMode) {
      menuMode = inMenu; root.classList.toggle('menu', inMenu);
      for (const [name, b] of Object.entries(BTNS)) if (b.menu) els[name].querySelector('span').textContent = inMenu ? b.menu : b.label;
    }
    bSound.classList.toggle('off', !!(RF.audio && RF.audio.muted));
  }

  function toggleFullscreen() {
    const el = doc.documentElement, on = doc.fullscreenElement || doc.webkitFullscreenElement;
    try {
      if (on) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      else {
        const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* not allowed */ } }).catch(() => {});
      }
    } catch (e) { /* not available here */ }
  }

  // ------------------------------------------------------------------ on-screen words that name keys
  // In touch mode the hints that say ENTER or ESC say what is on the buttons instead.
  const SWAPS = [[/PRESS ANY BUTTON(?! ON)/g, 'TAP TO START'], [/HOLD ESC/g, 'HOLD PAUSE'], [/ESC: BACK/g, 'BACK: GO BACK'], [/ARROWS \/ WASD/g, 'THE STICK'],
    [/PRESS (?:ENTER|CONFIRM)/g, 'TAP OK'], [/ENTER \/ LIGHT/g, 'OK'], [/\bENTER\b/g, 'OK'], [/\bESC\b/g, 'BACK']];
  const drawText0 = RF.font.drawText;
  RF.font.drawText = function (ctx, text, x, y, opts) {
    if (api.active) { let s = String(text); if (/ENTER|ESC|CONFIRM|PRESS ANY|ARROWS/i.test(s)) { s = s.toUpperCase(); for (const [re, to] of SWAPS) s = s.replace(re, to); text = s; } }
    return drawText0.call(this, ctx, text, x, y, opts);
  };

  const api = { active: false, takeTap, pulse, fit, tick, refresh, toggleFullscreen, root };
  RF.touch = api;
  coarse.addEventListener && coarse.addEventListener('change', refresh);
  window.addEventListener('orientationchange', () => setTimeout(() => window.dispatchEvent(new Event('resize')), 120));
  refresh();
})();
