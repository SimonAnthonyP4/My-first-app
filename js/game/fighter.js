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
      this.specialKind = RF.SPECIAL_KINDS[this.special.kind];
      this.throwCfg = RF.THROWS[def.throw];
      this.throwKind = this.throwCfg && RF.THROW_KINDS[this.throwCfg.kind];
      this.scene = null; // set by FightScene
      this.meter = 0;    // super meter (kept between rounds)
      this.lastSuperAt = -Infinity;
      this.reset(0, 1);
    }

    reset(x, facing) {
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
      if (state !== 'special') { this.superActive = false; this.exActive = false; }
      if (state !== 'jump' && state !== 'attack') this.airCombo = false;
    }

    get grounded() { return this.y <= 0; }
    get isKO() { return this.state === 'ko'; }

    faceOpponent(opp) {
      if (opp.x !== this.x) this.facing = sign(opp.x - this.x);
    }

    update(input, opp, canAct, bounds) {
      this.stateTime++;
      this.trackBlockPress(input);
      this.trackDash(input);
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
          // Double jump (agile fighters): press UP again in the air.
          if (canAct && this.def.doubleJump && !this.doubleJumped && this.stateTime > 4 && input.lastPress('up') > this.jumpPressAt && input.pressed('up')) {
            input.consume('up');
            this.doubleJumped = true;
            const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
            this.vy = Math.max(this.vy, 5.5); // a short extra hop (and a change of direction)
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
          if (canAct && !this.attackAirborne && (this.stateTime <= 3 || confirmed) && this.wantsSuper(input)) { this.startSuper(); break; }
          // EX special: THROW during a ground attack that connected (1 bar).
          if (canAct && confirmed && this.meter >= RF.CONFIG.EX_COST && input.pressed('throw')) { input.consume('throw'); this.startEX(); break; }
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

    gainMeter(n) {
      if (!this.scene || this.scene.phase !== 'fight' || this.superActive) return;
      const was = this.meter;
      this.meter = Math.min(RF.CONFIG.SUPER_MAX, this.meter + n * (RF.CONFIG.METER_RATE || 1) * ((RF.CONFIG.METER_GAIN || {})[this.def.archetype] || 1));
      if (was < RF.CONFIG.SUPER_MAX && this.meter >= RF.CONFIG.SUPER_MAX) {
        this.scene.effects.spawnText('SUPER READY!', this.x, this.body.height + 24, '#ffd030');
        RF.audio.sfx('ready');
      }
    }

    doJump(input) {
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      this.jumpPressAt = input.lastPress('up');
      this.doubleJumped = false;
      this.state = null;
      this.setState('jump');
      this.vy = this.stats.jumpPower;
      if (this.def.jetpack) RF.audio.sfx('jet');
      this.vx = dir * Math.max(this.stats.walkSpeed * RF.CONFIG.JUMP_FORWARD_FACTOR, RF.CONFIG.JUMP_MIN_SPEED);
      this.airAttackUsed = false;
    }

    // Jump after a launched opponent.
    launchJump(opp) {
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

    startSpecial() {
      this.move = null;
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

    groundControl(input, opp) {
      this.faceOpponent(opp);
      const down = input.held('down'), up = input.held('up');
      if (this.wantsSuper(input)) return this.startSuper();
      if (down && this.meter >= RF.CONFIG.EX_COST && input.pressed('throw')) { input.consume('throw'); return this.startEX(); } // DOWN + THROW = EX special
      if (this.throwCfg && input.pressed('throw')) { input.consume('throw'); return this.startThrow(); }
      if (input.pressed('light')) { input.consume('light'); return this.startAttack(down ? 'lowLight' : 'light'); }
      if (input.pressed('heavy')) { input.consume('heavy'); return this.startAttack(down ? 'lowHeavy' : up ? 'launcher' : 'heavy'); }
      const dr = this.dashReq;
      if (dr && input.kb.frame - dr.at <= 2 && !down) return this.startDash(dr.dir);
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
        this.vx = dir * this.stats.walkSpeed * (forward ? 1 : RF.CONFIG.BACKWALK_FACTOR);
        this.walkTime += forward ? 1 : -1;
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
      this.chain = chained ? this.chain + 1 : 0;
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
        this.vy -= jet ? this.def.jetpack.gravity : juggled ? RF.CONFIG.JUGGLE_GRAVITY : floaty ? this.def.airGravity : RF.CONFIG.GRAVITY;
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

    isBlockingAgainst(attacker, move) {
      if (!((this.state === 'block' || this.state === 'blockstun') && this.grounded)) return false;
      if (this.facing !== (sign(attacker.x - this.x) || this.facing)) return false;
      const level = Fighter.attackLevel(attacker, move);
      if (level === 'low' && !this.crouching) return false;
      if (level === 'overhead' && this.crouching) return false;
      return true;
    }

    // Returns true if the hit was blocked.
    receiveHit(attacker, move) {
      const dir = sign(this.x - attacker.x) || attacker.facing;
      const blocked = this.isBlockingAgainst(attacker, move);
      const wasStunned = this.state === 'hitstun';
      // Hit during the start-up of your own attack or grab: COUNTER!
      this.counterHit = !blocked && ((this.state === 'attack' && this.attackPhase() === 'startup') || this.state === 'throwReach' ||
        (this.state === 'special' && this.stateTime < 8));
      const airborne = !this.grounded;
      let dmg = move.damage * (1 - this.stats.damageReduction);
      if (this.counterHit) dmg *= RF.CONFIG.COUNTER_DAMAGE;
      if (blocked) {
        dmg *= RF.CONFIG.CHIP_DAMAGE;
        this.shieldHit = 12;
        this.stun = Math.max(1, Math.round(move.blockstun * (this.def.blockstunScale || 1))); // Simon's checks recover fast
        this.state = null;
        this.setState('blockstun');
        this.pushVx = dir * move.pushback * 0.8;
      } else {
        // Combo damage scaling: each extra hit before recovering does a bit less.
        this.combo = wasStunned ? this.combo + 1 : 1;
        dmg *= Math.max(RF.CONFIG.COMBO_MIN_SCALE, 1 - RF.CONFIG.COMBO_SCALING * (this.combo - 1));
        this.flash = 4;
        this.stun = move.hitstun + (this.counterHit ? 10 : 0);
        this.state = null;
        this.setState('hitstun');
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
      this.health = Math.max(this.scene && this.scene.training ? 1 : 0, this.health - dmg); // training: nobody dies
      if (this.health <= 0) this.knockOut(dir);
      return blocked;
    }

    knockOut(dir) {
      // The match-deciding blow leaves them dazed instead: FINISH THEM!
      if (this.scene && this.scene.tryDaze(this)) return;
      this.setState('ko');
      this.vy = 5;
      this.vx = dir * 2.5;
    }

    // ---- drawing ----

    animFrame() {
      switch (this.state) {
        case 'walk': return ['walk', Math.floor(Math.abs(this.walkTime) / Math.round(16 / this.stats.walkSpeed)) % 4];
        case 'jump': return ['jump', 0];
        case 'jumpSquat': return ['crouch', 0];
        case 'knockdown': return ['ko', 1];
        case 'wakeup': return ['crouch', 0];
        case 'dash': return ['walk', 1];
        case 'attack': {
          const ph = this.attackPhase();
          return [this.move.anim || this.moveKind, ph === 'startup' ? 0 : ph === 'active' ? 1 : 2];
        }
        case 'crouch': return ['crouch', 0];
        case 'block':
        case 'blockstun': return [this.crouching ? 'crouchBlock' : 'block', 0];
        case 'hitstun': return ['hit', 0];
        case 'throwReach': return ['throw', 0];
        case 'throwing': return this.throwKind.anim(this, this.stateTime);
        case 'thrown': return this.thrownPose || ['hit', 0];
        case 'dazed': return Math.floor(this.stateTime / 18) % 2 ? ['hit', 0] : ['idle', 0];
        case 'finishing': return this.finisherAnim || ['idle', 0];
        case 'special': return this.specialKind.anim(this);
        case 'ko': return ['ko', this.grounded ? 1 : 0];
        case 'victory': return ['victory', Math.floor(this.stateTime / 15) % 2];
        default: return ['idle', Math.floor(this.stateTime / (this.def.idleRate || 20)) % (this.def.idleFrames || 2)];
      }
    }

    // Purely visual timers; run even during hit-stop.
    tickVisuals() {
      if (this.flash > 0) this.flash--;
      if (this.shieldHit > 0) this.shieldHit--;
    }

    draw(ctx, floorY) {
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
      this.sprite.draw(ctx, anim, frame, x, floorY - this.y, this.facing, this.flash > 1 ? 'white' : null);
      if (aura) aura(this, ctx, floorY, this.scene ? this.scene.frame : 0, 'front');
      const t = this.scene ? this.scene.frame : 0;
      if (this.state === 'attack' && this.move.fx) RF.MOVE_FX[this.move.fx](this, ctx, floorY, t);
      if ((this.state === 'block' || this.state === 'blockstun') && this.def.blockFx) RF.BLOCK_FX[this.def.blockFx](this, ctx, floorY, t);
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
