// GORE: pixel blood and chunks for finishers (fatalities) and brutalities.
// Every finisher gets it automatically: whenever a finisher plays an impact sound
// (hit, heavy, boom, stomp...), the victim sprays blood; explosions blow chunks
// off them and splatter the screen. Blood that lands stains the floor and pools.
// Turn it off in Settings -> BLOOD.
(function () {
  const REDS = ['#8a0808', '#b01010', '#d01818', '#600404'];
  const IMPACT = { hit: 1, heavy: 2, stomp: 2, clang: 2, zap: 1, bolt: 2, ko: 3, gong: 2, boom: 4, roar: 1, scream: 1 };

  class Gore {
    constructor() { this.reset(); }

    reset() {
      this.drops = [];   // flying blood droplets
      this.gibs = [];    // flying chunks of the victim
      this.stains = [];  // splats on the floor
      this.screen = [];  // blood on the "camera"
    }

    get on() { return RF.CONFIG.BLOOD !== false; }

    // A spray of blood from (x, y) (y = height above the floor), mostly in direction dir.
    burst(x, y, dir = 0, power = 1) {
      if (!this.on) return;
      const n = Math.round(14 * power);
      for (let i = 0; i < n && this.drops.length < 700; i++) {
        const a = (Math.random() - 0.5) * 2.4, sp = (1.5 + Math.random() * 3.5) * Math.sqrt(power);
        this.drops.push({
          x, y, vx: Math.sin(a) * sp + dir * Math.random() * 2.5 * power, vy: Math.cos(a) * sp * 0.9 + 1.5,
          s: Math.random() < 0.25 ? 2 : 1, c: REDS[(Math.random() * REDS.length) | 0],
        });
      }
    }

    // Chunks of the victim (coloured from their own sprite) flying off.
    chunks(def, x, y, n = 6, power = 1) {
      if (!this.on) return;
      const pal = (def.def.sprite && def.def.sprite.palette) || {};
      const cols = Object.entries(pal).filter(([k]) => /^(skin|col|shirt|coat|pants|hair)/.test(k)).map(([, v]) => v);
      for (let i = 0; i < n && this.gibs.length < 80; i++) {
        this.gibs.push({
          x, y, vx: (Math.random() - 0.5) * 7 * power, vy: 3 + Math.random() * 5 * power,
          r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.6,
          w: 2 + ((Math.random() * 4) | 0), h: 2 + ((Math.random() * 3) | 0),
          c: cols.length && Math.random() < 0.7 ? cols[(Math.random() * cols.length) | 0] : REDS[1],
        });
      }
    }

    // A pool of blood spreading under someone.
    pool(x, size = 1) { if (this.on) this.stains.push({ x, w: 4, max: 26 * size, grow: 0.6, h: 2 }); }

    // Blood splattered across the screen.
    splatter(n = 6) {
      if (!this.on) return;
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;
      for (let i = 0; i < n; i++) this.screen.push({ x: Math.random() * W, y: Math.random() * H * 0.7, r: 3 + Math.random() * 8, drip: 0, len: 6 + Math.random() * 30, life: 220 + Math.random() * 120 });
    }

    // Called with every sound a finisher plays: impacts spray blood.
    impact(name, vic, att) {
      const p = IMPACT[name];
      if (!p || !this.on) return;
      const y = vic.y + vic.body.height * (0.45 + Math.random() * 0.3), dir = Math.sign(vic.x - att.x) || 1;
      this.burst(vic.x, y, dir, p * 0.8);
      if (p >= 2) this.chunks(vic, vic.x, y, p * 2, p * 0.5);
      if (p >= 3) { this.splatter(p * 2); this.pool(vic.x, 1.2); }
    }

    update() {
      for (const d of this.drops) {
        d.vy -= 0.28; d.x += d.vx; d.y += d.vy;
        if (d.y <= 0) { d.dead = true; if (this.stains.length < 260) this.stains.push({ x: d.x, w: 1 + d.s + ((Math.random() * 3) | 0), max: 0, h: 1 }); }
      }
      this.drops = this.drops.filter((d) => !d.dead);
      for (const g of this.gibs) {
        if (g.rest) continue;
        g.vy -= 0.3; g.x += g.vx; g.y += g.vy; g.r += g.vr;
        if (g.y <= 0) { // bounce, then settle with a little splat
          g.y = 0; g.vy *= -0.3; g.vx *= 0.5; g.vr *= 0.5;
          if (Math.abs(g.vy) < 0.8) { g.rest = true; g.vy = 0; this.stains.push({ x: g.x, w: 3, max: 0, h: 1 }); }
        }
      }
      for (const s of this.stains) if (s.w < s.max) s.w += s.grow;
      for (const s of this.screen) { s.life--; if (s.drip < s.len) s.drip += 0.25; }
      this.screen = this.screen.filter((s) => s.life > 0);
    }

    // World-space: stains, chunks, droplets (inside the camera transform).
    draw(ctx, floorY) {
      if (!this.on) return;
      for (const s of this.stains) {
        ctx.fillStyle = s.max ? '#5a0404' : '#7a0606';
        ctx.fillRect(Math.round(s.x - s.w / 2), floorY - 1, Math.max(1, Math.round(s.w)), s.h + (s.max ? 1 : 0));
      }
      for (const g of this.gibs) {
        ctx.save(); ctx.translate(Math.round(g.x), Math.round(floorY - g.y)); ctx.rotate(g.r);
        ctx.fillStyle = '#300000'; ctx.fillRect(-g.w / 2 - 1, -g.h / 2 - 1, g.w + 2, g.h + 2);
        ctx.fillStyle = g.c; ctx.fillRect(-g.w / 2, -g.h / 2, g.w, g.h);
        ctx.fillStyle = REDS[2]; ctx.fillRect(-g.w / 2, -g.h / 2, 1, g.h);
        ctx.restore();
      }
      for (const d of this.drops) { ctx.fillStyle = d.c; ctx.fillRect(Math.round(d.x), Math.round(floorY - d.y), d.s, d.s + 1); }
    }

    // Screen-space: blood on the camera, dripping down.
    drawScreen(ctx) {
      if (!this.on) return;
      for (const s of this.screen) {
        ctx.globalAlpha = Math.min(1, s.life / 60) * 0.85;
        ctx.fillStyle = '#7a0606';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(Math.round(s.x - 1), Math.round(s.y), 2, Math.round(s.r + s.drip));
        ctx.fillStyle = '#a80c0c'; ctx.fillRect(Math.round(s.x - s.r / 3), Math.round(s.y - s.r / 3), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // The big moment of each fatality (frame of the finisher): the victim gets a huge
  // burst of blood and chunks there, blood hits the screen and it pools under them.
  RF.FATALITY_CLIMAX = {
    pileDriver: 44, venomMelt: 70, overcharge: 105, failingGrade: 132, libertyBell: 70,
    havanaClassic: 84, specimenJar: 62, exitBear: 90, royalDecree: 112, annexation: 84,
    eightLimbs: 110, bulkOrder: 94, boughtOut: 110, masterpiece: 130, impeachment: 120,
    finalBell: 90, teeTime: 80, lastDrag: 130,
  };

  Gore.prototype.climax = function (vic, att) {
    if (!this.on) return;
    const y = vic.y + vic.body.height * 0.55, dir = Math.sign(vic.x - att.x) || 1;
    this.burst(vic.x, y, dir, 4);
    this.burst(vic.x, y * 0.6, -dir, 2);
    this.chunks(vic, vic.x, y, 18, 1.3);
    this.splatter(12);
    this.pool(vic.x, 2.2);
  };

  RF.Gore = Gore;
})();
