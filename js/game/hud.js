// Health bars, timer, names and round-win markers. Both bars are always the
// same size and fill relative to each fighter's own starting health; the number
// on the bar shows health as a percentage (tanks start at 175%).
(function () {
  const BAR_W = 150, BAR_H = 9, BAR_Y = 12, MARGIN = 14;
  const T = (...a) => RF.font.drawText(...a);
  // Combo announcer: the bigger the combo, the louder the praise.
  const PRAISE = [[12, 'TERRAMANIA!!'], [9, 'INSANE!'], [7, 'SAVAGE!'], [5, 'BRUTAL!'], [3, 'NICE!']];
  const METER_W = 96, METER_H = 5;

  class HUD {
    constructor() { this.trail = [1, 1]; }

    reset() { this.trail = [1, 1]; }

    update(fighters) {
      fighters.forEach((f, i) => {
        const pct = f.health / f.maxHealth;
        // Red "damage trail" catches up with the yellow bar after a moment.
        if (this.trail[i] > pct) this.trail[i] = Math.max(pct, this.trail[i] - 0.006);
        else this.trail[i] = pct;
      });
    }

    draw(ctx, scene) {
      const W = RF.CONFIG.WIDTH;
      scene.fighters.forEach((f, i) => {
        const pct = f.health / f.maxHealth;
        const x = i === 0 ? MARGIN : W - MARGIN - BAR_W;
        // Player 1's bar drains toward the left edge, player 2's toward the right.
        const fillW = (p) => Math.round(BAR_W * p);
        const fillX = (p) => (i === 0 ? x : x + BAR_W - fillW(p));

        ctx.fillStyle = '#000';
        ctx.fillRect(x - 2, BAR_Y - 2, BAR_W + 4, BAR_H + 4);
        ctx.fillStyle = '#c8a040';
        ctx.fillRect(x - 1, BAR_Y - 1, BAR_W + 2, BAR_H + 2);
        ctx.fillStyle = '#300808';
        ctx.fillRect(x, BAR_Y, BAR_W, BAR_H);
        ctx.fillStyle = '#e02020';
        ctx.fillRect(fillX(this.trail[i]), BAR_Y, fillW(this.trail[i]), BAR_H);
        const low = pct < 0.25 && Math.floor(scene.frame / 8) % 2;
        ctx.fillStyle = low ? '#ff8040' : '#f8d838';
        ctx.fillRect(fillX(pct), BAR_Y, fillW(pct), BAR_H);
        ctx.fillStyle = low ? '#ffc080' : '#fff4a0';
        ctx.fillRect(fillX(pct), BAR_Y, fillW(pct), 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(fillX(pct), BAR_Y + BAR_H - 2, fillW(pct), 2);
        // Health percentage on the outer end of the bar
        const label = Math.ceil(f.health) + '%';
        T(ctx, label, i === 0 ? x + 3 : x + BAR_W - 3, BAR_Y + 1, { align: i === 0 ? 'left' : 'right', color: '#ffffff', outline: '#000' });

        // Name + round wins
        const nameOpts = { color: '#ffffff', outline: '#000', align: i === 0 ? 'left' : 'right' };
        T(ctx, f.def.name, i === 0 ? x : x + BAR_W, BAR_Y + BAR_H + 4, nameOpts);
        for (let r = 0; r < (scene.roundsToWin || RF.CONFIG.ROUNDS_TO_WIN); r++) {
          const px = i === 0 ? x + BAR_W - 8 - r * 10 : x + r * 10 + 1;
          ctx.fillStyle = '#000';
          ctx.fillRect(px - 1, BAR_Y + BAR_H + 4, 9, 9);
          ctx.fillStyle = r < scene.wins[i] ? '#f8d838' : '#402020';
          ctx.fillRect(px, BAR_Y + BAR_H + 5, 7, 7);
        }
      });

      // Combo counter under the attacker's health bar.
      const c = scene.comboText;
      if (c && (c.t > 15 || c.t % 4 < 2)) {
        const pop = c.t > 62 ? 1 : 0, cx = c.side === 0 ? MARGIN : W - MARGIN, align = c.side === 0 ? 'left' : 'right';
        T(ctx, c.hits + ' HITS!', cx, 40 - pop, {
          scale: 2, align, outline: '#200000',
          color: ['#fff8c0', '#fff070', '#ffd030', '#ffa020', '#ff7010', '#e04010', '#a02008'],
        });
        const praise = PRAISE.find(([n]) => c.hits >= n);
        if (c.air) T(ctx, 'AIR COMBO', cx, 57, { align, color: '#8ff0ff', outline: '#000' });
        if (praise) T(ctx, praise[1], cx, c.air ? 66 : 57, { align, outline: '#000', color: c.hits >= 9 ? (scene.frame % 6 < 3 ? '#ff4040' : '#ffd030') : '#ff9a40' });
      }

      // Super meters along the bottom.
      const H = RF.CONFIG.HEIGHT, MAX = RF.CONFIG.SUPER_MAX;
      scene.fighters.forEach((f, i) => {
        const x = i === 0 ? MARGIN : W - MARGIN - METER_W, y = H - 10;
        const full = f.meter >= MAX, BAR = RF.CONFIG.METER_BAR, bars = Math.floor(f.meter / BAR), nb = MAX / BAR;
        const SEG = (METER_W - (nb - 1) * 2) / nb;
        ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, METER_W + 4, METER_H + 4);
        for (let k = 0; k < nb; k++) { // one segment per bar, filling from the outside in
          const seg = i === 0 ? k : nb - 1 - k, sx = x + seg * (SEG + 2);
          const fill = Math.max(0, Math.min(1, (f.meter - k * BAR) / BAR)), w = Math.round(SEG * fill);
          ctx.fillStyle = '#1a2440'; ctx.fillRect(sx, y, SEG, METER_H);
          ctx.fillStyle = full ? (scene.frame % 10 < 5 ? '#ffffff' : '#ffd030') : fill >= 1 ? '#60c0ff' : '#2a6ab0';
          ctx.fillRect(i === 0 ? sx : sx + SEG - w, y, w, METER_H);
          if (fill >= 1) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(sx, y, SEG, 1); }
        }
        const label = full ? 'SUPER! LIGHT+HEAVY' : bars >= 2 ? bars + ' BARS: EX / BREAKER' : bars === 1 ? '1 BAR: EX' : 'METER';
        T(ctx, label, i === 0 ? x : x + METER_W, y - 10, { align: i === 0 ? 'left' : 'right', color: full ? '#ffd030' : '#8ab0e0', outline: '#000' });
      });

      const secs = Math.max(0, Math.ceil(scene.timer / RF.CONFIG.FPS));
      T(ctx, Number.isFinite(secs) ? String(secs).padStart(2, '0') : '--', W / 2, BAR_Y - 3, {
        scale: 2, align: 'center', outline: '#000',
        color: secs <= 10 ? '#ff4040' : '#ffffff',
      });
    }
  }

  RF.HUD = HUD;
})();
