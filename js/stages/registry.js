// Stage registry. To add a stage: create js/stages/<name>.js that calls
// RF.registerStage({...}) and add a <script> tag for it in index.html.
//
// A stage definition:
//   id, name           identifiers
//   floorY             screen y of the floor the fighters stand on
//   bounds             { left, right } x limits for fighters
//   drawStatic(ctx, w, h)    paints everything that never moves (baked once)
//   drawAnimated(ctx, t)     optional, paints moving bits every frame (t = frame count)
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
