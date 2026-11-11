// THE RIFT TOWER: a boss rush. Ten floors of rift versions of the cast, one round each, and
// every floor changes the rules. Your health carries over (30% patched up after each win);
// lose and you retry the floor. The top floor is OMEGA LOPEZ, who gets back up once.
// Clearing the tower unlocks the RIFT costume for every fighter (HEAVY on character select).
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224, KEY = 'terramania-tower';
  const PURPLE = ['#ffffff', '#f0d8ff', '#e0b0ff', '#c080ff', '#a050ff', '#7a30d0', '#5a1a9a'];
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* no storage */ } };
  RF.towerRecord = load;

  // what each floor does: mods = party mods switched on for that fight only; dark = lights out;
  // who = a fixed opponent ('self' = your own rift double); boss = health multiplier
  const FLOORS = [
    { name: 'THE FIRST STEP', rule: 'NO TRICKS. YET.', level: 'easy' },
    { name: 'LOW GRAVITY', rule: 'EVERYONE FLOATS.', level: 'easy', mods: { MOD_LOWGRAV: true } },
    { name: 'LIGHTS OUT', rule: 'YOU ONLY SEE WHAT IS CLOSE TO YOU.', level: 'normal', dark: true },
    { name: 'GLASS JAWS', rule: 'EVERY HIT DOES TRIPLE DAMAGE.', level: 'normal', mods: { MOD_TRIPLE: true } },
    { name: 'THE KING', rule: 'RIFT KING SIRVEN. 40% MORE HEALTH.', level: 'normal', who: 'sirven', boss: 1.4, mini: true },
    { name: 'TURBO', rule: 'THE FIGHT RUNS 50% FASTER.', level: 'normal', mods: { MOD_TURBO: true } },
    { name: 'PROTEIN MODE', rule: 'DAMAGE YOU DEAL HEALS YOU. THEM TOO.', level: 'hard', mods: { MOD_PROTEIN: true } },
    { name: 'DOUBLE HEALTH', rule: 'THEY HAVE TWICE THE HEALTH.', level: 'hard', boss: 2 },
    { name: 'MIRROR MATCH', rule: 'YOU, FROM A WORSE UNIVERSE.', level: 'hard', who: 'self' },
    { name: 'OMEGA LOPEZ', rule: 'HE DOES NOT STAY DOWN.', level: 'hard', who: 'lopez', boss: 1.3, final: true },
  ];

  // ---- the RIFT costume (the reward) ----
  function unlockRift() {
    if (RF.COSTUMES.some((c) => c.name === 'RIFT')) return;
    RF.COSTUMES.push({ name: 'RIFT', map: (h) => {
      if (!h || h[0] !== '#') return h;
      const n = parseInt(h.slice(1), 16), l = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.55 + (n & 255) * 0.15) / 255;
      const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
      return '#' + c(30 + l * 190) + c(10 + l * 120) + c(60 + l * 200);
    } });
  }
  if (load().cleared) unlockRift();

  // ---- floor rules that borrow the party mods: on for one fight, then put back ----
  let backup = null;
  RF.towerMods = function (mods) {
    RF.towerModsOff();
    if (!mods) return;
    backup = {};
    for (const k in mods) { backup[k] = RF.CONFIG[k]; RF.CONFIG[k] = mods[k]; }
  };
  RF.towerModsOff = function () { if (backup) for (const k in backup) RF.CONFIG[k] = backup[k]; backup = null; };

  RF.startRiftTower = function (game, p1, costume = 0) {
    const pool = RF.CHARACTERS.filter((c) => !['sirven', 'lopez', 'bruiser', 'viper', p1.id].includes(c.id));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const stages = ['cafeteria', 'hallway', 'musicroom', 'parking', 'office', 'field', 'skatepark', 'cliff', 'brobatch', 'court'];
    const ladder = FLOORS.map((fl, i) => {
      let id = fl.who === 'self' ? p1.id : fl.who || pool[i].id;
      if (id === p1.id && fl.who && fl.who !== 'self') id = fl.who === 'sirven' ? 'brady' : 'jauregui'; // you cannot be your own boss
      const def = RF.riftDef(RF.getCharacter(id));
      if (fl.final) def.name = 'OMEGA ' + RF.getCharacter(id).name.toUpperCase().replace(' TUERO', '');
      return Object.assign({ def, stage: stages[i] }, fl);
    });
    game.setScene(new RiftTowerScene(game, { p1, costume, ladder, index: 0, retries: 0, health: null, meter: 0 }));
  };

  RF.towerFight = function (run) {
    const fl = run.ladder[run.index];
    return { p1: run.p1, p2: fl.def, costumes: [run.costume || 0, 0], cpu: true, stage: fl.stage, cpuLevel: fl.level, boss: fl.boss || 0, roundsToWin: 1, tower: run };
  };

  // What the match-over menu offers in the tower.
  RF.towerMenu = function (scene) {
    const run = scene.opts.tower, game = scene.game, me = scene.fighters[0], won = scene.wins[0] > scene.wins[1];
    const quit = { label: 'MAIN MENU', onSelect: () => { RF.towerModsOff(); game.setScene(new RF.TitleScene(game)); } };
    const rec = load();
    if (won) {
      const last = run.index >= run.ladder.length - 1;
      rec.best = Math.max(rec.best || 0, run.index + 1);
      if (last) { rec.cleared = true; unlockRift(); }
      save(rec);
      run.health = Math.min(me.maxHealth, me.health + me.maxHealth * 0.3); run.meter = me.meter;
      return new RF.ListMenu([{ label: last ? 'SEAL THE RIFT' : 'NEXT FLOOR', onSelect: () => {
        RF.towerModsOff();
        if (last) return game.setScene(new TowerEndScene(game, run));
        run.index++;
        game.setScene(new RiftTowerScene(game, run));
      } }, quit]);
    }
    return new RF.ListMenu([{ label: 'TRY THE FLOOR AGAIN', onSelect: () => { run.retries++; scene.startMatch(); } }, quit]);
  };

  // ---- inside the fight ----
  const P = RF.FightScene.prototype, startMatch0 = P.startMatch;
  P.startMatch = function () {
    const run = this.opts.tower;
    if (run) { // (also a retry: the boss starts over in his first form)
      RF.towerMods(run.ladder[run.index].mods);
      this.towerPhase2 = false;
      if (this.fighters) this.fighters[1].stats = this.fighters[1].def.stats;
    }
    return startMatch0.call(this);
  };
  // The top floor: the first knockout does not hold. He stands back up, stronger.
  P.secondWind = function (f) {
    const run = this.opts.tower;
    if (!run || !run.ladder[run.index].final || f.side !== 1 || this.towerPhase2 || this.phase !== 'fight') return false;
    this.towerPhase2 = true;
    f.health = f.maxHealth; f.meter = RF.CONFIG.SUPER_MAX;
    f.stats = Object.assign({}, f.stats, { damage: f.stats.damage * 1.25, walkSpeed: f.stats.walkSpeed * 1.2 });
    f.vx = f.vy = 0; f.state = null; f.setState('idle');
    const me = this.fighters[0]; me.pushVx = (me.x < f.x ? -1 : 1) * 9;
    this.projectiles = [];
    this.superFreeze = { f, t: 0, label: 'OMEGA FORM' };
    this.hud.trail[1] = 1; this.flash = 12; this.shake = 20;
    this.effects.spawnText('THAT WAS ONE THIRD OF ME.', f.x, f.body.height + 22, '#e0b0ff');
    RF.audio.sfx('boom'); RF.audio.sfx('super'); RF.audio.sfx('roar');
    if (RF.speakAs) RF.speakAs(f.def, 'THAT WAS ONE THIRD OF ME.');
    return true;
  };
  // Floor label, LIGHTS OUT and the second form's red sky.
  RF.drawTowerFx = function (ctx, scene) {
    const run = scene.opts.tower, fl = run.ladder[run.index];
    if (fl.dark && scene.phase !== 'matchOver') { // darkness with a hole around each fighter
      const [cv, c] = RF.util.makeCanvas(W, H), cam = scene.cam || { x: W / 2, z: 1 }, fy = scene.stageDef.floorY;
      c.fillStyle = 'rgba(2,0,8,0.93)'; c.fillRect(0, 44, W, H - 44); // (the health bars stay lit)
      const top = c.createLinearGradient(0, 30, 0, 44); top.addColorStop(0, 'rgba(2,0,8,0)'); top.addColorStop(1, 'rgba(2,0,8,0.93)'); c.fillStyle = top; c.fillRect(0, 30, W, 14);
      c.globalCompositeOperation = 'destination-out';
      for (const f of scene.fighters) {
        const x = W / 2 + (f.x - cam.x) * cam.z, y = fy - (f.y + f.body.height * 0.55) * cam.z + (1 - cam.z) * 14, r = 46 * cam.z + Math.sin(scene.frame / 9) * 2;
        const g = c.createRadialGradient(x, y, r * 0.35, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.drawImage(cv, 0, 0);
    }
    if (scene.towerPhase2) { ctx.fillStyle = `rgba(120,0,40,${0.16 + Math.sin(scene.frame / 12) * 0.05})`; ctx.fillRect(0, 0, W, H); }
    T(ctx, 'RIFT TOWER ' + (run.index + 1) + '/' + run.ladder.length + ' - ' + fl.name + (scene.towerPhase2 ? ' - FINAL FORM' : ''), W / 2, 37, { align: 'center', color: '#e0b0ff', outline: '#000' });
  };

  // ---- the tower screen between floors ----
  class RiftTowerScene {
    constructor(game, run) {
      RF.towerModsOff();
      RF.audio.playSong('menu');
      this.game = game; this.run = run; this.t = 0;
      this.sprites = run.ladder.map((r) => RF.createSprite(r.def));
      this.me = RF.createSprite(RF.costume(run.p1, run.costume));
      const fl = run.ladder[run.index];
      RF.announcer.say('FLOOR ' + RF.announcer.number(run.index + 1) + '. ' + fl.name);
    }
    update() {
      this.t++;
      const kb = this.game.kb;
      if (RF.menuPressed(kb, 'back') && this.t > 20) return this.game.setScene(new RF.TitleScene(this.game));
      if (this.t > 30 && RF.menuPressed(kb, 'confirm')) { RF.audio.sfx('select'); this.game.setScene(new RF.VersusScene(this.game, RF.towerFight(this.run))); }
    }
    render(ctx) {
      const run = this.run, n = run.ladder.length, t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#12041e'); g.addColorStop(1, '#05020a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (RF.storyKit) RF.storyKit.drawRift(ctx, 264, 112, 2.6, t);
      ctx.fillStyle = 'rgba(5,0,12,0.45)'; ctx.fillRect(0, 0, W, H);
      T(ctx, 'THE RIFT TOWER', W / 2, 5, { scale: 2, align: 'center', color: PURPLE, outline: '#14001e' });
      const ROW = 17, top = 28, x0 = 152, RW = 224;
      for (let i = 0; i < n; i++) {
        const fl = run.ladder[i], y = top + (n - 1 - i) * ROW, cur = i === run.index, done = i < run.index;
        ctx.fillStyle = '#000'; ctx.fillRect(x0 - 1, y - 1, RW + 2, ROW - 1);
        ctx.fillStyle = cur ? '#4a1880' : done ? '#16101e' : fl.final ? '#3a0a2a' : '#1e1430'; ctx.fillRect(x0, y, RW, ROW - 3);
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y, 20, ROW - 3); ctx.clip();
        this.sprites[i].draw(ctx, 'idle', 0, x0 + 10, y + 2 + fl.def.body.height * 0.92, -1, done ? '#30283a' : null); ctx.restore();
        T(ctx, (i + 1) + '. ' + fl.name, x0 + 24, y + 3, { color: cur ? '#ffffff' : done ? '#5a4a6a' : fl.final ? '#ff70a0' : '#c8b0e0', outline: '#000' });
        if (done) T(ctx, 'CLEARED', x0 + RW - 4, y + 3, { align: 'right', color: '#5a4a6a' });
        else T(ctx, fl.level.toUpperCase(), x0 + RW - 4, y + 3, { align: 'right', color: { easy: '#80e080', normal: '#ffd030', hard: '#ff5040' }[fl.level], outline: '#000' });
        if (cur && Math.floor(t / 8) % 2) { ctx.strokeStyle = '#e0b0ff'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 2, y - 2, RW + 4, ROW + 1); ctx.lineWidth = 1; }
      }
      // you, climbing, and what is next
      const fl = run.ladder[run.index], cy = top + (n - 1 - run.index) * ROW + ROW - 3;
      this.me.draw(ctx, Math.floor(t / 15) % 2 ? 'idle' : 'walk', Math.floor(t / 10) % 4, 134, Math.max(top + run.p1.body.height + 4, cy + 2) + Math.sin(t / 10) * 2, 1);
      T(ctx, 'FLOOR ' + (run.index + 1), 8, 34, { scale: 2, color: '#ffffff', outline: '#000' });
      RF.font.wrap(fl.def.name, 18).forEach((l, i) => T(ctx, l, 8, 54 + i * 9, { color: '#e0b0ff', outline: '#000' }));
      T(ctx, 'THE RULE:', 8, 80, { color: '#8a78a8', outline: '#000' });
      RF.font.wrap(fl.rule, 18).forEach((l, i) => T(ctx, l, 8, 90 + i * 9, { color: '#ffd030', outline: '#000' }));
      const me = run.p1, max = me.health || (RF.CONFIG.HEALTH_BY_ARCHETYPE || {})[me.archetype] || RF.CONFIG.MAX_HEALTH, hp = run.health == null ? max : run.health;
      T(ctx, 'YOUR HEALTH', 8, 150, { color: '#8a78a8', outline: '#000' });
      ctx.fillStyle = '#000'; ctx.fillRect(7, 159, 82, 8); ctx.fillStyle = '#301010'; ctx.fillRect(8, 160, 80, 6);
      ctx.fillStyle = hp / max < 0.3 ? '#ff5040' : '#f8d838'; ctx.fillRect(8, 160, Math.round(80 * hp / max), 6);
      if (run.retries) T(ctx, 'RETRIES: ' + run.retries, 8, 172, { color: '#8a78a8', outline: '#000' });
      const rec = load();
      T(ctx, 'BEST: FLOOR ' + (rec.best || 0) + (rec.cleared ? ' (CLEARED)' : ''), 8, 184, { color: '#8a78a8', outline: '#000' });
      if (Math.floor(t / 30) % 2 === 0) T(ctx, 'CONFIRM = FIGHT   BACK = QUIT', W / 2, H - 10, { align: 'center', color: '#a898c8', outline: '#000' });
    }
  }

  // ---- the top ----
  class TowerEndScene {
    constructor(game, run) {
      RF.audio.playSong('menu');
      this.game = game; this.run = run; this.t = 0;
      this.sprite = RF.createSprite(RF.costume(run.p1, RF.COSTUMES.findIndex((c) => c.name === 'RIFT')));
      this.plain = RF.createSprite(RF.costume(run.p1, run.costume));
      RF.announcer.say('THE RIFT IS SEALED.');
      RF.audio.sfx('applause');
    }
    update() {
      this.t++;
      if (this.t % 60 === 0) RF.audio.sfx('firework');
      if (this.t > 90 && (RF.menuPressed(this.game.kb, 'confirm') || RF.menuPressed(this.game.kb, 'back'))) this.game.setScene(new RF.TitleScene(this.game));
    }
    render(ctx) {
      const t = this.t, run = this.run, close = Math.max(0.2, 2.4 - t / 60);
      ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, W, H);
      if (RF.storyKit) RF.storyKit.drawRift(ctx, W / 2, 92, close, t); // the rift, closing
      ctx.fillStyle = 'rgba(5,0,12,0.4)'; ctx.fillRect(0, 0, W, H);
      T(ctx, 'THE RIFT IS SEALED', W / 2, 14, { scale: 3, align: 'center', color: PURPLE, outline: '#14001e' });
      T(ctx, run.p1.name.toUpperCase() + ' CLIMBED ALL ' + run.ladder.length + ' FLOORS' + (run.retries ? ' (' + run.retries + (run.retries === 1 ? ' RETRY)' : ' RETRIES)') : ' WITHOUT A SINGLE RETRY'), W / 2, 44, { align: 'center', color: '#ffffff', outline: '#000' });
      ctx.save(); ctx.translate(W / 2 - 50, 176); ctx.scale(1.8, 1.8); this.plain.draw(ctx, 'victory', Math.floor(t / 16) % 2, 0, 0, 1); ctx.restore();
      if (t > 70) {
        ctx.save(); ctx.translate(W / 2 + 50, 176); ctx.scale(1.8, 1.8); this.sprite.draw(ctx, 'idle', Math.floor(t / 20) % 2, 0, 0, -1, t < 78 ? '#ffffff' : null); ctx.restore();
        T(ctx, 'UNLOCKED: THE RIFT COSTUME', W / 2, 184, { align: 'center', color: '#ffd030', outline: '#000' });
        T(ctx, 'FOR EVERY FIGHTER - PRESS HEAVY ON CHARACTER SELECT', W / 2, 194, { align: 'center', color: '#c8b0e0', outline: '#000' });
      }
      if (t > 90 && Math.floor(t / 30) % 2 === 0) T(ctx, 'PRESS CONFIRM', W / 2, H - 10, { align: 'center', color: '#a898c8', outline: '#000' });
    }
  }

  RF.RiftTowerScene = RiftTowerScene;
  RF.TowerEndScene = TowerEndScene;
})();
