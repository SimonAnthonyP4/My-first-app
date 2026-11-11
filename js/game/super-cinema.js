// CINEMATIC SUPERS. A full super meter (LIGHT + HEAVY) now stops the fight for a short film:
// the screen cuts to a full-screen card in the fighter's colours - they slide in huge, the
// name of the super slams down, they say their line - then a close-up on the eyes, a white
// flash, and the move comes out. The first super each fighter lands in a match gets the whole
// sequence; after that it is the short cut, so it never drags. When the super connects the
// screen snaps to a negative for two frames and speed lines burst from the hit.
// TAG TEAM: with a partner alive it is a TEAM SUPER - both on the card, and the partner
// charges in behind the move (some pairs have a name of their own).
//
// Each fighter's super:  title (what it is called), line (what they say), color, style
// (the card's backdrop: 'streaks' | 'rays' | 'vortex' | 'math').
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224, FULL = 104, SHORT = 56;
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  RF.SUPERS = {
    nicholas: { title: 'MAX GAINS', line: 'LIGHT WEIGHT, BABY.', color: '#ff4a30', style: 'streaks' },
    anthony: { title: 'FINAL BATCH', line: 'I MADE THIS ONE MYSELF.', color: '#ff60a8', style: 'vortex' },
    brady: { title: 'ZERO TOLERANCE', line: 'STOP.', color: '#ffd030', style: 'streaks' },
    sirven: { title: 'ROYAL DECREE', line: 'THIS IS YOUR PRINCIPAL SPEAKING.', color: '#ffd030', style: 'rays' },
    lopez: { title: 'INTEGRAL TO INFINITY', line: 'CLASS DISMISSED.', color: '#a050ff', style: 'math' },
    jauregui: { title: 'FINAL EXAM', line: 'PENCILS DOWN.', color: '#f0e8c8', style: 'math' },
    erick: { title: 'NOW SHOWING', line: 'W.', color: '#ff7ac8', style: 'rays' },
    javan: { title: 'FLY EAGLES FLY', line: 'GO BIRDS!', color: '#3ad070', style: 'streaks' },
    trump: { title: 'YOU\'RE FIRED', line: 'TREMENDOUS.', color: '#ff3030', style: 'rays' },
    bandy: { title: 'ENCORE', line: 'TURN IT UP!', color: '#ff60a0', style: 'rays' },
    mikey: { title: 'BLITZ', line: 'NOBODY HITS MY TEAMMATES!', color: '#60e860', style: 'streaks' },
    simon: { title: 'EIGHT LIMBS', line: 'ONE KNEE. THAT IS ALL I NEED.', color: '#ffb030', style: 'streaks' },
    gabriel: { title: 'MR. SUPPLIER', line: "LET'S GOOOOO! 305!", color: '#40e8ff', style: 'vortex' },
    fernando: { title: 'LAST CIGARETTE', line: 'HEH HEH. CATCH.', color: '#ff7020', style: 'rays' },
    tyler: { title: 'HOLE IN ONE', line: 'NO STRESS. ...FORE.', color: '#60e090', style: 'rays' },
    alejandro: { title: 'SEND IT', line: 'NO ROPE. SEND IT!', color: '#ff5050', style: 'streaks' },
    wuttke: { title: 'FORTISSIMO', line: 'FROM THE TOP. FORTISSIMO!', color: '#c080ff', style: 'rays' },
    landa: { title: 'THE ZOO IS OPEN', line: 'INTO THE JAR WITH YOU.', color: '#b050f0', style: 'vortex' },
    chris: { title: "DADDY'S MONEY", line: 'PUT IT ON MY TAB.', color: '#60d060', style: 'rays' },
    tamayo: { title: 'EXECUTIVE ORDER', line: 'HA HA HA! MOTION CARRIED.', color: '#ff5040', style: 'streaks' },
    ruano: { title: 'DIVINE JUDGMENT', line: 'YOU ARE FORGIVEN.', color: '#fff2a0', style: 'rays' },
    dabalsa: { title: 'THE FINAL ACT', line: 'EXIT, PURSUED BY ME.', color: '#e04848', style: 'streaks' },
    astuto: { title: 'UNCONSTITUTIONAL', line: 'OBJECTION. SUSTAINED.', color: '#d8b050', style: 'streaks' },
    escobedo: { title: 'MAXIMUM TOASTER', line: 'DALE!', color: '#ff9030', style: 'rays' },
    weissenberg: { title: 'ONE MILLION VOLTS', line: 'FOR SCIENCE!', color: '#60d0ff', style: 'rays' },
    holbrook: { title: 'TECTONIC SHIFT', line: 'I KNOW WHERE YOU WILL LAND.', color: '#60c888', style: 'vortex' },
  };
  // pairs with a team super of their own (ids in alphabetical order)
  const DUOS = {
    'anthony+nicholas': 'BRO BATCH BLITZ', 'brady+sirven': 'THE ADMINISTRATION', 'javan+trump': 'LANDSLIDE', 'javan+mikey': 'SUPER BOWL SUNDAY', 'mikey+simon': 'GAME DAY',
    'bandy+fernando': 'STREET LEVEL', 'jauregui+lopez': 'SHOW YOUR WORK', 'alejandro+tyler': 'NO STRESS. SEND IT.',
    'landa+wuttke': 'REQUIEM', 'gabriel+mikey': 'THE 305 BLITZ', 'anthony+lopez': 'EVERY UNIVERSE', 'bandy+wuttke': 'THE LAST BELL',
  };
  const shade = (hex, m) => { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * m))).join(',') + ')'; };

  const P = RF.FightScene.prototype, oldCutIn = P.drawSuperCutIn;
  const seen = new WeakSet(); // fighters who have already had their full sequence this match
  const startMatch0 = P.startMatch;
  P.startMatch = function () { if (this.fighters) for (const f of [...this.fighters, ...(this.tag ? this.tag.partners : [])]) seen.delete(f); return startMatch0.call(this); };

  P.startSuperFreeze = function (f) {
    const info = RF.SUPERS[f.def.id] || { title: f.special.name.toUpperCase(), line: f.def.taunt || f.def.quote || '', color: '#ff7010', style: 'streaks' };
    const partner = this.tag && this.tag.bench[f.side].health > 0 ? this.tag.bench[f.side] : null;
    const duo = partner && (DUOS[[f.def.id, partner.def.id].sort().join('+')] || 'TEAM SUPER');
    const first = !seen.has(f); seen.add(f);
    this.superFreeze = { f, t: 0, len: first ? FULL : SHORT, cine: Object.assign({}, info, { partner, duo, first, title: duo || info.title }) };
    f.superHitShown = false;
    if (this.isHuman(f)) RF.records.unlock('super');
    this.game.kb.rumble(f.side, 1, 500);
    this.projectiles = this.projectiles.filter((p) => p.owner === f);
    RF.audio.sfx('super');
  };

  // Sounds and the spoken line, on their frames. Called once per frame of the sequence.
  RF.superTick = function (scene, sf) {
    const c = sf.cine, t = sf.t, titleAt = c.first ? 18 : 10;
    if (t === titleAt) { RF.audio.sfx('heavy'); scene.game.kb.rumble(sf.f.side, 0.8, 160); }
    if (t === 4) RF.audio.sfx('whoosh');
    if (c.first && t === 26 && c.line && RF.speakAs) RF.speakAs(sf.f.def, c.line);
    if (!c.first && t === 12) RF.announcer.say(c.duo ? 'TEAM SUPER!' : 'SUPER!', { rate: 1 });
    if (c.first && t === sf.len - 26) { RF.audio.sfx('clang'); }
  };
  RF.superEnd = function (scene, sf) {
    const c = sf.cine;
    scene.flash = Math.max(scene.flash, 8);
    if (c.partner && scene.tag && c.partner.health > 0 && scene.tag.bench[sf.f.side] === c.partner) { // the partner follows the super in
      RF.spawnAssist(scene, sf.f, c.partner.def.id, { damage: 14, speed: 8, line: c.duo + '!', hitText: 'TEAM SUPER!' });
    }
  };
  // The super connected: one big moment (once per super, however many hits it has).
  RF.superImpact = function (scene, att, def, ex, ey) {
    if (att.superHitShown) return;
    att.superHitShown = true;
    scene.superHit = { t: 0, col: (RF.SUPERS[att.def.id] || {}).color || '#ffffff' };
    scene.hitstop = Math.max(scene.hitstop, 16); scene.shake = Math.max(scene.shake, 18);
    RF.audio.sfx('boom');
    scene.game.kb.rumble(def.side, 1, 300);
  };
  RF.drawSuperHit = function (ctx, scene) {
    const h = scene.superHit, t = h.t;
    if (t < 3) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - (t - 3) / 12); ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) {
      const a = i * 0.2244 + (i % 3) * 0.05, r0 = 54 + (i % 4) * 16 + t * 3;
      ctx.strokeStyle = i % 3 ? '#ffffff' : h.col;
      ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * 0.62); ctx.lineTo(W / 2 + Math.cos(a) * 300, H / 2 + Math.sin(a) * 190); ctx.stroke();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- the card
  function backdrop(ctx, c, t, left) {
    const col = c.color, dark = shade(col, 0.28), mid = shade(col, 0.6);
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, left ? dark : '#06030a'); g.addColorStop(1, left ? '#06030a' : dark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cx = left ? 110 : W - 110, cy = 120;
    if (c.style === 'rays') {
      for (let i = 0; i < 20; i++) {
        const a = i * (Math.PI / 10) + t * 0.012 * (left ? 1 : -1);
        ctx.fillStyle = i % 2 ? mid : dark; ctx.globalAlpha = i % 2 ? 0.55 : 0.9;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 460, cy + Math.sin(a) * 460); ctx.lineTo(cx + Math.cos(a + 0.17) * 460, cy + Math.sin(a + 0.17) * 460); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (c.style === 'vortex') {
      for (let i = 9; i >= 0; i--) {
        const r = 30 + i * 34 + ((t * 2.2) % 34);
        ctx.strokeStyle = i % 2 ? mid : col; ctx.globalAlpha = 0.18 + (i % 2) * 0.22; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.72, t * 0.02 + i * 0.3, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    } else if (c.style === 'math') {
      const rows = ['∫ F(X) DX = ∞', 'Σ N = ∞   Δ X = 0', '√ ∞ = ∞   Π = 3.14159', '∫ TERRAMANIA(U) DU', 'LIM X - ∞'];
      ctx.globalAlpha = 0.34;
      for (let i = 0; i < 9; i++) {
        const row = rows[i % rows.length], sx = ((i * 97 + t * (1.5 + (i % 3)) * (i % 2 ? 1 : -1)) % (W + 300) + W + 300) % (W + 300) - 240;
        T(ctx, row + '     ' + row, sx, 28 + i * 22, { scale: 2, color: i % 2 ? col : mid });
      }
      ctx.globalAlpha = 1;
    } else { // streaks
      for (let i = -3; i < 18; i++) {
        const sx = ((i * 46 + t * 16 * (left ? 1 : -1)) % (W + 140) + W + 140) % (W + 140) - 70;
        ctx.fillStyle = i % 2 ? mid : dark; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(sx, H); ctx.lineTo(sx + 20, H); ctx.lineTo(sx + 84, 0); ctx.lineTo(sx + 64, 0); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // darker toward the text side, so the words read
    const v = ctx.createLinearGradient(left ? W : 0, 0, left ? 120 : W - 120, 0); v.addColorStop(0, 'rgba(4,2,8,0.86)'); v.addColorStop(1, 'rgba(4,2,8,0)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  function bigSprite(ctx, f, x, footY, k, dir, tint, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(footY)); ctx.scale(k, k);
    f.sprite.draw(ctx, 'special', 1, 0, 0, dir, tint); ctx.restore();
  }

  P.drawSuperCutIn = function (ctx) {
    const sf = this.superFreeze;
    if (!sf.cine) return oldCutIn.apply(this, arguments); // LAST STAND keeps its own band
    const { f, t, len } = sf, c = sf.cine, left = f.side === 0, col = c.color, dir = left ? 1 : -1;
    const eyesAt = c.first ? len - 26 : Infinity, titleAt = c.first ? 18 : 10;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t / 5);
    backdrop(ctx, c, t, left);
    ctx.globalAlpha = 1;
    // the fighter (and, for a team super, the partner a step behind): in from off screen, then drifting
    const ease = 1 - Math.pow(1 - Math.min(1, t / 11), 3), k = 3.3, bh = f.body.height;
    const home = c.partner ? 72 : 90; // (a team super makes room for the partner)
    const px = (left ? home : W - home) - dir * (1 - ease) * 260 + dir * t * 0.22, foot = H + bh * k * 0.3;
    if (c.partner) {
      const e2 = 1 - Math.pow(1 - Math.min(1, Math.max(0, t - 5) / 11), 3), p = c.partner, k2 = 2.5;
      const x2 = (left ? 170 : W - 170) - dir * (1 - e2) * 300 + dir * t * 0.12, f2 = H + p.body.height * k2 * 0.3;
      bigSprite(ctx, p, x2 - dir * 5, f2 + 2, k2, dir, shade(col, 0.7), 0.7);
      bigSprite(ctx, p, x2, f2, k2, dir, null);
    }
    bigSprite(ctx, f, px - dir * 7, foot + 3, k, dir, col, 0.7);                       // a hard coloured shadow
    bigSprite(ctx, f, px, foot, k, dir, t < 7 ? '#ffffff' : null);
    // widescreen bars
    const bar = Math.round(22 * Math.min(1, t / 8));
    R(ctx, '#000', 0, 0, W, bar); R(ctx, '#000', 0, H - bar, W, bar); R(ctx, col, 0, bar, W, 1); R(ctx, col, 0, H - bar - 1, W, 1);
    // the words
    const tx = left ? W - 14 : 14, align = left ? 'right' : 'left';
    if (t > 6) T(ctx, c.duo ? 'TEAM SUPER' : 'SUPER', tx, 40, { align, color: col, outline: '#000' });
    if (t >= titleAt) {
      const tt = t - titleAt, lines = RF.font.wrap(c.title, 12), sc = lines.length > 2 ? 2 : 3;
      const jx = tt < 6 ? (Math.random() - 0.5) * (6 - tt) * 2 : 0, jy = tt < 6 ? (Math.random() - 0.5) * (6 - tt) * 2 : 0;
      (sc === 3 ? lines : RF.font.wrap(c.title, 18)).forEach((l, i) => T(ctx, l, tx + jx, 52 + i * (sc * 9) + jy, { scale: sc, align, color: tt < 3 ? '#ffffff' : ['#ffffff', '#ffffff', shade(col, 1.3), col, col, shade(col, 0.75), shade(col, 0.5)], outline: '#000' }));
      if (tt < 5) { ctx.globalAlpha = (5 - tt) / 7; R(ctx, '#ffffff', 0, 0, W, H); ctx.globalAlpha = 1; }
      const ly = 52 + Math.min(2, lines.length) * (sc * 9) + 8;
      if (c.first && c.line) {
        const shown = '"' + c.line.slice(0, Math.max(0, Math.floor((t - 28) * 1.4))) + (t - 28 > c.line.length / 1.4 ? '"' : '');
        if (t > 28) RF.font.wrap(shown, 30).slice(0, 3).forEach((l, i) => T(ctx, l, tx, ly + i * 10, { align, color: '#ffffff', outline: '#000' }));
      }
      const who = c.partner ? f.def.name + ' & ' + c.partner.def.name : f.def.name;
      T(ctx, who.toUpperCase(), tx, H - bar - 14, { align, color: shade(col, 1.2), outline: '#000' });
    }
    // the eyes: one last look before it lands
    if (t >= eyesAt) {
      const et = t - eyesAt, band = Math.round(60 * Math.min(1, et / 4)), top = H / 2 - band / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, band); ctx.clip();
      R(ctx, shade(col, 0.35), 0, top, W, band);
      for (let i = 0; i < 14; i++) R(ctx, i % 2 ? col : '#ffffff', ((i * 61 + et * 34 * dir) % (W + 120) + W + 120) % (W + 120) - 60, top + (i * 13) % band, 70, 1 + (i % 2));
      ctx.imageSmoothingEnabled = false;
      ctx.translate(W / 2 - dir * 8 + dir * et * 0.6, H / 2 + bh * 0.925 * 5); ctx.scale(5, 5);
      f.sprite.draw(ctx, 'idle', 0, 0, 0, dir);
      ctx.restore();
      R(ctx, '#ffffff', 0, top - 1, W, 1); R(ctx, '#ffffff', 0, top + band, W, 1);
      if (et < 4) { ctx.globalAlpha = (4 - et) / 5; R(ctx, '#ffffff', 0, 0, W, H); ctx.globalAlpha = 1; }
    }
    if (t < 3) { ctx.globalAlpha = (3 - t) / 3; R(ctx, '#ffffff', 0, 0, W, H); ctx.globalAlpha = 1; }
    if (len - t <= 5) { ctx.globalAlpha = 1 - (len - t) / 6; R(ctx, '#ffffff', 0, 0, W, H); ctx.globalAlpha = 1; } // out through white
    ctx.restore();
  };
})();
