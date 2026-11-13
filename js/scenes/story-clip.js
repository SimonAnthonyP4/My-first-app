// STORY MODE: pre-rendered video clips (assets/video/*.webm, *.mp4). Silent, a few seconds each, made
// with an AI video model from descriptions of places and effects only (no real people). The game's
// own score keeps playing under them.
//   { clip: 'school' }   plays full-frame and blocks until it ends (CONFIRM or a tap skips it); the last
//                        frame stays on screen under the next lines until a shot or an insert replaces it
// If the browser cannot play it (or the file is missing) the step is skipped after a moment: the story
// never waits on a clip. Clips are fetched when the story menu opens. Settings: STORY menu -> VIDEO.
(function () {
  const K = RF.storyKit, P = RF.StoryScene.prototype, INS = K.INSERTS, W = 384, H = 224;
  const NAMES = ['school', 'hall', 'post', 'judge', 'sealed'], vids = {};
  const src = (n, v) => (v.canPlayType('video/webm; codecs="vp9"') ? 'assets/video/' + n + '.webm' : 'assets/video/' + n + '.mp4');
  function get(n) {
    if (vids[n]) return vids[n];
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', ''); v.loop = false;
    v.addEventListener('error', () => { v.bad = true; });
    try { v.src = src(n, v); v.load(); } catch (e) { v.bad = true; }
    return (vids[n] = v);
  }
  K.preloadClips = () => { if (K.clipsOn()) NAMES.forEach(get); };
  K.clipsOn = () => !RF.storyProgress.get().noclip;
  // cover-fit into the picture, like a film frame
  INS.clip = function (ctx, t, o) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const v = vids[o.clip];
    if (!v || v.bad || v.readyState < 2 || !v.videoWidth) return;
    const k = Math.max(W / v.videoWidth, H / v.videoHeight), w = v.videoWidth * k, h = v.videoHeight * k;
    try { ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h); } catch (e) { v.bad = true; }
  };
  const begin = P.beginStep, upd = P.updateExtra, inst = P.instantExtra;
  P.beginStep = function (s) {
    if (begin) begin.call(this, s);
    if (!s.clip) return;
    const v = K.clipsOn() ? get(s.clip) : null;
    this.clipV = v; this.clipT = 0;
    this.insert = { name: 'clip', t: 0, o: { clip: s.clip } };
    if (v && !v.bad) { try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => { v.bad = true; }); } catch (e) { v.bad = true; } }
  };
  P.updateExtra = function (s, kb, ok, auto) {
    if (!s.clip) return upd ? upd.call(this, s, kb, ok, auto) : false;
    const v = this.clipV, t = ++this.clipT, dead = !v || v.bad || (t > 240 && v.readyState < 2);   // (not playable, or not loaded in four seconds)
    if (dead || v.ended || (ok && t > 20) || auto || t > 60 * 9) { if (v) { try { v.pause(); } catch (e) { /* ok */ } } if (dead) this.insert = null; this.next(); }
    return true;
  };
  // a paused clip stops with the story: leaving the story (or a fight starting) pauses any that is playing
  const leave = K.leaveStory;
  K.leaveStory = function () { for (const n in vids) { try { vids[n].pause(); } catch (e) { /* ok */ } } return leave.apply(this, arguments); };
  const Menu = RF.StoryMenuScene;
  if (Menu) {
    const up = Menu.prototype.update; let done = false;
    Menu.prototype.update = function () { if (!done) { done = true; K.preloadClips(); } return up.call(this); };
  }
  // ---- where they play ----
  const ch = (t) => RF.STORY.chapters.find((c) => c.title === t);
  const put = (title, line, kind, add) => { const s = ch(title).intro, w = RF.STORY.kit.at(s, line); if (w < 0) return console.warn('story-clip: no line "' + line + '" in ' + title); s.splice(kind === 'before' ? w : w + 1, 0, ...add); };
  put('MIDNIGHT', 'AT MIDNIGHT, THE SCHOOL BELL RANG.', 'before', [{ clip: 'school' }]);
  put('THE HEADMASTER', 'BETWEEN ONE UNIVERSE AND THE NEXT THERE IS A ROOM.', 'before', [{ clip: 'hall' }]);
  put('THE WAITING ROOM', 'BETWEEN EVERY UNIVERSE THERE IS A DOOR.', 'before', [{ clip: 'post' }]);
  put('CODE RED', 'A KEEPER HAD NEVER FALLEN ON DUTY.', 'after', [{ clip: 'judge' }]);
  put('CODE RED', 'ONE BY ONE THE ROOMS OF THE SCHOOL WENT STILL.', 'after', [{ clip: 'sealed' }]);
})();
