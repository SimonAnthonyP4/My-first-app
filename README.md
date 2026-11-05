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
| Launcher   | `W` + `G`            | `↑` + `Numpad 2` (or `.`)    |
| Super      | `F` + `G` together (meter full) | light + heavy together |
| Dash       | double-tap `A` / `D` | double-tap `←` / `→`         |

### PS5 (and other) controllers

Plug a PS5 DualSense in by USB or pair it over Bluetooth **before** opening the game, then
press any button on it once the page is open (browsers only reveal a controller after a
button press). "P1 PS5 CONTROLLER CONNECTED" appears in the corner. The first controller is
player 1, the second is player 2, and the keyboard keeps working, so you can mix and match
(e.g. one player on a controller, one on the keyboard). PS4 and Xbox controllers work the same way.

| Button | Action |
|---|---|
| D-pad / left stick | move, up = jump, down = crouch |
| Square | light |
| Triangle | heavy (Up + Triangle = launcher) |
| Circle or R1 | block |
| Cross or L1 | throw |
| R2 | super (light + heavy together) |
| Options | pause |
| Menus | Cross = OK, Circle = back |

Controllers rumble when you get hit (harder on big hits and supers); turn it off under
Settings → Controller Rumble. Button layout is in `js/config/controls.js` (`Pad1Square`, ...),
the reading code in `js/core/input.js` (`pollPads`). Works in Chrome, Edge, Firefox and Safari;
rumble needs Chrome or Edge.

### Combo system 2.0

- **Smarter input buffer:** presses are remembered for 8 frames of real gameplay, and frames
  frozen in hit-stop or a super cut-in don't count, so links and cancels pressed a bit early
  still come out.
- **Combo routes:** light, light, heavy. A heavy that connects can cancel into an **EX special**
  (THROW), your **super** (LIGHT + HEAVY) or the **launcher** (UP + HEAVY).
- **3-bar meter:** 1 bar = **EX special** (THROW during a combo, or DOWN + THROW on its own;
  15% stronger than a free special), 2 bars = **COMBO BREAKER** (LIGHT + HEAVY while you're
  being comboed: blasts the attacker away), 3 bars = **SUPER**.
- **Wall bounce:** a heavy that drives someone into the corner bounces them back off the wall,
  ready to be launched or juggled (once per combo; on the hazard's wall the hazard wins).
- **Knockdowns and TECH:** launches, sweeps, spikes and throws leave the victim on the floor
  (they can't be hit while down or getting up). Press BLOCK right as you land to quick-rise.
- **Combo trials (Training):** 8 trials from BASIC CHAIN to CORNER CARRY and GRAND FINALE,
  with a checklist that ticks off each step; clearing one moves to the next. Pick a trial
  (or OFF) from the pause menu. Defined in `js/config/trials.js`.

### Combos, air combos and supers

- **Ground combos:** light attacks that connect cancel into another attack (up to 3 in a
  row): light, light, heavy, or end the string with a launcher.
- **Launcher (UP + HEAVY):** an uppercut that pops the opponent into the air. Keep holding
  UP as it hits and you jump after them.
- **Air combos:** in the air, air light attacks chain into each other and finish with an
  air heavy (light, light, heavy). An air heavy on a juggled opponent **spikes** them into the
  floor and they **BOUNCE** back up, so you can land and hit them again. After 8 air hits they
  fall out (no infinite juggles). The combo counter shows **AIR COMBO** and praise
  (NICE! BRUTAL! SAVAGE! INSANE! TERRAMANIA!!).
- **Super meter** (bottom of the screen): fills as you deal and take damage, and from perfect
  blocks; light fighters fill it 35% faster. When it's full, press **LIGHT + HEAVY together**
  for a **Super**: the screen freezes, a cut-in flashes your fighter, and your special fires
  powered up (1.6x damage) wreathed in golden fire. You can also cancel a light attack that
  hit into your super, so combos can end in one. The meter carries over between rounds.
- **Dash:** double-tap forward to dash in (you can attack or throw out of it), double-tap back
  to backdash (untouchable for the first few frames).
- **COUNTER!:** hit someone while their attack (or grab) is still starting up for 25% extra
  damage and extra stun.
- Jumps now take 3 frames to leave the ground; pressing heavy during them gives the launcher.
- The CPU uses all of it (strength depends on difficulty). Every number is in
  `js/config/game.js` (`LAUNCH_JUMP`, `JUGGLE_LIMIT`, `SUPER_DAMAGE`, `METER_GAIN`, ...),
  `js/config/moves.js` (`launcher`) and `js/config/ai.js`.

- **Health:** Mr. Dabalsa starts at **200%**; King Sirven at **125%**; tanks (Bruiser, Dr. Weissenberg, Dr. Astuto) at **175%**; everyone
  else (Viper, Jauregui, El Escobedo, Lady Landa) at **100%**. The number is shown on each health bar, and the bars are the
  same size for everyone (`HEALTH_BY_ARCHETYPE` in `js/config/game.js`).
- **Dr. Weissenberg:** his heavy attack is a ranged lightning bolt, not a kick, and his
  block is a crackling electric shield. A character's moves can be overridden with
  `moves: { heavy: {...} }` in `characters.js`; effects live in `js/game/fx.js`.
- **FINISH THEM!** The blow that wins the match leaves the loser dazed for 5 seconds.
  Walk up and press **throw** to do your finisher: King Sirven's **Royal Decree** (trumpets, a
  decree that you are EXPELLED, a trapdoor, and he takes his golden throne), Mr. Dabalsa's **Exit, Pursued by a Bear**
  (curtains, a bear chases them off stage, THE END, applause), Lady Landa's **Specimen Jar** (shrunk and
  sealed in a jar for her collection), El Escobedo's **Havana Classic** (builds a
  1950s classic car and drives it into them: DALE!), Dr. Astuto's **Liberty Bell** (tricorn hat,
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
  Bruiser's **Lunch Line Slam** (overhead slam), King Sirven's **Permanent Record** (written up,
  slammed shut in the folder twice, EXPELLED), Jauregui's **Outlier Removal** (bell curve),
  Dr. Astuto's **Checks and Balances** (catapulted off a balance scale),
  El Escobedo's **Robotic Arm** (giant claw, power drill, hurled), Lady Landa's
  **Angry Lecture** (screams you across the room), Mr. Dabalsa's **Shall I Compare Thee**
  (recites a sonnet, then smashes you side to side), Viper's **Snake Bite** (three knees and
  a kick), Dr. Weissenberg's **Defibrillator** (electrocution). Numbers are in
  `js/config/throws.js`, animations in `js/game/throw-kinds.js`.
- **Heavy hits knock the opponent back** with a skid (`knockback` in `moves.js`).
- **Every fighter has a unique block:** Bruiser's lunch tray, Viper's shuriken wall,
  Dr. Weissenberg's electric shield, Jauregui's protractor, Dr. Astuto's Constitution
  scroll, El Escobedo's hex force field, Lady Landa's serpent (`blockFx` in `characters.js`,
  drawn in `js/game/fx.js`).
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
| El Escobedo | **Sentry Turret** | Deploys a mini auto-turret that fires a burst of four shots. |
| Lady Landa | **Serpent Strike** | The snake in her jar grows huge and lunges across the screen to bite. |
| Mr. Dabalsa | **Iambic Pentameter** | Five rhythmic stomps (da-DUM) send shockwaves along the floor; the fifth is huge. |
| King Sirven | **Attention Students** | A giant PA speaker drops from the ceiling and blasts the whole screen. Nowhere to run. |

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

## El Escobedo

The engineering teacher (light, from the TCS&P Engineering Lab). Wrench whacks
for light attacks, a quadcopter drone for his heavy, and a **jetpack**: his jumps
use lighter gravity (`jetpack: { gravity }` in `characters.js`), so he hangs in
the air about 50% longer, with flames and smoke.

## Lady Landa

The biology and zoology teacher (light, 100% health, from Bio Lab, Room 666). Evil and always
angry: dark purple smoke rises off her and her red eyes glow (`aura`). Her heavy
is a purple energy blast, and her block is unique: a ghostly serpent rears up
in front of her and lunges, hissing, when something hits it (`blockFx`).

## Mr. Dabalsa

The English teacher (tank, **200% health**, from English Dept, Room 1616). The
biggest, strongest and slowest fighter. Every hit he lands shakes the screen
(`impact` in `characters.js`), his footsteps shake the floor (`stomp`), his
heavy brings the Shakespeare book down like a hammer, and he blocks with the
Complete Works. Calm throughout: he opens with "ALL THE WORLD'S A STAGE." and
wins with "PARTING IS SUCH SWEET SORROW." (`quote` / `winQuote`).

## King Sirven

The principal (boss, **125% health**, from The Principal's Office). He wears a golden
crown at all times, with royal sparkles around him (`aura: 'royalAura'`). His light is a
backhand slap, his heavy hands out a pink DETENTION slip that flies across the room and
leaves you stunned for longer, and he blocks with a gold royal shield ("DETENTION!").
Perfect block → **Attention Students**: the PA speaker comes down and the blast hits you
anywhere on screen. Throw: **Permanent Record**. Finisher: **Royal Decree**. Opens with
"THIS IS YOUR PRINCIPAL SPEAKING." and wins with "SEE YOU IN MY OFFICE."

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

The soundtrack is original heavy metal played by a built-in synth "metal rig"
(`js/core/audio.js`, no audio files): double-tracked distorted rhythm guitars panned
left/right through a high-gain amp and speaker-cabinet simulation, a growling bass, a
metal drum kit (double kick, crash, toms) with room reverb, a lead guitar with vibrato
and echo, and a bus compressor gluing it together.

| Song | Where | Style |
|---|---|---|
| TERRAMANIA | menus | fast downpicked thrash in E minor, gallop section, solo |
| Lunch Line Massacre | Hell Cafeteria | relentless thrash |
| Dead Ball | Haunted Court | slow, crushing drop-D doom |
| Expelled | Sirven's Office | stop-start groove metal |
| Concrete Jungle | NYC Street | fast punk-metal |

Songs live in `js/config/music.js` as note patterns (one bar = 16 steps). On guitar a
note is a power chord, `E2*` is a palm-muted chug, `-` holds, `.` rests. Drums:
`k` kick, `s` snare, `h` hat, `c` crash, `t`/`T` toms.

## Game modes

- **Fight Now:** two players.
- **Arcade:** one player climbs a tower of 5 CPU opponents (easy → hard), then the final boss:
  **King Sirven** in his own office with 40% extra health (if you *are* King Sirven, Mr. Dabalsa
  is the boss). Lose and you can CONTINUE as many times as you like; beat the boss for the ending.
- **VS CPU:** pick your fighter and the CPU's.
- **Training:** no timer, nobody can die, health refills after each combo, your super meter is
  always full, and the screen shows your last combo's hits and damage. Set what the dummy does
  (stand, block, crouch-block, jump, or fight like the CPU) from the pause menu.

## Entrances, hazards, brutalities, costumes and endings

- **Entrances:** before round 1 each fighter makes an entrance with a name card and their
  catchphrase (press LIGHT/ENTER to skip): Dr. Weissenberg is struck down by lightning, Lady
  Landa rises out of purple smoke, El Escobedo lands on his jetpack, Jauregui forms out of
  swirling chalk symbols, King Sirven gets a red carpet and trumpets, Dr. Astuto hobbles in to
  the Liberty Bell, Mr. Dabalsa and Bruiser stomp in shaking the floor, Viper drops from the
  ceiling. (`intro:` in `characters.js`, kinds in `js/game/intros.js`.)
- **Stage hazards:** knock your opponent into the hazard against one wall for extra damage and
  a big launch (it then recharges for 5 seconds): the cafeteria's **deep fryer**, the court's
  **ghost hands**, Sirven's **paper shredder**, the street's **fire hydrant**.
  (`js/game/hazards.js`.)
- **Brutalities:** during FINISH THEM!, instead of the throw finisher, land **5 hits in a row** on
  the dazed opponent and they explode into a shower of their own pixels. Each fighter's has a
  name and colour: Food Fight, Venom Burst, Short Circuit, Divided by Zero, Unconstitutional,
  System Overload, Dissection, Tragedy in Five Acts, Zero Tolerance. Stop hitting and it's a
  plain K.O. (`brutality:` in `characters.js`.)
- **Costumes:** press HEAVY on character select to cycle CLASSIC, REMIX, TOXIC, SHADOW (a living
  silhouette with glowing eyes) and GOLDEN (a solid gold statue). Mirror matches with the same
  costume automatically give player 2 the next one. (`RF.COSTUMES` in `js/render/sprites.js`.)
- **Arcade endings:** every fighter has their own ending story, typed out when you beat the
  tower (`ending:` in `characters.js`).

## Announcer

A deep arena voice calls the fight: fighter names on the versus screen, "ROUND ONE... FIGHT!",
"FINISH THEM!", "K.O.", "<NAME> WINS. FLAWLESS VICTORY!", supers, and big combos
(BRUTAL! SAVAGE! INSANE! TERRAMANIA!). It uses the browser's built-in speech voice
(`js/core/announcer.js`) and can be turned off in Settings → Announcer Voice.

## Roadmap

1. ~~Project setup + README~~
2. ~~Playable prototype~~
3. ~~Perfect-block special move system~~
4. ~~Main menu + character select~~
5. ~~Second stage (abandoned NYC street)~~ + crouching, VS CPU, music
6. Full 8-character roster
7. Polish: sound, hit effects, balance pass
