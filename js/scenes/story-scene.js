// STORY MODE: "THE LAST BELL". A cinematic engine for cutscenes (letterboxed, with a typed-out
// dialogue box, portraits, camera moves, rifts and shatter effects), the story menu, the hero
// picker for the finale, rift variants for the fights, and the credits roll.
// The story itself (every chapter, every line) is data in js/config/story.js.
//
// A cutscene is a list of steps, run one after another:
//   { bg: 'stageId' | 'black' }           background (a stage, drawn live)
//   { music: 'court' }  { sfx: 'boom' }   audio
//   { cast: { key: [charId, x, facing, { rift, anim, y }] } }   put actors on stage
//   { remove: 'key' }   { anim: ['key', 'victory'] }   { face: ['key', -1] }
//   { say: ['key' | charId, 'TEXT', { radio }] }   dialogue (waits for a button)
//   { narrate: 'TEXT' }                    caption (waits)
//   { title: ['CHAPTER 1', 'BRO BATCH'] }  title card (waits)
//   { walk: ['key', toX, frames] }         walk an actor (waits; add 'async' as a 4th item to not wait)
//   { hop: 'key' }  { shatter: 'key' }     a jump / a rift variant breaking into purple glass
//   { wait: frames }  { shake: n }  { flash: n }  { tint: 'rgba(..)' | null }
//   { cam: [x, zoom, frames] }             camera pan + zoom (smooth, doesn't wait)
//   { rift: [x, size] }  { riftOff: true } a rift portal (size 1 = person-sized)
//   { fade: ['out' | 'in', frames] }       fade to / from black (waits)
//   { choose: true }                       pick the hero for the finale ('$hero' afterwards)
//   { credits: true }                      roll the credits
(function () {
  const T = (...a) => RF.font.drawText(...a);
  const W = 384, H = 224, BAR = 18;
  const KEY = 'terramania-story';
  const PURPLE = ['#ffffff', '#e0b0ff', '#a050ff', '#5a1a9a'];

  // ---------------------------------------------------------------- progress
  RF.storyProgress = {
    get() { try { return Object.assign({ reached: 0, done: false }, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return { reached: 0, done: false }; } },
    reach(i) { const p = this.get(); p.reached = Math.max(p.reached, i); this.save(p); },
    finish() { const p = this.get(); p.done = true; this.save(p); },
    save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* no storage */ } },
  };

  // ---------------------------------------------------------------- rift variants
  // A purple, shadowy copy of a fighter from another universe.
  RF.riftDef = function (def) {
    const pal = {};
    for (const k in (def.sprite.palette || {})) {
      const h = def.sprite.palette[k];
      if (!h || h[0] !== '#') { pal[k] = h; continue; }
      const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      const l = (r * 0.3 + g * 0.55 + b * 0.15) / 255;
      const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
      pal[k] = '#' + c(30 + l * 190) + c(10 + l * 120) + c(60 + l * 200);
    }
    return Object.assign({}, def, { name: 'RIFT ' + def.name.toUpperCase(), costume: 'rift', rift: true, sprite: Object.assign({}, def.sprite, { palette: pal }) });
  };
  // Wisps of purple rising off a rift variant.
  RF.MOVE_FX.riftAura = function (f, ctx, floorY, frame) {
    if (f.isKO || ['finished', 'thrown'].includes(f.state)) return;
    const top = floorY - f.y - f.body.height;
    for (let i = 0; i < 6; i++) {
      const a = (frame * 1.5 + i * 17) % 50;
      ctx.globalAlpha = 0.55 * (1 - a / 50); ctx.fillStyle = i % 2 ? '#c080ff' : '#7020d0';
      ctx.fillRect(Math.round(f.x - 14 + i * 5 + Math.sin((frame + i * 9) / 7) * 3), Math.round(top + f.body.height - a * 1.8), 2, 3);
    }
    ctx.globalAlpha = 1;
  };

  // Called every fight frame in story mode: the villain's mid-fight line.
  RF.storyTick = function (scene) {
    const st = scene.opts.story, foe = scene.fighters[1];
    if (st.mid && !scene.midShown && scene.phase === 'fight' && foe.health < foe.maxHealth * 0.5) {
      scene.midShown = true;
      scene.effects.spawnText(st.mid, foe.x, foe.body.height + 30, '#d090ff');
    }
  };
  RF.storyEndMenu = function (scene, won) {
    const game = scene.game, i = scene.opts.story.index;
    if (won) return new RF.ListMenu([{ label: 'CONTINUE STORY', onSelect: () => game.setScene(new StoryScene(game, i, 'outro', { hero: scene.opts.story.hero })) }]);
    return new RF.ListMenu([
      { label: 'RETRY', onSelect: () => scene.startMatch() },
      { label: 'STORY MENU', onSelect: () => game.setScene(new StoryMenuScene(game)) },
    ]);
  };

  // ---------------------------------------------------------------- story menu
  class StoryMenuScene {
    constructor(game) {
      RF.audio.playSong('court');
      this.game = game; this.t = 0;
      const prog = RF.storyProgress.get(), chs = RF.STORY.chapters;
      const items = [];
      const next = Math.min(prog.reached, chs.length - 1);
      items.push({ label: prog.reached ? 'CONTINUE: ' + chs[next].title : 'NEW STORY', desc: chs[next].sub, onSelect: () => game.setScene(new StoryScene(game, next, 'intro')) });
      chs.forEach((c, i) => {
        if (i === 0) return;
        const open = i <= prog.reached;
        items.push({ label: open ? (i + '. ' + c.title) : (i + '. ??????'), desc: open ? c.sub : 'LOCKED', onSelect: () => open && game.setScene(new StoryScene(game, i, 'intro')) });
      });
      items.push({ label: 'BACK', desc: '', onSelect: () => game.setScene(new RF.TitleScene(game)) });
      this.menu = new RF.ListMenu(items);
      this.stage = new RF.StageRenderer(RF.getStage('court'));
    }
    update() {
      this.t++;
      if (RF.menuPressed(this.game.kb, 'back')) return this.game.setScene(new RF.TitleScene(this.game));
      this.menu.update(this.game.kb);
    }
    render(ctx) {
      this.stage.draw(ctx, this.t);
      ctx.fillStyle = 'rgba(20,0,40,0.72)'; ctx.fillRect(0, 0, W, H);
      drawRift(ctx, 320, 120, 1.6, this.t);
      T(ctx, 'STORY MODE', W / 2, 10, { scale: 1, align: 'center', color: '#c080ff', outline: '#000' });
      T(ctx, 'THE LAST BELL', W / 2, 20, { scale: 3, align: 'center', color: PURPLE, outline: '#14001e' });
      const items = this.menu.items, y0 = 58;
      items.forEach((it, i) => {
        const sel = i === this.menu.index, y = y0 + i * 11;
        if (sel) { ctx.fillStyle = 'rgba(160,80,255,0.35)'; ctx.fillRect(40, y - 2, 200, 11); }
        T(ctx, it.label, 48, y, { color: sel ? '#ffffff' : (it.desc === 'LOCKED' ? '#5a4a6a' : '#c8b0e0'), outline: '#000' });
      });
      const d = items[this.menu.index].desc;
      if (d) T(ctx, d, W / 2, H - 14, { align: 'center', color: '#e0c0ff', outline: '#000' });
    }
  }

  // ---------------------------------------------------------------- the rift portal
  function drawRift(ctx, x, y, size, t) {
    const h = 46 * size, w = 16 * size;
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#a050ff';
    ctx.beginPath(); ctx.ellipse(x, y, w * 2.2, h * 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.18, wob = Math.sin(t / 6 + i) * 2 * size;
      ctx.fillStyle = ['#2a0050', '#5a10a0', '#8a30e0', '#c080ff', '#ffffff'][i];
      ctx.beginPath(); ctx.ellipse(x + wob * 0.3, y, Math.max(1, w * k + wob * 0.2), h * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#14001e'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.25, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 10; i++) { // sparks spiralling in
      const a = t / 9 + i * 0.63, r = (h * 1.2) * (1 - ((t + i * 7) % 40) / 40);
      ctx.fillStyle = i % 2 ? '#ffffff' : '#c080ff';
      ctx.fillRect(Math.round(x + Math.cos(a) * r * 0.5), Math.round(y + Math.sin(a) * r), 2, 2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- cutscene player
  class StoryScene {
    // part: 'intro' | 'outro'
    constructor(game, index, part, opts = {}) {
      this.game = game; this.index = index; this.part = part;
      this.ch = RF.STORY.chapters[index];
      this.steps = (part === 'intro' ? this.ch.intro : this.ch.outro) || [];
      this.hero = opts.hero || null;
      this.i = -1; this.t = 0; this.stepT = 0;
      this.actors = {}; this.bgDef = null; this.stage = null;
      this.cam = { x: W / 2, z: 1, tx: W / 2, tz: 1, k: 0.05 };
      this.shake = 0; this.flash = 0; this.tintCol = null; this.fadeA = part === 'intro' ? 1 : 0;
      this.shards = []; this.riftFx = null; this.cur = null;
      if (part === 'intro') RF.storyProgress.reach(index);
      this.next();
    }

    resolve(k) { return k === '$hero' ? this.hero : k; }
    actorDef(id) { const d = RF.getCharacter(this.resolve(id)); return d; }

    next() {
      for (;;) {
        this.i++; this.stepT = 0;
        const s = this.steps[this.i];
        if (!s) return this.finish();
        if (this.instant(s)) continue;
        this.cur = s;
        if (s.say || s.narrate || s.title) { this.typed = 0; this.text = s.say ? s.say[1] : s.narrate || (s.title ? s.title[1] : ''); }
        if (s.say) { const a = this.actors[s.say[0]]; if (a) a.talk = true; RF.audio.sfx(s.say[2] && s.say[2].radio ? 'pa' : 'move'); }
        if (s.walk) { const a = this.actors[this.resolve(s.walk[0])]; if (a) { a.from = a.x; a.to = s.walk[1]; a.wt = 0; a.wlen = s.walk[2] || 40; a.facing = a.to >= a.x ? 1 : -1; } if (s.walk[3] === 'async') continue; }
        if (s.choose) { this.picks = RF.STORY.heroes.filter((id) => RF.getCharacter(id)); this.pick = 0; }
        if (s.credits) { this.creditY = H - 60; RF.audio.playSong('menu'); }
        return;
      }
    }

    // Steps that take no time.
    instant(s) {
      if (s.bg) { this.bgDef = s.bg === 'black' ? null : RF.getStage(s.bg); this.stage = this.bgDef ? new RF.StageRenderer(this.bgDef) : null; return true; }
      if (s.music) { RF.audio.playSong(s.music); return true; }
      if (s.sfx) { RF.audio.sfx(s.sfx); return true; }
      if (s.cast) {
        for (const [k, v] of Object.entries(s.cast)) {
          const id = this.resolve(v[0]); let def = RF.getCharacter(id); if (!def) continue;
          const o = v[3] || {};
          if (o.rift) def = RF.riftDef(def);
          this.actors[k === '$hero' ? id : k] = { def, sprite: RF.createSprite(def), x: v[1], y: o.y || 0, facing: v[2] || 1, anim: o.anim || 'idle', rift: !!o.rift, seed: Math.random() * 100 };
        }
        return true;
      }
      if (s.remove) { delete this.actors[s.remove]; return true; }
      if (s.anim) { const a = this.actors[this.resolve(s.anim[0])]; if (a) { a.anim = s.anim[1]; a.at = this.t; } return true; }
      if (s.face) { const a = this.actors[this.resolve(s.face[0])]; if (a) a.facing = s.face[1]; return true; }
      if (s.shake) { this.shake = s.shake; return true; }
      if (s.flash) { this.flash = s.flash; return true; }
      if (s.tint !== undefined) { this.tintCol = s.tint; return true; }
      if (s.cam) { this.cam.tx = s.cam[0]; this.cam.tz = s.cam[1]; this.cam.k = 1 / Math.max(4, s.cam[2] || 30) * 3; return true; }
      if (s.rift) { this.riftFx = { x: s.rift[0], size: s.rift[1] || 1, t: 0 }; RF.audio.sfx('arcane'); this.flash = 4; return true; }
      if (s.riftOff) { if (this.riftFx) this.riftFx.closing = 1; RF.audio.sfx('boom'); return true; }
      if (s.hop) { const a = this.actors[this.resolve(s.hop)]; if (a) a.hopT = 1; return true; }
      if (s.shatter) {
        const a = this.actors[this.resolve(s.shatter)];
        if (a) {
          for (let i = 0; i < 40; i++) this.shards.push({ x: a.x + (Math.random() - 0.5) * 24, y: a.y + Math.random() * a.def.body.height, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4 + 1, c: PURPLE[i % 4], life: 50 + Math.random() * 30 });
          delete this.actors[this.resolve(s.shatter)];
          RF.audio.sfx('crack'); RF.audio.sfx('arcane'); this.flash = 6; this.shake = 8;
        }
        return true;
      }
      return false;
    }

    finish() {
      this.cur = null;
      const ch = this.ch, game = this.game;
      if (this.part === 'intro' && ch.fight) return this.startFight();
      // after the outro (or a chapter with no fight): the next chapter
      const n = this.index + 1;
      if (n >= RF.STORY.chapters.length) { RF.storyProgress.finish(); return game.setScene(new RF.TitleScene(game)); }
      RF.storyProgress.reach(n);
      if (this.part === 'intro' && !ch.fight && ch.outro) return game.setScene(new StoryScene(game, this.index, 'outro', { hero: this.hero }));
      game.setScene(new StoryScene(game, n, 'intro', { hero: this.hero }));
    }

    startFight() {
      const f = this.ch.fight, hero = this.resolve(f.play);
      const p1 = RF.getCharacter(hero), p2 = RF.riftDef(RF.getCharacter(f.vs));
      if (f.name) p2.name = f.name;
      this.game.setScene(new RF.VersusScene(this.game, {
        p1, p2, stage: f.stage, cpu: true, cpuLevel: f.cpu || 'normal', boss: f.boss || 0,
        story: { index: this.index, mid: f.mid, hero: this.hero },
      }));
    }

    // ---- update ----
    update() {
      this.t++; this.stepT++;
      const kb = this.game.kb, s = this.cur;
      if (this.fadeA > 0 && !(s && s.fade)) this.fadeA = Math.max(0, this.fadeA - 0.05);
      if (this.shake > 0) this.shake--;
      if (this.flash > 0) this.flash--;
      const c = this.cam; c.x += (c.tx - c.x) * c.k; c.z += (c.tz - c.z) * c.k;
      if (this.riftFx) { this.riftFx.t++; if (this.riftFx.closing && (this.riftFx.closing += 0.05) > 2) this.riftFx = null; }
      for (const p of this.shards) { p.x += p.vx; p.y += p.vy; p.vy -= 0.25; if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.7; } p.life--; }
      this.shards = this.shards.filter((p) => p.life > 0);
      for (const a of Object.values(this.actors)) {
        if (a.wlen) { a.wt++; const u = Math.min(1, a.wt / a.wlen); a.x = a.from + (a.to - a.from) * u; if (u >= 1) a.wlen = 0; }
        if (a.hopT) { a.hopT++; a.y = Math.max(0, Math.sin((a.hopT / 20) * Math.PI) * 16); if (a.hopT > 20) { a.hopT = 0; a.y = 0; } }
      }
      // skip the whole cutscene
      if (RF.menuPressed(kb, 'back') && !(s && s.choose)) { this.skipping = true; }
      if (this.skipping) { if (!this.hero && this.steps.some((st) => st.choose)) this.hero = RF.STORY.heroes[0]; this.i = this.steps.length; return this.finish(); }
      if (!s) return;
      const ok = RF.menuPressed(kb, 'confirm');
      if (s.say || s.narrate || s.title) {
        this.typed += 1.6;
        if (s.title && this.stepT > 150) this.typed = Infinity; // title cards move on by themselves
        if (ok || (s.title && this.stepT > 170)) { if (this.typed < this.text.length) this.typed = this.text.length; else { const a = s.say && this.actors[s.say[0]]; if (a) a.talk = false; this.next(); } }
        else if (this.game.manualStep && this.stepT > 8) this.next(); // tests and recordings auto-advance
        return;
      }
      if (s.walk) { const a = this.actors[this.resolve(s.walk[0])]; if (!a || !a.wlen) this.next(); return; }
      if (s.wait) { if (this.stepT >= s.wait) this.next(); return; }
      if (s.fade) { const [dir, n] = s.fade; this.fadeA = dir === 'out' ? Math.min(1, this.stepT / (n || 30)) : Math.max(0, 1 - this.stepT / (n || 30)); if (this.stepT >= (n || 30)) this.next(); return; }
      if (s.choose) {
        if (RF.menuPressed(kb, 'left')) { this.pick = (this.pick + this.picks.length - 1) % this.picks.length; RF.audio.sfx('move'); }
        if (RF.menuPressed(kb, 'right')) { this.pick = (this.pick + 1) % this.picks.length; RF.audio.sfx('move'); }
        if (ok || (this.game.manualStep && this.stepT > 8)) {
          this.hero = this.picks[this.pick]; RF.audio.sfx('select');
          const def = RF.getCharacter(this.hero);
          this.actors[this.hero] = { def, sprite: RF.createSprite(def), x: 150, y: 0, facing: 1, anim: 'victory', seed: 1 };
          this.next();
        }
        return;
      }
      if (s.credits) {
        this.creditY -= 0.7;
        if (ok) this.creditY -= 6;
        if (this.creditY < -(RF.CHARACTERS.length * 74 + 300) || (this.game.manualStep && this.stepT > 30)) this.next();
        return;
      }
      this.next();
    }

    // ---- render ----
    render(ctx) {
      const s = this.cur;
      if (s && s.credits) return this.drawCredits(ctx);
      const floorY = this.bgDef ? this.bgDef.floorY : 204;
      ctx.save();
      if (this.shake) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake * 0.5));
      const c = this.cam, pivot = floorY - 40;
      if (Math.abs(c.z - 1) > 0.001 || Math.abs(c.x - W / 2) > 0.5) { ctx.translate(W / 2, pivot); ctx.scale(c.z, c.z); ctx.translate(-c.x, -pivot); }
      if (this.stage) this.stage.draw(ctx, this.t); else { ctx.fillStyle = '#05000a'; ctx.fillRect(-W, -H, W * 3, H * 3); }
      if (this.tintCol) { ctx.fillStyle = this.tintCol; ctx.fillRect(-W, -H, W * 3, H * 3); }
      if (this.riftFx) { const r = this.riftFx, k = r.closing ? Math.max(0, 1 - r.closing / 2) : Math.min(1, r.t / 16); drawRift(ctx, r.x, floorY - 50 * r.size, r.size * k, this.t); }
      // actors, back to front by x
      const list = Object.values(this.actors).sort((a, b) => a.x - b.x);
      for (const a of list) {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(a.x, floorY + 1, 14, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        let anim = a.anim, frame = 0;
        if (a.wlen) { anim = 'walk'; frame = (a.wt / 5) % 4; }
        else if (anim === 'idle') frame = ((this.t + a.seed) / (a.def.idleRate || 12)) % (a.def.idleFrames || 2);
        else if (anim === 'victory' || anim === 'taunt') frame = Math.floor((this.t + a.seed) / 16) % 2;
        else if (anim === 'special' || anim === 'heavy' || anim === 'light') frame = Math.min(1, (this.t - (a.at || 0)) / 10);
        const bob = a.talk && anim === 'idle' && this.t % 16 < 8 ? 1 : 0;
        a.sprite.draw(ctx, anim, frame, a.x, floorY - a.y - bob, a.facing);
        if (a.rift) RF.MOVE_FX.riftAura({ x: a.x, y: a.y, body: a.def.body, state: 'idle' }, ctx, floorY, this.t);
      }
      for (const p of this.shards) { ctx.globalAlpha = Math.min(1, p.life / 30); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(floorY - p.y), 2, 2); }
      ctx.globalAlpha = 1;
      ctx.restore();

      // cinematic letterbox + film vignette
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, BAR); ctx.fillRect(0, H - BAR, W, BAR);
      if (this.flash) { ctx.fillStyle = `rgba(255,240,255,${this.flash * 0.08})`; ctx.fillRect(0, 0, W, H); }
      T(ctx, 'CHAPTER ' + this.index + '  ' + this.ch.title, 6, 5, { color: '#5a4a6a' });
      if (!(s && s.choose)) T(ctx, 'ESC: SKIP', W - 6, 5, { align: 'right', color: '#5a4a6a' });
      if (s && s.say) this.drawSay(ctx, s);
      if (s && s.narrate) this.drawCaption(ctx, this.text.slice(0, this.typed | 0));
      if (s && s.title) this.drawTitle(ctx, s.title);
      if (s && s.choose) this.drawChooser(ctx);
      if (this.fadeA > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fadeA})`; ctx.fillRect(0, 0, W, H); }
    }

    drawSay(ctx, s) {
      const key = this.resolve(s.say[0]), a = this.actors[key], def = a ? a.def : this.actorDef(key);
      if (!def) return;
      const radio = s.say[2] && s.say[2].radio, left = !a || a.x < W / 2;
      const bx = 6, by = H - 60, bw = W - 12, bh = 52, col = a && a.rift ? '#a050ff' : radio ? '#ffd030' : '#ff7a2a';
      ctx.fillStyle = 'rgba(8,4,16,0.92)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = col; ctx.fillRect(bx, by, bw, 1); ctx.fillRect(bx, by + bh - 1, bw, 1);
      // portrait
      const px = left ? bx + 4 : bx + bw - 48, py = by + 4, ps = 44;
      ctx.fillStyle = '#1a1028'; ctx.fillRect(px, py, ps, ps);
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, ps, ps); ctx.clip();
      const sp = a ? a.sprite : RF.createSprite(def), k = 1.5;
      ctx.translate(px + ps / 2, py + 6 + def.body.height * k); ctx.scale(k, k);
      sp.draw(ctx, 'idle', 0, 0, 0, left ? 1 : -1);
      if (radio && this.t % 6 < 3) { ctx.fillStyle = 'rgba(160,220,255,0.15)'; ctx.fillRect(-40, -200, 80, 200); }
      ctx.restore();
      ctx.strokeStyle = col; ctx.strokeRect(px + 0.5, py + 0.5, ps - 1, ps - 1);
      // name + text
      const tx = left ? px + ps + 8 : bx + 8;
      const name = (a && a.rift ? 'RIFT ' : '') + def.name.toUpperCase() + (radio ? ' (RADIO)' : '');
      T(ctx, name, tx, by + 5, { color: col, outline: '#000' });
      const shown = this.text.slice(0, this.typed | 0);
      RF.font.wrap(shown, 50).slice(0, 4).forEach((line, i) => T(ctx, line, tx, by + 17 + i * 9, { color: '#f0e8ff', outline: '#000' }));
      if (this.typed >= this.text.length && this.t % 30 < 18) T(ctx, '>', left ? bx + bw - 10 : px - 10, by + bh - 11, { color: col });
    }

    drawCaption(ctx, text) {
      const lines = RF.font.wrap(text, 56);
      const h = lines.length * 10 + 10, y = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(30, y, W - 60, h);
      ctx.fillStyle = '#a050ff'; ctx.fillRect(30, y, 2, h);
      lines.forEach((l, i) => T(ctx, l, W / 2, y + 6 + i * 10, { align: 'center', color: '#e8dcff', outline: '#000' }));
    }

    drawTitle(ctx, [big, small]) {
      const k = Math.min(1, this.stepT / 20);
      ctx.fillStyle = `rgba(0,0,0,${0.6 * k})`; ctx.fillRect(0, 70, W, 70);
      ctx.fillStyle = '#a050ff'; ctx.fillRect(W / 2 - 120 * k, 74, 240 * k, 1); ctx.fillRect(W / 2 - 120 * k, 135, 240 * k, 1);
      T(ctx, big, W / 2, 82, { align: 'center', color: '#c8b0e0', outline: '#000' });
      T(ctx, small.slice(0, Math.ceil(this.typed / 1.5)), W / 2, 96, { scale: 3, align: 'center', color: PURPLE, outline: '#14001e' });
    }

    drawChooser(ctx) {
      ctx.fillStyle = 'rgba(10,0,20,0.85)'; ctx.fillRect(0, BAR, W, H - BAR * 2);
      T(ctx, 'WHO STEPS THROUGH THE RIFT?', W / 2, 30, { scale: 2, align: 'center', color: PURPLE, outline: '#000' });
      const n = this.picks.length, per = 7, start = Math.max(0, Math.min(n - per, this.pick - 3));
      for (let j = 0; j < per && start + j < n; j++) {
        const i = start + j, def = RF.getCharacter(this.picks[i]), x = 40 + j * 50, y = 70, sel = i === this.pick;
        ctx.fillStyle = sel ? '#5a10a0' : '#1a1028'; ctx.fillRect(x - 22, y, 44, 80);
        ctx.save(); ctx.beginPath(); ctx.rect(x - 22, y, 44, 80); ctx.clip();
        RF.createSprite(def).draw(ctx, sel ? 'victory' : 'idle', sel ? Math.floor(this.t / 16) % 2 : 0, x, y + 76, 1);
        ctx.restore();
        if (sel) { ctx.strokeStyle = '#ffffff'; ctx.strokeRect(x - 21.5, y + 0.5, 43, 79); }
      }
      const d = RF.getCharacter(this.picks[this.pick]);
      T(ctx, d.name.toUpperCase(), W / 2, 158, { scale: 2, align: 'center', color: '#ffffff', outline: '#000' });
      T(ctx, '< LEFT / RIGHT >   CONFIRM TO CHOOSE', W / 2, 180, { align: 'center', color: '#c8b0e0', outline: '#000' });
    }

    drawCredits(ctx) {
      ctx.fillStyle = '#05000a'; ctx.fillRect(0, 0, W, H);
      drawRift(ctx, W / 2, H / 2, 2.4, this.t);
      ctx.fillStyle = 'rgba(5,0,10,0.7)'; ctx.fillRect(0, 0, W, H);
      let y = this.creditY;
      const line = (txt, o = {}) => { if (y > -20 && y < H) T(ctx, txt, W / 2, y, Object.assign({ align: 'center', outline: '#000', color: '#e0d0ff' }, o)); y += o.gap || 12; };
      line('TERRAMANIA', { scale: 3, color: PURPLE, gap: 30 });
      line('THE LAST BELL', { scale: 2, color: '#c080ff', gap: 40 });
      line('STARRING', { color: '#a050ff', gap: 20 });
      RF.CHARACTERS.forEach((d, i) => {
        if (['bruiser', 'viper'].includes(d.id)) return;
        if (y > -80 && y < H + 100) RF.createSprite(d).draw(ctx, 'victory', Math.floor(this.t / 16) % 2, i % 2 ? W / 2 + 125 : W / 2 - 125, y + 46, i % 2 ? -1 : 1);
        line(d.name.toUpperCase(), { scale: 2, color: '#ffffff', gap: 18 });
        line(d.origin.toUpperCase(), { color: '#a890c8', gap: 56 });
      });
      line('DIRECTED BY', { color: '#a050ff', gap: 12 }); line('YOU AND YOUR FRIENDS', { scale: 2, gap: 30 });
      line('CODE', { color: '#a050ff', gap: 12 }); line('CLAUDE', { scale: 2, gap: 40 });
      line('THANKS FOR PLAYING.', { gap: 30 });
      line('THE BELL HAS STOPPED... FOR NOW.', { color: '#c080ff' });
    }
  }

  RF.StoryScene = StoryScene;
  RF.StoryMenuScene = StoryMenuScene;
})();
