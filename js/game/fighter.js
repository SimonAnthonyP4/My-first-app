// One fighter: state machine, movement physics, attacks and hit reactions.
// World coordinates: x = horizontal centre, y = height of the feet above the
// floor (0 = standing on it).
(function () {
  const { sign, clamp } = RF.util;
  const JUMP_SQUAT = 3; // frames crouched before a jump leaves the ground

  // Apply a character's stats to a base move from moves.js.
  function buildMove(base, def) {
    const as = def.stats.attackSpeed, s = def.body.scale;
    const startup = Math.max(1, Math.round(base.startup / as));
    const active = Math.max(1, Math.round(base.active / as));
    const recovery = Math.max(1, Math.round(base.recovery / as));
    return Object.assign({}, base, {
      startup, active, recovery,
      total: startup + active + recovery,
      damage: base.damage * def.stats.damage,
      hitbox: { x: base.hitbox.x * s, y: base.hitbox.y * s, w: base.hitbox.w * s, h: base.hitbox.h * s },
    });
  }

  const SNAP = new Set(['hit', 'ko']); // animations that switch instantly (impacts read better)

  class Fighter {
    constructor(def, side, alt = false) {
      if (alt) def = RF.costume(def, alt === true ? 1 : alt); // alt = costume number
      this.def = def;
      this.side = side; // 0 = player 1, 1 = player 2
      this.stats = def.stats;
      this.body = def.body;
      this.sprite = RF.createSprite(def);
      this.moves = {};
      for (const k in RF.MOVES) {
        const own = def.moves && def.moves[k];
        this.moves[k] = buildMove(own ? Object.assign({}, RF.MOVES[k], own) : RF.MOVES[k], def);
      }
      this.maxHealth = def.health || (RF.CONFIG.HEALTH_BY_ARCHETYPE || {})[def.archetype] || RF.CONFIG.MAX_HEALTH;
      this.special = RF.SPECIALS[def.special];
      this.baseSpecial = this.special; // the signature special (perfect block / EX / super)
      this.specialKind = RF.SPECIAL_KINDS[this.special.kind];
      this.motion = [];                // recent directions (numpad notation) for command inputs
      if (def.powerPunch) this.moves.powerPunch = buildMove(def.powerPunch, def); // Nicholas's MAX GAINS punch
      this.throwCfg = RF.THROWS[def.throw];
      this.throwKind = this.throwCfg && RF.THROW_KINDS[this.throwCfg.kind];
      this.scene = null; // set by FightScene
      this.meter = 0;    // super meter (kept between rounds)
      this.lastSuperAt = -Infinity;
      this.reset(0, 1);
    }

    reset(x, facing) {
      this.boneBreakUsed = false; // BONE BREAKER: once per round
      this.x = x; this.y = 0;
      this.vx = 0; this.vy = 0;
      this.pushVx = 0;
      this.facing = facing;
      this.health = this.maxHealth;
      this.move = null;
      this.moveKind = null;
      this.moveHasHit = false;
      this.attackAirborne = false;
      this.airAttackUsed = false;
      this.stun = 0;
      this.walkTime = 0;
      this.crouching = false;
      this.chain = 0;     // attacks cancelled into in the current string
      this.combo = 0;     // hits taken in a row without recovering
      this.flash = 0;     // frames left of the white hit flash
      this.hidden = false; // finishers can hide a fighter
      this.shieldHit = 0; // frames left of a block effect flaring up
      this.fxHitDist = null; // how far a ranged move's effect reached (it stops at its target)
      this.specialData = {};
      this.victim = null;   // who we're throwing
      this.grabber = null;  // who's throwing us
      this.thrownPose = null;
      this.lastBlockPress = -Infinity;
      this.power = 0;       // Nicholas's power-punch meter (0..100, per round)
      this.rageShown = false; // RAGE! announced this round
      this.mulliganUsed = false; // Tyler: the first clean hit each round doesn't count
      this.alterT = 0;        // Gabriel: frames left as MR. SUPPLIER
      this.rageMeter = 0;     // Mikey: fills as he gets hit; full = MIKEY SMASH
      this.hulkT = 0;         // Mikey: frames left smashing
      this.juggle = 0;      // hits taken while airborne in this combo
      this.bounced = false; // already floor-bounced in this combo
      this.superActive = false;
      this.counterHit = false;
      this.dirSeen = {};
      this.dashReq = null;
      this.trail = [];
      this.blockPressEligible = false;
      this.blockPressAge = Infinity;
      this.state = null;
      this.setState('idle');
    }

    setState(state) {
      if (this.state === state) return;
      this.state = state;
      this.stateTime = 0;
      // Only these states can be done low; everything else stands you up.
      if (!['crouch', 'block', 'blockstun', 'attack'].includes(state)) this.crouching = false;
      if (state !== 'hitstun') { this.juggle = 0; this.bounced = false; this.spiked = false; this.wallBounced = false; }
      if (state !== 'special') {
        this.superActive = false; this.exActive = false;
        if (this.baseSpecial && this.special !== this.baseSpecial) { this.special = this.baseSpecial; this.specialKind = RF.SPECIAL_KINDS[this.special.kind]; }
      }
      if (state !== 'jump' && state !== 'attack') this.airCombo = false;
    }

    get grounded() { return this.y <= 0; }
    get isKO() { return this.state === 'ko'; }

    faceOpponent(opp) {
      if (opp.x !== this.x) this.facing = sign(opp.x - this.x);
    }

    update(input, opp, canAct, bounds) {
      this.stateTime++;
      if (this.hulkT > 0 && --this.hulkT === 0 && this.scene) this.scene.effects.spawnText('...CALM.', this.x, this.body.height + 16, '#80c080');
      if (this.alterT > 0 && --this.alterT === 0 && this.scene) this.scene.effects.spawnText('SUPPLY RAN OUT.', this.x, this.body.height + 16, '#a0a0a0');
      this.trackBlockPress(input);
      this.trackDash(input);
      this.trackMotion(input);
      this.trail.unshift([this.x, this.y]);
      if (this.trail.length > 10) this.trail.pop();
      switch (this.state) {
        case 'idle':
        case 'walk':
        case 'crouch':
        case 'block':
          if (canAct) this.groundControl(input, opp);
          else { this.vx = 0; this.setState('idle'); }
          break;
        case 'jumpSquat': // a few frames crouched before leaving the ground
          if (canAct && input.pressed('heavy')) { input.consume('heavy'); this.startAttack('launcher'); break; }
          if (this.stateTime >= JUMP_SQUAT) { if (canAct) this.doJump(input); else this.setState('idle'); }
          break;
        case 'dash':
          this.vx *= 0.9;
          if (canAct && this.dashDir === this.facing && this.stateTime >= 4) {
            if (this.wantsSuper(input)) { this.startSuper(); break; }
            if (this.throwCfg && input.pressed('throw')) { input.consume('throw'); this.startThrow(); break; }
            if (input.pressed('light')) { input.consume('light'); this.startAttack('light'); break; }
            if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack(input.held('up') ? 'launcher' : 'heavy'); break; }
          }
          if (this.stateTime >= (this.dashDir === this.facing ? 16 : 18)) { this.vx = 0; this.setState('idle'); }
          break;
        case 'jump':
          this.crouching = false;
          // SHORT HOP: tap UP (let go early) for a quick low hop; hold it for a full jump.
          if (this.hopCheck && this.stateTime <= 7 && this.vy > 0 && !input.held('up')) {
            this.hopCheck = false;
            this.vy = Math.min(this.vy, this.stats.jumpPower * 0.42);
            this.vx *= 1.1; // hops travel a bit flatter and faster
          }
          // WALL JUMP (Alejandro): against the edge of the stage, hold toward it to slide down
          // slowly, press UP to kick off it (up to 3 times before landing).
          if (this.def.wallJump && bounds && this.atWall(bounds)) {
            const wallDir = this.x < (bounds.left + bounds.right) / 2 ? -1 : 1;
            const towards = input.held(wallDir < 0 ? 'left' : 'right');
            if (towards && this.vy < -1.2) { this.vy = -1.2; if (this.scene && this.stateTime % 6 === 0) this.scene.effects.spawn('dust', this.x + wallDir * 10, this.y + 30); }
            if (canAct && this.stateTime > 3 && (this.wallJumps || 0) < 3 && input.lastPress('up') > this.jumpPressAt && input.pressed('up')) {
              input.consume('up');
              this.wallJumps = (this.wallJumps || 0) + 1;
              this.jumpPressAt = input.kb.frame;
              this.vy = this.stats.jumpPower * 0.95;
              this.vx = -wallDir * 5.5;
              this.facing = -wallDir;
              this.airAttackUsed = false;
              if (this.scene) { this.scene.effects.spawnText('WALL JUMP!', this.x, this.y + this.body.height + 10, '#ff8030'); this.scene.effects.spawn('dust', this.x + wallDir * 10, this.y + 20); }
              RF.audio.sfx('whoosh');
              break;
            }
          }
          // Double jump (agile fighters): press UP again in the air.
          if (canAct && this.def.doubleJump && !this.doubleJumped && this.stateTime > 4 && input.lastPress('up') > this.jumpPressAt && input.pressed('up')) {
            input.consume('up');
            this.doubleJumped = true;
            const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
            this.vy = Math.max(this.vy, 5.5); // a short extra hop (and a change of direction)
            if (this.def.doubleJumpText && this.scene) { this.scene.effects.spawnText(this.def.doubleJumpText, this.x, this.y + this.body.height + 8, '#ff60a0'); this.ollieT = 14; }
            if (dir) this.vx = dir * Math.max(this.stats.walkSpeed * RF.CONFIG.JUMP_FORWARD_FACTOR, RF.CONFIG.JUMP_MIN_SPEED);
            this.airAttackUsed = false;
            if (this.scene) { this.scene.effects.spawn('dust', this.x, this.y); this.scene.effects.spawn('dust', this.x + 6, this.y); }
            RF.audio.sfx('whoosh');
          }
          if (canAct && !this.airAttackUsed) {
            if (input.pressed('light')) { input.consume('light'); this.startAttack('airLight'); }
            else if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack('airHeavy'); }
          }
          break;
        case 'attack':
          if (this.move.fx && this.stateTime === this.move.startup) RF.audio.sfx(this.move.fxSound || 'bolt');
          if (this.move.projectile && this.stateTime === this.move.startup) this.scene.spawnProjectile(this, this.move.projectile);
          // Super: LIGHT + HEAVY together. Also cancels any ground attack that connected.
          const confirmed = this.moveHasHit && !this.attackAirborne && this.stateTime >= this.move.startup;
          if (canAct && !this.attackAirborne && (this.stateTime <= 3 || confirmed) && this.wantsLastStand(input)) { this.startLastStand(); break; }
          if (canAct && !this.attackAirborne && (this.stateTime <= 3 || confirmed) && this.wantsSuper(input)) { this.startSuper(); break; }
          // Command special cancel: a ground attack that connected -> DOWN, FORWARD/BACK + attack.
          if (canAct && confirmed && this.def.commands) { const cmd = this.commandPressed(input); if (cmd) { this.startCommand(cmd); break; } }
          // EX special: THROW during a ground attack that connected (1 bar).
          if (canAct && confirmed && this.meter >= RF.CONFIG.EX_COST && (input.pressed('throw') || input.pressed('ex'))) { input.consume('throw'); input.consume('ex'); this.startEX(); break; }
          // Heavy that connected + UP + HEAVY: cancel into the launcher (great after a wall bounce).
          if (canAct && confirmed && this.moveKind === 'heavy' && this.chain < RF.CONFIG.MAX_CHAIN + 1 && input.held('up') && input.pressed('heavy')) {
            input.consume('heavy'); this.startAttack('launcher', true); break;
          }
          // Launcher connected + UP held: jump after them for an air combo.
          if (canAct && this.move.launcher && this.moveHasHit && input.held('up')) { this.launchJump(opp); break; }
          if (canAct && this.canCancel()) {
            // Combo: a light attack that connected can be cancelled straight into the next attack.
            const down = input.held('down'), up = input.held('up');
            if (this.attackAirborne) {
              if (input.pressed('light')) { input.consume('light'); this.startAttack('airLight', true); break; }
              if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack('airHeavy', true); break; }
            } else {
              if (input.pressed('light')) { input.consume('light'); this.startAttack(down ? 'lowLight' : 'light', true); break; }
              if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack(down ? 'lowHeavy' : up ? 'launcher' : 'heavy', true); break; }
            }
          }
          if (this.stateTime >= this.move.total) this.setState(this.grounded ? 'idle' : 'jump');
          break;
        case 'special':
          this.specialKind.update(this, this.scene);
          break;
        case 'throwReach': // arms out, trying to grab
          if (this.stateTime === RF.CONFIG.THROW_STARTUP) this.scene.tryGrab(this);
          else if (this.stateTime >= RF.CONFIG.THROW_STARTUP + RF.CONFIG.THROW_WHIFF) this.setState('idle');
          break;
        case 'throwing':
          if (this.victim && this.victim.state === 'thrown') {
            if (this.throwKind.update(this, this.victim, this.stateTime, this.scene)) this.endThrow();
          } else if (--this.throwRecover <= 0) {
            this.endThrow(); // victim already flung (or broke free): finish the follow-through
          }
          break;
        case 'thrown':
          // Quick reflexes: press THROW right after being grabbed to break free.
          if (this.stateTime <= RF.CONFIG.THROW_BREAK_WINDOW && input.pressed('throw')) {
            input.consume('throw');
            this.scene.breakThrow(this.grabber, this);
          } else if (!this.grabber || this.grabber.state !== 'throwing') {
            this.grabber = null;
            this.setState('idle');
          }
          break;
        case 'hitstun':
          // COMBO BREAKER: LIGHT + HEAVY while being comboed (2 bars).
          if (canAct && this.combo >= 2 && this.meter >= RF.CONFIG.BREAKER_COST && this.lhPressed(input)) { this.scene.comboBreaker(this); break; }
          if (--this.stun <= 0 && this.grounded) this.setState('idle');
          break;
        case 'blockstun':
          if (--this.stun <= 0 && this.grounded) this.setState('idle');
          break;
        case 'taunt':
          if (this.stateTime === 50) { this.gainMeter(25); if (this.scene && this.scene.isHuman(this)) RF.records.count('taunt'); }
          if (this.stateTime >= 56) this.setState('idle');
          break;
        case 'knockdown': // on the floor; BLOCK right as you land = quick-rise
          this.vx *= 0.8;
          if (this.stateTime <= RF.CONFIG.TECH_WINDOW && this.scene && this.scene.phase === 'fight' && input.pressed('block')) { input.consume('block'); this.tech(); break; }
          if (this.stateTime >= RF.CONFIG.KNOCKDOWN_TIME) { this.state = null; this.setState('wakeup'); }
          break;
        case 'wakeup':
          if (this.stateTime >= RF.CONFIG.WAKEUP_TIME) { this.pushVx = 0; this.setState('idle'); }
          break;
        case 'dazed':
          this.vx *= 0.8;
          break;
        // 'ko', 'victory', 'finishing' and 'finished' have no control
      }
      this.physics(bounds);
    }

    // Perfect-block bookkeeping: how long ago block was pressed, and whether
    // that press counts (mashing block faster than the cooldown doesn't).
    trackBlockPress(input) {
      const lp = input.lastPress('block');
      if (lp !== this.lastBlockPress) {
        this.blockPressEligible = lp - this.lastBlockPress >= RF.CONFIG.PERFECT_BLOCK_COOLDOWN;
        this.lastBlockPress = lp;
      }
      this.blockPressAge = input.kb.frame - lp;
    }

    // ---- command specials: DOWN, FORWARD + attack / DOWN, BACK + attack ----
    trackMotion(input) {
      const h = ((input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0)) * this.facing;
      const v = input.held('down') ? -1 : input.held('up') ? 1 : 0;
      this.motion.push(v < 0 ? (h > 0 ? 3 : h < 0 ? 1 : 2) : v > 0 ? (h > 0 ? 9 : h < 0 ? 7 : 8) : (h > 0 ? 6 : h < 0 ? 4 : 5));
      if (this.motion.length > 28) this.motion.shift();
    }

    // Did the stick do a command motion ending in FORWARD (6) or BACK (4), recently? Lenient:
    //  - quarter circle: any DOWN-ish position, then FORWARD - or just DOWN then DOWN-FORWARD;
    //  - arcade tap: BACK, FORWARD (or FORWARD, BACK) as two quick taps.
    motionDone(end) {
      const m = this.motion, n = m.length, diag = end === 6 ? 3 : 1, opp = end === 6 ? 4 : 6;
      const isDown = (d) => d === 1 || d === 2 || d === 3;
      for (let k = n - 1; k >= 0 && n - 1 - k <= 10; k--) {
        if (m[k] === end) {
          for (let j = k - 1; j >= Math.max(0, k - 20); j--) if (isDown(m[j])) return true;
        } else if (m[k] === diag && n - 1 - k <= 6) {
          // DOWN-FORWARD counts as the end if the stick went neutral -> DOWN -> DOWN-FORWARD quickly
          // (crouching for a while and drifting forward doesn't count).
          let j = k - 1, run = 0;
          while (j >= 0 && m[j] === diag) j--;
          while (j >= 0 && isDown(m[j]) && m[j] !== diag) { run++; j--; }
          if (run > 0 && run <= 12 && j >= 0) return true;
          break;
        }
      }
      // Arcade-style tap: a short BACK tap right before FORWARD (or the reverse). The first tap
      // must be short (not a long walk) so walking around and attacking never fires one.
      let k = n - 1;
      while (k >= 0 && n - 1 - k <= 6 && m[k] !== end) k--;
      if (k < 0 || n - 1 - k > 6) return false;
      while (k > 0 && m[k - 1] === end) k--;           // start of the final FORWARD
      let j = k - 1;
      while (j >= 0 && k - j <= 3 && m[j] === 5) j--;   // a frame or two of neutral is fine
      if (j < 0 || (m[j] !== opp && m[j] !== opp + 3 && m[j] !== opp - 3)) return false;
      let len = 0;
      while (j >= 0 && (m[j] === opp || m[j] === opp + 3 || m[j] === opp - 3)) { len++; j--; }
      return len <= 10 && (j < 0 || m[j] !== opp);
    }

    // Which command special (if any) was just performed: 'qcf' or 'qcb'.
    commandPressed(input) {
      const cmds = this.def.commands;
      if (!cmds) return null;
      for (const slot of ['qcf', 'qcb']) if (input.pressed('cmd' + slot)) { input.consume('cmd' + slot); return slot; } // the CPU
      const btn = input.pressed('light') || input.pressed('heavy');
      if (!btn) return null;
      const slot = this.motionDone(6) ? 'qcf' : this.motionDone(4) ? 'qcb' : null;
      if (slot) { input.consume('light'); input.consume('heavy'); }
      return slot;
    }

    startCommand(slot) {
      const cfg = RF.COMMANDS[this.def.commands[slot]];
      if (!cfg) return;
      this.motion.length = 0;
      this.startSpecial(cfg);
      if (this.scene && cfg.kind !== 'counter') this.scene.effects.spawnText(cfg.name.toUpperCase() + '!', this.x, this.body.height + 12, cfg.color || '#ffd030'); // counters show their own callout
    }

    // ---- taunt: a pose and a line; finish it for a little meter, but you're wide open ----
    startTaunt() {
      this.vx = 0; this.move = null;
      this.state = null; this.setState('taunt');
      const jokes = this.def.jokes, opp = this.scene && this.scene.opponentOf(this);
      const many = opp && this.def.rivalTaunts && this.def.rivalTaunts[opp.def.id]; // a whole set of lines for one rival (Trump vs Jauregui)
      const rival = many ? many[Math.floor(Math.random() * many.length)] : opp && this.def.rivalTaunt && this.def.rivalTaunt[opp.def.id]; // special lines for a rival (Bro Batch!)
      const live = this.scene && this.scene.phase === 'fight';
      // STRICT (Ms. Brady): taunting in front of her gets you written up - she takes your meter.
      if (live && opp && opp.def.strict) {
        const n = Math.min(this.meter, 20); this.meter -= n; opp.gainMeter(10);
        this.scene.effects.spawnText('WRITTEN UP!', this.x, this.body.height + 34, '#ff4040');
        RF.audio.sfx('paper');
      }
      // THE ADMINISTRATION (King Sirven): taunting with 1 bar radios Ms. Brady, who charges in.
      const help = this.def.assistTaunt;
      if (live && help && opp && opp.def.id !== help.actor && this.meter >= RF.CONFIG.EX_COST && RF.spawnAssist) {
        this.meter -= RF.CONFIG.EX_COST;
        RF.spawnAssist(this.scene, this, help.actor, help);
        this.scene.effects.spawnText(help.call, this.x, this.body.height + 26, '#ffd040');
        RF.audio.sfx('pa');
        this.stateTime = 51; // a quick call: no taunt meter, and he's back to work sooner
        return;
      }
      // Gabriel: taunting with 2 bars turns him into his alter ego, MR. SUPPLIER.
      if (this.def.alterEgo && !this.alterT && this.meter >= 200 && this.scene && this.scene.phase === 'fight') {
        this.meter -= 200;
        this.alterT = this.def.alterEgo.frames;
        this.scene.effects.spawnText(this.def.alterEgo.name + '!', this.x, this.body.height + 26, '#ffd040');
        this.scene.flash = 6; this.scene.shake = Math.max(this.scene.shake, 6);
        RF.audio.sfx('super');
        if (RF.announcer) RF.announcer.say(this.def.alterEgo.name + '!', { rate: 1.05 });
        if (this.scene) this.scene.effects.spawnText(this.def.alterEgo.line, this.x, this.body.height + 14, '#ffffff');
        return;
      }
      const pool = jokes || this.def.tauntLines; // a random line each time (Tamayo's jokes, Tyler's chill lines)
      const line = rival || (pool ? pool[Math.floor(Math.random() * pool.length)] : this.def.taunt || 'COME ON!');
      if (jokes) { RF.audio.sfx('laugh'); this.scene && this.scene.effects.spawnText('HA HA HA!', this.x, this.body.height + 26, '#ff9a40'); }
      if (this.scene) this.scene.effects.spawnText(line, this.x, this.body.height + 14, '#ffffff');
      if (RF.speakAs) RF.speakAs(this.def, line, { interrupt: false }); // each fighter's own voice (story-scene.js)
      else if (RF.announcer) RF.announcer.say(line, { interrupt: false, rate: 1.05, pitch: this.def.voicePitch || 0.9 });
    }

    // Double-tap forward/back to dash. Remembers when each direction was last pressed.
    trackDash(input) {
      for (const d of ['left', 'right']) {
        const lp = input.lastPress(d);
        if (lp === this.dirSeen[d]) continue;
        if (d in this.dirSeen && lp - this.dirSeen[d] <= RF.CONFIG.DASH_WINDOW) this.dashReq = { dir: d === 'right' ? 1 : -1, at: input.kb.frame };
        this.dirSeen[d] = lp;
      }
    }

    startDash(dir) {
      this.dashReq = null;
      this.dashDir = dir;
      this.state = null;
      this.setState('dash');
      this.vx = dir * (dir === this.facing ? 7.5 : 6) * (this.def.dashBoost || 1);
      RF.audio.sfx('whoosh');
      if (this.scene) this.scene.effects.spawn('dust', this.x - dir * 8, 1);
    }

    // Both attack buttons pressed (nearly) together, with a full meter.
    wantsSuper(input) {
      return this.meter >= RF.CONFIG.SUPER_MAX && !!this.scene && this.lhPressed(input);
    }

    lhPressed(input) {
      const now = input.kb.frame, l = input.lastPress('light'), h = input.lastPress('heavy'), w = RF.CONFIG.SUPER_INPUT_WINDOW;
      const ok = now - l <= w && now - h <= w && Math.abs(l - h) <= w && Math.min(l, h) > this.lastSuperAt;
      if (ok) { this.lastSuperAt = Math.max(l, h); input.consume('light'); input.consume('heavy'); } // don't also fire a normal attack
      return ok;
    }

    // EX special: spend a bar to fire your special on demand.
    startEX() {
      this.meter -= RF.CONFIG.EX_COST;
      this.startSpecial();
      this.exActive = true;
      this.scene.flash = Math.max(this.scene.flash, 3);
      this.scene.effects.spawnText('EX ' + this.special.name.toUpperCase() + '!', this.x, this.body.height + 14, '#60e0ff');
      RF.audio.sfx('perfect');
    }

    // Quick-rise off the floor with a little roll back.
    tech() {
      this.state = null;
      this.setState('wakeup');
      this.stateTime = Math.floor(RF.CONFIG.WAKEUP_TIME / 2);
      this.pushVx = -this.facing * 3;
      if (this.scene) this.scene.effects.spawnText('TECH!', this.x, this.body.height * 0.5, '#8ff0ff');
      RF.audio.sfx('whoosh');
    }

    startSuper() {
      this.lastSuperAt = this.scene.game.kb.frame;
      this.meter -= RF.CONFIG.SUPER_MAX;
      this.startSpecial();
      this.superActive = true;
      this.scene.startSuperFreeze(this);
    }

    // MIKEY SMASH (Mikey): a full rage meter turns him huge and green for a few seconds.
    addRage(n) {
      if (!this.def.hulk || this.hulkT > 0 || !this.scene || this.scene.phase !== 'fight' || this.health <= 0) return;
      this.rageMeter = Math.min(100, this.rageMeter + n);
      if (this.rageMeter < 100) return;
      this.rageMeter = 0;
      this.hulkT = this.def.hulk.frames;
      this.scene.effects.spawnText('MIKEY SMASH!', this.x, this.body.height + 30, '#60ff60');
      this.scene.shake = Math.max(this.scene.shake, 12); this.scene.flash = 4;
      RF.audio.sfx('roar'); RF.audio.sfx('boom');
      if (RF.announcer) RF.announcer.say('MIKEY SMASH!', { rate: 0.9, pitch: 0.5 });
    }

    // RAGE: a comeback boost at low health (more damage, faster meter).
    get raging() {
      return this.health > 0 && this.health <= this.maxHealth * RF.CONFIG.RAGE_HEALTH && !!this.scene && this.scene.phase === 'fight';
    }

    gainMeter(n) {
      if (this.raging) n *= RF.CONFIG.RAGE_METER;
      if (!this.scene || this.scene.phase !== 'fight' || this.superActive) return;
      const was = this.meter;
      this.meter = Math.min(RF.CONFIG.SUPER_MAX, this.meter + n * (RF.CONFIG.METER_RATE || 1) * ((RF.CONFIG.METER_GAIN || {})[this.def.archetype] || 1) * (this.def.meterRate || 1));
      if (was < RF.CONFIG.SUPER_MAX && this.meter >= RF.CONFIG.SUPER_MAX) {
        this.scene.effects.spawnText('SUPER READY!', this.x, this.body.height + 24, '#ffd030');
        RF.audio.sfx('ready');
      }
    }

    doJump(input) {
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      this.jumpPressAt = input.lastPress('up');
      this.hopCheck = input instanceof RF.PlayerInput && !RF.CONFIG.MOD_LOWGRAV; // the CPU always does full jumps
      this.doubleJumped = false;
      this.wallJumps = 0;
      this.state = null;
      this.setState('jump');
      this.vy = this.stats.jumpPower * (RF.CONFIG.MOD_LOWGRAV ? 0.72 : 1); // same height, twice the hang time
      if (this.def.jetpack) RF.audio.sfx('jet');
      this.vx = dir * Math.max(this.stats.walkSpeed * RF.CONFIG.JUMP_FORWARD_FACTOR, RF.CONFIG.JUMP_MIN_SPEED);
      this.airAttackUsed = false;
    }

    // Jump after a launched opponent.
    launchJump(opp) {
      this.hopCheck = false;
      this.state = null;
      this.setState('jump');
      this.airCombo = true;
      this.vy = RF.CONFIG.LAUNCH_JUMP;
      this.vx = clamp((opp.x - this.x) / 14, -4, 4);
      this.airAttackUsed = false;
      this.chain = 0;
      RF.audio.sfx('whoosh');
      if (this.scene) this.scene.effects.spawn('dust', this.x, 1);
    }

    isPerfectBlockAgainst(attacker, move) {
      return this.state === 'block' && this.isBlockingAgainst(attacker, move) &&
        this.blockPressEligible && this.blockPressAge <= RF.CONFIG.PERFECT_BLOCK_WINDOW;
    }

    startSpecial(cfg) {
      this.move = null;
      this.special = cfg || this.baseSpecial;
      this.specialKind = RF.SPECIAL_KINDS[this.special.kind];
      this.specialData = {};
      this.faceOpponent(this.scene.opponentOf(this));
      this.state = null;
      this.setState('special');
      this.specialKind.start(this, this.scene);
    }

    // Knocked off balance by an opponent's perfect block.
    stagger(frames) {
      this.combo = 0;
      this.move = null;
      this.vx = 0;
      this.stun = frames;
      this.state = null;
      this.setState('hitstun');
    }

    // LAST STAND: once a match, below 30% health - EX + HEAVY together (PS5: L2 + R2).
    lastStandReady() { return !this.lastStandUsed && this.health > 0 && this.health / this.maxHealth < RF.CONFIG.RAGE_HEALTH && this.scene && this.scene.phase === 'fight'; }
    wantsLastStand(input) {
      if (!this.lastStandReady()) return false;
      if (input.pressed('cmdLastStand')) { input.consume('cmdLastStand'); return true; } // the CPU
      const w = 6;
      if (input.pressed('ex', w) && (input.pressed('heavy', w) || input.held('heavy'))) { input.consume('ex'); input.consume('heavy'); input.consume('light'); return true; }
      return false;
    }
    startLastStand() {
      this.lastStandTry = true;
      this.startSpecial(RF.LAST_STAND);
      this.scene.startLastStand(this);
    }

    groundControl(input, opp) {
      this.faceOpponent(opp);
      const down = input.held('down'), up = input.held('up');
      if (this.wantsLastStand(input)) return this.startLastStand();
      // EX pressed while LAST STAND is ready: wait a couple of frames for HEAVY (L2 + R2 together)
      if (this.lastStandReady() && input.pressed('ex', 2) && input instanceof RF.PlayerInput) return;
      if (this.wantsSuper(input)) return this.startSuper();
      const cmd = this.commandPressed(input);
      if (cmd) return this.startCommand(cmd);
      if (input.pressed('taunt')) { input.consume('taunt'); if (this.scene && this.scene.tag && RF.tagRequest(this.scene, this, input)) return; return this.startTaunt(); }
      if (down && this.meter >= RF.CONFIG.EX_COST && input.pressed('throw')) { input.consume('throw'); return this.startEX(); } // DOWN + THROW = EX special
      if (input.pressed('ex')) { // EX button (L2): one press, no motion needed
        input.consume('ex');
        if (this.meter >= RF.CONFIG.EX_COST) return this.startEX();
      }
      if (this.throwCfg && input.pressed('throw')) { input.consume('throw'); return this.startThrow(); }
      if (input.pressed('light')) { input.consume('light'); return this.startAttack(down ? 'lowLight' : 'light'); }
      if (input.pressed('heavy')) { input.consume('heavy'); return this.startAttack(down ? 'lowHeavy' : up ? 'launcher' : 'heavy'); }
      const dr = this.dashReq;
      if (dr && input.kb.frame - dr.at <= 2 && !down) return this.startDash(dr.dir);
      if (input.pressed('dash')) { // dash button (R1): forward, or a backdash while holding back
        input.consume('dash');
        const back = input.held(this.facing > 0 ? 'left' : 'right');
        return this.startDash(back ? -this.facing : this.facing);
      }
      if (input.held('block')) {
        this.setState('block');
        this.crouching = down; // down + block = crouch block (stops lows, not jump-ins)
        this.vx = 0;
        return;
      }
      if (down) {
        this.setState('crouch');
        this.crouching = true;
        this.vx = 0;
        return;
      }
      this.crouching = false;
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      if (up) {
        this.setState('jumpSquat'); // UP + HEAVY during these frames = launcher
        this.vx = 0;
        return;
      }
      if (dir) {
        const forward = dir === this.facing;
        this.setState('walk');
        this.vx = dir * this.stats.walkSpeed * (forward ? 1 : RF.CONFIG.BACKWALK_FACTOR) * (this.alterT > 0 ? this.def.alterEgo.speed : 1) * (this.hulkT > 0 ? 1.15 : 1);
        this.walkTime += forward ? 1 : -1;
        // Sprinters (Nicholas) kick up dust as they run.
        if (this.def.sprint && this.scene && Math.abs(this.walkTime) % 5 === 1) this.scene.effects.spawn('dust', this.x - dir * 10, 1);
        // Heavy footsteps (Mr. Dabalsa): every other step shakes the floor.
        const stepLen = Math.round(16 / this.stats.walkSpeed) * 2;
        if (this.def.stomp && this.scene && Math.abs(this.walkTime) % stepLen === 1) {
          this.scene.shake = Math.max(this.scene.shake, this.def.stomp);
          this.scene.effects.spawn('dust', this.x + this.facing * 8, 1);
          RF.audio.sfx('stomp');
        }
      } else {
        this.setState('idle');
        this.vx = 0;
      }
    }

    canCancel() {
      return this.move.cancel && this.moveHasHit &&
        this.chain < (this.attackAirborne ? RF.CONFIG.MAX_AIR_CHAIN : this.def.maxChain || RF.CONFIG.MAX_CHAIN) && this.stateTime >= this.move.startup;
    }

    startAttack(kind, chained = false) {
      // A full power meter turns the next heavy into the MAX GAINS punch.
      if (kind === 'heavy' && this.moves.powerPunch && this.power >= 100) {
        kind = 'powerPunch'; this.power = 0;
        if (this.scene) { this.scene.effects.spawnText('MAX GAINS!', this.x, this.body.height + 18, '#ffd030'); this.scene.flash = 3; }
        RF.audio.sfx('super');
      }
      this.chain = chained ? this.chain + 1 : 0;
      this.string = chained ? [...(this.string || []), kind] : [kind]; // the kombo string so far
      this.enderShown = false;
      // Chained attacks step forward a little, so strings stay in range (like arcade kombos).
      if (chained && this.grounded && !/^air/.test(kind)) this.pushVx = this.facing * 1.7;
      this.armorUsed = false;
      this.fxHitDist = null;
      this.move = this.moves[kind];
      this.moveKind = kind;
      this.moveHasHit = false;
      this.attackAirborne = !this.grounded;
      if (this.attackAirborne) this.airAttackUsed = true;
      else this.vx = 0;
      this.state = null; // force a fresh state even when chaining attacks
      this.setState('attack');
      RF.audio.sfx('whoosh');
      this.crouching = !!this.move.crouch;
    }

    // ---- throws ----

    startThrow() {
      this.vx = 0;
      this.move = null;
      this.state = null;
      this.setState('throwReach');
      RF.audio.sfx('whoosh');
    }

    // Called by the scene when a grab connects.
    beginThrowing(victim) {
      this.victim = victim;
      this.throwRecover = 14;
      this.vx = 0;
      this.state = null;
      this.setState('throwing');
      victim.grabber = this;
      victim.vx = victim.vy = victim.pushVx = 0;
      victim.y = 0;
      victim.move = null;
      victim.thrownPose = ['hit', 0];
      victim.state = null;
      victim.setState('thrown');
    }

    endThrow() {
      if (this.victim && this.victim.state === 'thrown') this.victim.releaseFromThrow();
      this.victim = null;
      this.setState('idle');
    }

    // Let go of a thrown fighter, optionally flinging them.
    releaseFromThrow(fling) {
      this.grabber = null;
      this.hidden = false; // some throws draw the victim themselves
      this.state = null;
      if (this.health <= 0) return this.knockOut(fling ? Math.sign(fling.vx) || 1 : 1);
      this.stun = 22;
      this.setState('hitstun');
      if (fling) { this.vx = fling.vx; this.vy = fling.vy; if (fling.vy > 0) this.juggle = 1; } // thrown through the air = knockdown
    }

    physics(bounds) {
      // Thrown fighters are moved by the thrower; finishers move both fighters themselves.
      if (this.state === 'thrown' || this.state === 'finishing' || this.state === 'finished') { this.clampTo(bounds); return; }
      if (!this.grounded || this.vy > 0) {
        // A jetpack (El Escobedo) means lighter gravity for the whole jump: more airtime.
        const jet = this.def.jetpack && !this.airCombo && (this.state === 'jump' || (this.state === 'attack' && this.attackAirborne));
        const juggled = this.state === 'hitstun' && this.juggle > 0;
        const floaty = this.def.airGravity && (this.state === 'jump' || (this.state === 'attack' && this.attackAirborne));
        this.vy -= (jet ? this.def.jetpack.gravity : juggled ? RF.CONFIG.JUGGLE_GRAVITY : floaty ? this.def.airGravity : RF.CONFIG.GRAVITY) * (RF.CONFIG.MOD_LOWGRAV ? 0.5 : 1);
        if (jet && this.scene && this.stateTime % 5 === 0) this.scene.effects.spawn('dust', this.x - this.facing * 10, this.y + 34);
        this.y += this.vy;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          this.land();
        }
      }
      if (this.grounded && ['hitstun', 'blockstun', 'ko', 'knockdown', 'wakeup'].includes(this.state)) {
        this.vx *= 0.8;
      }
      this.x += this.vx + this.pushVx;
      this.pushVx *= 0.8;
      if (Math.abs(this.pushVx) < 0.05) this.pushVx = 0;
      this.clampTo(bounds);
    }

    land() {
      if (this.state === 'jump' || (this.state === 'attack' && this.attackAirborne)) {
        this.setState('idle');
        this.vx = 0;
        if (this.scene) this.scene.effects.spawn('dust', this.x, 1);
      } else if (this.state === 'hitstun' && this.spiked && !this.bounced) {
        // Spiked into the floor: bounce back up, still hittable.
        this.bounced = true;
        this.vy = 5.2;
        this.vx *= 0.5;
        this.stun = Math.max(this.stun, 26);
        if (this.scene) {
          this.scene.shake = Math.max(this.scene.shake, 8);
          this.scene.effects.spawn('dust', this.x - 8, 1); this.scene.effects.spawn('dust', this.x + 8, 1);
          this.scene.effects.spawnText('BOUNCE!', this.x, 30, '#ffb060');
          this.scene.trialEvent && this.scene.trialEvent('bounce');
          RF.audio.sfx('boom');
        }
      } else if (this.state === 'hitstun' && this.juggle > 0) {
        // Knocked down: hit the floor and lie there (BLOCK to quick-rise).
        this.vx *= 0.3;
        this.state = null;
        this.setState('knockdown');
        if (this.scene) { this.scene.effects.spawn('dust', this.x - 6, 1); this.scene.effects.spawn('dust', this.x + 6, 1); this.scene.shake = Math.max(this.scene.shake, 3); }
        RF.audio.sfx('stomp');
      } else if (this.state === 'hitstun') {
        this.vx = 0;
        if (this.scene) this.scene.effects.spawn('dust', this.x, 1);
      } else if (this.state === 'special' && this.specialKind.onLand) {
        this.specialKind.onLand(this, this.scene);
      }
    }

    clampTo(bounds) {
      const half = this.body.width / 2;
      this.x = clamp(this.x, bounds.left + half, bounds.right - half);
    }

    atWall(bounds) {
      const half = this.body.width / 2;
      return this.x <= bounds.left + half + 1 || this.x >= bounds.right - half - 1;
    }

    // ---- combat ----

    attackPhase() {
      if (this.state !== 'attack') return null;
      const t = this.stateTime, m = this.move;
      if (t < m.startup) return 'startup';
      if (t < m.startup + m.active) return 'active';
      return 'recovery';
    }

    getHitbox() {
      if (this.attackPhase() !== 'active' || this.moveHasHit) return null;
      const h = this.move.hitbox;
      return {
        x: this.facing > 0 ? this.x + h.x : this.x - h.x - h.w,
        y: this.y + h.y, w: h.w, h: h.h,
      };
    }

    getHurtbox() {
      if (this.isKO || ['thrown', 'finishing', 'finished'].includes(this.state)) return null;
      // Too many hits in the air: they fall out of the combo (no infinite juggles).
      if (this.state === 'hitstun' && !this.grounded && this.juggle >= RF.CONFIG.JUGGLE_LIMIT) return null;
      if (this.state === 'knockdown' || this.state === 'wakeup') return null; // on the floor / getting up
      if (this.hidden) return null; // mid-teleport
      if (this.state === 'special' && this.special.invuln && this.stateTime < this.special.invuln) return null; // invincible start (anti-airs)
      // Backdash: briefly untouchable as you slip away.
      if (this.state === 'dash' && this.dashDir !== this.facing && this.stateTime <= 6) return null;
      const crouchH = this.body.crouchHeight || RF.CONFIG.CROUCH_HEIGHT;
      const h = this.crouching && this.grounded ? this.body.height * crouchH : this.body.height;
      return { x: this.x - this.body.width / 2, y: this.y, w: this.body.width, h };
    }

    // 'low' attacks need a crouch block; jump-ins ('overhead') need a standing one.
    static attackLevel(attacker, move) {
      if (move.level) return move.level;
      return attacker.state === 'attack' && attacker.attackAirborne ? 'overhead' : 'mid';
    }

    // Tamayo's UNBOTHERED: standing still with his arms crossed he auto-blocks (not lows).
    unbothered() { return this.def.unbothered && this.state === 'idle' && this.stateTime >= this.def.unbothered && this.grounded; }

    isBlockingAgainst(attacker, move) {
      const auto = this.unbothered() && Fighter.attackLevel(attacker, move) !== 'low';
      if (!auto && !((this.state === 'block' || this.state === 'blockstun') && this.grounded)) return false;
      if (this.facing !== (sign(attacker.x - this.x) || this.facing)) return false;
      const level = Fighter.attackLevel(attacker, move);
      if (level === 'low' && !this.crouching) return false;
      if (level === 'overhead' && this.crouching) return false;
      return true;
    }

    // Caught while starting an attack, a grab, a taunt or a special: a hit now is a COUNTER.
    inCounterState() {
      return (this.state === 'attack' && this.attackPhase() === 'startup') || this.state === 'throwReach' || this.state === 'taunt' ||
        (this.state === 'special' && this.stateTime < 8 && !(this.special && this.special.lastStand));
    }

    // Returns true if the hit was blocked.
    receiveHit(attacker, move) {
      const dir = sign(this.x - attacker.x) || attacker.facing;
      const blocked = this.isBlockingAgainst(attacker, move);
      const wasStunned = this.state === 'hitstun';
      // Hit during the start-up of your own attack or grab: COUNTER!
      // Tank armor: big fighters shrug off ONE hit while winding up / swinging a heavy.
      if (!blocked && (((this.def.archetype === 'tank' || this.def.armor) && this.moveKind === 'heavy') || this.hulkT > 0) && this.state === 'attack' && !this.armorUsed && this.attackPhase() !== 'recovery') {
        this.armorUsed = true;
        this.health = Math.max(0, this.health - move.damage * 0.6 * (1 - this.stats.damageReduction));
        this.flash = 3;
        if (this.scene) { this.scene.effects.spawnText('ARMOR!', this.x, this.body.height + 10, '#c0c8d0'); RF.audio.sfx('clang'); }
        if (this.health <= 0) this.knockOut(dir);
        this.counterHit = false;
        return false;
      }
      this.counterHit = !blocked && this.inCounterState();
      const airborne = !this.grounded;
      let dmg = move.damage * (1 - this.stats.damageReduction) * (RF.CONFIG.MOD_TRIPLE ? 3 : 1);
      if (this.counterHit) dmg *= RF.CONFIG.COUNTER_DAMAGE;
      if (attacker && attacker.raging) dmg *= RF.CONFIG.RAGE_DAMAGE;
      if (attacker && attacker.alterT > 0) dmg *= attacker.def.alterEgo.damage; // MR. SUPPLIER hits harder
      if (attacker && attacker.hulkT > 0) dmg *= attacker.def.hulk.damage; // MIKEY SMASH
      if (attacker && attacker.def.crescendo && !blocked) dmg *= 1 + Math.min(attacker.def.crescendo.max, this.combo * attacker.def.crescendo.step); // Wuttke: each hit of a combo louder
      if (blocked) {
        dmg *= this.def.noChip ? 0 : RF.CONFIG.CHIP_DAMAGE; // Chris's bodyguard takes the chip
        if (this.def.blockHeal) this.health = Math.min(this.maxHealth, this.health + this.def.blockHeal); // Ruano's GRACE
        this.shieldHit = 12;
        this.stun = Math.max(1, Math.round(move.blockstun * (this.def.blockstunScale || 1))); // Simon's checks recover fast
        this.state = null;
        this.setState('blockstun');
        this.pushVx = dir * move.pushback * 0.8;
      } else {
        // Combo damage scaling: each extra hit before recovering does a bit less.
        this.combo = wasStunned ? this.combo + 1 : 1;
        const scaling = attacker.def.comboScaling != null ? attacker.def.comboScaling : RF.CONFIG.COMBO_SCALING; // Tamayo's combos barely scale
        dmg *= Math.max(RF.CONFIG.COMBO_MIN_SCALE, 1 - scaling * (this.combo - 1));
        this.flash = 4;
        this.stun = move.hitstun + (this.counterHit ? 18 : 0); // counter hits stun long enough to combo after
        this.state = null;
        this.setState('hitstun');
        this.hitPop = 8;       // recoil (visual)
        if (airborne || move.launch) this.juggle++;
        const airAttacker = attacker.state === 'attack' && attacker.attackAirborne;
        this.pushVx = dir * (airborne && airAttacker ? move.pushback * 0.5 : move.knockback || move.pushback);
        if (move.pull) this.pushVx = -dir * move.pull; // dragged toward the attacker (Holbrook's Migration)
        if (airborne && airAttacker && /heavy/i.test(attacker.moveKind) && this.juggle > 1 && !this.bounced) {
          // Air heavy on a juggled opponent: spike them into the floor.
          this.spiked = true;
          this.vy = -7; this.vx = dir * 0.8;
        } else if (move.launch) { this.vy = move.launch; this.vx = dir * (move.launchVx != null ? move.launchVx : 2); }
        else if (airborne) { // a small pop, less the higher they already are (combos don't climb off-screen)
          this.vy = airAttacker ? (this.y > 85 ? 0.5 : 2.4) : 3;
          this.vx = dir * (airAttacker ? 0.6 : 1.5);
        }
      }
      // MULLIGAN (Tyler): the first clean hit he takes each round doesn't count. Do-over!
      if (!blocked && this.def.mulligan && !this.mulliganUsed && dmg > 0 && this.scene && this.scene.phase === 'fight') {
        this.mulliganUsed = true;
        dmg = 0;
        this.scene.effects.spawnText('MULLIGAN!', this.x, this.body.height + 22, '#80ffb0');
        RF.audio.sfx('perfect');
      }
      if (this.def.hulk) this.addRage(dmg * this.def.hulk.gain); // getting hit makes Mikey angry
      if (attacker && attacker.def.hulk && !blocked) attacker.addRage(dmg * attacker.def.hulk.gain * 0.35);
      this.health = Math.max(this.scene && this.scene.training ? 1 : 0, this.health - dmg); // training: nobody dies
      if (this.health <= 0) this.knockOut(dir);
      return blocked;
    }

    knockOut(dir) {
      // The match-deciding blow leaves them dazed instead: FINISH THEM!
      if (this.scene && this.scene.secondWind && this.scene.secondWind(this)) return; // the rift tower's last boss gets back up once
      if (this.scene && this.scene.tryDaze(this)) return;
      this.setState('ko');
      this.vy = 5;
      this.vx = dir * 2.5;
    }

    // ---- drawing ----

    animFrame() {
      switch (this.state) {
        case 'walk': return ['walk', (Math.abs(this.walkTime) / Math.round(16 / this.stats.walkSpeed)) % 4]; // fractional: in-between frames
        case 'jump': { const jp = this.stats.jumpPower || 10; return ['jump', Math.max(0, Math.min(1, (jp - this.vy) / (jp * 1.6)))]; }
        case 'jumpSquat': return ['crouch', 0];
        case 'knockdown': return ['ko', 1];
        case 'taunt': return ['victory', Math.min(1, (this.stateTime % 16) / 8)];
        case 'wakeup': return ['crouch', 0];
        case 'dash': return ['walk', (this.stateTime * 0.35) % 4];
        case 'attack': {
          // Wind-up holds, then snaps through to the hit; recovery eases back out.
          const m = this.move, t = this.stateTime, a = this.move.anim || this.moveKind;
          if (t < m.startup) { const u = t / Math.max(1, m.startup); return [a, u < 0.55 ? 0 : (u - 0.55) / 0.45]; }
          if (t < m.startup + m.active) return [a, 1];
          return [a, 1 + Math.min(1, ((t - m.startup - m.active) / Math.max(1, m.recovery)) * 1.8)];
        }
        case 'crouch': return ['crouch', 0];
        case 'block':
        case 'blockstun': return [this.crouching ? 'crouchBlock' : 'block', 0];
        case 'hitstun': { const r = this.stateTime / (this.stateTime + Math.max(1, this.stun)); return ['hit', this.grounded ? Math.max(0, (r - 0.45) / 0.55) : 0]; }
        case 'throwReach': return ['throw', 0];
        case 'throwing': return this.throwKind.anim(this, this.stateTime);
        case 'thrown': return this.thrownPose || ['hit', 0];
        case 'dazed': return Math.floor(this.stateTime / 18) % 2 ? ['hit', 0] : ['idle', 0];
        case 'finishing': return this.finisherAnim || ['idle', 0];
        case 'special': return this.specialKind.anim(this);
        case 'ko': return ['ko', this.grounded ? 1 : 0];
        case 'victory': { const c = this.stateTime % 30; return ['victory', c < 15 ? c / 15 : (30 - c) / 15]; }
        default: return ['idle', (this.stateTime / (this.def.idleRate || 20)) % (this.def.idleFrames || 2)]; // breathes smoothly
      }
    }

    // The body, with a short blend whenever the animation changes (idle -> punch, punch ->
    // idle, walk -> block...), so moves flow into each other. Hits and knockouts still snap.
    drawBody(ctx, anim, frame, x, y, tint) {
      const sp = this.sprite;
      if (!sp.poseAt) return sp.draw(ctx, anim, frame, x, y, this.facing, tint);
      const pose = sp.poseAt(anim, frame), now = this.scene ? this.scene.frame : 0;
      if (this.poseFrame !== now) { // once per game frame, however often we're drawn
        const prev = this.curPose;
        if (prev && prev.anim !== pose.anim && !SNAP.has(pose.anim) && !SNAP.has(prev.anim)) this.blend = { from: prev, start: now };
        this.curPose = pose; this.poseFrame = now;
      }
      const b = this.blend, BLEND = this.state === 'attack' ? 2 : 4; // attacks stay snappy
      if (b && now - b.start < BLEND && sp.drawBlend(ctx, b.from, pose, (now - b.start + 1) / (BLEND + 1), x, y, this.facing, tint)) return;
      sp.draw(ctx, anim, frame, x, y, this.facing, tint);
    }

    // Purely visual timers; run even during hit-stop.
    tickVisuals() {
      if (this.ollieT > 0) this.ollieT--;
      // Squash on landing, stretch on take-off, a recoil pop when hit (see draw).
      const air = this.y > 0.5;
      if (this.wasAir && !air && !['ko', 'knockdown', 'thrown', 'finished'].includes(this.state)) this.landT = 7;
      this.wasAir = air;
      if (this.landT > 0) this.landT--;
      if (this.hitPop > 0) this.hitPop--;
      if (this.flash > 0) this.flash--;
      if (this.shieldHit > 0) this.shieldHit--;
    }

    draw(ctx, floorY) {
      if (this.dismembered) return; // in pieces (a fatality) - the gore system draws them
      const [anim, frame] = this.animFrame();
      let x = this.x;
      if (this.state === 'dazed') x += Math.sin(this.stateTime / 9) * 2; // wobbling on their feet
      // Shudder while frozen in hit-stop, like a real impact.
      if (this.scene && this.scene.hitstop > 0 && this.state === 'hitstun') x += this.scene.frame % 2 ? 1.5 : -1.5;
      if (this.hidden) return; // e.g. inside a car during a finisher
      // Levitating fighters (Anthony) hover above the floor, gently bobbing.
      const t0 = this.scene ? this.scene.frame : 0;
      this.lift = this.def.hover && !['ko', 'knockdown', 'thrown', 'finished', 'dazed'].includes(this.state)
        ? Math.round(this.def.hover + Math.sin(t0 / 14) * (this.def.hoverBob || 0)) : 0;
      floorY -= this.lift;
      // Squash & stretch around the feet (purely visual).
      let sx = 1, sy = 1;
      if (this.landT > 0) { const k = this.landT / 7; sx = 1 + 0.07 * k; sy = 1 - 0.09 * k; }
      else if (this.state === 'jump' && this.vy > 2 && this.stateTime < 10) { sx = 0.95; sy = 1.06; }
      else if (this.state === 'jumpSquat') { sx = 1.06; sy = 0.92; }
      if (this.hitPop > 0) { const k = this.hitPop / 8; x -= this.facing * 2.5 * k; sx *= 1 - 0.04 * k; sy *= 1 + 0.03 * k; }
      ctx.save();
      if (sx !== 1 || sy !== 1) { const fy = floorY - this.y; ctx.translate(x, fy); ctx.scale(sx, sy); ctx.translate(-x, -fy); }
      const jetOn = this.def.jetpack && this.y > 0 && (this.state === 'jump' || (this.state === 'attack' && this.attackAirborne));
      if (jetOn) RF.MOVE_FX.jetpack(this, ctx, floorY, this.scene ? this.scene.frame : 0); // drawn behind him
      const aura = this.def.aura && RF.MOVE_FX[this.def.aura];
      if (aura) aura(this, ctx, floorY, this.scene ? this.scene.frame : 0, 'back');
      // Dash afterimages
      if (this.state === 'dash') {
        ctx.save();
        for (let i = 3; i >= 1; i--) {
          const p = this.trail[i * 3];
          if (!p) continue;
          ctx.globalAlpha = 0.09 * (4 - i);
          this.sprite.draw(ctx, anim, frame, p[0], floorY - p[1], this.facing, 'white');
        }
        ctx.restore();
      }
      if (this.superActive || this.exActive) RF.MOVE_FX.superAura(this, ctx, floorY, this.scene ? this.scene.frame : 0);
      if (this.raging && !this.hidden) { // RAGE: a pulsing red glow around them
        const ft = this.scene ? this.scene.frame : 0;
        ctx.save();
        ctx.globalAlpha = 0.22 + Math.sin(ft / 5) * 0.12;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, 2]]) this.sprite.draw(ctx, anim, frame, x + dx, floorY - this.y + dy, this.facing, '#ff2010');
        ctx.restore();
      }
      if (this.hulkT > 0) { // MIKEY SMASH: bigger, glowing green
        const fy = floorY - this.y, k = 1.15, ft = this.scene ? this.scene.frame : 0;
        ctx.save(); ctx.translate(x, fy); ctx.scale(k, k); ctx.translate(-x, -fy);
        ctx.globalAlpha = 0.35 + Math.sin(ft / 4) * 0.12;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) this.sprite.draw(ctx, anim, frame, x + dx, fy + dy, this.facing, '#30ff40');
        ctx.globalAlpha = 1;
        this.drawBody(ctx, anim, frame, x, fy, this.flash > 1 ? 'white' : null);
        ctx.globalAlpha = 0.28; this.sprite.draw(ctx, anim, frame, x, fy, this.facing, '#40c040'); ctx.globalAlpha = 1;
        ctx.restore();
      } else this.drawBody(ctx, anim, frame, x, floorY - this.y, this.flash > 1 ? 'white' : null);
      if (aura) aura(this, ctx, floorY, this.scene ? this.scene.frame : 0, 'front');
      if (this.def.rift && RF.MOVE_FX.riftAura) RF.MOVE_FX.riftAura(this, ctx, floorY, this.scene ? this.scene.frame : 0); // story mode: a rift variant
      const t = this.scene ? this.scene.frame : 0;
      if (this.state === 'attack' && this.move.fx) RF.MOVE_FX[this.move.fx](this, ctx, floorY, t);
      if ((this.state === 'block' || this.state === 'blockstun') && this.def.blockFx) RF.BLOCK_FX[this.def.blockFx](this, ctx, floorY, t);
      ctx.restore();
    }

    drawShadow(ctx, floorY) {
      if (this.hidden) return;
      const w = this.body.width * (1 - Math.min(0.5, this.y / 200));
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(Math.round(this.x), floorY + 1, w * 0.9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  RF.Fighter = Fighter;
})();
