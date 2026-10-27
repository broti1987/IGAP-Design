/* --------------------------------------------------------------- OUR PEOPLE
   Figma 564:192400. Seventeen circles in a 648 x 704 field: six portraits
   and eleven empty rings, in the four accents.

   Nothing here is scroll-driven. The cluster simply lives: every circle
   drifts on a breeze of its own, the portraits breathe between the smallest
   and largest size in the set, and when two meet they push each other off
   and settle back. Three forces, in order of strength:

     home    a soft spring back to the place Figma put it, so the
             composition stays the composition and never disperses
     breeze  two slow sines per circle, turning at rates that do not
             divide into each other, so no two ever fall into step
     touch   a positional separation plus a quiet rebound -- the only
             sharp thing in the piece, and still well under a tap

   The portraits are a single <circle> each, filled with a pattern in
   objectBoundingBox units: the image follows the circle's box, so growing
   one is one attribute and the photograph scales with it. Until there are
   photographs the pattern paints its accent at a sixteenth, and an href on
   the <image> covers it. */
(function () {
  var art = document.querySelector('[data-people]');
  if (!art) return;
  var nodes = [].slice.call(art.querySelectorAll('[data-bub]'));
  if (!nodes.length) return;

  var W = 648, H = 704, TAU = Math.PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* How hard each of the three pulls. AIR over HOME is how far a circle is
     allowed to stray: about 26px at the ends of its wander. */
  var AIR  = 6.5,    /* px/s^2, the breeze */
      HOME = 0.25,   /* px/s^2 per px out of place */
      DRAG = 0.9,    /* speed kept per second */
      VMAX = 26,     /* px/s, nothing moves faster than this */
      REST = 0.45;   /* how much of a meeting is given back */

  var B = nodes.map(function (el, i) {
    var r  = +el.getAttribute('data-r');
    var lo = +(el.getAttribute('data-min') || r);
    var hi = +(el.getAttribute('data-max') || r);
    var hx = +el.getAttribute('data-x'), hy = +el.getAttribute('data-y');
    return {
      el: el, hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0,
      r: r, r0: r, lo: lo, hi: hi,
      /* breathing: 15 to 23 seconds, every one a different length and a
         different starting point, so the six are never the same size */
      per: 15 + (i * 3.17) % 8,
      ph:  (i * 2.39) % TAU,
      /* the breeze: two slow turns, deliberately incommensurate */
      w1: 0.071 + (i % 5) * 0.0131,
      w2: 0.053 + (i % 7) * 0.0097,
      p1: i * 2.11, p2: i * 1.37,
      m: r * r                       /* a big circle gives less than a small one */
    };
  });

  function draw(b) {
    b.el.setAttribute('cx', b.x.toFixed(1));
    b.el.setAttribute('cy', b.y.toFixed(1));
    b.el.setAttribute('r',  b.r.toFixed(1));
  }

  B.forEach(draw);
  if (reduce) return;

  function step(dt, t) {
    var i, j, a, b;

    for (i = 0; i < B.length; i++) {
      a = B[i];

      /* breathe, if this one is a portrait */
      if (a.hi > a.lo) {
        var u = 0.5 - 0.5 * Math.cos(t * TAU / a.per + a.ph);
        a.r = a.lo + (a.hi - a.lo) * u;
        a.m = a.r * a.r;
      }

      a.vx += (Math.sin(t * a.w1 * TAU + a.p1) * AIR + (a.hx - a.x) * HOME) * dt;
      a.vy += (Math.cos(t * a.w2 * TAU + a.p2) * AIR + (a.hy - a.y) * HOME) * dt;

      var k = Math.pow(DRAG, dt);
      a.vx *= k; a.vy *= k;

      var sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      if (sp > VMAX) { a.vx = a.vx / sp * VMAX; a.vy = a.vy / sp * VMAX; }

      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }

    /* meetings: separate first, then give a little back along the normal */
    for (i = 0; i < B.length; i++) {
      for (j = i + 1; j < B.length; j++) {
        a = B[i]; b = B[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var min = a.r + b.r;
        if (d >= min) continue;
        var nx = dx / d, ny = dy / d, over = min - d;
        var ta = b.m / (a.m + b.m), tb = 1 - ta;
        a.x -= nx * over * ta; a.y -= ny * over * ta;
        b.x += nx * over * tb; b.y += ny * over * tb;
        var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          var jm = -(1 + REST) * rel;
          a.vx -= nx * jm * ta; a.vy -= ny * jm * ta;
          b.vx += nx * jm * tb; b.vy += ny * jm * tb;
        }
      }
    }

    /* and the field's own edges, which answer softer than a circle does */
    for (i = 0; i < B.length; i++) {
      a = B[i];
      if (a.x < a.r)     { a.x = a.r;     a.vx =  Math.abs(a.vx) * 0.5; }
      if (a.x > W - a.r) { a.x = W - a.r; a.vx = -Math.abs(a.vx) * 0.5; }
      if (a.y < a.r)     { a.y = a.r;     a.vy =  Math.abs(a.vy) * 0.5; }
      if (a.y > H - a.r) { a.y = H - a.r; a.vy = -Math.abs(a.vy) * 0.5; }
      draw(a);
    }
  }

  /* It runs while it is on screen and not a frame longer. t is its own
     clock, so coming back to the section does not jump it forward. */
  var last = 0, t = 0, on = false, raf = 0;
  function frame(now) {
    if (!on) return;
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now; t += dt;
    step(dt, t);
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting === on) return;
      on = e.isIntersecting;
      if (on) { last = 0; raf = requestAnimationFrame(frame); }
      else cancelAnimationFrame(raf);
    });
  }, { rootMargin: '10% 0px' }).observe(art);
}());
