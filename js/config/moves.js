// Base attack data shared by every character, before character stats apply.
//
// Timings are in frames (60 per second):
//   startup   frames before the attack can hit
//   active    frames during which the hitbox is live
//   recovery  frames after the hitbox ends before you can act again
// A character's attackSpeed divides startup/active/recovery
// (attackSpeed 1.25 = everything 25% faster). Hitstun/blockstun are NOT
// scaled, which is what lets fast characters chain light attacks.
//
// damage is multiplied by the attacker's `damage` stat and then reduced by
// the defender's `damageReduction`.
//
// level: 'mid' (default) can be blocked standing or crouching; 'low' must be
// blocked crouching. Jump attacks are 'overhead' and must be blocked standing.
// crouch: true = performed while crouching (down + attack).
// cancel: true = once it connects, you can cancel its recovery into another attack (combos).
// anim: which animation to show (defaults to the move's own name).
// projectile: { ... } throws a projectile when the move becomes active (same
//   fields as a projectile special in specials.js) instead of using its hitbox.
// launch: pops the victim into the air (knockdown).
// knockback: how hard a clean hit shoves the victim back (pushback is used when blocked).
// launcher: true = hold UP after it connects to jump after the victim (air combo).
// launchVx: sideways speed of a launched victim (default 2).
// pull: a clean hit DRAGS the victim toward the attacker this hard instead of pushing them away.
// fx / fxSound: an effect drawn during the move (game/fx.js MOVE_FX) and the sound it starts with.
//
// hitbox is relative to the attacker's feet, facing right, before the
// character's body scale: x = distance in front of centre, y = height above
// the floor, w/h = size.
RF.MOVES = {
  light: {
    startup: 5, active: 3, recovery: 9,
    damage: 5,
    cancel: true,
    hitstun: 14, blockstun: 9,
    pushback: 3, hitstop: 3,
    hitbox: { x: 12, y: 52, w: 28, h: 13 },
  },
  heavy: {
    startup: 10, active: 4, recovery: 18,
    damage: 11,
    hitstun: 22, blockstun: 14,
    pushback: 5.5, knockback: 10, hitstop: 6,
    hitbox: { x: 12, y: 36, w: 40, h: 18 },
  },
  // Jump attacks: angled down so they can hit crouching opponents.
  airLight: {
    startup: 4, active: 6, recovery: 6,
    damage: 5,
    cancel: true,                 // air combos: chain into more air attacks
    hitstun: 14, blockstun: 9,
    pushback: 2.5, hitstop: 3,
    anim: 'light',
    hitbox: { x: 6, y: 14, w: 26, h: 24 },
  },
  airHeavy: {
    startup: 7, active: 6, recovery: 10,
    damage: 10,
    hitstun: 20, blockstun: 12,
    pushback: 4.5, knockback: 8, hitstop: 6,
    anim: 'heavy',
    hitbox: { x: 4, y: -6, w: 38, h: 30 },
  },
  // Launcher (UP + HEAVY): an uppercut that pops the opponent high into the air.
  // Hold UP as it connects to jump after them for an air combo.
  launcher: {
    startup: 9, active: 4, recovery: 22,
    damage: 7,
    hitstun: 34, blockstun: 12,
    pushback: 2, hitstop: 8,
    launch: 7.6, launchVx: 0.7, launcher: true,
    anim: 'uppercut',
    hitbox: { x: 4, y: 30, w: 34, h: 60 },
  },
  // Crouching jab: fast, hits mid, ducks under standing jabs.
  lowLight: {
    startup: 5, active: 3, recovery: 9,
    damage: 4,
    hitstun: 13, blockstun: 8,
    pushback: 3, hitstop: 3,
    crouch: true, cancel: true,
    hitbox: { x: 12, y: 28, w: 26, h: 12 },
  },
  // Sweep: hits low (crouch-block it!) and knocks the victim off their feet.
  lowHeavy: {
    startup: 11, active: 4, recovery: 22,
    damage: 9,
    hitstun: 26, blockstun: 14,
    pushback: 4, hitstop: 6,
    crouch: true, level: 'low', launch: 3.5,
    hitbox: { x: 8, y: 0, w: 46, h: 12 },
  },
};
