// Short-lived visual effects (hit sparks, block flashes).
(function () {
  const STYLES = {
    hit: { life: 12, colors: ['#ffffff', '#fff27a', '#ff9a20', '#d02000'], rays: 8, len: 14 },
    heavy: { life: 16, colors: ['#ffffff', '#fff27a', '#ff9a20', '#d02000'], rays: 10, len: 22 },
    block: { life: 10, colors: ['#ffffff', '#a8e0ff', '#4a90ff', '#2040a0'], rays: 6, len: 10 },
    perfect: { life: 24, colors: ['#ffffff', '#c8f8ff', '#8ff0ff', '#40b0ff', '#2060c0'], rays: 16, len: 34 },
    shock: { life: 18, colors: ['#fff0c0', '#d8a060', '#8a5a30', '#4a3020'], rays: 7, len: 26 },
  };

  class Effects {
    constructor() { this.list = []; this.texts = []; }

    spawn(type, x, y) {
      this.list.push({ type, x, y, t: 0, seed: Math.random() * 100 });
    }

    // Floating text (e.g. "PERFECT!") that rises and fades. delay = frames before it appears.
    spawnText(text, x, y, color, delay = 0) {
      this.texts.push({ text, x, y, color, t: -delay });
    }

    clear() { this.list.length = 0; this.texts.length = 0; }

    update() {
      for (const e of this.texts) e.t++;
      this.texts = this.texts.filter((e) => e.t < 70);
      for (const e of this.list) e.t++;
      this.list = this.list.filter((e) => e.t < STYLES[e.type].life);
    }

    draw(ctx, floorY) {
      const W = RF.CONFIG.WIDTH;
      for (const e of this.texts) {
        if (e.t < 0 || (e.t > 50 && e.t % 4 < 2)) continue;
        const w = RF.font.textWidth(e.text, 1);
        const x = Math.max(4 + w / 2, Math.min(W - 4 - w / 2, e.x));
        RF.font.drawText(ctx, e.text, x, floorY - e.y - Math.min(e.t, 20) * 0.6 - 7, { align: 'center', color: e.color, outline: '#000' });
      }
      for (const e of this.list) {
        const st = STYLES[e.type];
        const p = e.t / st.life;
        ctx.fillStyle = st.colors[Math.min(st.colors.length - 1, Math.floor(p * st.colors.length))];
        const sx = Math.round(e.x), sy = Math.round(floorY - e.y);
        if (e.t < 3) {
          const r = 3 + e.t * 2;
          ctx.fillRect(sx - r, sy - 1, r * 2, 3);
          ctx.fillRect(sx - 1, sy - r, 3, r * 2);
        }
        for (let i = 0; i < st.rays; i++) {
          const a = (i / st.rays) * Math.PI * 2 + e.seed;
          const r0 = st.len * p * 0.5, r1 = st.len * (0.3 + p * 0.7);
          for (let d = r0; d < r1; d += 1) {
            ctx.fillRect(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d), 1, 1);
          }
        }
      }
    }
  }

  RF.Effects = Effects;
})();
