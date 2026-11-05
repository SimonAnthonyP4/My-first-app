// RIVAL BANTER: what two fighters say to each other on the versus screen.
// 'a|b': [what a says, what b says back]. Works in either order.
RF.BANTER = {
  'sirven|holbrook': ['YOUR CLASSROOM IS MY TERRITORY.', 'NOT ACCORDING TO MY MAP.'],
  'sirven|anthony': ['NO SNACKS IN THE HALLWAY.', 'IT IS A PROTEIN BAR. BASICALLY HOMEWORK.'],
  'sirven|simon': ['NO FIGHTING ON SCHOOL GROUNDS.', 'THEN WHY ARE YOU HERE?'],
  'sirven|dabalsa': ['YOUR ESSAYS ARE TOO LONG.', 'BREVITY IS THE SOUL OF WIT. YOU LACK BOTH.'],
  'astuto|sirven': ['THIS IS AN ABUSE OF POWER.', 'OBJECTION OVERRULED.'],
  'weissenberg|escobedo': ['SCIENCE BEATS ENGINEERING.', 'WHO DO YOU THINK BUILT YOUR LAB?'],
  'landa|weissenberg': ['YOU WOULD MAKE A FINE SPECIMEN.', 'AND YOU WOULD MAKE A FINE GROUND WIRE.'],
  'jauregui|holbrook': ['MAPS ARE JUST BAD GRAPHS.', 'GRAPHS ARE JUST LOST MAPS.'],
  'jauregui|astuto': ['YOUR VOTES DO NOT ADD UP.', 'NEITHER DO YOUR GRADES.'],
  'simon|anthony': ['PROTEIN BARS? I EAT SHINS.', 'THEN TRY BRO BATCH, SHIN FLAVOR.'],
  'dabalsa|landa': ['THOU ART A BOIL, A PLAGUE SORE.', 'AND YOU ARE GOING IN A JAR.'],
  'escobedo|anthony': ['I COULD BUILD A BETTER BAR.', 'BUILD IT. I WILL STILL OUTSELL IT.'],
  'holbrook|simon': ['THAILAND? GREAT FOOD, GREAT PEOPLE.', 'GREAT KNEES TOO. WATCH.'],
  'bruiser|viper': ['STAND STILL!', 'SSSSO SLOW.'],
  'bruiser|dabalsa': ['I AM THE BIGGEST HERE.', 'MEASURE TWICE. LOSE ONCE.'],
  'landa|jauregui': ['SNAKES DO NOT DO MATH.', 'THIS ONE IS ABOUT TO BE SUBTRACTED.'],
  'escobedo|simon': ['MY ROBOTS NEVER GET TIRED.', 'MY KNEES NEVER MISS.'],
};

// [line for p1, line for p2] or null.
RF.banterFor = (a, b) => {
  if (a === b) return ['THERE CAN ONLY BE ONE.', 'AGREED.'];
  if (RF.BANTER[a + '|' + b]) return RF.BANTER[a + '|' + b];
  const r = RF.BANTER[b + '|' + a];
  return r ? [r[1], r[0]] : null;
};
