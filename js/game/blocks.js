// BLOCKS: every fighter has one of their own. Pressing BLOCK raises it; a hit makes it flare (f.shieldHit) and
// say something. This file is the ones that were missing:
//   CHRIS LOOR     highGuard    the boxer's high guard (his gloves are painted onto his hands in his sprite; a hit sparks off them)
//   ALEJANDRO      rockShield   he STOMPS (the ground cracks, dust, a shake) and a slab of rock punches up out of the floor
//   OLU            shellUp      the Philly shell, with a gold ring that rings when it takes one
//   BANDY          skateGuard   the deck, held up on its edge (stickers and all)
//   MS. BRADY      clipboard    a big clipboard; every hit is marked DENIED in red pen
//   JAVAN          blockingSled the padded blocking dummy from practice, shoved in front of him
//   DONALD TRUMP   podium       a podium with the seal on it and two microphones that rattle
//   MR. URBANIK    inkblot      a Rorschach blot that never holds still ("INTERESTING.")
//   ERICK          velvetRope   brass stanchions and a red rope, and a SOLD OUT sign
// (Riley and the Judge's orb is in riley.js; the Proctor / Bell Ringer / Eraser's are in lieutenants.js.)
(function () {
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const T = (ctx, text, x, y, color) => RF.font.drawText(ctx, text, x, y, { align: 'center', color, outline: '#000' });
  const guardBox = (f, floorY) => {
    const hurt = f.getHurtbox(); if (!hurt) return null;
    return { hurt, base: floorY - f.y, top: floorY - f.y - hurt.h, mid: floorY - f.y - hurt.h / 2, k: f.shieldHit > 0 ? f.shieldHit / 12 : 0, front: f.x + f.facing * (f.body.width / 2) };
  };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // a boxing glove, drawn facing right at (0,0) (the caller flips): cuff on the left, fist on the right
  const glove = (ctx, x, y, hot) => {
    R(ctx, '#2a0808', x - 6, y - 5, 13, 11); R(ctx, hot ? '#ff5a4a' : '#d02030', x - 5, y - 4, 11, 9);
    R(ctx, '#a01020', x - 5, y + 2, 11, 3); R(ctx, '#f4f0e6', x - 7, y - 3, 3, 7); R(ctx, '#ffb0a8', x - 1, y - 3, 4, 2);   // the white cuff, the shine
  };

  const fx = {
    // ---- Chris Loor: gloves up ----
    highGuard(f, ctx, floorY, t) {         // (the gloves are painted onto his hands in his sprite: this is what a hit does to them)
      const g = guardBox(f, floorY); if (!g) return;
      if (g.k > 0) {
        const x = f.x + f.facing * (f.body.width / 2 - 2), y = g.top + 17;
        ctx.save(); ctx.globalAlpha = g.k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        for (let r = 0; r < 5; r++) { const an = r * 1.26 + 0.3, d0 = 5, d1 = 7 + (1 - g.k) * 8; ctx.beginPath(); ctx.moveTo(x + f.facing * 7 + Math.cos(an) * d0 * f.facing, y + Math.sin(an) * d0); ctx.lineTo(x + f.facing * 7 + Math.cos(an) * d1 * f.facing, y + Math.sin(an) * d1); ctx.stroke(); }
        ctx.restore(); ctx.lineWidth = 1;
      }
      if (g.k > 0.4) T(ctx, 'GLOVES UP.', f.x, g.top - 22, '#ff5a4a');
    },

    // ---- Alejandro: a slab of rock punches out of the floor ----
    rockShield(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      if (f.rockT == null || f.rockLast == null || t - f.rockLast > 4) f.rockT = 0;      // (a fresh block starts it over)
      f.rockLast = t; const age = ++f.rockT;
      const up = Math.min(1, age / 7), ease = 1 - (1 - up) * (1 - up);
      const w = 17, h = g.hurt.h * 0.92 * ease, x0 = f.x + f.facing * (f.body.width / 2 + 5), floor = g.base;
      // the stomp: a ring of dust and cracks in the floor
      if (age < 16) {
        ctx.globalAlpha = 0.7 * (1 - age / 16); ctx.strokeStyle = '#d8ccb8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x + f.facing * 6, floor - 1, 8 + age * 2.6, 2 + age * 0.5, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.translate(Math.round(x0 + (g.k > 0 ? (hash(t) - 0.5) * 2 * g.k : 0)), Math.round(floor));
      // the slab: stacked, jagged boulders (each its own polygon, lit from the top-left), not a tidy wall
      const n = Math.max(2, Math.round(h / 17)), seg = h / n;
      for (let i = 0; i < n; i++) {
        const y1 = -i * seg, y0 = -(i + 1) * seg - 3, wl = w / 2 + 1 + hash(i * 5 + 1) * 2, wr = w / 2 + 1 + hash(i * 5 + 2) * 2, mx = (hash(i * 5 + 3) - 0.5) * 3;
        const pts = [[-wl, y1], [-wl - 1, y1 - seg * 0.45], [-wl * 0.6, y0 + 1], [mx - 1, y0 - 1], [wr * 0.7, y0 + 2], [wr + 1, y1 - seg * 0.5], [wr, y1]];
        const path = () => { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
        path(); ctx.fillStyle = '#1c150e'; ctx.fill(); ctx.save(); ctx.translate(0, 0); ctx.scale(0.88, 0.9); ctx.translate(0, -y1 * 0.1 + (y1 === 0 ? 0 : 0));
        path(); ctx.fillStyle = i % 2 ? '#66584a' : '#5a4d3c'; ctx.fill(); ctx.restore();
        ctx.fillStyle = '#a89478'; ctx.fillRect(-wl + 2, y0 + 4, 3, Math.round(seg * 0.4));          // the lit edge
        ctx.fillStyle = '#4a3e30'; ctx.fillRect(Math.round(wr - 5), y1 - Math.round(seg * 0.5), 4, Math.round(seg * 0.4));   // the shadow side
        ctx.fillStyle = '#d8c8a8'; ctx.fillRect(-2 + Math.round(mx), y0 + 3, 4, 1);
      }
      // cracks that grow with every hit it takes (it holds until the block is let go)
      const dmg = f.rockHits || 0; ctx.strokeStyle = '#1a140c';
      for (let c = 0; c < Math.min(4, dmg + (g.k > 0 ? 1 : 0)); c++) { ctx.beginPath(); const cy = -h * (0.25 + c * 0.2); ctx.moveTo(-w / 2 + 1, cy); ctx.lineTo(-2, cy - 3); ctx.lineTo(1, cy + 2); ctx.lineTo(w / 2 - 1, cy - 2); ctx.stroke(); }
      if (g.k > 0) for (let i = 0; i < 6; i++) { const a = hash(t * 0.2 + i) * 6.28, d = (1 - g.k) * 14 + 4; ctx.globalAlpha = g.k; R(ctx, i % 2 ? '#a89880' : '#6a5c4a', f.facing * Math.cos(a) * d + 2, -h * 0.5 + Math.sin(a) * d * 1.4, 2, 2); }   // chips fly
      ctx.globalAlpha = 1; ctx.restore(); ctx.lineWidth = 1;
      if (g.k > 0.4) { if (g.k > 0.95) f.rockHits = (f.rockHits || 0) + 1; T(ctx, 'ROCK SOLID.', f.x, g.top - 22, '#d8c8a8'); }
      if (age === 1) f.rockHits = 0;
    },

    // ---- Olu: the shell, with a gold ring that rings ----
    shellUp(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const x = f.x + f.facing * (f.body.width / 2 - 2), y = g.top + 24;
      ctx.save(); ctx.globalAlpha = 0.35 + g.k * 0.6; ctx.strokeStyle = g.k > 0.4 ? '#ffffff' : '#ffd75a'; ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(x, y, 11 + i * 4 + g.k * 8 * (1 - i * 0.4), 17 + i * 5 + g.k * 6, 0, -1.3, 1.3, f.facing < 0); ctx.stroke(); }
      ctx.restore(); ctx.lineWidth = 1;
      if (g.k > 0.4) T(ctx, 'SHELL UP.', f.x, g.top - 26, '#ffd75a');
    },

    // ---- Bandy: the deck, on its edge ----
    skateGuard(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const wob = g.k > 0 ? Math.sin(t * 1.4) * 0.12 * g.k : 0, h = Math.min(g.hurt.h * 0.62, 50);
      ctx.save(); ctx.translate(Math.round(f.x + f.facing * (f.body.width / 2 + 4)), Math.round(g.mid + 4)); ctx.rotate(wob + f.facing * 0.08);
      R(ctx, '#111', -4, -h / 2 - 1, 8, h + 2); R(ctx, '#ff60a0', -3, -h / 2, 6, h);              // the deck, grip-tape side toward you
      R(ctx, '#2ad0c0', -3, -h / 2 + 5, 6, 4); R(ctx, '#ffe27a', -2, 0, 4, 4); R(ctx, '#fff', -2, h / 2 - 9, 3, 3);   // stickers
      for (const e of [-1, 1]) { R(ctx, '#111', f.facing * 3 - 2, e * (h / 2 - 5) - 3, 5, 6); R(ctx, '#e8e0c8', f.facing * 3 - 1, e * (h / 2 - 5) - 2, 3, 4); }   // the wheels
      ctx.restore();
      if (g.k > 0.4) T(ctx, 'NICE TRY.', f.x, g.top - 22, '#ff60a0');
    },

    // ---- Ms. Brady: a clipboard, and a pen ----
    clipboard(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const x = f.x + f.facing * (f.body.width / 2 + 6), w = 20, h = Math.min(g.hurt.h * 0.6, 44), y = g.mid - h / 2 + 4;
      ctx.save(); ctx.translate(Math.round(x + (g.k > 0 ? (hash(t) - 0.5) * 2 * g.k : 0)), Math.round(y));
      R(ctx, '#2a1a0a', -w / 2 - 1, -1, w + 2, h + 2); R(ctx, '#8a5a2a', -w / 2, 0, w, h); R(ctx, '#f4f0e6', -w / 2 + 2, 4, w - 4, h - 6);
      R(ctx, '#c8c8d0', -4, -3, 8, 5); R(ctx, '#6a6a74', -2, -2, 4, 2);                            // the clip
      for (let i = 0; i < 6; i++) R(ctx, i % 3 === 2 ? '#d0507a' : '#8a8a96', -w / 2 + 4, 9 + i * 5, w - 8 - (i % 2) * 3, 1);   // the ruled lines
      const stamp = Math.min(3, Math.floor((f.shieldHit > 0 ? 1 : 0) + ((f.clipHits || 0)))); if (g.k > 0.9) f.clipHits = Math.min(3, (f.clipHits || 0) + 1);
      ctx.strokeStyle = '#d02030'; ctx.lineWidth = 2;
      for (let i = 0; i < stamp; i++) { const cy = 12 + i * 11; ctx.beginPath(); ctx.moveTo(-w / 2 + 3, cy - 4); ctx.lineTo(w / 2 - 3, cy + 4); ctx.moveTo(w / 2 - 3, cy - 4); ctx.lineTo(-w / 2 + 3, cy + 4); ctx.stroke(); }
      ctx.restore(); ctx.lineWidth = 1;
      if (f.stateTime < 2 && f.state === 'block') f.clipHits = 0;
      if (g.k > 0.4) T(ctx, 'DENIED.', f.x, g.top - 22, '#ff6a8a');
    },

    // ---- Javan: the blocking sled ----
    blockingSled(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const squish = g.k * 3, x = f.x + f.facing * (f.body.width / 2 + 5 - squish), h = Math.min(g.hurt.h * 0.78, 60);
      ctx.save(); ctx.translate(Math.round(x), Math.round(g.base)); ctx.scale(f.facing, 1);
      R(ctx, '#111', -2, -h - 1, 14 - squish, h + 1); R(ctx, '#0a5a38', -1, -h, 12 - squish, h - 2);   // the pad
      R(ctx, '#3ad070', 0, -h, 3, h - 2); R(ctx, '#e8e8f0', 2, -h * 0.66, 9 - squish, 3); R(ctx, '#e8e8f0', 2, -h * 0.33, 9 - squish, 3);   // the highlight, the white stripes
      R(ctx, '#111', -4, -3, 6, 3); R(ctx, '#111', 8 - squish, -3, 6, 3);                             // the sled's feet
      ctx.restore();
      if (g.k > 0.4) T(ctx, 'DEFENSE!', f.x, g.top - 22, '#3ad070');
    },

    // ---- Donald Trump: a podium with the seal ----
    podium(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const x = f.x + f.facing * (f.body.width / 2 + 7), h = Math.min(g.hurt.h * 0.58, 46), rat = g.k > 0 ? Math.sin(t * 1.8) * g.k : 0;
      ctx.save(); ctx.translate(Math.round(x), Math.round(g.base)); ctx.scale(f.facing, 1);
      R(ctx, '#111', -9, -h - 1, 19, h + 1); R(ctx, '#5a3a22', -8, -h, 17, h - 1); R(ctx, '#7a5232', -8, -h, 17, 3); R(ctx, '#3a2412', 5, -h + 3, 4, h - 4);   // the wood, the lit top, the shadow side
      R(ctx, '#d4a838', -8, -h + 3, 17, 1); R(ctx, '#d4a838', -8, -3, 17, 1);                         // gold trim
      ctx.fillStyle = '#10205a'; ctx.beginPath(); ctx.arc(0, -h * 0.5, 5.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#d4a838'; ctx.beginPath(); ctx.arc(0, -h * 0.5, 5.5, 0, 7); ctx.stroke();   // the seal
      R(ctx, '#ffffff', -1, -h * 0.5 - 2, 3, 3);
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5; for (const dx of [-3, 4]) { ctx.beginPath(); ctx.moveTo(dx, -h); ctx.lineTo(dx + rat * 2, -h - 9); ctx.stroke(); R(ctx, '#222', dx - 1 + rat * 2, -h - 11, 3, 3); }   // two microphones
      ctx.restore(); ctx.lineWidth = 1;
      if (g.k > 0.4) T(ctx, 'WRONG.', f.x, g.top - 22, '#ffd75a');
    },

    // ---- Urbanik: an inkblot that never holds still ----
    inkblot(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const cx = f.x + f.facing * (f.body.width / 2 + 9), cy = g.mid - 2, ph = t / 14;
      ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.globalAlpha = 0.72 + g.k * 0.25;
      const blob = (col, grow) => {
        ctx.fillStyle = col;
        for (let i = 0; i < 7; i++) {
          const yy = -22 + i * 7 + Math.sin(ph + i) * 2, dx = 3 + hash(i + 2) * 6 + Math.sin(ph * 0.7 + i * 2) * 2.5 + grow, rr = 4 + hash(i + 9) * 4 + grow * 0.5;
          for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * dx, yy, rr, 0, 7); ctx.fill(); }     // mirrored, like the card
          ctx.beginPath(); ctx.arc(0, yy, 3.5 + grow * 0.4, 0, 7); ctx.fill();
        }
      };
      blob('#40e8d0', 1 + g.k * 2.5); blob(g.k > 0.4 ? '#e8d0ff' : '#1a0f2e', 0);
      ctx.restore(); ctx.globalAlpha = 1;
      if (g.k > 0.4) T(ctx, 'INTERESTING.', f.x, g.top - 22, '#40e8d0');
    },

    // ---- Erick: the velvet rope ----
    velvetRope(f, ctx, floorY, t) {
      const g = guardBox(f, floorY); if (!g) return;
      const a = f.x + f.facing * (f.body.width / 2 + 3), b = f.x + f.facing * (f.body.width / 2 + 24), top = g.base - Math.min(g.hurt.h * 0.5, 38), sway = g.k > 0 ? Math.sin(t * 1.3) * 5 * g.k : 0;
      for (const px of [a, b]) { R(ctx, '#111', px - 2, top - 3, 5, g.base - top + 3); R(ctx, '#d4a838', px - 1, top - 2, 3, g.base - top); R(ctx, '#fff0a0', px - 1, top - 2, 1, g.base - top); R(ctx, '#d4a838', px - 5, g.base - 2, 11, 2); R(ctx, '#d4a838', px - 3, top - 5, 7, 3); }   // brass posts
      ctx.strokeStyle = '#8a0f24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, top + 1); ctx.quadraticCurveTo((a + b) / 2 + sway, top + 9 + g.k * 4, b, top + 1); ctx.stroke();
      ctx.strokeStyle = '#d02040'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a, top); ctx.quadraticCurveTo((a + b) / 2 + sway, top + 8 + g.k * 4, b, top); ctx.stroke(); ctx.lineWidth = 1;
      const sx = (a + b) / 2; R(ctx, '#111', sx - 10, top - 20, 21, 9); R(ctx, '#e8e0c8', sx - 9, top - 19, 19, 7); R(ctx, '#d02040', sx - 8, top - 18, 17, 1);
      RF.font.drawText(ctx, 'FULL', sx, top - 17, { align: 'center', color: '#8a0f24' });
      if (g.k > 0.4) T(ctx, 'SOLD OUT!', f.x, g.top - 22, '#ffe27a');
    },
  };
  Object.assign(RF.BLOCK_FX, fx);

  // Alejandro stomps as he raises the guard: a crack through the floor, a shake and a puff of dust
  RF.BLOCK_START = {
    stomp(f) {
      const sc = f.scene; if (!sc || sc.phase !== 'fight') return;
      RF.audio.sfx('stomp'); sc.shake = Math.max(sc.shake || 0, 5);
      sc.effects.spawn('dust', f.x + f.facing * 6, 2); sc.effects.spawn('dust', f.x - f.facing * 6, 2); sc.effects.spawn('shock', f.x + f.facing * 12, 3);
      f.rockT = 0; f.rockHits = 0;
    },
  };

  const give = { loor: 'highGuard', alejandro: 'rockShield', olu: 'shellUp', bandy: 'skateGuard', brady: 'clipboard', javan: 'blockingSled', trump: 'podium', urbanik: 'inkblot', erick: 'velvetRope' };
  for (const id in give) { const d = RF.getCharacter(id); if (d && !d.blockFx) d.blockFx = give[id]; }
  const al = RF.getCharacter('alejandro'); if (al) { al.blockFx = 'rockShield'; al.blockStart = 'stomp'; }
})();
