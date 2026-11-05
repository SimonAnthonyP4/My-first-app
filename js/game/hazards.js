// STAGE HAZARDS: every stage has something nasty against one wall. Knock your
// opponent into it (a heavy hit, launcher, throw or super that sends them
// flying into that wall) and it goes off: extra damage and a big launch.
// It then needs a few seconds to recharge.
//
// RF.HAZARDS[stageId] = { side: -1 left wall / 1 right wall, name, damage,
//   launch: {vx, vy} (vx away from the wall), color, sound,
//   draw(ctx, x, floorY, frame, firing)  the prop (x = the wall)
//   fx(ctx, x, floorY, t, victim)        the effect when it goes off (t counts up) }
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const COOLDOWN = 300;   // frames before it can go off again
  const FX_TIME = 50;

  RF.HAZARDS = {
    // Hell Cafeteria: a vat of bubbling fryer oil.
    cafeteria: {
      side: -1, name: 'DEEP FRIED!', damage: 10, launch: { vx: 4, vy: 8 }, color: '#ff9a30', sound: 'boom',
      draw(ctx, x, floorY, frame, firing) {
        const l = x - 2;
        ctx.fillStyle = '#111'; ctx.fillRect(l, floorY - 30, 26, 30);
        ctx.fillStyle = '#7a8088'; ctx.fillRect(l + 1, floorY - 29, 24, 28);
        ctx.fillStyle = '#4a4e54'; ctx.fillRect(l + 1, floorY - 12, 24, 2);
        ctx.fillStyle = '#c87a10'; ctx.fillRect(l + 3, floorY - 29, 20, 4);       // oil
        for (let i = 0; i < 3; i++) if ((frame + i * 9) % 24 < 12) { ctx.fillStyle = '#ffd060'; ctx.fillRect(l + 5 + i * 7, floorY - 31 - ((frame + i * 5) % 6) / 2, 2, 2); }
        ctx.fillStyle = '#e83020'; ctx.fillRect(l + 18, floorY - 20, 3, 3);         // HOT light
        RF.font.drawText(ctx, 'FRY', l + 12, floorY - 9, { align: 'center', color: '#e8e0d0' });
      },
      fx(ctx, x, floorY, t) { // a column of flame
        for (let i = 0; i < 30; i++) {
          const h = (t * 3 + i * 13) % 90, a = Math.max(0, 1 - t / FX_TIME);
          ctx.fillStyle = i % 3 ? `rgba(255,${120 + (i % 4) * 30},20,${a})` : `rgba(255,240,160,${a})`;
          ctx.fillRect(x + 4 + Math.sin(i * 1.7 + t / 3) * 10, floorY - 30 - h, 4 + (i % 3), 6);
        }
      },
    },
    // Haunted Court: ghostly hands claw up out of a crack in the floor.
    court: {
      side: 1, name: 'HAUNTED!', damage: 10, launch: { vx: 4, vy: 7 }, color: '#b080ff', sound: 'cackle',
      draw(ctx, x, floorY, frame) {
        ctx.fillStyle = '#000'; ctx.fillRect(x - 26, floorY - 1, 24, 3);
        ctx.fillStyle = `rgba(150,90,255,${0.25 + 0.15 * Math.sin(frame / 10)})`; ctx.fillRect(x - 28, floorY - 4, 28, 3);
      },
      fx(ctx, x, floorY, t) {
        const rise = Math.min(1, t / 10) * (t > FX_TIME - 10 ? (FX_TIME - t) / 10 : 1);
        for (let i = 0; i < 4; i++) {
          const hx = x - 24 + i * 6, h = Math.round((26 + (i % 2) * 10) * rise);
          ctx.fillStyle = 'rgba(190,150,255,0.85)'; ctx.fillRect(hx, floorY - h, 4, h);
          ctx.fillRect(hx - 2, floorY - h - 3, 2, 4); ctx.fillRect(hx + 4, floorY - h - 3, 2, 4); // fingers
        }
      },
    },
    // Sirven's Office: an industrial paper shredder.
    office: {
      side: -1, name: 'SHREDDED!', damage: 10, launch: { vx: 4, vy: 7 }, color: '#f0f0f0', sound: 'drill',
      draw(ctx, x, floorY, frame, firing) {
        const l = x - 2;
        ctx.fillStyle = '#111'; ctx.fillRect(l, floorY - 34, 22, 34);
        ctx.fillStyle = '#3a3a44'; ctx.fillRect(l + 1, floorY - 33, 20, 32);
        ctx.fillStyle = '#18181c'; ctx.fillRect(l + 3, floorY - 33, 16, 3);          // the slot
        ctx.fillStyle = firing ? (frame % 4 < 2 ? '#ff3030' : '#601010') : '#30d050'; ctx.fillRect(l + 15, floorY - 26, 3, 2);
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(l + 3, floorY - 16, 16, 12);          // bin of shreds
        ctx.fillStyle = '#9a9aa4'; for (let i = 0; i < 5; i++) ctx.fillRect(l + 4 + i * 3, floorY - 15, 1, 10);
      },
      fx(ctx, x, floorY, t) { // confetti of shredded paper
        for (let i = 0; i < 40; i++) {
          const u = t / FX_TIME, ang = -Math.PI / 2 + (i / 40 - 0.5) * 1.6;
          const d = 10 + u * (40 + (i % 7) * 10);
          ctx.fillStyle = i % 4 ? '#f0f0f0' : '#ff9ac8';
          ctx.globalAlpha = Math.max(0, 1 - u);
          ctx.fillRect(x + 10 + Math.cos(ang) * d, floorY - 34 + Math.sin(ang) * d + u * u * 40, 1, 4);
        }
        ctx.globalAlpha = 1;
      },
    },
    // NYC Street: a fire hydrant that blasts you sky-high.
    nyc: {
      side: 1, name: 'HYDRANT!', damage: 8, launch: { vx: 3, vy: 11 }, color: '#7ad8ff', sound: 'hiss',
      draw(ctx, x, floorY) {
        const l = x - 18;
        ctx.fillStyle = '#111'; ctx.fillRect(l - 1, floorY - 22, 14, 22);
        ctx.fillStyle = '#d02020'; ctx.fillRect(l, floorY - 21, 12, 21);
        ctx.fillStyle = '#ff5050'; ctx.fillRect(l + 2, floorY - 21, 3, 21);
        ctx.fillStyle = '#d02020'; ctx.fillRect(l - 3, floorY - 15, 18, 4);            // side caps
        ctx.fillStyle = '#a01010'; ctx.fillRect(l + 2, floorY - 25, 8, 4);
      },
      fx(ctx, x, floorY, t) { // a huge spray of water
        const a = Math.max(0, 1 - t / FX_TIME);
        for (let i = 0; i < 36; i++) {
          const h = (t * 6 + i * 11) % 150;
          ctx.fillStyle = i % 3 ? `rgba(120,200,255,${a})` : `rgba(230,250,255,${a})`;
          ctx.fillRect(x - 14 + Math.sin(i * 2.3 + t / 2) * (4 + h / 12), floorY - 24 - h, 3, 5);
        }
      },
    },
  };

  const wallX = (scene, hz) => (hz.side < 0 ? scene.stageDef.bounds.left : scene.stageDef.bounds.right);

  // Called every frame of a fight: did someone get knocked into the hazard?
  RF.checkHazards = function (scene) {
    const hz = RF.HAZARDS[scene.stageDef.id];
    if (scene.hazardFx && ++scene.hazardFx.t > FX_TIME) scene.hazardFx = null;
    if (!hz || scene.hazardCooldown-- > 0 || scene.phase !== 'fight') return;
    const b = scene.stageDef.bounds, mid = (b.left + b.right) / 2;
    for (const f of scene.fighters) {
      const flying = Math.abs(f.pushVx) > 2.5 || Math.abs(f.vx) > 1.8 || (!f.grounded && f.juggle > 0);
      if (f.state !== 'hitstun' || !flying || !f.atWall(b) || Math.sign(f.x - mid) !== hz.side) continue;
      // It goes off!
      const att = scene.opponentOf(f);
      const dmg = hz.damage * (1 - f.stats.damageReduction);
      f.health = Math.max(scene.training ? 1 : 0, f.health - dmg);
      f.flash = 6;
      f.stun = Math.max(f.stun, 30);
      f.juggle = Math.max(f.juggle, 1);
      f.vy = hz.launch.vy; f.vx = -hz.side * hz.launch.vx; f.pushVx = 0;
      scene.hazardCooldown = COOLDOWN;
      scene.hazardFx = { t: 0, f };
      scene.shake = Math.max(scene.shake, 12);
      scene.hitstop = Math.max(scene.hitstop, 10);
      scene.effects.spawnText(hz.name, f.x, f.body.height + 20, hz.color);
      RF.audio.sfx(hz.sound); RF.audio.sfx('heavy');
      RF.announcer.say(hz.name, { rate: 0.95 });
      scene.game.kb.rumble(f.side, 1, 300);
      att.gainMeter(dmg);
      if (scene.isHuman(att)) RF.records.unlock('hazard');
      if (f.health <= 0) f.knockOut(-hz.side);
      break;
    }
  };

  RF.drawHazard = function (scene, ctx, floorY) {
    const hz = RF.HAZARDS[scene.stageDef.id];
    if (hz) hz.draw(ctx, wallX(scene, hz), floorY, scene.frame, !!scene.hazardFx);
  };
  RF.drawHazardFx = function (scene, ctx, floorY) {
    const hz = RF.HAZARDS[scene.stageDef.id];
    if (hz && scene.hazardFx) hz.fx(ctx, wallX(scene, hz), floorY, scene.hazardFx.t, scene.hazardFx.f);
  };
})();
