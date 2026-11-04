// CPU opponent difficulty levels (picked in Settings). All chances are 0..1.
//   reaction       frames before the CPU reacts to an incoming attack
//   blockChance    chance it tries to block an attack it sees coming
//   perfectChance  chance that block is timed as a PERFECT block (-> its special)
//   aggression     chance per frame to attack when the opponent is in range
//   punish         chance to hit back when the opponent is open (missed attack, stunned)
//   jumpChance     chance to jump in instead of walking when far away
//   idle           max frames it stands around thinking
//   throwChance    chance per frame to throw when right next to the opponent
//   breakChance    chance it breaks out of your throws
//   combo          chance it follows up a hit with a combo (ground strings, launcher -> air combo)
//   superChance    chance per frame to fire its super when the meter is full and you're close
//   dashChance     chance to dash in instead of walking
RF.AI_LEVELS = {
  easy: { reaction: 24, blockChance: 0.25, perfectChance: 0.03, aggression: 0.025, punish: 0.2, jumpChance: 0.05, idle: 40, throwChance: 0.01, breakChance: 0.05, combo: 0.15, superChance: 0.004, dashChance: 0.05 },
  normal: { reaction: 14, blockChance: 0.5, perfectChance: 0.12, aggression: 0.05, punish: 0.5, jumpChance: 0.1, idle: 25, throwChance: 0.02, breakChance: 0.25, combo: 0.5, superChance: 0.015, dashChance: 0.15 },
  hard: { reaction: 7, blockChance: 0.8, perfectChance: 0.35, aggression: 0.09, punish: 0.9, jumpChance: 0.15, idle: 12, throwChance: 0.035, breakChance: 0.5, combo: 0.9, superChance: 0.04, dashChance: 0.25 },
};
