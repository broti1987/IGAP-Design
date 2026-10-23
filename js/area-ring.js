/* AREAS OF FOCUS — the ring
   ---------------------------------------------------------------------------
   Three jobs, all of them about one piece of artwork:

   1. Mode. This page is the inverse of capabilities.html: one dark section at
      the top and paper below it, rather than light-then-blue. There is no
      section-crossing to detect, so `is-blue` ships on in the markup and
      comes off once the hero is half gone. (body carries a data-blue-from
      that matches nothing, so site.js's own mode watcher stands down.)

   2. Lighting. The circle belonging to whichever area is crossing the middle
      of the viewport is lit; the rest stay muted. An IntersectionObserver
      with a rootMargin that collapses the viewport to its centre line gives
      exactly that, with no scroll maths and no per-frame work.

   3. The warp. Hovering a circle sends a travelling wave around it and puts
      that area's name beside it, on whichever side of the ring it sits. The
      geometry is rewritten per frame, so only the hovered circle animates and
      only while the pointer is on it. */
(function () {
  'use strict';

  var boot  = null, rotor = null;
  var ring  = document.getElementById('ar-ring');
  var stage = document.getElementById('ar-stage');
  var svg   = ring && ring.querySelector('.ring__svg');
  if (svg) rotor = svg.querySelector('.ring__rotor');
  var label = document.getElementById('ring-num');
  var hero  = document.getElementById('ar-hero');
  var root  = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- 1. mode */
  if (hero) {
    var queued = false;
    function applyMode() {
      queued = false;
      var r = hero.getBoundingClientRect();
      var inHero = r.bottom > window.innerHeight * 0.5;
      ringTravel(r);
      root.classList.toggle('is-blue', inHero);
      /* Two things change with the hero: the ring shows all eight in
         colour up there and one at a time below (`is-all`), and it is drawn
         at 550 up there against 1000 below (`is-wide`). */
      if (svg) {
        svg.classList.toggle('is-all', inHero);
        svg.classList.toggle('is-wide', !inHero);
      }
      inHeroNow = inHero;
      setSpin(inHero && !hovered);
      /* Back at the top the hero shows all eight as outlines, so whatever
         the scroll had lit has to be put out -- leaving `is-lit` on meant a
         stray filled disc sitting over the hero. */
      if (inHero) { hideNum(); clearLit(); }
      /* The ring is sticky, so scrolling moves it under the label. The wave
         re-places the label every frame, but it does not run under reduced
         motion -- so the scroll pass keeps it honest too. */
      else if (reduce && label && label.classList.contains('is-on')) {
        placeName(hovered || lit);
      }
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(applyMode);
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    /* NOT called here: applyMode clears the lit circle, and `circles` is not
       built until further down. Run once at the end, when it exists. */
    boot = applyMode;
  }

  /* --------------------------------------------------------- 2. lighting */
  var circles = ring ? Array.prototype.slice.call(ring.querySelectorAll('.ring__g')) : [];
  var sections = Array.prototype.slice.call(document.querySelectorAll('.area'));

  /* SVG has no z-index: what paints on top is whatever comes last. The lit
     circle overlaps seven others, so it is moved to the end of the group
     rather than left to be crossed by its neighbours' lines. */
  function raise(g) {
    if (g && g.parentNode && g.parentNode.lastElementChild !== g) {
      g.parentNode.appendChild(g);
    }
  }
  var lit = null, hovered = null;

  /* Which position on the ring the live circle is brought to. On a desktop
     the artwork hangs off the right edge, so nine o'clock is the only place
     a circle shows whole; on a phone it hangs off the BOTTOM, so twelve is.
     The circles are drawn at 315, 0, 45 ... and the rotor carries whatever
     turn lands area n on that slot.

     --turn is tracked in degrees rather than read back, so every move can be
     sent the short way round: the target is taken to whichever revolution
     sits nearest where the ring already is. Eight to one is then a 45
     forward, not a 315 unwind. */
  var inHeroNow = false;
  var wide = matchMedia('(min-width: 768px)');
  var SLOT_WIDE = 270, SLOT_NARROW = 0;
  var angle = 0, spinning = false;

  function setTurn(deg) {
    angle = deg;
    if (rotor) rotor.style.setProperty('--turn', deg.toFixed(2) + 'deg');
  }
  function turn(n) {
    var drawn = (315 + 45 * (n - 1)) % 360;
    var want = (wide.matches ? SLOT_WIDE : SLOT_NARROW) - drawn;
    setTurn(want + 360 * Math.round((angle - want) / 360));
  }
  /* the slot moves with the breakpoint, so the lit circle has to follow */
  wide.addEventListener('change', function () { if (lit) turn(+lit.dataset.area); });

  /* The spin is a CSS animation and the notch is a transition, so they
     cannot both own the transform. Switching between them without a jump
     means freezing the ring at the angle the animation had actually
     reached -- read off the live matrix, since the keyframes run on the
     compositor and nothing else knows where they got to. */
  function liveAngle() {
    if (!rotor) return angle;
    var m = getComputedStyle(rotor).transform;
    if (!m || m === 'none') return angle;
    var p = m.slice(m.indexOf('(') + 1, -1).split(',').map(parseFloat);
    if (p.length < 6) return angle;
    var deg = Math.atan2(p[1], p[0]) * 180 / Math.PI;
    /* atan2 gives -180..180; carry it to the revolution we were already on */
    return deg + 360 * Math.round((angle - deg) / 360);
  }
  function setSpin(on) {
    if (on === spinning || !ring) return;
    if (!on) setTurn(liveAngle());     /* freeze first, then hand over */
    spinning = on;
    ring.classList.toggle('is-spin', on);
    /* The observer may have lit an area while the spin still owned the
       transform, in which case that turn was overwritten by the freeze.
       Re-issue it once the class is off and the transition can run. */
    if (!on && lit) {
      var n = +lit.dataset.area;
      requestAnimationFrame(function () { turn(n); });
    }
  }

  /* One slot, two readings. Scrolling an area into view puts its NUMBER in
     the live circle, as the design file draws the sections; hovering in the
     hero puts that area's ICON there instead -- the same glyph as the badge
     at the head of its copy, which is what the hover frame draws. */
  function showNum(c) {
    if (!label) return;
    label.textContent = ('0' + c.dataset.area).slice(-2);
    mark(c, false);
  }
  function showIcon(c) {
    if (!label) return;
    label.innerHTML = '<svg class="ring__icon" viewBox="0 0 48 48" aria-hidden="true">'
                    + '<use href="#ic-' + c.dataset.area + '" width="48" height="48"></use></svg>';
    mark(c, true);
  }
  function mark(c, isIcon) {
    label.dataset.accent = c.dataset.accent;
    label.classList.toggle('is-icon', isIcon);
    placeName(c);
    label.classList.add('is-on');
  }
  /* The label is HTML, so it stays upright while the artwork turns -- but it
     has to be told where its circle has got to. */
  function placeName(c) {
    if (!label || !c) return;
    var host = rotor || svg, box = ring.getBoundingClientRect();
    var x = +c.dataset.cx, y = +c.dataset.cy;
    if (host && host.getScreenCTM) {
      var m = host.getScreenCTM();
      if (m) {
        x = ((m.a * +c.dataset.cx + m.c * +c.dataset.cy + m.e) - box.left) / box.width * 700;
        y = ((m.b * +c.dataset.cx + m.d * +c.dataset.cy + m.f) - box.top) / box.height * 700;
      }
    }
    label.style.setProperty('--lx', (x / 700) * 100);
    label.style.setProperty('--ly', (y / 700) * 100);
  }
  function hideNum() { if (label) label.classList.remove('is-on'); }

  function clearLit() {
    circles.forEach(function (c) { c.classList.remove('is-lit'); });
    lit = null;
    applyWarp();
  }
  function light(n) {
    /* Turn FIRST: the label is placed off the rotor's live matrix, so
       placing it before the turn pins it where the circle used to be. With
       the wave running, the next frame corrects that -- but reduced motion
       has no frames and no transition, and the label would simply stay
       wrong. */
    turn(n);
    circles.forEach(function (c) {
      var on = +c.dataset.area === n;
      c.classList.toggle('is-lit', on);
      if (on) { lit = c; raise(c); if (!hovered) showNum(c); }
    });
    applyWarp();
  }
  /* The wave belongs to whichever circle is live: the hovered one if there
     is one, otherwise the one the scroll has lit. Only ever one at a time. */
  function applyWarp() { setWarp(hovered || lit); }

  if (circles.length && sections.length && 'IntersectionObserver' in window) {
    /* -50% top and bottom leaves a one-pixel band across the middle of the
       viewport: whichever section is crossing it is the one being read. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) light(+e.target.dataset.area);
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------- 3. the ring's travel */
  /* The artwork sits 141 higher in the hero than in the sections and at .8
     of its size -- Figma's 480 of flower against 600 -- and it makes that
     crossing with the finger rather than on a class change at a threshold.
     --ring-p is how far through the crossing we are: 0 while the hero is
     whole, 1 by the time its bottom edge reaches the middle of the screen,
     which is the same line the light/navy switch turns on. --ring-k is the
     stroke's scale compensation and has to follow the same number, as a
     plain one so the 1px divide stays a divide. */
  function ringTravel(r) {
    if (!svg) return;
    if (wide.matches) {
      svg.style.removeProperty('--ring-p');
      svg.style.removeProperty('--ring-k');
      return;
    }
    var vh = window.innerHeight;
    var p = Math.max(0, Math.min(1, (vh - r.bottom) / (vh * 0.5)));
    svg.style.setProperty('--ring-p', p.toFixed(4));
    svg.style.setProperty('--ring-k', (0.8 + 0.2 * p).toFixed(4));
  }
  wide.addEventListener('change', function () {
    if (hero) ringTravel(hero.getBoundingClientRect());
  });

  /* ---------------------------------------------- 4. the areas accordion */
  /* One toggle per area, and it is a trade rather than an expansion: the
     description and the areas list share the column, so opening the list
     shuts the description. `is-open` on the section drives both panels and
     the plus/minus, which keeps the whole state in one class. */
  Array.prototype.forEach.call(document.querySelectorAll('.area'), function (area) {
    var btn = area.querySelector('.ar-acc__btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !area.classList.contains('is-open');
      area.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ------------------------------------------------------- 4. the wave */
  /* A circle redrawn as a closed curve whose radius breathes with a sine of
     the angle. Quadratic segments THROUGH the midpoints with the sampled
     points as controls: smooth at any amplitude, and cheap enough to rebuild
     every frame. One circle warps at a time -- the live one. */
  /* Six lobes on a filled 249 disc read as a wave; on a 498 outline they
     read as a hexagon, because the shape is now all edge and twice the
     size. Twelve shorter lobes at a smaller amplitude put the motion back
     in the rim rather than in the silhouette. */
  var N = 160, WAVES = 12, AMP = 2.5, SPEED = 2.2, RAMP = 6;

  /* The wave is confined to an arc on the circle's left -- the free outer
     edge, the one not buried in the rest of the ring. SPAN is the whole
     arc, so the window reaches HALF either side of its centre: at PI that
     is the entire left half, from twelve o'clock round to six. */
  var SPAN = Math.PI;

  /* Cut the wave off at the edges of that arc and it would leave two
     corners. A raised cosine takes the amplitude to zero AND its slope to
     zero at both ends, so the warped arc joins the untouched circle with no
     visible seam. Inside, the wave still travels: lobes ride through the
     window and die out at its edges rather than running round the rim. */
  function window_(a, centre) {
    var d = Math.abs(((a - centre + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
    var half = SPAN / 2;
    return d >= half ? 0 : 0.5 * (1 + Math.cos(Math.PI * d / half));
  }

  function warpPath(cx, cy, r, amp, phase, centre) {
    var pts = [], i, a, rr;
    for (i = 0; i < N; i++) {
      a = (i / N) * Math.PI * 2;
      rr = r + amp * window_(a, centre) * Math.sin(WAVES * a + phase);
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    var mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    var m0 = mid(pts[N - 1], pts[0]);
    var d = 'M' + m0[0].toFixed(2) + ' ' + m0[1].toFixed(2);
    for (i = 0; i < N; i++) {
      var p = pts[i], m = mid(p, pts[(i + 1) % N]);
      d += 'Q' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ' + m[0].toFixed(2) + ' ' + m[1].toFixed(2);
    }
    return d + 'Z';
  }

  /* Outline and disc are the same circle, so both are rewritten: whichever
     of the two is showing, the wave is on it. */
  function paths(g) { return [g.querySelector('.ring__c')]; }
  function restore(g) { paths(g).forEach(function (t) { t.setAttribute('d', g.dataset.rest); }); }

  var warpEl = null, amp = 0, phase = 0, raf = 0, last = 0;

  function setWarp(g) {
    if (warpEl === g) return;
    if (warpEl) restore(warpEl);
    warpEl = g;
    amp = 0;                       /* every handover eases in from flat */
    if (g && !reduce) {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    } else if (!g && raf) {
      cancelAnimationFrame(raf); raf = 0;
    }
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    phase += dt * SPEED * Math.PI;
    amp += (AMP - amp) * (1 - Math.exp(-dt * RAMP));
    if (!warpEl) { raf = 0; return; }
    /* "Left" means left on screen, but the path is drawn in the rotor's own
       coordinates, which turn with it. The rotor's live matrix gives the
       angle it has reached, and taking that off PI puts the window back on
       the screen's left whatever the artwork is doing. */
    var rot = 0, host = rotor || svg;
    if (host && host.getScreenCTM) {
      var m = host.getScreenCTM();
      if (m) rot = Math.atan2(m.b, m.a);
    }
    /* the free edge is the one facing away from the rest of the ring: left
       on a desktop, where the artwork runs off the right, and up on a phone,
       where it runs off the bottom */
    var face = wide.matches ? Math.PI : -Math.PI / 2;
    var d = warpPath(+warpEl.dataset.cx, +warpEl.dataset.cy, +warpEl.dataset.r,
                     amp, phase, face - rot);
    paths(warpEl).forEach(function (t) { t.setAttribute('d', d); });
    placeName(warpEl);
    raf = requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------- 5. pointer */
  /* Hit-tested here rather than in CSS. The eight discs all overlap at the
     ring's centre, so "whichever shape is on top" would hand every shared
     pixel to the circle that happens to paint last -- and the live circle is
     deliberately painted last. Nearest centre among the discs containing the
     pointer is the circle you are actually inside. */
  /* Pointer -> the rotor's local space. Using the live CTM rather than the
     element box means the spin is accounted for exactly, at whatever angle
     the animation happens to be at, with no need to read the transform. */
  function local(e) {
    var host = rotor || svg;
    if (!host || !host.getScreenCTM) return null;
    var m = host.getScreenCTM();
    if (!m) return null;
    m = m.inverse();
    return { x: m.a * e.clientX + m.c * e.clientY + m.e,
             y: m.b * e.clientX + m.d * e.clientY + m.f };
  }
  function hit(e) {
    var pt = local(e);
    if (!pt) return null;
    var x = pt.x, y = pt.y;
    var best = null, bestD = Infinity;
    circles.forEach(function (g) {
      var dx = x - +g.dataset.cx, dy = y - +g.dataset.cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= +g.dataset.r && d < bestD) { bestD = d; best = g; }
    });
    return best;
  }

  function setHover(g) {
    if (hovered === g) return;
    if (hovered) hovered.classList.remove('is-hover');
    hovered = g;
    if (svg) svg.classList.toggle('is-hovering', !!g);
    ring.classList.toggle('is-pointing', !!g);
    if (g) {
      raise(g);                    /* before the class, so the pointer never
                                      loses the node it is over */
      g.classList.add('is-hover');
      /* In the hero the hovered circle is brought ROUND to the reading slot
         rather than lit where it stands -- the hover frame draws it at nine
         o'clock with its glyph in the middle. The drift has to stop first:
         an animation owns the transform outright, so a turn underneath it
         would never show. setSpin(false) freezes the ring at the angle the
         drift reached, and the turn carries on from there.

         Below the hero the scroll already owns the rotation, so hovering
         only relights and nothing moves. */
      if (inHeroNow) {
        /* Two frames, not one. Dropping the spin and setting the target in
           the same frame leaves `transition: none` in the before-change
           style, so nothing transitions and the ring SNAPS to the slot.
           Freeze first, let that style settle, then turn. */
        setSpin(false);
        var want = +g.dataset.area;
        requestAnimationFrame(function () { if (hovered === g) turn(want); });
      }
      showIcon(g);
    } else if (lit) {
      raise(lit); showNum(lit);
    } else {
      hideNum();
      if (inHeroNow) setSpin(true);   /* let the drift have it back */
    }
    applyWarp();
  }

  /* The hero index is the same hover, driven from the other end: pointing
     at a row lights that area's circle and puts its number in it, exactly
     as pointing at the circle does. One path through setHover, so the two
     can never disagree about what is lit. */
  Array.prototype.forEach.call(document.querySelectorAll('.ar-index__link'), function (link) {
    var g = circles.filter(function (c) { return c.dataset.area === link.dataset.area; })[0];
    if (!g) return;
    link.addEventListener('pointerenter', function () { setHover(g); });
    link.addEventListener('pointerleave', function () { setHover(null); });
    link.addEventListener('focus', function () { setHover(g); });
    link.addEventListener('blur',  function () { setHover(null); });
  });

  if (ring && circles.length) {
    circles.forEach(function (g) { g.dataset.rest = g.querySelector('.ring__c').getAttribute('d'); });
    ring.addEventListener('pointermove', function (e) { setHover(hit(e)); });
    ring.addEventListener('pointerleave', function () { setHover(null); });
    ring.addEventListener('click', function (e) {
      var g = hit(e);
      if (!g) return;
      var sec = document.getElementById('area-' + g.dataset.area);
      if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* everything is defined now, so the first mode pass is safe */
  if (boot) boot();
})();
