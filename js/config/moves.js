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
// hitbox is relative to the attacker's feet, facing right, before the
// character's body scale: x = distance in front of centre, y = height above
// the floor, w/h = size.
RF.MOVES = {
  light: {
    startup: 5, active: 3, recovery: 9,
    damage: 5,
    hitstun: 14, blockstun: 9,
    pushback: 3, hitstop: 3,
    hitbox: { x: 12, y: 52, w: 28, h: 13 },
  },
  heavy: {
    startup: 10, active: 4, recovery: 18,
    damage: 11,
    hitstun: 22, blockstun: 14,
    pushback: 5.5, hitstop: 6,
    hitbox: { x: 12, y: 36, w: 40, h: 18 },
  },
};
