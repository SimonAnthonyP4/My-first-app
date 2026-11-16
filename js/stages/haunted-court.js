// Stage 3: a haunted high-school basketball court.
(function () {
  const { rng, hash } = RF.util;
  const HORIZON = 150;
  const VP = [192, 30];

  function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  const floorX = (xb, y, H) => VP[0] + (xb - VP[0]) * (y - VP[1]) / (H - VP[1]);

  // Spectators in the stands: dark shapes with eyes (eyes are drawn animated).
  const crowd = [];

  function drawStatic(ctx, W, H) {
    const r = rng(1313);

    // Cinder-block wall fading into darkness
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, '#07070c');
    g.addColorStop(1, '#22202a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = 10, row = 0; y < 90; y += 8, row++) {
      ctx.fillRect(0, y, W, 1);
      for (let x = (row % 2) * 10; x < W; x += 20) ctx.fillRect(x, y - 7, 1, 7);
    }

    // High windows (storm outside; lightning drawn animated)
    for (const wx of [24, 104, 264, 344]) {
      rect(ctx, '#0a0a10', wx - 2, 14, 36, 26);
      rect(ctx, '#141826', wx, 16, 32, 22);
      ctx.fillStyle = '#05050a';
      for (let i = 1; i < 4; i++) ctx.fillRect(wx + i * 8, 16, 1, 22);
      ctx.fillRect(wx, 27, 32, 1);
      if (r() < 0.6) { rect(ctx, '#05050a', wx + 9, 17, 6, 5); rect(ctx, '#2a3046', wx + 10, 18, 2, 2); } // broken pane
    }

    // Scoreboard, frozen on a hopeless score
    rect(ctx, '#050505', 146, 44, 92, 50);
    rect(ctx, '#1a1a1a', 148, 46, 88, 46);
    const T = RF.font.drawText;
    T(ctx, 'HOME', 166, 50, { align: 'center', color: '#a0a0a0' });
    T(ctx, 'GUEST', 218, 50, { align: 'center', color: '#a0a0a0' });
    T(ctx, '00', 166, 62, { scale: 2, align: 'center', color: '#ff2a1a' });
    T(ctx, '66', 218, 62, { scale: 2, align: 'center', color: '#ff2a1a' });

    // Faded team banner
    rect(ctx, '#3a0808', 246, 52, 56, 20);
    ctx.fillStyle = '#3a0808';
    ctx.beginPath(); ctx.moveTo(246, 72); ctx.lineTo(274, 82); ctx.lineTo(302, 72); ctx.fill();
    T(ctx, 'DEMONS', 274, 58, { align: 'center', color: '#c0a060' });
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(286, 52, 16, 20); // torn, darker corner

    // Bleachers: five tiers across the back
    for (let i = 0; i < 5; i++) {
      const y = 98 + i * 10;
      rect(ctx, '#2a2228', 0, y, W, 10);
      rect(ctx, '#3e333a', 0, y, W, 2);
      rect(ctx, '#18141a', 0, y + 9, W, 1);
    }
    // Shadowy spectators
    crowd.length = 0;
    for (let i = 0; i < 26; i++) {
      const tier = Math.floor(r() * 4), x = 10 + Math.floor(r() * (W - 20));
      if (x > 290 && x < 384 && tier > 2) continue; // keep the hoop area clear
      const y = 98 + tier * 10;
      ctx.fillStyle = '#0c0a0e';
      ctx.beginPath(); ctx.arc(x, y - 5, 4, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillRect(x - 5, y - 2, 10, 8);                                  // shoulders
      crowd.push({ x, y: y - 6, seed: r() * 100, color: r() < 0.7 ? '#ff2a1a' : '#ffd040' });
    }

    // Exit door with a dead sign
    rect(ctx, '#121014', 4, 106, 28, 44);
    rect(ctx, '#1e1a20', 6, 108, 11, 42); rect(ctx, '#1e1a20', 19, 108, 11, 42);
    rect(ctx, '#000', 6, 96, 26, 9);
    T(ctx, 'EXIT', 19, 97, { align: 'center', color: '#3a1010' });

    // Hoop on the right: pole, cracked backboard, bent rim (net drawn animated)
    rect(ctx, '#2a2a2e', 366, 70, 5, 82);
    rect(ctx, '#2a2a2e', 340, 72, 30, 4);
    rect(ctx, '#0c0c0c', 324, 52, 34, 26);
    rect(ctx, '#8a8a90', 325, 53, 32, 24);
    rect(ctx, '#6a6a70', 334, 62, 12, 10);
    ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(330.5, 54); ctx.lineTo(338.5, 63); ctx.lineTo(335.5, 70); ctx.lineTo(344.5, 76); ctx.stroke(); // crack
    rect(ctx, '#b0480e', 320, 78, 18, 2);
    rect(ctx, '#b0480e', 318, 80, 3, 2); // bent

    // Court floor: dark varnished planks in perspective
    const fg = ctx.createLinearGradient(0, HORIZON, 0, H);
    fg.addColorStop(0, '#24160c');
    fg.addColorStop(1, '#40281a');
    ctx.fillStyle = fg;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let xb = -600; xb <= W + 600; xb += 22) {
      ctx.beginPath(); ctx.moveTo(floorX(xb, HORIZON, H) + 0.5, HORIZON); ctx.lineTo(xb + 0.5, H); ctx.stroke();
    }
    // Faded court markings: centre line + centre circle + key on the right
    ctx.strokeStyle = 'rgba(200,190,170,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(floorX(192, HORIZON, H), HORIZON); ctx.lineTo(192, H); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(192, 192, 60, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,20,20,0.35)';
    ctx.beginPath(); ctx.ellipse(192, 192, 18, 4, 0, 0, Math.PI * 2); ctx.stroke(); // red centre logo
    ctx.strokeStyle = 'rgba(200,190,170,0.22)';
    ctx.beginPath(); ctx.moveTo(300, 160); ctx.lineTo(384, 160); ctx.moveTo(296, 160); ctx.lineTo(282, 224); ctx.stroke();
    ctx.lineWidth = 1;
    // Scuffs and a dark stain
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(r() * W), HORIZON + 4 + Math.floor(r() * 70), 3 + Math.floor(r() * 6), 1);
    ctx.fillStyle = 'rgba(40,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(110, 214, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, '#0a0606', 0, HORIZON - 1, W, 2);

    const v = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 230);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAnimated(ctx, t) {
    const W = RF.CONFIG.WIDTH, H = RF.CONFIG.HEIGHT;

    // Lightning through the windows every few seconds
    const flash = t % 400 < 6 || (t % 400 > 10 && t % 400 < 14);
    if (flash) {
      ctx.fillStyle = '#c8d8ff';
      for (const wx of [24, 104, 264, 344]) ctx.fillRect(wx, 16, 32, 22);
      ctx.fillStyle = 'rgba(180,200,255,0.10)';
      ctx.fillRect(0, 0, W, H);
    }

    // Caged ceiling lights with cones; the middle one flickers
    [70, 192, 314].forEach((x, i) => {
      const on = i !== 1 || hash(Math.floor(t / 4) + 3) > 0.25;
      ctx.fillStyle = '#18181c'; ctx.fillRect(x - 1, 0, 2, 6); ctx.fillRect(x - 6, 6, 12, 4);
      ctx.fillStyle = on ? '#e8f0d0' : '#3a3a30'; ctx.fillRect(x - 4, 10, 8, 2);
      if (on) {
        ctx.fillStyle = 'rgba(220,230,180,0.05)';
        ctx.beginPath(); ctx.moveTo(x - 4, 12); ctx.lineTo(x + 4, 12); ctx.lineTo(x + 44, 210); ctx.lineTo(x - 44, 210); ctx.fill();
      }
    });

    // Eyes in the stands, blinking out of sync
    for (const c of crowd) {
      if (hash(c.seed + Math.floor(t / 50)) < 0.12) continue; // blink
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x - 2, c.y, 1, 1);
      ctx.fillRect(c.x + 1, c.y, 1, 1);
    }

    // Blinking shot clock
    if (Math.floor(t / 30) % 2) RF.font.drawText(ctx, '0:00', 192, 81, { align: 'center', color: '#ff2a1a' });

    // Torn net swaying under the rim
    const sway = Math.sin(t / 25) * 1.5;
    ctx.fillStyle = '#c8c8c0';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4 + (i % 2) * 3; j++) {
        ctx.fillRect(Math.round(321 + i * 4 + sway * (j / 6) + (j % 2)), 82 + j * 2, 1, 2);
      }
    }

    // A lone basketball rolls across the court now and then
    const cyc = t % 1100;
    if (cyc < 500) {
      const x = W + 10 - cyc * 0.85, y = 200, a = cyc * 0.12;
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0581a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(Math.round(x + Math.cos(a) * 3), y - 4, 1, 8);
      ctx.fillRect(Math.round(x) - 4, Math.round(y + Math.sin(a) * 2), 8, 1);
    }

    // Low fog drifting over the floor
    for (let i = 0; i < 9; i++) {
      const x = ((i * 53 + t * (0.15 + (i % 3) * 0.05)) % (W + 120)) - 60;
      ctx.fillStyle = 'rgba(140,140,160,0.06)';
      ctx.beginPath(); ctx.ellipse(x, 206 + (i % 3) * 5, 50, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  RF.registerStage({
    id: 'court',
    name: 'Haunted Court',
    music: 'court',
    floorY: 204,
    bounds: { left: 10, right: 374 },
    drawStatic,
    drawAnimated,
  });
})();
