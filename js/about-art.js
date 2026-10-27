/* ===========================================================================
   ABOUT — the artwork
   ---------------------------------------------------------------------------
   One artwork, five arrangements. It is not five pictures swapped over: the
   four discs are the SAME four discs throughout, and they move and resize
   from one step to the next -- the overlapping cluster closes into the
   concentric stack, the stack spreads into the diagonal chain, the chain
   collapses as the network draws itself in, and the map lights up at the end.

   The scroll winds it. Nothing here is a transition waiting to be fired at a
   step line: a step holds its arrangement for most of its screen and spends
   the rest carrying it over to the next, and every frame in between -- each
   centre, radius and accent -- is worked out from the scroll position. So
   scrolling back and forth runs it backwards and forwards, and it never
   snaps.

   It is sticky from the hero down. Through the hero the map stands on its
   own: it draws itself in dot by dot, then dots take an accent at random and
   let it go again. The discs are already in place with no radius, and the
   scroll out of the hero is what grows them.

   THE GRID. Figma draws the artwork on the same 20 lattice as the page's dot
   field -- one artwork dot per background dot -- so the map reads as part of
   the field rather than a picture laid over it. The page sets its field to
   that 20 (css/about.css) and snap() nudges the svg by up to a cell so the
   two lattices land on each other exactly.

   Figma: About / Capabilities — Desktop, artwork 600 x 490 at the frame's
   right, map 450 x 490 of 10px dots on the 20 grid.
   ========================================================================= */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var PITCH = 20;                    /* Figma's lattice, and the page's */
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------------- the map ----------------
     gx.gy on the 20 grid; the dot is 10 across, so its centre is the cell
     plus 5, and the group sits 80 in from the artwork's left edge. */
  var CELLS = '11.24 10.24 12.23 11.23 10.23 13.22 12.22 11.22 10.22 13.21 12.21 11.21 10.21 9.21 13.20 12.20 11.20 10.20 9.20 13.19 12.19 11.19 10.19 9.19 14.18 13.18 12.18 11.18 10.18 9.18 8.18 15.17 14.17 13.17 12.17 11.17 10.17 9.17 8.17 16.16 15.16 14.16 13.16 12.16 11.16 10.16 9.16 8.16 18.15 17.15 16.15 15.15 14.15 13.15 12.15 11.15 10.15 9.15 8.15 18.14 17.14 16.14 15.14 14.14 13.14 12.14 11.14 10.14 9.14 8.14 20.13 19.13 18.13 17.13 16.13 15.13 14.13 13.13 12.13 11.13 10.13 9.13 8.13 7.13 6.13 5.13 23.12 22.12 20.12 19.12 18.12 17.12 16.12 15.12 14.12 13.12 12.12 11.12 10.12 9.12 8.12 7.12 6.12 5.12 24.11 23.11 22.11 20.11 19.11 18.11 17.11 16.11 15.11 14.11 13.11 12.11 11.11 10.11 9.11 8.11 7.11 6.11 5.11 4.11 24.10 23.10 22.10 21.10 20.10 19.10 18.10 17.10 16.10 15.10 14.10 13.10 12.10 11.10 10.10 9.10 8.10 7.10 6.10 25.9 24.9 23.9 22.9 21.9 20.9 19.9 18.9 17.9 16.9 15.9 14.9 13.9 12.9 11.9 10.9 9.9 8.9 7.9 6.9 26.8 25.8 24.8 23.8 22.8 20.8 16.8 15.8 14.8 13.8 12.8 11.8 10.8 9.8 8.8 7.8 6.8 26.7 25.7 24.7 23.7 13.7 12.7 11.7 10.7 9.7 8.7 14.6 13.6 12.6 11.6 10.6 9.6 12.5 11.5 10.5 12.4 11.4 10.4 12.3 11.3 10.3 9.3 13.2 12.2 11.2 10.2 9.2 13.1 11.1 10.1 9.1 8.1 10.0 9.0'.split(' ');
  var ACCENTS = ['--sky', '--green', '--teal', '--violet'];

  /* ---------------- the order the map arrives in ----------------
     Not its rows: its rings. ORDER is each cell's rank by distance from the
     middle of the map, so the draw-in opens outward from the centre, the
     wipe closes back in on it, and the lit map blooms the same way. */
  var MX = 385, MY = 245;
  var ORDER = (function () {
    var far = CELLS.map(function (cell, i) {
      var p = cell.split('.');
      var x = +p[0] * PITCH + 85 - MX, y = +p[1] * PITCH + 5 - MY;
      return [i, x * x + y * y];
    });
    far.sort(function (a, b) { return a[1] - b[1]; });
    var rank = [];
    far.forEach(function (r, k) { rank[r[0]] = k; });
    return rank;
  })();

  [].slice.call(document.querySelectorAll('[data-map]')).forEach(function (g) {
    CELLS.forEach(function (cell, i) {
      var p = cell.split('.');
      var c = el('circle', { class: 'ab-map__dot', cx: +p[0] * PITCH + 85, cy: +p[1] * PITCH + 5, r: 5 }, g);
      /* the lit map runs green, sky, green, sky across the cell list, and
         each dot comes up a beat after the one nearer the middle */
      c.style.setProperty('--lit', i % 2 ? 'var(--sky)' : 'var(--green)');
      c.style.setProperty('--d', (ORDER[i] * 3) + 'ms');
      c.style.setProperty('--i', ORDER[i]);
      /* and what the lit map breathes on: its own length, its own place in
         that length (negative, so the field is already mid-breath the moment
         it lights) and its own reach -- under 1 for the cells that draw in
         rather than out, so the map swells and hollows instead of pulsing */
      c.style.setProperty('--bt', (5 + Math.random() * 6).toFixed(2) + 's');
      c.style.setProperty('--bd', (-Math.random() * 11).toFixed(2) + 's');
      c.style.setProperty('--bs', (0.72 + Math.random() * 0.73).toFixed(2));
    });
  });

  /* ---------------- the network ----------------
     23 nodes and the seven polylines that join them, read straight out of
     the frame in artwork coordinates -- every line end is a node centre, so
     the lines meet the dots exactly rather than running past them.

     Figma drew the whole thing off the map twice over. The centres come out
     at x divisible by 20 and y 6 past it, where a map cell is 5 past a
     multiple of 20 on both, so five across and one up puts all 23 on the
     lattice. And the frame itself sits four cells to the left of the map:
     slide it back those 80 and every one of the 23 lands not merely on the
     lattice but on a cell the map actually has a dot at -- which is what
     lets a pip stay where it is and become part of the map at the end. */
  var NET_DX = 85, NET_DY = -1;
  var NODES = '120,166 80,226 160,246 240,266 220,366 220,486 220,426 280,346 160,346 320,246 320,166 260,426 180,426 360,306 400,266 460,206 520,146 400,186 280,126 220,166 160,26 220,46 260,26'.split(' ');
  var EDGES = [
    [160.5, 146.5, 'M 0 199.5 L 59.5 219 L 119.5 199.5 M 80 119.5 L 161 99 L 240 41 M 240 41 L 300 59.5 L 360 0 M 240 41 L 240 119.5'],
    [320,   166,   'M 0 0 L 0 80.5 L 40 140'],
    [ 80.5, 225.5, 'M 0 0 L 79 20.5'],
    [160,    26,   'M 0 0 L 60 20 L 100 0'],
    [220,    46,   'M 0 0 L 0 120 L 20 220.5 L 0 319.5 L 0 440'],
    [180.5, 427,   'M 0 0 L 39 0 L 80.5 0'],
    [119,   126.5, 'M 162 0 L 101.5 39.5 L 0 39.5 M 41 119.5 L 121 140.5']
  ];
  var net = document.querySelector('[data-net]');
  if (net) {
    net.setAttribute('transform', 'translate(' + NET_DX + ' ' + NET_DY + ')');
    EDGES.forEach(function (e) {
      var path = el('path', { class: 'ab-edge', d: e[2], transform: 'translate(' + e[0] + ',' + e[1] + ')' }, net);
      /* each line is dashed to its own length, so they all draw at the same
         rate instead of the short ones waiting on the longest */
      var len = path.getTotalLength();
      path.style.strokeDasharray = len.toFixed(1);
      path.setAttribute('data-len', len.toFixed(1));
    });
    /* Beyond the seven Figma draws, a set of shorter runs between nodes that
       are already near each other. They come and go on their own clock, so
       the network reads as something being worked out rather than a diagram:
       connections made, dropped, made again. */
    var pts = NODES.map(function (n) { return n.split(',').map(Number); });
    var extra = el('g', { class: 'ab-net__extra' }, net);
    var pairs = [], ai, bi, dd;
    for (ai = 0; ai < pts.length; ai++) {
      for (bi = ai + 1; bi < pts.length; bi++) {
        dd = Math.sqrt(Math.pow(pts[ai][0] - pts[bi][0], 2) + Math.pow(pts[ai][1] - pts[bi][1], 2));
        if (dd > 48 && dd < 158) pairs.push([ai, bi, dd]);
      }
    }
    /* a fixed scatter of them, so it is the same network every time */
    for (var q = 1, k = 0; q < pairs.length; q += 2, k++) {
      var e = el('line', { class: 'ab-extra',
        x1: pts[pairs[q][0]][0], y1: pts[pairs[q][0]][1],
        x2: pts[pairs[q][1]][0], y2: pts[pairs[q][1]][1] }, extra);
      e.style.setProperty('--i', k);
    }

    NODES.forEach(function (n, i) {
      var p = n.split(',');
      /* the two are the same size: the white disc is there to knock a hole
         in the connectors running under the node and to carry the sky rim,
         not to stand out past the green as a halo */
      el('circle', { class: 'ab-node', cx: p[0], cy: p[1], r: 4 }, net);
      el('circle', { class: 'ab-node__pip', cx: p[0], cy: p[1], r: 4 }, net);
    });
  }

  /* ---------------- where the discs stand on each step ----------------
     [cx, cy, r, accent]. The four are the same four all the way down; on the
     network and the lit map they close to nothing at the artwork's middle.

     Every centre sits on a map dot: the lattice puts dots at x = 85 + 20k and
     y = 5 + 20k, so a centre is only on the grid when it is 5 past a multiple
     of 20 on both axes. Figma's own circles are a few px off in places --
     these are those positions pulled onto the nearest lattice point.

     The concentric stack is centred on the map rather than anywhere else:
     the cells run gx 4..26 and gy 0..24, so the middle of the map is
     85 + 20*15 = 385 across and 5 + 20*12 = 245 down. The stack closes onto
     the spot the map just left. */
  var G = 'green', T = 'teal', S = 'sky', V = 'violet';
  var STEPS = [
    [[285, 185, 110, G], [325, 445,  60, T], [245, 345, 115, S], [445, 305,  75, V]],
    [[385, 245, 200, G], [385, 245, 150, T], [385, 245, 100, S], [385, 245,  50, T]],
    [[225, 185, 100, G], [325, 265, 100, T], [425, 345, 100, S], [525, 425, 100, V]],
    [[305, 165,   4, G], [405, 245,   4, G], [445, 305,   4, G], [485, 265,   4, G]],
    [[305, 165,   0, G], [405, 245,   0, G], [445, 305,   0, G], [485, 265,   0, G]]
  ];
  /* the small centre marks: r per step, and 0 where Figma does not draw them */
  var MARKS = [5, 0, 4, 0, 0];
  /* how solid the discs are: they thin out over the first three steps and
     go solid as they shrink, because what they shrink into is a pip */
  var FILL = [0.3, 0.3, 0.3, 1, 1];
  /* and lose their outline on the way, so a disc that has become a pip is
     the same circle as the pips it has landed among, to the pixel */
  var EDGE = [1, 1, 1, 0, 0];

  var group  = document.querySelector('[data-discs]');
  var map    = document.querySelector('[data-map]');
  var work   = document.getElementById('ab-work');
  var discs  = [].slice.call(document.querySelectorAll('[data-disc]'));
  var pulses = [].slice.call(document.querySelectorAll('[data-pulse]'));
  var marks  = [].slice.call(document.querySelectorAll('[data-mark]'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PULSE = 0.73;            /* Figma's pulse ring is 80 inside the 110 disc */
  var N = STEPS.length;
  var HOLD = 0.62;             /* a step rests for this much of its screen... */
  var MOVE = 1 - HOLD;         /* ...and crosses to the next over the rest */

  /* ---------------- the accents ----------------
     CSS cannot interpolate a custom property, and the fourth disc changes
     accent between steps, so the colours are read off the stylesheet and the
     in-between frames are mixed here. Re-read when the mode flips. */
  var PAL = {};
  function channels(v) {
    if (v.charAt(0) === '#') {
      if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      return [parseInt(v.substr(1, 2), 16), parseInt(v.substr(3, 2), 16), parseInt(v.substr(5, 2), 16)];
    }
    var m = v.match(/-?\d+\.?\d*/g);
    return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
  }
  function palette() {
    var cs = getComputedStyle(document.documentElement);
    ['green', 'teal', 'sky', 'violet'].forEach(function (k) {
      PAL[k] = channels(cs.getPropertyValue('--' + k).trim());
    });
  }
  function mix(a, b, t) {
    if (t <= 0) return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ','
                  + Math.round(a[1] + (b[1] - a[1]) * t) + ','
                  + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  palette();

  function ease(t) {               /* in and out, so a crossing settles */
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function markR(i, j) { return i === 1 ? (j === 3 ? 5 : 0) : MARKS[i]; }
  /* nothing is offset from its circle's centre: every mark sits on the
     centre it belongs to, which is itself a cell of the map */
  function markOff() { return 0; }

  /* ---------------- every frame comes from the scroll ----------------
     p is the scroll's place along the steps: 0 at the top of the first, 5 at
     the foot of the last. A step holds its arrangement for HOLD of its
     screen and spends the rest carrying it over to the next, and each frame
     in between is worked out here -- nothing waits on a transition, so
     nothing snaps at the step line.

     grow is the first step's discs coming in, and it runs earlier than p
     does: the artwork is stuck from the top of the page, so the discs grow
     over the screen the hero spends leaving rather than standing at nothing
     while a stuck picture goes by. By the time the steps pin, they are in. */
  var lit = false, away = false;
  var ptX = null, ptY = null;        /* the pointer, in the artwork's own units */

  var rings = [].slice.call(document.querySelectorAll('[data-ring]'));

  /* ---------------- the network's own wipe ----------------
     a is how much of the ring-and-line network is there, b how much of the
     pips, both 0 to 1 and both off the scroll. Same front as the map: it
     runs down the order the nodes were built in, so they arrive one after
     another and leave the same way. */
  /* ---------------- the wires' travelling band ----------------
     The gradient tiles across the artwork, so sliding it one tile over and
     over sends the accent running along every line at once. It only turns
     while there is line on screen to carry it. */
  var wire = document.getElementById('ab-wire');
  var WIRE_TILE = 160, WIRE_MS = 5200;
  var wireOn = false, wireRaf = 0;
  function wireTick(ts) {
    if (!wireOn) { wireRaf = 0; return; }
    var t = (ts % WIRE_MS) / WIRE_MS * WIRE_TILE;
    wire.setAttribute('gradientTransform', 'translate(' + t.toFixed(1) + ' ' + t.toFixed(1) + ')');
    wireRaf = requestAnimationFrame(wireTick);
  }
  function wireRun(on) {
    if (on === wireOn) return;
    wireOn = on;
    if (on && !wireRaf && wire && !reduce) wireRaf = requestAnimationFrame(wireTick);
  }

  /* ---------------- the radar ----------------
     Figma puts a hand on the Research step: a rule from the middle of the
     stack out to its rim. It turns clockwise and what it turns up are blips,
     sitting on the map's own cells inside the rings and taking the accent of
     whichever ring they fall in. A blip is brightest the instant the hand
     passes it and has faded by the time the hand comes round again, which is
     what makes it read as a sweep rather than a set of lights. */
  var TAU = Math.PI * 2;
  var RX = STEPS[1][0][0], RY = STEPS[1][0][1], RR = STEPS[1][0][2];
  var radar = document.querySelector('[data-radar]');
  var hand = document.querySelector('[data-hand]');
  var trail = document.querySelector('[data-trail]');
  var blips = [];
  (function () {
    var g = document.querySelector('[data-blips]');
    if (!g) return;
    /* a cell sitting on one of the rings reads as a bead threaded on the
       line rather than something the sweep found, so those are left out */
    var RINGS = [50, 100, 150, 200], CLEAR = 7;
    function onARing(d) {
      for (var r = 0; r < RINGS.length; r++) {
        if (Math.abs(d - RINGS[r]) < CLEAR) return true;
      }
      return false;
    }
    var cells = [], gx, gy, x, y, d;
    for (gx = 0; gx < 32; gx++) {
      for (gy = 0; gy < 26; gy++) {
        x = 85 + gx * PITCH; y = 5 + gy * PITCH;
        d = Math.sqrt((x - RX) * (x - RX) + (y - RY) * (y - RY));
        if (d > 34 && d < RR - 10 && !onARing(d)) cells.push([x, y, d]);
      }
    }
    for (var z = 5; z < cells.length; z += 11) {
      var c = cells[z];
      el('circle', { class: 'ab-radar__blip', cx: c[0], cy: c[1], r: 4 }, g);
      var a = Math.atan2(c[0] - RX, RY - c[1]);      /* clockwise from twelve */
      blips.push({ e: g.lastChild, a: a < 0 ? a + TAU : a });
    }
  })();

  /* The trail: a wedge of the dial lying behind the hand, built once in the
     hand's own frame and turned with it. SVG has no gradient that runs round
     a centre, so it is cut into thin slices with the alpha stepping down --
     at this strength the steps read as one fading wake. */
  (function () {
    var g = document.querySelector('[data-trail]');
    if (!g) return;
    var SLICES = 16, SPAN = 76 * Math.PI / 180, top = 0.26;
    function at(th) {
      return (RX + RR * Math.sin(th)).toFixed(2) + ' ' + (RY - RR * Math.cos(th)).toFixed(2);
    }
    for (var k = 0; k < SLICES; k++) {
      var a = -SPAN * k / SLICES, b = -SPAN * (k + 1) / SLICES;
      var w = el('path', { d: 'M ' + RX + ' ' + RY + ' L ' + at(a) + ' L ' + at(b) + ' Z' }, g);
      /* falls away from the hand, and off a cliff at the tail */
      w.setAttribute('fill-opacity', (top * Math.pow(1 - k / SLICES, 1.6)).toFixed(3));
    }
  })();

  var SWEEP = 4600;                                  /* a turn, in ms */
  var sweepOn = false, sweepRaf = 0;
  function sweepTick(ts) {
    if (!sweepOn) { sweepRaf = 0; return; }
    var th = (ts % SWEEP) / SWEEP * TAU;
    var turn = 'rotate(' + (th * 180 / Math.PI).toFixed(1) + ' ' + RX + ' ' + RY + ')';
    if (hand) hand.setAttribute('transform', turn);
    if (trail) trail.setAttribute('transform', turn);
    for (var z = 0; z < blips.length; z++) {
      var a = (th - blips[z].a) % TAU;
      if (a < 0) a += TAU;
      var v = 1 - a / TAU; v *= v * v;               /* bright, then gone */
      blips[z].e.style.opacity = v.toFixed(3);
    }
    sweepRaf = requestAnimationFrame(sweepTick);
  }
  function sweepRun(on) {
    if (on === sweepOn) return;
    sweepOn = on;
    if (radar) radar.classList.toggle('is-sweeping', on);
    if (on && !sweepRaf && !reduce) sweepRaf = requestAnimationFrame(sweepTick);
  }

  var edges = net ? [].slice.call(net.querySelectorAll('.ab-edge')) : [];
  var nodes = net ? [].slice.call(net.querySelectorAll('.ab-node')) : [];
  var pips  = net ? [].slice.call(net.querySelectorAll('.ab-node__pip')) : [];
  var NSPAN = 6, hasNodes = -1, hasPips = -1;
  function run(list, a, span) {
    var n = list.length, front = a * (n + span), z, v;
    for (z = 0; z < n; z++) {
      v = clamp((front - z) / span);
      list[z].style.opacity = v.toFixed(2);
      list[z].style.transform = v >= 1 ? 'none' : 'scale(' + (0.4 + 0.6 * v).toFixed(3) + ')';
    }
  }
  var extraG = net ? net.querySelector('.ab-net__extra') : null;
  function netState(a, b) {
    if (a !== hasNodes) {
      hasNodes = a; run(nodes, a, NSPAN);
      if (extraG) { extraG.style.opacity = a.toFixed(2); extraG.classList.toggle('is-live', a > 0.02); }
    }
    if (b !== hasPips)  { hasPips  = b; run(pips,  b, NSPAN); }
  }

  /* ---------------- the map's wipe ----------------
     a is how much of the map is there, 0 to 1. The front of the wipe runs
     down the same order the map arrived in -- out from the middle -- so as a
     falls the rim goes first and the map closes in on its centre, and as a
     rises it opens back out. SPAN is how many cells deep the soft edge is. */
  var SPAN = 26, shown = -1;
  function wipe(a) {
    if (a === shown) return;
    shown = a;
    var n = dots.length, z;
    if (a >= 1) { for (z = 0; z < n; z++) dots[z].style.opacity = ''; return; }
    if (a <= 0) { for (z = 0; z < n; z++) dots[z].style.opacity = '0'; return; }
    var front = a * (n + SPAN);
    for (z = 0; z < n; z++) {
      var v = (front - ORDER[z]) / SPAN;         /* its rank out from the middle */
      dots[z].style.opacity = v <= 0 ? '0' : v >= 1 ? '' : v.toFixed(2);
    }
  }

  function draw(p, grow) {
    var i = Math.max(0, Math.min(N - 1, Math.floor(p)));
    var t = clamp(p - i);
    var n = Math.min(N - 1, i + 1);
    var A = STEPS[i], B = STEPS[n];
    var m = t > HOLD ? ease((t - HOLD) / MOVE) : 0;
    var k = i === 0 ? clamp(grow) : 1;

    /* The two crossings either side of the network, as raw 0 to 1 runs: gi
       is the chain closing onto it, go is it giving way to the map. Within
       each, the parts take their turn rather than all moving at once --
       nodes before lines on the way in; lines, then nodes, then the map on
       the way out, so nothing is ever drawing while something else is
       undrawing in the same place. */
    var gi = clamp((p - 2 - HOLD) / MOVE);
    var go = clamp((p - 3 - HOLD) / MOVE);

    discs.forEach(function (d, j) {
      var a = A[j], b = B[j];
      var cx = a[0] + (b[0] - a[0]) * m;
      var cy = a[1] + (b[1] - a[1]) * m;
      var r  = a[2] * k; r = r + (b[2] - r) * m;
      var col = mix(PAL[a[3]], PAL[b[3]], m);

      d.setAttribute('cx', cx.toFixed(1));
      d.setAttribute('cy', cy.toFixed(1));
      d.setAttribute('r', r.toFixed(1));
      d.style.setProperty('--c', col);
      d.style.setProperty('--i', j);        /* its turn in the chain */
      d.style.setProperty('--swell', 'ab-swell-' + j);   /* and its own keyframes */
      d.style.setProperty('--fo', (FILL[i] + (FILL[n] - FILL[i]) * m).toFixed(2));
      d.style.setProperty('--sw', (EDGE[i] + (EDGE[n] - EDGE[i]) * m).toFixed(2));

      var q = pulses[j];
      if (q) {
        q.setAttribute('cx', cx.toFixed(1));
        q.setAttribute('cy', cy.toFixed(1));
        q.setAttribute('r', (r * PULSE).toFixed(1));
        q.style.setProperty('--c', col);
        q.style.setProperty('--i', j);           /* its turn in the round */
      }
      var s = marks[j];
      if (s) {
        /* The white centres are not part of the move. One going away goes
           early, before its circle has started to shrink; one arriving
           waits until the next arrangement has all but settled. */
        var ma = markR(i, j), mb = markR(n, j);
        var mp = mb < ma ? ease(clamp(m / 0.3)) : ease(clamp((m - 0.6) / 0.4));
        var mr = ma * k; mr = mr + (mb - mr) * mp;
        s.setAttribute('cx', cx.toFixed(1));
        s.setAttribute('cy', cy.toFixed(1));
        s.setAttribute('r', Math.max(0, mr).toFixed(1));
        s.style.setProperty('--c', col);
      }
    });

    /* the map is the ground under the first step, the ground under the
       network, and the subject of the last: it goes as the discs close up,
       and comes back as the chain lands on the network -- early in that
       crossing, so the nodes settle onto a field that is already there and
       the connectors draw over it. From then it simply stays, and the final
       step lights it rather than building it again. It does not fade as one
       piece -- the cells leave the way they arrived, one after another, only
       backwards; and when it returns they come back out from the middle, in
       the order they were first drawn. */
    if (map) {
      var a;
      if (p < HOLD)          a = 1;                             /* the ground */
      else if (p < 1)        a = 1 - ease((p - HOLD) / MOVE);   /* and it goes */
      else if (p < 2 + HOLD) a = 0;                             /* two steps away */
      else if (p < 3)        a = ease(clamp(gi / 0.6));         /* under the network */
      else if (p < 3 + HOLD) a = 1;
      else if (p < 4) {
        /* The last crossing is the map's own. It clears out of the network
           fast -- a third of the move, closing in on its middle the way it
           always leaves -- rests a moment at nothing, and then opens back
           out from that same middle, lit. Same wipe, same radial order, so
           the going and the coming are one gesture turned around. */
        a = go < 0.30 ? 1 - ease(go / 0.30)
          : go < 0.45 ? 0
          : ease((go - 0.45) / 0.55);
      }
      else a = 1;
      wipe(a);
      away = a < 0.9;
      /* it changes colour in the gap, where there is nothing to see it */
      var l = p >= 3 + HOLD + MOVE * 0.37;
      if (l !== lit) {
        /* put the cascade delays back, in case the idle shuffle below has
           been setting cells to change at once */
        if (l) dots.forEach(function (e, z) {
          e.style.setProperty('--d', (z * 3) + 'ms');
          e.style.removeProperty('--fd');
          e.style.removeProperty('--fe');
        });
        lit = l;
        map.classList.toggle('is-lit', l);
      }
    }

    /* A disc broadcasts only while it is standing still -- a ring thrown off
       a moving disc reads as a wobble. The stack sends one from its outer
       circle; the chain sends one from each of the four, in turn. */
    rings.forEach(function (e, j) {
      var o = discs[j];
      if (!o) return;
      e.setAttribute('cx', o.getAttribute('cx'));
      e.setAttribute('cy', o.getAttribute('cy'));
      e.setAttribute('r', o.getAttribute('r'));
      e.style.setProperty('--c', o.style.getPropertyValue('--c'));
      e.style.setProperty('--i', j);
    });
    group.classList.toggle('is-ringing', i === 1 && t <= HOLD);
    group.classList.toggle('is-ringing-each', i === 2 && t <= HOLD);
    sweepRun(i === 1 && t <= HOLD);

    /* The network is wound by the same scroll: the lines run out as the
       chain closes onto them, and retract the same way as the map comes
       back. The pips are held to the very last -- each one stands on a map
       cell, so when the map returns underneath them they have only to turn
       colour to be part of it, rather than one thing leaving and another
       arriving in its place. */
    if (net) {
      var nodesIn  = ease(clamp(gi / 0.55));           /* the circles first */
      var linesIn  = ease(clamp((gi - 0.45) / 0.55));  /* then the lines */
      var linesOut = ease(clamp(go / 0.40));           /* lines go first... */
      var nodesOut = ease(clamp((go - 0.30) / 0.40));  /* ...then the circles */
      var pipsOut  = ease(clamp((go - 0.70) / 0.30));  /* pips last of all */
      wireRun(linesIn > 0 && linesOut < 1);
      var undrawn = clamp(1 - linesIn + linesOut);
      edges.forEach(function (e) {
        e.style.strokeDashoffset = (+e.getAttribute('data-len') * undrawn).toFixed(1);
      });
      netState(nodesIn * (1 - nodesOut), nodesIn * (1 - pipsOut));
    }

    /* On the stack, the ring the pointer is standing in answers by a tenth.
       The four share a centre, so it is whichever is the smallest ring still
       big enough to hold the pointer, and none of them once it is outside. */
    var ring = -1;
    if (i === 1 && t <= HOLD && ptX !== null) {
      var set1 = STEPS[1];
      var pd = Math.sqrt((ptX - set1[0][0]) * (ptX - set1[0][0]) +
                         (ptY - set1[0][1]) * (ptY - set1[0][1]));
      var near = Infinity;
      for (var q = 0; q < set1.length; q++) {
        if (set1[q][2] >= pd && set1[q][2] < near) { near = set1[q][2]; ring = q; }
      }
    }
    discs.forEach(function (d, q) { d.style.transform = q === ring ? 'scale(1.1)' : ''; });

    /* the four take turns only once they are all the way in and at rest */
    group.classList.toggle('is-pulsing', i === 0 && k > 0.999 && t <= HOLD);

    if (thumb) thumb.style.setProperty('--k', (p / N).toFixed(4));

    /* the words change hands in the middle of the crossing, not at its edge */
    var on = t > 0.80 ? n : i;
    items.forEach(function (e, x) { e.classList.toggle('is-on', x === on); });
    panels.forEach(function (e, x) { e.classList.toggle('is-on', x === on); });
  }

  /* ---------------- the lattice ----------------
     The dot field is a tile centred on the field element itself, so a cell
     sits on every PITCH from its middle. Nudge the artwork by whatever is
     left over and the two grids coincide.

     Measured off .dotfield rather than the window: a classic scrollbar is
     inside innerWidth but outside the fixed field, and half of it is enough
     to throw the two lattices apart. And run on every scroll frame, not
     only on load and resize -- a web font arriving late, or anything else
     that shifts the layout under the artwork, would otherwise leave the
     nudge stale with nothing to correct it. The write is skipped unless the
     answer has actually changed, so the usual frame costs one rect read. */
  var arts = [].slice.call(document.querySelectorAll('.ab-art__svg'));
  var field = document.querySelector('.dotfield');
  function snap() {
    var f = field ? field.getBoundingClientRect() : null;
    var fx = f && f.width ? f.left + f.width / 2 : innerWidth / 2;
    var fy = f && f.height ? f.top + f.height / 2 : innerHeight / 2;
    arts.forEach(function (svg) {
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var k = r.width / 600;                       /* drawn size vs the frame */
      var p = PITCH * k;
      var ax = svg.__sx || 0, ay = svg.__sy || 0;  /* the nudge already on it */
      var dx = ((fx - (r.left - ax + 85 * k)) % p + p) % p;
      var dy = ((fy - (r.top - ay + 5 * k)) % p + p) % p;
      if (Math.abs(dx - ax) < 0.05 && Math.abs(dy - ay) < 0.05) return;
      svg.__sx = dx; svg.__sy = dy;
      svg.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
  addEventListener('load', snap);

  /* ---------------- the map draws itself in ----------------
     The draw-in itself is a css animation on each dot, keyed off --i, so it
     runs from the moment the dot is made. This is only how long it takes. */
  var dots = map ? [].slice.call(map.querySelectorAll('.ab-map__dot')) : [];
  /* The last cell starts at ORDER 217 x 2ms and takes .26 to arrive, so the
     field is up at about 694. Everything that follows -- retiring the draw,
     seeding the colour -- waits well past that: both of them put a different
     animation on a cell, and a cell still drawing when that lands jumps to
     full size on the spot. 300ms of margin was not margin. */
  var DRAWN = reduce ? 0 : dots.length * 2 + 700;

  /* ---------------- then the twinkle ----------------
     On a clock, not on the scroll: as soon as the map is up, cells take an
     accent at random and give it back, a few of them lit at any moment.

     Slow is the whole point, and it has to stay slow once the field is full.
     A cell takes eight to twelve seconds to come up, hold and go back down,
     four of them just rising, and one starts every third of a second or so --
     around thirty of them in hand at any moment, which is more colour than
     before and less event, because none of it is ever quick.

     `busy` is what keeps it that way. Picking at random out of 218 cells
     means picking one that is already lit often enough to notice, and a cell
     restarted mid-fade jumps back to cobalt and begins again -- a hard blink
     in the middle of the one thing that is meant not to blink. Worse, its
     first timer was still running, so it would also cut the second fade off
     early. Lit cells are simply not in the draw. That is the difference
     between gentle at the start and gentle at minute three.

     It rests while the map is away, and while the map is lit at the end --
     and it belongs to the navy map alone. The same field stands in grey
     behind the network a few steps down, where it is ground rather than
     subject and colour coming and going in it only competes with the nodes. */
  var busy = {};
  function light(seed) {
    var k = -1;
    for (var tries = 0; tries < 12; tries++) {
      var g = (Math.random() * dots.length) | 0;
      if (!busy[g]) { k = g; break; }
    }
    if (k < 0) return;                      /* field is full; wait one round */
    busy[k] = 1;
    var d = dots[k];
    var ms = 4000 + Math.random() * 3000;
    /* a seeded cell is dropped in part way through its own fade, so the first
       sight of the map is a field already in colour rather than one coming
       into it; it then has only the rest of its life left to run */
    var into = seed ? Math.random() * ms : 0;
    d.style.setProperty('--tw', 'var(' + ACCENTS[(Math.random() * ACCENTS.length) | 0] + ')');
    d.style.setProperty('--tt', ms + 'ms');
    d.style.setProperty('--tdly', into ? (-into | 0) + 'ms' : '0s');
    d.classList.add('is-twinkle');
    setTimeout(function () { d.classList.remove('is-twinkle'); delete busy[k]; }, ms - into);
  }
  /* The field is seeded right here, in the same pass that made the cells, so
     the map draws in with the colour already in it rather than taking it on
     once it is standing. Each seeded cell carries a negative delay, so it is
     part way through its own fade before it has finished arriving -- and the
     two animations run side by side (see css/about.css). */
  if (dots.length && !reduce) {
    for (var q = 0; q < 46; q++) light(true);
  }

  if (dots.length && !reduce) {
    /* the draw-in is spent by now: retiring it stops the twinkle's own
       add-and-remove from replaying it (see css/about.css, .is-drawn) */
    setTimeout(function () { map.classList.add('is-drawn'); }, DRAWN);
    setTimeout(function blink() {
      if (!away && !lit && document.documentElement.classList.contains('is-blue')) {
        var n = 1 + ((Math.random() * 2) | 0);
        while (n--) light();
      } else {
        /* off the navy, take back any still holding an accent rather than
           letting them run out one by one over the grey */
        for (var z = 0; z < dots.length; z++) dots[z].classList.remove('is-twinkle');
        busy = {};
      }
      setTimeout(blink, 150 + Math.random() * 130);
    }, DRAWN);
  }

  /* ---------------- and the lit map never quite settles ----------------
     Once it is up it keeps turning over: cells take a different accent at
     random, a few at a time, for as long as it is standing there. Mostly
     the two the frame is drawn in, with the other two coming through now
     and again. Those cells change at once rather than on the cascade's
     delay, which belongs to the map's first lighting -- and they take the
     long, eased fill rather than the sweep's half second, one or two at a
     time, so what you see is colour moving through the field rather than
     cells being repainted in it. */
  var LIT = ['--green', '--sky', '--green', '--sky', '--teal', '--violet'];
  if (dots.length && !reduce) {
    setInterval(function () {
      if (!lit || away) return;
      var n = 1 + ((Math.random() * 2) | 0);
      while (n--) {
        var d = dots[(Math.random() * dots.length) | 0];
        d.style.setProperty('--d', '0ms');
        d.style.setProperty('--fd', (1.1 + Math.random() * 0.8).toFixed(2) + 's');
        d.style.setProperty('--fe', 'ease-in-out');
        d.style.setProperty('--lit', 'var(' + LIT[(Math.random() * LIT.length) | 0] + ')');
      }
    }, 95);
  }

  /* ---------------- the pointer halo ----------------
     The background field does not grow one dot under the cursor: it swells
     the cells around it in rings, 2.5 / 1.5 / 1 / .5 by cell distance from
     a lattice-snapped centre (css/style.css, section 14). The map answers
     the pointer the same way and in the same bands, at a tenth the
     strength -- a tenth on the cell under the pointer, tapering to a
     fiftieth three cells out -- so the two fields swell alike. */
  var HALO = [0.10, 0.06, 0.04, 0.02];
  /* Wherever the map is standing -- behind the hero, under the first step,
     lit at the last -- it answers much harder than the field behind it, and
     one cell further out. The top of the range is set by the lattice: a 10
     dot on a 20 pitch can reach about 1.8 before it touches its neighbours,
     so that is the ceiling. Where the map is away, the discs are the subject
     and the field keeps its own ordered falloff. */
  var HALO_MAP = [0.55, 0.38, 0.24, 0.13, 0.06];
  var art = document.querySelector('.ab-art');
  var svgEl = document.querySelector('.ab-art__svg');
  var DX = dots.map(function (d) { return +d.getAttribute('cx'); });
  var DY = dots.map(function (d) { return +d.getAttribute('cy'); });
  var haloCell = '', haloRaf = 0, haloX = 0, haloY = 0;

  function halo(px, py) {
    var sx = null, sy = null, key = '';
    if (px !== null) {
      sx = 85 + Math.round((px - 85) / PITCH) * PITCH;
      sy = 5 + Math.round((py - 5) / PITCH) * PITCH;
      key = sx + ',' + sy;
    }
    if (key === haloCell) return;          /* same cell, nothing to redraw */
    haloCell = key;
    for (var z = 0; z < dots.length; z++) {
      var v = 1;
      if (sx !== null) {
        var band = Math.round(Math.sqrt((DX[z] - sx) * (DX[z] - sx) +
                                        (DY[z] - sy) * (DY[z] - sy)) / PITCH);
        /* Where the map is, the swell is thrown rather than measured: every
           cell in reach takes its own share of the band, re-rolled each time
           the pointer crosses into a new cell, so the map answers unevenly.
           Where it is away, the field's own ordered falloff is all there is
           to answer with. */
        var here = !away;                     /* is the map under the pointer */
        var table = here ? HALO_MAP : HALO;
        if (band < table.length) {
          v = here ? 1 + HALO_MAP[band] * (0.75 + Math.random() * 0.55)
                   : 1 + HALO[band];
        }
      }
      dots[z].style.setProperty('--s', v.toFixed(3));
    }
  }

  if (art && svgEl && dots.length && !reduce) {
    art.addEventListener('pointermove', function (e) {
      haloX = e.clientX; haloY = e.clientY;
      if (haloRaf) return;
      haloRaf = requestAnimationFrame(function () {
        haloRaf = 0;
        var m = svgEl.getScreenCTM();
        if (!m) return;
        var pt = svgEl.createSVGPoint();
        pt.x = haloX; pt.y = haloY;
        pt = pt.matrixTransform(m.inverse());
        ptX = pt.x; ptY = pt.y;
        halo(pt.x, pt.y);
        read();                      /* the centre marks answer the pointer too */
      });
    }, { passive: true });
    art.addEventListener('pointerleave', function () {
      ptX = ptY = null;
      halo(null, null);
      read();
    }, { passive: true });
  }

  var items  = work ? [].slice.call(work.querySelectorAll('.ab-index__item')) : [];
  var panels = work ? [].slice.call(work.querySelectorAll('.ab-panel')) : [];
  var thumb  = document.querySelector('.ab-index__thumb');

  if (!work || !group) { draw(0, 0); snap(); addEventListener('resize', snap); return; }

  /* Each index line is a button that takes you to the middle of its step's
     rest, so you land on the arrangement rather than mid-crossing. */
  items.forEach(function (li, x) {
    var btn = li.querySelector('.ab-index__link');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var r = work.getBoundingClientRect();
      var run = r.height - window.innerHeight;
      if (run <= 0) return;
      var y = r.top + (window.scrollY || document.documentElement.scrollTop)
            + run * (x + HOLD / 2) / N;
      window.scrollTo({ top: Math.round(y), behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  var queued = false;
  function read() {
    queued = false;
    snap();
    var r = work.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.top > 0) {
      /* the hero is still on its way out and the artwork is already stuck,
         so the discs come in over that screen */
      var q = clamp((vh - r.top) / vh);
      draw(0, 1 - Math.pow(1 - q, 3));
      return;
    }
    var run = r.height - vh;
    draw((run > 0 ? clamp(-r.top / run) : 0) * N, 1);
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(read); } }

  /* the accents can differ between light and navy, so pick them up again
     when the mode flips and redraw the frame the scroll is on */
  new MutationObserver(function () { palette(); read(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { snap(); onScroll(); });
  snap();
  read();
})();
