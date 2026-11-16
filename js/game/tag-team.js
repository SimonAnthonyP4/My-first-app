// TAG TEAM: two fighters a side, one in the ring and one on the bench.
//   TAUNT button         tag your partner in (they arrive swinging; 4 second cooldown)
//   DOWN + TAUNT         call your partner for an assist: they charge across the stage (7 seconds)
// The partner on the bench slowly gets back up to a quarter of their health. Super meter is
// shared. When a fighter is knocked out their partner jumps in; a team loses when both are
// down, and only the last one standing can be finished. One long round, no timer.
// The fight itself is the normal FightScene: `scene.fighters` is always the two in the ring.
(function () {
  const TAG_CD = 240, ASSIST_CD = 420, KO_DELAY = 70, BENCH_HEAL = 0.25;

  RF.tagSetup = function (scene) {
    const o = scene.opts, cos = o.tag.costumes || [0, 0];
    const partners = [new RF.Fighter(o.tag.p1b, 0, cos[0]), new RF.Fighter(o.tag.p2b, 1, cos[1])];
    for (const f of partners) { f.scene = scene; if (f.sprite.warm) f.sprite.warm(); }
    scene.tag = { leads: [...scene.fighters], partners, bench: [...partners], cd: [0, 0], assistCd: [0, 0], swapIn: [0, 0], cap: [0, 0], flash: [0, 0] };
    scene.roundsToWin = 1;
  };

  // A new match: the leads start, the partners wait at full health.
  RF.tagRound = function (scene) {
    const t = scene.tag;
    scene.fighters = [...t.leads]; t.bench = [...t.partners];
    t.bench.forEach((f, i) => { f.reset(i ? 9999 : -9999, i ? -1 : 1); f.meter = 0; t.cap[i] = f.maxHealth; });
    t.cd = [0, 0]; t.assistCd = [0, 0]; t.swapIn = [0, 0]; t.flash = [0, 0];
  };

  const alive = (scene, side) => scene.tag.bench[side].health > 0;
  RF.tagTeamOut = (scene, side) => scene.fighters[side].isKO && !alive(scene, side);

  // Swap the fighter in the ring for the one on the bench.
  RF.tagSwap = function (scene, side, fromKO) {
    const t = scene.tag, old = scene.fighters[side], nw = t.bench[side], opp = scene.fighters[1 - side], b = scene.stageDef.bounds;
    const hp = nw.health;
    // a tag lands where the partner stood; after a knockout the partner comes in from their own corner
    const x = fromKO ? (opp.x > (b.left + b.right) / 2 ? b.left + 34 : b.right - 34) : old.x;
    nw.reset(x, opp.x >= x ? 1 : -1);
    nw.health = hp; nw.meter = old.meter; nw.homeX = x;
    if (opp.victim === old) opp.victim = null;
    old.grabber = null; old.victim = null;
    scene.fighters[side] = nw; t.bench[side] = old;
    t.cap[side] = Math.min(old.maxHealth, old.health + old.maxHealth * BENCH_HEAL); // how far the bench can heal them
    t.cd[side] = TAG_CD; t.flash[side] = 14;
    scene.hud.trail[side] = nw.health / nw.maxHealth;
    if (fromKO) { nw.y = 46; nw.vy = 0; nw.setState('jump'); } // dropping in
    else { nw.startAttack('heavy'); nw.pushVx = nw.facing * 2.6; } // tagging in with a swing
    scene.effects.spawnText(nw.def.name.toUpperCase() + (fromKO ? ' STEPS IN!' : ' TAGS IN!'), x, nw.body.height + 16, side ? '#80b0ff' : '#ff9080');
    scene.flash = Math.max(scene.flash, 4);
    RF.audio.sfx('whoosh'); RF.audio.sfx('select');
  };

  // The TAUNT button, in a tag match. Returns true if it was used for the team.
  RF.tagRequest = function (scene, f, input) {
    const t = scene.tag;
    if (!t || scene.phase !== 'fight' || scene.fighters[f.side] !== f || !alive(scene, f.side)) return false; // alone: taunt as usual
    const side = f.side, partner = t.bench[side];
    if (input.held('down')) {
      if (t.assistCd[side] > 0) { RF.audio.sfx('block'); return true; }
      RF.spawnAssist(scene, f, partner.def.id, { damage: 9, speed: 7, line: partner.def.name.toUpperCase() + '!', hitText: 'ASSIST!' });
      t.assistCd[side] = ASSIST_CD;
      return true;
    }
    if (t.cd[side] > 0) { RF.audio.sfx('block'); return true; }
    RF.tagSwap(scene, side, false);
    return true;
  };

  // Someone in the ring is down. True while a partner is on the way (the match goes on).
  RF.tagKO = function (scene) {
    const t = scene.tag; let goesOn = true;
    scene.fighters.forEach((f, side) => {
      if (!f.isKO) return;
      if (!alive(scene, side)) { goesOn = false; return; }
      if (!t.swapIn[side]) { t.swapIn[side] = KO_DELAY; RF.audio.sfx('ko'); scene.shake = Math.max(scene.shake, 8); }
    });
    return goesOn;
  };

  // Once per simulated frame of the fight.
  RF.tagUpdate = function (scene) {
    const t = scene.tag;
    if (scene.phaseTime === 2) scene.effects.spawnText('TAUNT: TAG IN   DOWN + TAUNT: ASSIST', RF.CONFIG.WIDTH / 2, 150, '#ffd030'); // a reminder as the match starts
    for (let side = 0; side < 2; side++) {
      if (t.cd[side] > 0) t.cd[side]--;
      if (t.assistCd[side] > 0) t.assistCd[side]--;
      if (t.flash[side] > 0) t.flash[side]--;
      const benched = t.bench[side];
      if (benched.health > 0 && benched.health < t.cap[side] && scene.frame % 24 === 0) benched.health = Math.min(t.cap[side], benched.health + 1);
      if (t.swapIn[side] && --t.swapIn[side] === 0 && scene.fighters[side].isKO && alive(scene, side)) RF.tagSwap(scene, side, true);
      // the computer's team: tag out when hurt, call assists from range
      const inp = scene.inputs[side], f = scene.fighters[side], opp = scene.fighters[1 - side];
      if (!(inp instanceof RF.AIInput) || scene.phase !== 'fight' || !alive(scene, side) || f.isKO) continue;
      const calm = f.grounded && (f.state === 'idle' || f.state === 'walk');
      if (calm && t.cd[side] === 0 && f.health < f.maxHealth * 0.3 && benched.health / benched.maxHealth > f.health / f.maxHealth + 0.15 && Math.abs(opp.x - f.x) > 50) RF.tagSwap(scene, side, false);
      else if (calm && t.assistCd[side] === 0 && Math.abs(opp.x - f.x) > 70 && Math.random() < 0.006) {
        RF.spawnAssist(scene, f, benched.def.id, { damage: 9, speed: 7, line: benched.def.name.toUpperCase() + '!', hitText: 'ASSIST!' });
        t.assistCd[side] = ASSIST_CD;
      }
    }
  };

  // The partners' corner of the HUD: a small health bar each, and what the TAUNT button will do.
  RF.drawTagHud = function (ctx, scene) {
    const t = scene.tag, W = RF.CONFIG.WIDTH, T = (...a) => RF.font.drawText(...a), y = 35, BW = 44;
    for (let side = 0; side < 2; side++) {
      const f = t.bench[side], out = f.health <= 0, pct = Math.max(0, f.health / f.maxHealth), x = side === 0 ? 14 : W - 14 - BW;
      ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, BW + 2, 6);
      ctx.fillStyle = '#301010'; ctx.fillRect(x, y, BW, 4);
      const w = Math.round(BW * pct);
      ctx.fillStyle = out ? '#501010' : '#40c0e0'; ctx.fillRect(side === 0 ? x : x + BW - w, y, w, 4);
      const capW = Math.round(BW * Math.min(1, t.cap[side] / f.maxHealth)); // how far they will recover
      if (!out && capW > w) { ctx.fillStyle = 'rgba(64,192,224,0.3)'; ctx.fillRect(side === 0 ? x + w : x + BW - capW, y, capW - w, 4); }
      const name = f.def.name.toUpperCase().slice(0, 12);
      T(ctx, out ? name + ' K.O.' : name, side === 0 ? x + BW + 4 : x - 4, y - 1, { align: side === 0 ? 'left' : 'right', color: out ? '#a04040' : '#a0e0f0', outline: '#000' });
      if (out) continue;
      const ready = t.cd[side] === 0, aReady = t.assistCd[side] === 0, ty = y + 8;
      const lab = (txt, on, lx) => T(ctx, txt, lx, ty, { align: side === 0 ? 'left' : 'right', color: on ? (scene.frame % 40 < 30 ? '#ffd030' : '#ffffff') : '#5a4a40', outline: '#000' });
      lab('TAG', ready, side === 0 ? x : x + BW);
      lab('ASSIST', aReady, side === 0 ? x + 24 : x + BW - 24);
    }
  };
})();
