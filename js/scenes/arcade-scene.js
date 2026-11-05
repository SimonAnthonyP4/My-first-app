// ARCADE MODE: one player climbs a tower of CPU opponents that get harder on the
// way up, ending with a boss fight against King Sirven in his own office.
// Lose and you can CONTINUE (retry the same fight) as often as you like.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const RUNGS = 6;
  const LEVELS = ['easy', 'easy', 'normal', 'normal', 'hard', 'hard'];
  const BOSS_HEALTH = 1.4; // the final boss has 40% more health than usual

  // Build a run for the chosen fighter.
  RF.startArcade = function (game, p1, costume = 0) {
    const bossId = p1.id === 'sirven' ? 'dabalsa' : 'sirven';
    const pool = RF.CHARACTERS.filter((c) => c.id !== p1.id && c.id !== bossId);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const stages = RF.STAGES.map((s) => s.id).filter((s) => s !== 'office');
    const ladder = pool.slice(0, RUNGS - 1).map((def, i) => ({ def, level: LEVELS[i], stage: stages[i % stages.length] }));
    ladder.push({ def: RF.getCharacter(bossId), level: 'hard', stage: 'office', boss: true });
    game.setScene(new TowerScene(game, { p1, costume, ladder, index: 0, continues: 0 }));
  };

  // The fight options for the current rung.
  RF.arcadeFight = function (run) {
    const r = run.ladder[run.index];
    const c = run.costume || 0;
    return { p1: run.p1, p2: r.def, costumes: [c, r.def.id === run.p1.id ? (c + 1) % RF.COSTUMES.length : 0], cpu: true, stage: r.stage, cpuLevel: r.level, boss: r.boss ? BOSS_HEALTH : 0, arcade: run };
  };

  // The tower: opponents stacked bottom (first) to top (boss); you climb it.
  class TowerScene {
    constructor(game, run) {
      RF.audio.playSong('menu');
      this.game = game;
      this.run = run;
      this.t = 0;
      this.sprites = run.ladder.map((r) => RF.createSprite(r.def));
      this.me = RF.createSprite(RF.costume(run.p1, run.costume));
      const r = run.ladder[run.index];
      RF.announcer.say(r.boss ? 'FINAL BOSS. ' + r.def.name : 'NEXT OPPONENT. ' + r.def.name);
    }

    update() {
      this.t++;
      const kb = this.game.kb;
      if (RF.menuPressed(kb, 'back') && this.t > 20) return this.game.setScene(new RF.TitleScene(this.game));
      if ((this.t > 30 && RF.menuPressed(kb, 'confirm')) || this.t > 240) {
        RF.audio.sfx('select');
        this.game.setScene(new RF.VersusScene(this.game, RF.arcadeFight(this.run)));
      }
    }

    render(ctx) {
      RF.drawMenuBackdrop(ctx, this.t, 0.8);
      RF.drawTitle(ctx, 'ARCADE', 6, 2);
      const run = this.run, n = run.ladder.length;
      const BOX = 26, GAP = 3, x0 = W / 2 - BOX / 2, top = 30;
      // tower body
      ctx.fillStyle = '#1a0a08'; ctx.fillRect(x0 - 10, top - 6, BOX + 20, n * (BOX + GAP) + 10);
      ctx.fillStyle = '#5a2a18'; ctx.fillRect(x0 - 10, top - 6, 3, n * (BOX + GAP) + 10); ctx.fillRect(x0 + BOX + 7, top - 6, 3, n * (BOX + GAP) + 10);
      for (let i = 0; i < n; i++) {
        const r = run.ladder[i], y = top + (n - 1 - i) * (BOX + GAP);
        const cur = i === run.index, done = i < run.index;
        ctx.fillStyle = '#000'; ctx.fillRect(x0 - 1, y - 1, BOX + 2, BOX + 2);
        ctx.fillStyle = r.boss ? '#4a3008' : '#3a1410'; ctx.fillRect(x0, y, BOX, BOX);
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y, BOX, BOX); ctx.clip();
        this.sprites[i].draw(ctx, 'idle', 0, x0 + BOX / 2, y + 4 + r.def.body.height * 0.85, -1);
        ctx.restore();
        if (done) { // defeated: a big red X
          ctx.strokeStyle = '#e02020'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x0 + 3, y + 3); ctx.lineTo(x0 + BOX - 3, y + BOX - 3); ctx.moveTo(x0 + BOX - 3, y + 3); ctx.lineTo(x0 + 3, y + BOX - 3); ctx.stroke();
          ctx.lineWidth = 1;
        }
        if (cur && Math.floor(this.t / 8) % 2) { ctx.strokeStyle = '#ffd030'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 2, y - 2, BOX + 4, BOX + 4); ctx.lineWidth = 1; }
        const label = (r.boss ? 'BOSS: ' : (i + 1) + '. ') + r.def.name;
        T(ctx, label, x0 + BOX + 16, y + 9, { color: cur ? '#ffd030' : done ? '#806050' : r.boss ? '#ff7040' : '#c8b0a0', outline: '#000' });
        if (!done) T(ctx, r.level.toUpperCase(), x0 - 16, y + 9, { align: 'right', color: { easy: '#80e080', normal: '#ffd030', hard: '#ff5040' }[r.level], outline: '#000' });
      }
      // you, climbing
      const cy = top + (n - 1 - run.index) * (BOX + GAP) + BOX;
      this.me.draw(ctx, Math.floor(this.t / 15) % 2 ? 'idle' : 'walk', Math.floor(this.t / 10) % 4, 60, cy + 4 + Math.sin(this.t / 10) * 2, 1);
      T(ctx, run.p1.name, 60, Math.max(62, cy - run.p1.body.height - 14), { align: 'center', color: '#ff6050', outline: '#000' });
      const r = run.ladder[run.index];
      T(ctx, r.boss ? 'FINAL BOSS!' : 'FIGHT ' + (run.index + 1) + ' OF ' + n, 60, 40, { scale: r.boss ? 1 : 1, align: 'center', color: r.boss ? (this.t % 10 < 5 ? '#ff4040' : '#ffd030') : '#ffd030', outline: '#000' });
      if (run.continues) T(ctx, 'CONTINUES: ' + run.continues, 60, 50, { align: 'center', color: '#a08878', outline: '#000' });
      if (Math.floor(this.t / 30) % 2 === 0) T(ctx, 'ENTER / LIGHT = FIGHT   ESC = QUIT', W / 2, H - 10, { align: 'center', color: '#a08878', outline: '#000' });
    }
  }

  // Beat the boss: the ending.
  class ArcadeEndScene {
    constructor(game, run) {
      RF.audio.playSong('menu');
      this.game = game;
      this.run = run;
      this.t = 0;
      this.fire = new RF.FireField(W, H, 3);
      this.sprite = RF.createSprite(RF.costume(run.p1, run.costume));
      RF.announcer.say(run.p1.name + ' RULES TERRAMANIA HIGH!');
      RF.audio.sfx('applause');
    }

    update() {
      this.t++;
      this.fire.igniteBottom();
      this.fire.step();
      if (this.t % 50 === 0) RF.audio.sfx('firework');
      if (this.t > 90 && (RF.menuPressed(this.game.kb, 'confirm') || RF.menuPressed(this.game.kb, 'back'))) this.game.setScene(new RF.TitleScene(this.game));
    }

    render(ctx) {
      ctx.fillStyle = '#0a0000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(this.fire.render(), 0, 0);
      // fireworks
      for (let k = 0; k < 4; k++) {
        const age = (this.t + k * 25) % 100, cx = 60 + k * 90, cy = 40 + (k % 2) * 20;
        if (age > 40) continue;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2, d = age * 1.2;
          ctx.fillStyle = ['#ffd030', '#ff5040', '#60e0ff', '#ffffff'][(i + k) % 4];
          ctx.globalAlpha = 1 - age / 40;
          ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 2, 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(W - 58, 196); ctx.scale(1.25, 1.25);
      this.sprite.draw(ctx, 'victory', Math.floor(this.t / 15) % 2, 0, 0, 1);
      ctx.restore();
      T(ctx, 'CHAMPION', W / 2, 10, { scale: 3, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      T(ctx, this.run.p1.name + ' CONQUERED TERRAMANIA HIGH', W / 2, 40, { align: 'center', color: '#fff', outline: '#000' });
      // Their ending, typed out line by line.
      const lines = this.run.p1.ending || [this.run.p1.winQuote || ''];
      let chars = Math.max(0, (this.t - 40) * 0.8);
      lines.forEach((line, i) => {
        const shown = line.slice(0, Math.max(0, Math.floor(chars)));
        chars -= line.length + 6;
        if (shown) T(ctx, shown, 14, 62 + i * 13, { color: i === lines.length - 1 ? '#ffd030' : '#e8dcc0', outline: '#000' });
      });
      T(ctx, this.run.continues ? 'CONTINUES USED: ' + this.run.continues : 'NO CONTINUES - FLAWLESS RUN!', 14, 128, { color: '#ff9a40', outline: '#000' });
      if (this.t > 90 && Math.floor(this.t / 30) % 2 === 0) T(ctx, 'PRESS ENTER', W / 2, H - 12, { align: 'center', color: '#ffe0b0', outline: '#000' });
    }
  }

  RF.TowerScene = TowerScene;
  RF.ArcadeEndScene = ArcadeEndScene;
})();
