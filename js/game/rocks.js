// ALEJANDRO CONTROLS THE ROCK. Three moves, and the effects that animate them.
//   ROCK SPIKE   DOWN, FORWARD + LIGHT   cracks run along the floor to where you are standing, and
//                                        a spike of stone erupts there. Move, or jump it. (70 frame cooldown)
//   ROCK WALL    DOWN, BACK + LIGHT      a slab of stone shoots out of the ground and rolls toward them. It hits,
//                                        then stays up as a barrier: it stops walking and eats projectiles,
//                                        and breaks if you hit it hard enough, or after a couple of seconds.
//                                        One at a time. (150 frame cooldown)
//   LANDSLIDE    his signature special   (perfect block / EX / super). Shadows show where the rocks will land;
//                                        seven fall, the last one a boulder. Jumping over them works.
// Dyno and Free Solo are still there, on the HEAVY version of each motion.
(function () {
  const { rectsOverlap } = RF.util;
  const C = { d: '#2e261f', m: '#5e5040', l: '#8c7a5e', hi: '#c0ae8c', dark: '#171210' };
  const rng = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = RF.util.clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));

  // ---------------------------------------------------------------- the numbers
  RF.COMMANDS.rockSpike = { name: 'Rock Spike', kind: 'rockSummon', make: 'spike', startup: 9, delay: 15, recovery: 18, cd: 60, color: '#c0ae8c', callout: 'ROCK SPIKE!',
    damage: 11, hitstun: 28, blockstun: 12, pushback: 3, hitstop: 8, launch: 6.5, launchVx: 0.8 };
  RF.COMMANDS.rockWall = { name: 'Rock Wall', kind: 'rockSummon', make: 'wall', startup: 11, dist: 34, run: 28, speed: 2.6, recovery: 22, cd: 150, life: 130, hp: 46, color: '#c0ae8c', callout: 'ROCK WALL!',
    damage: 6, hitstun: 22, blockstun: 10, pushback: 5, hitstop: 7, launch: 3.2, launchVx: 1.4 };
  RF.SPECIALS.landslide = { name: 'Landslide', description: 'Shadows show where the rocks will land. Seven fall on the opponent, the last one a boulder. Jump over them, or walk out.',
    kind: 'rockfall', callout: 'LANDSLIDE!', startup: 20, rocks: 7, interval: 5, fall: 15, recovery: 24, spread: 15,
    damage: 4, megaDamage: 10, hitstun: 26, blockstun: 10, pushback: 1, hitstop: 4, launch: 0 };

  // ---------------------------------------------------------------- the summoning moves
  const summon = (f, scene, s, x) => {
    (scene.rocks = scene.rocks || []);
    const move = RF.specialMove(f, s);
    if (s.make === 'spike') scene.rocks.push({ k: 'spike', x, owner: f, s, move, t: 0, hit: false });
    else { scene.rocks = scene.rocks.filter((e) => !(e.k === 'wall' && e.owner === f)); scene.rocks.push({ k: 'wall', x, owner: f, s, move, t: 0, hit: false, hp: s.hp, w: 28, h: 58, vx: f.facing * s.speed, side: 0, seed: Math.floor(Math.random() * 99) }); }
  };
  RF.SPECIAL_KINDS.rockSummon = {
    start(f, scene) {
      const s = f.special, d = f.specialData, opp = scene.opponentOf(f); f.vx = 0;
      f.rockCd = f.rockCd || {};
      d.cool = (f.rockCd[s.make] || 0) > scene.frame;
      if (d.cool) { scene.effects.spawnText('RECHARGING', f.x, f.body.height + 22, '#a09080'); d.tx = f.x; return; }
      d.tx = opp.x; RF.audio.sfx('rumble');
    },
    update(f, scene) {
      const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f), b = scene.stageDef.bounds;
      if (d.cool) { if (t >= 14) f.setState('idle'); return; }
      if (s.make === 'spike' && t < s.startup) d.tx += (opp.x - d.tx) * 0.22;           // the crack follows them while he winds up
      if (t === s.startup) {
        f.rockCd[s.make] = scene.frame + s.cd;
        const x = s.make === 'spike' ? clamp(d.tx, b.left + 8, b.right - 8) : f.x + f.facing * (f.body.width / 2 + s.dist);
        summon(f, scene, s, clamp(x, b.left + 12, b.right - 12));
        RF.audio.sfx('stomp'); scene.shake = Math.max(scene.shake, 3);
      }
      if (t >= s.startup + s.recovery) f.setState('idle');
    },
    anim(f) { const s = f.special; return f.stateTime < s.startup ? ['crouch', 0] : ['heavy', 1]; },     // fist to the floor, then up
    draw(f, ctx, floorY, frame) {   // the crack, running from his fist to where it will happen
      const s = f.special, t = f.stateTime, d = f.specialData;
      if (d.cool || s.make !== 'spike' || t > s.startup + s.delay) return;
      const x0 = f.x + f.facing * 10, x1 = d.tx, n = Math.max(2, Math.floor(Math.abs(x1 - x0) / 7)), reach = Math.min(1, t / s.startup);
      ctx.strokeStyle = C.hi; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, floorY - 1);
      for (let i = 1; i <= n * reach; i++) ctx.lineTo(x0 + (x1 - x0) * (i / n), floorY - 1 + (i % 2 ? 2 : -1));
      ctx.stroke(); ctx.lineWidth = 1;
    },
  };

  // ---------------------------------------------------------------- the things they make
  RF.rocksUpdate = function (sc) {
    const L = sc.rocks; if (!L || !L.length) return;
    if (sc.phase !== 'fight') { sc.rocks = []; return; }
    for (const e of L) {
      e.t++; const opp = sc.opponentOf(e.owner), hurt = opp.getHurtbox();
      if (e.k === 'spike') {
        const d = e.s.delay;
        if (e.t === d) { RF.audio.sfx('boom'); sc.shake = Math.max(sc.shake, 7); sc.effects.spawn('dust', e.x, 1); }
        if (e.t >= d && e.t <= d + 6 && !e.hit && hurt && rectsOverlap({ x: e.x - 12, y: 0, w: 24, h: Math.min(58, (e.t - d + 1) * 11) }, hurt)) { e.hit = true; sc.applyHit(e.owner, opp, e.move, 'heavy', e.x, 28); }
        if (e.t > d + 38) e.dead = true;
      } else {
        if (e.t === 1) { RF.audio.sfx('boom'); sc.shake = Math.max(sc.shake, 5); sc.effects.spawn('dust', e.x, 1); }
        const box = { x: e.x - e.w / 2, y: 0, w: e.w, h: e.h * Math.min(1, e.t / 7) };
        if (e.t < e.s.run && e.vx) { e.x += e.vx * (1 - e.t / e.s.run); if (e.t % 5 === 0) sc.effects.spawn('dust', e.x, 1); }
        if (!e.crumble) {
          if (!e.hit && hurt && e.t < e.s.run + 6 && rectsOverlap(box, hurt)) { e.hit = true; e.vx = 0; sc.applyHit(e.owner, opp, e.move, 'heavy', e.x, 30); }
          if (!e.side) e.side = Math.sign(opp.x - e.x) || -e.owner.facing;
          // a barrier: the opponent cannot walk through it (they can jump it)
          if (opp.y < e.h - 8 && e.t > 2) {
            const gap = e.w / 2 + opp.body.width / 2;
            if (e.side > 0 && opp.x < e.x + gap) { opp.x = e.x + gap; if (opp.vx < 0) opp.vx = 0; }
            if (e.side < 0 && opp.x > e.x - gap) { opp.x = e.x - gap; if (opp.vx > 0) opp.vx = 0; }
          }
          // it eats projectiles, and takes hard hits
          for (const p of sc.projectiles) if (!p.dead && p.owner !== e.owner && rectsOverlap(sc.projBox(p), { x: e.x - e.w / 2, y: 0, w: e.w, h: e.h })) { p.dead = true; e.hp -= 14; e.flash = 4; sc.effects.spawn('hit', e.x, 30); RF.audio.sfx('block'); }
          const hb = opp.getHitbox && opp.getHitbox();
          if (hb && rectsOverlap(hb, { x: e.x - e.w / 2, y: 0, w: e.w, h: e.h })) { e.hp -= 9; e.flash = 3; if (e.t % 3 === 0) sc.effects.spawn('hit', e.x, 30); }
          if (e.hp <= 0 || e.t > e.s.life) { e.crumble = 1; RF.audio.sfx('crack'); sc.effects.spawn('dust', e.x, 1); sc.shake = Math.max(sc.shake, 4); }
        } else if (++e.crumble > 16) e.dead = true;
      }
    }
    sc.rocks = L.filter((e) => !e.dead);
  };
  const poly = (ctx, pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  RF.drawRocks = function (sc, ctx, floorY) {
    for (const e of sc.rocks || []) {
      if (e.k === 'spike') {
        const d = e.s.delay, t = e.t, x = e.x;
        if (t < d) {   // the warning: cracks that widen, pebbles that start to jump
          ctx.strokeStyle = C.hi; ctx.globalAlpha = 0.4 + 0.6 * (t / d); ctx.lineWidth = 2;
          for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5, floorY); ctx.lineTo(x + i * 9 + (t % 4 < 2 ? 2 : -2), floorY - 1 + i); ctx.lineTo(x + i * 14, floorY + 1); ctx.stroke(); }
          ctx.lineWidth = 1; ctx.globalAlpha = 1;
          for (let i = 0; i < 5; i++) { const jy = Math.abs(Math.sin(t * 0.5 + i * 2)) * (t / d) * 6; ctx.fillStyle = C.l; ctx.fillRect(Math.round(x - 12 + i * 6), Math.round(floorY - 2 - jy), 2, 2); }
          continue;
        }
        const u = clamp((t - d) / 6, 0, 1), sink = t > d + 24 ? clamp(1 - (t - d - 24) / 14, 0, 1) : 1, h = 56 * u * sink, fl = t < d + 6 ? 1 : 0;
        const spike = (cx, w, hh) => { if (hh < 1) return; poly(ctx, [[cx - w, floorY], [cx - w * 0.6, floorY - hh * 0.55], [cx, floorY - hh], [cx + w * 0.45, floorY - hh * 0.6], [cx + w, floorY]], C.m);
          poly(ctx, [[cx - w, floorY], [cx - w * 0.6, floorY - hh * 0.55], [cx, floorY - hh], [cx - w * 0.1, floorY]], C.d); poly(ctx, [[cx + w * 0.45, floorY - hh * 0.6], [cx, floorY - hh], [cx + w * 0.1, floorY - hh * 0.4]], C.hi);
          ctx.fillStyle = C.dark; ctx.fillRect(Math.round(cx - w), floorY - 1, Math.round(w * 2), 1); };
        spike(x - 17, 6, h * 0.5); spike(x + 16, 6, h * 0.38); spike(x, 11, h);
        if (fl) { ctx.fillStyle = 'rgba(255,240,200,0.4)'; ctx.fillRect(Math.round(x - 14), Math.round(floorY - 60), 28, 60); }
        for (let i = 0; i < 6 && t < d + 20; i++) { const a = rng(i + e.x), rr = (t - d) * (1 + a * 1.4); ctx.fillStyle = i % 2 ? C.l : C.m; ctx.fillRect(Math.round(x + (a - 0.5) * rr * 5), Math.round(floorY - rr * (1.6 - a * 0.9) + rr * rr * 0.06), 3, 3); }
      } else {
        const rise = clamp(e.t / 7, 0, 1), h = e.h * rise, x = e.x, w = e.w, cr = e.crumble ? e.crumble / 16 : 0, sx = x - w / 2;
        ctx.save(); if (cr) ctx.globalAlpha = 1 - cr;
        const jag = (i) => Math.round(rng(i + e.seed) * 7);
        const col = e.flash > 0 ? (e.flash-- , '#e8dcc0') : null;
        // three stacked slabs, offset, with a ragged top
        for (let i = 0; i < 3; i++) { const y0 = floorY - h * ((i + 1) / 3), hh = Math.ceil(h / 3) + 1, o = (i === 1 ? 2 : i === 2 ? -1 : 0) + (cr ? (i - 1) * cr * 10 : 0);
          ctx.fillStyle = C.dark; ctx.fillRect(Math.round(sx + o - 1), Math.round(y0 - 1), w + 2, hh + 1);
          ctx.fillStyle = col || C.m; ctx.fillRect(Math.round(sx + o), Math.round(y0), w, hh);
          ctx.fillStyle = col || C.d; ctx.fillRect(Math.round(sx + o), Math.round(y0), 6, hh); ctx.fillStyle = col || C.l; ctx.fillRect(Math.round(sx + o + w - 5), Math.round(y0), 4, hh);
          ctx.fillStyle = C.dark; ctx.fillRect(Math.round(sx + o + 8 + jag(i) * 2), Math.round(y0 + 3), 1, hh - 4);
        }
        ctx.fillStyle = col || C.hi; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx + i * 7), Math.round(floorY - h - jag(i + 4) / 2), 5, 3 + jag(i));   // the ragged crown of it
        ctx.restore();
        if (rise < 1) for (let i = 0; i < 6; i++) { const a = rng(i * 3 + e.seed); ctx.fillStyle = i % 2 ? C.l : C.m; ctx.fillRect(Math.round(x + (a - 0.5) * 50 * rise), Math.round(floorY - rise * 40 * (1 + a) + rise * rise * 14), 3, 3); }
        if (cr) for (let i = 0; i < 8; i++) { const a = rng(i + 20 + e.seed); ctx.globalAlpha = 1 - cr; ctx.fillStyle = i % 2 ? C.l : C.m; ctx.fillRect(Math.round(x + (a - 0.5) * 60 * cr), Math.round(floorY - 40 * (1 - cr) - a * 14 + cr * cr * 40), 4, 4); ctx.globalAlpha = 1; }
      }
    }
  };

  // ---------------------------------------------------------------- LANDSLIDE
  RF.SPECIAL_KINDS.rockfall = {
    start(f, scene) { f.vx = 0; f.specialData.tx = scene.opponentOf(f).x; RF.audio.sfx('rumble'); },
    update(f, scene) {
      const s = f.special, t = f.stateTime, d = f.specialData, opp = scene.opponentOf(f), b = scene.stageDef.bounds;
      if (t < s.startup) { d.tx += (opp.x - d.tx) * 0.12; if (t % 7 === 0) scene.shake = Math.max(scene.shake, 2); return; }   // the mountain looks for them, then commits
      for (let i = 0; i < s.rocks; i++) {
        if (t !== s.startup + i * s.interval + s.fall) continue;
        const mega = i === s.rocks - 1, x = clamp(d.tx + (mega ? 0 : (((i * 5) % 7) - 3) * s.spread / 3), b.left + 6, b.right - 6);
        scene.shake = Math.max(scene.shake, mega ? 12 : 4); RF.audio.sfx(mega ? 'boom' : 'stomp'); scene.effects.spawn('dust', x, 1);
        if (opp.getHurtbox() && opp.y < 46 && Math.abs(opp.x - x) < opp.body.width / 2 + (mega ? 24 : 12)) {
          const mv = RF.specialMove(f, s), mult = f.superActive ? RF.CONFIG.SUPER_DAMAGE : f.exActive ? RF.CONFIG.EX_DAMAGE : 1;
          if (mega) { mv.damage = s.megaDamage * f.stats.damage * mult; mv.launch = 7; mv.hitstop = 10; mv.hitstun = 34; }
          scene.applyHit(f, opp, mv, 'heavy', x, 30);
        }
      }
      if (t >= s.startup + (s.rocks - 1) * s.interval + s.fall + s.recovery) f.setState('idle');
    },
    anim(f) { return ['throw', 1]; },   // both arms raised
    draw(f, ctx, floorY, frame) {
      const s = f.special, t = f.stateTime, d = f.specialData, end = s.startup + (s.rocks - 1) * s.interval + s.fall;
      if (t > end + 14) return;
      const X = (i) => d.tx + (i === s.rocks - 1 ? 0 : (((i * 5) % 7) - 3) * s.spread / 3);
      for (let i = 0; i < s.rocks; i++) {   // shadows on the floor first: this is where it lands
        const land = s.startup + i * s.interval + s.fall, mega = i === s.rocks - 1;
        if (t < s.startup || t > land + 4) continue;
        const k = clamp((t - s.startup) / (land - s.startup), 0, 1), r = (mega ? 22 : 12) * (0.4 + 0.6 * k);
        ctx.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.35 * k) + ')'; ctx.beginPath(); ctx.ellipse(X(i), floorY, r, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < s.rocks; i++) {   // the rocks themselves
        const start = s.startup + i * s.interval, u = (t - start) / s.fall, mega = i === s.rocks - 1, k = mega ? 2.1 : 1;
        if (u < 0 || t > start + s.fall + 12) continue;
        const x = X(i), y = u >= 1 ? floorY - 5 * k : -16 + (floorY - 5 * k + 16) * u * u, a = u >= 1 ? 0.3 * i : (t * 0.3 + i);
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a);
        poly(ctx, [[-9 * k, -2 * k], [-5 * k, -8 * k], [3 * k, -9 * k], [9 * k, -3 * k], [8 * k, 5 * k], [0, 8 * k], [-8 * k, 6 * k]], C.dark);
        poly(ctx, [[-8 * k, -2 * k], [-4 * k, -7 * k], [3 * k, -8 * k], [8 * k, -3 * k], [7 * k, 4 * k], [0, 7 * k], [-7 * k, 5 * k]], C.m);
        poly(ctx, [[-8 * k, -2 * k], [-4 * k, -7 * k], [0, -3 * k], [-3 * k, 3 * k], [-7 * k, 5 * k]], C.d); poly(ctx, [[3 * k, -8 * k], [8 * k, -3 * k], [4 * k, -2 * k]], C.hi);
        ctx.restore();
        if (u < 1) { ctx.fillStyle = C.l; for (let j = 0; j < 3; j++) ctx.fillRect(Math.round(x + (j - 1) * 4 * k), Math.round(y - 10 * k - j * 6), 2, 4); }   // dust falling off it
      }
      if (t >= s.startup - 4 && t < s.startup + 40) RF.font.drawText(ctx, s.callout, RF.CONFIG.WIDTH / 2, 50, { scale: 3, align: 'center', outline: '#000', color: ['#ffffff', '#e8dcc0', '#c8b898', '#a8946e', '#8c7a5e', '#6a5a46', '#3e3226'] });
    },
  };
})();
