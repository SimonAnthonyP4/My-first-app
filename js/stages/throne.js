// THE THRONE BETWEEN (the Headmaster's seat, between every universe). A black glass floor, a
// throne built out of school desks under the cracked bell, windows torn open onto other schools,
// and in the dark along the walls: the Forgotten, standing, watching, with no faces.
// Hazard: THE BELL (right wall) - one toll.
(function () {
  const { rng } = RF.util;
  const T = (...a) => RF.font.drawText(...a);
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const FLOOR = 204, TOP = 140;
  // one of the watchers: a grey figure, a pale blank where the face should be
  const watcher = (ctx, x, y, k, a) => {
    ctx.globalAlpha = a;
    rect(ctx, '#1a1826', x - 4 * k, y - 22 * k, 8 * k, 22 * k); rect(ctx, '#232032', x - 6 * k, y - 18 * k, 12 * k, 10 * k);
    rect(ctx, '#2a2638', x - 3 * k, y - 29 * k, 6 * k, 7 * k); rect(ctx, '#6a6880', x - 2 * k, y - 27 * k, 4 * k, 4 * k);
    ctx.globalAlpha = 1;
  };

  RF.registerStage({
    id: 'throne', name: 'The Throne Between', music: 'throne', floorY: FLOOR, bounds: { left: 10, right: 374 },
    drawStatic(ctx, W, H) {
      const r = rng(1961);
      const g = ctx.createLinearGradient(0, 0, 0, TOP); g.addColorStop(0, '#020106'); g.addColorStop(0.6, '#0c0618'); g.addColorStop(1, '#1a0a2c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, TOP);
      for (let i = 0; i < 70; i++) rect(ctx, i % 5 ? '#3a2a5a' : '#8a6ac8', Math.floor(r() * W), Math.floor(r() * 110), 1, 1);          // dead stars
      // pillars made of stacked lockers, leaning
      for (const [px, lean] of [[34, 1], [96, -1], [288, 1], [350, -1]]) for (let i = 0; i < 8; i++) {
        const y = TOP - 16 - i * 17, x = px + lean * i * 0.8;
        rect(ctx, '#05030a', x - 9, y, 18, 17); rect(ctx, i % 2 ? '#15101f' : '#1a1428', x - 8, y + 1, 16, 15); rect(ctx, '#0a0612', x - 5, y + 3, 10, 2); rect(ctx, '#2a2040', x + 4, y + 8, 2, 2);
      }
      // the rows of the Forgotten, back to front, into the dark
      for (let row = 0; row < 3; row++) for (let i = 0; i < 26; i++) {
        const x = 6 + i * 15 + (row % 2) * 7 + Math.floor(r() * 4), y = TOP - 2 + row * 3;
        if (x > 150 && x < 234) continue;                                              // (they leave the throne's steps clear)
        watcher(ctx, x, y, 0.75 + row * 0.14, 0.4 + row * 0.2);
      }
      // the dais and the throne: desks and chairs, stacked into a high back with spikes
      for (let i = 0; i < 3; i++) { rect(ctx, '#05030a', 150 - i * 10, TOP - 8 + i * 4, 84 + i * 20, 5); rect(ctx, '#1c1430', 151 - i * 10, TOP - 8 + i * 4, 82 + i * 20, 1); }
      rect(ctx, '#05030a', 166, 52, 52, 82); rect(ctx, '#140e22', 168, 54, 48, 78);
      for (let i = 0; i < 9; i++) { const y = 56 + i * 8; rect(ctx, i % 2 ? '#1e1632' : '#19122a', 170, y, 44, 6); rect(ctx, '#0a0612', 172 + (i * 7) % 30, y + 1, 10, 4); }   // desk tops
      for (const [sx, h] of [[168, 22], [178, 34], [192, 46], [206, 34], [214, 22]]) { ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(sx - 4, 54); ctx.lineTo(sx, 54 - h); ctx.lineTo(sx + 4, 54); ctx.fill(); rect(ctx, '#3a2a5a', sx, 54 - h + 2, 1, h - 4); }
      rect(ctx, '#05030a', 160, 104, 12, 30); rect(ctx, '#05030a', 212, 104, 12, 30); rect(ctx, '#241a3a', 161, 104, 10, 3); rect(ctx, '#241a3a', 213, 104, 10, 3);     // arms
      rect(ctx, '#2a0a14', 172, 100, 40, 34); rect(ctx, '#4a0e1c', 174, 102, 36, 4);                                                                               // the seat: red
      // the floor: black glass, a violet grid running to the throne
      for (let y = TOP, i = 0; y < H; i++) { const h = 2 + i; rect(ctx, i % 2 ? '#07040e' : '#0b0616', 0, y, W, h); y += h; }
      ctx.strokeStyle = 'rgba(150,90,255,0.2)'; for (let k = -12; k <= 12; k++) { ctx.beginPath(); ctx.moveTo(192 + k * 10, TOP); ctx.lineTo(192 + k * 58, H); ctx.stroke(); }
      ctx.fillStyle = 'rgba(120,20,40,0.35)'; ctx.beginPath(); ctx.moveTo(176, TOP + 4); ctx.lineTo(208, TOP + 4); ctx.lineTo(250, H); ctx.lineTo(134, H); ctx.fill();   // the red carpet
    },
    drawAnimated(ctx, t) {
      // windows torn open onto other schools: each one a different sky
      const SK = [['#4a90e0', '#bfe4ff'], ['#ff4fb0', '#ffb040'], ['#02030a', '#141a2e'], ['#3a0806', '#ff7a10']];
      [[60, 62], [132, 40], [252, 40], [324, 62]].forEach(([x, y], i) => {
        const rx = 15 + Math.sin(t / 40 + i) * 2, ry = 24 + Math.cos(t / 33 + i) * 2;
        ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
        const g = ctx.createLinearGradient(0, y - ry, 0, y + ry); g.addColorStop(0, SK[i][0]); g.addColorStop(1, SK[i][1]); ctx.fillStyle = g; ctx.fillRect(x - 20, y - 30, 40, 60);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 12, y + 6, 24, 20); ctx.fillRect(x - 3, y - 2, 6, 8);                         // a school, far away
        for (let k = 0; k < 4; k++) rect(ctx, '#ffd870', x - 10 + k * 6, y + 10 + ((k + i) % 2) * 5, 2, 2);
        ctx.restore();
        ctx.strokeStyle = (t + i * 9) % 50 < 25 ? '#b070ff' : '#7a30d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
      });
      // the bell above the throne: cracked, swinging slowly, never quite still
      const sw = Math.sin(t / 46) * 0.12;
      ctx.save(); ctx.translate(192, -4); ctx.rotate(sw);
      rect(ctx, '#05030a', -2, 0, 4, 12);
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(9, 10); ctx.lineTo(19, 38); ctx.lineTo(-19, 38); ctx.fill();
      ctx.fillStyle = '#8a5a18'; ctx.beginPath(); ctx.moveTo(-8, 11); ctx.lineTo(8, 11); ctx.lineTo(17, 36); ctx.lineTo(-17, 36); ctx.fill();
      ctx.fillStyle = '#c08a30'; ctx.beginPath(); ctx.moveTo(1, 11); ctx.lineTo(8, 11); ctx.lineTo(17, 36); ctx.lineTo(8, 36); ctx.fill();
      ctx.strokeStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(-1, 12); ctx.lineTo(-4, 20); ctx.lineTo(0, 26); ctx.lineTo(-3, 36); ctx.stroke();
      rect(ctx, '#05030a', -3, 37, 6, 6);
      ctx.restore();
      // desks and clocks drifting in the dark
      for (let i = 0; i < 5; i++) {
        const x = ((i * 83 + t * (0.1 + i * 0.03)) % 420) - 18, y = 20 + i * 17 + Math.sin(t / 50 + i * 2) * 5;
        ctx.globalAlpha = 0.55;
        if (i % 2) { rect(ctx, '#1a1428', x, y, 12, 3); rect(ctx, '#1a1428', x + 1, y + 3, 2, 6); rect(ctx, '#1a1428', x + 9, y + 3, 2, 6); }
        else { ctx.fillStyle = '#1a1428'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4a3a6a'; ctx.fillRect(Math.round(x), Math.round(y - 3), 1, 4); }
        ctx.globalAlpha = 1;
      }
      // every so often the whole room breathes violet, and you see how many of them there are
      const b = (t % 520);
      if (b < 30) { ctx.fillStyle = `rgba(150,90,255,${0.12 * Math.sin((b / 30) * Math.PI)})`; ctx.fillRect(0, 0, 384, 224); }
    },
  });

  RF.HOME_HAZARDS = RF.HOME_HAZARDS || {};
  RF.HOME_HAZARDS.throne = { side: 1, name: 'THE LAST BELL!', damage: 11, launch: { vx: 4, vy: 9 }, color: '#f0c860', sound: 'bell',
    draw(ctx, x, floorY, frame, firing) {
      const l = x - 22, sw = firing ? Math.sin(frame) * 3 : Math.sin(frame / 30);
      rect(ctx, '#05030a', l + 9, floorY - 60, 4, 16);
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.moveTo(l + 4 + sw, floorY - 46); ctx.lineTo(l + 18 + sw, floorY - 46); ctx.lineTo(l + 24 + sw, floorY - 24); ctx.lineTo(l - 2 + sw, floorY - 24); ctx.fill();
      ctx.fillStyle = '#c08a30'; ctx.beginPath(); ctx.moveTo(l + 5 + sw, floorY - 45); ctx.lineTo(l + 17 + sw, floorY - 45); ctx.lineTo(l + 22 + sw, floorY - 26); ctx.lineTo(l + sw, floorY - 26); ctx.fill();
      rect(ctx, '#05030a', l + 9 + sw * 1.5, floorY - 25, 4, 5);
    },
    fx(ctx, x, floorY, t) { // rings of sound
      ctx.strokeStyle = '#f0c860'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const rr = t * 3 - i * 12; if (rr > 0) { ctx.globalAlpha = Math.max(0, 1 - rr / 140); ctx.beginPath(); ctx.arc(x - 12, floorY - 36, rr, 0, Math.PI * 2); ctx.stroke(); } }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    },
  };
})();
