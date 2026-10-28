/* ===========================================================================
   ABOUT — the typographic moment
   ---------------------------------------------------------------------------
   One sticky screen and seven beats, every one of them taken from the
   scroll position rather than fired on a timer:

       from research  ->  the sky curve  ->  to action
                              the dotted stem
       from analysis  ->  the green curve  ->  to judgement

   so the argument is read in the order it is made, one thing at a time. The
   stem down the middle column is what carries the first pair into the
   second; without it the two rows read as two unrelated statements.

   The prose is no longer part of this. It has its own band underneath and
   arrives on the page's ordinary reveal, which is why nothing here knows
   about it any more.

   Everything is reversible: a beat that has not been reached puts its element
   back, so scrolling up unbuilds the section in the order it was built.
   ========================================================================= */
(function () {
  'use strict';

  var tm = document.getElementById('tm');
  if (!tm) return;

  var pin    = tm.querySelector('.tm__pin');
  /* indexed by their own attribute, so the order they sit in the markup is
     free to follow the layout rather than the sequence */
  function byIndex(sel, attr) {
    var out = [];
    [].slice.call(tm.querySelectorAll(sel)).forEach(function (e) { out[+e.getAttribute(attr)] = e; });
    return out;
  }
  var lines  = byIndex('[data-beat]', 'data-beat');
  var arcs   = byIndex('[data-arc]', 'data-arc');
  var stems  = byIndex('[data-stem]', 'data-stem');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Where each beat falls along the travel, 0 at the top and 1 at the foot.
     They interlock on purpose: each phrase lands exactly where the line
     pointing at it finishes, so the connector hands over to the word rather
     than the two happening at once. The last quarter is left empty, so the
     finished sentence is held for a moment before the screen lets go. */
  var LINE_AT = [0.04, 0.26, 0.50, 0.74];         /* the four phrases */
  var ARC_AT  = [[0.10, 0.26], [0.56, 0.74]];     /* each pair's connector */
  var STEM_AT = [[0.32, 0.50]];                   /* and the stem between them */

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------------- where a connector runs ----------------
     Not placed at a coordinate: measured off the type it joins, so it starts
     16 past the last letter of the phrase it leaves and stops 16 short of the
     first letter of the phrase it points at, whatever the words measure once
     the face has loaded. The curve keeps the proportions Figma drew it with
     -- the control points are .561 and .400 of the run -- and the box is sized
     to the span, so nothing is stretched and the stroke stays 2. */
  var GAP = 16, C1 = 146.5 / 261, C2 = 104.5 / 261;
  var inner = tm.querySelector('.tm__inner');

  function word(beat, n) {
    var line = tm.querySelector('[data-beat="' + beat + '"]');
    return line ? line.querySelectorAll('.tm-word')[n] : null;
  }
  /* How far its phrase is currently held below its place. The entrance is a
     transform, which moves the client rect with it, so a connector measured
     while a phrase is still down would be placed 24 low and stay there. */
  function lift(el) {
    var line = el.parentNode;
    while (line && line.className.indexOf('tm-line') < 0) line = line.parentNode;
    if (!line) return 0;
    var m = getComputedStyle(line).transform;
    if (!m || m === 'none') return 0;
    var v = m.slice(m.indexOf('(') + 1, m.lastIndexOf(')')).split(',');
    return v.length >= 6 ? parseFloat(v[5]) || 0 : 0;
  }
  function place() {
    var host = inner.getBoundingClientRect();
    /* The stem hangs under the first word of the phrase it leads to, on its
       middle rather than its left edge -- it reads as coming out of the
       word that way instead of running alongside the column. */
    stems.forEach(function (el) {
      var w = word(2, 0);                       /* "From", of FROM ANALYSIS */
      if (!w) return;
      var col = el.parentNode.getBoundingClientRect();
      var r = w.getBoundingClientRect();
      el.style.setProperty('--stem-x',
        (r.left + r.width / 2 - col.left - 0.5).toFixed(1) + 'px');
    });
    arcs.forEach(function (svg) {
      var a = word(svg.getAttribute('data-from'), 0);   /* "from" */
      var b = word(svg.getAttribute('data-to'), 1);     /* "action" */
      if (!a || !b) return;
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      var la = lift(a), lb = lift(b);
      var x1 = ra.right - host.left + GAP, y1 = ra.top - host.top + ra.height / 2 - la;
      var x2 = rb.left - host.left - GAP,  y2 = rb.top - host.top + rb.height / 2 - lb;
      var dx = x2 - x1, dy = y2 - y1;
      if (dx <= 1) return;
      svg.style.left = x1.toFixed(1) + 'px';
      svg.style.top = y1.toFixed(1) + 'px';
      svg.style.width = dx.toFixed(1) + 'px';
      svg.style.height = Math.max(1, Math.abs(dy)).toFixed(1) + 'px';
      svg.setAttribute('viewBox', '0 0 ' + dx.toFixed(1) + ' ' + Math.max(1, Math.abs(dy)).toFixed(1));
      var line = svg.querySelector('.tm-arc__line');
      line.setAttribute('d', 'M 0 0 C ' + (C1 * dx).toFixed(1) + ' 0 ' +
                             (C2 * dx).toFixed(1) + ' ' + dy.toFixed(1) + ' ' +
                             dx.toFixed(1) + ' ' + dy.toFixed(1));
      /* it comes in level, so the head is a plain chevron on the tip */
      svg.querySelector('.tm-arc__head').setAttribute('d',
        'M ' + (dx - 7).toFixed(1) + ' ' + (dy - 7).toFixed(1) +
        ' L ' + dx.toFixed(1) + ' ' + dy.toFixed(1) +
        ' L ' + (dx - 7).toFixed(1) + ' ' + (dy + 7).toFixed(1));
      svg.querySelector('.tm-arc__head').style.transformOrigin = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      var len = line.getTotalLength();
      line.style.strokeDasharray = len.toFixed(1);
      line.setAttribute('data-len', len.toFixed(1));
    });
  }
  place();
  addEventListener('resize', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(); read(); });

  var shown = [false, false, false, false];
  function beat(i, on) {
    if (on === shown[i]) return;
    shown[i] = on;
    /* a plain fade up, in css: the scroll says when, and says when to put it
       back again. */
    lines[i].classList.toggle('is-in', on);
  }

  var queued = false;
  function read() {
    queued = false;
    var r = tm.getBoundingClientRect();
    var run = r.height - window.innerHeight;
    var u = run > 0 ? clamp(-r.top / run) : 0;

    for (var i = 0; i < lines.length; i++) beat(i, u >= LINE_AT[i]);

    arcs.forEach(function (svg, j) {
      var a = ARC_AT[j];
      var k = ease(clamp((u - a[0]) / (a[1] - a[0])));
      var line = svg.querySelector('.tm-arc__line');
      line.style.strokeDashoffset = (+line.getAttribute('data-len') * (1 - k)).toFixed(1);
      /* the head comes in over the last fifth, as the tip lands */
      var h = clamp((k - 0.8) / 0.2);
      var head = svg.querySelector('.tm-arc__head');
      head.style.opacity = h.toFixed(3);
      head.style.transform = 'scale(' + (0.5 + 0.5 * h).toFixed(3) + ')';
    });

    stems.forEach(function (el, j) {
      var s = STEM_AT[j];
      el.style.setProperty('--draw', ease(clamp((u - s[0]) / (s[1] - s[0]))).toFixed(3));
    });
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(read); } }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  read();
  /* the scrambler builds its letter spans on DOMContentLoaded; ask again
     after that so a phrase already past its beat is not left blank */
  addEventListener('DOMContentLoaded', function () { shown = [false, false, false, false]; read(); });
})();
