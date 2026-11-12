// CHRIS LOOR (boxer, pizza place, Ecuador): the PIZZA DELIVERY special's art.
// His high guard is in his poses (config/characters.js): the drawing's own gloves stay up.
(function () {
  // PIZZA DELIVERY: a spinning pizza box that pops open into a flying slice cloud.
  RF.PROJECTILE_ART.pizza = function (ctx, x, y, t, dir) {
    for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(255,170,60,${0.4 - i * 0.08})`; ctx.fillRect(Math.round(x - dir * i * 7), Math.round(y - 2), 5, 3); }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(t * 0.35 * dir);
    ctx.fillStyle = '#2a1a0a'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a040'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c82828'; for (const [dx, dy] of [[-3, -2], [2, -3], [3, 2], [-2, 3], [0, 0]]) ctx.fillRect(dx - 1, dy - 1, 2, 2);
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(-7, -0.5, 14, 1); ctx.fillRect(-0.5, -7, 1, 14);   // the slices
    ctx.restore();
  };
  RF.SPECIALS.pizzaDelivery = {
    name: 'Pizza Delivery',
    description: 'Spins a whole pizza across the screen like a discus. Thirty minutes or it is free.',
    kind: 'projectile',
    startup: 10,
    recovery: 15,
    speed: 7,
    size: 15,
    height: 0.6,
    damage: 14,
    hitstun: 26, blockstun: 13, pushback: 6, hitstop: 9,
    art: 'pizza', sound: 'whoosh', hitText: 'EXTRA CHEESE!',
    colors: ['#ffe27a', '#e8a040', '#c82828'],
  };
})();
