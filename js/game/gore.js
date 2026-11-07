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
      this.pieces = [];  // big pieces of a dismembered victim (heads, halves, skeletons)
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
    chunks(def, x, y, n = 6, power = 1, colors = null) {
      if (!this.on) return;
      const pal = (def.def.sprite && def.def.sprite.palette) || {};
      const cols = colors || Object.entries(pal).filter(([k]) => /^(skin|col|shirt|coat|pants|hair)/.test(k)).map(([, v]) => v);
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
      for (const pc of this.pieces) this.updatePiece(pc);
      this.pieces = this.pieces.filter((pc) => !pc.dead);
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
      for (const pc of this.pieces) this.drawPiece(ctx, pc, floorY);
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

  // ---------------------------------------------------------------- DISMEMBERMENT
  // At a fatality's climax the victim is snapshotted and taken apart (see RF.FATALITY_STYLE).
  const BONE = '#e8e0c8', BONE_D = '#3a2a20';

  // The victim's current look as a canvas, plus the box around their pixels.
  function snapshot(vic) {
    const S = 260, [c, x] = RF.util.makeCanvas(S, S), footY = S - 10;
    vic.sprite.draw(x, 'hit', 0, S / 2, footY, vic.facing);
    const d = x.getImageData(0, 0, S, S).data;
    let x0 = S, x1 = 0, y0 = S, y1 = 0;
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) if (d[(yy * S + xx) * 4 + 3] > 40) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
    if (x1 < x0) { x0 = S / 2 - 10; x1 = S / 2 + 10; y0 = footY - 60; y1 = footY; }
    const sp = vic.def.sprite || {}, U = sp.scale || 1;
    const neck = sp.type === 'pixel' && sp.neckRow ? Math.min(y1 - 10, y0 + sp.neckRow * U) : y0 + Math.round((y1 - y0) * 0.22);
    return { c, x0, x1, y0, y1, footY, cx: S / 2, neck };
  }
  function crop(src, x, y, w, h) {
    const [c, cx] = RF.util.makeCanvas(Math.max(1, w), Math.max(1, h));
    cx.drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  }
  // A pixel skeleton the size of the victim.
  function skeleton(w, h) {
    const [c, x] = RF.util.makeCanvas(w, h), m = w / 2;
    const L = (x0, y0, x1, y1) => { x.strokeStyle = BONE_D; x.lineWidth = 4; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.strokeStyle = BONE; x.lineWidth = 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
    const sk = Math.max(5, h * 0.07);
    L(m, sk * 2, m, h * 0.55);                                                       // spine
    for (let i = 0; i < 4; i++) L(m - w * 0.22, h * 0.24 + i * h * 0.05, m + w * 0.22, h * 0.24 + i * h * 0.05); // ribs
    L(m - w * 0.25, h * 0.2, m - w * 0.33, h * 0.5); L(m + w * 0.25, h * 0.2, m + w * 0.33, h * 0.5); // arms
    L(m - w * 0.18, h * 0.55, m + w * 0.18, h * 0.55);                                // pelvis
    L(m - w * 0.14, h * 0.55, m - w * 0.16, h - 2); L(m + w * 0.14, h * 0.55, m + w * 0.16, h - 2); // legs
    x.fillStyle = BONE_D; x.beginPath(); x.arc(m, sk + 1, sk + 1, 0, Math.PI * 2); x.fill();   // skull
    x.fillStyle = BONE; x.beginPath(); x.arc(m, sk + 1, sk, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111'; x.fillRect(m - sk * 0.5, sk * 0.8, 2, 2); x.fillRect(m + sk * 0.5 - 2, sk * 0.8, 2, 2); x.fillRect(m - 1, sk * 1.4, 2, 1);
    return c;
  }
  const piece = (img, x, y, extra) => Object.assign({ img, w: img.width, h: img.height, x, y, vx: 0, vy: 0, r: 0, vr: 0, mode: 'fly', t: 0, alpha: 1 }, extra);

  // Take the victim apart. style: decapitate | split | crush | skeleton | explode
  Gore.prototype.dismember = function (vic, att, style) {
    if (!this.on) return false;
    const snap = snapshot(vic), dir = Math.sign(vic.x - att.x) || 1, base = vic.y;
    const wx = (sx) => vic.x + (sx - snap.cx);          // snapshot x -> world x
    const bw = snap.x1 - snap.x0 + 1, bh = snap.footY - snap.y0;
    const mid = snap.y0 + bh * 0.5;
    vic.dismembered = true;
    if (style === 'decapitate') {
      const hh = snap.neck - snap.y0;
      const head = crop(snap.c, snap.x0, snap.y0, bw, hh), body = crop(snap.c, snap.x0, snap.neck, bw, snap.footY - snap.neck);
      this.pieces.push(piece(head, wx(snap.x0 + bw / 2), base + snap.footY - snap.neck, { vx: dir * 2.6, vy: 8, vr: dir * 0.35 }));
      this.pieces.push(piece(body, wx(snap.x0 + bw / 2), base, { mode: 'topple', delay: 45, dir: -dir, fountain: true }));
      this.burst(vic.x, base + snap.footY - snap.neck, dir, 3);
    } else if (style === 'split') {
      const half = Math.round(bw / 2), L = crop(snap.c, snap.x0, snap.y0, half, bh), R = crop(snap.c, snap.x0 + half, snap.y0, bw - half, bh);
      this.pieces.push(piece(L, wx(snap.x0 + half / 2), base, { mode: 'topple', delay: 14, dir: -1, fountain: true }));
      this.pieces.push(piece(R, wx(snap.x0 + half + (bw - half) / 2), base, { mode: 'topple', delay: 14, dir: 1, fountain: true }));
      for (let i = 0; i < 6; i++) this.burst(vic.x, base + bh * (i / 6), 0, 0.8);
    } else if (style === 'crush') {
      const body = crop(snap.c, snap.x0, snap.y0, bw, bh);
      this.pieces.push(piece(body, vic.x, 0, { mode: 'crush' }));
      this.burst(vic.x, 4, -1, 3); this.burst(vic.x, 4, 1, 3); this.pool(vic.x, 2.6);
    } else if (style === 'skeleton') {
      const body = crop(snap.c, snap.x0, snap.y0, bw, bh);
      this.pieces.push(piece(skeleton(bw, bh), vic.x, base, { mode: 'stand', crumble: 70 }));
      this.pieces.push(piece(body, vic.x, base, { mode: 'melt' }));     // the flesh burns away on top
      this.burst(vic.x, base + bh * 0.6, dir, 2);
    } else { // explode: four big pieces, plus everything else
      const hw = Math.round(bw / 2), hh = Math.round(bh / 2);
      for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const img = crop(snap.c, snap.x0 + qx * hw, snap.y0 + qy * hh, hw, hh);
        this.pieces.push(piece(img, wx(snap.x0 + qx * hw + hw / 2), base + (1 - qy) * hh, { vx: (qx ? 1 : -1) * (2 + Math.random() * 3), vy: 5 + Math.random() * 5 + (1 - qy) * 3, vr: (Math.random() - 0.5) * 0.5 }));
      }
      this.chunks(vic, vic.x, base + bh / 2, 30, 1.7);
      this.burst(vic.x, base + bh / 2, 0, 6);
      this.pool(vic.x, 2.4);
    }
    return true;
  };

  Gore.prototype.updatePiece = function (pc) {
    pc.t++;
    if (pc.mode === 'fly' || pc.mode === 'falling') {
      pc.vy -= 0.32; pc.x += pc.vx; pc.y += pc.vy; pc.r += pc.vr;
      if (pc.t % 3 === 0 && pc.t < 50) this.burst(pc.x, pc.y + pc.h * 0.3, 0, 0.25); // trailing blood
      if (pc.y <= 0 && pc.vy < 0) {
        pc.y = 0; pc.vy *= -0.3; pc.vx *= 0.5; pc.vr *= 0.4;
        this.burst(pc.x, 1, 0, 0.5);
        if (Math.abs(pc.vy) < 1.2) { pc.mode = 'rest'; pc.vy = 0; const lie = Math.abs(Math.sin(pc.r)) > 0.7; pc.r = lie ? Math.sign(Math.sin(pc.r)) * Math.PI / 2 : 0; pc.y = lie ? pc.w / 2 : 0; this.pool(pc.x, 0.6); }
      }
    } else if (pc.mode === 'topple') {
      if (pc.fountain && pc.t % 3 === 0 && pc.t < pc.delay + 30) this.burst(pc.x + Math.sin(pc.r) * pc.h, pc.y + Math.cos(pc.r) * pc.h, -pc.dir * 0.2, 0.5); // blood fountain from the cut
      if (pc.t > pc.delay) {
        pc.vr = (pc.vr || 0.01) + 0.006; pc.r += pc.dir * pc.vr;
        if (Math.abs(pc.r) >= Math.PI / 2) { pc.r = pc.dir * Math.PI / 2; pc.mode = 'rest'; this.burst(pc.x + pc.dir * pc.h * 0.5, 2, 0, 1); this.pool(pc.x + pc.dir * pc.h * 0.4, 1.4); }
        pc.y = (pc.w / 2) * Math.abs(Math.sin(pc.r));
      }
    } else if (pc.mode === 'melt') {
      pc.alpha = Math.max(0, 1 - pc.t / 34);
      if (pc.t % 4 === 0 && pc.alpha > 0) this.burst(pc.x, pc.y + pc.h * Math.random(), 0, 0.3);
      if (pc.alpha <= 0) pc.dead = true;
    } else if (pc.mode === 'stand' && pc.t === pc.crumble) { // the skeleton collapses into a pile of bones
      pc.dead = true;
      this.chunks({ def: {} }, pc.x, pc.y + pc.h * 0.5, 18, 0.7, [BONE, BONE, '#c8c0a8']);
      const skull = crop(pc.img, 0, 0, pc.w, Math.round(pc.h * 0.16));
      this.pieces.push(piece(skull, pc.x, pc.y + pc.h * 0.84, { vx: (Math.random() - 0.5) * 3, vy: 3, vr: 0.2 }));
    } else if (pc.mode === 'crush') {
      pc.sq = Math.min(1, pc.t / 6);
    }
  };

  Gore.prototype.drawPiece = function (ctx, pc, floorY) {
    ctx.save();
    ctx.translate(Math.round(pc.x), Math.round(floorY - pc.y));
    if (pc.mode === 'crush') { // squashed flat into the floor
      const k = pc.sq || 0;
      ctx.scale(1 + k * 0.6, 1 - k * 0.86);
      ctx.drawImage(pc.img, -pc.w / 2, -pc.h);
      ctx.restore();
      return;
    }
    ctx.rotate(pc.r);
    if (pc.mode === 'melt') { // burning away: darker and redder as it fades
      ctx.globalAlpha = pc.alpha;
      ctx.drawImage(pc.img, -pc.w / 2, -pc.h);
      ctx.globalAlpha = (1 - pc.alpha) * 0.8 * pc.alpha * 2;
      ctx.fillStyle = '#7a0606'; ctx.fillRect(-pc.w / 2, -pc.h, pc.w, pc.h);
    } else {
      ctx.drawImage(pc.img, -pc.w / 2, -pc.h);
    }
    ctx.restore();
  };

  // How each fatality takes the victim apart at its climax.
  RF.FATALITY_STYLE = {
    pileDriver: 'crush', venomMelt: 'skeleton', overcharge: 'skeleton', failingGrade: 'split',
    libertyBell: 'crush', havanaClassic: 'explode', specimenJar: 'explode', exitBear: 'split',
    royalDecree: 'decapitate', annexation: 'split', eightLimbs: 'decapitate', bulkOrder: 'crush',
    boughtOut: 'crush', masterpiece: 'decapitate', impeachment: 'crush', finalBell: 'decapitate',
    teeTime: 'explode', lastDrag: 'skeleton', mindBlown: 'explode', grandFinale: 'crush',
  };

  // The big moment of each fatality (frame of the finisher): the victim gets a huge
  // burst of blood and chunks there, blood hits the screen and it pools under them.
  RF.FATALITY_CLIMAX = {
    pileDriver: 44, venomMelt: 70, overcharge: 105, failingGrade: 132, libertyBell: 70,
    havanaClassic: 84, specimenJar: 62, exitBear: 90, royalDecree: 112, annexation: 84,
    eightLimbs: 110, bulkOrder: 94, boughtOut: 110, masterpiece: 130, impeachment: 120,
    finalBell: 90, teeTime: 80, lastDrag: 130, mindBlown: 100, grandFinale: 130,
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
