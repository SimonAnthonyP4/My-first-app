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

Character select is now 8 x 2 (16 slots).

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
