// Short-lived visual effects (hit sparks, block flashes).
(function () {
  const STYLES = {
    hit: { life: 12, colors: ['#ffffff', '#fff27a', '#ff9a20', '#d02000'], rays: 8, len: 14 },
    heavy: { life: 16, colors: ['#ffffff', '#fff27a', '#ff9a20', '#d02000'], rays: 10, len: 22 },
    block: { life: 10, colors: ['#ffffff', '#a8e0ff', '#4a90ff', '#2040a0'], rays: 6, len: 10 },
  };

  class Effects {
    constructor() { this.list = []; }

    spawn(type, x, y) {
      this.list.push({ type, x, y, t: 0, seed: Math.random() * 100 });
    }

    clear() { this.list.length = 0; }

    update() {
      for (const e of this.list) e.t++;
      this.list = this.list.filter((e) => e.t < STYLES[e.type].life);
    }

    draw(ctx, floorY) {
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
