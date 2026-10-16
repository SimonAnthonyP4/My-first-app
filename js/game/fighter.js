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
    constructor(def, side) {
      this.def = def;
      this.side = side; // 0 = player 1, 1 = player 2
      this.stats = def.stats;
      this.body = def.body;
      this.sprite = RF.createSprite(def);
      this.moves = {};
      for (const k in RF.MOVES) this.moves[k] = buildMove(RF.MOVES[k], def);
      this.reset(0, 1);
    }

    reset(x, facing) {
      this.x = x; this.y = 0;
      this.vx = 0; this.vy = 0;
      this.pushVx = 0;
      this.facing = facing;
      this.health = RF.CONFIG.MAX_HEALTH;
      this.move = null;
      this.moveKind = null;
      this.moveHasHit = false;
      this.attackAirborne = false;
      this.airAttackUsed = false;
      this.stun = 0;
      this.walkTime = 0;
      this.setState('idle');
    }

    setState(state) {
      if (this.state === state) return;
      this.state = state;
      this.stateTime = 0;
    }

    get grounded() { return this.y <= 0; }
    get isKO() { return this.state === 'ko'; }

    faceOpponent(opp) {
      if (opp.x !== this.x) this.facing = sign(opp.x - this.x);
    }

    update(input, opp, canAct, bounds) {
      this.stateTime++;
      switch (this.state) {
        case 'idle':
        case 'walk':
        case 'block':
          if (canAct) this.groundControl(input, opp);
          else { this.vx = 0; this.setState('idle'); }
          break;
        case 'jump':
          if (canAct && !this.airAttackUsed) {
            if (input.pressed('light')) { input.consume('light'); this.startAttack('light'); }
            else if (input.pressed('heavy')) { input.consume('heavy'); this.startAttack('heavy'); }
          }
          break;
        case 'attack':
          if (this.stateTime >= this.move.total) this.setState(this.grounded ? 'idle' : 'jump');
          break;
        case 'hitstun':
        case 'blockstun':
          if (--this.stun <= 0 && this.grounded) this.setState('idle');
          break;
        // 'ko' and 'victory' have no control
      }
      this.physics(bounds);
    }

    groundControl(input, opp) {
      this.faceOpponent(opp);
      if (input.pressed('light')) { input.consume('light'); return this.startAttack('light'); }
      if (input.pressed('heavy')) { input.consume('heavy'); return this.startAttack('heavy'); }
      if (input.held('block')) {
        this.setState('block');
        this.vx = 0;
        return;
      }
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      if (input.held('up')) {
        this.setState('jump');
        this.vy = this.stats.jumpPower;
        this.vx = dir * this.stats.walkSpeed * RF.CONFIG.JUMP_FORWARD_FACTOR;
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

    startAttack(kind) {
      this.move = this.moves[kind];
      this.moveKind = kind;
      this.moveHasHit = false;
      this.attackAirborne = !this.grounded;
      if (this.attackAirborne) this.airAttackUsed = true;
      else this.vx = 0;
      this.state = null; // force a fresh state even when chaining attacks
      this.setState('attack');
    }

    physics(bounds) {
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
      } else if (this.state === 'hitstun') {
        this.vx = 0;
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
      if (this.isKO) return null;
      return { x: this.x - this.body.width / 2, y: this.y, w: this.body.width, h: this.body.height };
    }

    isBlockingAgainst(attacker) {
      return (this.state === 'block' || this.state === 'blockstun') && this.grounded &&
        this.facing === (sign(attacker.x - this.x) || this.facing);
    }

    // Returns true if the hit was blocked.
    receiveHit(attacker, move) {
      const dir = sign(this.x - attacker.x) || attacker.facing;
      const blocked = this.isBlockingAgainst(attacker);
      let dmg = move.damage * (1 - this.stats.damageReduction);
      if (blocked) {
        dmg *= RF.CONFIG.CHIP_DAMAGE;
        this.stun = move.blockstun;
        this.state = null;
        this.setState('blockstun');
        this.pushVx = dir * move.pushback * 0.8;
      } else {
        this.stun = move.hitstun;
        this.state = null;
        this.setState('hitstun');
        this.pushVx = dir * move.pushback;
        if (!this.grounded) { this.vy = 3; this.vx = dir * 1.5; }
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
        case 'walk': return ['walk', Math.floor(Math.abs(this.walkTime) / 7) % 4];
        case 'jump': return ['jump', 0];
        case 'attack': {
          const ph = this.attackPhase();
          return [this.moveKind, ph === 'startup' ? 0 : ph === 'active' ? 1 : 2];
        }
        case 'block':
        case 'blockstun': return ['block', 0];
        case 'hitstun': return ['hit', 0];
        case 'ko': return ['ko', this.grounded ? 1 : 0];
        case 'victory': return ['victory', Math.floor(this.stateTime / 15) % 2];
        default: return ['idle', Math.floor(this.stateTime / 20) % 2];
      }
    }

    draw(ctx, floorY) {
      const [anim, frame] = this.animFrame();
      this.sprite.draw(ctx, anim, frame, this.x, floorY - this.y, this.facing);
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
