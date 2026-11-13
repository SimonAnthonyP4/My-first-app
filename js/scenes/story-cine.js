// STORY MODE: the cinema layer. What the Keeper, the army and the trial needed.
//
//  FRAME      { aspect: 'scope' | 'ultra' | 'open' | pixels, frames? }   the black bars close in (ultra: the ones
//                                                                       above the school are speaking) or open up
//  THE ARMY   { crowd: { n, x: [x0, x1], z: [z0, z1], aisle: [lo, hi], look: 'forgotten' | 'students' | 'mixed',
//                        facing: 1 | -1 | 'aisle', act } }  { crowd: null }
//             hundreds of people, drawn in true depth by the 3D camera (and in rows behind the actors in flat shots)
//             { crowdAct: 'idle' | 'walk' | 'kneel' | 'cheer' | 'dazed' }   { crowdMove: [dx, frames] } (they march)
//             { crowdLook: ['flip', fromX, speed] }   their faces come back (or are taken), in a wave from fromX
//  TIME       { freeze: true | [keys] | false, except: [keys] }   everything (or just those people) stops where it is
//             { thaw: key | [keys] }   ...and these may move again
//  LIGHT      { aura: [key, 'gold' | 'cosmic' | 'white' | 'violet' | null] }   a halo / a glow on someone
//             { bloom: 0..1 }  { aberration: pixels }  { glitch: frames }      bright things glow / colours split / the picture tears
//             { column: [key | x, frames] }   a pillar of light comes down    { blink: [key, x, z?] }   they are somewhere else
//             { seal: key }   an orb closes around them, and then there is nothing there
//  WORDS      { stamp: ['SEALED', colour?] }   a rubber stamp across the picture (it does not stop the scene)
//  SHOTS      { panels: [keyA, keyB, keyC] }   three faces at once, in slanted panels
//  INSERTS    monitors (every universe, on a wall of screens)   log (the Keeper's incident log)   pass (a visitor's
//             pass)   badge   gavel   sealmap (the school, room by room)   door (the door between)
// Loaded after story-war.js.
(function () {
  const K = RF.storyKit, P = RF.StoryScene.prototype, T = K.T, R = K.R, INS = K.INSERTS, W = 384, H = 224, BAR = 30;
  const GOLD = '#ffd75a', WHITE = '#fff6d0', VIOLET = '#9a6aff', ICE = '#9adcff';

  // how the new ones sound (the speech voice; recorded lines replace it where they exist)
  Object.assign(RF.VOICES, {
    riley: { g: 'm', lang: 'en-US', pitch: 0.62, rate: 0.84 },    // a night-shift voice: level, unhurried, final
    judge: { g: 'm', lang: 'en-GB', pitch: 0.2, rate: 0.7 },      // from the bench above everything
    olu: { g: 'm', lang: 'en-US', pitch: 0.82, rate: 0.96 },      // never raises it
    loor: { g: 'm', lang: 'es', pitch: 0.95, rate: 1.04 },        // Ecuador, by way of the pizza oven
    bruiser: { g: 'm', lang: 'en-US', pitch: 0.55, rate: 0.9 },
    viper: { g: 'f', lang: 'en-US', pitch: 1.15, rate: 1.12 },
  });
  // name colour, line colour: the ones above the school do not sound like anyone in it
  K.SUB = { riley: ['#8fe6ff', '#eafcff'], judge: ['#ffe9a0', '#fff8dc'], olu: ['#ffd75a', '#ffffff'] };

  // ---------------------------------------------------------------- the army
  const LOOKS = ['tyler', 'simon', 'alejandro', 'bandy', 'ruano', 'holbrook', 'erick', 'mikey', 'brady', 'landa'];
  const CW = K.CROWD_W = 76, CH = K.CROWD_H = 124;
  const sprites = {}, frames = {};
  const lookDef = (look) => {
    const [kind, id, n] = look.split(':'), base = RF.getCharacter(id);
    if (kind === 'f') return RF.forgottenDef(base);
    return base.sprite.palette ? RF.costume(base, 'alt' + (1 + (+n % 3))) : base;
  };
  const ACTS = { idle: ['idle', 2, 14], walk: ['walk', 4, 5], kneel: ['crouch', 1, 1], cheer: ['victory', 2, 16], dazed: ['dazed', 2, 16] };
  // one of the army, as a ready-made picture (so four hundred of them cost four hundred blits, not four hundred sprites)
  K.crowdFrame = function (crowd, c, t, tone) {
    const tt = crowd.frozen || t, look = c.flipAt && t >= c.flipAt ? c.look2 : c.look;
    const [anim, n, rate] = ACTS[c.act || crowd.act] || ACTS.idle, fr = n > 1 ? Math.floor((tt + c.seed) / rate) % n : 0;
    const key = look + '|' + anim + '|' + fr + '|' + tone;
    let cv = frames[key];
    if (cv === undefined) {
      try {
        const sp = sprites[look] || (sprites[look] = RF.createSprite(lookDef(look)));
        const m = RF.util.makeCanvas(CW, CH); cv = m[0];
        sp.draw(m[1], anim, fr, CW / 2, CH - 2, 1);
        if (tone) { m[1].globalCompositeOperation = 'source-atop'; m[1].fillStyle = tone === 2 ? 'rgba(0,0,0,0.7)' : 'rgba(4,0,12,0.36)'; m[1].fillRect(0, 0, CW, CH); }
      } catch (e) { cv = null; }
      frames[key] = cv;
    }
    return cv;
  };
  function buildCrowd(o) {
    const rnd = RF.util.rng((o.seed || 412) * 7 + 3), [x0, x1] = o.x || [-280, 660], [z0, z1] = o.z || [-380, 60];
    const gap = o.aisle ? o.aisle[1] - o.aisle[0] : 0, n = o.n || 200, xw = Math.max(1, x1 - x0 - gap), zw = Math.max(1, z1 - z0);
    const cols = Math.max(1, Math.round(Math.sqrt(n * xw / zw))), rows = Math.max(1, Math.ceil(n / cols)), list = [];
    const kind = o.look || 'forgotten';
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols && list.length < n; i++) {
      let x = x0 + (i + 0.5 + (r % 2) * 0.5 - 0.25) * (xw / cols) + (rnd() - 0.5) * 7;
      if (gap && x > o.aisle[0]) x += gap;
      const z = z0 + (r + 0.5) * (zw / rows) + (rnd() - 0.5) * 8, pick = Math.floor(rnd() * LOOKS.length), alt = Math.floor(rnd() * 3);
      const forg = kind === 'forgotten' || (kind === 'mixed' && rnd() < 0.5);
      list.push({ x, z, x0: x, odd: (r + i) % 2, seed: Math.floor(rnd() * 90), scale: 0.9 + rnd() * 0.14, look: (forg ? 'f:' : 's:') + LOOKS[pick] + ':' + alt, look2: (forg ? 's:' : 'f:') + LOOKS[pick] + ':' + alt,
        facing: o.facing === 'aisle' && gap ? (x < o.aisle[0] ? 1 : -1) : o.facing === 'aisle' ? 1 : o.facing || 1 });
    }
    return { list, act: o.act || 'idle', frozen: 0 };
  }
  // flat shots: the ones standing behind the action, in rows, smaller the further back they are
  P.drawCrowd2D = function (ctx, fy, zoom) {
    const cr = this.crowd; if (!cr) return;
    const back = cr.back || (cr.back = cr.list.filter((c) => c.z > 8 && c.z <= 82).sort((a, b) => b.z - a.z));
    const cx = this.cam.x, half = W / 2 / Math.max(1, zoom) + 40;
    for (const c of back) {
      if (Math.abs(c.x - cx) > half && zoom > 1.2) continue;
      const img = K.crowdFrame(cr, c, this.t, 1); if (!img) continue;
      const k = (1 - c.z * 0.0042) * (c.scale || 1);
      ctx.save(); ctx.translate(Math.round(c.x), Math.round(fy - c.z * 0.7)); ctx.scale(c.facing * k, k); ctx.drawImage(img, -CW / 2, -CH + 2); ctx.restore();
    }
  };

  // ---------------------------------------------------------------- instant steps
  const ASPECT = { scope: 30, ultra: 46, open: 12, full: 0 };
  const instantExtra = P.instantExtra;
  P.instantExtra = function (s) {
    if (s.clear) { this.crowd = null; this.frozenAll = 0; this.fxList = []; this.stamps = []; }   // (a new place: the base step does the rest)
    if (s.aspect !== undefined) {
      const v = Array.isArray(s.aspect) ? s.aspect : [s.aspect, s.frames];
      this.barTo = v[0] == null ? BAR : typeof v[0] === 'number' ? v[0] : ASPECT[v[0]] == null ? BAR : ASPECT[v[0]];
      this.barSp = Math.abs(this.barTo - (this.barH == null ? BAR : this.barH)) / Math.max(1, v[1] || 40);
      return true;
    }
    if (s.crowd !== undefined) { this.crowd = s.crowd ? buildCrowd(s.crowd) : null; return true; }
    if (s.crowdAct) { if (this.crowd) { this.crowd.act = s.crowdAct; for (const c of this.crowd.list) c.act = null; } return true; }
    if (s.crowdMove) { const cr = this.crowd; if (cr) { cr.mv = { dx: s.crowdMove[0], len: s.crowdMove[1] || 120, t: 0 }; for (const c of cr.list) { c.x0 = c.x; if (s.crowdMove[0]) c.facing = Math.sign(s.crowdMove[0]); } cr.was = cr.act; cr.act = 'walk'; cr.back = null; } return true; }
    if (s.crowdLook) {
      const cr = this.crowd, [, from = 192, speed = 3] = s.crowdLook;
      if (cr) for (const c of cr.list) c.flipAt = this.t + Math.round(Math.hypot(c.x - from, c.z) / speed);
      return true;
    }
    if (s.freeze !== undefined) {
      const all = s.freeze === true, keys = Array.isArray(s.freeze) ? s.freeze.map((k) => this.resolve(k)) : null, except = (s.except || []).map((k) => this.resolve(k));
      for (const [k, a] of Object.entries(this.actors)) {
        if (!s.freeze) { a.frozen = 0; continue; }
        if ((!all && !keys.includes(k)) || except.includes(k)) continue;
        if (a.def.id === 'riley' || a.def.id === 'judge' || a.def.id === 'olu') continue;      // not the ones time answers to
        if (a.wlen || a.zlen) { a.anim = 'walk'; a.at = this.t - 7; a.wlen = 0; a.zlen = 0; a.dashing = false; }
        a.ylen = 0; a.hopT = 0; a.talk = false; a.trembleT = 0; a.frozen = this.t;
      }
      if (this.crowd) this.crowd.frozen = s.freeze ? this.t : 0;
      if (all || !s.freeze) this.frozenAll = s.freeze ? this.t : 0;
      if (s.freeze) { RF.audio.sfx('gong'); this.flash = 5; }
      return true;
    }
    if (s.thaw) { for (const k of [].concat(s.thaw)) { const a = this.actor(k); if (a) a.frozen = 0; } return true; }
    if (s.aura) { const a = this.actor(s.aura[0]); if (a) a.aura = s.aura[1] || null; return true; }
    if (s.bloom !== undefined) { this.bloomN = s.bloom || 0; return true; }
    if (s.aberration !== undefined) { this.aberN = s.aberration || 0; return true; }
    if (s.glitch) { this.glitchT = s.glitch; RF.audio.sfx('zap'); return true; }
    if (s.stamp && !s.insert) { (this.stamps = this.stamps || []).push({ text: s.stamp[0], color: s.stamp[1] || '#ff4040', t: 0, n: this.stamps.length }); RF.audio.sfx('clang'); this.shake = Math.max(this.shake, 5); return true; }
    if (s.column) {
      const who = typeof s.column[0] === 'string' ? this.actor(s.column[0]) : null;
      (this.fxList = this.fxList || []).push({ kind: 'column', x: who ? who.x : s.column[0], z: who ? who.z || 0 : s.column[2] || 0, t: 0, len: s.column[1] || 110 });
      RF.audio.sfx('boom'); this.flash = 8; return true;
    }
    if (s.blink) {
      const a = this.actor(s.blink[0]);
      if (a) {
        (this.fxList = this.fxList || []).push({ kind: 'ring', x: a.x, z: a.z || 0, y: a.y, t: 0, len: 20 }, { kind: 'ring', x: s.blink[1], z: s.blink[2] == null ? a.z || 0 : s.blink[2], y: a.y, t: 0, len: 20 });
        a.x = s.blink[1]; if (s.blink[2] != null) a.z = s.blink[2]; a.hitT = 5; a.wlen = 0;
      }
      RF.audio.sfx('zap'); return true;
    }
    if (s.seal) { const a = this.actor(s.seal); if (a) { a.sealT = 1; a.seal0 = a.scale || 1; a.talk = false; } RF.audio.sfx('arcane'); return true; }
    if (s.panels) { this.shot = { type: 'panels', keys: s.panels.map((k) => this.resolve(k)), t0: this.t }; this.insert = null; RF.audio.sfx('whoosh'); return true; }
    return instantExtra ? instantExtra.call(this, s) : false;
  };

  // ---------------------------------------------------------------- per frame
  const tickExtra = P.tickExtra;
  P.tickExtra = function (kb) {
    if (this.barTo != null) { const cur = this.barH == null ? BAR : this.barH, d = this.barTo - cur; this.barH = Math.abs(d) <= (this.barSp || 1) ? this.barTo : cur + Math.sign(d) * (this.barSp || 1); }
    if (this.glitchT > 0) this.glitchT--;
    if (this.stamps) { for (const st of this.stamps) st.t++; this.stamps = this.stamps.filter((st) => st.t < 170); }
    if (this.fxList) { for (const f of this.fxList) f.t++; this.fxList = this.fxList.filter((f) => f.t < f.len); }
    const cr = this.crowd;
    if (cr && cr.mv && !cr.frozen) { const m = cr.mv; m.t++; const u = Math.min(1, m.t / m.len); for (const c of cr.list) c.x = c.x0 + m.dx * u; if (u >= 1) { cr.mv = null; cr.act = cr.was || 'idle'; cr.back = null; } }
    for (const [k, a] of Object.entries(this.actors)) {
      if (!a.sealT) continue;
      a.sealT++; a.scale = a.seal0 * Math.max(0.3, 1 - a.sealT / 110);
      if (a.sealT > 74) { (this.fxList = this.fxList || []).push({ kind: 'ring', x: a.x, z: a.z || 0, y: a.y + 20, t: 0, len: 22 }); delete this.actors[k]; this.flash = Math.max(this.flash, 8); this.shake = Math.max(this.shake, 6); RF.audio.sfx('ko'); }
    }
    return tickExtra ? tickExtra.call(this, kb) : false;
  };

  // a memory (or a cut to somewhere else) does not take the army, the frozen clock or the look with it
  const KEEP = ['crowd', 'frozenAll', 'bloomN', 'aberN', 'fxList', 'stamps', 'barH', 'barTo'];
  const godTone = (id) => {
    const A = RF.audio; if (!A || !A.ctx || A.muted) return;
    const t = A.ctx.currentTime, f = id === 'judge' ? 41 : id === 'olu' ? 73 : 55;
    try { A.tone('sine', f, t, 1.5, 0.22, A.sfxBus, f); A.tone('sine', f * 1.5, t, 1.2, 0.07, A.sfxBus, f * 1.5); A.tone('triangle', f * 8, t, 0.5, 0.018, A.sfxBus, f * 8.02); } catch (e) { /* no audio */ }
  };
  const beginStep = P.beginStep;
  P.beginStep = function (s) {
    if (beginStep) beginStep.call(this, s);
    if (s.recall && this.rc) {   // (they go in with everything else the memory puts away, and come back with it)
      for (const k of KEEP) this.rc.save[k] = this[k];
      this.crowd = null; this.frozenAll = 0; this.bloomN = 0; this.aberN = 0; this.fxList = []; this.stamps = []; this.barH = BAR; this.barTo = null;
    }
    if (s.say && !(s.say[2] && s.say[2].radio)) { const a = this.actor(s.say[0]), def = a ? a.def : RF.getCharacter(this.resolve(s.say[0])); if (def && K.SUB[def.id]) godTone(def.id); }
  };

  // A slow device: if frames have been taking too long for a second and a half, the glow goes and a
  // big army is drawn as every other soldier (for the rest of the session; nothing else changes).
  const render0 = P.render;
  P.render = function (ctx) {
    const t0 = performance.now(); render0.call(this, ctx);
    const ms = performance.now() - t0; K.ms = (K.ms == null ? ms : K.ms) * 0.95 + ms * 0.05;
    if (K.ms > 15) { if (!K.lowFx && (K.slow = (K.slow || 0) + 1) > 90) K.lowFx = true; } else K.slow = 0;
  };

  // ---------------------------------------------------------------- a shot of its own: reaction panels
  P.drawShotExtra = function (ctx, sh, fy) {
    if (sh.type !== 'panels') return false;
    const as = sh.keys.map((k) => this.actors[k]).filter(Boolean), n = as.length;
    if (!n) return false;
    const k = Math.min(1, (this.t - sh.t0) / 7), pw = W / n, sl = 13;
    R(ctx, '#000', 0, 0, W, H);
    as.forEach((a, i) => {
      const x0 = i * pw, off = (1 - k) * (i % 2 ? 26 : -26);
      ctx.save(); ctx.beginPath();
      ctx.moveTo(x0 + sl + 2, 0); ctx.lineTo(x0 + pw + sl - 2, 0); ctx.lineTo(x0 + pw - sl - 2, H); ctx.lineTo(x0 - sl + 2, H); ctx.closePath(); ctx.clip();
      ctx.translate(x0 + pw / 2 - W / 2, off);
      const tall = a.def.body.height * (a.scale || 1), hv = (a.def.sprite && a.def.sprite.hover) || 0;
      this.drawWorld(ctx, { x: a.x + a.facing * 2, y: fy - a.y - hv - tall * 0.8, z: 3.3 + k * 0.2, rot: 0 }, { only: [a], free: true });
      ctx.restore();
    });
    return true;
  };

  // ---------------------------------------------------------------- light, on the picture
  let buf = null, tmp = null;
  const grab = (ctx) => { if (!buf) { buf = RF.util.makeCanvas(W, H); tmp = RF.util.makeCanvas(W, H); } buf[1].clearRect(0, 0, W, H); buf[1].drawImage(ctx.canvas, 0, 0, W, H); return buf[0]; };
  const AURA = {
    gold: ['rgba(255,225,120,0.55)', 'rgba(255,225,120,0)', GOLD, VIOLET],
    cosmic: ['rgba(140,220,255,0.5)', 'rgba(154,106,255,0)', ICE, GOLD],
    white: ['rgba(255,250,230,0.6)', 'rgba(255,240,180,0)', WHITE, GOLD],
    violet: ['rgba(176,112,255,0.5)', 'rgba(90,20,160,0)', '#b070ff', '#ff2a3c'],
  };
  const fx0 = P.drawFxLayer;
  P.drawFxLayer = function (ctx) {
    const t = this.t;
    // ---- things in the world: halos, columns of light, rings, the orb that seals ----
    for (const a of Object.values(this.actors)) {
      if (a.stage || !(a.aura || a.sealT)) continue;
      const tall = a.def.body.height * (a.scale || 1);
      const p = this.screenPos(a, tall * 0.55); if (!p) continue;
      const kk = Math.max(0.5, p.k);
      if (a.aura && AURA[a.aura]) {
        const [c0, c1, ring, mote] = AURA[a.aura], r = (a.aura === 'white' ? 70 : 54) * kk;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t / 13);
        const g = ctx.createRadialGradient(p.x, p.y, 3 * kk, p.x, p.y, r); g.addColorStop(0, c1); g.addColorStop(0.34, c1); g.addColorStop(0.62, c0); g.addColorStop(1, c1);   // (clear in the middle: whoever is in it stays readable)
        ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        if (a.aura === 'white') { ctx.globalAlpha = 0.14 + 0.05 * Math.sin(t / 9); for (let i = 0; i < 7; i++) { const an = i * 0.9 + t / 160; ctx.beginPath(); ctx.moveTo(p.x, p.y - 10 * kk); ctx.lineTo(p.x + Math.cos(an) * 190, p.y + Math.sin(an) * 190); ctx.lineTo(p.x + Math.cos(an + 0.11) * 190, p.y + Math.sin(an + 0.11) * 190); ctx.fill(); } }
        ctx.restore();
        ctx.save(); ctx.lineWidth = Math.max(1, kk);
        if (a.aura === 'gold') {                                            // the halo: a gold ring that breathes
          const h = this.screenPos(a, tall + 5 + Math.sin(t / 14) * 1.5);
          if (h) { ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = Math.max(2, 3 * kk); ctx.beginPath(); ctx.ellipse(h.x + a.facing * kk, h.y, 11 * kk, 3.2 * kk, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = ring; ctx.lineWidth = Math.max(1, 2 * kk); ctx.beginPath(); ctx.ellipse(h.x + a.facing * kk, h.y, 11 * kk, 3.2 * kk, 0, 0, 7); ctx.stroke(); }
        } else if (a.aura === 'cosmic') {                                   // two rings turning round him, like the picture
          ctx.globalAlpha = 0.55; ctx.strokeStyle = ring; ctx.beginPath(); ctx.ellipse(p.x, p.y, 30 * kk, 9 * kk, t / 50, 0, 7); ctx.stroke();
          ctx.strokeStyle = mote; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * kk, 34 * kk, -t / 64, 0, 7); ctx.stroke();
        }
        ctx.restore();
        for (let i = 0; i < 5; i++) { const an = t / 22 + i * 1.26; R(ctx, i % 2 ? ring : mote, p.x + Math.cos(an) * 16 * kk, p.y + Math.sin(an * 1.3) * tall * 0.42 * kk, 1, 1); }
      }
      if (a.sealT) {
        const r = Math.max(6, tall * 0.7 * kk * (1 - a.sealT / 150));
        const g = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, r); g.addColorStop(0, 'rgba(255,230,140,0.05)'); g.addColorStop(1, 'rgba(255,230,140,0.75)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
        ctx.strokeStyle = WHITE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
        ctx.strokeStyle = GOLD; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.28, t / 9 + i * 1.05, 0, 7); ctx.stroke(); }
      }
    }
    for (const f of this.fxList || []) {
      const p = this.screenPos({ x: f.x, y: f.y || 0, z: f.z }, 0); if (!p) continue;
      const u = f.t / f.len, kk = Math.max(0.5, p.k);
      if (f.kind === 'column') {
        const a = Math.min(1, u / 0.12, (1 - u) / 0.3), w = 24 * kk * (1 - u * 0.4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.75;
        const g = ctx.createLinearGradient(0, 0, 0, p.y); g.addColorStop(0, 'rgba(255,240,180,0.15)'); g.addColorStop(1, 'rgba(255,240,180,0.95)');
        ctx.fillStyle = g; ctx.globalAlpha = a * 0.5; ctx.fillRect(p.x - w, 0, w * 2, p.y); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(p.x - w, 0, 2, p.y); ctx.fillRect(p.x + w - 2, 0, 2, p.y);   // (bright at its edges: whoever is inside it can still be seen)
        ctx.globalAlpha = a; ctx.strokeStyle = WHITE;
        for (let i = 0; i < 4; i++) { const yy = p.y - ((t * 3 + i * 40) % 160) * kk; ctx.beginPath(); ctx.ellipse(p.x, yy, w * 1.4, 4 * kk, 0, 0, 7); ctx.stroke(); }
        ctx.restore();
      } else if (f.kind === 'ring') {
        ctx.save(); ctx.globalAlpha = 1 - u; ctx.lineWidth = 2;
        ctx.strokeStyle = f.t % 4 < 2 ? GOLD : VIOLET; ctx.beginPath(); ctx.ellipse(p.x, p.y - 36 * kk, (5 + f.t * 1.5) * kk, (26 + f.t) * kk, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = WHITE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y - 36 * kk, (3 + f.t) * kk, 20 * kk, 0, 0, 7); ctx.stroke();
        ctx.restore();
      }
    }
    // ---- everything the scene already had (weather, grading, emotes): held still while time is ----
    if (this.frozenAll) { this.t = this.frozenAll; try { fx0.call(this, ctx); } finally { this.t = t; } } else fx0.call(this, ctx);
    if (this.frozenAll) {   // the stopped world: colour drains, the dust hangs where it was
      const k = Math.min(1, (t - this.frozenAll) / 24);
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.62 * k; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.4 * k; ctx.fillStyle = '#3aa0ff'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.fillStyle = '#eafcff'; for (let i = 0; i < 46; i++) { ctx.globalAlpha = (0.2 + (i % 5) * 0.1) * k; ctx.fillRect((i * 83 + this.frozenAll * 7) % W, 30 + (i * 47 + this.frozenAll * 3) % 164, 1 + (i % 3 === 0), 1); }
      ctx.globalAlpha = 1;
    }
    // ---- the lens ----
    if (this.bloomN > 0 && !K.lowFx && 'filter' in ctx) {   // only what is already bright spills light (the picture times itself: the darks drop out)
      const b = grab(ctx), c = tmp[1];
      c.globalCompositeOperation = 'source-over'; c.drawImage(b, 0, 0); c.globalCompositeOperation = 'multiply'; c.drawImage(b, 0, 0); c.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.8, this.bloomN * 1.3); ctx.filter = 'blur(4px)'; ctx.drawImage(tmp[0], 0, 0); ctx.restore(); ctx.filter = 'none';
    }
    if (this.aberN > 0) {
      const b = grab(ctx), n = this.aberN * (1 + 0.25 * Math.sin(t / 7)), c = tmp[1];
      ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (const [col, dx] of [['#ff0000', -n], ['#00ff00', 0], ['#0000ff', n]]) {
        c.globalCompositeOperation = 'source-over'; c.drawImage(b, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = col; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
        ctx.drawImage(tmp[0], Math.round(dx), 0);
      }
      ctx.restore();
    }
    if (this.glitchT > 0) {
      const b = grab(ctx);
      for (let i = 0; i < 7; i++) { const y = Math.floor(Math.random() * H), h = 2 + Math.floor(Math.random() * 14), dx = Math.round((Math.random() - 0.5) * 44); ctx.drawImage(b, 0, y, W, h, dx, y, W, h); }
      ctx.globalAlpha = 0.5; for (let i = 0; i < 4; i++) R(ctx, i % 2 ? '#8fe6ff' : GOLD, Math.random() * W, Math.random() * H, 20 + Math.random() * 60, 1); ctx.globalAlpha = 1;
    }
  };

  // ---------------------------------------------------------------- stamps (over the picture, under the words)
  const drawUI = P.drawUI;
  P.drawUI = function (ctx, s) {
    for (const st of this.stamps || []) {
      const k = Math.min(1, st.t / 5), a = Math.min(1, (170 - st.t) / 24), sc = 2, w = RF.font.textWidth(st.text) * sc + 16;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ctx.translate(W / 2 + 62 - (st.n % 2) * 124, 78 + (st.n % 3) * 26); ctx.rotate(-0.12 + (st.n % 2) * 0.2); ctx.scale(1 + (1 - k) * 1.6, 1 + (1 - k) * 1.6);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-w / 2, -13, w, 26);
      ctx.strokeStyle = st.color; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 1, -12, w - 2, 24); ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 4, -9, w - 8, 18);
      T(ctx, st.text, 0, -7, { scale: sc, align: 'center', color: st.color, outline: '#000' });
      ctx.restore();
    }
    if (drawUI) drawUI.call(this, ctx, s);
  };

  // ---------------------------------------------------------------- inserts
  const tiny = (ctx, x, y, w, h, i, t, sealed) => {   // one universe, on one screen
    const SK = [['#4a90e0', '#bfe4ff'], ['#ff4fb0', '#ffb040'], ['#02030a', '#141a2e'], ['#3a0806', '#ff7a10'], ['#0a3a2a', '#8fe0a0'], ['#2a1a4a', '#c080ff']][i % 6];
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, SK[0]); g.addColorStop(1, SK[1]); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    R(ctx, 'rgba(0,0,0,0.6)', x + w * 0.2, y + h * 0.5, w * 0.6, h * 0.5); R(ctx, 'rgba(0,0,0,0.6)', x + w * 0.44, y + h * 0.32, w * 0.12, h * 0.2);
    for (let k = 0; k < 4; k++) R(ctx, sealed ? '#8a8a8a' : ((t / 30 + k + i) | 0) % 5 ? '#ffd870' : '#3a3020', x + w * 0.26 + k * w * 0.13, y + h * 0.62 + ((k + i) % 2) * h * 0.16, 2, 2);
    if (sealed) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(x, y, w, h); ctx.restore(); R(ctx, 'rgba(180,230,255,0.25)', x, y, w, h); }
    else { ctx.globalAlpha = 0.12; R(ctx, '#ffffff', x, y + ((t * 0.6 + i * 9) % h), w, 2); ctx.globalAlpha = 1; }
  };
  // the wall of screens at the Keeper's desk: every Terramania High there is (o.sealed: how many have been closed;
  // o.focus: the one he is looking at; o.kept: how many wear a crown)
  INS.monitors = function (ctx, t, o) {
    R(ctx, '#02040a', 0, 0, W, H);
    const cols = 8, rows = 4, w = 40, h = 23, x0 = (W - cols * (w + 5) + 5) / 2, y0 = 51;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = x0 + c * (w + 5), y = y0 + r * (h + 5), sealed = i < (o.sealed || 0), kept = !sealed && i % 3 === 1 && i < (o.kept || 0) * 3;
      R(ctx, '#0a1420', x - 2, y - 2, w + 4, h + 4); tiny(ctx, x, y, w, h, i, t, sealed);
      if (kept) { R(ctx, 'rgba(120,20,200,0.4)', x, y, w, h); R(ctx, '#b070ff', x + w / 2 - 4, y + 2, 8, 2); for (let k = 0; k < 3; k++) R(ctx, '#b070ff', x + w / 2 - 4 + k * 3, y, 2, 2); }
      if (sealed) T(ctx, 'SEALED', x + w / 2, y + h / 2 - 3, { align: 'center', color: '#dff6ff', outline: '#000' });
      if (o.focus === i) { ctx.strokeStyle = (t >> 3) % 2 ? GOLD : WHITE; ctx.lineWidth = 2; ctx.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5); ctx.lineWidth = 1; }
    }
    ctx.globalAlpha = 0.07; for (let y = 30; y < 194; y += 3) R(ctx, '#8fe6ff', 0, y, W, 1); ctx.globalAlpha = 1;
    if (o.text) { R(ctx, 'rgba(0,0,0,0.7)', 0, 162, W, 16); T(ctx, o.text, W / 2, 166, { align: 'center', color: '#8fe6ff', outline: '#000' }); }
  };
  // the Keeper's incident log: typed a line at a time (o.lines), then stamped (o.stamp)
  INS.log = function (ctx, t, o) {
    R(ctx, '#03080e', 0, 0, W, H); R(ctx, '#061420', 30, 49, W - 60, 126); R(ctx, '#0c2434', 30, 49, W - 60, 13);
    T(ctx, 'KEEPER OF TERRAMANIA - INCIDENT LOG', W / 2, 52, { align: 'center', color: '#8fe6ff' });
    const lines = o.lines || []; let done = true;
    lines.forEach((l, i) => { const n = Math.floor((t - 16 - i * 34) / 1.1); if (n < l.length) done = false; if (n > 0) T(ctx, l.slice(0, n), 40, 68 + i * 12, { color: i === 0 ? WHITE : '#b8e8f8' }); });
    if (!done && (t >> 3) % 2) { const i = Math.min(lines.length - 1, Math.max(0, Math.floor((t - 16) / 34))); R(ctx, '#8fe6ff', 40 + Math.min(lines[i].length, Math.max(0, Math.floor((t - 16 - i * 34) / 1.1))) * 6, 68 + i * 12, 4, 7); }
    const at = 16 + lines.length * 34 + 20;
    if (o.stamp && t > at) { const k = Math.min(1, (t - at) / 5); ctx.save(); ctx.translate(284, 150); ctx.rotate(-0.16); ctx.scale(1 + (1 - k) * 1.4, 1 + (1 - k) * 1.4); const w = RF.font.textWidth(o.stamp) * 2 + 14; ctx.strokeStyle = o.color || '#ff5050'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -12, w, 24); ctx.lineWidth = 1; T(ctx, o.stamp, 0, -7, { scale: 2, align: 'center', color: o.color || '#ff5050' }); ctx.restore(); }
    ctx.globalAlpha = 0.06; for (let y = 30; y < 194; y += 3) R(ctx, '#8fe6ff', 0, y, W, 1); ctx.globalAlpha = 1;
  };
  // a visitor's pass, slid across a desk (o.name, o.room, o.out)
  INS.pass = function (ctx, t, o) {
    R(ctx, '#0a0c14', 0, 0, W, H); for (let y = 30; y < 194; y += 14) R(ctx, '#0e1220', 0, y, W, 1);
    const k = Math.min(1, t / 26), e = 1 - (1 - k) * (1 - k);
    ctx.save(); ctx.translate(Math.round(W / 2 - (1 - e) * 220), 102); ctx.rotate(k < 1 ? (1 - e) * 0.3 : 0);
    R(ctx, '#000', -86, -48, 176, 100); R(ctx, '#f0ead8', -88, -50, 176, 100); R(ctx, '#c02020', -88, -50, 176, 22);
    T(ctx, 'VISITOR', 0, -46, { scale: 2, align: 'center', color: '#ffffff' });
    T(ctx, 'NAME:  ' + (o.name || ''), -78, -20, { color: '#1a1a2a' }); T(ctx, 'ROOM:  ' + (o.room || ''), -78, -5, { color: '#1a1a2a' });
    T(ctx, 'TIME IN:  MIDNIGHT', -78, 10, { color: '#1a1a2a' }); T(ctx, 'TIME OUT: ' + (o.out ? o.out.slice(0, Math.max(0, Math.floor((t - 60) / 8))) : ''), -78, 25, { color: '#a01818' });
    for (const y of [-11, 4, 19, 34]) R(ctx, '#8a8470', -78, y, 156, 1);
    ctx.restore();
    if (o.text) T(ctx, o.text, W / 2, 166, { align: 'center', color: '#8fe6ff', outline: '#000' });
  };
  // a security badge. There is a line for a name. (o.name: what is written on it)
  INS.badge = function (ctx, t, o) {
    R(ctx, '#0a0c14', 0, 0, W, H);
    const g = ctx.createRadialGradient(192, 104, 10, 192, 104, 170); g.addColorStop(0, 'rgba(140,220,255,0.25)'); g.addColorStop(1, 'rgba(140,220,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const x = 138, y = 48;   // (drawn square to the screen: the small print has to stay readable)
    R(ctx, '#000', x + 2, y + 2, 108, 112); R(ctx, '#e8ecf0', x, y, 108, 112); R(ctx, '#14304a', x, y, 108, 20);
    T(ctx, 'SECURITY', x + 54, y + 3, { scale: 2, align: 'center', color: '#ffffff' });
    R(ctx, '#9aa4b0', x + 30, y + 24, 48, 46); R(ctx, '#c8d2dc', x + 32, y + 26, 44, 42);
    const d = RF.getCharacter('riley');
    if (d) { ctx.save(); ctx.beginPath(); ctx.rect(x + 32, y + 26, 44, 42); ctx.clip(); ctx.translate(x + 54, y + 104); RF.hoverShadow = false; RF.createSprite(Object.assign({}, d, { sprite: Object.assign({}, d.sprite, { hover: 0 }) })).draw(ctx, 'idle', 0, 0, 0, 1); RF.hoverShadow = true; ctx.restore(); }
    T(ctx, 'NAME:', x + 8, y + 78, { color: '#3a4450' }); R(ctx, '#3a4450', x + 40, y + 86, 60, 1);
    if (o.name) T(ctx, o.name.slice(0, Math.max(0, Math.floor((t - 30) / 6))), x + 70, y + 77, { align: 'center', color: '#14304a' });
    T(ctx, 'TERRAMANIA HIGH', x + 54, y + 98, { align: 'center', color: '#7a8490' });
    ctx.globalAlpha = 0.14 + 0.06 * Math.sin(t / 40); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 10, y + 112); ctx.lineTo(x, y + 112); ctx.lineTo(x, y + 60); ctx.fill(); ctx.globalAlpha = 1;
    if (o.text) T(ctx, o.text, W / 2, 166, { align: 'center', color: '#8fe6ff', outline: '#000' });
  };
  // the gavel comes down
  INS.gavel = function (ctx, t, o) {
    R(ctx, '#05040a', 0, 0, W, H);
    const hit = 22, u = Math.min(1, t / hit), ang = -1.1 + u * u * 1.1, after = t - hit;
    const g = ctx.createRadialGradient(192, 142, 4, 192, 142, 200); g.addColorStop(0, 'rgba(255,230,150,' + (after > 0 ? Math.max(0.15, 0.7 - after / 60) : 0.15) + ')'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    R(ctx, '#000', 142, 142, 100, 16); R(ctx, '#5a3e18', 144, 144, 96, 12); R(ctx, '#8a6224', 144, 144, 96, 3);          // the block
    ctx.save(); ctx.translate(250, 142); ctx.rotate(ang);
    R(ctx, '#000', -92, -6, 96, 10); R(ctx, '#7a5a10', -90, -4, 92, 6);
    R(ctx, '#000', -112, -24, 34, 44); R(ctx, GOLD, -110, -22, 30, 40); R(ctx, WHITE, -110, -22, 30, 6); R(ctx, '#a87810', -110, 12, 30, 6);
    ctx.restore();
    if (after > 0) { ctx.strokeStyle = WHITE; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = after * 5 - i * 22; if (r > 0) { ctx.globalAlpha = Math.max(0, 1 - r / 220); ctx.beginPath(); ctx.ellipse(192, 144, r, r * 0.3, 0, 0, 7); ctx.stroke(); } } ctx.globalAlpha = 1; ctx.lineWidth = 1; }
    if (after > 2 && o.text) T(ctx, o.text, W / 2, 56, { scale: 3, align: 'center', color: [WHITE, GOLD, '#a87810'], outline: '#000' });
    if (o.sub && after > 26) T(ctx, o.sub, W / 2, 84, { align: 'center', color: '#e8dcc0', outline: '#000' });
  };
  // the school from above, one room after another closed (o.n: how many; o.open: they come back)
  INS.sealmap = function (ctx, t, o) {
    R(ctx, '#03060c', 0, 0, W, H);
    const rooms = [[60, 50, 60, 30, 'THE GYM'], [126, 50, 62, 30, 'ROOM 314'], [194, 50, 66, 30, 'BAND ROOM'], [266, 50, 58, 30, 'OFFICE'], [60, 84, 110, 34, 'CAFETERIA'], [176, 84, 60, 34, 'HALLWAY'], [242, 84, 82, 34, 'THE LIBRARY'], [60, 122, 264, 38, 'THE FIELD']];
    rooms.forEach(([x, y, w, h, name], i) => {
      const at = 14 + i * 24, shut = o.open ? t < 200 - at : i < (o.n || 0) && t > at, k = o.open ? 0 : Math.min(1, Math.max(0, (t - at) / 6));
      R(ctx, '#0a1420', x, y, w, h); R(ctx, shut ? '#14222e' : '#1c3a2a', x + 1, y + 1, w - 2, h - 2);
      if (!shut) for (let j = 0; j < 4; j++) R(ctx, '#ffd870', x + 6 + ((j * 23 + i * 7 + Math.floor(t / 20) * 5) % Math.max(8, w - 12)), y + 6 + ((j * 13 + i * 5) % Math.max(6, h - 12)), 2, 2);   // people
      T(ctx, name, x + w / 2, y + 4, { align: 'center', color: shut ? '#4a5a6a' : '#b8e8c8' });
      if (shut && !o.open) { ctx.save(); ctx.translate(x + w / 2, y + h / 2 + 4); ctx.rotate(-0.1); ctx.scale(1 + (1 - k), 1 + (1 - k)); T(ctx, 'SEALED', 0, -3, { align: 'center', color: '#8fe6ff', outline: '#000' }); ctx.restore(); }
    });
    if (o.text) T(ctx, o.text, W / 2, 166, { align: 'center', color: o.open ? GOLD : '#8fe6ff', outline: '#000' });
  };
  // the door between universes (o.open 0..1: how far; o.from: it moves from there)
  INS.door = function (ctx, t, o) {
    const u = Math.min(1, t / 90), e = u * u * (3 - 2 * u), op = o.from == null ? (o.open || 0) : o.from + ((o.open || 0) - o.from) * e;
    R(ctx, '#020308', 0, 0, W, H);
    for (let i = 0; i < 50; i++) R(ctx, i % 6 ? '#3a4a6a' : '#8fe6ff', (i * 97) % W, 30 + (i * 53) % 150, 1, 1);
    const gw = 4 + op * 70;
    const g = ctx.createRadialGradient(192, 112, 2, 192, 112, 60 + op * 170); g.addColorStop(0, 'rgba(255,246,208,' + (0.5 + op * 0.4) + ')'); g.addColorStop(1, 'rgba(255,215,90,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    R(ctx, WHITE, 192 - gw / 2, 56, gw, 118);
    for (const sgn of [-1, 1]) {
      const x = 192 + sgn * gw / 2, w = 62 * (1 - op * 0.55);
      R(ctx, '#000', sgn > 0 ? x : x - w - 2, 54, w + 2, 122); R(ctx, '#1a2434', sgn > 0 ? x : x - w, 56, w, 118); R(ctx, '#243448', sgn > 0 ? x + 4 : x - w + 4, 61, Math.max(1, w - 8), 48); R(ctx, '#243448', sgn > 0 ? x + 4 : x - w + 4, 114, Math.max(1, w - 8), 55);
      R(ctx, GOLD, sgn > 0 ? x + 4 : x - 8, 106, 4, 10);
    }
    R(ctx, '#0a0e18', 110, 47, 164, 9); T(ctx, 'EXIT', 192, 48, { align: 'center', color: (t >> 4) % 2 || op > 0.5 ? '#60ff90' : '#1a5a30' });
    for (let i = 0; i < 12; i++) { ctx.globalAlpha = 0.5 * op; R(ctx, WHITE, 192 + Math.sin(t / 9 + i) * (10 + i * 9 * op), 172 - ((t * (1 + i % 3) + i * 31) % 116), 1, 2); } ctx.globalAlpha = 1;
    if (o.text) { R(ctx, 'rgba(0,0,0,0.6)', 0, 162, W, 14); T(ctx, o.text, W / 2, 166, { align: 'center', color: '#eafcff', outline: '#000' }); }
  };
})();
