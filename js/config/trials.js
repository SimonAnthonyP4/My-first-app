// COMBO TRIALS (Training mode): combos to learn, step by step. A step is the kind
// of hit (or event) that must happen, in order, within one combo.
//   light heavy lowLight lowHeavy launcher airLight airHeavy  normal moves
//   special ex super                                          special moves
//   bounce wall                                               floor bounce / wall bounce
// corner: true = the trial starts with the dummy in the corner.
RF.TRIALS = [
  { name: 'BASIC CHAIN', steps: ['light', 'light', 'heavy'] },
  { name: 'LOW STRING', steps: ['lowLight', 'lowLight', 'lowHeavy'] },
  { name: 'EX FINISH', steps: ['light', 'heavy', 'ex'] },
  { name: 'LAUNCH IT', steps: ['light', 'launcher'] },
  { name: 'AIR COMBO', steps: ['launcher', 'airLight', 'airLight', 'airHeavy'] },
  { name: 'BOUNCE BACK', steps: ['airHeavy', 'bounce', 'light'] },
  { name: 'CORNER CARRY', steps: ['heavy', 'wall', 'launcher'], corner: true },
  { name: 'GRAND FINALE', steps: ['light', 'heavy', 'super'] },
];

RF.TRIAL_LABELS = {
  light: 'LIGHT', heavy: 'HEAVY', lowLight: 'DOWN + LIGHT', lowHeavy: 'DOWN + HEAVY',
  launcher: 'UP + HEAVY (LAUNCH)', airLight: 'AIR LIGHT', airHeavy: 'AIR HEAVY (SPIKE)',
  special: 'SPECIAL', ex: 'EX: THROW (1 BAR)', super: 'SUPER: LIGHT+HEAVY',
  bounce: '(FLOOR BOUNCE)', wall: '(WALL BOUNCE)',
};

// How many steps of a trial the combo so far has done (in order; other hits in between are fine).
RF.trialProgress = (trial, log) => {
  let i = 0;
  for (const tag of log) if (tag === trial.steps[i]) i++;
  return i;
};
