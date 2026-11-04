// One fighter: state machine, movement physics, attacks and hit reactions.
// World coordinates: x = horizontal centre, y = height of the feet above the
// floor (0 = standing on it).
(function () {
  const { sign, clamp } = RF.util;

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
      if (alt) def = RF.altCostume(def);
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
      this.maxHealth = (RF.CONFIG.HEALTH_BY_ARCHETYPE || {})[def.archetype] || RF.CONFIG.MAX_HEALTH;
      this.special = RF.SPECIALS[def.special];
      this.specialKind = RF.SPECIAL_KINDS[this.special.kind];
      this.throwCfg = RF.THROWS[def.throw];
      this.throwKind = this.throwCfg && RF.THROW_KINDS[this.throwCfg.kind];
      this.scene = null; // set by FightScene
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
      this.shieldHit = 0; // frames left of a block effect flaring up
      this.fxHitDist = null; // how far a ranged move's effect reached (it stops at its target)
      this.specialData = {};
      this.victim = null;   // who we're throwing
      this.grabber = null;  // who's throwing us
      this.thrownPose = null;
      this.lastBlockPress = -Infinity;
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
    }

    get grounded() { return this.y <= 0; }
    get isKO() { return this.state === 'ko'; }

    faceOpponent(opp) {
      if (opp.x !== this.x) this.facing = sign(opp.x - this.x);
    }

    update(input, opp, canAct, bounds) {
      this.stateTime++;
      this.trackBlockPress(input);
      switch (this.state) {
        case 'idle':
        case 'walk':
        case 'crouch':
        case 'block':
          if (canAct) this.groundControl(input, opp);
          else { this.vx = 0; this.setState('idle'); }
          break;
        case 'jump':
          this.crouching = false;
          if (canAct && !this.airAttackUsed) {
            if (input.pressed('light')) { input.consume('light'); this.startAttack('airLight'); }
            else if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack('airHeavy'); }
          }
          break;
        case 'attack':
          if (this.move.fx && this.stateTime === this.move.startup) RF.audio.sfx('bolt');
          if (canAct && this.canCancel()) {
            // Combo: a light attack that connected can be cancelled straight into the next attack.
            const down = input.held('down');
            if (input.pressed('light')) { input.consume('light'); this.startAttack(down ? 'lowLight' : 'light', true); break; }
            if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack(down ? 'lowHeavy' : 'heavy', true); break; }
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
        case 'blockstun':
          if (--this.stun <= 0 && this.grounded) this.setState('idle');
          break;
        // 'ko' and 'victory' have no control
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
      const down = input.held('down');
      if (this.throwCfg && input.pressed('throw')) { input.consume('throw'); return this.startThrow(); }
      if (input.pressed('light')) { input.consume('light'); return this.startAttack(down ? 'lowLight' : 'light'); }
      if (input.pressed('heavy')) { input.consume('heavy'); return this.startAttack(down ? 'lowHeavy' : 'heavy'); }
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
      if (input.held('up')) {
        this.setState('jump');
        this.vy = this.stats.jumpPower;
        this.vx = dir * Math.max(this.stats.walkSpeed * RF.CONFIG.JUMP_FORWARD_FACTOR, RF.CONFIG.JUMP_MIN_SPEED);
        this.airAttackUsed = false;
        return;
      }
      if (dir) {
        const forward = dir === this.facing;
        this.setState('walk');
        this.vx = dir * this.stats.walkSpeed * (forward ? 1 : RF.CONFIG.BACKWALK_FACTOR);
        this.walkTime += forward ? 1 : -1;
      } else {
        this.setState('idle');
        this.vx = 0;
      }
    }

    canCancel() {
      return this.move.cancel && this.moveHasHit && !this.attackAirborne &&
        this.chain < RF.CONFIG.MAX_CHAIN && this.stateTime >= this.move.startup;
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
      this.state = null;
      if (this.health <= 0) return this.knockOut(fling ? Math.sign(fling.vx) || 1 : 1);
      this.stun = 22;
      this.setState('hitstun');
      if (fling) { this.vx = fling.vx; this.vy = fling.vy; }
    }

    physics(bounds) {
      if (this.state === 'thrown') { this.clampTo(bounds); return; } // the thrower moves us
      if (!this.grounded || this.vy > 0) {
        this.vy -= RF.CONFIG.GRAVITY;
        this.y += this.vy;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          this.land();
        }
      }
      if (this.grounded && (this.state === 'hitstun' || this.state === 'blockstun' || this.state === 'ko')) {
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
      if (this.isKO || this.state === 'thrown') return null;
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
      let dmg = move.damage * (1 - this.stats.damageReduction);
      if (blocked) {
        dmg *= RF.CONFIG.CHIP_DAMAGE;
        this.shieldHit = 12;
        this.stun = move.blockstun;
        this.state = null;
        this.setState('blockstun');
        this.pushVx = dir * move.pushback * 0.8;
      } else {
        // Combo damage scaling: each extra hit before recovering does a bit less.
        this.combo = wasStunned ? this.combo + 1 : 1;
        dmg *= Math.max(RF.CONFIG.COMBO_MIN_SCALE, 1 - RF.CONFIG.COMBO_SCALING * (this.combo - 1));
        this.flash = 4;
        this.stun = move.hitstun;
        this.state = null;
        this.setState('hitstun');
        this.pushVx = dir * (move.knockback || move.pushback);
        if (move.launch) { this.vy = move.launch; this.vx = dir * 2; }
        else if (!this.grounded) { this.vy = 3; this.vx = dir * 1.5; }
      }
      this.health = Math.max(0, this.health - dmg);
      if (this.health <= 0) this.knockOut(dir);
      return blocked;
    }

    knockOut(dir) {
      this.setState('ko');
      this.vy = 5;
      this.vx = dir * 2.5;
    }

    // ---- drawing ----

    animFrame() {
      switch (this.state) {
        case 'walk': return ['walk', Math.floor(Math.abs(this.walkTime) / Math.round(16 / this.stats.walkSpeed)) % 4];
        case 'jump': return ['jump', 0];
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
        case 'special': return this.specialKind.anim(this);
        case 'ko': return ['ko', this.grounded ? 1 : 0];
        case 'victory': return ['victory', Math.floor(this.stateTime / 15) % 2];
        default: return ['idle', Math.floor(this.stateTime / 20) % 2];
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
      // Shudder while frozen in hit-stop, like a real impact.
      if (this.scene && this.scene.hitstop > 0 && this.state === 'hitstun') x += this.scene.frame % 2 ? 1.5 : -1.5;
      this.sprite.draw(ctx, anim, frame, x, floorY - this.y, this.facing, this.flash > 1 ? 'white' : null);
      const t = this.scene ? this.scene.frame : 0;
      if (this.state === 'attack' && this.move.fx) RF.MOVE_FX[this.move.fx](this, ctx, floorY, t);
      if ((this.state === 'block' || this.state === 'blockstun') && this.def.blockFx) RF.BLOCK_FX[this.def.blockFx](this, ctx, floorY, t);
    }

    drawShadow(ctx, floorY) {
      const w = this.body.width * (1 - Math.min(0.5, this.y / 200));
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(Math.round(this.x), floorY + 1, w * 0.9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  RF.Fighter = Fighter;
})();
