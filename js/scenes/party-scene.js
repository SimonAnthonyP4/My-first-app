// Two modes for a room full of people.
//
// WINNER STAYS   3 to 8 players and two controllers (or one keyboard). Two play; the winner keeps their seat
//                and their controller, the loser hands theirs to whoever is next in line and goes to the back.
//                Everyone picks a fighter each time. First to the number of wins you set takes the night.
//                Names are four letters, arcade style: UP/DOWN changes a letter, LEFT/RIGHT moves along.
//
// DAILY FIGHT    one matchup a day, the same for everyone who plays that day: who you are, who you fight,
//                where, and with which rule. Hard CPU. Your best score for the day is kept, and so is the
//                number of days in a row you have won it. Compare numbers.
//                score = 100 a round won, -100 a round lost, + the health you finished with, + 50 if you never
//                lost a round.
//
// A fight started from here carries opts.party = { label, onEnd(game, p1Won, scene) }: the fight's end menu
// is that one row (js/game/fight-scene.js), and the select screen shows the players' names and goes back to
// the line when you press ESC (js/scenes/select-scene.js).
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224;
  const COLORS = ['#ff5a4a', '#5aa8ff', '#6ae06a', '#ffd030', '#ff8aff', '#60e0e0', '#ffa040', '#c0c0ff'];
  const LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const P = (game, a) => RF.menuPressed(game.kb, a);
  const nameOf = (run, i) => (run.names[i].trim() || 'P' + (i + 1));

  // ================================================================ WINNER STAYS: who is playing
  class WinnerStaysSetupScene {
    constructor(game, prev) {
      RF.audio.playSong('menu');
      this.game = game; this.t = 0; this.row = 0;
      this.n = prev ? prev.n : 4; this.goal = prev ? prev.goal : 5;
      this.names = prev ? prev.names.slice() : Array.from({ length: 8 }, (_, i) => ('P' + (i + 1)).padEnd(4, ' '));
      this.edit = null;   // { p, c }: which player's name, which letter
    }
    update() {
      this.t++;
      const g = this.game;
      if (this.edit) return this.updateEdit();
      if (P(g, 'back') && this.t > 10) return g.setScene(new RF.TitleScene(g));
      if (P(g, 'up')) { this.row = (this.row + 3) % 4; RF.audio.sfx('move'); }
      if (P(g, 'down')) { this.row = (this.row + 1) % 4; RF.audio.sfx('move'); }
      const d = P(g, 'left') ? -1 : P(g, 'right') ? 1 : 0;
      if (d && this.row === 0) { this.n = Math.max(3, Math.min(8, this.n + d)); RF.audio.sfx('move'); }
      if (d && this.row === 1) { const G = [3, 5, 7, 10]; this.goal = G[(G.indexOf(this.goal) + d + G.length) % G.length]; RF.audio.sfx('move'); }
      if (P(g, 'confirm') && this.t > 10) {
        RF.audio.sfx('select');
        if (this.row === 2) { this.edit = { p: 0, c: 0 }; return; }
        if (this.row < 3) { this.row++; return; }
        RF.startWinnerStays(g, { n: this.n, goal: this.goal, names: this.names.slice(0, this.n) });
      }
    }
    updateEdit() {
      const g = this.game, e = this.edit, name = this.names[e.p].padEnd(4, ' ').split('');
      const turn = (d) => { const i = Math.max(0, LETTERS.indexOf(name[e.c])); name[e.c] = LETTERS[(i + d + LETTERS.length) % LETTERS.length]; this.names[e.p] = name.join(''); RF.audio.sfx('move'); };
      if (P(g, 'up')) turn(1);
      if (P(g, 'down')) turn(-1);
      if (P(g, 'left')) { if (e.c > 0) e.c--; else if (e.p > 0) { e.p--; e.c = 3; } RF.audio.sfx('move'); }
      if (P(g, 'right')) { if (e.c < 3) e.c++; else if (e.p < this.n - 1) { e.p++; e.c = 0; } RF.audio.sfx('move'); }
      if (P(g, 'confirm')) { RF.audio.sfx('select'); if (e.p < this.n - 1) { e.p++; e.c = 0; } else { this.edit = null; this.row = 3; } }
      else if (P(g, 'back')) { RF.audio.sfx('block'); this.edit = null; }
    }
    render(ctx) {
      RF.drawMenuBackdrop(ctx, this.t, 0.82);
      RF.drawTitle(ctx, 'WINNER STAYS', 12, 3);
      RF.drawPanel(ctx, 52, 50, 280, 140);
      const rows = [['PLAYERS', String(this.n)], ['FIRST TO', this.goal + ' WINS'], ['NAMES', ''], ['START', '']];
      rows.forEach(([l, v], i) => {
        const y = 60 + (i < 3 ? i * 18 : 108), sel = i === this.row && !this.edit;
        T(ctx, l, 70, y, { color: sel ? '#ffd030' : '#c8b0a0', outline: '#000', scale: i === 3 ? 2 : 1 });
        if (v) T(ctx, sel ? '< ' + v + ' >' : v, 314, y, { align: 'right', color: sel ? '#ffffff' : '#d8c8c0', outline: '#000' });
        if (sel) T(ctx, '>', 59, y + (i === 3 ? 3 : 0), { color: '#ff5020', outline: '#000' });
        if (i === 2 && !this.edit) T(ctx, sel ? 'ENTER TO CHANGE THEM' : '', 314, y, { align: 'right', color: '#a08878', outline: '#000' });
      });
      // the names, four letters each, in two rows of four
      for (let i = 0; i < 8; i++) {
        const x = 70 + (i % 4) * 62, y = 116 + Math.floor(i / 4) * 22, on = i < this.n, ed = this.edit && this.edit.p === i;
        ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, 56, 17); ctx.fillStyle = ed ? '#3a1410' : on ? '#1c0c0a' : '#0c0606'; ctx.fillRect(x - 2, y - 2, 54, 15);
        ctx.fillStyle = on ? COLORS[i] : '#3a2a26'; ctx.fillRect(x - 2, y - 2, 2, 15);
        const name = this.names[i].padEnd(4, ' ');
        for (let c = 0; c < 4; c++) {
          const cx = x + 6 + c * 11, cur = ed && this.edit.c === c;
          if (cur) {   // the letter being changed: a bar under it, arrows above and below
            ctx.fillStyle = this.t % 20 < 12 ? '#ffd030' : '#8a6a10'; ctx.fillRect(cx - 2, y + 9, 9, 2);
            ctx.beginPath(); ctx.moveTo(cx - 1, y - 4); ctx.lineTo(cx + 2.5, y - 8); ctx.lineTo(cx + 6, y - 4); ctx.fill();
          }
          if (name[c] === ' ') { ctx.fillStyle = on ? '#5a4a44' : '#2a1e1a'; ctx.fillRect(cx, y + 6, 5, 1); }
          else T(ctx, name[c], cx, y, { color: !on ? '#3a2a26' : cur ? '#ffffff' : COLORS[i], outline: '#000' });
        }
      }
      T(ctx, this.edit ? 'UP/DOWN LETTER - LEFT/RIGHT MOVE - ENTER NEXT - ESC DONE' : 'TWO PLAY. THE WINNER KEEPS THEIR SEAT. THE LOSER PASSES THE CONTROLLER.', W / 2, 196, { align: 'center', color: '#a08878', outline: '#000' });
      if (!this.edit) T(ctx, 'UP/DOWN - LEFT/RIGHT TO CHANGE - ENTER - ESC BACK', W / 2, 208, { align: 'center', color: '#806860', outline: '#000' });
    }
  }

  // ================================================================ WINNER STAYS: the line
  RF.startWinnerStays = function (game, cfg) {
    const n = cfg.n;
    const run = { n, goal: cfg.goal, names: cfg.names.slice(), wins: Array(n).fill(0), best: Array(n).fill(0), played: Array(n).fill(0),
      king: 0, kingSide: 0, streak: 0, line: Array.from({ length: n - 1 }, (_, i) => i + 1), fights: 0, last: null, champion: null };
    game.setScene(new WinnerStaysScene(game, run));
  };
  // who sits where for the next fight: [left player, right player]
  const seats = (run) => (run.kingSide === 0 ? [run.king, run.line[0]] : [run.line[0], run.king]);
  // a fight ended: the winner stays where they are sitting
  RF.winnerStaysResult = function (run, p1Won) {
    const s = seats(run), side = p1Won ? 0 : 1, winner = s[side], loser = s[1 - side];
    run.fights++; run.played[winner]++; run.played[loser]++;
    run.line.shift(); run.line.push(loser);
    if (winner === run.king && run.fights > 1) run.streak++; else { run.king = winner; run.kingSide = side; run.streak = 1; }
    run.wins[winner]++; run.best[winner] = Math.max(run.best[winner], run.streak);
    if (run.streak === 3 && RF.records.unlock) RF.records.unlock('king');
    run.last = { winner, loser, dethroned: loser !== winner && run.streak === 1 && run.fights > 1 };
    if (run.wins[winner] >= run.goal) run.champion = winner;
    return run;
  };

  class WinnerStaysScene {
    constructor(game, run) {
      RF.audio.playSong('menu');
      this.game = game; this.run = run; this.t = 0;
      if (run.champion != null) { RF.audio.sfx('fanfare'); RF.announcer.say(nameOf(run, run.champion) + ' TAKES THE NIGHT'); }
      else if (run.last) RF.announcer.say(run.last.dethroned ? 'NEW KING' : run.streak >= 3 ? run.streak + ' IN A ROW' : 'WINNER STAYS');
      this.menu = new RF.ListMenu([
        { label: 'RUN IT BACK', onSelect: () => RF.startWinnerStays(game, run) },
        { label: 'CHANGE PLAYERS', onSelect: () => game.setScene(new WinnerStaysSetupScene(game, { n: run.n, goal: run.goal, names: run.names.concat(Array.from({ length: 8 - run.n }, (_, i) => ('P' + (run.n + i + 1)).padEnd(4, ' '))) })) },
        { label: 'MAIN MENU', onSelect: () => game.setScene(new RF.TitleScene(game)) },
      ]);
      this.quit = 0;
    }
    update() {
      this.t++;
      const g = this.game, run = this.run;
      if (run.champion != null) { if (this.t > 50) this.menu.update(g.kb); return; }
      if (P(g, 'back') && this.t > 15) { if (this.quit > 0) return g.setScene(new RF.TitleScene(g)); this.quit = 120; RF.audio.sfx('block'); }
      if (this.quit > 0) this.quit--;
      if (P(g, 'confirm') && this.t > 20) {
        RF.audio.sfx('select');
        const [l, r] = seats(run);
        g.setScene(new RF.SelectScene(g, { party: {
          label: 'BACK TO THE LINE', names: [nameOf(run, l), nameOf(run, r)], colors: [COLORS[l], COLORS[r]],
          hint: nameOf(run, l) + ' (LEFT)  VS  ' + nameOf(run, r) + ' (RIGHT)',
          onEnd: (game, p1Won) => game.setScene(new WinnerStaysScene(game, RF.winnerStaysResult(run, p1Won))),
          onQuit: (game) => game.setScene(new WinnerStaysScene(game, run)),
        } }));
      }
    }
    render(ctx) {
      const run = this.run, t = this.t;
      RF.drawMenuBackdrop(ctx, t, 0.86);
      if (run.champion != null) return this.renderChampion(ctx);
      RF.drawTitle(ctx, 'WINNER STAYS', 8, 2);
      T(ctx, 'FIRST TO ' + run.goal, W - 10, 12, { align: 'right', color: '#a08878', outline: '#000' });
      // the next fight
      const [l, r] = seats(run), plate = (i, x, align) => {
        const king = i === run.king && run.fights > 0, name = nameOf(run, i), w = 126;
        const px = align === 'left' ? x : x - w;
        ctx.fillStyle = '#000'; ctx.fillRect(px - 1, 37, w + 2, 46); ctx.fillStyle = 'rgba(12,4,4,0.94)'; ctx.fillRect(px, 38, w, 44);
        ctx.fillStyle = COLORS[i]; ctx.fillRect(align === 'left' ? px : px + w - 3, 38, 3, 44);
        const tx = align === 'left' ? px + 10 : px + w - 10;
        T(ctx, name, tx, 44, { scale: 3, align, color: COLORS[i], outline: '#000' });
        T(ctx, king ? (run.streak > 1 ? 'KING - ' + run.streak + ' IN A ROW' : 'KING') : run.fights ? 'CHALLENGER' : 'FIRST UP', tx, 70, { align, color: king ? '#ffd030' : '#c8b0a0', outline: '#000' });
        if (king) { const cx = align === 'left' ? px + w - 18 : px + 18, cy = 46 + Math.sin(t / 12) * 1.5; ctx.fillStyle = '#000'; ctx.fillRect(cx - 8, cy - 1, 16, 10); ctx.fillStyle = '#ffd030'; ctx.fillRect(cx - 7, cy + 4, 14, 4); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cx - 7 + k * 5, cy + 4); ctx.lineTo(cx - 5 + k * 5, cy - 1); ctx.lineTo(cx - 2 + k * 5, cy + 4); ctx.fill(); } }
      };
      plate(l, 14, 'left'); plate(r, W - 14, 'right');
      T(ctx, 'VS', W / 2, 50, { scale: 3, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      if (run.last) T(ctx, run.last.dethroned ? nameOf(run, run.last.winner) + ' TOOK THE SEAT FROM ' + nameOf(run, run.last.loser) + '!' : nameOf(run, run.last.winner) + ' SENT ' + nameOf(run, run.last.loser) + ' TO THE BACK OF THE LINE.', W / 2, 90, { align: 'center', color: '#ffd030', outline: '#000' });
      // the line
      T(ctx, 'ON DECK', 14, 104, { color: '#a08878', outline: '#000' });
      run.line.slice(1).forEach((i, k) => { const x = 62 + k * 44; ctx.fillStyle = '#000'; ctx.fillRect(x - 3, 101, 40, 13); ctx.fillStyle = k === 0 ? '#2a1410' : '#160a08'; ctx.fillRect(x - 2, 102, 38, 11); ctx.fillStyle = COLORS[i]; ctx.fillRect(x - 2, 102, 2, 11); T(ctx, nameOf(run, i), x + 3, 104, { color: k === 0 ? '#ffffff' : '#b8a8a0', outline: '#000' }); });
      // the table
      RF.drawPanel(ctx, 14, 120, W - 28, 80);
      const order = run.names.map((_, i) => i).sort((a, b) => run.wins[b] - run.wins[a] || run.best[b] - run.best[a] || a - b), half = Math.ceil(order.length / 2);
      order.forEach((i, k) => {
        const col = k < half ? 0 : 1, x = 24 + col * 176, y = 127 + (k % half) * 17;
        T(ctx, String(k + 1), x, y, { color: '#806860', outline: '#000' });
        T(ctx, nameOf(run, i), x + 12, y, { color: COLORS[i], outline: '#000' });
        for (let w = 0; w < run.goal; w++) { ctx.fillStyle = '#000'; ctx.fillRect(x + 46 + w * (run.goal > 7 ? 8 : 11), y, run.goal > 7 ? 6 : 9, 7); ctx.fillStyle = w < run.wins[i] ? '#ffd030' : '#2a1a14'; ctx.fillRect(x + 47 + w * (run.goal > 7 ? 8 : 11), y + 1, run.goal > 7 ? 4 : 7, 5); }
        if (run.best[i] > 1) T(ctx, 'x' + run.best[i], x + 160, y, { align: 'right', color: '#ff8a40', outline: '#000' });
      });
      T(ctx, this.quit > 0 ? 'PRESS ESC AGAIN TO END THE NIGHT' : 'ENTER: PICK YOUR FIGHTERS      ESC: END THE NIGHT', W / 2, 208, { align: 'center', color: this.quit > 0 ? '#ff6050' : (t % 50 < 36 ? '#ffffff' : '#a08878'), outline: '#000' });
    }
    renderChampion(ctx) {
      const run = this.run, t = this.t, c = run.champion;
      for (let i = 0; i < 60; i++) { const x = (i * 53 + t * (0.4 + (i % 5) * 0.2)) % (W + 20) - 10, y = (i * 37 + t * (1 + (i % 4) * 0.5)) % (H + 10) - 6; ctx.fillStyle = COLORS[i % 8]; ctx.fillRect(Math.round(x + Math.sin(t / 9 + i) * 4), Math.round(y), 3, (t + i * 3) % 12 < 6 ? 3 : 1); }
      T(ctx, 'THE NIGHT GOES TO', W / 2, 22, { align: 'center', color: '#c8b0a0', outline: '#000' });
      T(ctx, nameOf(run, c), W / 2, 36, { scale: 6, align: 'center', color: COLORS[c], outline: '#000' });
      T(ctx, run.wins[c] + ' WINS   BEST RUN ' + run.best[c] + ' IN A ROW   ' + run.fights + ' FIGHTS TONIGHT', W / 2, 86, { align: 'center', color: '#ffd030', outline: '#000' });
      const order = run.names.map((_, i) => i).sort((a, b) => run.wins[b] - run.wins[a] || run.best[b] - run.best[a] || a - b);
      order.forEach((i, k) => { const x = W / 2 - 150 + (k % 4) * 78, y = 104 + Math.floor(k / 4) * 14; T(ctx, (k + 1) + '. ' + nameOf(run, i) + '  ' + run.wins[i], x, y, { color: k === 0 ? '#ffffff' : COLORS[i], outline: '#000' }); });
      if (t > 50) this.menu.draw(ctx, W / 2, 148, t, { spacing: 16 });
    }
  }

  // ================================================================ DAILY FIGHT
  const DKEY = 'terramania-daily';
  const RULES = [
    { name: 'NO RULE TODAY', rule: 'A STRAIGHT FIGHT.', mods: null },
    { name: 'LOW GRAVITY', rule: 'EVERYONE FLOATS.', mods: { MOD_LOWGRAV: true } },
    { name: 'TURBO', rule: 'THE WHOLE FIGHT RUNS 50% FASTER.', mods: { MOD_TURBO: true } },
    { name: 'GLASS JAWS', rule: 'EVERY HIT DOES TRIPLE DAMAGE.', mods: { MOD_TRIPLE: true } },
    { name: 'PROTEIN MODE', rule: 'DAMAGE YOU DEAL HEALS YOU. THEM TOO.', mods: { MOD_PROTEIN: true } },
    { name: 'CARE PACKAGE', rule: 'ITEMS DROP ONTO THE STAGE.', mods: { MOD_ITEMS: true } },
    { name: 'BIG HEADS', rule: 'EVERYONE GETS A GIANT HEAD. NO OTHER CHANGE.', mods: { MOD_BIGHEAD: true } },
  ];
  const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  // the same numbers for the same day, on every machine
  const seeded = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let x = Math.imul(h ^ (h >>> 15), 1 | h); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  let store = { days: {}, streak: 0, last: null };
  try { store = Object.assign(store, JSON.parse(localStorage.getItem(DKEY)) || {}); } catch (e) { /* no storage: this visit only */ }
  const saveDaily = () => { try { localStorage.setItem(DKEY, JSON.stringify(store)); } catch (e) { /* ignore */ } };
  RF.daily = {
    key: dayKey,
    // today's fight (or any day's: pass its key)
    card(key = dayKey()) {
      const r = seeded('terramania ' + key), roster = RF.CHARACTERS, pick = (a) => a[Math.floor(r() * a.length)];
      const me = pick(roster), foe = pick(roster.filter((c) => c.id !== me.id)), stage = pick(RF.STAGES), rule = pick(RULES);
      return { key, me, foe, stage: stage.id, stageName: stage.name, rule };
    },
    get store() { return store; },
    today() { return store.days[dayKey()] || { best: null, tries: 0, won: false }; },
    // days won in a row, counting back from today (or from yesterday, if today is not won yet)
    streak() { let n = 0; const d = new Date(); if (!(store.days[dayKey(d)] || {}).won) d.setDate(d.getDate() - 1); while ((store.days[dayKey(d)] || {}).won) { n++; d.setDate(d.getDate() - 1); } return n; },
    score(scene) {
      const w = scene.wins, me = scene.fighters[0], won = w[0] > w[1];
      return Math.max(0, w[0] * 100 - w[1] * 100 + (won ? Math.round(100 * Math.max(0, me.health) / me.maxHealth) : 0) + (won && w[1] === 0 ? 50 : 0));
    },
    record(key, score, won) {
      const d = store.days[key] = store.days[key] || { best: null, tries: 0, won: false }, first = !d.won && won, better = d.best == null || score > d.best;
      d.tries++; if (better) d.best = score; if (won) d.won = true;
      saveDaily();
      return { first, better, best: d.best };
    },
  };

  class DailyScene {
    constructor(game, result) {
      RF.audio.playSong('menu');
      if (RF.towerModsOff) RF.towerModsOff();
      this.game = game; this.t = 0; this.card = RF.daily.card(); this.result = result || null;
      this.sprites = [RF.createSprite(this.card.me), RF.createSprite(this.card.foe)];
      this.stageR = null;
      if (result) RF.announcer.say(result.won ? (result.first ? 'DAILY FIGHT CLEARED' : 'AGAIN') : 'TRY AGAIN');
    }
    update() {
      this.t++;
      const g = this.game, c = this.card;
      if (P(g, 'back') && this.t > 10) return g.setScene(new RF.TitleScene(g));
      if (P(g, 'confirm') && this.t > 20) {
        RF.audio.sfx('select');
        if (c.rule.mods && RF.towerMods) RF.towerMods(c.rule.mods);
        g.setScene(new RF.VersusScene(g, { p1: c.me, p2: c.foe, costumes: [0, c.foe.id === c.me.id ? 1 : 0], stage: c.stage, cpu: true, cpuLevel: 'hard', daily: c.key,
          party: { label: 'BACK TO TODAY', onQuit: (game) => game.setScene(new DailyScene(game)), onEnd: (game, p1Won, scene) => {
            if (RF.towerModsOff) RF.towerModsOff();
            const score = RF.daily.score(scene), rec = RF.daily.record(c.key, score, p1Won);
            if (p1Won && rec.first && RF.records.unlock) RF.records.unlock('daily');
            game.setScene(new DailyScene(game, { won: p1Won, score, first: rec.first, better: rec.better }));
          } } }));
      }
    }
    render(ctx) {
      const c = this.card, t = this.t, day = RF.daily.today(), streak = RF.daily.streak();
      RF.drawMenuBackdrop(ctx, t, 0.86);
      RF.drawTitle(ctx, 'DAILY FIGHT', 8, 2);
      T(ctx, c.key, W - 10, 12, { align: 'right', color: '#a08878', outline: '#000' });
      // the stage, behind the two of them
      if (this.stageR === null) { try { this.stageR = new RF.StageRenderer(RF.getStage(c.stage)); } catch (e) { this.stageR = false; } }
      const px = 62, py = 34, pw = 260, ph = 100;
      RF.drawPanel(ctx, px - 2, py - 2, pw + 4, ph + 4, '#8a3a20');
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      if (this.stageR) { ctx.save(); ctx.translate(px, py - 40); ctx.scale(pw / W, pw / W); try { this.stageR.draw(ctx, t); } catch (e) { this.stageR = false; } ctx.restore(); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py, pw, ph);
      [[c.me, 0, px + 70, 1], [c.foe, 1, px + pw - 70, -1]].forEach(([def, i, x, dir]) => { const k = Math.min(1, 84 / def.body.height); ctx.save(); ctx.translate(x, py + ph - 4); ctx.scale(k, k); this.sprites[i].draw(ctx, 'idle', Math.floor(t / 18) % 2, 0, 0, dir); ctx.restore(); });
      ctx.restore();
      T(ctx, 'VS', W / 2, py + 40, { scale: 3, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      T(ctx, 'YOU ARE', px + 6, py + 5, { color: '#ffd030', outline: '#000' });
      T(ctx, c.me.name.toUpperCase(), px + 6, py + 14, { color: '#ffffff', outline: '#000' });
      T(ctx, 'AGAINST', px + pw - 6, py + 5, { align: 'right', color: '#ff6050', outline: '#000' });
      T(ctx, c.foe.name.toUpperCase(), px + pw - 6, py + 14, { align: 'right', color: '#ffffff', outline: '#000' });
      // where, and under what rule
      T(ctx, c.stageName.toUpperCase(), W / 2, 142, { align: 'center', color: '#ffe0a0', outline: '#000' });
      T(ctx, "TODAY'S RULE: " + c.rule.name, W / 2, 154, { align: 'center', color: '#ffd030', outline: '#000' });
      T(ctx, c.rule.rule + ' HARD CPU.', W / 2, 164, { align: 'center', color: '#c8b0a0', outline: '#000' });
      // how you have done
      const best = day.best == null ? 'NOT PLAYED YET' : 'YOUR BEST TODAY: ' + day.best + (day.won ? '' : ' (NOT WON YET)');
      T(ctx, best + (day.tries ? '   TRIES: ' + day.tries : ''), W / 2, 178, { align: 'center', color: day.won ? '#80ffb0' : '#ffffff', outline: '#000' });
      T(ctx, streak ? 'DAYS WON IN A ROW: ' + streak : 'WIN IT TO START A STREAK.', W / 2, 188, { align: 'center', color: streak ? '#ffd030' : '#a08878', outline: '#000' });
      if (this.result) { const r = this.result, txt = r.won ? (r.better ? 'NEW BEST: ' + r.score + '!' : 'SCORE: ' + r.score) : 'SCORE: ' + r.score + '. NOT TODAY.'; const tw = RF.font.textWidth(txt, 2) + 16; ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(W / 2 - tw / 2, 78, tw, 20); T(ctx, txt, W / 2, 81, { scale: 2, align: 'center', color: r.won ? '#80ffb0' : '#ff6050', outline: '#000' }); }
      T(ctx, 'ENTER: FIGHT    ESC: BACK    SAME FIGHT FOR EVERYONE TODAY', W / 2, 208, { align: 'center', color: t % 50 < 36 ? '#ffffff' : '#a08878', outline: '#000' });
    }
  }

  RF.WinnerStaysSetupScene = WinnerStaysSetupScene;
  RF.WinnerStaysScene = WinnerStaysScene;
  RF.DailyScene = DailyScene;
})();
