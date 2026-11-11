// STORY MODE: the parts you play, and the show-level effects.
//
//  QUICK-TIME EVENTS   { qte: { type, key, text, who }, hit: [...], miss: [...], perfect: [...] }
//     type 'ring'   press KEY as the ring closes on the button (PERFECT / GOOD / MISS)
//     type 'mash'   hammer KEY to fill the bar in time            ({ need, len, rigged })
//     type 'swing'  stop the sliding marker in the green          ({ speed, zone })
//     key  light heavy block throw (Square Triangle Circle Cross / F G H T)  or  up down left right
//     The steps in hit / miss / perfect are played next, so a miss changes the scene - it never
//     fails it. Every prompt counts toward the chapter's STYLE RANK (S A B C).
//  CHOICES             { choice: { id, who, prompt, timer, options: [{ text, set, then, note, locked }] } }
//     The pick is saved as vars[id] = set; later scenes read it with { if: (v) => ..., then, else }.
//  BRANCHING           { if: (vars, state) => bool, then: [...], else: [...] }   { set: [key, value] }
//                      a walk / dash target of [key, gap] closes in on that actor; { depth: [key, z, frames] } walks in 3D
//  MEMORY              { recall: { bg, cast, shot | cam3d, say: [key, 'LINE'] | text: 'CAPTION', frames } }
//                      a flash of an earlier moment, in sepia, then straight back to the scene as it was
//  ACTING              { emote: [key, '!' | '?' | '...' | 'heart' | 'anger' | 'sweat' | 'tear' | 'note' | 'idea'] }
//                      { tremble: [key, frames] }   { card: [key, 'TAGLINE'] } (freeze-frame intro card)
//                      { place: ['WHERE', 'WHEN'] } (a location stamp over the picture; does not stop the scene)
//  LOOK                { grade: 'gold' | 'cold' | 'doom' | 'dream' | 'noir' | null }  { rays: true | false }
//                      { spot: key | null }  { smash: true } (impact frame)  { slowmo: frames }
// Loaded after story-scene.js: these are methods on RF.StoryScene that it calls at its hooks.
(function () {
  const K = RF.storyKit, P = RF.StoryScene.prototype, T = K.T, R = K.R, W = 384, H = 224, BAR = 30, run = K.run;
  const GOLD = ['#fff6b0', '#ffd040', '#c08010'];

  // ---------------------------------------------------------------- buttons
  const BTN = {
    light: ['#ff7ac8', 'square'], heavy: ['#40e0a0', 'triangle'], block: ['#ff5050', 'circle'], throw: ['#6aa0ff', 'cross'],
    up: ['#ffffff', 0], right: ['#ffffff', 1], down: ['#ffffff', 2], left: ['#ffffff', 3],
  };
  const FACE = ['light', 'heavy', 'block', 'throw'], DIRS = ['up', 'down', 'left', 'right'];
  const codes = (a) => [...RF.CONTROLS.p1[a], ...RF.CONTROLS.p2[a]];
  const hit = (kb, a) => kb.justPressed(...codes(a));
  const keyName = (a) => RF.CONTROLS.p1[a][0].replace('Key', '');
  const BACK = () => ['Escape', 'Backspace', ...codes('block')];

  function drawButton(ctx, action, x, y, r, lit) {
    const [col, shape] = BTN[action] || BTN.light, q = r * 0.5;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, 7); ctx.fill();
    ctx.fillStyle = lit ? '#4a3a6a' : '#1c1826'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, r / 5);
    ctx.beginPath();
    if (shape === 'square') { ctx.rect(-q, -q, q * 2, q * 2); ctx.stroke(); }
    else if (shape === 'circle') { ctx.arc(0, 0, q * 1.1, 0, 7); ctx.stroke(); }
    else if (shape === 'triangle') { ctx.moveTo(0, -q * 1.2); ctx.lineTo(q * 1.15, q * 0.85); ctx.lineTo(-q * 1.15, q * 0.85); ctx.closePath(); ctx.stroke(); }
    else if (shape === 'cross') { ctx.moveTo(-q, -q); ctx.lineTo(q, q); ctx.moveTo(q, -q); ctx.lineTo(-q, q); ctx.stroke(); }
    else { ctx.rotate(shape * Math.PI / 2); ctx.moveTo(0, -q * 1.3); ctx.lineTo(q * 1.1, q * 0.2); ctx.lineTo(q * 0.4, q * 0.2); ctx.lineTo(q * 0.4, q * 1.2); ctx.lineTo(-q * 0.4, q * 1.2); ctx.lineTo(-q * 0.4, q * 0.2); ctx.lineTo(-q * 1.1, q * 0.2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    T(ctx, keyName(action), x, y + r + 5, { align: 'center', color: '#c8b0e0', outline: '#000' });
  }

  // ---------------------------------------------------------------- per-frame housekeeping
  // Returns true if the scene was skipped (hold BACK).
  P.tickExtra = function (kb) {
    if (this.lock > 0) this.lock--;
    if (this.toast && ++this.toast.t > 200) this.toast = null;
    if (this.sup && ++this.sup.t > 200) this.sup = null;
    if (this.qf && ++this.qf.t > 56) this.qf = null;
    if (this.smashT > 0) this.smashT--;
    for (const a of Object.values(this.actors)) {
      if (a.emote && ++a.emote.t > (a.emote.kind === 'tear' ? 170 : 84)) a.emote = null;
      if (a.trembleT > 0) a.trembleT--;
      if (a.zlen) { a.zt++; const u = Math.min(1, a.zt / a.zlen); a.z = a.zFrom + (a.zTo - a.zFrom) * u; if (u >= 1) a.zlen = 0; } // walking toward / away from the camera
    }
    const s = this.cur, busy = s && (s.choose || s.choice || s.qte || s.rank || s.credits || s.recall);
    const held = !busy && BACK().some((c) => kb.down.has(c));
    this.skipT = held ? (this.skipT || 0) + 1 : 0;
    if (this.skipT > 42) {
      this.skipT = 0;
      if (!this.hero && this.steps.some((st) => st.choose)) { this.hero = RF.STORY.heroes[0]; this.vars.hero = this.hero; RF.storyProgress.setVar('hero', this.hero); }
      this.i = this.steps.length; this.finish();
      return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- instant steps
  P.instantExtra = function (s) {
    if (s.if) { const br = s.if(this.vars, this.state, this) ? s.then : s.else; if (br) this.steps.splice(this.i + 1, 0, ...br); return true; }
    if (s.set) { this.vars[s.set[0]] = s.set[1]; RF.storyProgress.setVar(s.set[0], s.set[1]); return true; }
    if (s.place) { this.sup = { a: s.place[0] || '', b: s.place[1] || '', t: 0, ins: this.insert }; RF.audio.sfx('move'); return true; } // a location stamp, like a TV show's
    if (s.cam3d && this.cam3dStep) return this.cam3dStep(s);
    if (s.emote) { const a = this.actor(s.emote[0]); if (a) { a.emote = { kind: s.emote[1], t: 0 }; RF.audio.sfx('move'); } return true; }
    if (s.depth) { const a = this.actor(s.depth[0]); if (a) { a.zFrom = a.z || 0; a.zTo = s.depth[1]; a.zt = 0; a.zlen = s.depth[2] || 60; } return true; } // { depth: [key, z, frames] }
    if (s.tremble) { const a = this.actor(s.tremble[0]); if (a) a.trembleT = s.tremble[1] || 60; return true; }
    if (s.grade !== undefined) { this.grade = s.grade; return true; }
    if (s.rays !== undefined) { this.rays = s.rays; return true; }
    if (s.spot !== undefined) { this.spotKey = s.spot && this.resolve(s.spot); return true; }
    if (s.smash) { this.smashT = 7; this.shake = Math.max(this.shake, 14); RF.audio.sfx('boom'); return true; }
    if (s.slowmo) { this.slowT = s.slowmo; return true; }
    if (s.impact && (s.impact[1] || 1) >= 3) this.smashT = 6; // big hits get an impact frame (the hit itself is handled as usual)
    return false;
  };

  // ---------------------------------------------------------------- blocking steps: start
  P.beginStep = function (s) {
    if (s.qte) {
      const q = s.qte, type = q.type || 'ring', len = q.len || (type === 'mash' ? 170 : type === 'swing' ? 280 : 78);
      this.q = { type, key: q.key || 'light', t: 0, count: 0, pump: 0, pos: 0, len, at: len - 18, need: q.need || 12, result: null, done: 0 };
      this.state.qte = null;
      RF.audio.sfx('ready');
    }
    if (s.choice) {
      const prog = RF.storyProgress.get();
      const opts = s.choice.options.map((o) => Object.assign({}, o, { off: !!(o.locked && o.locked(this.vars, prog)) }));
      this.c = { t: 0, opts, sel: Math.max(0, opts.findIndex((o) => !o.off)) };
      RF.audio.sfx('paper');
    }
    if (s.recall) { // a memory: put the present away, stage the past
      const r = s.recall;
      this.rc = { t: 0, len: r.frames || 80, text: r.text || (r.say && r.say[1]) || '', who: null,
        save: { actors: this.actors, bgDef: this.bgDef, stage: this.stage, shot: this.shot, cam: Object.assign({}, this.cam), tintCol: this.tintCol, flashback: this.flashback, weather: this.weather, grade: this.grade, riftFx: this.riftFx, insert: this.insert, rays: this.rays, spotKey: this.spotKey } };
      this.actors = {}; this.riftFx = null; this.insert = null; this.tintCol = null; this.weather = null; this.grade = null; this.rays = false; this.spotKey = null; this.flashback = true;
      if (r.bg) this.instant({ bg: r.bg });
      if (r.cast) this.instant({ cast: r.cast });
      if (r.cam3d) this.instant({ cam3d: r.cam3d }); else this.setShot(r.shot || 'wide');
      if (r.say) { const a = this.actor(r.say[0]), def = a ? a.def : RF.getCharacter(this.resolve(r.say[0])); this.rc.who = def; if (a) a.talk = true; K.speak(def, r.say[1]); }
      this.flash = 9; RF.audio.sfx('whoosh');
    }
    if (s.card) { this.cardT = 0; this.cardN = (this.cardN || 0) + 1; RF.audio.sfx('clang'); this.flash = 5; }
    if (s.rank) RF.audio.sfx('paper');
  };

  // ---------------------------------------------------------------- blocking steps: every frame
  // Returns true if this step is one of ours.
  P.updateExtra = function (s, kb, ok, auto) {
    if (s.qte) return this.updateQTE(s, kb, auto);
    if (s.choice) return this.updateChoice(s, kb, auto);
    if (s.recall) { // held until its line has been heard, then the present snaps back
      const rc = this.rc; rc.t++;
      const heard = !K.voice.speaking || rc.t > rc.len + 260;
      if ((rc.t >= rc.len && heard) || (ok && rc.t > 24) || (auto && rc.t > 4)) {
        if (ok) K.voice.stop();
        Object.assign(this, rc.save, { cam: rc.save.cam }); this.rc = null; this.trans = null;
        this.flash = 9; this.next();
      }
      return true;
    }
    if (s.card) { this.cardT++; if (this.cardT > 170 || (ok && this.cardT > 34) || (auto && this.cardT > 4)) this.next(); return true; }
    if (s.rank) { if (this.stepT > 360 || (ok && this.stepT > 80) || (auto && this.stepT > 4)) this.next(); return true; }
    return false;
  };

  P.updateQTE = function (s, kb, auto) {
    const q = this.q, spec = s.qte;
    q.t++;
    if (q.pump > 0) q.pump--;
    if (q.result) { // a beat to read the result, then the scene carries on with the matching steps
      if (++q.done > 9) {
        const r = q.result, br = r === 'perfect' ? (s.perfect || s.hit) : r === 'good' ? s.hit : s.miss;
        if (br) this.steps.splice(this.i + 1, 0, ...br);
        this.q = null; this.lock = 14; this.next();
      }
      return true;
    }
    const done = (r, why) => {
      q.result = r; this.state.qte = r;
      if (!spec.rigged) run.tally[r]++; // a moment that cannot be won does not count against your rank
      this.qf = { r, why: r === 'miss' ? why : '', t: 0 };
      RF.audio.sfx(r === 'perfect' ? 'perfect' : r === 'good' ? 'select' : 'block');
      if (r !== 'miss') this.flash = r === 'perfect' ? 6 : 3;
      try { kb.rumble(0, r === 'miss' ? 0.3 : 0.8, 160); } catch (e) { /* no pad */ }
    };
    if (auto || this.cine) { if (q.t > (auto ? 3 : 40)) done((RF.storyAuto && RF.storyAuto.qte) || 'good'); return true; }
    const A = RF.audio; if (A && A.ctx && q.t % 30 === 1) A.tone('sine', 52, A.ctx.currentTime, 0.12, 0.4, A.sfxBus, 32); // heartbeat
    if (q.t < 12) return true; // a moment to see the prompt: tapping through dialogue cannot fail it by accident
    const pool = FACE.includes(q.key) ? FACE : DIRS;
    const right = hit(kb, q.key), wrong = !right && pool.some((a) => a !== q.key && hit(kb, a));
    if (q.type === 'ring') {
      if (right) { const d = Math.abs(q.t - q.at); done(d <= 6 ? 'perfect' : d <= 16 ? 'good' : 'miss', q.t < q.at ? 'TOO EARLY' : 'TOO LATE'); }
      else if (wrong) done('miss', 'WRONG BUTTON');
      else if (q.t > q.at + 16) done('miss', 'TOO LATE');
    } else if (q.type === 'mash') {
      if (right) { q.count++; q.pump = 5; this.shake = Math.max(this.shake, 2); if (A && A.ctx) A.tone('square', 220 + q.count * 14, A.ctx.currentTime, 0.04, 0.05, A.sfxBus); }
      if (!spec.rigged && q.count >= q.need) done(q.t < q.len * 0.6 ? 'perfect' : 'good');
      else if (q.t >= q.len) done(spec.rigged && q.count >= q.need * 0.6 ? 'good' : 'miss', spec.rigged ? '' : 'NOT ENOUGH');
    } else if (q.type === 'swing') {
      const ph = (q.t * (spec.speed || 0.016)) % 2; q.pos = ph < 1 ? ph : 2 - ph;
      const zone = spec.zone == null ? 0.72 : spec.zone;
      if (right) { const d = Math.abs(q.pos - zone); done(d <= 0.045 ? 'perfect' : d <= 0.13 ? 'good' : 'miss', 'OFF TARGET'); }
      else if (q.t >= q.len) done('miss', 'TOO SLOW');
    }
    return true;
  };

  P.updateChoice = function (s, kb, auto) {
    const c = this.c, ch = s.choice, n = c.opts.length;
    c.t++;
    const pick = (i) => {
      const o = c.opts[i].off ? c.opts.find((x) => !x.off) : c.opts[i];
      this.vars[ch.id] = o.set; RF.storyProgress.setVar(ch.id, o.set);
      if (o.then) this.steps.splice(this.i + 1, 0, ...o.then);
      if (o.note) this.toast = { text: o.note, t: 0 };
      RF.audio.sfx('select');
      this.c = null; this.lock = 16; this.next();
    };
    if (auto) { if (c.t > 4) pick((RF.storyAuto && RF.storyAuto.choice && RF.storyAuto.choice[ch.id]) || 0); return true; }
    const move = (d) => { let i = c.sel; do { i = (i + d + n) % n; } while (c.opts[i].off && i !== c.sel); if (i !== c.sel) { c.sel = i; RF.audio.sfx('move'); } };
    if (RF.menuPressed(kb, 'up')) move(-1);
    if (RF.menuPressed(kb, 'down')) move(1);
    if (ch.timer && c.t > ch.timer) pick(ch.timeout == null ? c.sel : ch.timeout);
    else if (c.t > 26 && RF.menuPressed(kb, 'confirm')) pick(c.sel);
    return true;
  };

  // ---------------------------------------------------------------- the end of a chapter: STYLE RANK
  P.beforeFinish = function () {
    const ch = this.ch, last = this.part === 'outro' || (!ch.fight && !ch.outro);
    const t = run.tally, n = t.perfect + t.good + t.miss;
    if (!last || !n || this.ranked) return false;
    this.ranked = true;
    const score = (t.perfect * 2 + t.good) / (n * 2), letter = score >= 0.9 ? 'S' : score >= 0.7 ? 'A' : score >= 0.45 ? 'B' : 'C';
    this.rankInfo = Object.assign({ letter }, t);
    RF.storyProgress.rank(ch.title, letter);
    run.tally = { perfect: 0, good: 0, miss: 0 };
    this.steps.push({ rank: true }); this.i = this.steps.length - 2;
    this.next();
    return true;
  };

  // ---------------------------------------------------------------- where an actor is on screen
  P.screenPos = function (a, up) {
    const v = this.view;
    if (!v || !a) return null;
    if (v.kind === '3d') { const p = v.proj(a.x, a.y + up, a.z || 0); return p && { x: p.x, y: p.y, k: p.k }; }
    const dx = (a.x - v.cx) * v.z, dy = (this.floorY() - a.y - up - v.cy) * v.zy, c = Math.cos(v.rot || 0), sn = Math.sin(v.rot || 0);
    return { x: v.tx + dx * c - dy * sn, y: v.ty + dx * sn + dy * c, k: v.z };
  };

  function drawEmote(ctx, kind, x, y, t, k) {
    const s = Math.max(1, Math.min(2.2, k)), pop = Math.min(1, t / 5);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - 5 * pop * s)); ctx.scale(s, s);
    if (kind === 'tear' || kind === 'sweat') { // no bubble: drops
      ctx.fillStyle = '#7ad0ff';
      if (kind === 'tear') for (let i = 0; i < 2; i++) { const f = ((t + i * 19) % 38) / 38; ctx.globalAlpha = 1 - f; ctx.fillRect(i ? 3 : -4, 14 + f * 16, 2, 3); }
      else { const f = Math.min(1, t / 40); ctx.fillRect(7, 6 + f * 8, 2, 4); ctx.fillRect(7, 5 + f * 8, 1, 1); }
      ctx.restore(); return;
    }
    ctx.fillStyle = '#000'; ctx.fillRect(-9, -16, 18, 15); ctx.fillRect(-2, -1, 4, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(-8, -15, 16, 13); ctx.fillRect(-1, -2, 2, 3);
    if (kind === '!') { ctx.fillStyle = '#e02020'; ctx.fillRect(-1, -13, 3, 6); ctx.fillRect(-1, -6, 3, 2); }
    else if (kind === '?') T(ctx, '?', 0, -13, { align: 'center', color: '#3040c0' });
    else if (kind === '...') { ctx.fillStyle = '#444'; for (let i = 0; i < 3; i++) if (t > i * 10) ctx.fillRect(-6 + i * 5, -9, 2, 2); }
    else if (kind === 'heart') { ctx.fillStyle = '#e02050'; ctx.fillRect(-4, -12, 3, 3); ctx.fillRect(1, -12, 3, 3); ctx.fillRect(-4, -10, 8, 3); ctx.fillRect(-3, -7, 6, 2); ctx.fillRect(-1, -5, 2, 2); }
    else if (kind === 'anger') { ctx.fillStyle = '#e02020'; ctx.fillRect(-4, -12, 3, 1); ctx.fillRect(-2, -12, 1, 3); ctx.fillRect(1, -12, 3, 1); ctx.fillRect(1, -12, 1, 3); ctx.fillRect(-4, -5, 3, 1); ctx.fillRect(-2, -7, 1, 3); ctx.fillRect(1, -5, 3, 1); ctx.fillRect(1, -7, 1, 3); }
    else if (kind === 'note') { ctx.fillStyle = '#6030b0'; ctx.fillRect(1, -13, 1, 8); ctx.fillRect(-2, -6, 4, 3); ctx.fillRect(1, -13, 4, 2); }
    else if (kind === 'idea') { ctx.fillStyle = '#f0c020'; ctx.fillRect(-2, -13, 5, 5); ctx.fillRect(-1, -8, 3, 2); ctx.fillStyle = '#806010'; ctx.fillRect(-1, -6, 3, 1); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the look: grading, light, impact frames
  P.drawFxLayer = function (ctx) {
    // emotes over heads
    for (const a of Object.values(this.actors)) {
      if (!a.emote || a.stage) continue;
      const p = this.screenPos(a, a.def.body.height * (a.scale || 1) + (a.emote.kind === 'tear' || a.emote.kind === 'sweat' ? -14 : 6));
      if (p) drawEmote(ctx, a.emote.kind, p.x, p.y, a.emote.t, p.k);
    }
    if (this.spotKey) { // a single light: everything else falls away
      const p = this.screenPos(this.actors[this.spotKey], 40);
      if (p) { const r = 46 * Math.max(1, p.k), g = ctx.createRadialGradient(p.x, p.y, r * 0.55, p.x, p.y, r * 2.2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,6,0.86)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    }
    if (this.rays) { // light through high windows
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        const x = 30 + i * 74 + Math.sin(this.t / 90 + i) * 6; ctx.globalAlpha = 0.07 + 0.03 * Math.sin(this.t / 50 + i * 2);
        ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 26, 0); ctx.lineTo(x - 70, H); ctx.lineTo(x - 120, H); ctx.fill();
      }
      ctx.restore();
    }
    const G = { gold: ['soft-light', '#ffb040', 0.5], cold: ['soft-light', '#3060d0', 0.45], doom: ['soft-light', '#d01818', 0.5], dream: ['screen', '#ffd0f0', 0.14], noir: ['saturation', '#808080', 0.92] }[this.grade];
    if (G) { ctx.save(); ctx.globalCompositeOperation = G[0]; ctx.globalAlpha = G[2]; ctx.fillStyle = G[1]; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (this.slowT > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 230); g.addColorStop(0, 'rgba(120,160,255,0)'); g.addColorStop(1, 'rgba(120,160,255,0.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (this.smashT > 0) { // impact frame: two frames of negative, then speed lines
      if (this.smashT > 4) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      else { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = this.smashT / 4; for (let i = 0; i < 22; i++) { const a = i * 0.29 + this.t, r0 = 70 + (i % 3) * 22; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * 0.6); ctx.lineTo(W / 2 + Math.cos(a) * 260, H / 2 + Math.sin(a) * 160); ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineWidth = 1; }
    }
  };

  // ---------------------------------------------------------------- UI: prompts, choices, cards, ranks
  P.drawUI = function (ctx, s) {
    if (this.rc) { // the remembered line, under a soft white edge
      const rc = this.rc, g = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 230);
      g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(1, 'rgba(255,250,235,0.5)');
      ctx.fillStyle = g; ctx.fillRect(0, BAR, W, H - BAR * 2);
      const lines = RF.font.wrap(rc.text.slice(0, Math.floor(rc.t * 0.9)), 58);
      if (rc.who) T(ctx, rc.who.name.toUpperCase(), W / 2, H - BAR + 3, { align: 'center', color: '#d8c090', outline: '#000' });
      lines.slice(0, 2).forEach((l, i) => T(ctx, l, W / 2, H - BAR + (rc.who ? 12 : 6) + i * 9, { align: 'center', color: '#fff4dc', outline: '#000' }));
    }
    if (s && s.card) this.drawCard(ctx, s);
    if (s && s.qte && this.q && !this.q.result) this.drawQTE(ctx, s);
    if (this.qf) { // PERFECT / GOOD / MISS, over the action
      const f = this.qf, a = Math.min(1, (56 - f.t) / 16), sc = f.t < 5 ? 4 : 3;
      ctx.globalAlpha = a;
      T(ctx, f.r === 'perfect' ? 'PERFECT!' : f.r === 'good' ? 'GOOD' : 'MISS', W / 2, 166 - f.t * 0.2 - (f.r === 'perfect' ? 8 : 0), { scale: f.r === 'perfect' ? sc : 2, align: 'center', color: f.r === 'perfect' ? GOLD : f.r === 'good' ? '#ffffff' : '#ff4040', outline: '#000' });
      if (f.why) T(ctx, f.why, W / 2, 157 - f.t * 0.2, { align: 'center', color: '#ff9090', outline: '#000' });
      ctx.globalAlpha = 1;
    }
    if (s && s.choice && this.c) this.drawChoice(ctx, s);
    if (s && s.rank) this.drawRank(ctx);
    if (this.toast && !(s && (s.rank || s.credits))) { // "... WILL REMEMBER THAT."
      const t = this.toast.t, k = Math.min(1, t / 12, (200 - t) / 12), w = RF.font.textWidth(this.toast.text) + 16;
      ctx.globalAlpha = Math.max(0, k);
      R(ctx, 'rgba(10,0,24,0.85)', 6 - (1 - k) * 20, BAR + 5, w, 13); R(ctx, '#c080ff', 6 - (1 - k) * 20, BAR + 5, 2, 13);
      T(ctx, this.toast.text, 14 - (1 - k) * 20, BAR + 8, { color: '#e8d8ff', outline: '#000' });
      ctx.globalAlpha = 1;
    }
    if (this.sup && this.sup.ins === this.insert && !this.qf && !this.rc && !(s && (s.choice || s.choose || s.qte || s.rank || s.card || s.title))) { // where and when, lower left (it gives way to inserts and prompts)
      const p = this.sup, t = p.t, k = Math.max(0, Math.min(1, t / 10, (200 - t) / 16)), x = 12 - (1 - k) * 14, y = H - BAR - 27;
      ctx.globalAlpha = k;
      R(ctx, '#000', x - 1, y - 1, 4, 24); R(ctx, '#c080ff', x, y, 2, 22);
      T(ctx, p.a.slice(0, Math.floor(t * 0.8)), x + 7, y + 1, { scale: 2, color: '#ffffff', outline: '#000' });
      T(ctx, p.b.slice(0, Math.max(0, Math.floor((t - 14) * 0.9))), x + 7, y + 15, { color: '#d8c8f0', outline: '#000' });
      ctx.globalAlpha = 1;
    }
    if (this.skipT > 4) { // hold-to-skip
      R(ctx, '#000', W - 98, 2, 96, 12);
      T(ctx, 'SKIPPING...', W - 20, 4, { align: 'right', color: '#ffffff' });
      ctx.strokeStyle = '#c080ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W - 10, 8, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.skipT / 42)); ctx.stroke(); ctx.lineWidth = 1;
    }
  };

  P.drawQTE = function (ctx, s) {
    const q = this.q, spec = s.qte, cx = W / 2, cy = 108;
    ctx.fillStyle = 'rgba(0,0,10,0.38)'; ctx.fillRect(0, BAR, W, H - BAR * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; // everything narrows to the button
    for (let i = 0; i < 16; i++) { const a = i * 0.3927 + this.t / 200; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 40); ctx.lineTo(cx + Math.cos(a) * 300, cy + Math.sin(a) * 200); ctx.stroke(); }
    const who = spec.who && this.actor(spec.who);
    if (who) T(ctx, who.def.name.toUpperCase(), cx, 50, { align: 'center', color: '#c8b0e0', outline: '#000' });
    T(ctx, spec.text || '', cx, 60, { scale: 2, align: 'center', color: '#ffffff', outline: '#000' });
    if (q.type === 'ring') {
      const d = q.at - q.t, near = Math.abs(d) <= 6;
      drawButton(ctx, q.key, cx, cy, 15, near);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 7); ctx.stroke();
      ctx.lineWidth = near ? 3 : 2; ctx.strokeStyle = near ? '#ffd040' : d < 0 ? '#ff5050' : '#ffffff';
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(6, 18 + d * 0.8), 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    } else if (q.type === 'mash') {
      drawButton(ctx, q.key, cx, cy - (q.pump ? 2 : 0), 15 + (q.pump ? 2 : 0), q.pump > 0);
      const f = Math.min(spec.rigged ? 0.92 : 1, q.count / q.need);
      R(ctx, '#000', cx - 62, cy + 30, 124, 10); R(ctx, '#2a1a40', cx - 60, cy + 32, 120, 6);
      R(ctx, f > 0.8 ? '#ffd040' : '#c080ff', cx - 60, cy + 32, Math.round(120 * f), 6);
      R(ctx, '#ff5050', cx - 60, cy + 40, Math.round(120 * (1 - q.t / q.len)), 2);        // time left
      if (this.t % 12 < 7) T(ctx, 'MASH!', cx, cy - 28, { align: 'center', color: '#ffd040', outline: '#000' });
    } else if (q.type === 'swing') {
      const zone = spec.zone == null ? 0.72 : spec.zone, bw = 200, x0 = cx - bw / 2, y0 = cy + 30;
      drawButton(ctx, q.key, cx, cy - 4, 15, Math.abs(q.pos - zone) <= 0.045);
      R(ctx, '#000', x0 - 2, y0 - 2, bw + 4, 14); R(ctx, '#2a1a40', x0, y0, bw, 10);
      R(ctx, '#40c060', x0 + (zone - 0.13) * bw, y0, 0.26 * bw, 10); R(ctx, '#ffd040', x0 + (zone - 0.045) * bw, y0, 0.09 * bw, 10);
      R(ctx, '#ffffff', x0 + q.pos * bw - 1, y0 - 4, 3, 18);
    }
  };

  P.drawChoice = function (ctx, s) {
    const c = this.c, ch = s.choice, n = c.opts.length, k = Math.min(1, c.t / 10);
    ctx.fillStyle = `rgba(6,0,16,${0.5 * k})`; ctx.fillRect(0, BAR, W, H - BAR * 2);
    const who = ch.who && this.actor(ch.who), bw = 316, x0 = (W - bw) / 2, rowH = 17, y0 = Math.round(118 - n * rowH / 2);
    T(ctx, ch.prompt || (who ? who.def.name.toUpperCase() + ' -' : 'CHOOSE'), W / 2, y0 - 22, { align: 'center', color: '#e0c0ff', outline: '#000' });
    if (ch.timer) { const f = Math.max(0, 1 - c.t / ch.timer); R(ctx, '#000', x0, y0 - 9, bw, 4); R(ctx, f < 0.3 ? '#ff4040' : '#ffffff', x0 + bw * (1 - f) / 2, y0 - 8, bw * f, 2); }
    c.opts.forEach((o, i) => {
      const y = y0 + i * rowH, sel = i === c.sel, slide = (1 - k) * (i % 2 ? 30 : -30);
      R(ctx, '#000', x0 - 1 + slide, y - 1, bw + 2, rowH - 2);
      R(ctx, o.off ? '#16121c' : sel ? '#5a10a0' : '#1c1630', x0 + slide, y, bw, rowH - 4);
      if (sel && !o.off) { R(ctx, '#ffffff', x0 + slide, y, 2, rowH - 4); R(ctx, '#ffffff', x0 + bw - 2 + slide, y, 2, rowH - 4); }
      T(ctx, o.off ? (o.lockedText || '? ? ?') : o.text, W / 2 + slide, y + 3, { align: 'center', color: o.off ? '#5a4a6a' : sel ? '#ffffff' : '#b8a8d0', outline: '#000' });
    });
    T(ctx, 'UP / DOWN: CHOOSE     CONFIRM: SAY IT', W / 2, y0 + n * rowH + 4, { align: 'center', color: '#8a78a8', outline: '#000' });
  };

  // A freeze-frame intro card: the picture washes out, a band of colour cuts across, the
  // character slides in large on one side and their name lands on the other.
  P.drawCard = function (ctx, s) {
    const [key, tag, nameOver] = s.card, a = this.actor(key), def = a ? a.def : RF.getCharacter(this.resolve(key));
    if (!def) return;
    const t = this.cardT, k = Math.min(1, t / 9), left = (s.side || (this.cardN % 2 ? 'left' : 'right')) === 'left', col = s.color || '#a050ff';
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.9 * k; ctx.fillStyle = '#808080'; ctx.fillRect(0, BAR, W, H - BAR * 2); ctx.restore();
    ctx.fillStyle = `rgba(10,0,24,${0.5 * k})`; ctx.fillRect(0, BAR, W, H - BAR * 2);
    const w = W * k, bx = left ? W - w : 0;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(bx, 94); ctx.lineTo(bx + w, 82); ctx.lineTo(bx + w, 146); ctx.lineTo(bx, 158); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx, 97); ctx.lineTo(bx + w, 85); ctx.lineTo(bx + w, 143); ctx.lineTo(bx, 155); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(0, BAR, W, H - BAR * 2); ctx.clip();
    ctx.translate(left ? 84 - (1 - k) * 110 : W - 84 + (1 - k) * 110, H - BAR + def.body.height * 0.78); ctx.scale(2.4, 2.4);
    (a ? a.sprite : RF.createSprite(def)).draw(ctx, 'idle', 0, 0, 0, left ? 1 : -1);
    ctx.restore();
    const name = (nameOver || def.name).toUpperCase(), tx = left ? W - 16 : 16, align = left ? 'right' : 'left';
    T(ctx, name, tx + (left ? 1 : -1) * (1 - k) * 80, 100, { scale: name.length > 12 ? 2 : 3, align, color: '#ffffff', outline: '#000' });
    T(ctx, (tag || '').slice(0, Math.max(0, Math.floor((t - 8) * 1.3))), tx, 130, { align, color: '#14001e' });
  };

  P.drawRank = function (ctx) {
    const r = this.rankInfo, t = this.stepT, k = Math.min(1, t / 14);
    if (!r) return;
    ctx.fillStyle = `rgba(6,0,14,${0.88 * k})`; ctx.fillRect(0, 0, W, H);
    T(ctx, 'CHAPTER COMPLETE', W / 2, 36, { align: 'center', color: '#c080ff', outline: '#000' });
    T(ctx, this.ch.title, W / 2, 48, { scale: 2, align: 'center', color: '#ffffff', outline: '#000' });
    [['PERFECT', r.perfect, GOLD], ['GOOD', r.good, '#ffffff'], ['MISS', r.miss, '#ff5050']].forEach(([n, v, c], i) => {
      if (t > 18 + i * 12) { T(ctx, n, 96, 84 + i * 14, { color: c, outline: '#000' }); T(ctx, 'X ' + v, 176, 84 + i * 14, { color: c, outline: '#000' }); }
    });
    if (t === 58) RF.audio.sfx(r.letter === 'S' ? 'perfect' : 'clang');
    if (t > 58) {
      const sc = Math.max(8, 14 - (t - 58)), col = r.letter === 'S' ? GOLD : r.letter === 'A' ? ['#ffffff', '#e0b0ff', '#a050ff'] : r.letter === 'B' ? '#e0e0e0' : '#909090';
      T(ctx, 'STYLE RANK', 280, 78, { align: 'center', color: '#c8b0e0', outline: '#000' });
      T(ctx, r.letter, 280, 92, { scale: sc, align: 'center', color: col, outline: '#000' });
    }
    if (t > 90 && this.t % 40 < 26) T(ctx, 'CONFIRM TO CONTINUE', W / 2, 180, { align: 'center', color: '#c8b0e0', outline: '#000' });
  };

  // ---------------------------------------------------------------- more weather, more inserts
  // { weather: 'confetti' | 'embers' | 'stars' } (rain and cash are drawn by story-scene.js)
  const fx0 = P.drawFxLayer;
  P.drawFxLayer = function (ctx) {
    const w = this.weather, t = this.t;
    if (w === 'confetti') {
      const cols = ['#ff60a0', '#ffd040', '#60e0ff', '#80ff80', '#ffffff', '#c080ff'];
      for (let i = 0; i < 70; i++) {
        const x = (i * 89 + Math.sin((t + i * 11) / 14) * 16) % W, y = (i * 53 + t * (0.8 + (i % 5) * 0.25)) % (H + 10) - 5;
        ctx.fillStyle = cols[i % 6]; ctx.fillRect(Math.round(x), Math.round(y), (t + i) % 16 < 8 ? 3 : 1, 2);
      }
    }
    if (w === 'embers') {
      for (let i = 0; i < 40; i++) {
        const y = H - ((i * 47 + t * (0.6 + (i % 4) * 0.2)) % (H + 10)), x = (i * 97 + Math.sin((t + i * 23) / 20) * 10) % W;
        ctx.globalAlpha = 0.3 + 0.5 * ((i * 7 + t) % 20) / 20; ctx.fillStyle = i % 3 ? '#ff9030' : '#ffd060'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    if (w === 'stars') { // the space between universes: slow streaks of light
      for (let i = 0; i < 60; i++) {
        const sp = 0.3 + (i % 5) * 0.25, x = W - ((i * 71 + t * sp) % (W + 30)), y = (i * 37) % H;
        ctx.globalAlpha = 0.25 + (i % 4) * 0.15; ctx.fillStyle = i % 7 ? '#ffffff' : '#c080ff'; ctx.fillRect(Math.round(x), y, 2 + (i % 5) * 2, 1);
      }
      ctx.globalAlpha = 1;
    }
    fx0.call(this, ctx);
  };

  // his crown, left on the gym floor
  K.INSERTS.crown = function (ctx, t, o) {
    R(ctx, '#06050a', 0, 0, W, H);
    for (let y = 120; y < H; y += 12) R(ctx, '#0e0c14', 0, y, W, 1);
    const g = ctx.createRadialGradient(192, 152, 6, 192, 152, 140); g.addColorStop(0, 'rgba(255,230,170,0.55)'); g.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.1; ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.moveTo(176, 0); ctx.lineTo(208, 0); ctx.lineTo(262, 160); ctx.lineTo(122, 160); ctx.fill(); ctx.globalAlpha = 1;
    const cx = 192, cy = 150;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(cx, cy + 9, 30, 5, 0, 0, 7); ctx.fill();
    R(ctx, '#111', cx - 24, cy - 3, 48, 12); R(ctx, '#e8b420', cx - 23, cy - 2, 46, 10); R(ctx, '#fff0a0', cx - 23, cy - 2, 46, 2); R(ctx, '#a87810', cx - 23, cy + 6, 46, 2);
    for (let i = 0; i < 5; i++) { const x = cx - 22 + i * 11; for (let k = 0; k < 6; k++) R(ctx, k < 1 ? '#fff0a0' : '#e8b420', x + k * 0.5, cy - 14 + k * 2, 4 - k * 0.3, 2); R(ctx, i % 2 ? '#d02040' : '#3070e0', x, cy + 1, 3, 3); }
    for (let i = 0; i < 14; i++) { ctx.globalAlpha = 0.3; R(ctx, '#fff0c0', 150 + (i * 37) % 90 + Math.sin(t / 30 + i) * 4, 30 + (i * 53 + t * 0.2) % 110, 1, 1); }
    ctx.globalAlpha = 1;
    if (o.text) T(ctx, o.text, W / 2, 182, { align: 'center', color: '#c8b0e0', outline: '#000' });
  };
  // a bronze plaque (o.lines)
  K.INSERTS.plaque = function (ctx, t, o) {
    R(ctx, '#2a2420', 0, 0, W, H);
    for (let y = 0; y < H; y += 10) for (let x = (y / 10) % 2 ? 0 : 14; x < W; x += 28) R(ctx, '#3a322c', x, y, 27, 9);
    R(ctx, '#111', 60, 50, 264, 124); R(ctx, '#8a6224', 63, 53, 258, 118); R(ctx, '#a87830', 66, 56, 252, 112);
    for (const [x, y] of [[70, 60], [310, 60], [70, 160], [310, 160]]) R(ctx, '#5a3e18', x, y, 4, 4);
    (o.lines || []).forEach((l, i) => T(ctx, l, W / 2, i ? 72 + i * 14 : 62, { scale: i === 0 ? 2 : 1, align: 'center', color: i === 0 ? '#fff0c0' : '#3a2408' }));
    ctx.globalAlpha = 0.12 + Math.sin(t / 40) * 0.05; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(80, 53); ctx.lineTo(130, 53); ctx.lineTo(96, 171); ctx.lineTo(63, 171); ctx.fill(); ctx.globalAlpha = 1;
  };
  // rows of chairs; one stays empty, with a cap left on it
  K.INSERTS.seat = function (ctx, t, o) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8ab8e0'); g.addColorStop(1, '#3a6a3a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    R(ctx, '#2a5a2a', 0, 150, W, 74);
    const chair = (x, y, k, lit) => { R(ctx, '#111', x - 9 * k, y - 22 * k, 18 * k, 22 * k); R(ctx, lit ? '#f4f0e4' : '#b8b4a8', x - 8 * k, y - 21 * k, 16 * k, 9 * k); R(ctx, lit ? '#f4f0e4' : '#b8b4a8', x - 8 * k, y - 10 * k, 16 * k, 3 * k); R(ctx, '#555', x - 8 * k, y - 7 * k, 2 * k, 7 * k); R(ctx, '#555', x + 6 * k, y - 7 * k, 2 * k, 7 * k); };
    for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) chair(40 + i * 38 + r * 10, 128 + r * 34, 1 + r * 0.5, false);
    const cx = 202, cy = 190;
    chair(cx, cy, 2.4, true);
    R(ctx, '#111', cx - 15, cy - 60, 30, 6); R(ctx, '#1a2a6a', cx - 14, cy - 59, 28, 4); R(ctx, '#111', cx - 8, cy - 56, 16, 6); R(ctx, '#1a2a6a', cx - 7, cy - 55, 14, 4); R(ctx, '#ffd040', cx + 10, cy - 58, 1, 12); // the cap, and its tassel
    if (o.text) T(ctx, o.text, W / 2, 40, { align: 'center', color: '#ffffff', outline: '#000' });
  };

  // the last pitch of the crag: Alejandro on the rock, the school a long way down
  // (o.h = how high he is, 0..1; o.from = climbing up from there; o.slip = a hold breaks)
  K.INSERTS.climb = function (ctx, t, o) {
    const u = Math.min(1, t / 40), e = u * u * (3 - 2 * u), h = o.from == null ? o.h : o.from + (o.h - o.from) * e;
    const top = 150 - (1 - h) * 380, gy = 172 + h * 44, edge = 208;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#4a80d0'); g.addColorStop(1, '#f4dcb0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) R(ctx, 'rgba(255,255,255,0.75)', (i * 83 + t * 0.15) % (W + 60) - 30, 44 + (i * 29) % 50 + h * 40, 34 - i * 3, 4);
    R(ctx, '#3a6a3a', 0, gy, W, H); R(ctx, '#4a7a4a', 0, gy, W, 2);                                    // the ground
    R(ctx, '#111', 290, gy - 12, 50, 13); R(ctx, '#d8c8a8', 291, gy - 11, 48, 11); R(ctx, '#a03828', 291, gy - 11, 48, 2); R(ctx, '#d8c8a8', 310, gy - 18, 10, 7); // the school, tiny
    const wh = H - top + 4; // the rock face runs from its top edge to the bottom of the frame
    R(ctx, '#111', 0, top - 2, edge + 3, wh); R(ctx, '#6a5a4a', 0, top, edge, wh); R(ctx, '#8a7a66', 0, top, edge, 4); R(ctx, '#55483c', edge - 10, top + 4, 10, wh);
    for (let i = 0; i < 18; i++) { const y = top + 22 + i * 28; if (y > -10 && y < H) { R(ctx, '#4a3e32', (i * 67) % 150, y, 30 + (i * 13) % 34, 2); R(ctx, '#111', edge, y + 9, 8, 5); R(ctx, '#8a7a66', edge + 1, y + 10, 6, 3); } } // cracks, and holds
    const d = RF.getCharacter('alejandro'), k = Math.max(0, Math.min(1, (h - 0.9) / 0.1)), dy = o.slip ? Math.sin(Math.min(1, t / 24) * Math.PI) * 16 : 0;
    if (d) {
      const up = k > 0.98; // over the edge and standing on top (the climbing pose rides 46px above its feet line)
      ctx.save(); ctx.translate(edge + 16 - 30 * k, (up ? 150 : 196) + dy); ctx.scale(1.5, 1.5);
      RF.createSprite(d).draw(ctx, up ? 'victory' : 'jump', up ? Math.floor(t / 16) % 2 : 0.4, 0, 0, -1); ctx.restore();
    }
    if (o.slip) for (let i = 0; i < 8; i++) R(ctx, '#c8b8a0', edge + 6 + (i * 7) % 20, 150 + ((t * 3 + i * 17) % 90), 2, 2);  // rock coming away
    T(ctx, Math.round(h * 120) + ' M', W - 14, 40, { scale: 2, align: 'right', color: '#ffffff', outline: '#000' });
    T(ctx, 'NO ROPE', W - 14, 56, { align: 'right', color: '#ffe0a0', outline: '#000' });
  };

  // a folded letter, tumbling through the air
  RF.PROJECTILE_ART.letter = function (ctx, x, y, t) {
    const w = 5 + Math.abs(Math.cos(t / 5)) * 6, tilt = Math.round(Math.sin(t / 4) * 3);
    R(ctx, '#111', x - w - 1, y - 5 + tilt, w * 2 + 2, 10); R(ctx, '#f4ecd8', x - w, y - 4 + tilt, w * 2, 8); R(ctx, '#b8a888', x - w, y - 1 + tilt, w * 2, 1); R(ctx, '#c03030', x - 1, y - 1 + tilt, 2, 2);
  };

  K.drawButton = drawButton;
})();
