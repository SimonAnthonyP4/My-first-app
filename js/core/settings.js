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
      id: 'SHOW_HITBOXES', label: 'SHOW HITBOXES',
      options: [[false, 'OFF'], [true, 'ON']],
    },
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
  }

  function valueLabel(s) {
    const o = s.options.find(([v]) => v === RF.CONFIG[s.id]);
    return o ? o[1] : String(RF.CONFIG[s.id]);
  }

  function reset() {
    Object.assign(RF.CONFIG, defaults);
    save();
  }

  RF.settings = { load, save, cycle, valueLabel, reset };
  load();
})();
