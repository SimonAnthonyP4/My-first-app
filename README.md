# TERRAMANIA

A 2D retro fighting game in the spirit of classic Mortal Kombat and Street
Fighter. Two players, one keyboard. It's built with plain HTML, JavaScript and
Canvas, so there's nothing to install and no build step.

## How to run

**Easiest:** double-click `index.html` to open it in Chrome, Firefox, Edge or
Safari.

**Or with a local web server** (handy later on if you add sound files or sprite sheets):

```bash
cd My-first-app
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

|            | Player 1 (left side) | Player 2 (right side)        |
|------------|----------------------|------------------------------|
| Move       | `A` / `D`            | `←` / `→`                    |
| Jump       | `W`                  | `↑`                          |
| Crouch     | `S`                  | `↓`                          |
| Light      | `F`                  | `Numpad 1` (or `,`)          |
| Heavy      | `G`                  | `Numpad 2` (or `.`)          |
| Block      | `H` (hold)           | `Numpad 3` (or `/`) (hold)   |
| Throw      | `T` (up close)       | `Numpad 4` (or `L`)          |

- **Health:** tanks (Bruiser, Dr. Weissenberg) start at **175%** health, light
  fighters at **100%**. The number is shown on each health bar, and the bars are the
  same size for everyone (`HEALTH_BY_ARCHETYPE` in `js/config/game.js`).
- **Dr. Weissenberg:** his heavy attack is a ranged lightning bolt, not a kick, and his
  block is a crackling electric shield. A character's moves can be overridden with
  `moves: { heavy: {...} }` in `characters.js`; effects live in `js/game/fx.js`.
- **FINISH THEM!** The blow that wins the match leaves the loser dazed for 5 seconds.
  Walk up and press **throw** to do your finisher: Dr. Astuto's **Liberty Bell** (tricorn hat,
  bell from the sky, crack, fireworks, 1776), Jauregui's **Final Grade: F** (a red F,
  then erased from existence), Dr. Weissenberg's **Overcharge**
  (x-ray skeleton, then a pile of ash), Bruiser's **Pile Driver** (head-first into the
  floor) or Viper's **Venom Melt** (a puddle of goo). Hit them normally or wait, and
  it's a plain K.O. (`js/game/finishers.js`, `finisher:` in `characters.js`)
- **FLAWLESS VICTORY** for winning a round without taking damage, **FIRST HIT!** for
  landing the first clean hit, and a rare surprise cameo on big hits.
- **Throws:** press throw right next to the opponent to grab them. Throws can't be
  blocked, but a missed grab leaves you open, and the victim can break free by
  pressing throw right as they're grabbed ("BREAK!"). Each fighter has their own throw:
  Bruiser's **Lunch Line Slam** (overhead slam), Jauregui's **Outlier Removal** (bell curve),
  Dr. Astuto's **Checks and Balances** (catapulted off a balance scale), Viper's **Snake Bite** (three knees and
  a kick), Dr. Weissenberg's **Defibrillator** (electrocution). Numbers are in
  `js/config/throws.js`, animations in `js/game/throw-kinds.js`.
- **Heavy hits knock the opponent back** with a skid (`knockback` in `moves.js`).
- **Combos:** a light attack that connects can be cancelled straight into another
  attack (up to 3 in a row), e.g. light, light, heavy. Each extra hit in a combo
  does a little less damage.
- **Jumping over:** everyone can jump clean over their opponent.
- **Crouch attacks:** crouch + light = quick low jab, crouch + heavy = sweep (knocks down)
- **Blocking high/low:** sweeps must be blocked crouching (down + block); jump attacks must be blocked standing
- `M`: mute / unmute all sound
- **Menus:** `W`/`S` or `↑`/`↓` to move, `Enter` (or a light attack) to pick, `Esc` to go back
- **Character select:** each player moves their own cursor and presses their light attack to lock in, or block to cancel
- `Esc` / `P` in a fight: pause menu (resume, restart, character select, main menu)
- `` ` `` (backtick) in a fight: show hitboxes (green = body, red = attack), for balancing

You can rebind keys in `js/config/controls.js`. Some cheap keyboards can't
register many keys held at once ("ghosting"). If moves drop when you both
mash, try the other P2 key set.

## Perfect block → special move

Tap block **just before** an attack lands (within 8 frames, about 0.13 s) to
pull off a **perfect block**. You take no damage, the attacker staggers, and
your character automatically unleashes their special move:

| Fighter | Special | What it does |
|---------|---------|--------------|
| Bruiser | **Seismic Slam** | Leaps at the opponent and pounds the floor. The shockwave launches them. |
| Viper   | **Venom Spit**   | Spits a glob of venom across the screen. |
| Dr. Weissenberg | **Tesla Surge** | Fires a bolt of electricity from his hands straight across the screen. |
| Jauregui | **Pop Quiz** | Hurls a volley of five math symbols at every height. |
| Dr. Astuto | **VETO** | A giant VETO stamp slams down from the sky onto the opponent. |

Holding block the whole time is a normal block (chip damage, no special), and
mashing block doesn't count. A press only qualifies if it comes at least half a
second after your previous one. Perfect-blocking a projectile works too. The
timing window, mash cooldown and stagger length are in `js/config/game.js`;
each special's numbers are in `js/config/specials.js`.

## Features so far

- One stage: **Hell Cafeteria**
- Two placeholder fighters: **Bruiser** (tank) vs **Viper** (light)
- Walk, jump, light attack, heavy attack, jump attacks, hold-to-block (blocking
  still lets through 10% "chip" damage)
- Hitstun, blockstun, pushback, hit-stop and sparks so hits feel solid
- Health bars at the top, the same size for everyone
- 99-second rounds, K.O. or time-out, best of three. A draw round scores for nobody and is replayed.
- Perfect block → special move (see above)
- Main menu (Fight Now, VS CPU, How to Play, Settings, Credits)
- **VS CPU**: play alone against a computer opponent (Easy / Normal / Hard in Settings).
  The CPU plays by the same rules, including perfect blocks.
- Four stages, each with its own music: **Hell Cafeteria**, **Abandoned NYC Street**,
  **Haunted Court** and **Sirven's Office**, plus a stage select screen (or Random)
- Crouching, crouch jab, sweep, high/low blocking
- Time out: whoever has more health wins the round (exactly equal = replayed)
- Background music per stage and for the menus, plus sound effects, all generated
  live by a small chiptune synth (no audio files). Volume in Settings.
- Character select with 8 slots (6 marked "coming soon" until the roster lands)
  showing each fighter's bio, origin, stats and special. Picking the same
  fighter twice gives P2 an alternate costume.
- VS splash screen, pause menu, end-of-match menu (rematch / character select / main menu)
- Settings: round time, match length (best of 1/3/5), perfect-block difficulty,
  CPU difficulty, music and sound volume, hitboxes. They're saved in your browser.

## Project layout

```
index.html                 entry point (script load order lives here)
css/style.css
js/
  core/                    namespace, helpers, pixel font, keyboard input, saved settings, audio synth
  config/
    game.js                global rules: health, round time, gravity, chip damage…
    controls.js            key bindings
    moves.js               base frame data for light / heavy attacks
    specials.js            special move numbers
    throws.js              each character's throw
    ai.js                  CPU difficulty levels
    music.js               the songs, written as note patterns
    characters.js          ROSTER + ALL PER-CHARACTER STATS  <- balance here
  render/
    poses.js               animation list + placeholder poses
    procedural-sprite.js   generates the placeholder pixel fighters
    sheet-sprite.js        draws real sprite-sheet art (for later)
    sprites.js             picks the renderer per character
    electric.js            lightning / electric shield drawing
    fire.js                pixel fire (title screen)
  stages/
    registry.js            stage system
    cafeteria.js           Stage 1
    nyc-street.js          Stage 2
    haunted-court.js       Stage 3
    sirvens-office.js      Stage 4
  game/
    fighter.js             fighter state machine, physics, hit reactions
    fight-scene.js         round / match flow, collisions, hit detection
    hud.js                 health bars, timer, round markers
    effects.js             hit sparks, floating text
    fx.js                  character effects (lightning heavy, electric shield)
    finishers.js           FINISH THEM! finishers
    throw-kinds.js         throw animations (overhead slam, knee flurry, electrocution)
    special-kinds.js       special move behaviours (projectile, slam, ...)
    ai.js                  the CPU opponent
  scenes/                  title menu, settings, how-to-play/credits, character select, stage select, VS screen
  main.js                  game loop
tools/sprite-viewer.html   preview every animation frame of every fighter
```

## Tweaking balance

Everything per-character is in `js/config/characters.js`:

| stat              | meaning                                                         |
|-------------------|-----------------------------------------------------------------|
| `walkSpeed`       | pixels per frame                                                |
| `jumpPower`       | jump height                                                     |
| `damage`          | multiplier on attack damage (`1.2` = +20%)                      |
| `damageReduction` | damage ignored (`0.2` = takes 20% less, `-0.1` = takes 10% more)|
| `attackSpeed`     | attack speed (`1.3` = 30% faster startup and recovery)          |

Base attack damage and frame data are in `js/config/moves.js`. Global rules
(max health, round time, chip damage) are in `js/config/game.js`.

## Jauregui

The math teacher (light fighter, from Math Dept, Room 314). Her light attacks
are ruler smacks with extra reach; her heavy throws a spinning math symbol
(Σ π √ ∞ ÷ ± Δ ∫) across the screen. Drawn as one front-facing frame and
animated as a fine-detail pixel puppet (`limbScale`, `hideWhenPosed`, `weapon`).

## Dr. Astuto

The AP Gov teacher (tank, from History Wing, Room 1776). Hunched over with a
crooked limping walk (custom `poses` in his sprite config). Light attacks are
cane strikes (crouch + light is a low cane sweep at the ankles); his heavy hurls
the APUSH / AP GOV textbook.

## Adding a character drawn in Piskel

You only need to draw **one standing frame, facing right**. The game animates
it as a "pixel puppet": it moves the head, body and legs and adds blocky arms
and kicks in the same style. Dr. Weissenberg is built this way, and his entry in
`js/config/characters.js` is the template:

- `grid` is the drawing, one string per row. Each letter is a colour named in
  `legend`/`palette`, and `.` is see-through.
- `neckRow` / `waistRow` are where the head ends and the legs start.
- `shoulder` is where the arms attach. `sideHand` lists the hand pixels in the
  drawing, which are hidden while an arm is posed.
- `footCol` is the column the character stands on. `scale: 3` makes each art
  pixel 3 game pixels.

Easiest route: export the frame from Piskel as a PNG and send it over, and it
gets turned into a grid. Open `tools/sprite-viewer.html` to check every
animation frame.

## Swapping in real art

Fighters are drawn through a small sprite interface, so the placeholders can be
replaced one character at a time. Make a PNG sprite sheet with one row per
animation (frames left to right, facing right, all cells the same size), put
it in `assets/sprites/`, and change that character's `sprite` entry:

```js
sprite: {
  type: 'sheet',
  src: 'assets/sprites/bruiser.png',
  frameWidth: 128, frameHeight: 128,
  anchorX: 64, anchorY: 124,          // the pixel in each cell where the feet touch the floor
  animations: {
    idle: { row: 0 }, walk: { row: 1 }, jump: { row: 2 }, light: { row: 3 },
    heavy: { row: 4 }, block: { row: 5 }, hit: { row: 6 }, ko: { row: 7 }, victory: { row: 8 },
  },
},
```

Each row needs these frame counts: idle 2, walk 4, jump 1,
light 3 (startup / hit / recovery), heavy 3, block 1, hit 1,
ko 2 (falling / lying), victory 2, special 3 (wind-up / thrust / floor slam),
crouch 1, crouchBlock 1, lowLight 3, lowHeavy 3, throw 3 (grab / lift / slam). Hitboxes come from `body`/`moves.js`, not
the art, so you may need to retune them after a swap. The `` ` `` key shows them.

## Renaming the game

The title on the main menu and the credits are at the top of `js/config/game.js`.

## Adding a stage

Copy `js/stages/nyc-street.js` to a new file, change the `id`/`name`/`music` and
the drawing code, then add a `<script>` tag for it in `index.html`. It shows up
on the stage select screen automatically.

## Changing the music

Songs live in `js/config/music.js` as note patterns (one bar = 16 steps, e.g.
`'A4 - - C5 . . E5 -'`). Edit the notes or tempo, or add a song and point a
stage's `music` at it.

## Roadmap

1. ~~Project setup + README~~
2. ~~Playable prototype~~
3. ~~Perfect-block special move system~~
4. ~~Main menu + character select~~
5. ~~Second stage (abandoned NYC street)~~ + crouching, VS CPU, music
6. Full 8-character roster
7. Polish: sound, hit effects, balance pass
