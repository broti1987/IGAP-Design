/* --------------------------------------------------------------- OUR PEOPLE
   Figma 564:192400. Six portraits adrift in a 648 x 704 field, with a
   scatter of small coloured dots around them.

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
   the <image> covers it.

   TWO THINGS RIDE ALONG WITH THEM:

   The metaball. Behind the photographs sits a layer of plain discs, one per
   portrait, a little smaller than the face it stands for and run through a
   blur-then-sharpen filter. On its own each disc is hidden behind its
   photograph; when two people drift close the blurred fields overlap and
   the alpha ramp turns the overlap back into solid colour, so a bridge
   forms between them before they actually touch and breaks when they part.
   Nothing here decides when that happens -- it falls out of the filter, so
   it is the distance between them that draws it.

   The dots. Not in the markup, because there are sixty of them and they are
   decoration: a centre-weighted scatter between 4 and 8 across, in the four
   accents, drifting on the same breeze as everything else. They are left
   out of the meetings below -- at this size being shoved about by a passing
   face reads as a glitch rather than a touch, and sixty more bodies in a
   pairwise loop is work for nothing. */
(function () {
  var art = document.querySelector('[data-people]');
  if (!art) return;
  var nodes = [].slice.call(art.querySelectorAll('[data-bub]'));
  if (!nodes.length) return;
  var blobs = [].slice.call(art.querySelectorAll('[data-blob]'));
  var dotHost = art.querySelector('[data-dots]');

  var W = 648, H = 704, TAU = Math.PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* How hard each of the three pulls. AIR over HOME is how far a circle is
     allowed to stray: about 26px at the ends of its wander. */
  var AIR  = 6.5,    /* px/s^2, the breeze */
      HOME = 0.25,   /* px/s^2 per px out of place */
      DRAG = 0.9,    /* speed kept per second */
      VMAX = 26,     /* px/s, nothing moves faster than this */
      REST = 0.45;   /* how much of a meeting is given back */

  /* --- the dots -----------------------------------------------------
     Scattered from the middle out rather than evenly: a random radius taken
     to the 2.6 power pulls them in hard towards the centre of the field,
     which is where the faces are, and leaves the corners quiet -- the
     higher the power, the tighter the gather. Seeded off the index so the
     scatter is the same every load -- a composition, not a surprise each
     time. */
  var ACCENTS = ['--sky', '--green', '--violet', '--teal'];
  var DOTS = 60, D = [];
  (function makeDots() {
    if (!dotHost) return;
    var NS = 'http://www.w3.org/2000/svg';
    var seed = 20240917;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var i = 0; i < DOTS; i++) {
      var ang = rnd() * TAU;
      var rad = Math.pow(rnd(), 2.6) * 0.52;          /* 0 at the middle, .52 at the edge */
      var x = W / 2 + Math.cos(ang) * rad * W;
      var y = H / 2 + Math.sin(ang) * rad * H;
      var r = 2 + rnd() * 2;                           /* 4 to 8 across */
      var el = document.createElementNS(NS, 'circle');
      el.setAttribute('class', 'pp-dot');
      el.style.setProperty('--a', 'var(' + ACCENTS[i % 4] + ')');
      dotHost.appendChild(el);
      D.push({
        el: el, hx: x, hy: y, x: x, y: y, vx: 0, vy: 0, r: r,
        w1: 0.061 + (i % 9) * 0.0107, w2: 0.047 + (i % 11) * 0.0083,
        p1: i * 1.73, p2: i * 2.57
      });
    }
  }());
  function drawDot(d) {
    d.el.setAttribute('cx', d.x.toFixed(1));
    d.el.setAttribute('cy', d.y.toFixed(1));
    d.el.setAttribute('r',  d.r.toFixed(1));
  }
  D.forEach(drawDot);

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
      m: r * r,                      /* a big circle gives less than a small one */
      blob: null
    };
  });

  /* Which blob belongs to which circle: the discs are declared in the same
     order as the portraits, so the nth portrait drives the nth blob. */
  var faces = nodes.filter(function (el) { return el.classList.contains('pp-bub--face'); });
  function blobFor(b) {
    var k = faces.indexOf(b.el);
    return k < 0 ? null : blobs[k];
  }
  /* Only 2 under the photograph. Every pixel the disc gives up here is two
     pixels of gap the filter has to span before a bridge appears, so the
     disc is kept as close to the face as it can be without its own edge
     showing past it. The alpha ramp does the hiding instead: its threshold
     sits a shade above a half, which pulls the silhouette just inside the
     disc it was made from. */
  var BLOB_IN = 4;

  function draw(b) {
    b.el.setAttribute('cx', b.x.toFixed(1));
    b.el.setAttribute('cy', b.y.toFixed(1));
    b.el.setAttribute('r',  b.r.toFixed(1));
    var g = b.blob;
    if (g) {
      g.setAttribute('cx', b.x.toFixed(1));
      g.setAttribute('cy', b.y.toFixed(1));
      g.setAttribute('r',  Math.max(1, b.r - BLOB_IN).toFixed(1));
    }
  }

  /* after blobFor exists, not beside the map that builds B -- `faces` is
     declared below it and would still be undefined here */
  B.forEach(function (b) { b.blob = blobFor(b); });
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

    /* the dots keep to themselves: home and breeze, no meetings */
    for (i = 0; i < D.length; i++) {
      var d0 = D[i];
      d0.vx += (Math.sin(t * d0.w1 * TAU + d0.p1) * AIR + (d0.hx - d0.x) * HOME) * dt;
      d0.vy += (Math.cos(t * d0.w2 * TAU + d0.p2) * AIR + (d0.hy - d0.y) * HOME) * dt;
      var kd = Math.pow(DRAG, dt);
      d0.vx *= kd; d0.vy *= kd;
      d0.x += d0.vx * dt; d0.y += d0.vy * dt;
      drawDot(d0);
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
