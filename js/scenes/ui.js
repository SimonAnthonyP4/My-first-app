// Shared bits for menu screens: menu keys, a vertical list menu, backdrop, panels.
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const C = RF.CONTROLS;

  // Archetype tag + colour, shown on the main menu and character select.
  RF.ARCHETYPES = { tank: ['TANK', '#ff9a40'], light: ['LIGHT', '#60e0ff'], boss: ['BOSS', '#ffd040'], balanced: ['ALL-ROUND', '#80e080'], sorcerer: ['SORCERER', '#ff70b0'], rich: ['RICH KID', '#60d060'], angel: ['ANGEL', '#fff2a0'], defender: ['DEFENSIVE', '#80c0ff'], boxer: ['BOXER', '#ff6050'] };

  RF.TITLE_COLORS = ['#fff8c0', '#fff070', '#ffd030', '#ffa020', '#ff7010', '#e04010', '#a02008'];

  // Menus accept either player's keys, plus Enter/Space/Escape.
  const MENU_KEYS = {
    up: [...C.p1.up, ...C.p2.up],
    down: [...C.p1.down, ...C.p2.down],
    left: [...C.p1.left, ...C.p2.left],
    right: [...C.p1.right, ...C.p2.right],
    confirm: ['Enter', 'NumpadEnter', 'Space', ...C.p1.light, ...C.p2.light, 'Pad1Cross', 'Pad2Cross'],
    back: ['Escape', 'Backspace', ...C.p1.block, ...C.p2.block],
  };
  RF.menuPressed = (kb, action) => kb.justPressed(...MENU_KEYS[action]);

  // items: [{ label, onSelect?, setting? }] — a `setting` (from RF.SETTINGS)
  // shows its value and changes with left/right.
  class ListMenu {
    constructor(items) {
      this.items = items;
      this.index = 0;
    }

    update(kb) {
      const n = this.items.length;
      const before = this.index;
      if (RF.menuPressed(kb, 'up')) this.index = (this.index - 1 + n) % n;
      if (RF.menuPressed(kb, 'down')) this.index = (this.index + 1) % n;
      if (this.index !== before) RF.audio.sfx('move');
      const item = this.items[this.index];
      if (item.setting) {
        const left = RF.menuPressed(kb, 'left'), right = RF.menuPressed(kb, 'right') || RF.menuPressed(kb, 'confirm');
        if (left) RF.settings.cycle(item.setting, -1);
        if (right) RF.settings.cycle(item.setting, 1);
        if (left || right) RF.audio.sfx('move');
      } else if (RF.menuPressed(kb, 'confirm') && item.onSelect) {
        RF.audio.sfx('select');
        item.onSelect();
      }
    }

    draw(ctx, x, y, t, opts = {}) {
      const spacing = opts.spacing || 14;
      this.items.forEach((item, i) => {
        const sel = i === this.index;
        const color = sel ? '#ffd030' : '#b8a8a0';
        const yy = y + i * spacing;
        if (item.setting) {
          T(ctx, item.label, x - 8, yy, { align: 'right', color, outline: '#000' });
          const v = RF.settings.valueLabel(item.setting);
          T(ctx, sel ? '< ' + v + ' >' : v, x + 8, yy, { color: sel ? '#ffffff' : '#d8c8c0', outline: '#000' });
        } else {
          T(ctx, item.label, x, yy, { align: 'center', color, outline: '#000', scale: opts.scale || 1 });
          if (sel) {
            const w = RF.font.textWidth(item.label, opts.scale || 1);
            const bob = Math.floor(t / 8) % 2;
            T(ctx, '>', x - w / 2 - 12 - bob, yy + ((opts.scale || 1) - 1) * 3, { color: '#ff5020', outline: '#000' });
            T(ctx, '<', x + w / 2 + 6 + bob, yy + ((opts.scale || 1) - 1) * 3, { color: '#ff5020', outline: '#000' });
          }
        }
      });
    }
  }
  RF.ListMenu = ListMenu;

  // Darkened, animated first stage behind all menus.
  let backdrop = null;
  RF.drawMenuBackdrop = (ctx, t, darkness = 0.6) => {
    if (!backdrop) backdrop = new RF.StageRenderer(RF.STAGES[0]);
    backdrop.draw(ctx, t);
    ctx.fillStyle = `rgba(8,0,0,${darkness})`;
    ctx.fillRect(0, 0, RF.CONFIG.WIDTH, RF.CONFIG.HEIGHT);
  };

  RF.drawPanel = (ctx, x, y, w, h, border = '#6a2a1a') => {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(14,4,4,0.92)';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  };

  // ---- Modern look helpers (main menu + character select) ----

  // Parallelogram leaning like "/": the top edge is shifted right by `skew`.
  RF.slantRect = (ctx, x, y, w, h, skew = 0) => {
    ctx.beginPath();
    ctx.moveTo(x + skew, y); ctx.lineTo(x + w + skew, y);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
  };

  // Italic (slanted) pixel text, for that fighting-game "action" type.
  RF.slantText = (ctx, text, x, y, opts = {}, skew = -0.22) => {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.transform(1, 0, skew, 1, 0, 0);
    T(ctx, text, 0, 0, opts);
    ctx.restore();
  };

  // Dark backdrop with diagonal speed stripes and rising embers.
  // opts: { x, w, dir (stripe direction), color (stripe rgb), base: [top, bottom] }
  RF.drawSpeedBackdrop = (ctx, t, opts = {}) => {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
    const x0 = opts.x || 0, w = opts.w || W, dir = opts.dir || 1, rgb = opts.color || '255,40,50';
    const base = opts.base || ['#16040a', '#040002'];
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, 0, w, H); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, base[0]); g.addColorStop(1, base[1]);
    ctx.fillStyle = g; ctx.fillRect(x0, 0, w, H);
    // speed stripes
    const span = w + 160;
    for (let i = 0; i < 9; i++) {
      const off = (((i * 47 + t * dir * (1.2 + (i % 3) * 0.5)) % span) + span) % span;
      ctx.fillStyle = `rgba(${rgb},${0.04 + (i % 4) * 0.025})`;
      RF.slantRect(ctx, x0 + off - 100, 0, 6 + (i % 3) * 8, H, 70);
    }
    // embers drifting up
    for (let k = 0; k < 34; k++) {
      const sp = 0.35 + (k % 7) * 0.12;
      const ey = H - ((t * sp + k * 41) % (H + 16)) + 8;
      const ex = x0 + ((k * 73 + Math.sin((t + k * 20) / 30) * 6) % w + w) % w;
      ctx.globalAlpha = 0.35 + (k % 5) * 0.12;
      ctx.fillStyle = k % 3 ? `rgb(${rgb})` : '#ffd040';
      ctx.fillRect(Math.round(ex), Math.round(ey), k % 4 ? 1 : 2, 1);
    }
    ctx.restore();
  };

  // Faint CRT scanlines + dark vignette over the whole screen.
  let scan = null;
  RF.drawScreenFinish = (ctx) => {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
    if (!scan) {
      const [c, x] = RF.util.makeCanvas(W, H);
      x.fillStyle = 'rgba(0,0,0,0.13)';
      for (let y = 0; y < H; y += 2) x.fillRect(0, y, W, 1);
      const v = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
      x.fillStyle = v; x.fillRect(0, 0, W, H);
      scan = c;
    }
    ctx.drawImage(scan, 0, 0);
  };

  // Scrolling ticker bar along the bottom of the screen.
  RF.drawTicker = (ctx, t, text, color = '#ff3040') => {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
    ctx.fillStyle = '#000'; ctx.fillRect(0, H - 11, W, 11);
    ctx.fillStyle = color; ctx.fillRect(0, H - 12, W, 1);
    const tw = RF.font.textWidth(text);
    const off = (t * 0.6) % tw;
    for (let x = -off; x < W; x += tw) T(ctx, text, Math.round(x), H - 9, { color: '#d8c8c8' });
  };

  RF.drawTitle = (ctx, text, y, scale = 2) => {
    T(ctx, text, RF.CONFIG.WIDTH / 2, y, { scale, align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
  };
})();
