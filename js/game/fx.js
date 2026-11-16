// Character-specific visual effects, attached by name in characters.js:
//   a move with  fx: '<name>'   draws RF.MOVE_FX[name] while it's out
//   a fighter with blockFx: '<name>' draws RF.BLOCK_FX[name] while blocking
(function () {
  const E = () => RF.electric;

  RF.MOVE_FX = {
    // Holbrook's light, MIGRATION: flow-map arrows stream out of his hand and a flock of
    // migrating birds sweeps back toward him, dragging the opponent along.
    migration(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime, reach = m.hitbox.x + m.hitbox.w;
      const hx = f.x + f.facing * 10, hy = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      const ph = t < m.startup ? t / m.startup : 1, fade = Math.max(0, 1 - Math.max(0, t - m.startup - m.active) / 8);
      if (fade <= 0) return;
      // three curved migration-flow arrows (dashed, like a map)
      for (let k = -1; k <= 1; k++) {
        const len = reach * ph, bow = k * 10;
        ctx.strokeStyle = `rgba(${k ? 255 : 255},${k ? 200 : 120},${k ? 80 : 60},${0.9 * fade})`;
        ctx.lineWidth = k ? 1 : 2;
        ctx.setLineDash([3, 2]); ctx.lineDashOffset = -frame;
        ctx.beginPath(); ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo(hx + f.facing * len / 2, hy + bow - 8, hx + f.facing * len, hy + bow / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const ex = hx + f.facing * len, ey = hy + bow / 2; // arrow head
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(ex + f.facing * 4, ey); ctx.lineTo(ex - f.facing * 2, ey - 3); ctx.lineTo(ex - f.facing * 2, ey + 3); ctx.fill();
      }
      ctx.lineWidth = 1;
      // the flock: chevrons flying back toward him
      for (let i = 0; i < 7; i++) {
        const u = ((t * 3 + i * 9) % reach) / reach;
        const bx = hx + f.facing * reach * (1 - u) * ph, by = hy - 14 + (i % 3) * 9 + Math.sin(t / 2 + i) * 2;
        const flap = (frame + i) % 6 < 3 ? 2 : 0;
        ctx.fillStyle = `rgba(30,20,20,${fade})`;
        ctx.fillRect(Math.round(bx) - 3, Math.round(by) - flap, 2, 1); ctx.fillRect(Math.round(bx) - 1, Math.round(by) + 1 - flap / 2, 2, 1);
        ctx.fillRect(Math.round(bx) + 1, Math.round(by) - flap, 2, 1);
      }
      if (t === m.startup + 1 && f.scene) RF.audio.sfx('birds');
    },

    // Mikey's aura: his rage meter (green bar over his head); when he SMASHES, green steam
    // pours off him.
    hulkAura(f, ctx, floorY, frame, layer) {
      if (layer !== 'front' || f.isKO || ['finished', 'thrown'].includes(f.state)) return;
      const x = Math.round(f.x), top = Math.round(floorY - f.y - f.body.height * (f.hulkT > 0 ? 1.15 : 1));
      if (f.hulkT > 0) {
        for (let i = 0; i < 5; i++) { const a = (frame * 2 + i * 13) % 40; ctx.globalAlpha = 0.5 * (1 - a / 40); ctx.fillStyle = '#80ff80'; ctx.fillRect(x - 14 + i * 7, top + 10 - a, 2, 3); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000'; ctx.fillRect(x - 16, top - 9, 32, 4);
        ctx.fillStyle = '#60ff60'; ctx.fillRect(x - 15, top - 8, Math.round(30 * f.hulkT / f.def.hulk.frames), 2);
      } else if (f.rageMeter > 0) {
        ctx.fillStyle = '#000'; ctx.fillRect(x - 12, top - 8, 24, 4);
        ctx.fillStyle = f.rageMeter > 75 && frame % 10 < 5 ? '#c0ffc0' : '#40c040'; ctx.fillRect(x - 11, top - 7, Math.round(22 * f.rageMeter / 100), 2);
      }
    },

    // Mikey's STIFF ARM: a straight-arm shove with speed lines.
    stiffArm(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 4) return;
      const x = f.x + f.facing * (m.hitbox.x + m.hitbox.w), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - f.facing * (12 + i * 6)), Math.round(y - 6 + i * 4), 8, 1);
    },

    // Mikey's HAYMAKER: a huge wind-up punch with a ground-shaking shockwave ring.
    haymaker(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 10) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.7), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.strokeStyle = f.hulkT > 0 ? '#60ff60' : '#ffd8a0'; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(0, 1 - a / 12);
      ctx.beginPath(); ctx.ellipse(x, y, 6 + a * 3, 10 + a * 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.globalAlpha = 1;
      if (a < 8 && f.moveHasHit) RF.font.drawText(ctx, f.hulkT > 0 ? 'SMASH!' : 'POW!', x, y - 30, { align: 'center', color: f.hulkT > 0 ? '#60ff60' : '#ffd030', outline: '#000' });
    },

    // Alejandro's aura: puffs of climbing chalk off his hands.
    chalkAura(f, ctx, floorY, frame, layer) {
      if (layer !== 'front' || f.isKO || ['finished', 'thrown'].includes(f.state)) return;
      for (let i = 0; i < 3; i++) {
        const age = (frame + i * 25) % 75;
        if (age > 40) continue;
        ctx.globalAlpha = 0.5 * (1 - age / 40);
        ctx.fillStyle = '#f4f0ea';
        ctx.fillRect(Math.round(f.x + f.facing * (12 + i * 2) + Math.sin(age / 5 + i) * 3), Math.round(floorY - f.y - 56 - age * 0.4), 2, 2);
      }
      ctx.globalAlpha = 1;
    },

    // Alejandro's CHALK JAB: a white puff of chalk where the fist lands.
    chalkJab(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 8) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.7), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.globalAlpha = Math.max(0, 0.8 - a / 12); ctx.fillStyle = '#f4f0ea';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.3) * a * 1.2, y + Math.sin(i * 1.3) * a, 2 + a * 0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    },

    // Alejandro's CARABINER SWING: a whipping arc of rope with a steel carabiner on the end.
    ropeWhip(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 3 || t > m.startup + m.active + 6) return;
      const a = Math.max(0, t - m.startup + 3), reach = m.hitbox.x + m.hitbox.w, hx = f.x + f.facing * 10, hy = floorY - f.y - 56;
      const ang = -1.1 + Math.min(1, a / 7) * 1.5, ex = hx + f.facing * Math.cos(ang) * reach, ey = hy + Math.sin(ang) * reach * 0.6;
      ctx.strokeStyle = '#e07030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo((hx + ex) / 2, (hy + ey) / 2 - 8, ex, ey); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#111'; ctx.fillRect(Math.round(ex) - 3, Math.round(ey) - 4, 7, 9);
      ctx.fillStyle = '#c8c8d0'; ctx.fillRect(Math.round(ex) - 2, Math.round(ey) - 3, 5, 7);
    },

    // Lopez Tuero's aura: math symbols orbiting him, slowly.
    mathAura(f, ctx, floorY, frame, layer) {
      if (f.isKO || ['finished', 'thrown'].includes(f.state)) return;
      const syms = ['∫', 'Σ', '∞', 'Δ'];
      for (let i = 0; i < 4; i++) {
        const a = frame / 50 + i * Math.PI / 2, front = Math.sin(a) > 0;
        if ((layer === 'front') !== front) continue;
        const x = f.x + Math.cos(a) * (f.body.width * 0.9), y = floorY - f.y - f.body.height * 0.55 + Math.sin(a * 2) * 6;
        ctx.globalAlpha = front ? 0.75 : 0.35;
        RF.font.drawText(ctx, syms[i], x, y, { align: 'center', color: '#00ffd0', outline: front ? '#000' : undefined });
      }
      ctx.globalAlpha = 1;
    },

    // Lopez Tuero's DERIVATIVE: a quick flick that leaves a glowing tangent line and d/dx.
    derivFlick(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 8) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.6), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.strokeStyle = '#00ffd0'; ctx.globalAlpha = Math.max(0, 1 - a / 12);
      ctx.beginPath(); ctx.moveTo(x - f.facing * 16, y + 6); ctx.lineTo(x + f.facing * 16, y - 6); ctx.stroke();
      RF.font.drawText(ctx, 'D/DX', x, y - 16 - a, { align: 'center', color: '#a0fff0', outline: '#000' });
      ctx.globalAlpha = 1;
    },

    // Lopez Tuero's INTEGRAL STRIKE: a giant integral sign slashes down through them.
    integralSlash(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 3 || t > m.startup + m.active + 10) return;
      const a = t - m.startup + 3, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.55), y = floorY - f.y - 70 + Math.min(1, a / 6) * 40;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, a - 8) / 10);
      RF.font.drawText(ctx, '∫', x, y, { scale: 5, align: 'center', color: ['#ffffff', '#e0fff8', '#a0fff0', '#00ffd0', '#00ffd0', '#00b0a0', '#008070'], outline: '#002a24' });
      ctx.globalAlpha = 1;
    },

    // Wuttke's aura: music notes drifting around him, always.
    maestroAura(f, ctx, floorY, frame, layer) {
      if (layer !== 'front' || f.isKO || ['finished', 'thrown', 'hitstun'].includes(f.state)) return;
      for (let i = 0; i < 3; i++) {
        const age = (frame + i * 40) % 120;
        if (age > 80) continue;
        const a = (frame / 40 + i * 2.1), x = f.x + Math.cos(a) * (f.body.width * 0.9), y = floorY - f.y - f.body.height * 0.4 - age * 0.45;
        ctx.globalAlpha = 1 - age / 80;
        RF.drawNote(ctx, x, y, ['#ffd040', '#e0c0ff', '#ffffff'][i], 1, i === 1);
      }
      ctx.globalAlpha = 1;
    },

    // Wuttke's STACCATO: a quick strum that throws off a spray of little notes.
    noteStrum(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 8) return;
      const a = t - m.startup, y0 = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      for (let i = 0; i < 3; i++) RF.drawNote(ctx, f.x + f.facing * (16 + a * 3 + i * 7), y0 - i * 4 + Math.sin(a + i) * 2, i % 2 ? '#ffd040' : '#e0c0ff', 1);
    },

    // Wuttke's FORTISSIMO: a big chord - rings of sound blasting outward.
    soundBlast(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 12) return;
      const a = t - m.startup, x = f.x + f.facing * 14, y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const r = 8 + a * 3 - i * 8;
        if (r <= 0) continue;
        ctx.strokeStyle = i % 2 ? '#ffd040' : '#c080ff'; ctx.globalAlpha = Math.max(0, 1 - a / 16);
        ctx.beginPath(); ctx.arc(x, y, r, f.facing > 0 ? -0.9 : Math.PI - 0.9, f.facing > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
      if (a < 8) RF.font.drawText(ctx, 'FF!', x + f.facing * 30, y - 24, { align: 'center', color: '#ffd040', outline: '#000' });
    },

    // Gabriel's aura: crackles of psychic energy. As MR. SUPPLIER: a gold glow, shades,
    // a name tag over his head and a timer.
    hyperAura(f, ctx, floorY, frame, layer) {
      if (f.isKO || f.state === 'finished' || f.state === 'thrown') return;
      const sup = f.alterT > 0;
      if (layer === 'back' && sup) {
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(frame / 4);
        ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.ellipse(f.x, floorY - f.y - f.body.height / 2, f.body.width, f.body.height * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }
      if (layer !== 'front') return;
      for (let i = 0; i < 3; i++) { // little electric crackles around him
        if ((frame + i * 7) % 16 > 3) continue;
        const a = (frame * 0.7 + i * 2.1) % (Math.PI * 2), x = f.x + Math.cos(a) * f.body.width * 0.8, y = floorY - f.y - f.body.height * (0.3 + 0.5 * Math.abs(Math.sin(a)));
        ctx.fillStyle = sup ? '#ffd040' : '#40e8ff';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 3); ctx.fillRect(Math.round(x + 1), Math.round(y + 2), 2, 1);
      }
      if (!sup) return;
      const hy = floorY - f.y - f.body.height + 8;                      // shades
      for (let dx = -1; dx <= 8; dx++) { ctx.fillStyle = dx === 3 || dx === 4 ? '#333' : '#050505'; ctx.fillRect(Math.round(f.x + f.facing * dx), hy, 1, 3); }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(f.x + f.facing * 6), hy, 1, 1);
      RF.font.drawText(ctx, 'MR. SUPPLIER', f.x, floorY - f.y - f.body.height - 20, { align: 'center', color: '#ffd040', outline: '#000' });
      ctx.fillStyle = '#000'; ctx.fillRect(Math.round(f.x - 16), Math.round(floorY - f.y - f.body.height - 10), 32, 3);
      ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(f.x - 15), Math.round(floorY - f.y - f.body.height - 9), Math.round(30 * f.alterT / f.def.alterEgo.frames), 1);
    },

    // Gabriel's ENERGY JAB: a cyan spark burst on the fist.
    energyJab(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 3) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.7), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.fillStyle = f.alterT > 0 ? '#ffd040' : '#40e8ff';
      for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + a; ctx.fillRect(Math.round(x + Math.cos(an) * (3 + a * 2)), Math.round(y + Math.sin(an) * (3 + a * 2)), 2, 2); }
    },

    // Gabriel's PSI PUNCH: the punch lands with an expanding psychic ring.
    psiPunch(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 10) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.6), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      ctx.strokeStyle = f.alterT > 0 ? '#ffd040' : '#40e8ff'; ctx.lineWidth = 2; ctx.globalAlpha = Math.max(0, 1 - a / 14);
      ctx.beginPath(); ctx.ellipse(x, y, 4 + a * 2, 6 + a * 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    },

    // Fernando's aura: smoke curling up off the cigarette in his raised hand.
    smokeAura(f, ctx, floorY, frame, layer) {
      if (layer !== 'front' || !['idle', 'walk', 'taunt'].includes(f.state)) return;
      const tipX = f.x + f.facing * 16, tipY = floorY - f.y - 78;
      for (let i = 0; i < 6; i++) {
        const age = (frame + i * 12) % 72;
        const x = tipX + Math.sin((frame + i * 20) / 10) * (2 + age * 0.08), y = tipY - age * 0.6;
        ctx.globalAlpha = 0.5 * (1 - age / 72);
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(Math.round(x), Math.round(y), age > 30 ? 2 : 1, age > 30 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
    },

    // Fernando's ASH FLICK: a spray of glowing embers.
    emberFlick(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 8) return;
      const a = t - m.startup, y0 = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      for (let i = 0; i < 6; i++) {
        const x = f.x + f.facing * (18 + a * (2 + i * 0.5)), y = y0 + (i - 3) * a * 0.4 + a * a * 0.04;
        ctx.fillStyle = i % 2 ? '#ffd040' : '#ff6020';
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
    },

    // Fernando's SHOTGUN: muzzle flash, a cone of pellets, smoke, BOOM.
    shotgunBlast(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 12) return;
      const a = t - m.startup, mx = f.x + f.facing * 36, my = floorY - f.y - 70;
      if (a === 0) { RF.audio.sfx('boom'); if (f.scene) { f.scene.shake = Math.max(f.scene.shake, 8); f.scene.flash = Math.max(f.scene.flash, 2); } }
      if (a < 4) { // the flash
        ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(mx + f.facing * 4, my, 7 - a, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9020'; ctx.beginPath(); ctx.arc(mx + f.facing * 9, my, 5 - a, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 9; i++) { // pellets
        const spread = (i - 4) * 0.09, d = 10 + a * 9;
        ctx.fillStyle = '#ffe080';
        ctx.fillRect(Math.round(mx + f.facing * d), Math.round(my + d * spread), 2, 1);
      }
      ctx.globalAlpha = Math.max(0, 0.6 - a / 20); ctx.fillStyle = '#b0b0b0';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(mx + f.facing * (6 + i * 5), my - a * 0.6 - i, 3 + a * 0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (a < 10) RF.font.drawText(ctx, 'BOOM!', f.x + f.facing * 46, my - 22, { align: 'center', color: '#ffd040', outline: '#000' });
    },

    // Tyler's aura: little music notes drifting out of his earbuds. He's vibing.
    chillAura(f, ctx, floorY, frame, layer) {
      if (layer !== 'front' || f.isKO || f.state === 'finished' || f.state === 'thrown' || f.state === 'hitstun') return;
      for (let i = 0; i < 2; i++) {
        const age = (frame + i * 45) % 90;
        if (age > 60) continue;
        const x = Math.round(f.x - f.facing * 6 + Math.sin((frame + i * 30) / 9) * 4 - f.facing * age * 0.15);
        const y = Math.round(floorY - f.y - f.body.height + 4 - age * 0.4);
        ctx.globalAlpha = 1 - age / 60;
        ctx.fillStyle = '#111'; ctx.fillRect(x - 1, y + 2, 4, 3); ctx.fillRect(x + 2, y - 4, 2, 7);
        ctx.fillStyle = i ? '#80ffb0' : '#ffffff'; ctx.fillRect(x, y + 3, 2, 1); ctx.fillRect(x + 2, y - 3, 1, 6); ctx.fillRect(x + 3, y - 3, 2, 1);
        ctx.globalAlpha = 1;
      }
    },

    // Tyler's PUTT: a short silver streak along the swing.
    puttSwing(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 4) return;
      const a = t - m.startup, y = Math.round(floorY - f.y - m.hitbox.y - m.hitbox.h / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(f.x + f.facing * (14 + i * 8 + a * 2)), y + i, 6, 1);
    },

    // Tyler's DRIVER: a big white arc around the swing, and a "THWACK".
    driverSwing(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 2 || t > m.startup + m.active + 6) return;
      const a = Math.max(0, t - m.startup + 2), cx = f.x + f.facing * 6, cy = floorY - f.y - 46;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      const a0 = f.facing > 0 ? -Math.PI * 0.6 : -Math.PI * 0.4, a1 = a0 + f.facing * Math.min(Math.PI * 1.1, a * 0.35);
      ctx.arc(cx, cy, 38, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke(); ctx.lineWidth = 1;
      if (f.moveHasHit && a < 10) RF.font.drawText(ctx, 'THWACK!', f.x + f.facing * 40, cy - 30, { align: 'center', color: '#ffffff', outline: '#000' });
    },

    // Tyler's SAND WEDGE: a spray of sand off the ground.
    sandWedge(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 12) return;
      const a = t - m.startup;
      for (let i = 0; i < 9; i++) {
        const d = a * (1.2 + (i % 3) * 0.5), x = f.x + f.facing * (20 + i * 4 + d), y = floorY - (a * 2.4 - a * a * 0.12) * (0.5 + (i % 4) * 0.25);
        ctx.fillStyle = i % 2 ? '#e8d090' : '#c8a860';
        ctx.fillRect(Math.round(x), Math.round(Math.min(floorY - 1, y)), 2, 2);
      }
    },

    // Nicholas's aura: his power meter as a tiny bar over his head; a spinning gold star when full.
    boxerAura(f, ctx, floorY, frame, layer) {
      if (layer !== 'front' || f.isKO || f.state === 'finished' || f.state === 'thrown') return;
      const x = Math.round(f.x), y = Math.round(floorY - f.y - f.body.height - 10);
      if (f.power >= 100) { // the star
        const r = 6 + Math.sin(frame / 4), a0 = frame / 10;
        ctx.fillStyle = '#111'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r + 1, a = a0 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.fill();
        ctx.fillStyle = frame % 10 < 5 ? '#ffd030' : '#fff2a0'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.4 : r, a = a0 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.fill();
      } else if (f.power > 0) {
        ctx.fillStyle = '#000'; ctx.fillRect(x - 11, y - 1, 22, 4);
        ctx.fillStyle = '#ffd030'; ctx.fillRect(x - 10, y, Math.round(20 * f.power / 100), 2);
      }
    },

    // Nicholas's MAX GAINS punch: a burst of stars off the fist.
    starPunch(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 12) return;
      const a = t - m.startup, x = f.x + f.facing * (m.hitbox.x + m.hitbox.w), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4, d = 4 + a * 2.5;
        ctx.fillStyle = i % 2 ? '#ffd030' : '#ffffff';
        ctx.fillRect(Math.round(x + Math.cos(ang) * d) - 1, Math.round(y + Math.sin(ang) * d) - 1, 3, 3);
      }
      if (a < 4) { ctx.fillStyle = 'rgba(255,240,160,0.7)'; ctx.beginPath(); ctx.arc(x, y, 10 - a * 2, 0, Math.PI * 2); ctx.fill(); }
    },

    // Tamayo's light, LANYARD WHIP: his ID badge swung on its lanyard.
    lanyard(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t > m.startup + m.active + 4) return;
      const u = Math.min(1, t / (m.startup + m.active)), a = -1.2 + u * 1.6, R = m.hitbox.x + m.hitbox.w - 4;
      const ox = f.x + f.facing * 6, oy = floorY - f.y - m.hitbox.y - 8;
      const bx = ox + f.facing * Math.cos(a) * R, by = oy + Math.sin(a) * R * 0.5;
      ctx.strokeStyle = '#2a5ad0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.fillRect(Math.round(bx) - 4, Math.round(by) - 5, 8, 10);
      ctx.fillStyle = '#e8ecf2'; ctx.fillRect(Math.round(bx) - 3, Math.round(by) - 4, 6, 8);
      ctx.fillStyle = '#5a82b0'; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 3, 4, 3);
    },

    // Tamayo's heavy, EXECUTIVE ORDER: the punch lands with an official stamp.
    execOrder(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (!f.moveHasHit || t > m.startup + m.active + 16) return;
      const x = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.8), y = floorY - f.y - m.hitbox.y - m.hitbox.h / 2 - 10;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(-0.15);
      ctx.strokeStyle = '#e02020'; ctx.lineWidth = 2; ctx.strokeRect(-36, -8, 72, 16); ctx.lineWidth = 1;
      RF.font.drawText(ctx, 'EXECUTIVE ORDER', 0, -4, { align: 'center', color: '#e02020', outline: '#000' });
      ctx.restore();
    },

    // Ruano's aura: a golden halo and soft angel wings that gently beat, with drifting light.
    angelAura(f, ctx, floorY, frame, layer) {
      if (f.isKO || f.state === 'thrown' || f.state === 'finished' || f.state === 'knockdown') return;
      const sp = f.def.sprite, U = sp.scale, baseY = floorY - f.y;
      const at = (cr) => [f.x + f.facing * (cr[0] + 0.5 - sp.footCol) * U, baseY - (sp.grid.length - cr[1]) * U];
      if (layer === 'back') { // wings, behind her
        const [wx, wy] = at(sp.wingsAt), flap = Math.sin(frame / 16) * 0.18;
        for (const side of [1, -1]) {
          ctx.save(); ctx.translate(Math.round(wx - f.facing * 4), Math.round(wy)); ctx.scale(-f.facing, 1); ctx.rotate(side > 0 ? -0.25 - flap : 0.1 + flap * 0.6);
          ctx.globalAlpha = side > 0 ? 0.85 : 0.5;
          for (let i = 0; i < 5; i++) { // feathers, longest at the top
            const len = 30 - i * 4, y = -18 + i * 7;
            ctx.fillStyle = '#c8c8d8'; ctx.fillRect(0, y, len + 1, 6);
            ctx.fillStyle = i % 2 ? '#ffffff' : '#f0f0fa'; ctx.fillRect(1, y + 1, len, 4);
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 5; i++) { // drifting motes of light
          const u = ((frame * 0.5 + i * 19) % 60) / 60;
          ctx.fillStyle = `rgba(255,240,180,${0.8 * (1 - u)})`;
          ctx.fillRect(Math.round(f.x + (RF.util.hash(i * 3.7) - 0.5) * 40), Math.round(baseY - 10 - u * f.body.height), 2, 2);
        }
        return;
      }
      const [hx, hy] = at(sp.haloAt); // the halo
      const bob = Math.sin(frame / 20);
      ctx.strokeStyle = '#8a6a10'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(Math.round(hx), Math.round(hy - 6 + bob), 10, 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,210,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(Math.round(hx), Math.round(hy - 6 + bob), 13, 5, 0, 0, Math.PI * 2); ctx.stroke();
    },

    // Ruano's light, BRUSHSTROKE: a sweeping arc of paint (red, yellow, blue - like a palette).
    paintStroke(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup - 2 || t > m.startup + m.active + 8) return;
      const prog = Math.min(1, (t - m.startup + 2) / (m.active + 2)), fade = t > m.startup + m.active ? 1 - (t - m.startup - m.active) / 8 : 1;
      const cx = f.x + f.facing * 8, cy = floorY - f.y - m.hitbox.y - m.hitbox.h / 2, R = m.hitbox.x + m.hitbox.w - 6;
      ctx.save(); ctx.globalAlpha = Math.max(0, fade);
      ['#d02a2a', '#f0c020', '#2a5ad0'].forEach((col, i) => {
        ctx.strokeStyle = col; ctx.lineWidth = 4 - i;
        ctx.beginPath();
        const a0 = -1.1, a1 = a0 + 2.0 * prog;
        for (let a = a0; a <= a1; a += 0.1) {
          const x = cx + f.facing * Math.cos(a) * (R - i * 5), y = cy + Math.sin(a) * (R - i * 5) * 0.55;
          a === a0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore(); ctx.lineWidth = 1;
    },

    // Ruano's heavy, GOLDEN FRAME: a huge gilded picture frame brought down overhead.
    goldFrame(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t > m.startup + m.active + 10) return;
      const u = Math.min(1, t / m.startup), ang = (1 - u) * -1.6; // raised, then swung down
      const px = f.x + f.facing * 6, py = floorY - f.y - f.body.height * 0.75;
      ctx.save(); ctx.translate(Math.round(px), Math.round(py)); ctx.scale(f.facing, 1); ctx.rotate(ang);
      ctx.fillStyle = '#111'; ctx.fillRect(4, -16, 46, 34);
      ctx.fillStyle = '#c8961e'; ctx.fillRect(5, -15, 44, 32);
      ctx.fillStyle = '#ffd860'; ctx.fillRect(6, -14, 42, 2); ctx.fillRect(6, 13, 42, 2);
      ctx.fillStyle = '#3a6a9a'; ctx.fillRect(10, -10, 34, 24);      // the painting: a little Spanish landscape
      ctx.fillStyle = '#e8c070'; ctx.fillRect(10, 2, 34, 12);
      ctx.fillStyle = '#ffe680'; ctx.fillRect(34, -7, 5, 5);           // the sun
      ctx.restore();
    },

    // Chris's light, MONEY SLAP: bills fly off the hand that slaps you.
    cashSlap(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime;
      if (t < m.startup || t > m.startup + m.active + 10) return;
      const a = t - m.startup, hx = f.x + f.facing * (m.hitbox.x + m.hitbox.w * 0.6), hy = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 1.4 - 1.2, d = a * (1.6 + (i % 3) * 0.6);
        const x = hx + f.facing * Math.cos(ang) * d, y = hy + Math.sin(ang) * d + a * a * 0.05;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a * 0.3 + i);
        ctx.fillStyle = '#111'; ctx.fillRect(-4, -2, 8, 5); ctx.fillStyle = '#9ac070'; ctx.fillRect(-3, -1, 6, 3);
        ctx.restore();
      }
      if (a === 0) RF.audio.sfx('cash');
    },

    // Anthony's aura: a slowly turning crimson magic circle behind his head and
    // pink flames dancing in his open hands.
    sorcererAura(f, ctx, floorY, frame, layer) {
      if (f.isKO || f.state === 'thrown' || f.state === 'finished' || f.state === 'knockdown') return;
      const sp = f.def.sprite, U = sp.scale, baseY = floorY - f.y; // floorY already includes his hover
      const at = (cr) => [f.x + f.facing * (cr[0] + 0.5 - sp.footCol) * U, baseY - (sp.grid.length - cr[1]) * U];
      if (layer === 'back') {
        const [hx, hy] = at(sp.haloAt), R = 24, rot = frame / 60;
        ctx.save(); ctx.translate(Math.round(hx), Math.round(hy));
        ctx.globalAlpha = 0.55 + 0.15 * Math.sin(frame / 9);
        ctx.strokeStyle = '#e8507a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = '#ffb0c8';
        ctx.beginPath(); ctx.arc(0, 0, R - 5, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) { // spokes + runes
          const a = rot + (i / 8) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 5), Math.sin(a) * (R - 5)); ctx.lineTo(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4)); ctx.stroke();
          const b = -rot * 1.5 + (i / 8) * Math.PI * 2;
          ctx.fillStyle = '#ffe0ea'; ctx.fillRect(Math.round(Math.cos(b) * (R - 10)) - 1, Math.round(Math.sin(b) * (R - 10)) - 1, 2, 2);
        }
        ctx.restore();
        return;
      }
      // flames in the open hands (the front one only while that arm is free)
      const hands = [sp.backHandAt];
      if (!['attack', 'special', 'throwReach', 'throwing', 'block', 'blockstun'].includes(f.state)) hands.push(sp.frontHandAt);
      for (const h of hands) {
        const [x, y] = at(h);
        for (let i = 0; i < 9; i++) {
          const u = ((frame * 1.3 + i * 13) % 24) / 24;
          const fx = x + Math.sin(i * 2.1 + frame / 5) * (3 + u * 3), fy = y - 3 - u * 18;
          ctx.fillStyle = u < 0.3 ? '#fff0f4' : u < 0.6 ? `rgba(255,120,160,${1 - u})` : `rgba(200,40,80,${1 - u})`;
          const s = Math.max(1, Math.round(4 - u * 3));
          ctx.fillRect(Math.round(fx - s / 2), Math.round(fy), s, s + 1);
        }
      }
    },

    // Anthony's light, ARCANE BURST: a spinning sigil bursts out of his palm.
    arcane(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime, reach = m.hitbox.x + m.hitbox.w;
      const hx = f.x + f.facing * 16, hy = floorY - f.y - m.hitbox.y - m.hitbox.h / 2;
      if (t < m.startup) { // gathering
        ctx.fillStyle = `rgba(255,120,170,${t / m.startup})`;
        ctx.beginPath(); ctx.arc(hx, hy, 2 + t, 0, Math.PI * 2); ctx.fill();
        return;
      }
      const a = t - m.startup; if (a > m.active + 6) return;
      const fade = a > m.active ? 1 - (a - m.active) / 6 : 1, len = reach * Math.min(1, (a + 1) / 2);
      ctx.save(); ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(255,90,140,0.55)'; ctx.fillRect(Math.round(Math.min(hx, hx + f.facing * len)), Math.round(hy - 5), Math.round(len), 10);
      ctx.fillStyle = '#ffe0ea'; ctx.fillRect(Math.round(Math.min(hx, hx + f.facing * len)), Math.round(hy - 1), Math.round(len), 3);
      const sx = hx + f.facing * len; // the sigil at the tip
      ctx.strokeStyle = '#ff70a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, hy, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const ang = frame / 4 + i * Math.PI / 3; ctx.lineTo(sx + Math.cos(ang) * 9, hy + Math.sin(ang) * 9); }
      ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1;
      ctx.restore();
    },

    // Super specials: the fighter burns with golden energy.
    superAura(f, ctx, floorY, frame) {
      const h = f.body.height, baseY = floorY - f.y;
      for (let i = 0; i < 16; i++) {
        const life = (frame * 1.6 + i * 13) % 30, u = life / 30;
        const x = f.x + (RF.util.hash(i * 7.7) - 0.5) * f.body.width * 1.8;
        const y = baseY - u * (h + 20) + 4;
        ctx.fillStyle = i % 3 === 0 ? `rgba(255,255,220,${1 - u})` : `rgba(255,${150 + (i % 4) * 25},20,${0.8 * (1 - u)})`;
        const sz = 2 + (i % 3);
        ctx.fillRect(Math.round(x), Math.round(y), sz, sz + 2);
      }
    },

    // King Sirven: a golden crown that never leaves his head, and royal sparkles.
    royalAura(f, ctx, floorY, frame, layer) {
      const sp = f.def.sprite, U = sp.scale;
      const baseY = floorY - f.y;
      if (layer === 'back') {
        for (let i = 0; i < 6; i++) {
          const life = (frame * 0.6 + i * 23) % 50, u = life / 50;
          if (u > 0.8) continue;
          const x = f.x + (RF.util.hash(i * 5.1) - 0.5) * f.body.width * 1.5, y = baseY - 10 - u * f.body.height;
          ctx.fillStyle = i % 2 ? '#ffe680' : '#ffffff';
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          if (frame % 20 < 10) { ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
        }
        return;
      }
      if (f.isKO || f.state === 'thrown' || f.state === 'finished') return;
      // crown on the top of his head
      // follow the head as the puppet animates
      const [anim, fr] = f.animFrame();
      const recipes = (sp.poses && sp.poses[anim]) || RF.PUPPET_POSES[anim] || [{}];
      const rc = recipes[Math.min(fr, recipes.length - 1)] || {};
      if (rc.rotate) return;
      const [hx, hy] = rc.head || [0, 0];
      const [cc, cr] = sp.crownAt;
      const cx = Math.round(f.x + f.facing * ((cc + 0.5 - sp.footCol) * U + hx));
      const cy = Math.round(baseY - (sp.grid.length - cr) * U + hy + (rc.crouch ? sp.crouchDrop * U : 0));
      ctx.fillStyle = '#111'; ctx.fillRect(cx - 8, cy - 9, 16, 10);
      ctx.fillStyle = '#e8b420'; ctx.fillRect(cx - 7, cy - 4, 14, 4);                    // band
      ctx.fillRect(cx - 7, cy - 8, 3, 4); ctx.fillRect(cx - 1, cy - 9, 3, 5); ctx.fillRect(cx + 4, cy - 8, 3, 4); // points
      ctx.fillStyle = '#fff2a0'; ctx.fillRect(cx - 6, cy - 4, 12, 1);
      ctx.fillStyle = '#d02030'; ctx.fillRect(cx - 1, cy - 3, 2, 2);                     // ruby
      ctx.fillStyle = '#2a6ae0'; ctx.fillRect(cx - 5, cy - 3, 1, 1); ctx.fillRect(cx + 4, cy - 3, 1, 1);
    },

    // Lady Landa's aura: dark purple smoke rising off her, red glow from her eyes.
    // Called twice per frame: layer 'back' (smoke, behind her) and 'front' (eye glow).
    darkAura(f, ctx, floorY, frame, layer) {
      const h = f.body.height, baseY = floorY - f.y;
      if (layer === 'back') {
        ctx.fillStyle = 'rgba(60,0,90,0.18)';
        ctx.beginPath(); ctx.ellipse(Math.round(f.x), baseY, f.body.width, 4, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 12; i++) {
          const life = (frame * 0.8 + i * 17) % 60, u = life / 60;
          const x = f.x + (RF.util.hash(i * 3.3) - 0.5) * f.body.width * 1.6 + Math.sin((frame + i * 25) / 12) * 3;
          const y = baseY - u * (h + 16);
          ctx.fillStyle = `rgba(${70 + (i % 3) * 20},0,${100 + (i % 2) * 40},${0.45 * (1 - u)})`;
          const sz = 3 + (i % 3);
          ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
        }
        return;
      }
      // eyes (sprite.eye = [col, row] in the drawing): pulse a red glow
      const [ec, er] = f.def.sprite.eye || [0, 0];
      const ex = f.x + f.facing * (ec + 0.5 - f.def.sprite.footCol), ey = baseY - (f.def.sprite.grid.length - er) + (f.crouching ? f.def.sprite.crouchDrop : 0);
      if (f.isKO || f.state === 'thrown' || f.state === 'finished') return;
      const a = 0.25 + 0.2 * Math.sin(frame / 6);
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 7);
      g.addColorStop(0, `rgba(255,40,20,${a + 0.3})`);
      g.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ex - 7, ey - 7, 14, 14);
    },

    // El Escobedo's jetpack: strapped to his back, flames roaring out of two nozzles.
    jetpack(f, ctx, floorY, frame) {
      const px = Math.round(f.x - f.facing * 13), top = Math.round(floorY - f.y - 70);
      ctx.fillStyle = '#111'; ctx.fillRect(px - 6, top - 1, 12, 24);
      ctx.fillStyle = '#7a8088'; ctx.fillRect(px - 5, top, 10, 22);
      ctx.fillStyle = '#b8c0c8'; ctx.fillRect(px - 4, top + 2, 3, 18);          // shine
      ctx.fillStyle = '#c02020'; ctx.fillRect(px - 5, top + 5, 10, 2);          // stripe
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(px - 5, top + 22, 4, 4); ctx.fillRect(px + 1, top + 22, 4, 4); // nozzles
      for (const nx of [px - 3, px + 3]) {
        const len = 8 + ((frame + nx) % 3) * 4;
        ctx.fillStyle = '#ff5a10'; ctx.fillRect(nx - 2, top + 26, 4, len);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(nx - 1, top + 26, 2, Math.round(len * 0.6));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(nx - 1, top + 26, 2, 2);
      }
    },

    // Ranged lightning: charges in the hand, then a forked bolt rips forward
    // and stops at whatever it hits.
    lightning(f, ctx, floorY, frame) {
      const m = f.move, t = f.stateTime, el = E();
      const hx = Math.round(f.x + f.facing * m.fxHand[0]), hy = Math.round(floorY - f.y - m.fxHand[1]);
      const seed = Math.floor(frame / 2) * 17.3 + f.side * 100;
      if (t < m.startup) {
        // Charging: a swelling ball of sparks in his hands.
        const p = t / m.startup;
        el.glow(ctx, hx, hy, 6 + p * 10, 0.35 + p * 0.4);
        el.crackle(ctx, hx, hy, 5 + p * 9, seed, 2 + Math.round(p * 4));
        return;
      }
      const sinceActive = t - m.startup;
      if (sinceActive >= m.active + 4) return; // bolt fully gone
      const fade = sinceActive >= m.active; // last few frames: thin afterglow
      const reach = f.fxHitDist != null ? f.fxHitDist : m.hitbox.x + m.hitbox.w;
      const ex = Math.round(f.x + f.facing * reach), ey = hy + Math.round((RF.util.hash(seed) - 0.5) * 6);
      // Light thrown on the floor under the bolt
      ctx.fillStyle = 'rgba(90,170,255,0.12)';
      ctx.fillRect(Math.min(hx, ex), floorY - 3, Math.abs(ex - hx), 4);
      if (!fade) {
        el.glow(ctx, hx, hy, 16, 0.7);
        el.bolt(ctx, [hx, hy], [ex, ey], { seed, amp: 7, thick: 1.2, forks: 5 });
        el.bolt(ctx, [hx, hy], [ex, ey + 2], { seed: seed + 50, amp: 10, thick: 0.4, forks: 1 }); // second arc
        el.glow(ctx, ex, ey, 14, 0.8);
        el.crackle(ctx, ex, ey, 9, seed + 7, 3);
      } else {
        el.bolt(ctx, [hx, hy], [ex, ey], { seed, amp: 9, thick: 0.35, forks: 0 });
      }
    },
  };

  // Custom-drawn projectiles (a projectile config with art: '<name>').
  RF.PROJECTILE_ART = {
    // El Escobedo's quadcopter drone: spinning rotors, blinking lights.
    drone(ctx, x, y, t, dir) {
      const bob = Math.round(Math.sin(t / 3));
      y += bob;
      ctx.fillStyle = '#111'; ctx.fillRect(x - 9, y - 3, 18, 7);
      ctx.fillStyle = '#4a5058'; ctx.fillRect(x - 8, y - 2, 16, 5);              // body
      ctx.fillStyle = '#2a8ad8'; ctx.fillRect(x + dir * 3 - 2, y - 1, 4, 2);      // camera
      ctx.fillStyle = '#111'; ctx.fillRect(x - 12, y - 5, 4, 2); ctx.fillRect(x + 8, y - 5, 4, 2); // arms
      const blade = t % 2 ? 7 : 3;                                               // rotor blur
      ctx.fillStyle = 'rgba(220,230,240,0.8)';
      ctx.fillRect(x - 10 - blade / 2, y - 7, blade, 1); ctx.fillRect(x + 10 - blade / 2, y - 7, blade, 1);
      ctx.fillStyle = t % 10 < 5 ? '#ff2a1a' : '#40ff60';                        // blinking LED
      ctx.fillRect(x - dir * 7, y + 2, 2, 2);
    },

    // Dr. Astuto's AP GOV textbook, tumbling end over end.
    textbook(ctx, x, y, t, dir) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.round(t / 3) * (Math.PI / 4) * dir);
      ctx.fillStyle = '#111'; ctx.fillRect(-8, -10, 16, 20);                       // outline
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-7, -9, 14, 18);                     // pages
      ctx.fillStyle = '#8a2418'; ctx.fillRect(-6, -9, 13, 8);                      // APUSH (red)
      ctx.fillStyle = '#26304a'; ctx.fillRect(-6, 0, 13, 9);                       // AP GOV (navy)
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-4, -6, 8, 1); ctx.fillRect(-4, 3, 8, 1);  // title lines
      ctx.fillRect(-2, 5, 1, 3); ctx.fillRect(0, 5, 1, 3); ctx.fillRect(2, 5, 1, 3);      // columns
      ctx.restore();
      // motion streaks
      ctx.fillStyle = 'rgba(232,220,192,0.35)';
      for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x - dir * (8 + i * 5)), Math.round(y - 4 + i * 2), 4, 1);
    },
  };

  // A rolling shockwave along the floor (Mr. Dabalsa's stomps). Bigger shots = bigger waves.
  RF.PROJECTILE_ART.shockwave = function (ctx, x, y, t, dir, p) {
    const s = p ? p.w / 12 : 1, floor = y + (p ? p.h / 2 : 6);
    for (let i = 0; i < 3; i++) {
      const h = Math.round((10 + i * 4) * s), w = Math.round((5 + i * 3) * s);
      ctx.fillStyle = ['rgba(255,240,200,0.9)', 'rgba(200,160,110,0.7)', 'rgba(120,90,60,0.5)'][i];
      ctx.fillRect(Math.round(x - dir * i * 4 * s - w / 2), Math.round(floor - h), w, h);
    }
    for (let i = 0; i < 4; i++) { // flying debris
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(Math.round(x - dir * (6 + i * 5)), Math.round(floor - 6 - ((t * 3 + i * 7) % 14) * s), 2, 2);
    }
  };

  // A giant BRO BATCH protein bar (Anthony's special and finisher). k = size, rot = spin.
  RF.drawProteinBar = function (ctx, x, y, k = 1, rot = 0) {
    const w = 26 * k, h = 10 * k;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot);
    ctx.fillStyle = '#111'; ctx.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(-w / 2, -h / 2, w, h);              // black wrapper
    ctx.fillStyle = '#e8b420'; ctx.fillRect(-w / 2, -h / 2, w, k);                // gold stripes
    ctx.fillRect(-w / 2, h / 2 - k, w, k);
    ctx.fillStyle = '#c0204a'; ctx.fillRect(-w / 2, -h / 2, 3 * k, h); ctx.fillRect(w / 2 - 3 * k, -h / 2, 3 * k, h); // crimps
    if (k >= 1) RF.font.drawText(ctx, k >= 2 ? 'BRO BATCH' : 'BRO', 0, -3 * k, { align: 'center', color: '#ffffff', scale: k >= 2 ? 1 : 1 });
    ctx.restore();
  };

  // Ruano: a red flamenco fan, spinning.
  RF.PROJECTILE_ART.fan = function (ctx, x, y, t, dir) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.45 * dir);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 11, -Math.PI * 0.9, -Math.PI * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d01828'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 10, -Math.PI * 0.88, -Math.PI * 0.12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f0c020'; for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.85 + i * 0.42; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke(); }
    ctx.fillStyle = '#f0c020'; ctx.fillRect(-1, -1, 3, 3);
    ctx.restore();
  };

  // Mikey: a football in a tight spiral.
  RF.PROJECTILE_ART.football = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 3; i++) { ctx.fillStyle = `rgba(255,255,255,${0.35 - i * 0.1})`; ctx.fillRect(Math.round(x - dir * i * 8), Math.round(y - 1), 6, 2); }
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62 + Math.abs(Math.sin(t * 0.8)) * 0.15);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a4018'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -1, 6, 1); for (let k = -2; k <= 2; k += 2) ctx.fillRect(k, -2, 1, 3);
    ctx.fillRect(-7, -1, 1, 2); ctx.fillRect(6, -1, 1, 2);
    ctx.restore();
  };

  // Fernando: a lit cigarette tumbling end over end, trailing smoke.
  RF.PROJECTILE_ART.cigarette = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 5; i++) { ctx.globalAlpha = 0.4 - i * 0.06; ctx.fillStyle = '#c8c8c8'; ctx.fillRect(Math.round(x - dir * i * 6), Math.round(y - i), 3, 3); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.45 * dir);
    ctx.fillStyle = '#111'; ctx.fillRect(-7, -2, 14, 4);
    ctx.fillStyle = '#f0e8dd'; ctx.fillRect(-6, -1, 9, 2);
    ctx.fillStyle = '#d89a50'; ctx.fillRect(-6, -1, 3, 2);   // filter
    ctx.fillStyle = t % 6 < 3 ? '#ff4010' : '#ffd040'; ctx.fillRect(3, -1, 3, 2); // the cherry
    ctx.restore();
  };

  // Wuttke: a music note (k = size) and a grand piano (breaking = 0..1 as it smashes).
  RF.drawNote = function (ctx, x, y, color = '#ffffff', k = 1, beamed = false) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 1 * k, y + 2 * k, 5 * k, 4 * k); ctx.fillRect(x + 2 * k, y - 6 * k, 3 * k, 10 * k);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 3 * k, 3 * k, 2 * k); ctx.fillRect(x + 3 * k, y - 5 * k, 1 * k, 8 * k);
    if (beamed) { ctx.fillRect(x + 3 * k, y - 5 * k, 6 * k, 2 * k); ctx.fillRect(x + 8 * k, y - 5 * k, 1 * k, 8 * k); ctx.fillRect(x + 5 * k, y + 3 * k, 3 * k, 2 * k); }
    else ctx.fillRect(x + 4 * k, y - 5 * k, 2 * k, 1 * k);
  };
  RF.drawGrandPiano = function (ctx, x, y, breaking = 0) {
    x = Math.round(x); y = Math.round(y);
    if (breaking > 0) { // flying keys and splinters
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI, d = breaking * 40;
        ctx.fillStyle = i % 3 ? '#f0f0e8' : '#111';
        ctx.fillRect(Math.round(x + Math.cos(a) * d * (i % 2 ? 1 : -1)), Math.round(y - 10 - Math.sin(a) * d), 3, 6);
      }
      return;
    }
    ctx.fillStyle = '#000'; ctx.fillRect(x - 25, y - 27, 50, 19);
    ctx.fillStyle = '#1c1c22'; ctx.fillRect(x - 24, y - 26, 48, 17);             // the case
    ctx.fillStyle = '#3a3a48'; ctx.fillRect(x - 22, y - 25, 44, 2);               // shine
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x - 20, y - 26); ctx.lineTo(x + 14, y - 44); ctx.lineTo(x + 16, y - 26); ctx.fill(); // lid up
    ctx.fillStyle = '#f0f0e8'; ctx.fillRect(x - 24, y - 12, 48, 4);               // keys
    ctx.fillStyle = '#111'; for (let i = 0; i < 12; i++) ctx.fillRect(x - 22 + i * 4, y - 12, 2, 2);
    ctx.fillStyle = '#1c1c22'; ctx.fillRect(x - 21, y - 8, 3, 8); ctx.fillRect(x + 18, y - 8, 3, 8); // legs
  };
  RF.PROJECTILE_ART.musicNote = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.5 - i * 0.12; RF.drawNote(ctx, x - dir * i * 7, y + Math.sin((t + i * 4) / 3) * 3, '#c080ff', 1); }
    ctx.globalAlpha = 1;
    RF.drawNote(ctx, x - 4, y + Math.sin(t / 3) * 3 - 2, t % 8 < 4 ? '#ffffff' : '#ffd040', 2, true); // a big beamed eighth-note pair
  };

  // Tyler: a dimpled golf ball with a speed trail.
  RF.PROJECTILE_ART.golfBall = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(255,255,255,${0.5 - i * 0.1})`; ctx.fillRect(Math.round(x - dir * i * 7), Math.round(y - 1), 6, 2); }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8c8c8'; ctx.fillRect(Math.round(x - 1), Math.round(y), 1, 1); ctx.fillRect(Math.round(x + 1), Math.round(y - 2), 1, 1); ctx.fillRect(Math.round(x + 2), Math.round(y + 1), 1, 1);
  };

  // Chris: a black card (spins as it flies) and a gold coin.
  RF.PROJECTILE_ART.card = function (ctx, x, y, t, dir) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 * dir); ctx.scale(1, Math.abs(Math.cos(t * 0.25)) * 0.6 + 0.4);
    ctx.fillStyle = '#e8c020'; ctx.fillRect(-10, -6, 20, 12);
    ctx.fillStyle = '#16161c'; ctx.fillRect(-9, -5, 18, 10);
    ctx.fillStyle = '#e8c020'; ctx.fillRect(-7, -2, 4, 3); ctx.fillRect(-7, 3, 12, 1);
    ctx.restore();
    for (let i = 1; i <= 3; i++) { ctx.fillStyle = `rgba(232,192,32,${0.4 - i * 0.1})`; ctx.fillRect(Math.round(x - dir * i * 6), Math.round(y), 4, 1); }
  };
  RF.PROJECTILE_ART.coin = function (ctx, x, y, t) {
    const w = Math.max(1, Math.abs(Math.cos(t * 0.35)) * 7);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(x, y, w + 1, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b420'; ctx.beginPath(); ctx.ellipse(x, y, w, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff2a0'; ctx.fillRect(Math.round(x - w / 3), Math.round(y - 4), Math.max(1, Math.round(w / 3)), 3);
    if (w > 4) RF.font.drawText(ctx, '$', x, y - 3, { align: 'center', color: '#8a5a10' });
  };
  // A gold bar (Chris's Make It Rain).
  RF.drawGoldBar = function (ctx, x, y, k = 1, rot = 0) {
    const w = 22 * k, h = 9 * k;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot);
    ctx.fillStyle = '#111'; ctx.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
    ctx.fillStyle = '#c8961e'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#ffd040'; ctx.fillRect(-w / 2 + 2 * k, -h / 2, w - 4 * k, h - 3 * k);
    ctx.fillStyle = '#fff2a0'; ctx.fillRect(-w / 2 + 3 * k, -h / 2 + k, w / 3, k);
    if (k >= 2) RF.font.drawText(ctx, '24K', 0, -3, { align: 'center', color: '#8a5a10' });
    ctx.restore();
  };

  // Anthony's Bar Toss: a spinning protein bar.
  RF.PROJECTILE_ART.barToss = function (ctx, x, y, t, dir) { RF.drawProteinBar(ctx, x, y, 1, t * 0.45 * dir); };

  // Anthony's CRIMSON HEX: a pulsing orb of crimson magic wrapped in orbiting runes.
  RF.PROJECTILE_ART.hexOrb = function (ctx, x, y, t, dir) {
    const r = 8 + Math.sin(t / 3) * 1.5;
    for (let i = 1; i <= 5; i++) { ctx.fillStyle = `rgba(230,60,110,${0.35 - i * 0.06})`; ctx.beginPath(); ctx.arc(x - dir * i * 6, y, r - i, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0204a'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7aa8'; ctx.beginPath(); ctx.arc(x - 2, y - 2, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff0f4'; ctx.fillRect(Math.round(x - 3), Math.round(y - 4), 3, 3);
    for (let i = 0; i < 3; i++) { const a = t / 5 + i * 2.1; ctx.fillStyle = '#ffd0e0'; ctx.fillRect(Math.round(x + Math.cos(a) * (r + 5)) - 1, Math.round(y + Math.sin(a) * (r + 5) * 0.6) - 1, 3, 3); }
  };

  // Holbrook's URBAN SPRAWL: a city erupting out of the ground and spreading forward,
  // skyscrapers at the leading edge, suburbs sprawling out behind.
  RF.PROJECTILE_ART.sprawl = function (ctx, x, y, t, dir, p, floorY) {
    const bottom = floorY - p.y, H = p.h, W = p.w;
    // cracked ground under the wave
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(Math.round(x - dir * (W / 2 + 40)), bottom - 1, W + 40, 3);
    // suburbs left behind (little houses)
    for (let i = 1; i <= 5; i++) {
      const hx = Math.round(x - dir * (W / 2 + i * 9)), hh = 5 + (i % 2) * 2;
      ctx.fillStyle = '#111'; ctx.fillRect(hx - 4, bottom - hh - 1, 9, hh + 1);
      ctx.fillStyle = ['#c86a40', '#d8b070', '#a0a8b0'][i % 3]; ctx.fillRect(hx - 3, bottom - hh, 7, hh);
      ctx.fillStyle = '#7a2a18'; ctx.fillRect(hx - 4, bottom - hh - 3, 9, 3);
    }
    // the skyline: buildings get taller toward the leading edge
    const n = Math.max(3, Math.round(W / 7));
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), bw = 6 + (i % 3);
      const bh = Math.round(H * (0.35 + 0.65 * u) * (0.75 + 0.25 * RF.util.hash(i * 7.1)) * Math.min(1, t / 8));
      const bx = Math.round(x - dir * W / 2 + dir * u * W) - (dir < 0 ? bw : 0);
      ctx.fillStyle = '#0a0a10'; ctx.fillRect(bx - 1, bottom - bh - 1, bw + 2, bh + 1);
      ctx.fillStyle = ['#4a5a78', '#5a6a88', '#3a4a64', '#6a6a7a'][i % 4]; ctx.fillRect(bx, bottom - bh, bw, bh);
      ctx.fillStyle = '#ffe080';                                           // lit windows
      for (let wy = bottom - bh + 3; wy < bottom - 3; wy += 4) for (let wx = bx + 1; wx < bx + bw - 1; wx += 3)
        if (RF.util.hash(wx * 3.1 + wy * 1.7 + Math.floor(t / 10)) > 0.45) ctx.fillRect(wx, wy, 1, 2);
      if (i === n - 1 && bh > 30) { ctx.fillStyle = '#ff3030'; ctx.fillRect(bx + Math.floor(bw / 2), bottom - bh - 5, 1, 4); } // antenna light
    }
    // dust thrown up at the leading edge
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(160,130,100,${0.5 - i * 0.07})`;
      ctx.fillRect(Math.round(x + dir * (W / 2 + 2 + i * 3)), bottom - 4 - ((t + i * 5) % 10), 3, 3);
    }
  };

  // King Sirven's pink DETENTION slip, fluttering as it flies.
  RF.PROJECTILE_ART.detentionSlip = function (ctx, x, y, t, dir) {
    const tilt = Math.round(Math.sin(t / 3) * 2);
    ctx.fillStyle = '#111'; ctx.fillRect(x - 13, y - 7 + tilt, 26, 14);
    ctx.fillStyle = '#ff9ac8'; ctx.fillRect(x - 12, y - 6 + tilt, 24, 12);
    ctx.fillStyle = '#d0507a'; ctx.fillRect(x - 12, y - 6 + tilt, 24, 2);
    RF.font.drawText(ctx, 'DETENTION', x, y - 3 + tilt, { align: 'center', color: '#5a0a2a' });
    ctx.fillStyle = 'rgba(255,154,200,0.35)';
    for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x - dir * (14 + i * 5)), Math.round(y - 2 + i), 4, 1);
  };

  // Trump's pink slip: YOU'RE FIRED.
  RF.PROJECTILE_ART.firedSlip = function (ctx, x, y, t, dir) {
    const tilt = Math.round(Math.sin(t / 3) * 2);
    ctx.fillStyle = '#111'; ctx.fillRect(x - 12, y - 7 + tilt, 24, 14);
    ctx.fillStyle = '#ffd0d8'; ctx.fillRect(x - 11, y - 6 + tilt, 22, 12);
    ctx.fillStyle = '#d02030'; ctx.fillRect(x - 11, y - 6 + tilt, 22, 2);
    RF.font.drawText(ctx, 'FIRED', x, y - 3 + tilt, { align: 'center', color: '#a00818' });
    ctx.fillStyle = 'rgba(255,96,96,0.4)';
    for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(x - dir * (13 + i * 5)), Math.round(y - 2 + i), 4, 1);
  };

  RF.PROJECTILE_ART.voidOrb = function (ctx, x, y, t, dir) {
    // Lady Landa's purple energy blast: swirling violet orb with a black core.
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, 'rgba(230,160,255,0.9)');
    g.addColorStop(0.45, 'rgba(150,40,220,0.55)');
    g.addColorStop(1, 'rgba(80,0,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, 32, 32);
    for (let i = 1; i <= 6; i++) { // trailing sparks
      ctx.fillStyle = i % 2 ? 'rgba(200,120,255,0.6)' : 'rgba(120,40,200,0.5)';
      ctx.fillRect(Math.round(x - dir * (6 + i * 4)), Math.round(y + Math.sin((t + i) * 0.9) * 4), 2, 2);
    }
    ctx.fillStyle = '#1a0628'; ctx.fillRect(x - 4, y - 4, 8, 8);           // dark core
    ctx.fillStyle = '#f0d0ff'; ctx.fillRect(x - 2, y - 2, 3, 3);
    for (let i = 0; i < 4; i++) {                                           // orbiting motes
      const a = t * 0.4 + (i * Math.PI) / 2;
      ctx.fillStyle = '#e8b0ff';
      ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(y + Math.sin(a) * 6), 2, 2);
    }
  };

  // Shared geometry for block effects: centre in front of the fighter, size from the hurtbox.
  function guardBox(f, floorY) {
    const hurt = f.getHurtbox();
    if (!hurt) return null;
    return {
      hurt, base: floorY - f.y, top: floorY - f.y - hurt.h,
      mid: floorY - f.y - hurt.h / 2, front: f.x + f.facing * (f.body.width / 2 + 4),
      strength: f.shieldHit > 0 ? f.shieldHit / 12 : 0,
    };
  }

  RF.BLOCK_FX = {
    // Mikey: blocks with his stomach - it wobbles and bounces them right off. BOING!
    bellyBlock(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const wob = g.strength > 0 ? Math.sin(frame * 1.5) * 4 * g.strength : 0, x = f.x + f.facing * (f.body.width * 0.45), y = floorY - f.y - f.body.height * 0.48;
      ctx.strokeStyle = '#ffd8a0'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + g.strength * 0.5;
      ctx.beginPath(); ctx.ellipse(x, y, 8 + Math.abs(wob), 16 - wob, 0, -Math.PI / 2, Math.PI / 2, f.facing < 0); ctx.stroke();
      ctx.lineWidth = 1; ctx.globalAlpha = 1;
      if (g.strength > 0.4) RF.font.drawText(ctx, 'BOING!', f.x, g.top - 26, { align: 'center', color: '#ffd8a0', outline: '#000' });
    },
    // Alejandro: a spinning coil of climbing rope held up as a shield. ON BELAY.
    ropeGuard(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const x = g.front + f.facing * 4, y = g.mid - 8;
      ctx.strokeStyle = '#e07030'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y, 5 + i * 2, 14 + i * 4, (frame / 8) * (i % 2 ? 1 : -1) * 0.2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.lineWidth = 1;
      if (g.strength > 0.4) RF.font.drawText(ctx, 'ON BELAY.', f.x, g.top - 26, { align: 'center', color: '#ff8030', outline: '#000' });
    },
    // Lopez Tuero: a graph's axes and an asymptote curve - your attack approaches, never arrives.
    axisShield(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const x = Math.round(g.front + f.facing * 6), top = Math.round(g.top + 4), bot = Math.round(g.base - 4);
      ctx.fillStyle = '#00ffd0'; ctx.fillRect(x, top, 1, bot - top); ctx.fillRect(x - 8, bot - 2, 16, 1);
      ctx.strokeStyle = 'rgba(160,255,240,0.8)'; ctx.beginPath();
      for (let k = 1; k <= 20; k++) { const yy = top + k * (bot - top) / 20, xx = x + f.facing * (2 + 30 / k); k === 1 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
      ctx.stroke();
      if (g.strength > 0.4) RF.font.drawText(ctx, 'ASYMPTOTE.', f.x, g.top - 26, { align: 'center', color: '#00ffd0', outline: '#000' });
    },
    // Wuttke: a wall of five-line music staff, notes bouncing off it.
    musicStaff(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const x = Math.round(g.front + f.facing * 4), top = Math.round(g.top + 8), h = g.hurt.h - 16;
      ctx.fillStyle = '#111'; ctx.fillRect(x - 1, top, 9, h);
      ctx.fillStyle = '#e0d0f0'; for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 2 - 1 + (f.facing > 0 ? 0 : -1), top, 1, h);
      RF.drawNote(ctx, x + f.facing * 8, top + 10 + Math.sin(frame / 4) * 4, '#ffd040', 1);
      RF.drawNote(ctx, x + f.facing * 6, top + h - 18 + Math.cos(frame / 4) * 4, '#c080ff', 1);
      if (g.strength > 0.4) RF.font.drawText(ctx, 'REST.', f.x, g.top - 26, { align: 'center', color: '#c080ff', outline: '#000' });
    },
    // Gabriel: a telekinetic force field, rippling where hits land.
    mindShield(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const x = g.front + f.facing * 4, cy = g.mid, sup = f.alterT > 0;
      ctx.strokeStyle = sup ? '#ffd040' : '#40e8ff';
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.6 - i * 0.15 + g.strength * 0.3;
        ctx.beginPath(); ctx.ellipse(x + f.facing * i * 3, cy, 6 + i * 3 + g.strength * 4, g.hurt.h * 0.5 + i * 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (g.strength > 0.4) RF.font.drawText(ctx, 'NOPE!', f.x, g.top - 26, { align: 'center', color: sup ? '#ffd040' : '#40e8ff', outline: '#000' });
    },
    // Fernando: blows a big cloud of smoke in front of him. Hits get lost in it.
    smokeCloud(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      ctx.globalAlpha = 0.55 + g.strength * 0.3;
      ctx.fillStyle = '#c8c8c8';
      for (let i = 0; i < 6; i++) {
        const x = g.front + f.facing * (4 + (i % 2) * 6) + Math.sin(frame / 6 + i) * 2, y = g.top + 10 + i * 10;
        ctx.beginPath(); ctx.arc(x, y, 7 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (g.strength > 0.4) RF.font.drawText(ctx, 'HEH HEH', f.x, g.top - 26, { align: 'center', color: '#ff9ac8', outline: '#000' });
    },
    // Tyler: pops open a huge striped golf umbrella in front of him.
    golfUmbrella(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const R = 24, cx = Math.round(g.front + f.facing * 8), cy = Math.round(g.mid - 6);
      const a0 = f.facing > 0 ? -Math.PI / 2 : Math.PI / 2;           // a half-dome facing the attacker
      ctx.fillStyle = '#111'; ctx.fillRect(Math.min(cx, cx - f.facing * 14), cy - 1, 14, 2);        // the handle back to his hand
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R + 1, a0, a0 + Math.PI); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#20a050';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0 + i * Math.PI / 6, a0 + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#111'; ctx.fillRect(cx + f.facing * (R + 1) - 1, cy - 1, 3, 2);               // the tip
      if (g.strength > 0.4) RF.font.drawText(ctx, 'NO STRESS', f.x, g.top - 26, { align: 'center', color: '#80ffb0', outline: '#000' });
    },
    // Nicholas: PEEK-A-BOO - gloves up tight, bobbing; motion lines as he rolls with it.
    peekaboo(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const fl = g.strength, x = Math.round(g.front - f.facing * 2), y = Math.round(g.top + 6 + Math.sin(frame / 3) * 1.5);
      for (const dy of [0, 9]) { // the two gloves
        ctx.fillStyle = '#111'; ctx.fillRect(x - 5, y + dy - 1, 10, 9);
        ctx.fillStyle = '#c01818'; ctx.fillRect(x - 4, y + dy, 8, 7);
        ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x - 3, y + dy + 1, 3, 2);
      }
      if (fl > 0.2) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(Math.round(x - f.facing * (8 + i * 4)), y + 2 + i * 5, 4, 1); }
      if (fl > 0.4) RF.font.drawText(ctx, 'BOB AND WEAVE', f.x, g.top - 26, { align: 'center', color: '#ffd030', outline: '#000' });
    },

    // Tamayo: ACCESS DENIED - a giant laminated school ID badge flashing red.
    idBadge(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const fl = g.strength, w = 22, h = 30, x = Math.round(g.front + f.facing * 6 - w / 2), y = Math.round(g.mid - h / 2 - 6);
      ctx.fillStyle = '#2a5ad0'; ctx.fillRect(x + w / 2 - 1, y - 12, 2, 12);            // lanyard
      ctx.fillStyle = '#111'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#e8ecf2'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#5a82b0'; ctx.fillRect(x + 4, y + 3, w - 8, 12);                  // photo
      ctx.fillStyle = '#e8a070'; ctx.fillRect(x + 8, y + 5, 6, 6);                       // (his bald head)
      ctx.fillStyle = fl > 0.2 && (frame >> 2) % 2 ? '#ff2020' : '#c01818'; ctx.fillRect(x, y + h - 9, w, 9);
      RF.font.drawText(ctx, 'NO', x + w / 2, y + h - 8, { align: 'center', color: '#ffffff' });
      if (fl > 0.3) RF.font.drawText(ctx, 'ACCESS DENIED', f.x, g.top - 14, { align: 'center', color: '#ff4040', outline: '#000' });
    },

    // Ruano: ROSE WINDOW - a glowing stained-glass cathedral window. GRACE: each blocked
    // hit heals her a little (blockHeal).
    roseWindow(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const fl = g.strength, cx = Math.round(g.front + f.facing * 6), cy = Math.round(g.mid - 8), R = 20 + fl * 4;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(0.5, 1);
      ctx.globalAlpha = 0.75 + fl * 0.25;
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(0, 0, R + 2, 0, Math.PI * 2); ctx.fill();
      const COLS = ['#d02a2a', '#2a5ad0', '#f0c020', '#2a9a4a', '#a040c0', '#f08020'];
      for (let i = 0; i < 12; i++) { // petals of coloured glass
        ctx.fillStyle = COLS[(i + Math.floor(frame / 30)) % COLS.length];
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, R * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = fl > 0.3 ? '#ffffff' : '#ffe680'; ctx.beginPath(); ctx.arc(0, 0, R * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ctx.lineWidth = 1;
      if (fl > 0.4) RF.font.drawText(ctx, 'GRACE', f.x, g.top - 14, { align: 'center', color: '#ffe680', outline: '#000' });
    },

    // Chris: BODYGUARD - a guy in a black suit and shades steps in and takes the hit.
    // Chris takes no chip damage while he's guarded (noChip).
    bodyguard(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const fl = g.strength, x = Math.round(g.front + f.facing * (10 - fl * 3)), base = g.base, h = Math.round(g.hurt.h * 1.05);
      const top = base - h;
      ctx.fillStyle = '#111'; ctx.fillRect(x - 9, top, 18, h);                      // outline
      ctx.fillStyle = '#1e1e26'; ctx.fillRect(x - 8, top + 13, 16, h - 13);          // suit
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 2, top + 13, 4, 8);                // shirt
      ctx.fillStyle = '#111'; ctx.fillRect(x - 1, top + 14, 2, 7);                   // tie
      ctx.fillStyle = '#c0845c'; ctx.fillRect(x - 6, top + 1, 12, 12);              // head
      ctx.fillStyle = '#111'; ctx.fillRect(x - 6, top + 4, 12, 3);                  // shades
      ctx.fillStyle = '#7ad8ff'; ctx.fillRect(x - 5, top + 4, 3, 1); ctx.fillRect(x + 2, top + 4, 3, 1);
      ctx.fillStyle = '#c0845c'; ctx.fillRect(x + f.facing * 6 - 2, top + 20, 4, 5); // raised palm
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x - f.facing * 7, top + 4, 1, 6);      // earpiece wire
      if (fl > 0.4) RF.font.drawText(ctx, 'NOT TODAY.', x, top - 12, { align: 'center', color: '#e8e8e8', outline: '#000' });
    },

    // Anthony: ARCANE WARD - a spinning hexagram magic circle. It REFLECTS projectiles.
    arcaneWard(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const fl = g.strength, cx = Math.round(g.front + f.facing * 6), cy = Math.round(g.mid), R = 18 + fl * 6, rot = frame / 15;
      ctx.save();
      ctx.globalAlpha = 0.6 + fl * 0.4;
      ctx.translate(cx, cy); ctx.scale(0.45, 1); // seen edge-on, like a shield
      ctx.fillStyle = 'rgba(255,80,140,0.18)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = fl > 0.3 ? '#ffffff' : '#ff70a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      for (const off of [0, Math.PI / 3]) { // hexagram
        ctx.beginPath();
        for (let i = 0; i < 3; i++) { const a = rot + off + i * (Math.PI * 2 / 3); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
      if (fl > 0.4) RF.font.drawText(ctx, 'ARCANE WARD', f.x, g.top - 16, { align: 'center', color: '#ff9ac8', outline: '#000' });
    },

    // Simon: SHIN CHECK - a raised, glowing shin and crossed forearms wrapped in sacred
    // Sak Yant-style gold lines. He recovers from blocks fast (blockstunScale).
    shinCheck(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const fl = g.strength, x = Math.round(g.front + f.facing * 4), top = g.top + 6, h = Math.round(g.hurt.h * 0.85);
      ctx.save();
      ctx.globalAlpha = 0.55 + fl * 0.45;
      // the guard: an X of glowing gold bars (forearms) over a vertical shin bar
      ctx.strokeStyle = '#ffb030'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - f.facing * 6, top); ctx.lineTo(x + f.facing * 6, top + h * 0.45); ctx.moveTo(x + f.facing * 6, top); ctx.lineTo(x - f.facing * 6, top + h * 0.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, top + h * 0.45); ctx.lineTo(x + f.facing * 3, top + h); ctx.stroke();
      ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = 1; ctx.stroke();
      // Sak Yant-style dots and lines around it
      ctx.fillStyle = '#ffd060';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + frame / 20, r = 14 + fl * 6;
        ctx.fillRect(Math.round(x + Math.cos(a) * r * 0.6), Math.round(top + h * 0.3 + Math.sin(a) * r), 2, 2);
      }
      ctx.restore();
      if (fl > 0.4) RF.font.drawText(ctx, 'CHECKED!', f.x, g.top - 14, { align: 'center', color: '#ffd060', outline: '#000' });
    },

    // Holbrook: SOVEREIGN BORDER - a towering wall of glowing border lines with continent
    // outlines inside it. Attackers who hit it get shoved back across the border.
    sovereignBorder(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const h = Math.round(g.hurt.h * 1.35), w = 30, fl = g.strength;
      const x = Math.round(g.front + f.facing * 8 - w / 2), top = g.base - h;
      ctx.save();
      // the glowing field
      ctx.fillStyle = `rgba(40,200,180,${0.16 + fl * 0.3})`; ctx.fillRect(x, top, w, h);
      // latitude / longitude grid
      ctx.strokeStyle = `rgba(120,255,230,${0.25 + fl * 0.3})`;
      for (let yy = top + 6; yy < g.base; yy += 10) { ctx.beginPath(); ctx.moveTo(x, yy + 0.5); ctx.lineTo(x + w, yy + 0.5); ctx.stroke(); }
      for (let xx = x + 5; xx < x + w; xx += 10) { ctx.beginPath(); ctx.moveTo(xx + 0.5, top); ctx.lineTo(xx + 0.5, g.base); ctx.stroke(); }
      // continent outlines drifting through it
      const CONT = [
        [[0, 0], [5, -2], [9, 1], [8, 6], [10, 11], [6, 16], [3, 12], [1, 6]],          // africa-ish
        [[0, 0], [4, 0], [7, 3], [5, 8], [3, 14], [1, 10], [-1, 4]],                    // south america-ish
        [[0, 0], [8, -1], [12, 2], [9, 5], [4, 6], [1, 3]],                             // eurasia-ish
      ];
      ctx.strokeStyle = `rgba(200,255,120,${0.75 + fl * 0.25})`;
      CONT.forEach((pts, i) => {
        const ox = x + 4 + (i % 2) * 12, oy = top + 8 + ((frame * 0.3 + i * 28) % (h - 20));
        ctx.beginPath(); pts.forEach(([px, py], j) => (j ? ctx.lineTo : ctx.moveTo).call(ctx, ox + px, oy + py)); ctx.closePath(); ctx.stroke();
      });
      // the border itself: thick dashed lines on both edges, glowing
      ctx.setLineDash([5, 3]); ctx.lineDashOffset = frame / 2;
      ctx.strokeStyle = fl > 0.3 ? '#ffffff' : '#ff4060'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 0.5, top); ctx.lineTo(x + 0.5, g.base); ctx.moveTo(x + w - 0.5, top); ctx.lineTo(x + w - 0.5, g.base); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      // border posts with little flags on top
      for (const px of [x, x + w]) {
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect(px - 1, top - 8, 2, 8);
        ctx.fillStyle = (frame >> 3) % 2 ? '#d02020' : '#c01818'; ctx.fillRect(px + 1, top - 8, 5, 3);
      }
      ctx.restore();
      if (fl > 0.4) RF.font.drawText(ctx, 'SOVEREIGN BORDER', f.x, top - 20, { align: 'center', color: '#80ffe0', outline: '#000' });
    },

    // King Sirven: a gold royal shield with his crown crest.
    royalShield(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const w = 24, h = Math.round(g.hurt.h * 0.5);
      const x = Math.round(g.front + f.facing * 6 - w / 2), y = Math.round(g.mid - h / 2 - 8);
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.moveTo(x - 1, y - 1); ctx.lineTo(x + w + 1, y - 1); ctx.lineTo(x + w + 1, y + h * 0.6); ctx.lineTo(x + w / 2, y + h + 2); ctx.lineTo(x - 1, y + h * 0.6); ctx.fill();
      ctx.fillStyle = g.strength > 0.3 ? '#fff2a0' : '#e8b420';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.6); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h * 0.6); ctx.fill();
      ctx.fillStyle = '#7a1020'; ctx.fillRect(x + 3, y + 3, w - 6, Math.round(h * 0.45));      // royal red field
      ctx.fillStyle = '#e8b420';                                                              // crown crest
      ctx.fillRect(x + w / 2 - 6, y + 10, 12, 3); ctx.fillRect(x + w / 2 - 6, y + 6, 2, 4); ctx.fillRect(x + w / 2 - 1, y + 5, 2, 5); ctx.fillRect(x + w / 2 + 4, y + 6, 2, 4);
      if (g.strength > 0.4) RF.font.drawText(ctx, 'DETENTION!', x + w / 2, y - 12, { align: 'center', color: '#ff9ac8', outline: '#000' });
    },

    // Mr. Dabalsa: the Complete Works of Shakespeare, held open as a shield.
    bookGuard(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const flap = g.strength > 0 ? Math.round(Math.sin(frame * 1.3) * 3) : 0;
      const w = 30, h = Math.round(g.hurt.h * 0.45);
      const x = Math.round(g.front + f.facing * 6 - w / 2), y = Math.round(g.mid - h / 2 - 14);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = '#6c201c'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);         // cover
      ctx.fillStyle = '#f0e6cc'; ctx.fillRect(x + 1, y + 1 + flap, w / 2 - 2, h - 2); // left page
      ctx.fillStyle = '#e6dabc'; ctx.fillRect(x + w / 2 + 1, y + 1 - flap, w / 2 - 2, h - 2); // right page
      ctx.fillStyle = '#3a1a10'; ctx.fillRect(x + w / 2 - 1, y, 2, h);             // spine
      ctx.fillStyle = 'rgba(60,30,20,0.55)';
      for (let i = 0; i < Math.floor((h - 6) / 4); i++) {                          // lines of verse
        ctx.fillRect(x + 3, y + 4 + i * 4 + flap, w / 2 - 6 - (i % 3) * 2, 1);
        ctx.fillRect(x + w / 2 + 3, y + 4 + i * 4 - flap, w / 2 - 6 - ((i + 1) % 3) * 2, 1);
      }
      ctx.fillStyle = '#eb9128'; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y + h, w + 2, 1); // gilt edges
      if (g.strength > 0.4) RF.font.drawText(ctx, 'ALAS!', x + w / 2, y - 12, { align: 'center', color: '#e8dcc0', outline: '#000' });
    },

    // Bruiser: a dented steel cafeteria tray held up as a shield. Clang!
    lunchTray(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const shake = g.strength > 0 ? (frame % 2 ? 2 : -2) : 0;
      const x = Math.round(g.front + shake), h = Math.round(g.hurt.h * 0.55), y = Math.round(g.mid - h / 2 - 6);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 3, y - 1, 7, h + 2);
      ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x - 2, y, 5, h);
      ctx.fillStyle = '#d8dce0'; ctx.fillRect(x - 1, y + 2, 1, h - 4);       // shine
      ctx.fillStyle = '#6a7078'; ctx.fillRect(x, y + Math.round(h * 0.3), 2, 3); // dent
      ctx.fillStyle = '#b05020'; ctx.fillRect(x + f.facing * 1, y + Math.round(h * 0.65), 1, 3); // old ketchup
      if (g.strength > 0.5) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + f.facing * 4, y + h / 2 - 4, 2, 8); }
    },

    // Viper: three ninja stars spinning in a wall in front of him.
    shurikenWall(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const spin = frame * (0.4 + g.strength * 0.6);
      for (let i = 0; i < 3; i++) {
        const cx = g.front + f.facing * 2, cy = g.top + 10 + i * (g.hurt.h - 20) / 2;
        for (let k = 0; k < 4; k++) {
          const a = spin + (k * Math.PI) / 2 + i;
          RF.electric.line(ctx, cx, cy, cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 3, '#111');
          RF.electric.line(ctx, cx, cy, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 1, '#c8d0d8');
        }
        ctx.fillStyle = '#2e8b3e'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
      }
    },

    // Jauregui: a giant glowing protractor.
    protractorShield(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const r = g.hurt.h / 2 + 4, cx = f.x + f.facing * 6, cy = g.mid;
      ctx.fillStyle = `rgba(255,230,120,${0.12 + g.strength * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, f.facing < 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = g.strength > 0.3 ? '#ffffff' : '#ffe080';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, f.facing < 0); ctx.stroke();
      ctx.lineWidth = 1;
      for (let d = 0; d <= 180; d += 15) { // degree ticks
        const a = -Math.PI / 2 + (d / 180) * Math.PI, len = d % 45 === 0 ? 6 : 3;
        const ca = Math.cos(a) * f.facing, sa = Math.sin(a);
        RF.electric.line(ctx, cx + ca * r, cy + sa * r, cx + ca * (r - len), cy + sa * (r - len), 1, '#ffe080');
      }
      RF.font.drawText(ctx, g.strength > 0 ? '0' : '90', cx + f.facing * (r - 12), cy - 4, { align: 'center', color: '#ffe080', outline: '#000' });
    },

    // Dr. Astuto: the Constitution, unrolled in front of him like a shield.
    constitutionScroll(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const flutter = g.strength > 0 ? Math.round(Math.sin(frame) * 2) : 0;
      const w = 22, h = Math.round(g.hurt.h * 0.62);
      const x = Math.round(g.front + f.facing * 4 - w / 2 + flutter), y = Math.round(g.mid - h / 2 - 4);
      ctx.fillStyle = '#111'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#e8d8a8'; ctx.fillRect(x, y, w, h);                          // parchment
      ctx.fillStyle = '#c8b078'; ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + h - 3, w, 3); // rolled ends
      ctx.fillStyle = '#6a4a20'; ctx.fillRect(x - 2, y - 2, w + 4, 2); ctx.fillRect(x - 2, y + h, w + 4, 2);
      RF.font.drawText(ctx, 'WE', x + w / 2, y + 6, { align: 'center', color: '#3a2a10' });
      RF.font.drawText(ctx, 'THE', x + w / 2, y + 15, { align: 'center', color: '#3a2a10' });
      ctx.fillStyle = 'rgba(60,40,10,0.6)';
      for (let i = 0; i < Math.floor((h - 34) / 4); i++) ctx.fillRect(x + 3, y + 26 + i * 4, w - 6 - (i % 3) * 3, 1); // writing
      if (g.strength > 0.4) RF.font.drawText(ctx, 'DENIED', x + w / 2, y - 10, { align: 'center', color: '#c01818', outline: '#000' });
    },

    // El Escobedo: a hard-light force field of glowing hexagons.
    hexBarrier(f, ctx, floorY, frame) {
      const g = guardBox(f, floorY);
      if (!g) return;
      const cols = 2, rows = Math.max(3, Math.round(g.hurt.h / 14));
      const x0 = g.front + f.facing * 2, s = 7;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = x0 + f.facing * (c * s * 1.5), cy = g.top + 6 + r * s * 1.7 + (c % 2) * s * 0.85;
          const lit = g.strength > 0.2 || RF.util.hash(r * 7 + c + Math.floor(frame / 6)) > 0.2;
          ctx.strokeStyle = lit ? `rgba(110,200,255,${0.55 + g.strength * 0.45})` : 'rgba(60,120,200,0.25)';
          ctx.fillStyle = `rgba(80,170,255,${0.1 + g.strength * 0.25})`;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            const px = cx + Math.cos(a) * s, py = cy + Math.sin(a) * s;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    },

    // Lady Landa: a giant ghostly serpent rears up in front of her. Lunges and hisses when hit.
    serpentGuard(f, ctx, floorY, frame) {
      const hurt = f.getHurtbox();
      if (!hurt) return;
      const strike = f.shieldHit > 0 ? f.shieldHit / 12 : 0;
      const base = floorY - f.y, top = base - hurt.h - 8;
      const cx = f.x + f.facing * 16;
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, y = base - u * (base - top);
        pts.push([cx + f.facing * Math.sin(u * Math.PI * 2 + frame / 10) * 5, y]);
      }
      const L = RF.electric.line;
      for (let i = 1; i < pts.length; i++) {
        const w = Math.round(9 - i * 0.35);
        L(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w + 2, 'rgba(10,30,15,0.7)');
        L(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, i % 2 ? 'rgba(60,150,90,0.75)' : 'rgba(40,120,70,0.75)');
      }
      // head: lunges forward with its mouth open when something hits the guard
      const [hx0, hy] = pts[pts.length - 1];
      const hx = hx0 + f.facing * (4 + strike * 14);
      ctx.fillStyle = '#0a1e0f'; ctx.fillRect(Math.round(hx - 7), Math.round(hy - 6), 14, 10);
      ctx.fillStyle = '#4aa86a'; ctx.fillRect(Math.round(hx - 6), Math.round(hy - 5), 12, 8);
      ctx.fillStyle = '#ff2010'; ctx.fillRect(Math.round(hx + f.facing * 2), Math.round(hy - 4), 2, 2);  // eye
      if (strike > 0 || frame % 40 < 8) {                                                               // tongue / fangs
        ctx.fillStyle = '#d02040'; ctx.fillRect(Math.round(f.facing > 0 ? hx + 6 : hx - 12), Math.round(hy + 1), 6, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(hx + f.facing * 4), Math.round(hy + 3), 1, 3);
      }
    },

    // A crackling half-dome of electricity in front of him. Flares up when hit.
    electricShield(f, ctx, floorY, frame) {
      const hurt = f.getHurtbox();
      if (!hurt) return;
      const strength = f.shieldHit > 0 ? f.shieldHit / 12 : 0;
      const ry = hurt.h / 2 + 6;
      const cx = f.x + f.facing * 6, cy = floorY - f.y - hurt.h / 2;
      const seed = Math.floor(frame / 2) * 7.7 + f.side * 50;
      E().shield(ctx, cx, cy, 16 + strength * 4, ry, f.facing, seed, strength);
    },
  };
})();
