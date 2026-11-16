// Stage registry. To add a stage: create js/stages/<name>.js that calls
// RF.registerStage({...}) and add a <script> tag for it in index.html.
//
// A stage definition:
//   id, name           identifiers
//   music              song id from config/music.js
//   floorY             screen y of the floor the fighters stand on
//   bounds             { left, right } x limits for fighters
//   drawStatic(ctx, w, h)    paints everything that never moves (baked once)
//   drawAnimated(ctx, t)     optional, paints moving bits every frame (t = frame count)
//   horizon            optional: the y where the painted floor begins (story mode's 3D camera then
//                      stands the back wall on its own floor instead of showing the painted one)
RF.STAGES = [];

RF.registerStage = (def) => {
  RF.STAGES.push(def);
  return def;
};

RF.getStage = (id) => RF.STAGES.find((s) => s.id === id);

RF.StageRenderer = class {
  constructor(def) {
    this.def = def;
    const [canvas, ctx] = RF.util.makeCanvas(RF.CONFIG.WIDTH, RF.CONFIG.HEIGHT);
    def.drawStatic(ctx, RF.CONFIG.WIDTH, RF.CONFIG.HEIGHT);
    this.bg = canvas;
  }

  draw(ctx, t) {
    ctx.drawImage(this.bg, 0, 0);
    if (this.def.drawAnimated) this.def.drawAnimated(ctx, t);
  }
};

// HOME TURF: where each fighter is from. The stage select opens on player one's, the versus screen calls it
// out, and in arcade mode every opponent is fought at theirs.
RF.HOME_STAGE = {
  bruiser: 'cafeteria', viper: 'nyc', weissenberg: 'lab13', landa: 'biolab', dabalsa: 'globe', sirven: 'office',
  simon: 'templering', anthony: 'brobatch', nicholas: 'brobatch', chris: 'penthouse', ruano: 'catedral', tyler: 'golf',
  fernando: 'parking', gabriel: 'miami', wuttke: 'musicroom', lopez: 'multiverse', alejandro: 'cliff', mikey: 'field',
  javan: 'field', bandy: 'skatepark', brady: 'hallway', trump: 'oval', erick: 'regal', loor: 'pizzeria', olu: 'oblock',
  riley: 'post', escudero: 'studio', david: 'artroom', judge: 'tribunal', proctor: 'throne', ringer: 'throne', eraser: 'throne',
};
RF.homeStage = (def) => { const id = def && RF.HOME_STAGE[def.id || def]; return id && RF.getStage(id) ? id : null; };
