// The VERSUS screen: the chosen stage looms behind, the two sides slam in as slanted panels, the fighters are
// thrown in as silhouettes and light up, VS lands with a shockwave, the name plates slide in, and a pair
// of shutters closes along the split into the fight (which opens on a flash).
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const DURATION = 150, SLAM = 30, LIT = 24, OUT = 16;   // VS lands at SLAM; the fighters light up at LIT; the shutter takes OUT frames

  class VersusScene {
    constructor(game, opts) {
      this.game = game;
      this.opts = opts;
      this.t = 0;
      this.banter = RF.banterFor(opts.p1.id, opts.p2.id);
      this.duration = this.banter ? 230 : DURATION; this.shake = 0;
      const cos = opts.costumes || [0, opts.p2Alt ? 1 : 0];
      this.sprites = [RF.createSprite(RF.costume(opts.p1, cos[0])), RF.createSprite(RF.costume(opts.p2, cos[1]))];
      const tc = (opts.tag && opts.tag.costumes) || [0, 0];
      this.partners = opts.tag ? [RF.createSprite(RF.costume(opts.tag.p1b, tc[0])), RF.createSprite(RF.costume(opts.tag.p2b, tc[1]))] : null; // tag team
    }

    update() {
      this.t++;
      for (const s of this.sprites) if (s.warm) s.warm(2); // build the fight's frames during the intro (no hitch later)
      if (this.t === 6) RF.audio.sfx('whoosh');
      if (this.t === 12) RF.announcer.say(this.opts.tag ? 'TAG TEAM!' : this.opts.p1.name + ' versus ' + this.opts.p2.name, { rate: 0.9 });
      if (this.t === SLAM) { RF.audio.sfx('boom'); RF.audio.sfx('heavy'); this.shake = 12; }
      if (this.shake > 0) this.shake--;
      if (this.t > 20 && this.t < this.duration - OUT && RF.menuPressed(this.game.kb, 'confirm')) this.t = this.duration - OUT;   // skip: straight to the shutter
      if (this.t === this.duration - OUT) RF.audio.sfx('whoosh');
      if (this.t >= this.duration) { const fs = new RF.FightScene(this.game, this.opts); fs.flash = 9; this.game.setScene(fs); }
    }

    // the chosen stage, dark and slowly pushing in, behind everything
    drawStage(ctx, W, H) {
      if (this.stageR === undefined) { try { this.stageR = new RF.StageRenderer(RF.getStage(this.opts.stage)); } catch (e) { this.stageR = null; } }
      ctx.fillStyle = '#06030a'; ctx.fillRect(0, 0, W, H);
      if (!this.stageR) return;
      const z = 1.12 + this.t * 0.0012;
      ctx.save(); ctx.translate(W / 2, H * 0.62); ctx.scale(z, z); ctx.translate(-W / 2 + Math.sin(this.t / 90) * 4, -H * 0.62);
      try { this.stageR.draw(ctx, this.t); } catch (e) { this.stageR = null; }
      ctx.restore();
      ctx.fillStyle = 'rgba(4,2,10,0.5)'; ctx.fillRect(0, 0, W, H);
    }

    render(ctx) {
      const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT, t = this.t, ease = (u) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.6));
      this.drawStage(ctx, W, H);

      // the two sides: slanted panels of colour that slam in, with speed lines running through them
      const inU = ease((t - 2) / 16), off = (1 - inU) * 220;
      const panel = (p) => {
        const s = p === 0 ? -1 : 1, x0 = p === 0 ? -off : W + off;
        ctx.save(); ctx.beginPath();
        if (p === 0) { ctx.moveTo(x0, 0); ctx.lineTo(W / 2 + 26 - off, 0); ctx.lineTo(W / 2 - 34 - off, H); ctx.lineTo(x0, H); }
        else { ctx.moveTo(x0, 0); ctx.lineTo(W / 2 + 38 + off, 0); ctx.lineTo(W / 2 - 22 + off, H); ctx.lineTo(x0, H); }
        ctx.clip();
        const g = ctx.createLinearGradient(p === 0 ? 0 : W, 0, W / 2, 0);
        g.addColorStop(0, p === 0 ? 'rgba(150,14,10,0.86)' : 'rgba(12,40,150,0.86)'); g.addColorStop(1, p === 0 ? 'rgba(90,8,10,0.34)' : 'rgba(8,22,96,0.34)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = p === 0 ? 'rgba(255,120,90,0.16)' : 'rgba(110,170,255,0.16)';          // speed lines
        for (let i = 0; i < 14; i++) { const y = (i * 37 + 11) % H, len = 50 + (i * 53) % 90, x = ((t * (5 + i % 4) * -s + i * 71) % (W + 160) + W + 160) % (W + 160) - 80; ctx.fillRect(Math.round(x), y, len, 1 + (i % 3 === 0 ? 1 : 0)); }
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);   // scanlines
        ctx.restore();
      };
      panel(0); panel(1);

      // the seam: a bolt down the split once they have met
      if (t > 16) {
        const seed = Math.floor(t / 3), pts = [];
        for (let i = 0; i <= 10; i++) { const u = i / 10, r = Math.sin((seed * 12.9898 + i * 78.233)) * 43758.5453; pts.push([W / 2 + 32 - u * 60 + ((r - Math.floor(r)) - 0.5) * (i === 0 || i === 10 ? 0 : 12), u * H]); }
        for (const [col, w] of [['rgba(255,220,120,0.35)', 6], ['#ffe9a0', 2.5], ['#ffffff', 1]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
        ctx.lineWidth = 1;
      }
      // embers
      for (let i = 0; i < 26; i++) { const x = (i * 97 + 13) % W, sp = 0.5 + (i % 5) * 0.22, y = H - ((t * sp + i * 41) % (H + 20)); ctx.fillStyle = i % 3 ? 'rgba(255,170,60,0.75)' : 'rgba(255,240,180,0.85)'; ctx.fillRect(Math.round(x + Math.sin(t / 14 + i) * 5), Math.round(y), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1); }

      // the fighters: thrown in as silhouettes, a white flash, then in colour
      const defs = [this.opts.p1, this.opts.p2], fU = ease((t - 6) / 16), recoil = t >= SLAM && t < SLAM + 8 ? (SLAM + 8 - t) * 0.6 : 0;
      for (let p = 0; p < 2; p++) {
        const dir = p === 0 ? 1 : -1, x = (p === 0 ? 92 : W - 92) - dir * (1 - fU) * 190 - dir * recoil, fr = Math.floor(t / 20) % 2;
        const tint = t < LIT ? '#000000' : t < LIT + 5 ? '#ffffff' : undefined;
        const drawAt = (sp, dx, y, sc, col, a) => { ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(x + dx), y); ctx.scale(sc, sc); sp.draw(ctx, 'idle', fr, 0, 0, dir, col); ctx.restore(); };
        if (this.partners) { drawAt(this.partners[p], -dir * 50, 178, 1.25, '#000000', 1); drawAt(this.partners[p], -dir * 50, 178, 1.25, tint, t < LIT ? 0 : 0.7); }
        if (fU < 1) for (let i = 3; i >= 1; i--) drawAt(this.sprites[p], -dir * i * 16 * (1 - fU), 184, 1.9, p === 0 ? '#ff5040' : '#50a0ff', 0.22 - i * 0.05);   // afterimages
        if (t >= LIT) drawAt(this.sprites[p], -dir * 3, 185, 1.96, p === 0 ? '#ff5040' : '#50a0ff', 0.5);                                                  // a rim of their colour
        drawAt(this.sprites[p], 0, 184, 1.9, tint, 1);
      }
      ctx.restore();

      // VS: slams into the middle with a shockwave
      if (t >= SLAM - 4) {
        const k = Math.max(0, SLAM + 6 - t), sc = t < SLAM ? 12 - (t - (SLAM - 4)) * 1.2 : 6 + Math.floor(k / 3), a = t - SLAM;
        if (a >= 0 && a < 22) { ctx.globalAlpha = 1 - a / 22; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(W / 2 + 2, 92, 10 + a * 9, 6 + a * 5, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const an = i * 0.449, r0 = 30 + a * 6, r1 = r0 + 14; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(an) * r0, 92 + Math.sin(an) * r0 * 0.6); ctx.lineTo(W / 2 + Math.cos(an) * r1, 92 + Math.sin(an) * r1 * 0.6); ctx.stroke(); } ctx.globalAlpha = 1; ctx.lineWidth = 1; }
        T(ctx, 'VS', W / 2 + 2, 92 - Math.round(sc * 3.5) + (t > SLAM + 8 ? Math.round(Math.sin(t / 9)) : 0), { scale: Math.max(1, Math.round(sc)), align: 'center', color: RF.TITLE_COLORS, outline: '#200000' });
      }

      // name plates: slanted bars that slide in under each fighter
      const pU = ease((t - (SLAM + 2)) / 12);
      for (let p = 0; p < 2 && pU > 0; p++) {
        const d = defs[p], dir = p === 0 ? 1 : -1, col = p === 0 ? '#c8201a' : '#1a50c8', lite = p === 0 ? '#ff6050' : '#60a0ff', al = p === 0 ? 'left' : 'right';
        const tagName = this.partners && d.name + ' & ' + (p === 0 ? this.opts.tag.p1b : this.opts.tag.p2b).name, name = tagName || d.name, big = !tagName && RF.font.textWidth(name, 2) < 150;
        const pw = Math.max(RF.font.textWidth(name, big ? 2 : 1) + 22, 110), ex = p === 0 ? -pw + pU * (pw + 4) : W + pw - pU * (pw + 4);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(ex - dir * 6, 186); ctx.lineTo(ex + dir * (pw + 2), 186); ctx.lineTo(ex + dir * (pw - 8), 206); ctx.lineTo(ex - dir * 6, 206); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex - dir * 6, 188); ctx.lineTo(ex + dir * pw, 188); ctx.lineTo(ex + dir * (pw - 8), 204); ctx.lineTo(ex - dir * 6, 204); ctx.fill();
        ctx.fillStyle = lite; ctx.fillRect(p === 0 ? ex - 6 : ex - pw + 8, 188, pw - 2, 1);
        T(ctx, name, ex + dir * 6, big ? 189 : 193, { scale: big ? 2 : 1, align: al, color: '#ffffff', outline: '#000' });
        T(ctx, (p === 1 && this.opts.cpu ? 'CPU' : 'PLAYER ' + (p + 1)) + '  -  ' + (d.archetype || '').toUpperCase(), ex + dir * 4, 210, { align: al, color: lite, outline: '#000' });
      }

      // Rival banter: speech bubbles, P1 first, then the reply.
      if (this.banter) [0, 1].forEach((p) => {
        const start = p === 0 ? 56 : 116;
        if (t < start) return;
        const lines = RF.font.wrap(this.banter[p], 22), x = p === 0 ? 92 : W - 92, y = p === 0 ? 30 : 52;
        const w = Math.max(...lines.map((l) => RF.font.textWidth(l))) + 10, h = lines.length * 9 + 6;
        ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#f0e8d8'; ctx.fillRect(x - w / 2, y, w, h);
        ctx.fillRect(x - 3, y + h, 6, 4); // tail
        lines.forEach((l, i) => T(ctx, l, x, y + 4 + i * 9, { align: 'center', color: '#1a0a08' }));
      });
      // the stage, on a plate at the top
      const stage = RF.getStage(this.opts.stage), sU = ease((t - 10) / 12), sw = RF.font.textWidth(stage.name) + 60;
      ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(W / 2 - sw / 2, Math.round(-18 + sU * 22), sw, 14);
      ctx.fillStyle = '#e8b420'; ctx.fillRect(W / 2 - sw / 2, Math.round(-18 + sU * 22) + 13, sw, 1);
      T(ctx, 'STAGE   ' + stage.name.toUpperCase(), W / 2, Math.round(-15 + sU * 22), { align: 'center', color: '#ffe0a0' });
      if (!this.banter && RF.tip && t > 44) { if (this.tipN == null) this.tipN = Math.floor(Math.random() * RF.TIPS.length); RF.font.wrap('TIP: ' + RF.tip(this.tipN), 44).forEach((l, i) => T(ctx, l, W / 2, 24 + i * 9, { align: 'center', color: '#b8a8a0', outline: '#000' })); }

      // out: two black shutters close along the split, and the fight opens on a flash
      const o = t - (this.duration - OUT);
      if (o > 0) {
        const u = Math.min(1, o / (OUT - 3)), e = u * u, reach = (W / 2 + 60) * e;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(reach + 30, 0); ctx.lineTo(reach - 30, H); ctx.lineTo(0, H); ctx.fill();
        ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - reach + 30, 0); ctx.lineTo(W - reach - 30, H); ctx.lineTo(W, H); ctx.fill();
        ctx.fillStyle = '#ffe9a0'; ctx.save(); ctx.beginPath(); ctx.moveTo(reach + 30, 0); ctx.lineTo(reach + 32, 0); ctx.lineTo(reach - 28, H); ctx.lineTo(reach - 30, H); ctx.fill(); ctx.beginPath(); ctx.moveTo(W - reach + 30, 0); ctx.lineTo(W - reach + 28, 0); ctx.lineTo(W - reach - 32, H); ctx.lineTo(W - reach - 30, H); ctx.fill(); ctx.restore();
        if (o >= OUT - 3) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      }
    }
  }

  RF.VersusScene = VersusScene;
})();
