/* The pointer.

   Figma draws it as two circles: a 32 ring on the glass surface with the
   border-default stroke, and a 4 dot in text-muted at its centre. The dot
   is the pointer proper and sits exactly where the mouse is; the ring
   follows a frame behind, which is what gives it the weight. Over anything
   you can click -- and over the boards -- the ring opens to 48.

   Both colours are the mode's, so the pair crosses light to navy with the
   page rather than sitting in one palette over both.

   The native cursor stays: this rides along with it rather than standing
   in for it. Fine pointers only -- a touch screen has nothing to ride. */
(function () {
  'use strict';
  if (!matchMedia('(pointer: fine)').matches) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wrap = document.createElement('div');
  wrap.className = 'cursor';
  wrap.setAttribute('aria-hidden', 'true');
  var ring = document.createElement('div'); ring.className = 'cursor__ring';
  var dot  = document.createElement('div'); dot.className  = 'cursor__dot';
  wrap.appendChild(ring); wrap.appendChild(dot);

  function start() {
    document.body.appendChild(wrap);
    requestAnimationFrame(frame);
  }

  var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, seen = false;
  var EASE = 0.2;                 /* share of the gap the ring closes a frame */

  function place(el, px, py) {
    el.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) translate(-50%,-50%)';
  }
  function frame() {
    rx += (x - rx) * (reduce ? 1 : EASE);
    ry += (y - ry) * (reduce ? 1 : EASE);
    place(ring, rx, ry);
    place(dot, x, y);
    requestAnimationFrame(frame);
  }

  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!seen) { seen = true; rx = x; ry = y; wrap.classList.add('is-on'); }
    var z = inZone(x, y);
    if (z !== overZone) { overZone = z; sync(); }
  }, { passive: true });

  /* anything you can click, type in or open */
  var LIVE = 'a[href], button, [role="button"], input, select, textarea, summary, label[for]';
  /* and the artwork, which answers to the pointer without taking its
     events: the boards are drawn under a layer that passes clicks straight
     through, so being over one is a question of where the pointer IS. */
  /* the boards only: the areas ring's box is most of the right-hand side of
     the screen, so counting it would leave the ring open over empty page */
  var ZONES = '.pegboard';
  var overLive = false, overZone = false;
  function sync() { wrap.classList.toggle('is-live', overLive || overZone); }

  addEventListener('pointerover', function (e) {
    if (e.target.closest && e.target.closest(LIVE)) { overLive = true; sync(); }
  }, true);
  addEventListener('pointerout', function (e) {
    var to = e.relatedTarget;
    if (to && to.closest && to.closest(LIVE)) return;
    overLive = false; sync();
  }, true);

  function inZone(px, py) {
    var zs = document.querySelectorAll(ZONES);
    for (var i = 0; i < zs.length; i++) {
      var r = zs[i].getBoundingClientRect();
      if (!r.width) continue;
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return true;
    }
    return false;
  }

  /* off the window entirely: take it away rather than park it at the edge */
  document.addEventListener('mouseleave', function () { wrap.classList.remove('is-on'); });
  document.addEventListener('mouseenter', function () { if (seen) wrap.classList.add('is-on'); });

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
