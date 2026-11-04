// Stage 4: Sirven's Office, abandoned for years.
(function () {
  const { rng, hash } = RF.util;
  const HORIZON = 152;

  function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  function drawStatic(ctx, W, H) {
    const r = rng(404);
    const T = RF.font.drawText;

    // Stained wall
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, '#16181a');
    g.addColorStop(1, '#2c302c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = 0; x < W; x += 12) ctx.fillRect(x, 22, 6, HORIZON - 22); // old wallpaper stripes
    ctx.fillStyle = 'rgba(60,50,20,0.25)';
    for (let i = 0; i < 6; i++) { // water stains running down
      const x = Math.floor(r() * W);
      ctx.fillRect(x, 22, 8 + Math.floor(r() * 10), 20 + Math.floor(r() * 50));
    }
    rect(ctx, '#1a1c1a', 0, HORIZON - 8, W, 8); // skirting board

    // Ceiling tiles, some missing, one hanging loose
    rect(ctx, '#3a3c3a', 0, 0, W, 22);
    ctx.fillStyle = '#262826';
    for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 1, 22);
    ctx.fillRect(0, 11, W, 1);
    ctx.fillRect(0, 21, W, 1);
    for (const [x, y] of [[64, 0], [224, 11], [320, 0]]) rect(ctx, '#050505', x + 1, y + 1, 31, 10); // holes
    ctx.fillStyle = '#3a3c3a';
    ctx.beginPath(); ctx.moveTo(97, 22); ctx.lineTo(127, 22); ctx.lineTo(122, 34); ctx.lineTo(98, 28); ctx.fill();

    // Door with frosted glass: SIRVEN
    rect(ctx, '#121210', 14, 58, 48, 94);
    rect(ctx, '#3a2e22', 17, 61, 42, 91);
    rect(ctx, '#7a8a86', 19, 66, 38, 34);
    rect(ctx, '#9aaaa4', 19, 66, 38, 6);
    T(ctx, 'SIRVEN', 38, 78, { align: 'center', color: '#1a1e1c' });
    rect(ctx, '#c8a040', 52, 108, 4, 3); // handle
    ctx.strokeStyle = '#2a2e2c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(26.5, 96); ctx.lineTo(34.5, 86); ctx.lineTo(31.5, 76); ctx.stroke(); // cracked glass

    // Whiteboard: the last meeting
    rect(ctx, '#2a2a2a', 82, 40, 74, 50);
    rect(ctx, '#b8b8b0', 84, 42, 70, 46);
    rect(ctx, 'rgba(120,110,80,0.35)', 84, 42, 70, 46); // grime
    T(ctx, 'DEADLINE', 119, 46, { align: 'center', color: '#283a8a' });
    rect(ctx, '#a01010', 90, 49, 58, 1); // crossed out
    T(ctx, 'HELP', 101, 74, { color: '#a01010' });
    ctx.strokeStyle = '#283a8a';
    ctx.beginPath(); ctx.moveTo(88, 58); ctx.lineTo(102, 62); ctx.lineTo(114, 60); ctx.lineTo(126, 70); ctx.lineTo(148, 84); ctx.stroke(); // falling chart

    // Window with broken blinds (moonlight drawn animated)
    rect(ctx, '#0c0e10', 246, 30, 96, 84);
    rect(ctx, '#18243a', 250, 34, 88, 76);
    ctx.fillStyle = '#c8ccd0'; ctx.beginPath(); ctx.arc(318, 52, 7, 0, Math.PI * 2); ctx.fill(); // moon
    for (let y = 36; y < 110; y += 5) {
      if (r() < 0.25) continue; // missing slats
      const bent = r() < 0.2;
      ctx.fillStyle = '#8a8a7c';
      if (bent) { ctx.fillRect(250, y, 40, 2); ctx.fillRect(290, y + 3, 48, 2); }
      else ctx.fillRect(250, y, 88, 2);
    }
    rect(ctx, '#2a2a28', 246, 114, 96, 3); // sill

    // Wall clock, stopped
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(205, 46, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8b4a0'; ctx.beginPath(); ctx.arc(205, 46, 9, 0, Math.PI * 2); ctx.fill();
    rect(ctx, '#111', 205, 39, 1, 7); rect(ctx, '#111', 205, 46, 5, 1);
    ctx.strokeStyle = '#2a2a28'; ctx.beginPath(); ctx.moveTo(199, 41); ctx.lineTo(207, 52); ctx.stroke(); // cracked face

    // Filing cabinet, drawer hanging open, papers spilling
    rect(ctx, '#3a3e3a', 70, 104, 26, 48);
    rect(ctx, '#2a2e2a', 72, 106, 22, 13); rect(ctx, '#2a2e2a', 72, 121, 22, 13);
    rect(ctx, '#4a4e4a', 70, 136, 30, 10); // open drawer
    rect(ctx, '#d8d4c4', 74, 132, 18, 5);

    // The executive desk with a dead CRT
    rect(ctx, '#2a1c12', 138, 120, 104, 6);  // desktop
    rect(ctx, '#20150c', 140, 126, 22, 26);  // drawers
    rect(ctx, '#20150c', 218, 126, 22, 26);
    rect(ctx, '#2a2a2a', 164, 96, 34, 26);   // monitor
    rect(ctx, '#0a0f0a', 167, 99, 28, 18);
    rect(ctx, '#2a2a2a', 176, 118, 10, 3);
    ctx.strokeStyle = '#3a4a3a'; ctx.beginPath(); ctx.moveTo(170, 101); ctx.lineTo(178, 108); ctx.lineTo(176, 115); ctx.stroke(); // cracked screen
    rect(ctx, '#c8c4b4', 204, 116, 10, 4);   // papers on desk
    rect(ctx, '#e0dccc', 206, 114, 9, 4);
    rect(ctx, '#6a3a1a', 226, 114, 5, 6);    // coffee mug
    rect(ctx, '#3a3a3a', 150, 112, 3, 8);    // knocked-over lamp
    rect(ctx, '#4a4a3a', 146, 117, 10, 3);
    rect(ctx, '#1a1a1a', 232, 116, 8, 4);    // phone (light drawn animated)

    // Dead plant
    rect(ctx, '#4a2a1a', 356, 132, 14, 20);
    ctx.strokeStyle = '#4a3a20';
    ctx.beginPath(); ctx.moveTo(363, 132); ctx.lineTo(358, 116); ctx.moveTo(363, 132); ctx.lineTo(370, 112); ctx.lineTo(374, 118); ctx.moveTo(363, 132); ctx.lineTo(364, 120); ctx.stroke();

    // Cobwebs in the corners
    ctx.strokeStyle = 'rgba(200,200,200,0.35)';
    for (const [cx, cy, dx] of [[0, 22, 1], [W, 22, -1]]) {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * (6 + i * 6), cy + 24 - i * 5); ctx.stroke();
      }
      for (let k = 1; k < 4; k++) {
        ctx.beginPath(); ctx.moveTo(cx, cy + k * 6); ctx.quadraticCurveTo(cx + dx * k * 5, cy + k * 5, cx + dx * k * 7, cy); ctx.stroke();
      }
    }

    // Carpet floor: grubby blue-grey with stains, papers everywhere
    const fg = ctx.createLinearGradient(0, HORIZON, 0, H);
    fg.addColorStop(0, '#1e2228');
    fg.addColorStop(1, '#2a3038');
    ctx.fillStyle = fg;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 300; i++) ctx.fillRect(Math.floor(r() * W), HORIZON + Math.floor(r() * (H - HORIZON)), 1, 1);
    ctx.fillStyle = 'rgba(50,40,20,0.35)';
    for (const [x, y, w] of [[60, 190, 30], [260, 214, 40], [330, 170, 18]]) { ctx.beginPath(); ctx.ellipse(x, y, w, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(r() * W), y = HORIZON + 4 + Math.floor(r() * 64);
      rect(ctx, r() < 0.5 ? '#c8c4b4' : '#a8a494', x, y, 6 + Math.floor(r() * 4), 3);
    }
    // Overturned office chair
    rect(ctx, '#1a1a1e', 286, 160, 18, 8);
    rect(ctx, '#1a1a1e', 300, 152, 5, 16);
    rect(ctx, '#2a2a2e', 280, 168, 30, 2);
    rect(ctx, '#0a0a0a', 280, 170, 3, 3); rect(ctx, '#0a0a0a', 307, 170, 3, 3);
    rect(ctx, '#0a0a0c', 0, HORIZON - 1, W, 2);

    const v = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 240);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAnimated(ctx, t) {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;

    // Moonlight through the blinds
    ctx.fillStyle = 'rgba(160,180,220,0.06)';
    ctx.beginPath(); ctx.moveTo(250, 36); ctx.lineTo(338, 36); ctx.lineTo(300, 220); ctx.lineTo(150, 220); ctx.fill();
    // Dust floating in the light
    for (let i = 0; i < 24; i++) {
      const y = 40 + ((i * 37 + t * 0.15) % 170);
      const x = 200 + hash(i) * 120 + Math.sin((t + i * 40) / 40) * 6 - (y - 40) * 0.3;
      ctx.fillStyle = `rgba(220,225,240,${0.25 + hash(i + 7) * 0.3})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }

    // The broken fluorescent light swinging on its wire, flickering
    const ang = Math.sin(t / 45) * 0.35, len = 46;
    const lx = 150 + Math.sin(ang) * len, ly = 22 + Math.cos(ang) * len;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(150.5, 22); ctx.lineTo(lx, ly); ctx.stroke();
    const on = hash(Math.floor(t / 3)) > 0.3;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang * 0.6);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-18, 0, 36, 4);
    ctx.fillStyle = on ? '#e8f0e0' : '#4a4a40'; ctx.fillRect(-16, 4, 32, 2);
    ctx.restore();
    if (on) {
      ctx.fillStyle = 'rgba(220,235,210,0.06)';
      ctx.beginPath(); ctx.moveTo(lx - 16, ly + 5); ctx.lineTo(lx + 16, ly + 5); ctx.lineTo(lx + 70, 215); ctx.lineTo(lx - 70, 215); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, W, H);
    }

    // Dead CRT still flickering
    if (hash(Math.floor(t / 5) + 11) > 0.4) {
      ctx.fillStyle = 'rgba(80,200,90,0.18)';
      ctx.fillRect(167, 99, 28, 18);
      ctx.fillStyle = 'rgba(120,255,140,0.35)';
      ctx.fillRect(167, 99 + ((t * 2) % 18), 28, 1); // rolling scanline
    }

    // Blinking message light on the phone
    if (Math.floor(t / 20) % 2) { ctx.fillStyle = '#ff2a1a'; ctx.fillRect(237, 115, 2, 2); }

    // A sheet of paper drifting across the room now and then
    const cyc = t % 900;
    if (cyc < 360) {
      const x = -10 + cyc * 1.1, y = 120 + Math.sin(cyc / 20) * 12 + cyc * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(cyc / 15) * 0.6);
      ctx.fillStyle = '#d8d4c4'; ctx.fillRect(-4, -3, 8, 6);
      ctx.fillStyle = '#8a8678'; ctx.fillRect(-3, -1, 6, 1);
      ctx.restore();
    }
  }

  RF.registerStage({
    id: 'office',
    name: "Sirven's Office",
    music: 'office',
    floorY: 204,
    bounds: { left: 10, right: 374 },
    drawStatic,
    drawAnimated,
  });
})();
