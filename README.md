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

### Kombos and controller feel

- **Kombo strings:** LIGHT, LIGHT, HEAVY = **KOMBO!** (harder hit, big knockback into a wall bounce).
  LIGHT x3, HEAVY = **BRUTAL KOMBO!** - it launches them; hold UP to chase into an air combo.
  Strings hold together for every fighter: chained hits step forward, push less and hold the
  opponent long enough for that fighter's next hit (even the slow ones). Up to 4 chained hits.
- **Controller stick:** the left stick reads as an 8-way arcade stick (small round dead zone,
  45-degree sectors, no flicker), so diagonals and crouch-walking work.
- **Special-move motions** accept down-back / down / down-forward, with a wider timing window.
- Attack presses are buffered for 10 frames.

### Tournament

Title menu -> **TOURNAMENT**: a bracket for a party. Pick **4 or 8 entrants** and how many are
people; each person picks a fighter, the empty spots are random CPU fighters, and everyone is
shuffled into a bracket (quarter-finals, semi-finals, final). People take turns on the keyboard /
controllers: against the CPU a person always plays on the left (P1 keys / controller 1); person vs
person is left = P1, right = P2. CPU vs CPU matches can be watched or simmed. Every fight is on a
random stage; the winner gets a CHAMPION screen with a trophy (`js/scenes/tournament-scene.js`).

### Stages

Eleven stages, each with a hazard against one wall (knock someone into it). The newer fighters'
home turf (`js/stages/home-stages.js`):

| Stage | Home of | Hazard |
|---|---|---|
| Friday Night Lights | Mikey | tackling sled - SACKED! |
| Music Room | Wuttke | a giant gong - GONG! |
| The Back Nine | Tyler | the pond - WATER HAZARD! |
| South Beach | Gabriel | lifeguard stand, a crashing wave - WIPEOUT! |
| Bro Batch HQ | Anthony & Nicholas | the protein-bar press - PRESSED! |
| The Crag | Alejandro | falling rock - ROCKFALL! |
| Parking Lot | Fernando | the dumpster - TRASHED! |

### Online play

Title menu -> **ONLINE**. One player presses **HOST A MATCH** and gets a 4-letter code; the other
types it and presses **JOIN**. The host is P1 (left), the guest P2 (right); each of you plays with
your own keyboard (either key set) or controller. Everything after that - character select, stage
select, the fight, rematches - is shared. Pick ONLINE again (or close the tab) to leave.

- Works in the **published game page on claude.ai**: both players signed in, and your friend needs
  access to the artifact (invite them from the Share menu, or be in the same organization). People
  opening a public link can't join rooms.
- How it works (`js/net/online.js`): lockstep netcode over the artifact's live room. Both computers
  run the same game; each sends only its button presses for each frame, a few frames ahead (the input
  delay adapts to the connection, ~0.1-0.25 s). Randomness during a frame comes from a shared seed and
  the host's match settings are copied to the guest, so both games stay identical; a checksum each
  second shows OUT OF SYNC if they ever drift.

### Phones and tablets (touch controls)

Open the game on a phone or tablet and an on-screen controller appears by itself (best sideways;
portrait works too, with the controls under the picture):

- **Left: a stick.** Eight ways, like an arcade joystick - roll your thumb from down to forward
  for a quarter-circle. Up jumps, down crouches.
- **Right: the fighting buttons**, with the same symbols and colours as the story's quick-time
  prompts: **LIGHT** (pink square), **HEAVY** (green triangle), **BLOCK** (red circle), **THROW**
  (blue cross), plus **DASH**, **EX**, **SUPER** (light + heavy together) and **TAUNT**.
  Every button is multi-touch, and you can slide a thumb from one button to the next.
  Last Stand is hold EX, then tap SUPER.
- **Top corner: sound, fullscreen (where the browser allows it) and pause.** Hold PAUSE in the
  story to skip a scene.
- **Menus are tapped.** Tap a row to use it, tap a roster portrait to point at it and again to
  pick it, tap the sides of the stage preview to flip through stages and the middle to fight, tap
  the story to read on. In menus the controller quiets down: LIGHT becomes OK, BLOCK becomes BACK.
- **Settings -> TOUCH CONTROLS:** AUTO (shown on touch screens, hidden when you use a keyboard
  or controller, back on the next touch) / ALWAYS ON / OFF; button size; which side the stick is on.

One phone is one player: it drives player 1 (VS CPU, the story, Arcade, Survival, the Rift Tower,
Training and Online all work). Two people on one phone is not a thing - use a keyboard or controller
for player 2.

How it works: `js/core/touch.js` makes the buttons press the same virtual keys the keyboard does
(`kb.press` / `kb.release` in `input.js`), so nothing else in the game knows. Its CSS is injected
by the script, `main.js` asks it to size the canvas, and menus read taps through
`RF.touch.takeTap()` (`ListMenu` finds rows from `menu.area`; scenes that draw their own list set it).
Words that name keys ("PRESS ENTER", "HOLD ESC") are rewritten to what is on the buttons.

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
| Circle or L1 | block |
| Cross | throw |
| R1 | dash (hold back for a backdash) |
| L2 | EX special (1 bar), no motion needed |
| R2 | super (light + heavy together); combo breaker while you're being hit |
| Create or touchpad | taunt |
| Options | pause |
| Menus | Cross = OK, Circle = back |

Controllers rumble when you get hit (harder on big hits and supers); turn it off under
Settings → Controller Rumble. Button layout is in `js/config/controls.js` (`Pad1Square`, ...),
the reading code in `js/core/input.js` (`pollPads`). Works in Chrome, Edge, Firefox and Safari;
rumble needs Chrome or Edge.

### Command specials, taunts, tank armor, camera, stage transitions

- **Two command specials per fighter:** DOWN, FORWARD + attack and DOWN, BACK + attack (no meter).
  A ground attack that connects can cancel straight into one. Built from move types in
  `js/game/special-kinds.js` (rush, teleport, rising anti-air, counter stance, projectile, slam);
  the moves and who has them are in `js/config/commands.js`.

  | Fighter | Down, Fwd + Atk | Down, Back + Atk |
  |---|---|---|
  | Bruiser | Tray Charge (rush) | Ladle Uppercut (anti-air) |
  | Viper | Fang Rush (rush) | Smoke Step (teleport behind + strike) |
  | Dr. Weissenberg | Ball Lightning (slow orb) | Static Uppercut (anti-air) |
  | Jauregui | Delta Force (projectile) | Square Root (anti-air) |
  | Dr. Astuto | Objection! (counter stance) | Gavel Slam (leaping slam) |
  | El Escobedo | Rocket Boost (jet rush) | Drone Strike (projectile) |
  | Lady Landa | Hex Step (teleport behind + strike) | Cobra Rise (anti-air) |
  | Mr. Dabalsa | To Be Or Not To Be (counter stance) | Sonnet Slam (leaping slam) |
  | King Sirven | Hall Pass (teleport behind + strike) | Suspension (rush) |
  | Holbrook | Tectonic Uplift (anti-air) | Jet Stream (rush) |
  | Simon | Spinning Elbow (rush) | Skip Knee (anti-air) |
  | Anthony | Blink (teleport behind + strike) | Bar Toss (protein bar projectile) |

- **Taunt:** `R` (P1) / `Numpad 5` or `K` (P2) / CREATE on a controller. Each fighter has a line
  and voice; finish it for a quarter bar of meter, but you're wide open (hits on you are COUNTERs).
- **Tank armor:** Bruiser, Dr. Weissenberg, Dr. Astuto and Mr. Dabalsa absorb ONE hit while
  winding up or swinging a heavy ("ARMOR!", 60% damage, no flinch). Throws still beat it.
- **Move list:** pause -> MOVE LIST shows both fighters' full move lists.
- **Dynamic camera:** zooms in when the fighters are close, eases out when they're apart or high
  in the air, and punches in on supers, finishers and stage transitions (Settings -> Dynamic Camera).
- **Stage transitions:** some walls are breakable (cafeteria's right wall -> Haunted Court, the
  court's left -> back to the cafeteria, Sirven's office right -> NYC street, the street's left ->
  the office; the other walls have hazards). Heavy them into a breakable wall for a WALL BOUNCE,
  then catch them with another heavy, a command special or a special before they land (or hit them
  into it with a super) and they smash through: the screen wipes, they crash down into the next
  stage for extra damage and the new stage's music kicks in. (`RF.STAGE_LINKS` in
  `js/game/fight-scene.js`.)

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

- **Health:** Mr. Dabalsa starts at **200%**; King Sirven, Holbrook and Anthony at **125%**; tanks (Bruiser, Dr. Weissenberg, Dr. Astuto) at **175%**; everyone
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
  core/                    namespace, helpers, pixel font, keyboard input, touch controls, saved settings, audio synth
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

## Holbrook

The AP Human Geography teacher (all-round, **125% health**, from Social Studies, Room 7). Holds a
desk globe that moves into his attacking hand.

- **Light: Migration.** Curved, dashed migration-flow arrows stream out of his hand while a flock
  of birds sweeps back toward him. A clean hit **pulls** the opponent in instead of pushing them
  away (`pull` in `moves.js`), so his strings stay close.
- **Heavy: Urban Sprawl.** A city erupts from the ground and spreads forward: skyscrapers with
  lit windows at the front, suburbs sprawling behind. It **grows taller, wider and stronger the
  farther it spreads** (`grow` on the projectile), and knocks down.
- **Block: Sovereign Border.** A towering glowing wall of dashed border lines, a latitude grid,
  drifting continent outlines and flags. Attackers who hit it get **shoved back across the
  border** (`blockRepel`).
- **Special: Continental Drift.** The floor cracks and a whole continent (mountains, snowy peaks,
  rock strata) slides across the stage like a tectonic plate.
- **Throw: Mercator Projection.** Wrapped around a giant spinning globe, then flattened onto a
  stretched Mercator map and kicked off the edge of the world.
- **Finisher: Annexation.** A world map unrolls, a giant pushpin skewers the loser into it, and
  the map is rolled up and filed away.
- **Entrance:** flies in along a dotted flight path on a little plane. **Brutality:** Tectonic
  Shift.

## Simon

The Muay Thai fighter (light, 100% health, from The Gym, After School). Fights from the classic
bouncing stance with his **front leg lifted**: it bobs up and down on its own while he bounces on
his back foot (`liftLeg` + `liftOff` in the sprite, a fast 4-frame idle), and it's the leg that
throws his kicks.

- **Agile:** the fastest walk and attacks in the game (`attackSpeed 1.4`), a longer dash
  (`dashBoost`) and a **double jump** (press UP again in the air; `doubleJump`).
- **Light:** jab / cross / elbow, very fast and very close; strings chain up to **5 cancels**
  (`maxChain: 5`) instead of 3.
- **Heavy:** a Thai roundhouse off the raised leg: fast for a heavy, close range, big knockback.
  Down + heavy is a low kick.
- **Block: Shin Check.** Crossed forearms and a raised shin glowing with Sak Yant-style gold.
  He recovers from blocks 40% faster (`blockstunScale`), so he can block and strike right back.
- **Special: Flying Knee.** Springs off the back foot and flies across the stage knee-first.
- **Throw: Thai Clinch.** Five knees in the clinch, then a push kick.
- **Finisher: Art of Eight Limbs.** Fists, elbows, knees and shins counted out one by one
  (1! FIST ... 8! SHIN), then a kick into orbit: a twinkle in the sky.
- **Entrance:** kneels in the Wai Kru ritual among rising golden sparks, then rises into his
  stance. **Brutality:** Elbow Storm.

Character select is now a 6 x 2 grid (12 slots).

## Anthony

The ultra sorcerer and CEO of Bro Batch protein bars (sorcerer, **125% health**, from Bro Batch
HQ). He **always floats**: hovering above the floor with a gentle bob while his shadow stays on
the ground (`hover` / `hoverBob`), with floaty, slow-falling jumps (`airGravity`). A crimson magic
circle turns behind his head and pink flames dance in his open hands (`aura: 'sorcererAura'`).

- **Light: Arcane Burst.** A spinning sigil blasts out of his palm: mid range, and it chains.
- **Heavy: Crimson Hex.** A slow, heavy magic orb that **homes in** on the opponent's height
  (`home` on the projectile), so jumping over it doesn't save you.
- **Block: Arcane Ward.** A spinning hexagram shield that **reflects projectiles** back at
  whoever threw them ("REFLECTED!", `reflect: true`).
- **Special: BRO BATCH.** A portal opens above the opponent and rains down a fresh batch of giant
  branded protein bars, finishing with a MEGA bar that launches them.
- **Throw: Protein Shake.** Levitated into a crimson vortex and shaken like a blender.
- **Finisher: Bulk Order.** A portal drops a whole shipment of BRO BATCH crates on the loser,
  stamped DELIVERED, then he floats there eating a bar.
- **Entrance:** rises out of a glowing summoning circle in a pillar of light. **Brutality:**
  Protein Overload.

## Chris

Very rich, very spoiled (rich kid, 100% health, from the Penthouse, Top Floor). Everything he
does is money.

- **Money talks:** builds super meter 30% faster (`meterRate`).
- **Light: Money Slap.** Slaps you with a stack of cash; bills fly everywhere ("ka-ching").
- **Heavy: Black Card.** Flicks a spinning black-and-gold credit card across the screen. Fast.
- **Block: Bodyguard.** A guy in a black suit and shades steps in ("NOT TODAY.") and Chris takes
  **no chip damage** (`noChip`).
- **Special: Make It Rain.** Gold bars and cash rain down on the opponent; the last one is a
  giant 24K bar.
- **Command specials:** Coin Flip (DOWN, FWD + attack: a spinning gold coin) and **My Lawyer**
  (DOWN, BACK + attack: a counter stance - hit him and his lawyer hits back).
- **Throw: Hostile Takeover.** A contract in your face, stamped ACQUIRED, a wad of cash, SOLD.
- **Finisher: Bought Out.** He snaps his fingers and an avalanche of cash buries the loser.
- **Taunt:** "WHERE THE ZA". **Entrance:** pulls up in a white stretch limo.
  **Brutality:** Market Crash.

Character select is now a 7 x 2 grid (14 slots).

## Ruano

AP European History, AP Art History and AP Spanish, from Madrid (angel, **125% health**). Gentle,
endlessly knowledgeable, and an actual angel: a golden halo floats over her head and soft wings
gently beat behind her (`aura: 'angelAura'`). Slow but powerful: the lowest attack speed and the
hardest hits, and like the tanks she shrugs off one hit during a heavy (`armor`).

- **Light: Brushstroke.** A sweeping arc of red, yellow and blue paint.
- **Heavy: Golden Frame.** A huge gilded picture frame brought down overhead.
- **Block: Rose Window.** A glowing stained-glass cathedral window. **GRACE:** every blocked hit
  heals her a little (`blockHeal`).
- **Special: Divine Touch.** The clouds part over the opponent and a giant painted hand reaches
  down (Creation of Adam style) and strikes them with holy light.
- **Command specials:** Flamenco Fan (a spinning red fan) and Ascension (anti-air: she rises on
  her wings).
- **Throw: History Lesson.** 1492! 1517! 1789! - every date hits - then a wing gust: CLASS
  DISMISSED.
- **Finisher: Masterpiece.** She paints the loser into a gilded museum painting: "THE DEFEATED" -
  Ruano, oil on canvas. Applause.
- **Taunt:** "OLE! MUY BIEN." **Entrance:** descends from heaven in a beam of light.
  **Brutality:** Renaissance.

The roster is 14 fighters; character select (7 x 2) is full.

## Tamayo

The government teacher (defensive, **130% health**, from Government, Room 1787). Very cocky: he
laughs at you when you hit his guard ("HA!", "TOO EASY!", "IS THAT IT?"), laughs when he lands a
5-hit combo, and every taunt is a random government joke ("YOU FIGHT LIKE A GRIDLOCKED
CONGRESS."); he cracks a new one at the start of every round (`laughs`, `jokes`).

- **Defensive:** **Unbothered** - standing still with his arms crossed for half a second, he
  auto-blocks the next standing attack (lows and throws still work; `unbothered`). Blocking also
  builds his super meter (`blockMeter`).
- **Combos:** strings of up to **6** (`maxChain`), his heavy cancels into more attacks, and his
  combos lose damage half as fast as everyone else's (`comboScaling`).
- **Light: Lanyard Whip.** His school ID badge swung on its lanyard.
- **Heavy: Executive Order.** A straight punch that lands with an official red stamp.
- **Block: Access Denied.** A giant laminated ID badge flashing NO / ACCESS DENIED.
- **Special: Filibuster.** He starts talking and never stops: BLAH BLAH BLAH... AND ANOTHER
  THING... FURTHERMORE... - eight hits.
- **Command specials:** Pocket Veto (counter stance: VETOED!) and Gerrymander (redraws the lines
  and appears behind you: REDISTRICTED).
- **Throw: Citizen's Arrest.** Handcuffs, "YOU HAVE THE RIGHT TO REMAIN SILENT", "ANYTHING YOU SAY
  IS ALSO WRONG", HA HA HA, shove.
- **Finisher: Impeachment.** A giant gavel slams down three times - ORDER! ORDER!! IMPEACHED! -
  flattening them more each time, while he stands there with his arms crossed. HA HA HA! CASE
  CLOSED.
- **Entrance:** strolls in slowly with his arms crossed, then laughs. **Brutality:** Landslide
  Victory.

## Nicholas

The second Bro Batch CEO (boxer, **100% health**, from Bro Batch HQ). Anthony's business partner,
Mathnasium tutor and gym rat. Inspired by classic underdog boxers, but his own design: the **shortest
fighter** in the game (body height 64), and he never walks. Moving forward or back is a **full
sprint** with dust kicking up behind him (`sprint`).

- **Boxing:** lightning-fast jabs and crosses, strings of up to 4, peek-a-boo guard (shorter
  blockstun). His air game is weak on purpose.
- **Power meter:** every hit fills a star bar over his head. When it is full, his next heavy is a
  **MAX GAINS** star uppercut that launches.
- **Special: Problem Set.** Sprints in for 7 punches that double each time (1, 2, 4 ... 64) and
  ends with an EXPONENTIAL! uppercut.
- **Command specials:** Dash Straight (sprinting straight punch) and Slip Counter (TOO SLOW!).
- **Throw: Spot Me.** Bench-presses them for three reps: NEW PR!
- **Finisher: Final Bell.** A boxing-ring knockout with the bell. **Brutality:** One Punch.
- **Entrance:** sprints in from off screen. **Taunt:** LIGHT WEIGHT, BABY!
- **Bro Batch:** special lines with Anthony on entrance, taunt and win, matching banter, and when
  the two meet the announcer calls it a **BRO BATCH CIVIL WAR!**

The roster is now 16 fighters and the 4 x 4 character select is full.

## Mikey

Sports fanatic, mostly American football (linebacker, **135% health**, from the Football Field).
Big, very strong and way faster than he looks; every hit he lands shakes the screen, and his
heavy plows through a hit. Taunts: "HUT! HUT! HIKE!", "I EAT LINEBACKERS FOR BREAKFAST."

- **MIKEY SMASH:** getting hit (and landing hits) fills a green rage meter over his head. When it's
  full he turns huge and green for 7 seconds - 30% more damage, faster, and super armor on every
  attack (`hulk` in characters.js).
- **Light: Stiff Arm.** **Heavy: Haymaker** - a huge wind-up punch (POW! / SMASH!).
- **Block: Belly Block.** He blocks with his stomach - it wobbles and bounces attackers back. BOING!
- **Special: Hail Mary.** A football in a perfect spiral at full speed.
- **Command specials:** Blitz (a linebacker tackle charge) and Hulk Leap (leaps in and smashes the
  floor; the shockwave launches).
- **Throw: Touchdown Spike.** Tucks them under his arm, runs downfield, TOUCHDOWN! - spike.
- **Fatality: Puny.** Turns green, grabs them by the ankles and slams them into the floor side to
  side, then one last SMASH. PUNY. **Entrance:** busts through a paper team banner.

## Alejandro

Rock climber and thrill seeker (daredevil, **100% health**, from the Climbing Wall). Fast, a
double jump, 5-hit strings and a strong air game; chalk puffs off his hands. Taunts: "SEND IT!",
"THAT WAS A V2. EASY.", "FEAR IS JUST A CHECKPOINT."

- **Wall jumps:** in the air against the edge of the stage, hold toward the wall to slide down it
  slowly, and press UP to kick off it - up to 3 times in one jump (`wallJump`). WALL JUMP!
- **Light: Chalk Jab.** **Heavy: Carabiner Swing** - a rope whipped out with a steel carabiner
  on the end (long reach).
- **Block: Rope Guard.** A spinning coil of rope. ON BELAY.
- **Special: Belay Yank.** Throws a rope with a hook across the screen; if it catches them it
  reels them right in front of him (GOT YOU!) for a follow-up.
- **Command specials:** Dyno (a leaping lunge punch) and Free Solo (a soaring uppercut).
- **Throw: Belay Drop.** Clips them to the rope, hauls them up toward the ceiling - ROCK! - and
  lets go.
- **Fatality: Summit.** A cliff rises behind them; he hauls them all the way up, plants a flag
  (SUMMIT!)... OFF BELAY. **Entrance:** rappels down from the ceiling.

## Lopez Tuero

Calculus genius and multiversal threat (omniscient, **125% health**, from Every Universe). Math
symbols orbit him; he stands perfectly still, calculating. Taunts: "SHOW YOUR WORK.", "IN EVERY
UNIVERSE, YOU LOSE.", "I AM THE CONSTANT. YOU ARE THE VARIABLE."

- **Foresight:** 12% of attacks that would hit him while he's idle or walking, he already
  calculated - he blinks behind you instead. CALCULATED.
- **Light: Derivative.** A flick that leaves a glowing tangent line - D/DX.
- **Heavy: Integral Strike.** A giant integral sign slashes down through them.
- **Block: Asymptote.** Graph axes and a curve your attack approaches but never reaches.
- **Special: Riemann Sum.** Seven glowing rectangles erupt from the floor under them one after
  another (each hits); the last launches. SUM = YOU LOSE.
- **Command specials:** Taylor Series (a volley of math symbols) and Multiverse Swap (teleports
  behind you: WRONG UNIVERSE.).
- **Throw: Proof by Contradiction.** GIVEN: YOU. ASSUME YOU CAN WIN. ... CONTRADICTION. Q.E.D.
- **Fatality: Divide by Zero.** Reality falls away into a cosmic void of equations; copies of them
  from other universes glitch in; LET X = YOU... X / 0 - reality cracks and they blow apart.
  UNDEFINED. **Entrance:** steps out of a rift in reality.

Character select is now 8 x 3 (24 slots).

## Wuttke

The music teacher (maestro, **120% health**, from the Music Room). Piano, orchestra, all of it.
Music notes drift around him and he sways to the beat; every taunt is a music-teacher line
("YOU ARE FLAT.", "TEMPO! TEMPO!").

- **Crescendo:** every hit of a combo is louder than the last - +6% damage a hit, up to +42%.
- **Light: Staccato.** A quick lute strum spraying notes. **Heavy: Fortissimo.** One huge chord, a
  blast of sound (FF!). Attacks are conducted with a baton.
- **Block: Music Staff.** A wall of five-line staff - REST.
- **Special: Grand Piano.** Conducts a grand piano out of the sky onto them (a shadow shows where);
  PLONK!, and it smashes into flying keys.
- **Command specials:** Treble Clef (a big flying eighth note) and Rest (counter: TAKE A REST.).
- **Throw: Lute Solo.** A face-melting solo (every note stings), then ENCORE! with the lute.
- **Fatality: Grand Finale.** Beethoven's Fifth: DUN, DUN, DUN, DUNNNN - a giant note slams on
  every beat - then a grand piano crushes them. BRAVO! **Entrance:** strolls in strumming -
  GOOD MORNING, CLASS.

The roster is 20 fighters; the 10 x 2 select is full.

## Gabriel

Pure energy from Miami (hyper, **105% health**, from the 305). Fast everything, a double jump,
5-hit strings, and he bounces on his toes; psychic sparks crackle around him. Gym rat.

- **MR. SUPPLIER (alter ego):** taunt with **2 bars** to transform for 8 seconds - shades on, gold
  glow, a MR. SUPPLIER tag with a timer, **25% more damage** and **30% more speed**
  (`alterEgo` in characters.js). "YOU NEED IT? I GOT IT."
- **Light: Energy Jab.** A crackling cyan jab. **Heavy: Psi Punch.** A telekinesis-boosted punch.
- **Block: Mind Shield.** A rippling force field. NOPE!
- **Special: Mind Slam (telekinesis).** Grabs them from across the screen with his mind, floats
  them up, then SLAMS them into the floor. Blocking breaks the grip.
- **Command specials:** Ocean Drive (neon rush) and Mind Lift (psychic uppercut).
- **Throw: Mind Spin.** Lifts them overhead and spins them like a ceiling fan, then hurls them.
- **Fatality: Mind Blown.** A Miami sunset fades in; he lifts them, squeezes... they explode.
  WELCOME TO MIAMI. **Entrance:** blinks in with psychic energy - LET'S GOOOOO!

Character select is now 10 x 2.

## Cinematic supers

A full super meter (LIGHT + HEAVY) now stops the fight for a short film: a full-screen card in
the fighter's colours, the fighter sliding in huge, the name of the super slamming down, their
line (spoken), a close-up on the eyes, then the move. The first super each fighter uses in a
match gets the whole sequence; later ones use a short cut. When a super connects the screen
snaps to a negative and speed lines burst from the hit.

Every fighter has their own super name, line, colour and backdrop in `RF.SUPERS`
(`js/game/super-cinema.js`) - MAX GAINS, ROYAL DECREE, INTEGRAL TO INFINITY, ZERO TOLERANCE...
In **Tag Team**, a super with your partner still standing is a **TEAM SUPER**: both of you on
the card, and the partner charges in behind the move. Ten pairs have a team super with its own
name (Nicholas + Anthony: BRO BATCH BLITZ; Ms. Brady + King Sirven: THE ADMINISTRATION).

## The Rift Tower (boss rush)

Main menu -> **RIFT TOWER**. Ten floors of rift versions of the cast, one round each, and every
floor changes the rules: LOW GRAVITY, LIGHTS OUT (you only see what is close to you), GLASS
JAWS (triple damage), TURBO, PROTEIN MODE, DOUBLE HEALTH, a MIRROR MATCH against yourself, and
Rift King Sirven halfway up. Your health carries over (30% patched up after each win); lose and
you retry the floor. At the top is **OMEGA LOPEZ**, who gets back up once in a stronger final
form. Clearing the tower unlocks the **RIFT costume** for every fighter (HEAVY on character
select). Your best floor is saved. The mode lives in `js/scenes/tower-scene.js`.

## Tag Team (2 vs 2)

Main menu -> **TAG TEAM**. Each side picks two fighters (THROW on the select screen switches
between playing the computer and a second player). The first pick starts; the second waits on
the bench.

- **TAUNT** tags your partner in - they arrive swinging (4 second cooldown).
- **DOWN + TAUNT** calls your partner for an **assist**: they charge across the stage (7 seconds).
- The partner on the bench slowly recovers up to a quarter of their health (the pale part of
  their small bar). Super meter is shared by the team.
- When a fighter is knocked out their partner steps in. A team loses when both are down, and
  only the last one standing can be finished. One long round, no timer.
- The computer's team tags out when hurt and calls assists from range.

The mode lives in `js/game/tag-team.js`; the fight itself is the normal FightScene.

## Story Mode: THE LAST BELL

Main menu -> **STORY**. A generational, cinematic campaign you **play**: **29 chapters** across
three generations of the school, about 690 spoken lines per playthrough, **30 quick-time
moments**, **12 choices the story remembers**, **18 fights** (most of them in the middle of a
scene), **5 deaths** and **3 endings**.

**The story.** The school bell was cast by the first graduating class in 1961, and every class
since has signed the inside of it. On their last day it rings once - the last bell - and they
walk out the doors. Lopez Tuero's first class did that twelve years ago and, as far as he knows,
never came back. So at midnight he rings the bell and steps between the universes.

The school thinks the bell is broken. It is not. In the room between universes there is no
clock: one morning for the school is four hundred years for him. By the time anyone looks up he
is **THE HEADMASTER** - crowned, on a throne, with an army called **the Forgotten** (every student
he "kept", for so long that he no longer remembers their faces, so they no longer have any) and
three lieutenants: **the Proctor**, **the Bell Ringer** and **the Eraser**. He does not kidnap
people. He offers each of them the thing they are most afraid to lose, and they walk. And when he
keeps someone, **the school forgets them** - the name, the face, the chair - which is why nobody
knows there is a war on.

The way back is the bell itself. Rung backward, it takes you to the day a thing began: *you may
look, you may listen, you may not stay.* And rung backward for everyone at once, it calls every
class that ever was.

| # | Chapter | What happens | You play |
|---|---|---|---|
| 0 | Midnight | cold open; the bell; an empty chair in a room between universes; the opening titles | - |
| 1 | The Day Before | one last normal lunch at the corner table | choice |
| 2 | Bro Batch | how Nicholas and Anthony met; Rift Chris | slip, jab, cross, uppercut; fight; choice |
| 3 | Lockdown | Brady and Sirven on the radio; Sirven's secret last year | STOP.; fight; choice |
| 4 | 1994 | young Mr. Sirven's first day; Principal Ortega and the bell; a freshman named Brady | - |
| 5 | Street Level | Bandy and Fernando; "this school kept me" | board swing, flick it; fight; timed choice |
| 6 | Game Day | Simon and Mikey; the scholarship | duck, tackle, flying knee; fight; choice |
| 7 | **The Headmaster** | the throne, the Forgotten, the three. He has been listening to all of them. **Chris walks** - and the next day there are eight chairs at the table and nobody can say why it feels wrong | a "say no" that cannot be won |
| 8 | The King's Chair | Rift Tamayo is sitting in the principal's chair | pull rank; **King Sirven vs Rift Tamayo** |
| 9 | The Faculty Meeting | LOPEZ. TUERO. They decide it is one man in one gym. Ms. Brady counts thirty names and twenty-nine students | - |
| 10 | The Student Teacher | young Lopez, the proof, the four kids nobody else would tutor | - |
| 11 | Every Universe | his first class leaves; he says it from the throne now | - |
| 12 | The Bell Tower | the signatures inside the bell; the rope is wound the wrong way | forgive him; fight |
| 13 | Three Anchors | Wuttke's chord, Holbrook's map, Tyler's swing | the swing |
| 14 | **The Collection** | Gabriel on a snack run buys nine of everything for a table of eight. The Eraser. An offer: a room that is never quiet | **Gabriel vs the Eraser**; choice |
| 15 | The Climb | a free climb up the crag, no rope | reach, pull up; **Alejandro vs Rift Lady Landa** |
| 16 | Ms. Brady's First Day | thirty-two detentions; the walkie-talkie is a chain | - |
| 17 | Show Your Work | "I was proud of you." "Then why did you never say it?" | jump; **Jauregui vs Lopez (1/3)**; timed choice |
| 18 | **Doomsday** | seven go in to talk to one sad man. It is not a gym, and it is not one man. Anthony takes the crown so that Nicholas never eats alone in any universe - and Nicholas forgets him mid-sentence. **Fernando holds the door** | **a fight you cannot win: survive**; reach him; hold the door |
| 19 | Inside the Crown | what the crown shows the people who wear it | choice |
| 20 | The Last One Out | Nicholas does not know who wrote the labels. Mr. Urbanik works out that people have been cut out of them. Sirven volunteers | choice |
| 21 | **Rung Backward** | three tolls. **1994**: Ms. Brady meets herself, and the Proctor comes for the girl. **September 2016**: his first class came back to thank him - he had driven four hours to surprise *them* - and the card they left has been in Jauregui's desk for twelve years. **Three years ago**: the corner table, and a boy with no face | **Ms. Brady vs the Proctor**; say his name; stay |
| 22 | The Night Before | the crag, a phone call home, a song, the letter, locking up one last time | - |
| 23 | **All Rise** | he brings the throne to them: twenty against four hundred and twelve. **Dabalsa holds the stairs.** "This is your principal speaking. All classes. All years." - and every class that ever was walks out of the light | **tag: Simon + Bandy vs the Forgotten**; **survive the Bell Ringer** |
| 24 | **Roll Call** | the Forgotten are not fought, they are called by name. **Lady Landa. Chris. Mr. Wuttke.** Gabriel claps on the wrong beat. "Is this seat taken?" - asked the other way round | **Alejandro vs the Eraser**; **tag: Sirven + Brady vs the Bell Ringer + the Proctor**; **Mikey vs ? ? ?**; **Nicholas vs Crowned Anthony**; say his name (x3); choice; the handshake |
| 25 | The Last Bell | he takes their names one at a time. One teacher walks through it holding a card. Who his three lieutenants were. A crown that will not come off; someone has to hold the door | remember him; choose who goes (15, each with their own line); **you vs THE HEADMASTER**; **the ending** |
| 26 | Graduation | five names are read before any other; a different graduation for each ending | caps up |
| 27 | Twenty Years Later | everyone comes back; a new kid is alone at the corner table | - |
| 28 | The Next Bell | the walkie-talkie changes hands; credits; a scene after the credits for each ending | - |

A save from the older 24-chapter story is moved to the same chapter in the new order the first
time the game loads (by chapter name), but the middle of the story is new: NEW STORY is the way
to see it.

**Quick-time events** (`js/scenes/story-play.js`). The action scenes are played, with the
controller's own symbols on screen (and the keyboard key under them):

- **Ring**: press the button as the ring closes on it - PERFECT / GOOD / MISS.
- **Mash**: hammer the button to fill the bar before time runs out.
- **Swing**: stop the sliding marker in the green (gold in the middle = PERFECT).

A miss never fails the scene - it changes it (Anthony throws the protein bar that finishes the
job; Tyler takes a mulligan; Mikey bounces off his own clone). Every prompt counts toward the
chapter's **STYLE RANK** (S / A / B / C), shown when the chapter ends and saved on the chapter
list, and good play before a fight starts it with **MOMENTUM** (super meter). A few moments
(saying no to the Headmaster, reaching Anthony, staying in the past) cannot be won, and do not count. Story menu -> **ACTION PROMPTS: OFF** plays those
moments for you.

**Choices.** Twelve moments stop and ask what a character says. They are saved, and come back
later - a line in THE DAY BEFORE is answered twenty years on; what Ms. Brady says in LOCKDOWN is
what King Sirven quotes back in THE LAST ONE OUT; whether Jauregui manages to say it in SHOW YOUR
WORK changes his letter, and what he says when he hands over the card; what Gabriel answers the
Headmaster is the first thing he says when he gets his name back. Some are timed; saying nothing is an answer.

**Three endings**, from the last choice in THE LAST BELL (someone has to hold the door):

- **THE TEACHER** - Lopez holds it. The letter reaches him twenty years later.
- **THE LAST ONE OUT** - King Sirven stays. His crown is all they find; Lopez serves his
  detention teaching Room 314; Ms. Brady takes up the sign-off.
- **THE EMPTY SEAT** - you hold it yourself, so nobody is lost. Unlocked once you have finished
  the story; the graduation will not start one short.

The three chapters after it, the credits scene and the story menu's ENDINGS counter follow the ending.

**The 3D camera** (`js/scenes/story-3d.js`): scenes are shot in real perspective - a textured
floor laid out to the horizon, the stage standing as an animated wall in space (drawn in
perspective slices, with a faint reflection on polished floors), every character a billboard at
their own depth, dust hanging in the air. The camera has a yaw, a distance, a height, a focal
length and a roll, and moves between two sets of those:
`{ cam3d: [who, 'flyin' | 'orbit' | 'crane' | 'pullback' | 'truck' | 'low' | 'top' | 'push' |
'spiral' | 'reveal' | 'whirl' | 'rise' | 'drop' | 'vertigo' | 'hero' | 'wide' | 'tilt'] }`,
plus `'ots'` (over one character's shoulder at another) and `'two'` (both in frame). Anyone who
would stand between the lens and the person the shot is about is faded out of it.

**Cinematography** (`js/scenes/story-scene.js`): hard cuts between wide shots, medium shots,
close-ups (background out of focus, always a single), extreme close-ups on the eyes,
over-the-shoulder shots, low angles, Dutch angles, two-shots and split-screen radio calls;
full-screen insert shots (the school at night, the chalkboard equation writing itself, the
clock, the bell and its signatures, a handwritten letter, a crown on the gym floor, a bronze
plaque, one empty chair, a 120-metre rock face); freeze-frame character cards; location stamps;
dissolves, whip pans, fades and a handheld sway; colour grading, light shafts, a spotlight,
slow motion, impact frames, rain, embers, confetti; 2.35:1 letterbox, vignette and film grain.

**Recorded lines.** The story's key lines ("IS THIS SEAT TAKEN?", "THIS IS YOUR PRINCIPAL
SPEAKING.", "CLASS DISMISSED." and a dozen more) are real recordings in `assets/voice/`, listed
in `js/config/story-voice.js`. To add your own: drop an mp3 in that folder and add a line
`'characterId|THE EXACT LINE': 'file-name'`. Every other line uses the speech voice.

**Memory flashes.** `{ recall: { bg, cast, shot, say } }` cuts to an earlier moment in sepia
for one line and snaps back - the first lunch as Anthony is taken, 1994 as Sirven volunteers.

**Audio**: every line is **spoken** (each character with their own voice; rift variants deeper
and slower), over ambient beds - the tolling bell, a rift drone, a heartbeat, a clock, rain,
wind, crickets, a crowd - and an original **soundtrack of 20 themes** played live by a small
sequencer (`js/scenes/story-score.js`): the bell melody, the Bro Batch theme, King Sirven's
march (and the same march played once, slowly, as a requiem), Lopez's circling melody (and its
boss version), a graduation march, and cues for action, comedy, memory and grief.

Lines play on their own like a film; CONFIRM hurries a line along; **hold ESC** skips a scene.
Progress, choices, ranks and endings are saved; chapters can be replayed, and
**NEW STORY (ERASE PROGRESS)** starts over (endings found stay found).

**Editing the story.** The screenplay is data: `js/config/story.js` and `story-2.js` ...
`story-6.js`, a list of steps per chapter such as `{ say: ['brady', 'STOP.'] }`,
`{ cam3d: ['sirven', 'hero'] }`, `{ score: 'requiem' }`, `{ qte: {...}, hit: [...], miss: [...] }`,
`{ choice: { id, options } }` and `{ if: when('brady', 'heart'), then: [...], else: [...] }`.
The list of choices is at the top of `story.js`; the step reference is at the top of each
engine file in `js/scenes/story-*.js`.

## Ms. Brady (the assistant principal)

Strict, demanding, and King Sirven's right hand. Home stage: **The Main Hallway** (lockers,
trophy case, NO RUNNING sign, a flickering fluorescent tube; wall hazard: an open locker -
LOCKED IN!).

- **Light - STOP.**: a firm open palm that shoves them back.
- **Heavy - Walkie Smack**: the walkie-talkie, swung down, crackling with static. OVER.
- **Special - Call the Principal** (perfect block / EX / super): she radios the office and
  **King Sirven storms in from behind her**, charging across the stage - SUSPENDED! The super
  sends a second wave. Against Sirven himself she writes him up instead.
- **DOWN, FORWARD - Write-Up** (a referral slip, thrown) / **DOWN, BACK - Zero Tolerance**
  (counter stance: NOT IN MY SCHOOL.).
- **Throw - Parent Conference**: DETENTION! SATURDAY SCHOOL! SUSPENDED! ...EXPELLED!
- **STRICT**: taunt in front of her and you get WRITTEN UP - she takes your meter. Blocking
  builds her meter.
- **Entrance**: walks in on her walkie - "BRADY TO FRONT OFFICE... COPY. I'M ON IT."
- **Fatality - EXPELLED**: "PERMISSION TO EXPEL?" "GRANTED." A giant rubber stamp drops out of
  the sky. Then King Sirven walks in: "GOOD WORK, MS. BRADY." **Brutality - ZERO TOLERANCE.**
- **The Administration (collab with King Sirven)**: Sirven's taunt with 1 bar radios Ms. Brady,
  who charges in for him ("MS. BRADY! HANDLE THIS." "ON IT, SIR!"). Shared assist code:
  `RF.spawnAssist` in `js/game/brady.js`. Plus their own banter both ways.
- Balance: about 46% against the whole roster (hard CPU, both sides).
- The character select grid is now 10 x 3 (30 slots).

## Bandy (the skater)

Street fighter, skater, rock and roll. Home stage: **The Skatepark** (night, graffiti, ramps,
a neon SKATE sign; wall hazard: a stack of amps - AMPED!).

- **Light - Street Jab**, fast hands; chains up to 5 hits.
- **Heavy - Board Swing**: swings his skateboard like a bat (long reach, CRACK!).
- **Special - Power Chord** (perfect block / EX / super): pulls out a red guitar and hits one
  massive chord - a soundwave rolls across the screen. TOO LOUD!
- **DOWN, FORWARD - Kickflip**: rides the board at them and kickflips into a pop-up.
- **DOWN, BACK - Stage Dive**: leaps and crashes down on them.
- **Throw - One, Two, Three, Four!**: counts in the song with a headbutt on every beat, FOUR!
  kicks them away.
- **Double jump - OLLIE!** off his board; his **dash rides the board**.
- **Entrance**: skates in, kicks the board up into his hand. TURN IT UP!
- **Fatality - ENCORE**: "ONE MORE SONG." Three power chords blast them back under the stage
  lights, then he leaps and smashes the guitar on their head. **Brutality - MOSH PIT.**
- Code: `js/game/bandy.js` (skateboard + guitar art, aura, soundwave, intro, fatality);
  the `skateboard` held-weapon kind in pixel-puppet-sprite.js.
- Balance: about 50-57% against the whole roster (hard CPU, both sides). Height 86 px: in line with the roster.

## Arcade feel (MK-style)

- **Short hop:** tap UP for a quick low hop, hold UP for a full jump (player-controlled jumps only;
  the CPU always jumps full). A hop into an air attack is a fast overhead.
- **Counter hits:** hitting someone during their attack's start-up, a grab, a taunt or a special's
  wind-up does +25% damage, stuns 18 frames longer (enough to combo after), and hits harder
  (extra freeze, shake, rumble).
- **BONE BREAKER:** a counter hit with a heavy, launcher or special - once per round per fighter -
  does 40% more, pops them up, and freezes the fight for an X-ray close-up: the camera punches in,
  the world goes dark, and a lens over the victim shows the bone cracking (blood with BLOOD on).
- **LAST STAND:** once per match, below 30% health: EX + HEAVY together (PS5 L2 + R2, keyboard
  E + G / Num6 + Num2). A lunging blow with its own cut-in; if it connects it plays a long X-ray of
  three bones breaking (ribs, skull, leg) for 30 damage. Blocked = spent; a whiff can be retried.
  The CPU uses it too.
- **Easier special inputs:** quarter circles accept DOWN -> DOWN-FORWARD (no need to reach full
  forward), and arcade taps work too: BACK, FORWARD + attack (or FORWARD, BACK). The tap has to be
  quick, so walking back and forth and attacking never fires a special by accident.
- New **ADVANCED** page in HOW TO PLAY; the pause move list shows LAST STAND.
- Code: `motionDone` / `wantsLastStand` / `inCounterState` in fighter.js; `startXray` /
  `updateXray` / `drawXray` in fight-scene.js; `RF.LAST_STAND` in commands.js.

## Smooth animation

Fighters don't snap between a few poses any more:

- **In-between frames:** for hand-drawn (pixel-puppet) fighters, two extra frames are blended
  between every pair of poses - body and head positions, leg stride, and the actual arm path
  (resampled joint points), so a punch extends and a club swings through an arc. Idle and walk
  loops blend back to their first pose (`frameList` / `tween` in pixel-puppet-sprite.js).
- **Continuous timing:** walk, idle, taunt, victory, jump, dash and hit reactions pick a
  fractional point in their animation; attacks hold the wind-up, snap through to the hit and ease
  out of the recovery (`animFrame` in fighter.js).
- **Squash & stretch:** a squash on landing, a stretch on take-off, and a recoil pop when hit.
- **No hitches:** sprites are cached per fighter + costume and built during the versus screen,
  so nothing is generated mid-fight.
- **Move-to-move blending:** switching moves (idle into a punch, landing into a walk, a block
  dropping) cross-fades over a few frames instead of popping - 2 frames into attacks so they stay
  snappy, 4 otherwise; getting hit and KOs still snap for impact (`drawBody` in fighter.js,
  `drawBlend` in pixel-puppet-sprite.js).
- **High-refresh screens:** on 120/144 Hz monitors the game still updates 60 times a second, but
  fighter positions and the camera are interpolated between updates when drawing, so motion looks
  smoother. Off on 60 Hz screens and in online matches (`withInterpolation` in main.js).

## Attacking arms and legs

Punching arms and kicking legs on hand-drawn (pixel-puppet) fighters are drawn as real pixel-art
limbs, not flat blocks: a tapered tube through the joints (shoulder, elbow, wrist / hip, knee,
ankle) with a dark outline and light/shadow shading, ending in a fist with knuckles or a shoe, all
in the fighter's own colours. Sprite options: `sleeveLength` (short sleeves: bare forearm below,
e.g. 0.3 for a T-shirt), `armThickness` / `legThickness` (Mikey's are huge). A cocked-back arm is
drawn behind the body.

## Fatalities (gore)

Every finisher is now a **FATALITY** (`js/game/gore.js`). Whenever a fatality lands an impact
(hit, heavy, boom, stomp, clang, zap...), the victim sprays pixel blood and chunks of themselves
(coloured from their own sprite) fly off; explosions splatter blood across the screen. Each fatality
also has one big climax (`RF.FATALITY_CLIMAX`): a huge burst, chunks, blood running down the screen,
a red flash, a scream and a slow-motion hit. Blood that lands stains the floor and pools under the
victim. Brutalities bleed on every hit and blow the victim apart in a shower of gore.

At the climax the victim is also **taken apart** (`RF.FATALITY_STYLE`):

| Style | What happens | Fatalities |
|---|---|---|
| decapitate | head flies off, the headless body sprays blood and topples | Royal Decree, Art of Eight Limbs, Masterpiece, Final Bell |
| split | sliced in half; both halves fall apart | Final Grade: F, Exit Pursued by a Bear, Annexation |
| crush | squashed flat into a pool of blood | Pile Driver, Liberty Bell, Bulk Order, Bought Out, Impeachment |
| skeleton | flesh burns/melts away, the skeleton stands... then collapses into bones | Venom Melt, Overcharge, Last Drag |
| explode | blown into four big pieces and a shower of gore | Havana Classic, Specimen Jar, Tee Time |

Turn it all off under **Settings -> BLOOD** (e.g. for showing the game at school).

## Fernando

Legit crazy (menace, **125% health**, from Behind the Gym) and deliberately **overpowered**: big
damage, high defence, fast meter and armor on his shotgun (he beats about 3 out of 4 opponents on
the hard CPU). Always smoking - smoke curls off the cigarette in his raised hand. He laughs at you
when you hit his guard, and every taunt is a random dirty-minded line ("THAT IS WHAT SHE SAID.",
"HEH. YOU SAID HARD.", "69? NICE.").

- **Light: Ash Flick.** Flicks hot embers off the cigarette.
- **Heavy: Shotgun.** Pulls out a pump shotgun - muzzle flash, pellets, BOOM! Plows through one hit.
- **Block: Smoke Cloud.** Hits get lost in a cloud of smoke. HEH HEH.
- **Special: Cig Toss.** Flicks his lit cigarette at your face. TSSSSS!
- **Command specials:** Wheelie (VROOOOM!) and Smoke Screen (vanishes, appears behind you: POOF).
- **Throw: Smoke Break.** Three clouds of smoke to the face (COUGH!), THAT IS WHAT SHE SAID., a boot.
- **Finisher: Last Drag.** One long drag, flicks the cigarette onto them, they catch fire... KABOOM!
  SMOKING HOT. HEH HEH HEH HEH.
- **Entrance:** pops a wheelie in on his motorcycle, the bike tips over, he steps off laughing.
  **Brutality:** SMOKED.

Pose recipes can now swap the held item (`weapon: 'shotgun'` / `false` with `sprite.weapons`).

## Tyler

The American golfer (golfer, **110% health**, from The Back Nine). Funny and totally relaxed:
music notes drift out of his earbuds, he strolls instead of walking, and every taunt is a random
chill line ("NO STRESS, BRO.", "WAKE ME UP AT THE 19TH HOLE.", "IS THIS ON THE PGA TOUR?").

- **Mulligan:** the first clean hit he takes each round doesn't count. MULLIGAN!
- **Light: Putt.** A tidy tap with the club. Long reach for a light.
- **Heavy: Driver.** Big backswing, all the way through - THWACK! - sends them down the fairway.
- **Low heavy: Sand Wedge.** A low chip that sprays sand.
- **Block: Golf Umbrella.** Pops open a huge green-and-white umbrella. NO STRESS.
- **Special: Hole in One.** Tees up, waggles, FORE!, and drives a golf ball across the screen.
- **Command specials:** Cart Path (BEEP BEEP!) and Caddie Counter (NICE TRY, BRO.).
- **Throw: Sand Trap.** Buries them in a bunker, rakes it twice, PLAY IT WHERE IT LIES, then
  blasts them out. SAND SAVE!
- **Finisher: Tee Time.** They shrink into a golf ball on a tee; waggle, waggle, FORE! - into the sky
  and down into the cup. HOLE IN ONE!
- **Entrance:** rolls in on a golf cart and hops out. **Brutality:** FORE!

## Javan

The Eagles superfan (superfan, **116% health**, from Section 104, The Linc). Drawn from a friend's
picture: curly hair, glasses, green EAGLES hoodie, cargo shorts. Bleeds green, votes red, and every
taunt is one or the other ("E-A-G-L-E-S! EAGLES!", "LOWER MY TAXES.", "THE TUSH PUSH IS LEGAL.").

- **Special: Call the President.** MR. PRESIDENT! WE NEED YOU! - and Donald Trump storms in from
  behind him and charges across the stage. YOU'RE FIRED! With a super, a second wave follows.
  Against Trump himself the line is busy, so Javan throws a perfect spiral instead.
- **Command specials:** Perfect Spiral (a football) and Tush Push (a shoulder-down drive).
- **Throw:** Touchdown Spike. **Finisher:** Liberty Bell. **Brutality:** TUSH PUSH.
- **Super:** FLY EAGLES FLY. Tag team with Trump for LANDSLIDE, or with Mikey for SUPER BOWL SUNDAY.

## Donald Trump

A parody president (president, **126% health**, from The Oval Office). Navy suit, very long red
tie, the hair. Slow walk, heavy hands, and the most to say of anyone on the roster.

- **Special: You're Fired.** Points, and a pink slip reading FIRED flies across the stage.
- **Command specials:** Rally (TREMENDOUS!) and The Wall (a counter: I BUILT A WALL.).
- **Throw:** Hostile Takeover. **Finisher:** Impeachment. **Brutality:** LANDSLIDE.
- **Against Jauregui** he has his own entrance line, his own win line, versus-screen banter both
  ways, and a set of ten taunts used only on her ("I AM PUTTING A TARIFF ON YOUR HOMEWORK.",
  "I AM DEREGULATING THE QUADRATIC FORMULA."). Add more in `rivalTaunts` in
  `js/config/characters.js`; a character can have a list like this for any rival.

## Erick

The theater guy (usher, **112% health**, from Regal Kendall Village). Drawn from a friend's picture:
bomber jacket, cargos, one AirPod, a bucket of popcorn in the back hand. Movie theater tricks, and
the best rizz on the roster.

- **Special: Popcorn Barrage.** Flicks the bucket and a buttery cloud of kernels flies across the
  stage. EXTRA BUTTER!
- **W RIZZ:** every finished taunt gives him bonus meter (and a little health) on top of the normal
  amount, and the taunts are all lines. Set the amount with `rizz` in his entry.
- **Command specials:** Seats Are This Way (a flashlight rush) and W Rizz (a counter).
- **Throw: Out of the Theater.** Takes their ticket and runs them out the exit. THIS SHOWING IS OVER!
- **Finisher: Now Showing.** They become a movie poster on a light box... and get torn in half.
  NO REFUNDS. **Brutality:** NO REFUNDS. **Super:** NOW SHOWING.
- **Stage: Regal Kendall Village** (`js/stages/regal.js`). The lobby: wine-red walls, a chasing
  marquee, made-up movie posters, SCREEN 7's doors, loud carpet. **Hazard: HOT BUTTER!** the popcorn
  machine on the left wall.

Character select is 10 x 3 (30 slots, 29 fighters).

## Story mode: the 3D camera, fights and the bonus chapter

**A real room.** In a 3D shot the set is now a closed room: the stage picture is the far wall,
darker copies make the two side walls and the wall behind the usual camera, and the camera is kept
inside the walls (it widens its lens instead of passing through one). Outdoors the "walls" stand far
off, like a horizon.

**Backs.** Nobody has a drawing of their back, so one is made from the front (`backOf` in
`js/render/pixel-puppet-sprite.js`): the face is filled with the hair or bare scalp, and anything on
the chest (a tie, a logo) is painted over with the cloth around it. Whenever the camera is behind
someone, that is what it shows. A real back drawing would look better; none exist yet.

**New shots** (`{ cam3d: [who, 'name'] }`): `behind` (their back, looking where they look),
`follow` (behind, as they walk), `face` (straight at them), `circle` (all the way round), and `ots`
is now a true over-the-shoulder from behind the listener (`otsf` is the old front one).

**Fights in the middle of a scene.** `{ brawl: { play, vs, stage, name, mid } }` stops the scene,
plays one round against the rift version of `vs`, and on a win the same scene carries on from the
next step (`js/scenes/story-fights.js`). The quick-time moments are all still there: each rift fight
opens with them and ends on its last one. The story now has ten fights, six of them new: Nicholas
vs Rift Chris, Ms. Brady vs Rift Bandy, Bandy vs Rift Fernando, Simon vs Rift Mikey, Ruano vs the
Tired Angel, and Nicholas vs Omega Lopez.

**Bonus chapter: MOVIE NIGHT** (`js/config/story-7.js`, `side: true`). Erick, Javan and the
President at Regal Kendall Village, with two fights. Always open from the story menu.

## Mr. Urbanik

The psychology teacher (mentalist, **104% health**, from Room 207). Drawn from a friend's picture:
blue work shirt, khakis, arms folded. His arms never move: everything he does is done with his mind
(`noArms: true` in his sprite; his code is `js/game/urbanik.js`).

- **Insane range.** Light (MIND PUSH) reaches about 110 pixels and heavy (MIND CRUSH) about 190, on
  a 364-pixel stage. **Special: MIND BREAK** reaches the WHOLE stage and cannot miss (only be blocked).
- **MADNESS.** A clean MIND BREAK scrambles the target's mind for 4 seconds: left and right swap
  (a super makes it 7). Stars and question marks circle their head.
- **Telepathic block.** He never raises a guard. A psychic barrier takes the hit: no chip damage, and
  every block feeds his meter.
- **FORESIGHT.** About one hit in five simply does not land: he is already a step to the side
  ("FORESEEN."). It has a 4 second cooldown, and never works on throws, supers or when he is already
  in hitstun. Tune it with `autoEvade: { chance, cooldown }` in his entry.
- **Command specials:** Mind Spike (a bolt that crosses the screen) and Foresight (a counter: I SAW THAT.).
- **Throw: Mind Over Matter** (lifts, shakes and throws without touching). **Finisher: Session
  Over** ("TELL ME ABOUT YOUR MOTHER."). **Super: MIND OVER MATTER.**
- Any fighter can use `psychicBlock`, `autoEvade`, `noArms` or `rivalTaunts` the same way.

## Story mode: the Headmaster, the war and the bell rung backward

**Who he is now** (`js/game/headmaster.js`). Nobody was redrawn: the file builds new looks out of
the fighters that exist.

- `RF.emperorDef(def)` - **THE HEADMASTER**: Lopez Tuero's own drawing with a tall iron crown, a
  red cape, a black coat and ash skin. Used in the story (`{ emperor: true }` in a cast) and as
  the final boss (`look: 'emperor'` on a fight).
- `RF.crownDef(def)` - anyone he has collected: a small crown, and their colours drained
  (`{ crown: true }`, or the step `{ crownify: key }` to do it in front of the camera).
- `RF.forgottenDef(def)` - one of **the Forgotten**: grey, with a smear where the face was.
- `RF.costume(def, 'alt1' | 'alt2' | 'alt3')` - "somebody else": the same drawing in different
  clothes, with skin and hair left alone. Alumni, his 2016 class and the Forgotten once they get
  their faces back are made this way.
- Three new fighters, drawn by hand, in `RF.EXTRAS` (found by `RF.getCharacter`, not on the select
  screen): **the Proctor** (a clock for a face; throws its hands), **the Bell Ringer** (carries the
  bell on its shoulders; super armour) and **the Eraser** (chalk dust; it does not hurt you, it
  removes you).

**The throne** (`js/stages/throne.js`): the room between universes - a throne built out of
classroom furniture, rows of faceless watchers, windows onto other schools, a cracked bell
swinging overhead, and its own slow, heavy theme. Its hazard is THE LAST BELL.

**New story steps** (`js/scenes/story-war.js`):

| Step | What it does |
|---|---|
| `{ die: key }` | they fall and do not get up; light rises off them |
| `{ crownify: key }` / `{ restore: key }` | the crown comes down / breaks (`restore` also takes `costume` and `name`, for someone we have only ever seen without a face) |
| `{ restoreAll: true }` | every one of the Forgotten in the scene gets a face back |
| `{ brawl: { ..., look: 'emperor' / 'crown' / 'forgotten' / 'plain' } }` | who you fight |
| `{ brawl: { ..., partner, vsPartner } }` | a tag fight in the middle of a scene |
| `{ brawl: { ..., survive: 22 } }` | he cannot be hurt: last 22 seconds. Win or lose, the scene carries on, and `st.survived` says which |
| `{ recall: { ..., live: true } }` | not a memory but a cut to somewhere else (he is watching from the throne) |
| inserts `army`, `portals`, `card2016`, `memorial` | the horde under the floating throne; every class arriving; the card; the five names |

The 3D camera now looks **up** at anyone raised off the floor (a cast with `y`) or much taller
than a person, so the throne and the lieutenants stay in frame.

**How the new chapters are written.** `js/config/story-8.js` and `story-9.js` add six chapters
and rewrite three, but they also *edit* the older files in place with a few helpers
(`RF.STORY.kit`): `after(steps, 'A LINE THAT STARTS LIKE THIS', [...])`, `before`, `swap`, `cut`
and `reword` find a line anywhere in a chapter (inside choices and endings too) and work from
there. The last thing story-9.js does is sort the chapters into `ORDER` and renumber every
"CHAPTER n" title card - to move a chapter, move its name in that list.

## Chris Loor

Amateur boxer from Ecuador who works at the pizza place (**130% health**, boxer). Drawn from a
friend's picture (mirrored to face right; the glasses are painted on because the face is tiny at
this size). **High guard:** the drawing's own gloves are up by his chin, so idle and block keep the
guard, and blocking tucks the chin behind the gloves (`poses.block` in his entry has no `arm`, so
no arm is swapped in). 10% damage reduction. Light = JAB, heavy = CROSS, special **PIZZA DELIVERY**
(a spinning pizza projectile, `js/game/loor.js`), throw = lift slam, finisher = pile driver,
brutality EXTRA TOPPINGS. The fighter is `loor` (the older rich-kid fighter `chris` is someone else).

## Olu

From O Block, Chicago, and a divine being who can stand in the room between universes and look
Lopez Tuero in the eye. Gunslinger, **125% health**, 8% damage reduction. Drawn from a friend's
picture (mirrored to face right). `js/game/olu.js`.

- **Never still:** a four-frame bounce on the balls of his feet in neutral, and a gold **halo**
  above his head (`RF.drawDivine`, called after `drawMind` in the fight scene).
- **Fastest dash in the game:** `dashBoost: 2.3` and a new per-fighter `dashTime: 11` (frames the
  dash lasts; default 16), with a trail of gold and violet afterimages.
- **Guns:** light = PISTOL, heavy = BOTH BARRELS. Both are long-reach hitboxes drawn with a muzzle flash
  and a tracer (`MOVE_FX.gunshot`); he holds a pistol (`sprite.weapon`) whenever his arm is out. Special
  **DIVINE BARRAGE** is a fast star-bullet projectile. Finisher **FINAL JUDGMENT**: a pillar of light
  and the verdict read from above.
- **Philly shell block:** the lead arm folded across the belly, rear glove at the chin, chin tucked
  behind the shoulder and weight leaned back. It uses a new renderer arm, `shell`, that any fighter can use
  in `poses.block`.
- The character select grid is now 16 x 2 (32 slots).

## Riley, the Keeper (and the Terramania Judge)

The Keeper of Terramania: security, in the oldest sense - the cosmic being responsible for the
universe's safety (**105% health**, `riley`). Drawn from a friend's picture; he is already floating
in it. `js/game/riley.js`.

- **Floats:** `sprite.hover` makes any fighter hover (the sprite is drawn higher, with a shadow on
  the floor and a slow bob). He has no stride, tuck or kicks; his legs stay crossed.
- **Ranged everything:** light = WARNING SHOT (a star-bolt), heavy = CEASE AND DESIST (a beam), special
  **COSMIC ORB** (a slow, huge orb of light). Finisher **SEALED**: the loser is shrunk inside an orb.
- **Dash = teleport:** `teleport: 130` on the fighter turns the dash into a blink (rings where he left
  and where he arrived, a ghost fading, and a few frames of invulnerability). He can blink straight past you.
- **Block = an orb:** a shell of light with gold rings that flares when it takes a hit.
- **Extra life:** `reviveAs: 'judge'`. The first knockout of every round does not count: **THE TERRAMANIA
  JUDGE** arrives in a column of light with a full bar and finishes the round (`Fighter.summonJudge`;
  `applyDef` swaps who a fighter is). The next round, Riley is back. The Judge is drawn pixel by pixel
  (white and gold robe, wings, halo wheel, a gavel the size of a person), fires a spear of light and a
  verdict beam, and throws the gavel (**FINAL VERDICT**). He is not on the select screen; the Keeper brings him.
- The roster is now 32, which fills the 16 x 2 select grid.

## The small things

- **PRESS ANY BUTTON** in front of the title, once per visit.
- **The title menu is grouped:** STORY, FIGHT, CHALLENGES, EXTRAS, SETTINGS. Three of them open a
  group; BACK or ESC closes it, and the menu remembers where you were when you come back.
- **A featured fighter** on the title, with their quote, changing every few seconds; a **tip** along
  the bottom, and another on the VS screen (`RF.TIPS` in `js/game/polish.js`).
- **Rank and XP** (`RF.profile`): FRESHMAN up to LEGEND OF TERRAMANIA. XP is added up from your
  records, story progress, tower floors and unlocks, so it is never out of step with them.
- **Results card** after every match: damage, hits, best combo, perfect blocks, XP earned, RANK UP.
- **The last hit of a K.O. lands in slow motion.**
- **Every change of screen opens like blinds** (a fifth of a second).

## Unlocks and item drops

**UNLOCKS** (title menu) lists what you can earn. Nothing is stored as a flag: each reward is worked
out from what you have actually done, so progress from before it existed counts (`js/core/unlocks.js`).
A trophy pops up the first time something becomes available.

| Reward | How |
| --- | --- |
| GOLDEN costume | an S rank in any story chapter |
| BLOOD costume | 5 brutalities |
| NOIR costume | finish the bonus chapter MOVIE NIGHT |
| RIFT costume | clear the Rift Tower |
| NIGHTMARE CPU level | finish the story (Settings, CPU difficulty) |

Locked costumes are skipped when you cycle with HEAVY on character select. Add one with `lock: 'id'`
on a costume in `js/render/sprites.js` and a `test()` in `RF.UNLOCKS`.

**ITEM DROPS** (Party Mods, off by default): every 10 to 15 seconds something drops onto the stage
and waits about 11 seconds. Walk into it: PIZZA heals a quarter of your health, SODA fills 40 meter,
ENERGY DRINK ("FIRED UP") gives 1.5x damage for 8 seconds. Not in training, tag, or story fights.

## Menus

**Fighter select** (`js/scenes/select-scene.js`): the two fighters stand big on either side on a red
and a blue wedge with stripes racing down, a giant shadow of each behind them and their name slashed
across their feet; type, four stats and the special sit in the middle around the VS; the roster runs
along the bottom, 15 x 2, with breathing corner-bracket cursors. Controls are unchanged.

**Arms** on the detailed fighters bend at the elbow and are sized to each fighter's height
(`NAT` in `js/render/pixel-puppet-sprite.js`; `armLength` on a sprite changes the length, and
`arms: 'classic'` brings back the old blocky ones).

**The look:** black steel and blood red. The logo bleeds, chains hang in the corners, red lightning
flashes every few seconds, the chosen item sits on a dripping red slash between two skulls, and
every menu has a vignette, drifting ash and scanlines (`RF.drawSlash`, `RF.drawSkull`, `RF.drawGrit`
in `js/scenes/ui.js`). The layout, the items and the controls are unchanged.

**The music** is downtuned a fourth (E becomes a low B) and a little slower, with more amp gain,
a deeper kick, double-kick and blast-beat drums. `DOWNTUNE` and `DRAG` at the bottom of
`js/config/music.js` put it back.

The classic fire main menu and character select, polished: the main menu shows a one-line
description of the highlighted option and name tags under the two featured fighters (who rise
in with a flash when they change). On character select, the slot each player is on lights up in
their colour (others dim), each portrait has a fighter-type colour stripe, previews get a
spotlight, locking in flashes the fighter and stamps READY!, and a VS flashes up when both are in.

## Rage, Clash and First Attack

- **RAGE:** drop below 30% health and you glow red: 10% more damage and 35% faster super meter
  (`RAGE_HEALTH`, `RAGE_DAMAGE`, `RAGE_METER` in `js/config/game.js`).
- **CLASH!:** when two grounded normal attacks meet head-on (hitboxes collide, or both land on the
  same frame) they cancel: no damage, both bounce apart, both get a little meter.
- **FIRST ATTACK!:** the first clean hit of each round is announced and pays 20 meter.

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

**Every stage has its own theme.** The song id is the stage id (`music: 'golf'` on the stage).

| Stage | Theme | Feel |
| --- | --- | --- |
| Hell Cafeteria / NYC Street / Haunted Court / Sirven's Office | the original four | metal |
| Friday Night Lights | Fourth and Goal | galloping stadium metal |
| Bro Batch HQ | One More Rep | pumping groove metal |
| Parking Lot | Burnout | slow sludge |
| The Main Hallway | Hall Pass | tense march |
| The Skatepark | Kickflip | fast pop punk |
| The Back Nine | Sunday Round | chill: keys, pad, soft drums |
| South Beach | Ocean Drive, 2 AM | chill synthwave |
| Music Room | Practice Room B | quiet piano |
| The Crag | Thin Air | ambient, almost still |
| Regal Kendall Village | Now Showing | lobby jazz |
| The Throne Between | The Chair | the slowest, lowest song in the game: 88 bpm doom |

The chill themes are marked `clean: true` and use the quiet band: instruments `keys`, `pad`, `sub`,
`bell`, and the soft drum kit (`b` kick, `p` rim, `x` hat, `m` shaker). `drumVolume` turns a song's
drums down. Clean songs are never downtuned.

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

## Survival, Party Mods, Records and more

- **Survival** (title menu): pick a fighter and fight endless one-round matches on one health
  bar (30% patched up after each win); the CPU gets tougher as your streak grows. Best streak is
  saved.
- **Party Mods** (title menu): Big Head Mode, Low Gravity (floaty jumps, sky-high juggles), Turbo
  (50% faster), Triple Damage, Protein Mode (half the damage you deal heals you) and Random
  Fighters (new random fighters every round). Mix them freely; they apply to every mode and reset
  when the page reloads (`RF.MOD_SETTINGS` in `js/core/settings.js`).
- **Records + achievements** (title menu -> RECORDS): 17 achievements with an "ACHIEVEMENT
  UNLOCKED" pop-up (first win, flawless rounds, 5- and 10-hit combos, finishers, brutalities,
  stage transitions, hazards, supers, combo breakers, Arcade clear, Survival streaks, all combo
  trials, a win with every fighter...) and lifetime stats: matches, wins per fighter, longest
  combo, best Survival streak. Saved in this browser (`js/core/records.js`).
- **Rival banter:** matchups like Simon vs Anthony, Sirven vs Holbrook or Landa vs Weissenberg
  trade lines in speech bubbles on the versus screen (`js/config/banter.js`).
- **Attract demo:** leave the title screen alone for 20 seconds and two CPUs fight a demo match;
  press any key to return.
- **Balance:** El Escobedo, Lady Landa and Jauregui hit harder and take less damage.

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
