// ESCUDERO: the photographer. Sassy, fast, and everything he throws is a rainbow. He stands for the LGBTQ
// community, and the pride colours run through his whole kit:
//   attacks   every punch, kick and sweep leaves a ribbon of rainbow behind it, with a camera flash where it lands
//   block     RAINBOW SHIELD: a rainbow arch over him that sparkles when it takes a hit
//   specials  DOWN, FORWARD + LIGHT  Rainbow Ribbon (a rolling rainbow)      + HEAVY  Shutter Burst (four flashes)
//             DOWN, BACK    + LIGHT  Hold That Pose (a counter)              + HEAVY  Sashay Away (a catwalk behind you)
//   signature FULL SPECTRUM: SAY CHEESE, a blinding flash, and a rainbow beam across the stage
//   finisher  PHOTO FINISH: the victim becomes a Polaroid, and then it is torn in half
// (The drawing is a friend's picture, mirrored so he faces his opponent; the grey stripes on his polo are
// painted as a pride stripe.)
(function () {
  const RB = ['#e83034', '#fa8c1e', '#fade32', '#32be54', '#3470e8', '#9048cc'];
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const T = (ctx, text, x, y, color) => RF.font.drawText(ctx, text, x, y, { align: 'center', color, outline: '#000' });
  const lerp = (a, b, u) => a + (b - a) * u, ease = (u) => 1 - (1 - u) * (1 - u);
  const when = (f) => { const m = f.move, t = f.stateTime; return m && t >= m.startup - 3 && t <= m.startup + m.active + 8 ? { m, age: t - (m.startup - 3), life: m.active + 11 } : null; };
  // a four-point camera flash with a rainbow fringe
  const flash = (ctx, x, y, r, a) => {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(x), Math.round(y));
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = RB[i]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r - i * 0.7, 0); ctx.lineTo(r + i * 0.7, 0); ctx.moveTo(0, -r - i * 0.7); ctx.lineTo(0, r + i * 0.7); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.7, 0); ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.7); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
  };

  // ---------------------------------------------------------------- the attacks: ribbons of rainbow
  // path(u, m, cx, cy) -> [forward, height]; six strands, one for each colour, trailing the hand, and a flash where it lands
  const ribbon = (path) => function (f, ctx, floorY) {
    const w = when(f); if (!w) return; const m = w.m, h = m.hitbox, cx = h.x + h.w * 0.78, cy = h.y + h.h / 2;
    const u = Math.min(1, w.age / (m.active + 2)), a = Math.max(0, 1 - w.age / w.life);
    const at = (uu) => { const p = path(Math.max(0, uu), m, cx, cy); return [f.x + f.facing * p[0], floorY - f.y - p[1]]; };
    ctx.save(); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let s = 0; s < 6; s++) {
      ctx.strokeStyle = RB[s]; ctx.globalAlpha = a * 0.9; ctx.beginPath();
      for (let j = 0; j <= 9; j++) { const [x, y] = at(u - (9 - j) * 0.075); j ? ctx.lineTo(x, y + (s - 2.5) * 1.7) : ctx.moveTo(x, y + (s - 2.5) * 1.7); }
      ctx.stroke();
    }
    ctx.restore();
    if (u > 0.7) { const [x, y] = at(1); flash(ctx, x + f.facing * 8, y, 5 + (u - 0.7) * 14, a); }
  };
  Object.assign(RF.MOVE_FX, {
    rbJab: ribbon((u, m, cx, cy) => [lerp(8, cx, ease(u)), cy + 1]),
    rbArc: ribbon((u, m, cx, cy) => { const th = lerp(-2.3, 0.35, ease(u)), rad = cx - 2; return [6 + rad * Math.cos(th), cy + rad * 0.5 * Math.sin(th) + 3]; }),
    rbArch: ribbon((u, m, cx, cy) => { const th = lerp(-0.4, 1.7, ease(u)), rad = 18 + m.hitbox.h * 0.3; return [10 + rad * Math.cos(th) * 0.9, m.hitbox.y * 0.5 + 10 + rad * Math.sin(th) * 1.4]; }),
    rbLow: ribbon((u, m, cx, cy) => [lerp(8, cx, ease(u)), cy]),
    rbDive: ribbon((u, m, cx, cy) => [lerp(-2, cx, ease(u)), lerp(cy + 34, cy, u * u)]),
    rbSweep: ribbon((u, m, cx, cy) => [lerp(-4, cx, ease(u)), cy + (1 - ease(u)) * 10 + 2]),
  });

  // ---------------------------------------------------------------- RAINBOW SHIELD
  const LINES = ['SLAY.', 'NOT TODAY, HUN.', 'HOW RUDE.', 'BORING.'];
  RF.BLOCK_FX.rainbowShield = function (f, ctx, floorY, t) {
    const hurt = f.getHurtbox(); if (!hurt) return;
    const k = f.shieldHit > 0 ? f.shieldHit / 12 : 0, base = floorY - f.y, top = base - hurt.h, grow = Math.min(1, f.stateTime / 5 + (f.state === 'blockstun' ? 1 : 0));
    const r0 = (hurt.h * 0.55 + 4) * (0.6 + 0.4 * grow);
    ctx.save(); ctx.translate(Math.round(f.x + f.facing * 4), Math.round(base - hurt.h * 0.1));
    ctx.lineWidth = 2.4; ctx.lineCap = 'butt';
    for (let s = 0; s < 6; s++) {
      ctx.globalAlpha = (0.42 + k * 0.5) * grow; ctx.strokeStyle = RB[s];
      ctx.beginPath(); ctx.ellipse(0, 0, r0 + s * 2.5 - 2 + k * 2, (r0 + s * 2.5) * 1.05, 0, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();      // the arch
      ctx.beginPath(); ctx.ellipse(0, 0, r0 + s * 2.5 - 2 + k * 2, (r0 + s * 2.5) * 1.05, 0, Math.PI * 0.04, Math.PI * 0.2); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const a = (t / 14 + i * 1.6), sx = f.x + f.facing * (6 + Math.cos(a) * (r0 + 6)), sy = base - hurt.h * 0.45 - Math.abs(Math.sin(a)) * r0 * 0.9; if (Math.sin(t / 3 + i * 2) > 0.3 - k) flash(ctx, sx, sy, 2.5 + k * 3, 0.9); }   // sparkles
    if (k > 0.4) T(ctx, LINES[(f.rbCount = (f.rbCount || 0) + (k > 0.95 ? 1 : 0)) % LINES.length], f.x, top - 22, '#ff7ac8');
  };

  // ---------------------------------------------------------------- projectiles
  RF.PROJECTILE_ART.rainbowWave = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 5; i++) { ctx.globalAlpha = 0.5 - i * 0.08; for (let s = 0; s < 6; s++) R(ctx, RB[s], x - dir * i * 7, y - 8 + s * 3 + Math.sin(t / 3 + i) * 2, 5, 3); }
    ctx.globalAlpha = 1; ctx.lineWidth = 2.6;
    for (let s = 0; s < 6; s++) { ctx.strokeStyle = RB[s]; ctx.beginPath(); ctx.arc(x - dir * 2, y, 15 - s * 2.4, dir > 0 ? -1.35 : Math.PI - 1.35, dir > 0 ? 1.35 : Math.PI + 1.35); ctx.stroke(); }
    ctx.lineWidth = 1; if (t % 6 < 3) flash(ctx, x + dir * 11, y - 6 + (t % 12), 3, 0.9);
  };
  RF.PROJECTILE_ART.flashBulb = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.35 - i * 0.08; flash(ctx, x - dir * i * 7, y, 5, 1); }
    flash(ctx, x, y, 8 + Math.sin(t / 2) * 1.5, 1);
  };

  // ---------------------------------------------------------------- FULL SPECTRUM: SAY CHEESE, flash, a rainbow across the stage
  RF.SPECIAL_KINDS.prism = {
    start(f) { f.vx = 0; f.specialData.hit = false; f.specialData.len = 0; },
    update(f, scene) {
      const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f);
      if (t === 4) scene.effects.spawnText('SAY CHEESE!', f.x, f.body.height + 18, '#ffe27a');
      if (t === s.startup) {
        RF.audio.sfx('super'); scene.flash = Math.max(scene.flash || 0, 7); d.len = s.range;
        const x0 = f.x + f.facing * 14, y = f.y + f.body.height * 0.58, hurt = opp.getHurtbox();
        const box = { x: f.facing > 0 ? x0 : x0 - s.range, y: y - s.thickness / 2, w: s.range, h: s.thickness };
        if (hurt && !opp.isKO && RF.util.rectsOverlap(box, hurt)) {
          d.len = Math.max(10, f.facing > 0 ? hurt.x - x0 + 6 : x0 - (hurt.x + hurt.w) + 6);
          d.hit = scene.applyHit(f, opp, RF.specialMove(f, s), 'heavy', opp.x, y) === 'hit';
          if (d.hit) scene.effects.spawnText('FULL SPECTRUM!', opp.x, opp.body.height + 30, '#ffffff');
        }
      }
      if (t >= s.startup + s.active + s.recovery) f.setState('idle');
    },
    anim(f) { return ['special', f.stateTime < f.special.startup ? 0 : 1]; },
    draw(f, ctx, floorY, frame) {
      const s = f.special, t = f.stateTime, d = f.specialData, hx = f.x + f.facing * 14, hy = floorY - f.y - f.body.height * 0.58;
      if (t < s.startup) { const p = t / s.startup; flash(ctx, hx + f.facing * 6, hy, 3 + p * 10, 0.4 + p * 0.6); return; }       // the flash gathers at the lens
      if (t >= s.startup + s.active) return;
      const a = 1 - Math.max(0, (t - s.startup - s.active * 0.55) / (s.active * 0.45)), len = d.len, grow = Math.min(1, (t - s.startup + 1) / 4);
      ctx.save(); ctx.globalAlpha = a;
      for (let k = 0; k < 6; k++) { const yy = hy + (k - 2.5) * (s.thickness / 6) + Math.sin(frame / 2 + k) * 0.8; ctx.fillStyle = RB[k]; ctx.fillRect(Math.round(Math.min(hx, hx + f.facing * len * grow)), Math.round(yy - s.thickness / 12), Math.round(len * grow), Math.ceil(s.thickness / 6) + 1); }
      ctx.restore(); flash(ctx, hx, hy, 14, a);
      for (let i = 0; i < 6; i++) flash(ctx, hx + f.facing * ((i * 37 + frame * 9) % Math.max(20, len)), hy + Math.sin(i * 3 + frame / 3) * s.thickness * 0.5, 3, a * 0.8);
    },
  };
  RF.SPECIALS.fullSpectrum = {
    name: 'Full Spectrum', description: 'SAY CHEESE. A flash you cannot look away from, then a rainbow right across the stage. Smile, hun.',
    kind: 'prism', startup: 24, active: 14, recovery: 26, range: 175, thickness: 24, damage: 17, hitstun: 32, blockstun: 16, pushback: 8, hitstop: 12, launch: 4.5, launchVx: 2.2, callout: 'FULL SPECTRUM!',
  };

  // ---------------------------------------------------------------- command specials, a throw
  const hit = (dmg, extra = {}) => Object.assign({ damage: dmg, hitstun: 24, blockstun: 12, pushback: 5, hitstop: 7 }, extra);
  Object.assign(RF.COMMANDS, {
    rainbowRibbon: Object.assign({ name: 'Rainbow Ribbon', kind: 'projectile', startup: 11, recovery: 22, speed: 4.8, size: 26, height: 0.52, art: 'rainbowWave', sound: 'whoosh', hitText: 'SLAY!', color: '#ff7ac8', colors: ['#ffffff', '#fade32', '#e83034'] }, hit(11, { hitstun: 26, blockstun: 14, pushback: 6, hitstop: 9 })),
    shutterBurst: Object.assign({ name: 'Shutter Burst', kind: 'volley', startup: 10, interval: 5, recovery: 18, heights: [0.78, 0.56, 0.36, 0.56], speed: 6.5, size: 16, art: 'flashBulb', sound: 'zap', color: '#ffe27a', colors: ['#ffffff', '#ffe27a', '#fa8c1e'] }, hit(4, { hitstun: 16, blockstun: 9, pushback: 2.5, hitstop: 4 })),
    holdThatPose: Object.assign({ name: 'Hold That Pose', kind: 'counter', startup: 2, window: 26, recovery: 16, color: '#ff7ac8', callout: 'HOLD THAT POSE.' }, hit(12, { launch: 4 })),
    sashayAway: Object.assign({ name: 'Sashay Away', kind: 'teleport', startup: 8, behind: true, strikeDelay: 4, reach: 20, recovery: 14, color: '#ffb0e0', callout: 'SASHAY AWAY.', sound: 'arcane' }, hit(10)),
  });
  RF.THROWS.photoOp = { name: 'Photo Op', description: 'Spins them into a pose, lifts them for the shot and slams the shutter. Chin down, darling.', kind: 'overhead', damage: 14 };

  // ---------------------------------------------------------------- PHOTO FINISH: the victim becomes a Polaroid, and it is torn in half
  const polaroid = (ctx, x, bottom, vic, alpha) => {
    const w = 46, h = 62, l = Math.round(x - w / 2), top = bottom - h;
    ctx.save(); ctx.globalAlpha = alpha;
    R(ctx, '#111', l - 2, top - 2, w + 4, h + 4, 0); R(ctx, '#f4f0e6', l, top, w, h); R(ctx, '#d8d2c4', l, top + h - 3, w, 3);
    R(ctx, '#2a2a34', l + 3, top + 3, w - 6, h - 20);
    for (let i = 0; i < 6; i++) R(ctx, RB[i], l + 3 + i * 7, top + h - 14, 7, 3);                       // the rainbow strip under the picture
    ctx.save(); ctx.beginPath(); ctx.rect(l + 3, top + 3, w - 6, h - 20); ctx.clip();
    ctx.translate(x, top + h - 18); ctx.scale(0.5, 0.5); vic.sprite.draw(ctx, 'hit', 0, 0, 0, vic.facing); ctx.restore();
    ctx.restore();
  };
  RF.FINISHERS.photoFinish = {
    name: 'Photo Finish',
    duration: 210,
    update(att, vic, t, scene) {
      att.finisherAnim = t < 20 ? ['taunt', 0] : t < 130 ? ['special', 1] : ['victory', (t >> 3) % 2];
      if (t === 6) scene.effects.spawnText('SAY CHEESE.', att.x, att.body.height + 24, '#ffe27a');
      if (t === 30) { RF.audio.sfx('super'); scene.flash = 10; scene.shake = 6; }
      if (t === 80) scene.effects.spawnText('PERFECT LIGHT.', att.x, att.body.height + 34, '#ff7ac8');
      if (t === 130) { RF.audio.sfx('paper'); RF.audio.sfx('heavy'); scene.shake = 14; scene.flash = 4; }
      if (t === 150) scene.effects.spawnText('AND THAT IS A WRAP.', att.x, att.body.height + 26, '#ffffff');
      if (t === 175) RF.audio.sfx('applause');
    },
    drawVictim(vic, ctx, floorY, t, frame) {
      if (t < 30) return vic.sprite.draw(ctx, 'dazed', 0, vic.x, floorY, vic.facing);
      if (t < 130) {
        if (t < 52) { ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (t - 30) / 22)})`; ctx.fillRect(Math.round(vic.x - 60), 0, 120, Math.round(floorY)); }
        return polaroid(ctx, vic.x, floorY - 6 + Math.sin(t / 10) * 1.5, vic, 1);
      }
      const u = Math.min(1, (t - 130) / 30);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(vic.x + side * u * 14, floorY - 6 + u * 4); ctx.rotate(side * u * 0.5); ctx.translate(-vic.x, -(floorY - 6));
        ctx.beginPath(); ctx.rect(side < 0 ? vic.x - 60 : vic.x, -400, 60, 800); ctx.clip();
        polaroid(ctx, vic.x, floorY - 6, vic, 1 - Math.max(0, (t - 170) / 40) * 0.6);
        ctx.restore();
      }
    },
  };

  // ---------------------------------------------------------------- the fighter
  const DEF = {
    id: 'escudero',
    name: 'Escudero',
    archetype: 'photographer',
    health: 118,
    origin: 'The Photo Studio / Pride Parade',
    bio: 'Photographer, and the loudest, proudest, best-dressed person in any room. Has never missed a shot or a chance to be fabulous. Will make you smile, then make you regret it. Everything he throws is a rainbow.',
    quote: 'LOVE WINS. I WIN MORE.',
    winQuote: 'AND THAT IS A WRAP.',
    special: 'fullSpectrum',
    throw: 'photoOp',
    finisher: 'photoFinish',
    intro: 'walk',
    brutality: { name: 'DEVELOPED', color: '#ff5aa8' },
    blockFx: 'rainbowShield',
    ending: [
      'ESCUDERO WON TERRAMANIA.',
      'HE PHOTOGRAPHED THE WHOLE PARADE.',
      'EVERY FRAME CAME OUT A RAINBOW.',
      'THE BELT LOOKED FABULOUS ON HIM.',
      'LOVE WINS. SO DID HE.',
    ],
    tauntLines: [
      'SMILE. IT IS YOUR LAST PHOTO.',
      'DARLING, THAT WAS A BLUR.',
      'THE LIGHT IS PERFECT. YOU ARE NOT.',
      'SERVING LOOKS AND KNOCKOUTS.',
      'GIVE ME YOUR BEST ANGLE. OH. YOU DO NOT HAVE ONE.',
      'HOLD STILL. THIS WON\'T HURT. (IT WILL.)',
      'EVERY COLOUR OF THE RAINBOW. NONE OF THEM YOUR SIZE.',
      'I DO NOT DO RETAKES.',
      'LOVE WINS. IT IS RIGHT THERE IN THE CAPTION.',
    ],
    rivalQuote: { loor: 'CHRIS. GLOVES UP. NOW, YOUR GOOD SIDE.', erick: 'ERICK. A MOVIE THEATER. A PHOTOGRAPHER. WE ARE BOTH IN THE BUSINESS OF DRAMA.' },
    stats: {
      walkSpeed: 3.1,
      jumpPower: 9.6,
      damage: 1.0,
      damageReduction: 0.04,
      attackSpeed: 1.12,
    },
    moves: {   // a rainbow ribbon on every attack (above)
      light: { fx: 'rbJab', fxSound: 'whoosh', startup: 4, active: 3, recovery: 8, damage: 4, pushback: 3, hitbox: { x: 12, y: 52, w: 40, h: 14 } },
      heavy: { fx: 'rbArc', fxSound: 'whoosh', startup: 10, active: 5, recovery: 17, damage: 13, hitstun: 26, blockstun: 14, pushback: 7, knockback: 11, hitstop: 10, hitbox: { x: 8, y: 46, w: 52, h: 26 } },
      airLight: { fx: 'rbJab', fxSound: 'whoosh', startup: 4, active: 6, recovery: 6, damage: 4, hitbox: { x: 6, y: 14, w: 36, h: 26 } },
      airHeavy: { fx: 'rbDive', fxSound: 'whoosh', startup: 8, active: 7, recovery: 11, damage: 11, knockback: 8, hitstop: 8, hitbox: { x: 4, y: -6, w: 44, h: 48 } },
      launcher: { fx: 'rbArch', fxSound: 'whoosh', startup: 8, active: 5, recovery: 20, damage: 9, hitbox: { x: 6, y: 30, w: 38, h: 70 } },
      lowLight: { fx: 'rbLow', fxSound: 'whoosh', startup: 4, active: 3, recovery: 8, damage: 3, hitbox: { x: 10, y: 28, w: 44, h: 22 } },
      lowHeavy: { fx: 'rbSweep', fxSound: 'whoosh', startup: 10, active: 5, recovery: 20, damage: 10, hitbox: { x: 6, y: 0, w: 62, h: 14 } },
    },
    body: { scale: 1.0, bulk: 1.1, width: 32, height: 88, crouchHeight: 0.7 },
    idleFrames: 2,
    idleRate: 12,
    sprite: {
      type: 'pixel',
      scale: 1,
      limbScale: 4,
      crouchSquash: true,
      shoulder: [38, 19],
      footCol: 27,
      crouchDrop: 11,
      armThickness: 1.9,
      sleeveLength: 0.3,
      sleeveColor: 'coll',
      sleeveShade: 0,
      armBehind: true,
      handColor: 'col3',
      legColor: 'pantsk',
      footColor: 'shoesp',
      hideWhenPosed: ['proparm0', 'proparm1', 'proparm2', 'proparm3', 'proparm4', 'proparm5', 'proparm8', 'proparma', 'proparmd', 'proparme', 'proparmg', 'proparmk', 'proparml', 'proparmo', 'proparmp', 'proparmq'],      // the front fist becomes the punching arm
      legend: { 'A': 'colp', 'B': 'col1', 'C': 'col0', 'D': 'col2', 'E': 'col5', 'F': 'col3', 'G': 'colg', 'H': 'col4', 'I': 'cole', 'J': 'cold', 'K': 'col8', 'L': 'colh', 'M': 'colr', 'N': 'colk', 'O': 'cola', 'P': 'colj', 'Q': 'coll', 'R': 'colq', 'S': 'col9', 'T': 'colo', 'U': 'proparm0', 'V': 'proparm5', 'W': 'proparm3', 'X': 'proparm4', 'Y': 'proparml', 'Z': 'proparmg', 'a': 'proparme', 'b': 'colm', 'c': 'coln', 'd': 'proparmq', 'e': 'proparm2', 'f': 'proparma', 'g': 'proparmk', 'h': 'proparm1', 'i': 'proparmp', 'j': 'proparmo', 'k': 'proparmd', 'l': 'cols', 'm': 'colt', 'n': 'colu', 'o': 'colv', 'p': 'colw', 'q': 'colx', 'r': 'proparm8', 's': 'pantse', 't': 'pantsq', 'u': 'pantsg', 'v': 'pantsp', 'w': 'pantsa', 'x': 'pantsj', 'y': 'pantso', 'z': 'pantsr', '0': 'pantsk', '1': 'pantsn', '2': 'pantsm', '3': 'pants9', '4': 'pantsl', '5': 'pantsd', '6': 'shoesk', '7': 'shoesq', '8': 'shoesp', '9': 'shoesa', '!': 'shoesg', '@': 'shoeso', '#': 'shoesr', '$': 'shoesl', '%': 'shoese', '^': 'shoesj', '&': 'shoes8', '*': 'shoesd', '+': 'shoesh' },
      palette: {
        col0: '#7f4e33',
        col1: '#5b3120',
        col2: '#9f5e3a',
        col3: '#db834e',
        col4: '#e49360',
        col5: '#bc7247',
        col8: '#a79586',
        col9: '#070605',
        cola: '#130f0e',
        cold: '#76675b',
        cole: '#50443d',
        colg: '#3c332f',
        colh: '#8b7f75',
        colj: '#0f0c0a',
        colk: '#2d2524',
        coll: '#60544e',
        colm: '#0b0908',
        coln: '#030201',
        colo: '#1c1716',
        colp: '#27201f',
        colq: '#201b19',
        colr: '#171312',
        cols: '#e82834',
        colt: '#fa8c1e',
        colu: '#fade32',
        colv: '#32be54',
        colw: '#3470e8',
        colx: '#9048cc',
        pants9: '#070605',
        pantsa: '#130f0e',
        pantsd: '#76675b',
        pantse: '#50443d',
        pantsg: '#3c332f',
        pantsj: '#0f0c0a',
        pantsk: '#2d2524',
        pantsl: '#60544e',
        pantsm: '#0b0908',
        pantsn: '#030201',
        pantso: '#1c1716',
        pantsp: '#27201f',
        pantsq: '#201b19',
        pantsr: '#171312',
        proparm0: '#7f4e33',
        proparm1: '#5b3120',
        proparm2: '#9f5e3a',
        proparm3: '#db834e',
        proparm4: '#e49360',
        proparm5: '#bc7247',
        proparm8: '#a79586',
        proparma: '#130f0e',
        proparmd: '#76675b',
        proparme: '#50443d',
        proparmg: '#3c332f',
        proparmk: '#2d2524',
        proparml: '#60544e',
        proparmo: '#1c1716',
        proparmp: '#27201f',
        proparmq: '#201b19',
        shoes8: '#a79586',
        shoesa: '#130f0e',
        shoesd: '#76675b',
        shoese: '#50443d',
        shoesg: '#3c332f',
        shoesh: '#8b7f75',
        shoesj: '#0f0c0a',
        shoesk: '#2d2524',
        shoesl: '#60544e',
        shoeso: '#1c1716',
        shoesp: '#27201f',
        shoesq: '#201b19',
        shoesr: '#171312',
      },
      grid: [
        '..........................ABCCD.......................',
        '.........................CEFFFDC......................',
        '........................DFFFFFFDG.....................',
        '.......................CEFHHHHFEGI....................',
        '.......................EFHHHHHFFJJ....................',
        '.......................EFHHHHFFEKL....................',
        '......................ABHHHHHFFJKL....................',
        '.....................MBABFEEDFFJK.....................',
        '......................DCBGBACBEICE....................',
        '......................DDDEEDDNDCDD....................',
        '......................EDHFCDDFFFD.....................',
        '......................DDCDFEHFFDE.....................',
        '.....................ODBEEEEEFEE......................',
        '....................IPBDDFFFFFC.......................',
        '..................QGROAFHFFECDPI......................',
        '................QIRMRMOCDEBCEDSGMNI...................',
        '..............QQGTTORRRRCBDFHBTUVVGGIQ................',
        '.............GTRRRTTMRRRBECFDBCVWWXTRNY...............',
        '............IRRTRRRRORRRRCFFDNDVXWWJTTZa..............',
        '...........QARTTRIIAMTbcbRCFBRDVVWWXROdY..............',
        '...........IRRTMNFFEHATMOcOBPbSeeWWWVPfg..............',
        '...........NTRbOFEFFHGRRTRPMMTSPhUWWXVfia.............',
        '..........IARbMBFEFHEERRRRRGMTPSSPUeWXajZ.............',
        '..........ObPAOHFEHEECRRRRRRRRTPSSPUeVXUjY............',
        '..........GTRJFFFFDEBTRBRRTRATRRTbbhVVWXkZa...........',
        '.........GOMLLEFFFBNTRNBRRRMRTRRRMb.eWWWXXa...........',
        '........INRALJFEDD.PTRRBRRROTAGIQJJ.UVWWWXX...........',
        '........GRIHCQQQI.GlllmmnnooQpQQQQQ.heWWWWWX..........',
        '........DHHFFCIG..IlllmmnnoooppqqQI.hVWWWWWWr.........',
        '.......HFFFFFFEP.RQQlQQQQQoooppqqIG..eVWVWWe..........',
        '.......HFFFFFFD.O.OOOMMRRMRRMMRRPM....eVWVWW..........',
        '.......FEFFFFED.Nb.PTOMMTRTPORTMMAO...VeeeWX..........',
        '.......DFFFEFE..ITbbbTRRTPPTROTRRPG....eeUVV..........',
        '.......HFFDEDD...NcOMOMMMTRTORRMPRI......Ue...........',
        '........DECD.....NbcMTRRRRTTRRTORG....................',
        '........DD.......TOPSORRRRRRRTTRRAG...................',
        '................ITbMMPPTRRRRRRROPMQ...................',
        '................GMbbMTRTRRRTRTPbMGQ...................',
        '................GTTTMOOPPOTTTTRRRRN...................',
        '.................MPOTMOMRRRMMOOMOOI...................',
        '................QOPO.OMMO...P.PObNI...................',
        '................GObTTROMNNINIMOAOMNI..................',
        '...............stuvwwtxwyzv0szyytt0uu.................',
        '...............t0000ytvtwussvttvv00ty0................',
        '..............syyttv0vttzzvyxvv00tx12v................',
        '..............uv332wzv0v0vvt0000wxt00s4...............',
        '..............4u000t22zv0v0000twt0000s4...............',
        '.............4uttttv0txwztvvtzt000000vus..............',
        '.............4000000000vwzzzy0ywt000000u5.............',
        '............4s0vv00vyzytvvzzy3z000000t00u4............',
        '............u000v00000vywxwwxywwzztv00wtzv............',
        '...........5000w000000twwyzwzytvv00000tv0v4...........',
        '...........zwwyt000vytv0vw...wt00000000w0s04..........',
        '...........000t00000000txw...x..y000000vy0vs..........',
        '..........4v00z0000000y2z.....wwx2zv0000z000s.........',
        '..........0v0vv000000wxzy.....tzzvtyt000vy0s4.........',
        '..........t00y00000vwyyt.......vzzv000000z0v0.........',
        '.........4t00w0000vt0vy0........vwwy00000vvyt.........',
        '.........utt0t000000vyu..........vx3wt000000s.........',
        '.........txwt0000000zu............vw3xzv0000us........',
        '..........v0000000vzt.............0zw2xzv0000s4.......',
        '.........uu000000twyu..............0yyxwy00vvvs.......',
        '.........400000vyxwvs...............yttwvvtvvzu.......',
        '........40v0vvvvx2t0.................zzzvyyyv0u.......',
        '........utvvvttv2wz0..................zvvwyzy0s.......',
        '........u00y0yyvwz....................s0ywyyzv4.......',
        '........s0tzvzz0z0....................40zxtvwz05......',
        '.......4svwt0wz0u.....................szx2tvwwvs......',
        '.......40zwv0ww04......................tx2vvyxwv4.....',
        '.......utwwvvxwv4.......................xwvvvxxy4.....',
        '......4vzwz0vxwv4.......................t0vv0z2w......',
        '......uywwtvv2wts.......................tu0v00xw......',
        '.....stwwzvvv3wt........................40zzy0uus.....',
        '.....4w2wvvv03w.........................syx13wvu44....',
        '......w200vvu3v.........................0wxxx33t0s....',
        '......wu00vvuz...........................vtzwy0t3.....',
        '.....ss000vv0v...........................0xyvvywv4....',
        '....4s0vyx2z04...........................svvy3wzyu....',
        '....uw13zxx3zs............................ywxyvv04....',
        '....0vtw2vyzz0............................uwzt.tvu....',
        '....678887897.............................!..9@#@6....',
        '....$8788@#6%.............................%9^9877@%...',
        '.....78#.8#7..............................%^#7788#6%..',
        '....6@9@#.#%..............................&*%9@7786%*.',
        '....67#8@9#...............................$+**97@778!$',
        '...!8988@9!..................................$*9#7688!',
        '..$677667@6...................................*&*%%866',
        '.+$!88879%+.....................................%%778.',
        '*686878^*+&...........................................',
        '!!6@7#9*$!............................................',
        '!866%*&+..............................................',
        '.7778$%...............................................',
      ],
      poses: {
        idle: [{}, { head: [0, -1], torso: [0, -1] }],
        block: [{ head: [-2, 2], torso: [-1, 1] }],
        crouchBlock: [{ crouch: true, head: [-2, 1], torso: [-1, 0] }],
        light: [{ arm: 'forwardShort', head: [1, 0] }, { arm: 'forward', head: [2, 0], torso: [1, 0] }, { arm: 'forwardShort', head: [1, 0] }],
        heavy: [{ arm: 'back', head: [-2, 0], torso: [-2, 0] }, { arm: 'forward', head: [3, 1], torso: [3, 1] }, { arm: 'forwardShort', head: [1, 0], torso: [1, 0] }],
        special: [{ arm: 'back', head: [-2, 1], torso: [-1, 1] }, { arm: 'forward', head: [2, 0], torso: [2, 0] }, { arm: 'forwardShort', head: [1, 0] }],
      },
    },
  };
  RF.CHARACTERS.push(DEF);
  Object.assign(DEF, { commands: { qcf: 'rainbowRibbon', qcb: 'holdThatPose' }, commandsHeavy: { qcf: 'shutterBurst', qcb: 'sashayAway' }, taunt: 'STRIKE A POSE.', voicePitch: 1.15 });
})();
