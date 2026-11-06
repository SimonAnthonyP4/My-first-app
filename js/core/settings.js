// Player-adjustable settings (Settings menu). Each one overrides a value in
// RF.CONFIG and is remembered in this browser via localStorage.
(function () {
  const KEY = 'retro-fighter-settings';

  RF.SETTINGS = [
    {
      id: 'ROUND_TIME', label: 'ROUND TIME',
      options: [[30, '30 SEC'], [60, '60 SEC'], [99, '99 SEC'], [0, 'NO LIMIT']],
    },
    {
      id: 'ROUNDS_TO_WIN', label: 'MATCH LENGTH',
      options: [[1, 'BEST OF 1'], [2, 'BEST OF 3'], [3, 'BEST OF 5']],
    },
    {
      id: 'PERFECT_BLOCK_WINDOW', label: 'PERFECT BLOCK',
      options: [[12, 'EASY'], [8, 'NORMAL'], [5, 'HARD']],
    },
    {
      id: 'CPU_LEVEL', label: 'CPU DIFFICULTY',
      options: [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']],
    },
    {
      id: 'MUSIC_VOLUME', label: 'MUSIC',
      options: [[0, 'OFF'], [0.35, 'LOW'], [0.7, 'MEDIUM'], [1, 'HIGH']],
    },
    {
      id: 'SFX_VOLUME', label: 'SOUND EFFECTS',
      options: [[0, 'OFF'], [0.4, 'LOW'], [0.8, 'MEDIUM'], [1, 'HIGH']],
    },
    {
      id: 'DYNAMIC_CAMERA', label: 'DYNAMIC CAMERA',
      options: [[true, 'ON'], [false, 'OFF']],
    },
    {
      id: 'BLOOD', label: 'BLOOD',
      options: [[true, 'ON'], [false, 'OFF']],
    },
    {
      id: 'ANNOUNCER', label: 'ANNOUNCER VOICE',
      options: [[true, 'ON'], [false, 'OFF']],
    },
    {
      id: 'RUMBLE', label: 'CONTROLLER RUMBLE',
      options: [[true, 'ON'], [false, 'OFF']],
    },
    {
      id: 'SHOW_HITBOXES', label: 'SHOW HITBOXES',
      options: [[false, 'OFF'], [true, 'ON']],
    },
  ];

  // Party mods: same shape as settings, shown on their own screen and never saved.
  RF.MOD_SETTINGS = [
    { id: 'MOD_BIGHEAD', label: 'BIG HEAD MODE', hint: 'EVERYONE GETS A GIANT HEAD', options: [[false, 'OFF'], [true, 'ON']] },
    { id: 'MOD_LOWGRAV', label: 'LOW GRAVITY', hint: 'FLOATY JUMPS AND SKY-HIGH JUGGLES', options: [[false, 'OFF'], [true, 'ON']] },
    { id: 'MOD_TURBO', label: 'TURBO', hint: 'THE WHOLE FIGHT RUNS 50% FASTER', options: [[false, 'OFF'], [true, 'ON']] },
    { id: 'MOD_TRIPLE', label: 'TRIPLE DAMAGE', hint: 'EVERY HIT DOES 3X DAMAGE. FIGHTS ARE SHORT.', options: [[false, 'OFF'], [true, 'ON']] },
    { id: 'MOD_PROTEIN', label: 'PROTEIN MODE', hint: 'HALF THE DAMAGE YOU DEAL HEALS YOU', options: [[false, 'OFF'], [true, 'ON']] },
    { id: 'MOD_RANDOM', label: 'RANDOM FIGHTERS', hint: 'BOTH PLAYERS GET A RANDOM FIGHTER EVERY ROUND', options: [[false, 'OFF'], [true, 'ON']] },
  ];

  const defaults = {};
  for (const s of RF.SETTINGS) defaults[s.id] = RF.CONFIG[s.id];

  function save() {
    const data = {};
    for (const s of RF.SETTINGS) data[s.id] = RF.CONFIG[s.id];
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable: settings just won't persist */ }
  }

  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
    if (!data) return;
    for (const s of RF.SETTINGS) {
      if (s.options.some(([v]) => v === data[s.id])) RF.CONFIG[s.id] = data[s.id];
    }
  }

  function cycle(s, dir) {
    const i = s.options.findIndex(([v]) => v === RF.CONFIG[s.id]);
    const n = s.options.length;
    RF.CONFIG[s.id] = s.options[((i < 0 ? 0 : i) + dir + n) % n][0];
    save();
    if (RF.audio) RF.audio.applyVolumes();
  }

  function valueLabel(s) {
    const o = s.options.find(([v]) => v === RF.CONFIG[s.id]);
    return o ? o[1] : String(RF.CONFIG[s.id]);
  }

  function reset() {
    Object.assign(RF.CONFIG, defaults);
    save();
    if (RF.audio) RF.audio.applyVolumes();
  }

  RF.settings = { load, save, cycle, valueLabel, reset };
  load();
})();
