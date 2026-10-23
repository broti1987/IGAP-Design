/* The dot field's runtime. Sets three custom properties on <html> and nothing
   else: --mx, --my, --hover. Everything visual is in css/style.css section 14.

   The zoom is deliberately NOT here — js/hero-scene.js owns --zoom, because it
   already computes the scroll clock the braid runs on and the field has to move
   with it, not alongside its own guess at it.

   Easing constants are the ones the shader used: 0.15 a frame on the pointer
   and on the hover amount, 450ms before the field settles back after the
   pointer leaves the window. */
(function () {
  'use strict';

  var root  = document.documentElement;
  var field = document.querySelector('.dotfield');
  if (!field) return;

  var EASE = 0.15, LEAVE_MS = 450, BREAKPOINT = 768;

  var mx = innerWidth / 2, my = innerHeight / 2;   // eased pointer
  var tx = mx, ty = my;                            // target pointer
  var hover = 0, hoverTarget = 0, leaveTimer = null;
  var running = false, raf = 0;

  var spacing = 15;
  function readSpacing() {
    spacing = parseFloat(getComputedStyle(root).getPropertyValue('--dot-spacing')) || 15;
  }
  readSpacing();
  addEventListener('resize', readSpacing, { passive: true });

  function zoom() {
    return parseFloat(getComputedStyle(root).getPropertyValue('--zoom')) || 1;
  }

  addEventListener('pointermove', function (e) {
    if (innerWidth < BREAKPOINT) return;
    tx = e.clientX; ty = e.clientY;
    hoverTarget = 1;
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    start();
  }, { passive: true });

  addEventListener('pointerout', function (e) {
    if (e.relatedTarget || leaveTimer) return;
    leaveTimer = setTimeout(function () { hoverTarget = 0; leaveTimer = null; start(); }, LEAVE_MS);
  }, { passive: true });

  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }

  function frame() {
    mx += (tx - mx) * EASE;
    my += (ty - my) * EASE;
    hover += (hoverTarget - hover) * EASE;

    /* Snap the halo to the dot lattice, which is anchored at the viewport
       centre by background-position: center. The shader worked in cell ids
       (floor(mouse / spacing) + 0.5), so its rings were always concentric with
       a dot and the band edges fell between rows. Centring on the raw cursor
       instead slices through whichever dots the mask circle crosses. */
    var s  = spacing * zoom();
    var sx = innerWidth  / 2 + Math.round((mx - innerWidth  / 2) / s) * s;
    var sy = innerHeight / 2 + Math.round((my - innerHeight / 2) / s) * s;

    root.style.setProperty('--mx', sx.toFixed(2) + 'px');
    root.style.setProperty('--my', sy.toFixed(2) + 'px');
    root.style.setProperty('--hover', hover.toFixed(4));

    /* settle: stop the loop once the pointer and the hover amount have both
       arrived, so an idle page costs nothing */
    var settled = Math.abs(tx - mx) < 0.5 && Math.abs(ty - my) < 0.5 &&
                  Math.abs(hoverTarget - hover) < 0.002;
    if (settled) { running = false; root.style.setProperty('--hover', hoverTarget.toFixed(4)); }
    else raf = requestAnimationFrame(frame);
  }
})();
