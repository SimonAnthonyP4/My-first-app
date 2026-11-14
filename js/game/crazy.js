// CRAZY SPECIALS (Settings -> CRAZY SPECIALS, on by default): four fighters get a once-a-match move that wins the
// round outright. Not in Story, Training, Tag or the Rift Tower. Press EX (L2 on a pad) when it is READY.
//   JAVAN     QUITE FRANKLY  when Javan is knocked out he waves the Israel flag, comes back at full health (once a match), and the
//                            ability is back: Trump walks in, says it, and knocks them out. (c.afterRevive: delete it to have it from the start.)
//   NICHOLAS  FROZEN BRO BATCH  opens a freezer and throws a frozen Bro Batch bar: a hit is an instant knockout.
//   ANTHONY   ABS OUT        lifts his shirt, "I hate my body", "I'm so fat", mumbles... and whoever was looking is out cold.
//   GABRIEL   HYPNO DANCE    a dance that puts spirals in their eyes, and they go down.
//   (Nicholas, Anthony and Gabriel unlock theirs after they have been knocked out once in the match.)
// It is never free: there is a wind-up of about half a second in which you can hit them out of it; Nicholas's can be
// blocked or jumped; Anthony's and Gabriel's only work on someone close enough to be watching. Once it lands they are held.
// The Trump line is a stock voice read at his pace (assets/audio/quite_frankly.mp3), not his real voice.
(function () {
  const T = (c, s, x, y, col, sc) => RF.font.drawText(c, s, Math.round(x), Math.round(y), { align: 'center', color: col, outline: '#000', scale: sc || 1 });
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const lerp = (a, b, u) => a + (b - a) * u, clamp = (v) => Math.max(0, Math.min(1, v));
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const SP = {}, sprite = (id) => SP[id] || (SP[id] = RF.createSprite(RF.getCharacter(id)));

  const CRAZY = {
    javan: { special: 'quiteFrankly', revive: true, afterRevive: true },
    nicholas: { special: 'frozenBrobatch', afterKO: true },
    anthony: { special: 'absOut', afterKO: true },
    gabriel: { special: 'hypnoDance', afterKO: true },
  };
  for (const id in CRAZY) { const d = RF.getCharacter(id); if (d) d.crazy = CRAZY[id]; }

  // ---------------------------------------------------------------- when it is allowed
  RF.crazyOn = (scene) => !!(RF.CONFIG.CRAZY_SPECIALS && scene && !scene.opts.story && !scene.training && !scene.tag && !scene.opts.tower);
  const P = RF.Fighter.prototype;
  P.crazyReady = function () {
    const c = this.def.crazy, sc = this.scene;
    return !!(c && sc && RF.crazyOn(sc) && sc.phase === 'fight' && !this.crazyUsed && !this.isKO && (!c.afterKO || sc.wins[1 - this.side] >= 1) && (!c.afterRevive || this.reviveUsed));
  };
  P.startCrazy = function () {
    this.crazyUsed = true; this.crazyCommitted = false;
    const sc = this.scene; sc.flash = Math.max(sc.flash, 4); RF.audio.sfx('perfect');
    this.startSpecial(RF.SPECIALS[this.def.crazy.special]);
    sc.effects.spawnText('CRAZY SPECIAL!', this.x, this.body.height + 20, '#ff4fd8');
  };

  // ---------------------------------------------------------------- what a hit does
  // someone who is caught: held where they stand (in an upright pose), until the knockout
  RF.crazyHold = (vic, frames) => { vic.vx = 0; vic.move = null; vic.state = null; vic.setState('hitstun'); vic.stun = frames; vic.crazyHold = true; vic.combo = 0; };
  RF.crazyKO = (scene, att, vic, text, color) => {
    if (scene.phase !== 'fight' || vic.isKO || vic.health <= 0) return;
    vic.crazyHold = false; vic.health = 0; scene.effects.spawnText(text, vic.x, vic.body.height + 22, color || '#ffffff');
    scene.shake = Math.max(scene.shake, 10); scene.flash = Math.max(scene.flash, 4); RF.audio.sfx('heavy');
    vic.knockOut(att.facing || 1);
  };
  const fx = (scene, o) => { (scene.crazyFx || (scene.crazyFx = [])).push(Object.assign({ t: 0, len: 90 }, o)); return o; };
  RF.crazyTick = (scene) => {
    if (scene.crazyFx) { for (const it of scene.crazyFx) it.t++; scene.crazyFx = scene.crazyFx.filter((it) => it.t < it.len); if (scene.phase !== 'fight' && scene.phase !== 'finish') scene.crazyFx = []; }
    if (scene.phase === 'fight' && scene.phaseTime === 50) for (const f of scene.fighters) if (f.crazyReady()) scene.effects.spawnText('CRAZY SPECIAL READY: EX', f.x, f.body.height + 30, '#ff4fd8');
  };
  // Javan comes back: wave the flag, full health, and the move is back
  RF.crazyRevive = (f) => {
    const c = f.def.crazy, sc = f.scene;
    if (!c || !c.revive || f.reviveUsed || !sc || sc.phase !== 'fight' || !RF.crazyOn(sc)) return false;
    f.reviveUsed = true; f.health = 1; f.crazyHold = false;
    const opp = sc.opponentOf(f); if (opp && !opp.isKO) opp.stagger(110);
    f.startSpecial(RF.SPECIALS.flagWave);
    sc.flash = Math.max(sc.flash, 6); sc.shake = Math.max(sc.shake, 6); RF.audio.sfx('perfect');
    return true;
  };

  // ---------------------------------------------------------------- the Trump line (a stock voice at his pace)
  let clip = null;
  RF.crazyVoice = (def, text) => {
    try {
      if (RF.audio && RF.audio.muted) return;
      clip = clip || new Audio('assets/audio/quite_frankly.mp3'); clip.currentTime = 0; clip.volume = RF.CONFIG.SFX_VOLUME == null ? 1 : Math.min(1, RF.CONFIG.SFX_VOLUME * 1.25);
      const p = clip.play(); if (p && p.catch) p.catch(() => { if (RF.speakAs) RF.speakAs(def, text, { interrupt: true }); });
    } catch (e) { if (RF.speakAs) RF.speakAs(def, text, { interrupt: true }); }
  };
  const say = (f, text) => { f.scene.effects.spawnText(text, f.x, f.body.height + 26, '#ffffff'); if (RF.speakAs) RF.speakAs(f.def, text, { interrupt: false }); };

  // ---------------------------------------------------------------- the moves
  const S = (o) => Object.assign({ kind: 'crazy', damage: 0, hitstun: 0, blockstun: 0, pushback: 0, hitstop: 0 }, o);
  RF.SPECIALS.quiteFrankly = S({ name: 'Quite Frankly', style: 'trump', total: 190, description: 'Calls the President. He walks in, says it, and knocks them out. Quite frankly.' });
  RF.SPECIALS.frozenBrobatch = S({ name: 'Frozen Bro Batch', style: 'freezer', total: 96, description: 'Opens the freezer and throws a frozen Bro Batch bar. A hit is an instant knockout.' });
  RF.SPECIALS.absOut = S({ name: 'Abs Out', style: 'abs', total: 168, range: 150, description: 'Lifts his shirt. Perfect abs. Says he hates his body. Whoever is looking goes out cold.' });
  RF.SPECIALS.hypnoDance = S({ name: 'Hypno Dance', style: 'dance', total: 190, range: 200, description: 'A dance that puts spirals in their eyes. Anyone watching goes down.' });
  RF.SPECIALS.flagWave = S({ name: 'Flag Wave', style: 'flag', total: 150, invuln: 150, description: 'Waves the flag, gets back up at full health, and the ability is back.' });

  const bounds = (sc) => sc.stageDef.bounds;
  const STY = {
    // ---- JAVAN: the President walks in
    trump: {
      update(f, sc, t, d, opp) {
        if (t === 1) { sc.effects.spawnText('MR. PRESIDENT!', f.x, f.body.height + 18, '#ffd030'); RF.audio.sfx('pa'); }
        d.sx = d.sx == null ? f.x - f.facing * 230 : d.sx; d.tx = opp.x - f.facing * 46;
        if (t === 36 && !d.committed) { d.committed = true; f.crazyCommitted = true; RF.crazyHold(opp, 200); d.opx = opp.x; sc.shake = Math.max(sc.shake, 5); RF.audio.sfx('stomp'); }
        if (t === 44) RF.crazyVoice(RF.getCharacter('trump'), 'QUITE FRANKLY.');
        if (t === 44) sc.effects.spawnText('QUITE FRANKLY.', (f.x + opp.x) / 2, f.body.height + 40, '#ffffff');
        if (t === 150) { d.swung = true; sc.shake = Math.max(sc.shake, 10); }
        if (t === 154) RF.crazyKO(sc, f, opp, 'YOU\'RE FIRED.', '#ff4040');
      },
      draw(f, ctx, fy, t, d) {
        const x = lerp(d.sx != null ? d.sx : f.x, d.tx != null ? d.tx : f.x, clamp((t - 10) / 26)), walking = t >= 10 && t < 36, face = f.facing;
        if (t < 8 || t > 172) return;
        const a = t < 150 ? 'idle' : 'heavy', fr = walking ? (t / 4) % 4 : t < 150 ? (t / 20) % 2 : (t < 154 ? 1 : 2);
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, fy + 1, 14, 3, 0, 0, 7); ctx.fill(); ctx.restore();
        if (t >= 36 && t < 160) { ctx.fillStyle = 'rgba(255,246,208,0.16)'; ctx.beginPath(); ctx.moveTo(x - 6, -10); ctx.lineTo(x + 6, -10); ctx.lineTo(x + 40, fy + 2); ctx.lineTo(x - 40, fy + 2); ctx.fill(); }
        sprite('trump').draw(ctx, walking ? 'walk' : a, fr, x, fy, face);
        if (t >= 44 && t < 150) T(ctx, 'QUITE FRANKLY.', x, fy - 108 - (t < 52 ? (52 - t) : 0), '#ffffff', 2);
        if (t >= 150 && t < 166) for (let i = 0; i < 6; i++) R(ctx, i % 2 ? '#ffffff' : '#ff4040', x + face * (22 + i * 5), fy - 52 - (i % 3) * 6, 3, 2);
      },
      anim: (f, t) => ['special', t < 36 ? 0 : 1],
    },
    // ---- NICHOLAS: the freezer
    freezer: {
      update(f, sc, t) {
        if (t === 1) { sc.effects.spawnText('COLD STORAGE.', f.x, f.body.height + 18, '#a0e8ff'); RF.audio.sfx('hiss'); }
        if (t === 16) f.crazyCommitted = true;
        if (t === 56) {
          RF.audio.sfx('whoosh'); const s = f.special, cfg = { art: 'frozenBar', speed: 8.5, size: 18, height: 0.58, damage: 5, hitstun: 20, blockstun: 12, pushback: 5, hitstop: 6, crazyKO: true, koText: 'FLASH FROZEN.', hitText: 'DEEP FREEZE!', sound: 'whoosh', colors: ['#ffffff', '#a0e8ff', '#3a90e0'], kind: 'projectile' };
          sc.spawnProjectile(f, cfg);
        }
      },
      draw(f, ctx, fy, t) {
        const d = f.facing, fx0 = f.x - d * 30, open = clamp((t - 8) / 14), mist = t > 8 && t < 62;
        const w = 26, h = f.body.height * 0.95, L = fx0 - w / 2;
        R(ctx, '#111', L - 1, fy - h - 1, w + 2, h + 2); R(ctx, '#d8e4ec', L, fy - h, w, h); R(ctx, '#a8bcc8', L, fy - h, 3, h); R(ctx, '#8aa0ae', L, fy - h * 0.62, w, 1);
        if (open > 0) { R(ctx, '#0a2a3a', L + 3, fy - h + 4, w - 6, h * 0.5); R(ctx, '#d0f4ff', L + 4, fy - h + 6, w - 8, 2); for (let i = 0; i < 3; i++) R(ctx, '#e8fcff', L + 5 + i * 6, fy - h + 12, 4, 6); }
        const dw = (1 - open) * (w - 4) + 2; R(ctx, '#111', d > 0 ? L + w - dw + 1 : L - 1, fy - h + 2, dw, h * 0.56); R(ctx, '#f0f6fa', d > 0 ? L + w - dw + 2 : L, fy - h + 3, dw - 1, h * 0.56 - 2);   // the door swings open
        if (mist) for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.5 * (1 - ((t * 0.9 + i * 6) % 40) / 40); R(ctx, '#d8f4ff', fx0 + d * (6 + ((t * 0.7 + i * 5) % 30)) + (hash(i) - 0.5) * 10, fy - h * 0.55 + (hash(i + 4) - 0.2) * 26, 6, 4); } ctx.globalAlpha = 1;
        if (t >= 22 && t < 56) { const hx = f.x + d * 16, hy = fy - f.body.height * 0.6 - (t > 44 ? (t - 44) * 1.2 : 0); frozenBar(ctx, hx, hy, t, d, 1); }   // in his hand
        if (t > 8 && t < 40) T(ctx, 'BRRR', fx0, fy - h - 8, '#a0e8ff');
      },
      anim: (f, t) => (t < 22 ? ['crouch', 0] : t < 50 ? ['special', 0] : ['special', 1]),
    },
    // ---- ANTHONY: abs
    abs: {
      update(f, sc, t, d, opp) {
        if (t === 4) f.crazyCommitted = true;
        if (t === 24) {
          const near = Math.abs(opp.x - f.x) < f.special.range && !opp.isKO;
          if (near) { d.hooked = true; RF.crazyHold(opp, 160); fx(sc, { kind: 'awe', vic: opp, len: 130 }); sc.effects.spawnText('...WOW.', opp.x, opp.body.height + 22, '#ff7ac8'); RF.audio.sfx('perfect'); }
          else { d.miss = true; sc.effects.spawnText('NO ONE WAS LOOKING.', f.x, f.body.height + 32, '#a8a8b8'); }
        }
        if (d.miss && t > 54) { f.crazyCommitted = false; f.setState('idle'); return; }
        if (!d.miss) {
          if (t === 30) say(f, 'I HATE MY BODY.');
          if (t === 66) say(f, 'I\'M SO FAT.');
          if (t === 98 && RF.speakAs) { RF.speakAs(f.def, 'mm... hmm... mmmmm...', { interrupt: false }); sc.effects.spawnText('MMM... HMM... NGH...', f.x, f.body.height + 26, '#c8b0ff'); }
          if (t === 140) RF.crazyKO(sc, f, opp, 'TOO PERFECT.', '#ff7ac8');
        }
      },
      draw(f, ctx, fy, t, d) {
        const up = t < 150 ? clamp(t / 10) * (d.miss && t > 40 ? clamp(1 - (t - 40) / 10) : 1) : clamp(1 - (t - 150) / 8); if (up <= 0) return;
        const h = f.body.height, cx = f.x + f.facing * 1, top = fy - f.y - h * 0.62, wd = Math.round(f.body.width * 0.5), hh = Math.round(h * 0.21 * up), L = Math.round(cx - wd / 2);
        R(ctx, '#2a1a14', L - 1, top + 1, wd + 2, hh + 2); R(ctx, '#e8b090', L, top + 2, wd, hh);                         // the torso
        if (hh > 10) { const cw = Math.floor((wd - 3) / 2), rh = Math.floor((hh - 2) / 3); for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 2; c2++) { const ax = L + 1 + c2 * (cw + 1), ay = top + 3 + r * rh; R(ctx, '#f6cdb0', ax, ay, cw, rh - 1); R(ctx, '#c88a68', ax, ay + rh - 2, cw, 1); } R(ctx, '#2a2218', cx - 1, top + hh - 1, 2, 2); }   // six clean abs
        R(ctx, '#15121a', L - 5, top - 5 + (1 - up) * 4, wd + 10, 7); R(ctx, '#2a2634', L - 4, top - 4 + (1 - up) * 4, wd + 8, 3);   // the shirt, bunched up above them
        if (t > 98 && t < 140) for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.8 - i * 0.18; T(ctx, ['m', 'M', 'm', '...'][(i + (t >> 3)) % 4], f.x + (i - 1.5) * 8, fy - h - 10 - ((t + i * 5) % 14), '#c8b0ff'); ctx.globalAlpha = 1; }
      },
      anim: (f, t) => ['special', t < 12 ? 0 : 1],
    },
    // ---- GABRIEL: the dance
    dance: {
      update(f, sc, t, d, opp) {
        if (t === 1) { sc.effects.spawnText('WATCH THIS.', f.x, f.body.height + 18, '#40e8ff'); RF.audio.sfx('arcane'); }
        if (t === 6) f.crazyCommitted = true;
        f.vx = Math.sin(t / 4) * 1.1;
        if (t === 30) {
          const near = Math.abs(opp.x - f.x) < f.special.range && !opp.isKO;
          if (near) { d.hooked = true; RF.crazyHold(opp, 180); fx(sc, { kind: 'spiral', vic: opp, len: 150 }); sc.effects.spawnText('...', opp.x, opp.body.height + 22, '#c8b0ff'); RF.audio.sfx('arcane'); }
          else { d.miss = true; sc.effects.spawnText('NO ONE IS WATCHING.', f.x, f.body.height + 32, '#a8a8b8'); }
        }
        if (d.miss && t > 74) { f.vx = 0; f.crazyCommitted = false; f.setState('idle'); return; }
        if (!d.miss && t === 52) sc.effects.spawnText('LET\'S GOOOO!', f.x, f.body.height + 26, '#ff4fb0');
        if (!d.miss && t === 128) RF.crazyKO(sc, f, opp, 'SLEEPING IT OFF.', '#c8b0ff');
        if (t % 12 === 0) RF.audio.sfx(t % 24 ? 'whoosh' : 'paper');
      },
      draw(f, ctx, fy, t) {
        if (t > 160) return; const x = f.x, h = f.body.height;
        for (let i = 0; i < 5; i++) { const a = t / 18 + i * 1.26; ctx.globalAlpha = 0.5; ctx.fillStyle = ['#ff4fb0', '#40e8ff', '#ffe27a', '#8a4ad0', '#60ff80'][i]; ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x + Math.cos(a) * 58 - 6, fy + 2); ctx.lineTo(x + Math.cos(a) * 58 + 6, fy + 2); ctx.fill(); } ctx.globalAlpha = 1;
        if (RF.drawNote) for (let i = 0; i < 4; i++) RF.drawNote(ctx, x + Math.sin(t / 7 + i * 2) * 26, fy - h - 8 - ((t * 0.8 + i * 15) % 40), i % 2 ? '#ff4fb0' : '#40e8ff', 1);
      },
      anim: (f, t) => { const seq = [['victory', 0.5], ['light', 1], ['special', 1], ['victory', 1], ['heavy', 1], ['uppercut', 1], ['special', 0]]; return seq[Math.floor(t / 7) % seq.length]; },
    },
    // ---- JAVAN: the flag
    flag: {
      update(f, sc, t, d) {
        f.vx = 0; f.crazyCommitted = true;
        if (t === 4) { sc.effects.spawnText('NEVER COUNT ME OUT.', f.x, f.body.height + 22, '#ffffff'); RF.audio.sfx('applause'); }
        if (t > 30 && t <= 100) f.health = Math.max(f.health, lerp(1, f.maxHealth, clamp((t - 30) / 70)));
        if (t === 100) { f.health = f.maxHealth; sc.flash = Math.max(sc.flash, 5); RF.audio.sfx('perfect'); sc.effects.spawnText('BACK AT FULL HEALTH!', f.x, f.body.height + 34, '#60ff80'); }
        if (t === 112) { f.crazyUsed = false; sc.effects.spawnText('ABILITY IS BACK.', f.x, f.body.height + 22, '#ff4fd8'); }
      },
      draw(f, ctx, fy, t) {
        const d = f.facing, bx = f.x + d * 15, top = fy - f.body.height - 26, rise = clamp(t / 12), pTop = lerp(fy - 6, top, rise), fw = 44, fh = 30;
        if (t > 142) return;
        R(ctx, '#111', bx - 1, pTop - 1, 3, fy - pTop + 2); R(ctx, '#c8c8d0', bx, pTop, 1, fy - pTop);
        const w = Math.round(fw * clamp((t - 4) / 8)); if (w <= 0) return;
        for (let i = 0; i < w; i += 2) {                               // the flag, in strips, rippling
          const px = bx + d * (2 + i), py = pTop + 1 + Math.sin(t / 4 + i * 0.28) * (1 + i * 0.07) * 1.6;
          R(ctx, '#ffffff', d > 0 ? px : px - 1, py, 2, fh); R(ctx, '#0038b8', d > 0 ? px : px - 1, py + 3, 2, 4); R(ctx, '#0038b8', d > 0 ? px : px - 1, py + fh - 7, 2, 4);
        }
        // the star of David: two triangles, on the ripple
        const cx = bx + d * (2 + w / 2), cy = pTop + 1 + fh / 2 + Math.sin(t / 4 + w * 0.14) * 1.2 * (w / 44);
        if (w > 20) { ctx.strokeStyle = '#0038b8'; ctx.lineWidth = 1.4; for (const s of [1, -1]) { ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2.094 + (s < 0 ? Math.PI : 0); const px = cx + Math.cos(a) * 6 * (w / 44), py = cy + Math.sin(a) * 6; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke(); } ctx.lineWidth = 1; }
        if (t > 30 && t < 102) for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.8; R(ctx, '#80ffa0', f.x + (hash(i) - 0.5) * 36, fy - 6 - ((t * 1.4 + i * 9) % (f.body.height)), 2, 4); } ctx.globalAlpha = 1;
      },
      anim: (f, t) => ['victory', t < 24 ? t / 24 : 1],
    },
  };

  RF.SPECIAL_KINDS.crazy = {
    start(f) { f.vx = 0; },
    update(f, scene) {
      const s = f.special, t = f.stateTime, opp = scene.opponentOf(f), st = STY[s.style];
      st.update(f, scene, t, f.specialData, opp);
      if (f.state === 'special' && t >= s.total) { f.vx = 0; f.setState('idle'); }
    },
    anim(f) { return STY[f.special.style].anim(f, f.stateTime); },
    draw(f, ctx, floorY, frame) { STY[f.special.style].draw(f, ctx, floorY, f.stateTime, f.specialData); },
  };

  // ---------------------------------------------------------------- the frozen bar (also the thing in his hand)
  function frozenBar(ctx, x, y, t, dir, k) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir, 1);
    R(ctx, '#0a2a4a', -9, -5, 19, 11); R(ctx, '#7ac8f0', -8, -4, 17, 9); R(ctx, '#d0f4ff', -8, -4, 17, 2); R(ctx, '#e8fcff', -6, -2, 3, 5);
    R(ctx, '#ffe27a', -3, -2, 8, 4); R(ctx, '#e8b420', -3, 0, 8, 2); RF.font.drawText(ctx, 'BB', 1, -2, { align: 'center', color: '#1a1a22', scale: 1 });
    for (let i = 0; i < 4; i++) R(ctx, '#ffffff', -10 + i * 6 + Math.sin(t / 3 + i) * 1, -8 + (i % 2) * 14, 1, 2);
    ctx.restore();
  }
  RF.PROJECTILE_ART.frozenBar = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.5 - i * 0.07; R(ctx, i % 2 ? '#d0f4ff' : '#7ac8f0', x - dir * i * 7, y - 2 + Math.sin(t / 2 + i) * 3, 5, 3); } ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(t * 0.25 * dir); frozenBar(ctx, 0, 0, t, 1, 1); ctx.restore();
  };

  // ---------------------------------------------------------------- effects stuck on the victim
  RF.drawCrazy = (scene, ctx, floorY) => {
    if (!scene.crazyFx) return;
    for (const it of scene.crazyFx) {
      const v = it.vic, x = v.x, hy = floorY - v.y - v.body.height * 0.84, t = it.t;
      if (it.kind === 'spiral') {
        const g = clamp(t / 14), fade = clamp((it.len - t) / 20);
        ctx.save(); ctx.globalAlpha = fade;
        for (const ex of [-4, 5]) { ctx.strokeStyle = '#000'; ctx.lineWidth = 3; spiral(ctx, x + ex * (v.facing || 1) * 0.9 + 2, hy, 5.5 * g, t * 0.45, 0); ctx.strokeStyle = '#f0e8ff'; ctx.lineWidth = 1.2; spiral(ctx, x + ex * (v.facing || 1) * 0.9 + 2, hy, 5.5 * g, t * 0.45, 0); }
        ctx.globalAlpha = fade * 0.55 * g; ctx.strokeStyle = '#c8b0ff'; ctx.lineWidth = 2; spiral(ctx, x, hy - 2, 40 * g, -t * 0.12, 0); ctx.restore(); ctx.lineWidth = 1;
        if (v.isKO && t < it.len - 20) for (let i = 0; i < 3; i++) T(ctx, 'Z', x + 10 + i * 8, floorY - v.y - 34 - i * 8 - (t % 20) * 0.3, '#c8b0ff');
      } else if (it.kind === 'awe') {
        ctx.save(); ctx.globalAlpha = clamp((it.len - t) / 20);
        for (const ex of [-4, 5]) { const px = x + ex * (v.facing || 1) * 0.9 + 2, s = 1 + Math.sin(t / 3) * 0.2; ctx.fillStyle = '#ff2a6a'; ctx.beginPath(); ctx.arc(px - 1.6 * s, hy - 1, 2 * s, 0, 7); ctx.arc(px + 1.6 * s, hy - 1, 2 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - 3.4 * s, hy); ctx.lineTo(px + 3.4 * s, hy); ctx.lineTo(px, hy + 4 * s); ctx.fill(); }
        for (let i = 0; i < 5; i++) { const a = t / 10 + i * 1.26; ctx.fillStyle = '#ffe27a'; ctx.fillRect(Math.round(x + Math.cos(a) * 14), Math.round(hy + Math.sin(a) * 9), 2, 2); } ctx.restore();
      } else if (it.kind === 'ice') {
        const h = v.body.height, w = v.body.width + 12, bx = x - w / 2, by = floorY - v.y - h - 2, shatter = t > it.len - 22, a = shatter ? clamp((it.len - t) / 22) : 1;
        ctx.save(); ctx.globalAlpha = 0.62 * a; ctx.fillStyle = '#7ac8f0'; ctx.fillRect(Math.round(bx), Math.round(by), w, h + 4); ctx.globalAlpha = 0.85 * a; ctx.fillStyle = '#d8f4ff'; ctx.fillRect(Math.round(bx), Math.round(by), 4, h + 4); ctx.fillRect(Math.round(bx), Math.round(by), w, 3);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 7, by + 14); ctx.lineTo(bx + w * 0.5, by + h * 0.4); ctx.lineTo(bx + w - 6, by + h * 0.3); ctx.moveTo(bx + w * 0.5, by + h * 0.4); ctx.lineTo(bx + w * 0.4, by + h * 0.8); ctx.stroke(); ctx.restore();
        if (shatter) for (let i = 0; i < 14; i++) { const k = (t - (it.len - 22)); R(ctx, i % 2 ? '#d8f4ff' : '#7ac8f0', x + (hash(i) - 0.5) * (w + k * 3), by + hash(i + 5) * h + k * (0.5 + hash(i + 9)), 3, 3); }
      }
    }
  };
  function spiral(ctx, x, y, r, rot, off) { ctx.beginPath(); for (let i = 0; i <= 26; i++) { const a = rot + i * 0.55, rr = r * (i / 26); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  // a frozen bar hit: the victim is encased as they go down
  RF.crazyIce = (scene, vic) => fx(scene, { kind: 'ice', vic, len: 80 });
})();
