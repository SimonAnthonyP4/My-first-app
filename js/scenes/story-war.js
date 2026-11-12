// STORY MODE: what the war needs.
//   { die: key }            they fall and do not get up; light rises off them
//   { crownify: key }       the Headmaster's crown comes down on them (their colours drain)
//   { restore: key }        the crown breaks / the face comes back: they are themselves again
//                           (+ costume: n, name: 'T.J.' for someone we have only ever seen without a face)
//   { restoreAll: true }    every one of the Forgotten in the scene gets their face back
//   { brawl: { ..., look: 'crown' | 'emperor' | 'forgotten' | 'plain' | 'rift',     who you fight
//              partner, vsPartner,                                                  a TAG fight (2 v 2)
//              survive: seconds } }                                                 he cannot be hurt: last the clock
//   inserts: 'army' (the horde, the throne above it), 'portals' (every class arriving),
//            'card2016' (what was in the desk for twelve years), 'memorial' (the names)
// Loaded after story-fights.js.
(function () {
  const K = RF.storyKit, P = RF.StoryScene.prototype, T = K.T, R = K.R, INS = K.INSERTS, W = 384, H = 224;
  const amb = K.amb;

  // how the three sound (the Headmaster keeps Lopez Tuero's voice)
  Object.assign(RF.VOICES, {
    proctor: { g: 'f', lang: 'en-GB', pitch: 0.5, rate: 0.7 },    // every syllable on the second
    ringer: { g: 'm', lang: 'en-GB', pitch: 0.1, rate: 0.6 },     // from somewhere under the floor
    eraser: { g: 'f', lang: 'en-US', pitch: 1.5, rate: 0.62 },    // a whisper, too close
  });

  const instantExtra = P.instantExtra;
  P.instantExtra = function (s) {
    if (s.die) {
      const a = this.actor(s.die);
      if (a) {
        a.anim = 'ko'; a.at = this.t; a.dead = true; a.talk = false; a.trembleT = 0;
        for (let i = 0; i < 30; i++) this.shards.push({ x: a.x + (Math.random() - 0.5) * 34, y: 2 + Math.random() * 18, vx: (Math.random() - 0.5) * 0.3, vy: 0.4 + Math.random() * 0.8, c: i % 3 ? '#ffe9b0' : '#ffffff', life: 90 + Math.random() * 80, float: true });
      }
      return true;
    }
    if (s.crownify || s.restore) {
      const a = this.actor(s.crownify || s.restore);
      if (a) {
        let base = RF.getCharacter(a.def.id) || a.def;
        if (s.costume && base.sprite.palette) base = RF.costume(base, s.costume);                     // (a face you have not seen before)
        if (s.name) base = Object.assign({}, base, { name: s.name });
        a.def = s.crownify ? RF.crownDef(base) : base; a.sprite = RF.createSprite(a.def); a.rift = false; a.hitT = 8;
        this.flash = 6; RF.audio.sfx(s.crownify ? 'arcane' : 'crack');
        for (let i = 0; i < 18; i++) this.shards.push({ x: a.x + (Math.random() - 0.5) * 14, y: base.body.height + Math.random() * 8, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 3, c: s.crownify ? '#b070ff' : i % 2 ? '#17131f' : '#5a4a72', life: 40 + Math.random() * 30 });
      }
      return true;
    }
    if (s.restoreAll) {
      let n = 0;   // they are not the heroes they were drawn from: each gets colours of their own
      for (const a of Object.values(this.actors)) if (a.def.forgotten) { let base = RF.getCharacter(a.def.id); if (base) { if (base.sprite.palette) base = RF.costume(base, 'alt' + (1 + (n++ % 3))); a.def = Object.assign({}, base, { name: 'A STUDENT' }); a.sprite = RF.createSprite(a.def); a.hitT = 6 + Math.floor(Math.random() * 6); } }
      this.flash = 10; RF.audio.sfx('perfect');
      return true;
    }
    return instantExtra ? instantExtra.call(this, s) : false;
  };

  // ---- fights: who is on the other side, tag teams, and the fight that cannot be won ----
  const LOOKS = { rift: (d) => RF.riftDef(d), crown: (d) => RF.crownDef(d), emperor: (d) => RF.emperorDef(d), forgotten: (d) => RF.forgottenDef(d), plain: (d) => Object.assign({}, d) };
  P.startBrawl = function (f) {
    const hero = this.resolve(f.play) || RF.STORY.heroes[0];
    const dress = (id, look) => (LOOKS[look] || LOOKS.rift)(RF.getCharacter(this.resolve(id)));
    const p1 = RF.getCharacter(hero), p2 = dress(f.vs, f.plain ? 'plain' : f.look);
    if (f.name) p2.name = f.name;
    this.paused = { score: RF.storyScore && RF.storyScore.current, amb: amb.last };
    const tally = K.run.tally || { perfect: 0, good: 0 };
    K.leaveStory();
    const tag = f.partner ? { p1b: RF.getCharacter(this.resolve(f.partner)), p2b: dress(f.vsPartner || f.vs, f.look2 || (f.plain ? 'plain' : f.look)), costumes: [0, 0] } : undefined;
    this.game.setScene(new RF.VersusScene(this.game, {
      p1, p2, p2Alt: p1.id === p2.id && !p2.costume, stage: f.stage || (this.bgDef && this.bgDef.id) || 'court', cpu: true, cpuLevel: f.cpu || 'normal', boss: f.boss || 0,
      roundsToWin: f.rounds || 1, tag,
      story: { index: this.index, mid: f.mid, hero: this.hero || hero, resume: this, survive: f.survive || 0, meter: Math.min(RF.CONFIG.SUPER_MAX, tally.perfect * 60 + tally.good * 25) },
    }));
  };
  // the chapter's own fight can be dressed too ({ fight: { ..., look: 'emperor' } })
  const startFight = P.startFight;
  P.startFight = function () {
    const f = this.ch.fight;
    if (!f.look) return startFight.call(this);
    const hero = this.resolve(f.play) || RF.STORY.heroes[0], p2 = (LOOKS[f.look] || LOOKS.rift)(RF.getCharacter(f.vs));
    if (f.name) p2.name = f.name;
    const tally = K.run.tally || { perfect: 0, good: 0 };
    this.game.setScene(new RF.VersusScene(this.game, {
      p1: RF.getCharacter(hero), p2, stage: f.stage, cpu: true, cpuLevel: f.cpu || 'normal', boss: f.boss || 0,
      story: { index: this.index, mid: f.mid, hero: this.hero || hero, meter: Math.min(RF.CONFIG.SUPER_MAX, tally.perfect * 60 + tally.good * 25) },
    }));
  };
  const tick = RF.storyTick;
  RF.storyTick = function (scene) {
    tick(scene);
    const st = scene.opts.story;
    if (!st.survive) return;
    const me = scene.fighters[0], foe = scene.fighters[1];
    if (scene.phase === 'fight') {
      if (!scene.surviveOn) { scene.surviveOn = true; scene.timer = st.survive * RF.CONFIG.FPS; scene.effects.spawnText('YOU CANNOT WIN. SURVIVE.', RF.CONFIG.WIDTH / 2, 150, '#ff4040'); }
      if (foe.health < foe.maxHealth) { foe.health = foe.maxHealth; if (scene.frame % 40 === 0) scene.effects.spawnText('NOTHING.', foe.x, foe.body.height + 16, '#b070ff'); }
    } else if (scene.surviveOn && scene.phase !== 'intro' && scene.phase !== 'entrance') {   // time ran out, or you went down: either way the scene carries on
      if ((scene.surviveEnd = (scene.surviveEnd || 0) + 1) < 70) return;                     // (after a beat: let the last hit land)
      st.resume.state.survived = me.health > 0 && !me.isKO;
      scene.game.setScene(st.resume); st.resume.afterBrawl();
    }
  };

  // ---------------------------------------------------------------- inserts
  // the horde on the field, and the throne hanging over it
  INS.army = function (ctx, t, o) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05020c'); g.addColorStop(0.55, '#2a0a3a'); g.addColorStop(1, '#0a0412'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(176,112,255,0.2)'; ctx.beginPath(); ctx.ellipse(W / 2, 62, 150 + Math.sin(t / 30) * 6, 40, 0, 0, Math.PI * 2); ctx.fill();       // the sky, torn
    // the throne, floating, and the one who sits on it
    const ty = 44 + Math.sin(t / 40) * 2;
    R(ctx, '#05030a', W / 2 - 14, ty - 26, 28, 44); for (const [dx, h] of [[-12, 10], [-6, 18], [0, 26], [6, 18], [12, 10]]) { ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(W / 2 + dx - 3, ty - 26); ctx.lineTo(W / 2 + dx, ty - 26 - h); ctx.lineTo(W / 2 + dx + 3, ty - 26); ctx.fill(); }
    R(ctx, '#4a0e1c', W / 2 - 9, ty - 4, 18, 14); R(ctx, '#0a0612', W / 2 - 4, ty - 16, 8, 14); R(ctx, '#b8b0c8', W / 2 - 2, ty - 21, 4, 5); R(ctx, '#ff2a3c', W / 2 - 1, ty - 24, 2, 2);
    // ranks of the Forgotten, to the horizon
    for (let row = 0; row < 9; row++) {
      const y = 96 + row * 13, k = 0.5 + row * 0.16, n = 30 - row * 2;
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) / n) * (W + 40) - 20 + ((row % 2) * 6), bob = Math.sin(t / 12 + i * 0.7 + row) * (row > 5 ? 1 : 0.5);
        ctx.fillStyle = row > 6 ? '#0c0a14' : '#14111f'; ctx.fillRect(Math.round(x - 3 * k), Math.round(y - 16 * k + bob), Math.ceil(6 * k), Math.ceil(16 * k));
        ctx.fillRect(Math.round(x - 2 * k), Math.round(y - 22 * k + bob), Math.ceil(4 * k), Math.ceil(6 * k));
        ctx.fillStyle = row > 6 ? '#4a4860' : '#6a6880'; ctx.fillRect(Math.round(x - 1 * k), Math.round(y - 20 * k + bob), Math.max(1, Math.round(2.4 * k)), Math.max(1, Math.round(3 * k)));   // where a face was
      }
    }
    // the three who walk in front
    const big = (x, w, h, head) => { ctx.fillStyle = '#05030a'; ctx.fillRect(x - w / 2, 150 - h, w, h + 40); head(x, 150 - h); };
    big(96, 20, 62, (x, y) => { ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(x, y - 6, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.arc(x, y - 6, 8, 0, Math.PI * 2); ctx.fill(); R(ctx, '#05030a', x, y - 12, 1, 6); });
    big(192, 44, 58, (x, y) => { ctx.fillStyle = '#8a5a18'; ctx.beginPath(); ctx.moveTo(x - 6, y - 22); ctx.lineTo(x + 6, y - 22); ctx.lineTo(x + 14, y + 2); ctx.lineTo(x - 14, y + 2); ctx.fill(); R(ctx, '#ff3c32', x - 5, y + 4, 2, 2); R(ctx, '#ff3c32', x + 3, y + 4, 2, 2); });
    big(288, 18, 56, (x, y) => { ctx.fillStyle = '#d8d4c8'; ctx.beginPath(); ctx.arc(x, y - 6, 9, 0, Math.PI * 2); ctx.fill(); R(ctx, '#140c10', x - 5, y - 4, 10, 3); });
    if (o.text) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 172, W, 22); T(ctx, o.text, W / 2, 178, { align: 'center', color: '#e0b0ff', outline: '#000' }); }
  };

  // rifts opening all along the field, and someone walking out of each
  INS.portals = function (ctx, t, o) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#02030a'); g.addColorStop(1, '#141a2e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    R(ctx, '#0c1410', 0, 168, W, 56);
    const ids = (o.ids || RF.CHARACTERS.map((c) => c.id)).filter((id) => RF.getCharacter(id));
    const n = Math.min(ids.length, o.n || 14);
    for (let i = 0; i < n; i++) {
      const row = i % 2, x = 26 + (i * 0.5 + row * 0.25) * (W - 52) / (n / 2), y = 150 + row * 30, open = Math.max(0, Math.min(1, (t - i * 10) / 26)), k = 0.55 + row * 0.25;
      if (open <= 0) continue;
      const rx = 15 * k * open, ry = 40 * k * open;
      ctx.fillStyle = 'rgba(255,220,130,0.16)'; ctx.beginPath(); ctx.ellipse(x, y, rx * 2.2, 6 * k, 0, 0, Math.PI * 2); ctx.fill();
      const gg = ctx.createRadialGradient(x, y - ry, 1, x, y - ry, Math.max(2, ry)); gg.addColorStop(0, '#fff6d0'); gg.addColorStop(0.6, '#ffc040'); gg.addColorStop(1, 'rgba(255,150,30,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, y - ry, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffe9b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - ry, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      if (open > 0.7) { // they step out of the light
        const d = RF.getCharacter(ids[i]), step = Math.min(1, (t - i * 10 - 20) / 40);
        ctx.save(); ctx.translate(x + step * 4, y + 1); ctx.scale(k * 0.8, k * 0.8); RF.createSprite(d).draw(ctx, step < 1 ? 'walk' : 'idle', (t / 6) % 4, 0, 0, 1, step < 0.5 ? '#1a1206' : null); ctx.restore();
      }
    }
    if (o.text) T(ctx, o.text, W / 2, 38, { scale: 2, align: 'center', color: K.T === T ? ['#ffffff', '#fff6b0', '#ffd040'] : '#ffd040', outline: '#201000' });
  };

  // the card that sat in a desk drawer for twelve years
  INS.card2016 = function (ctx, t) {
    R(ctx, '#1a120c', 0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2 + 2); ctx.rotate(-0.03 + Math.sin(t / 60) * 0.004);
    R(ctx, '#0a0604', -124, -84, 252, 172); R(ctx, '#f2e8cc', -128, -88, 252, 172); R(ctx, '#e0d4b0', -128, -88, 252, 6); R(ctx, '#d8c8a0', -2, -88, 2, 172);            // the fold
    const ink = '#1a2a6a', L = (s, x, y, c) => T(ctx, s, x, y, { color: c || ink });
    L('MR. LOPEZ -', -118, -72);
    L('WE CAME BACK TO SAY', -118, -56); L('THANK YOU.', -118, -46);
    L('YOU WERE NOT IN YOUR', -118, -30); L('ROOM. WE WAITED UNTIL', -118, -20); L('THE JANITOR LOCKED UP.', -118, -10);
    L('WE WILL COME BACK', -118, 8); L('AGAIN.', -118, 18);
    L('NOBODY EVER WAITED', 8, -72, '#6a1a1a'); L('FOR US. YOU DID.', 8, -62, '#6a1a1a');
    L('- YOUR FIRST CLASS', 8, -40); L('SEPTEMBER 2016', 8, -30, '#6a5a3a');
    ['DANI', 'MARCUS', 'PRIYA', 'T.J.'].forEach((n, i) => { ctx.save(); ctx.translate(14 + (i % 2) * 58, 2 + Math.floor(i / 2) * 22); ctx.rotate(-0.12 + i * 0.08); L(n, 0, 0, ['#1a2a6a', '#0a5a2a', '#6a1a4a', '#1a1a1a'][i]); ctx.restore(); });
    L('YOU + US = PASSED', 8, 54, '#6a1a1a'); R(ctx, '#6a1a1a', 8, 64, 102, 1);
    ctx.restore();
  };

  // the names, one at a time
  INS.memorial = function (ctx, t, o) {
    R(ctx, '#030208', 0, 0, W, H);
    const names = o.names || [];
    T(ctx, o.text || 'THEY HELD THE LINE', W / 2, 38, { align: 'center', color: '#8a7a78', outline: '#000' });
    names.forEach(([n, line], i) => {
      const a = Math.max(0, Math.min(1, (t - 20 - i * 46) / 30)); if (a <= 0) return;
      const y = 54 + i * 27; ctx.globalAlpha = a;
      for (const fx of [W / 2 - 110, W / 2 + 104]) { R(ctx, '#e8dcc0', fx, y + 2, 3, 10); ctx.fillStyle = (t >> 2) % 2 ? '#ffd040' : '#ff9a20'; ctx.fillRect(fx, y - 3 + ((t + i * 5) >> 3) % 2, 3, 5); }   // a candle either side
      T(ctx, n, W / 2, y, { scale: 2, align: 'center', color: '#ffffff', outline: '#000' });
      T(ctx, line, W / 2, y + 16, { align: 'center', color: '#c8b0a0', outline: '#000' });
      ctx.globalAlpha = 1;
    });
  };

  if (RF.STORY.migrate) RF.STORY.migrate();   // an older save: move it to the new chapter order (config/story-9.js)
})();
