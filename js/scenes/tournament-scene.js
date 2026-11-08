// TOURNAMENT: a bracket for a party. 4 or 8 entrants; any number of them are people
// (they take turns on the keyboard / controllers), the rest are CPU fighters.
// Setup -> each player picks a fighter -> bracket -> fights -> CHAMPION.
// Person vs CPU: the person always plays on the left (P1 keys / controller 1).
// Person vs person: the left entrant uses P1, the right uses P2.
// CPU vs CPU: watch it, or SIM it instantly.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const COLORS = ['#ff5050', '#50a0ff', '#60e060', '#ffd030', '#ff80ff', '#60e0e0', '#ffa040', '#c0c0ff'];

  // ---------------------------------------------------------------- setup
  class TournamentSetupScene {
    constructor(game) {
      RF.audio.playSong('menu');
      this.game = game; this.t = 0;
      this.size = 8; this.humans = 2; this.index = 0;
    }
    update() {
      this.t++;
      const kb = this.game.kb, P = (a) => RF.menuPressed(kb, a);
      if (P('back') && this.t > 10) return this.game.setScene(new RF.TitleScene(this.game));
      if (P('up')) { this.index = (this.index + 2) % 3; RF.audio.sfx('move'); }
      if (P('down')) { this.index = (this.index + 1) % 3; RF.audio.sfx('move'); }
      const d = P('left') ? -1 : P('right') ? 1 : 0;
      if (d && this.index === 0) { this.size = this.size === 8 ? 4 : 8; this.humans = Math.min(this.humans, this.size); RF.audio.sfx('move'); }
      if (d && this.index === 1) { this.humans = Math.max(1, Math.min(this.size, this.humans + d)); RF.audio.sfx('move'); }
      if (P('confirm') && this.t > 10) {
        if (this.index < 2) { this.index++; RF.audio.sfx('move'); return; }
        RF.audio.sfx('select');
        this.game.setScene(new TournamentPickScene(this.game, { size: this.size, humans: this.humans }));
      }
    }
    render(ctx) {
      RF.drawMenuBackdrop(ctx, this.t, 0.82);
      RF.drawTitle(ctx, 'TOURNAMENT', 14, 3);
      RF.drawPanel(ctx, 72, 60, 240, 110);
      const rows = [['ENTRANTS', this.size + ' FIGHTERS'], ['PLAYERS', this.humans + (this.humans === 1 ? ' PERSON' : ' PEOPLE')], ['START', '']];
      rows.forEach(([l, v], i) => {
        const y = 76 + i * 26, sel = i === this.index;
        T(ctx, l, 92, y, { color: sel ? '#ffd030' : '#c8b0a0', outline: '#000', scale: i === 2 ? 2 : 1 });
        if (v) T(ctx, sel ? '< ' + v + ' >' : v, 292, y, { align: 'right', color: sel ? '#ffffff' : '#d8c8c0', outline: '#000' });
        if (sel && i === 2) T(ctx, '>', 80, y + 3, { color: '#ff5020', outline: '#000' });
      });
      T(ctx, 'PEOPLE TAKE TURNS - EMPTY SPOTS ARE CPU FIGHTERS.', W / 2, 182, { align: 'center', color: '#a08878', outline: '#000' });
      T(ctx, 'UP/DOWN - LEFT/RIGHT TO CHANGE - ENTER - ESC BACK', W / 2, 206, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  // ---------------------------------------------------------------- each person picks a fighter
  class TournamentPickScene {
    constructor(game, cfg) {
      this.game = game; this.cfg = cfg; this.t = 0;
      this.player = 0; this.cursor = 0; this.picks = [];
      this.sprites = RF.CHARACTERS.map((d) => RF.createSprite(d));
      this.COLS = 8;
    }
    update() {
      this.t++;
      const kb = this.game.kb, P = (a) => RF.menuPressed(kb, a), n = RF.CHARACTERS.length, C = this.COLS;
      if (P('back') && this.t > 10) {
        if (this.player === 0) return this.game.setScene(new TournamentSetupScene(this.game));
        this.player--; this.picks.pop(); RF.audio.sfx('move'); return;
      }
      const before = this.cursor;
      if (P('left')) this.cursor = (this.cursor - 1 + n) % n;
      if (P('right')) this.cursor = (this.cursor + 1) % n;
      if (P('up')) this.cursor = (this.cursor - C + n * C) % n;
      if (P('down')) this.cursor = (this.cursor + C) % n;
      if (before !== this.cursor) RF.audio.sfx('move');
      if (P('confirm') && this.t > 12) {
        this.picks.push(RF.CHARACTERS[this.cursor]);
        RF.audio.sfx('select');
        RF.announcer.say(RF.CHARACTERS[this.cursor].name);
        this.t = 0;
        if (++this.player >= this.cfg.humans) goBracket(this.game, makeRun(this.cfg, this.picks));
      }
    }
    render(ctx) {
      RF.drawMenuBackdrop(ctx, this.t + 99, 0.82);
      const col = COLORS[this.player % COLORS.length];
      T(ctx, 'PLAYER ' + (this.player + 1) + ': PICK YOUR FIGHTER', W / 2, 6, { scale: 2, align: 'center', color: col, outline: '#000' });
      const C = this.COLS, S = 28, G = 3, x0 = (W - (C * (S + G) - G)) / 2, y0 = 30;
      RF.CHARACTERS.forEach((d, i) => {
        const x = x0 + (i % C) * (S + G), y = y0 + Math.floor(i / C) * (S + G);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, S + 2, S + 2);
        ctx.fillStyle = i === this.cursor ? '#5a2a20' : '#2a1410'; ctx.fillRect(x, y, S, S);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
        this.sprites[i].draw(ctx, 'idle', 0, x + S / 2 - 2, y + 6 + d.body.height, 1);
        ctx.restore();
        if (i === this.cursor && Math.floor(this.t / 6) % 4) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, S + 2, S + 2); ctx.lineWidth = 1; }
      });
      const d = RF.CHARACTERS[this.cursor];
      T(ctx, d.name, W / 2, 132, { scale: 2, align: 'center', color: '#ffffff', outline: '#000' });
      T(ctx, d.bio || '', W / 2, 150, { align: 'center', color: '#c8a888', outline: '#000' });
      // who has picked so far
      this.picks.forEach((p, i) => T(ctx, 'P' + (i + 1) + ': ' + p.name, 14 + (i % 4) * 92, 172 + Math.floor(i / 4) * 10, { color: COLORS[i], outline: '#000' }));
      T(ctx, 'ARROWS / WASD - ENTER TO PICK - ESC UNDO', W / 2, 206, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  // Build the bracket: people + random CPU fighters, shuffled into first-round pairs.
  function makeRun(cfg, picks) {
    const entrants = picks.map((def, i) => ({ name: 'PLAYER ' + (i + 1), human: true, def, color: COLORS[i % COLORS.length] }));
    const used = new Set(picks.map((d) => d.id));
    const pool = RF.CHARACTERS.filter((d) => !used.has(d.id)).sort(() => Math.random() - 0.5);
    let k = 0;
    while (entrants.length < cfg.size) {
      const def = pool[k++ % pool.length] || RF.CHARACTERS[Math.floor(Math.random() * RF.CHARACTERS.length)];
      entrants.push({ name: 'CPU', human: false, def, color: '#a0a0a0' });
    }
    for (let i = entrants.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [entrants[i], entrants[j]] = [entrants[j], entrants[i]]; }
    const rounds = [];
    let count = cfg.size / 2;
    rounds.push(Array.from({ length: count }, (_, i) => ({ a: i * 2, b: i * 2 + 1, w: null })));
    while (count > 1) { count /= 2; rounds.push(Array.from({ length: count }, () => ({ a: null, b: null, w: null }))); }
    return { cfg, entrants, rounds };
  }

  // The next match still to be played, or null when there's a champion.
  function nextMatch(run) {
    for (let r = 0; r < run.rounds.length; r++) for (let i = 0; i < run.rounds[r].length; i++) {
      const m = run.rounds[r][i];
      if (m.w === null && m.a !== null && m.b !== null) return { r, i, m };
    }
    return null;
  }
  // Record a winner and move them into the next round.
  function decide(run, r, i, winner) {
    run.rounds[r][i].w = winner;
    if (r + 1 < run.rounds.length) { const nm = run.rounds[r + 1][i >> 1]; if (i % 2) nm.b = winner; else nm.a = winner; }
  }
  const roundName = (run, r) => { const left = run.rounds.length - r; return left === 1 ? 'FINAL' : left === 2 ? 'SEMI-FINALS' : 'QUARTER-FINALS'; };

  // ---------------------------------------------------------------- the bracket
  class BracketScene {
    constructor(game, run) {
      RF.audio.playSong('menu');
      this.game = game; this.run = run; this.t = 0;
      this.next = nextMatch(run);
      this.sprites = run.entrants.map((e) => RF.createSprite(e.def));
      this.choice = 0;
      if (!this.next) return;
      const { m } = this.next, A = run.entrants[m.a], B = run.entrants[m.b];
      this.cpuOnly = !A.human && !B.human;
      RF.announcer.say(roundName(run, this.next.r) + '. ' + A.def.name + ' VERSUS ' + B.def.name);
    }
    update() {
      this.t++;
      if (!this.next) return;
      const kb = this.game.kb, P = (a) => RF.menuPressed(kb, a);
      if (P('back') && this.t > 20) return this.game.setScene(new RF.TitleScene(this.game));
      if (this.cpuOnly && (P('left') || P('right') || P('up') || P('down'))) { this.choice = 1 - this.choice; RF.audio.sfx('move'); }
      if (P('confirm') && this.t > 20) {
        RF.audio.sfx('select');
        const { r, i, m } = this.next, run = this.run;
        if (this.cpuOnly && this.choice === 1) { // SIM: decide it on the spot
          decide(run, r, i, Math.random() < 0.5 ? m.a : m.b);
          return goBracket(this.game, run);
        }
        let left = m.a, right = m.b;
        const A = run.entrants[m.a], B = run.entrants[m.b];
        if (!A.human && B.human) { left = m.b; right = m.a; } // a person always plays on the left vs the CPU
        const L = run.entrants[left], R = run.entrants[right];
        const stage = RF.STAGES[Math.floor(Math.random() * RF.STAGES.length)].id;
        this.game.setScene(new RF.VersusScene(this.game, {
          p1: L.def, p2: R.def, costumes: [0, L.def.id === R.def.id ? 1 : 0], stage,
          cpu: !R.human, cpuBoth: !L.human, cpuLevel: 'normal',
          tournament: { run, r, i, left, right },
        }));
      }
    }
    render(ctx) {
      const run = this.run;
      RF.drawMenuBackdrop(ctx, this.t, 0.86);
      const R = run.rounds.length, colW = 92, x0 = (W - colW * (R + 1)) / 2 + 4, top = 18, span = run.cfg.size > 4 ? 160 : 150;
      const boxH = 13, slot = (r, k) => top + (k + 0.5) * (span / (run.cfg.size / Math.pow(2, r)));
      // entrant boxes for every round
      const box = (x, y, idx, live, won) => {
        ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, colW - 10, boxH + 2);
        ctx.fillStyle = won ? '#4a3a08' : live ? '#3a1410' : '#1a0a08'; ctx.fillRect(x, y, colW - 12, boxH);
        if (idx === null) { T(ctx, '...', x + 4, y + 3, { color: '#6a5048' }); return; }
        const e = run.entrants[idx];
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, 12, boxH); ctx.clip();
        this.sprites[idx].draw(ctx, 'idle', 0, x + 6, y + 6 + e.def.body.height * 0.95, 1);
        ctx.restore();
        T(ctx, e.def.name.length > 11 ? e.def.name.slice(0, 10) + '.' : e.def.name, x + 15, y + 1, { color: '#ffffff' });
        T(ctx, e.name, x + 15, y + 8, { color: e.color });
      };
      for (let r = 0; r < R; r++) {
        T(ctx, roundName(run, r), x0 + r * colW + (colW - 12) / 2, top - 8, { align: 'center', color: '#a08878' });
        run.rounds[r].forEach((m, i) => {
          const cur = this.next && this.next.r === r && this.next.i === i;
          const ya = slot(r, i * 2) - boxH / 2 - 1, yb = slot(r, i * 2 + 1) - boxH / 2 + 1;
          box(x0 + r * colW, ya, m.a, cur, m.w !== null && m.w === m.a);
          box(x0 + r * colW, yb, m.b, cur, m.w !== null && m.w === m.b);
          ctx.fillStyle = cur && this.t % 20 < 10 ? '#ffd030' : '#5a2a20';
          const mx = x0 + r * colW + colW - 11, my = (ya + yb + boxH) / 2;
          ctx.fillRect(mx, ya + boxH / 2, 2, yb - ya); ctx.fillRect(mx, my, 8, 2);
        });
      }
      // the champion's spot
      const fx = x0 + R * colW, fy = top + span / 2 - 8;
      const champ = run.rounds[R - 1][0].w;
      RF.drawPanel(ctx, fx - 2, fy - 2, colW - 8, 20, '#c8a040');
      T(ctx, champ === null ? 'CHAMPION' : run.entrants[champ].def.name, fx + (colW - 12) / 2, fy + 4, { align: 'center', color: '#ffd030' });

      if (this.next) {
        const { m } = this.next, A = run.entrants[m.a], B = run.entrants[m.b];
        T(ctx, roundName(run, this.next.r) + ': ' + A.def.name + ' (' + A.name + ')  VS  ' + B.def.name + ' (' + B.name + ')', W / 2, 184, { align: 'center', color: '#ffffff', outline: '#000' });
        if (this.cpuOnly) {
          ['WATCH', 'SIM'].forEach((o, k) => T(ctx, (this.choice === k ? '> ' : '  ') + o, W / 2 - 30 + k * 60, 198, { align: 'center', color: this.choice === k ? '#ffd030' : '#a08878', outline: '#000' }));
        } else {
          const ppl = [A, B].filter((e) => e.human);
          const hint = ppl.length === 2 ? A.name + ' = P1 KEYS (LEFT), ' + B.name + ' = P2 KEYS (RIGHT)' : ppl[0].name + ' PLAYS ON THE LEFT (P1 KEYS / CONTROLLER 1)';
          T(ctx, hint, W / 2, 196, { align: 'center', color: '#c8a888', outline: '#000' });
        }
        if (Math.floor(this.t / 30) % 2 === 0) T(ctx, 'ENTER = FIGHT   ESC = QUIT', W / 2, 212, { align: 'center', color: '#806860', outline: '#000' });
      }
    }
  }

  // ---------------------------------------------------------------- champion
  class ChampionScene {
    constructor(game, run) {
      RF.audio.playSong('menu');
      this.game = game; this.run = run; this.t = 0;
      this.winner = run.entrants[run.rounds[run.rounds.length - 1][0].w];
      this.sprite = RF.createSprite(this.winner.def);
      this.fire = new RF.FireField(W, H, 3);
      RF.announcer.say(this.winner.name + ' WINS THE TOURNAMENT WITH ' + this.winner.def.name + '!');
      RF.audio.sfx('applause'); RF.audio.sfx('fanfare');
    }
    update() {
      this.t++;
      this.fire.igniteBottom(); this.fire.step();
      if (this.t % 45 === 0) RF.audio.sfx('firework');
      if (this.t > 90 && (RF.menuPressed(this.game.kb, 'confirm') || RF.menuPressed(this.game.kb, 'back'))) this.game.setScene(new RF.TitleScene(this.game));
    }
    render(ctx) {
      ctx.fillStyle = '#0a0000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(this.fire.render(), 0, 0);
      for (let k = 0; k < 5; k++) { // fireworks
        const age = (this.t + k * 23) % 90, cx = 40 + k * 76, cy = 36 + (k % 2) * 24;
        if (age > 36) continue;
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, d = age * 1.3; ctx.globalAlpha = 1 - age / 36; ctx.fillStyle = [this.winner.color, '#ffd030', '#ffffff'][(i + k) % 3]; ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 2, 2); }
      }
      ctx.globalAlpha = 1;
      // the trophy
      ctx.save(); ctx.translate(120, 168); ctx.scale(2, 2);
      ctx.fillStyle = '#111'; ctx.fillRect(-16, -42, 32, 46); ctx.fillRect(-21, -38, 6, 12); ctx.fillRect(15, -38, 6, 12);
      ctx.fillStyle = '#e8b420'; ctx.fillRect(-14, -40, 28, 18); ctx.fillRect(-4, -22, 8, 14); ctx.fillRect(-12, -8, 24, 10);
      ctx.fillRect(-19, -36, 4, 8); ctx.fillRect(15, -36, 4, 8);
      ctx.fillStyle = '#fff2a0'; ctx.fillRect(-11, -38, 4, 12);
      ctx.fillStyle = '#8a5a10'; ctx.fillRect(-8, -5, 16, 3);
      ctx.restore();
      ctx.save(); ctx.translate(W - 110, 200); ctx.scale(1.4, 1.4);
      this.sprite.draw(ctx, 'victory', Math.floor(this.t / 15) % 2, 0, 0, -1);
      ctx.restore();
      T(ctx, 'CHAMPION', W / 2, 10, { scale: 3, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      T(ctx, this.winner.name, 120, 46, { scale: 2, align: 'center', color: this.winner.color, outline: '#000' });
      T(ctx, 'WITH ' + this.winner.def.name, 120, 64, { align: 'center', color: '#ffffff', outline: '#000' });
      T(ctx, this.winner.def.winQuote || '', W / 2, 182, { align: 'center', color: '#ffd8a0', outline: '#000' });
      if (this.t > 90 && Math.floor(this.t / 30) % 2 === 0) T(ctx, 'PRESS ENTER', W / 2, H - 12, { align: 'center', color: '#ffe0b0', outline: '#000' });
    }
  }

  // Called by the fight when a tournament match ends.
  RF.tournamentResult = function (game, t, leftWon) {
    decide(t.run, t.r, t.i, leftWon ? t.left : t.right);
    goBracket(game, t.run);
  };
  // The bracket again, or the champion when the final is done.
  function goBracket(game, run) { game.setScene(nextMatch(run) ? new BracketScene(game, run) : new ChampionScene(game, run)); }

  RF.TournamentSetupScene = TournamentSetupScene;
  RF.BracketScene = BracketScene;
})();
