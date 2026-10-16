// Stage 1: a school cafeteria that has slid into hell.
(function () {
  const { rng, hash } = RF.util;
  const HORIZON = 150; // where the back wall meets the floor
  const VP = [192, 40]; // floor perspective vanishing point

  let cracks = []; // wall/floor lava cracks, generated in drawStatic, pulsed in drawAnimated

  function crackPath(r, x, y, steps, dx, dy) {
    const pts = [[x, y]];
    for (let i = 0; i < steps; i++) {
      x += dx + (r() - 0.5) * 6;
      y += dy + (r() - 0.5) * 3;
      pts.push([Math.round(x), Math.round(y)]);
    }
    return pts;
  }

  function strokePath(ctx, pts, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + 0.5, p[1] + 0.5) : ctx.moveTo(p[0] + 0.5, p[1] + 0.5)));
    ctx.stroke();
  }

  function floorX(xBottom, y, H) {
    return VP[0] + (xBottom - VP[0]) * (y - VP[1]) / (H - VP[1]);
  }

  function drawStatic(ctx, W, H) {
    const r = rng(666);

    // Back wall
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, '#160203');
    g.addColorStop(1, '#4e0d09');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON);

    // Cinder blocks
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 12, row = 0; y < HORIZON; y += 10, row++) {
      ctx.fillRect(0, y, W, 1);
      for (let x = (row % 2) * 12; x < W; x += 24) ctx.fillRect(x, y - 9, 1, 9);
    }

    // Tiled lower wall
    for (let y = 108; y < HORIZON; y += 6) {
      for (let x = 0; x < W; x += 6) {
        ctx.fillStyle = ((x + y) / 6) % 2 ? '#3d0a0a' : '#4a0f0d';
        ctx.fillRect(x, y, 6, 6);
      }
    }
    ctx.fillStyle = '#220405';
    ctx.fillRect(0, 106, W, 2);

    // Lava cracks in the wall
    cracks = [
      crackPath(r, 30, 14, 9, 1, 9),
      crackPath(r, 262, 10, 7, -1.5, 8),
      crackPath(r, 360, 30, 6, -1, 9),
    ];
    for (const c of cracks) {
      strokePath(ctx, c, '#200000', 4);
      strokePath(ctx, c, '#8a1a00', 2);
    }

    // Menu board
    ctx.fillStyle = '#3a2412';
    ctx.fillRect(138, 40, 108, 52);
    ctx.fillStyle = '#0c120e';
    ctx.fillRect(141, 43, 102, 46);
    const T = RF.font.drawText;
    T(ctx, "TODAY'S MENU", 192, 46, { align: 'center', color: '#d8d8c0' });
    ctx.fillStyle = '#d8d8c0';
    ctx.fillRect(152, 55, 80, 1);
    T(ctx, 'MYSTERY MEAT', 192, 59, { align: 'center', color: '#ff9a3a' });
    T(ctx, 'BURNT SOULS', 192, 68, { align: 'center', color: '#ff9a3a' });
    T(ctx, '$6.66', 192, 78, { align: 'center', color: '#ff2a2a' });

    // Melting clock
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(78, 46, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfc6a2';
    ctx.beginPath(); ctx.arc(78, 46, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(74, 56, 6, 10); ctx.fillRect(76, 66, 3, 5); ctx.fillRect(77, 71, 1, 3); // drip
    ctx.fillStyle = '#111';
    ctx.fillRect(78, 37, 1, 10);   // hands stuck at 6:66-ish
    ctx.fillRect(78, 46, 7, 1);
    ctx.fillStyle = '#a00';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillRect(Math.round(78 + Math.cos(a) * 10), Math.round(46 + Math.sin(a) * 10), 1, 1);
    }

    // "NO EXIT" door
    ctx.fillStyle = '#1a0a08';
    ctx.fillRect(298, 66, 40, 84);
    ctx.fillStyle = '#2c1510';
    ctx.fillRect(301, 69, 16, 81); ctx.fillRect(319, 69, 16, 81);
    ctx.fillStyle = '#ff6a10';
    ctx.fillRect(305, 76, 8, 14); ctx.fillRect(323, 76, 8, 14); // fire glow through windows
    ctx.fillStyle = '#ffd040';
    ctx.fillRect(307, 84, 4, 6); ctx.fillRect(325, 84, 4, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(300, 52, 36, 11);
    T(ctx, 'NO EXIT', 318, 54, { align: 'center', color: '#ff2020' });

    // Light fixtures (tubes drawn in drawAnimated)
    ctx.fillStyle = '#2a2a2e';
    for (const x of [40, 160, 280]) ctx.fillRect(x - 2, 0, 68, 6);

    // Serving counter with pans of slop
    ctx.fillStyle = '#2e2e34';
    ctx.fillRect(14, 120, 118, 30);
    ctx.fillStyle = '#8c8c94';
    ctx.fillRect(12, 116, 122, 5);
    ctx.fillStyle = '#5a5a62';
    for (let x = 18; x < 130; x += 28) ctx.fillRect(x, 124, 24, 22);
    ctx.fillStyle = '#5a2008'; // rust streaks
    for (let i = 0; i < 10; i++) ctx.fillRect(18 + Math.floor(r() * 108), 124 + Math.floor(r() * 6), 1, 4 + Math.floor(r() * 12));
    const slop = ['#5aa02a', '#6a3a1a', '#9a0e0e', '#c8b84a'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#1c1c20';
      ctx.fillRect(18 + i * 28, 113, 24, 4);
      ctx.fillStyle = slop[i];
      ctx.fillRect(19 + i * 28, 113, 22, 2);
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(76, 113, 2, 2); ctx.fillStyle = '#000'; ctx.fillRect(77, 113, 1, 1); // eyeball
    ctx.fillStyle = 'rgba(170,210,220,0.35)'; // sneeze guard
    ctx.fillRect(14, 98, 118, 1);
    ctx.fillRect(14, 98, 1, 18); ctx.fillRect(131, 98, 1, 18);

    // Trash can (fire added in drawAnimated)
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(348, 122, 22, 28);
    ctx.fillStyle = '#55555c';
    ctx.fillRect(346, 120, 26, 3);
    ctx.fillStyle = '#2a2a30';
    for (let x = 352; x < 368; x += 5) ctx.fillRect(x, 125, 1, 23);

    // Floor: perspective checkerboard
    const rows = [HORIZON, 154, 159, 165, 172, 181, 192, 205, H];
    const cols = [];
    for (let x = -1000; x <= W + 1000; x += 48) cols.push(x);
    for (let ri = 0; ri < rows.length - 1; ri++) {
      const y0 = rows[ri], y1 = rows[ri + 1];
      for (let ci = 0; ci < cols.length - 1; ci++) {
        ctx.fillStyle = (ri + ci) % 2 ? '#2c0707' : '#110203';
        ctx.beginPath();
        ctx.moveTo(floorX(cols[ci], y0, H), y0);
        ctx.lineTo(floorX(cols[ci + 1], y0, H), y0);
        ctx.lineTo(floorX(cols[ci + 1], y1, H), y1);
        ctx.lineTo(floorX(cols[ci], y1, H), y1);
        ctx.fill();
      }
    }
    const fg = ctx.createLinearGradient(0, HORIZON, 0, H);
    fg.addColorStop(0, 'rgba(255,60,0,0.18)');
    fg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);
    ctx.fillStyle = '#0a0102';
    ctx.fillRect(0, HORIZON - 1, W, 2);

    // Floor cracks
    const floorCracks = [crackPath(r, 60, 170, 8, 9, 3), crackPath(r, 250, 214, 9, 11, -2)];
    for (const c of floorCracks) {
      strokePath(ctx, c, '#200000', 4);
      strokePath(ctx, c, '#8a1a00', 2);
    }
    cracks.push(...floorCracks);

    // Lunch tables in the back (one flipped over), dark so fighters pop
    ctx.fillStyle = '#24100c';
    ctx.fillRect(150, 152, 90, 4);
    ctx.fillRect(156, 156, 3, 9); ctx.fillRect(231, 156, 3, 9);
    ctx.fillRect(146, 162, 98, 2); // bench
    ctx.fillStyle = '#d8d0c0'; // skull on a tray
    ctx.fillRect(196, 148, 6, 4); ctx.fillRect(197, 152, 4, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(197, 149, 1, 1); ctx.fillRect(200, 149, 1, 1);
    ctx.fillStyle = '#24100c';
    ctx.fillRect(262, 146, 4, 18); // flipped table top
    ctx.fillRect(266, 150, 14, 3); ctx.fillRect(266, 158, 14, 3); // legs sticking out

    // Vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 240);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAnimated(ctx, t) {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;

    // Fluorescent tubes; the middle one flickers badly
    let dark = false;
    [40, 160, 280].forEach((x, i) => {
      const on = i !== 1 || hash(Math.floor(t / 3)) > 0.18;
      if (!on) dark = true;
      ctx.fillStyle = on ? '#ffd8c8' : '#4a3a38';
      ctx.fillRect(x, 6, 64, 2);
      if (on) {
        ctx.fillStyle = 'rgba(255,120,90,0.08)';
        ctx.fillRect(x - 10, 8, 84, 10);
      }
    });

    // Lava cracks pulse
    const pulse = 0.55 + 0.45 * Math.sin(t / 18);
    ctx.globalAlpha = pulse;
    for (const c of cracks) strokePath(ctx, c, '#ff6a00', 1);
    ctx.globalAlpha = 1;

    // Trash-can fire
    for (let i = 0; i < 12; i++) {
      const h = 6 + Math.floor(hash(i * 13 + Math.floor(t / 4)) * 14);
      const x = 349 + i * 2;
      ctx.fillStyle = '#c42000'; ctx.fillRect(x, 120 - h, 2, h);
      ctx.fillStyle = '#ff8a10'; ctx.fillRect(x, 120 - h * 0.6, 2, h * 0.6);
      ctx.fillStyle = '#ffe040'; ctx.fillRect(x, 120 - h * 0.25, 2, h * 0.25);
    }

    // Steam from the slop
    ctx.fillStyle = 'rgba(200,200,200,0.25)';
    for (let i = 0; i < 8; i++) {
      const life = (t * 0.4 + hash(i) * 40) % 40;
      ctx.fillRect(22 + (i % 4) * 28 + hash(i + 9) * 16 + Math.sin((t + i * 20) / 10) * 2, 112 - life, 2, 2);
    }

    // Embers rising from the floor
    for (let i = 0; i < 36; i++) {
      const speed = 0.25 + hash(i * 3.1) * 0.5;
      const y = H - ((t * speed + hash(i * 7.7) * H) % H);
      const x = hash(i * 1.3) * W + Math.sin((t + i * 30) / 25) * 4;
      ctx.fillStyle = hash(i * 5.5) > 0.5 ? '#ff8a20' : '#ffd040';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }

    if (dark) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  RF.registerStage({
    id: 'cafeteria',
    name: 'Hell Cafeteria',
    floorY: 204,
    bounds: { left: 10, right: 374 },
    drawStatic,
    drawAnimated,
  });
})();
