// Character select: both players pick at the same time with their own keys.
// Shows bio, origin, stats and special for whoever each cursor is on.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384;
  const SLOTS = 8, COLS = 4, SLOT = 40, GAP = 4;
  const GRID_X = (W - (COLS * SLOT + (COLS - 1) * GAP)) / 2, GRID_Y = 18;
  const PCOL = ['#ff4a3a', '#4a8aff'];
  const ARCH = { tank: ['TANK', '#ff9a40'], light: ['LIGHT', '#60e0ff'] };

  // Stat bars normalised to 0..1 for display only.
  const STAT_BARS = [
    ['SPEED', (s) => s.walkSpeed / 3],
    ['POWER', (s) => (s.damage - 0.5) / 1],
    ['DEFENSE', (s) => (s.damageReduction + 0.3) / 0.6],
    ['ATK SPD', (s) => (s.attackSpeed - 0.5) / 1],
  ];

  class SelectScene {
    constructor(game, prev) {
      this.game = game;
      this.t = 0;
      // Fill up to 8 slots; empty ones are "coming soon" until the full roster lands.
      this.slots = [];
      for (let i = 0; i < Math.max(SLOTS, RF.CHARACTERS.length); i++) this.slots.push(RF.CHARACTERS[i] || null);
      const idx = (def, fallback) => (def ? Math.max(0, this.slots.findIndex((d) => d && d.id === def.id)) : fallback);
      this.cursor = [idx(prev && prev.p1, 0), idx(prev && prev.p2, 1)];
      this.ready = [false, false];
      this.readyTime = 0;
      this.inputs = [RF.CONTROLS.p1, RF.CONTROLS.p2];
      this.sprites = new Map();
    }

    sprite(def, alt) {
      const key = def.id + (alt ? ':alt' : '');
      if (!this.sprites.has(key)) this.sprites.set(key, RF.createSprite(alt ? RF.altCostume(def) : def));
      return this.sprites.get(key);
    }

    update() {
      const kb = this.game.kb;
      this.t++;
      if (kb.justPressed('Escape') && !this.ready[0] && !this.ready[1]) {
        return this.game.setScene(new RF.TitleScene(this.game));
      }
      for (let p = 0; p < 2; p++) {
        const m = this.inputs[p];
        const pressed = (a) => kb.justPressed(...m[a]);
        if (this.ready[p]) {
          if (pressed('block')) this.ready[p] = false;
          continue;
        }
        let c = this.cursor[p];
        const n = this.slots.length, rows = Math.ceil(n / COLS);
        if (pressed('left')) c = (c % COLS === 0) ? c + COLS - 1 : c - 1;
        if (pressed('right')) c = (c % COLS === COLS - 1) ? c - COLS + 1 : c + 1;
        if (pressed('up')) c = (c - COLS + rows * COLS) % (rows * COLS);
        if (pressed('down')) c = (c + COLS) % (rows * COLS);
        this.cursor[p] = Math.min(c, n - 1);
        if (pressed('light') && this.slots[this.cursor[p]]) this.ready[p] = true;
      }
      if (this.ready[0] && this.ready[1]) {
        if (++this.readyTime > 45) this.startFight();
      } else {
        this.readyTime = 0;
      }
    }

    startFight() {
      const p1 = this.slots[this.cursor[0]], p2 = this.slots[this.cursor[1]];
      this.game.setScene(new RF.VersusScene(this.game, { p1, p2, p2Alt: p1.id === p2.id, stage: RF.STAGES[0].id }));
    }

    render(ctx) {
      RF.drawMenuBackdrop(ctx, this.t, 0.72);
      T(ctx, 'SELECT YOUR FIGHTER', W / 2, 5, { align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });

      // Grid
      this.slots.forEach((def, i) => {
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 1, y - 1, SLOT + 2, SLOT + 2);
        ctx.fillStyle = def ? '#3a1410' : '#1a0a08';
        ctx.fillRect(x, y, SLOT, SLOT);
        if (def) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, SLOT, SLOT);
          ctx.clip();
          this.sprite(def).draw(ctx, 'idle', 0, x + SLOT / 2 - 2, y + 6 + def.body.height, 1);
          ctx.restore();
        } else {
          T(ctx, '?', x + SLOT / 2, y + SLOT / 2 - 7, { scale: 2, align: 'center', color: '#4a2a20' });
        }
      });
      // Cursors (P1 outer frame, P2 inner frame, so both show on the same slot)
      for (let p = 0; p < 2; p++) {
        const i = this.cursor[p];
        const x = GRID_X + (i % COLS) * (SLOT + GAP), y = GRID_Y + Math.floor(i / COLS) * (SLOT + GAP);
        const blink = this.ready[p] || Math.floor(this.t / 6) % 4 !== 0;
        if (!blink) continue;
        const o = p === 0 ? -2 : 1;
        ctx.strokeStyle = this.ready[p] ? '#ffd030' : PCOL[p];
        ctx.lineWidth = 2;
        ctx.strokeRect(x + o, y + o, SLOT - o * 2, SLOT - o * 2);
        T(ctx, 'P' + (p + 1), p === 0 ? x + 1 : x + SLOT - 1, y + SLOT - 9, { align: p === 0 ? 'left' : 'right', color: PCOL[p], outline: '#000' });
      }
      ctx.lineWidth = 1;

      // Big previews either side of the grid
      for (let p = 0; p < 2; p++) {
        const def = this.slots[this.cursor[p]];
        const x = p === 0 ? 52 : W - 52;
        if (!def) {
          T(ctx, '?', x, 50, { scale: 4, align: 'center', color: '#3a2018' });
          continue;
        }
        const alt = p === 1 && this.slots[this.cursor[0]] && this.slots[this.cursor[0]].id === def.id;
        const anim = this.ready[p] ? 'victory' : 'idle';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(x, 101, 22, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        this.sprite(def, alt).draw(ctx, anim, Math.floor(this.t / 18) % 2, x, 101, p === 0 ? 1 : -1);
      }

      for (let p = 0; p < 2; p++) this.drawInfo(ctx, p);

      const hint = this.ready[0] && this.ready[1] ? 'GET READY...' : 'LIGHT = SELECT - BLOCK = CANCEL - ESC = MENU';
      T(ctx, hint, W / 2, 214, { align: 'center', color: '#a08878', outline: '#000' });
    }

    drawInfo(ctx, p) {
      const def = this.slots[this.cursor[p]];
      const x = p === 0 ? 4 : W / 2 + 4, y = 106, w = W / 2 - 8, h = 104;
      RF.drawPanel(ctx, x, y, w, h, this.ready[p] ? '#c8a040' : PCOL[p]);
      const L = x + 6;
      if (!def) {
        T(ctx, '???', L, y + 6, { scale: 2, color: '#6a4a40', outline: '#000' });
        T(ctx, 'COMING SOON', L, y + 26, { color: '#a08878', outline: '#000' });
        T(ctx, 'THE FULL ROSTER OF 8 ARRIVES', L, y + 40, { color: '#806860', outline: '#000' });
        T(ctx, 'IN MILESTONE 6.', L, y + 49, { color: '#806860', outline: '#000' });
        return;
      }
      T(ctx, def.name, L, y + 4, { scale: 2, color: '#ffffff', outline: '#000' });
      const [arch, archCol] = ARCH[def.archetype] || [def.archetype.toUpperCase(), '#fff'];
      T(ctx, arch, x + w - 6, y + 8, { align: 'right', color: archCol, outline: '#000' });
      if (this.ready[p]) T(ctx, 'READY!', x + w - 6 - RF.font.textWidth(arch) - 8, y + 8, { align: 'right', color: '#ffd030', outline: '#000' });
      T(ctx, 'FROM: ' + def.origin, L, y + 20, { color: '#c8a888', outline: '#000' });
      RF.font.wrap(def.bio, 29).slice(0, 2).forEach((line, i) => T(ctx, line, L, y + 29 + i * 8, { color: '#e0d8d0' }));

      STAT_BARS.forEach(([label, fn], i) => {
        const sx = L + (i % 2) * 88, sy = y + 47 + Math.floor(i / 2) * 9;
        T(ctx, label, sx, sy, { color: '#a89080' });
        const v = Math.max(0.05, Math.min(1, fn(def.stats)));
        const bx = sx + 44, bw = 38;
        ctx.fillStyle = '#000';
        ctx.fillRect(bx, sy, bw, 6);
        ctx.fillStyle = '#ffd030';
        ctx.fillRect(bx + 1, sy + 1, Math.round((bw - 2) * v), 4);
      });

      const sp = RF.SPECIALS[def.special];
      T(ctx, 'SPECIAL: ' + sp.name, L, y + 67, { color: '#8ff0ff', outline: '#000' });
      RF.font.wrap(sp.description, 29).slice(0, 3).forEach((line, i) => T(ctx, line, L, y + 76 + i * 8, { color: '#d0d8e0' }));
    }
  }

  RF.SelectScene = SelectScene;
})();
