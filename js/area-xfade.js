/* ------------------------------------- EVERY SECTION DISSOLVES, ON PHONES
   On a phone nothing on this page should travel over the ring. The
   stylesheet gives each section a track two folds deep and pulls every
   track up one fold, so each one pins for exactly a screen and the next
   begins where it ends; this fades them so you never catch the slide that
   follows the pin.

   One at a time, and quickly -- the outgoing section is gone before the
   next arrives, as on the capabilities hero. Overlapping two columns of
   type over one piece of artwork is unreadable whatever the opacity.

   The ring is not touched. It is the one thing that carries through, which
   is the point: the artwork holds and the reading changes in front of it. */
(function () {
  var col = document.querySelector('.ar-col');
  if (!col) return;
  var secs = [].slice.call(col.querySelectorAll('.area-track > section'));
  if (!secs.length) return;

  var mq = window.matchMedia('(max-width: 767px)');
  var on = false, queued = false, sent = null;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  function read() {
    queued = false;
    if (!on) return;
    var fold = window.innerHeight;
    var y = window.scrollY;
    var best = 0, lead = '';
    secs.forEach(function (s, k) {
      var trk = s.parentNode;
      var top = trk.getBoundingClientRect().top + y;
      /* p is where we are in this section's pinned screen */
      var p = (y - top) / fold;
      var o;
      /* Above its own screen: the first one is simply the page's first
         sight, so it stands there at full rather than waiting to be
         faded in by a scroll that has not happened. */
      if (p < -0.10) o = k === 0 ? 1 : 0;
      else if (p >= 1.02) o = 0;
      /* It comes up in the tenth of a fold BEFORE its screen, while it is
         still below the fold and nothing can be seen of it -- so by the
         moment it pins, it is already there. That is what closes the blank
         instant the handover used to leave: the one going out reaches
         nothing exactly as the one coming in takes its place. */
      else if (p < 0) o = ease(clamp((p + 0.10) / 0.10));
      else if (p < 0.90) o = 1;                          /* holding */
      else o = 1 - ease(clamp((p - 0.90) / 0.10));       /* and gone before
                                                            the pin lets go */
      s.style.opacity = o.toFixed(3);
      s.style.pointerEvents = o > 0.5 ? '' : 'none';
      if (o > best) { best = o; lead = s.id; }
    });
    /* Which section you are actually reading, published for anything that
       has to follow it -- the page's colour mode and where the artwork
       sits, both in js/area-ring.js. They used to work it out from the
       section rects, which is exact on a desktop and meaningless here:
       every track is two folds deep and pulled up one, so three sections
       straddle the middle of the screen at once and the index's rect was
       still crossing it halfway through area 1. This already knows the
       answer -- it is the one it fades on. */
    var now = best > 0.5 ? lead : '';
    if (now !== sent) {
      sent = now;
      document.documentElement.dataset.arSec = now;
      /* Announced rather than left to be noticed. Both this and the ring
         answer the same scroll event, and nothing says which goes first --
         when the ring went first it read the section BEFORE this one and
         held it until the next scroll, which is a whole screen of the page
         in the wrong mode with the artwork parked where the last screen
         wanted it. */
      dispatchEvent(new CustomEvent('ar:section', { detail: now }));
    }
  }
  function tick() { if (!queued) { queued = true; requestAnimationFrame(read); } }
  function apply() {
    var want = mq.matches;
    if (want === on) return;
    on = want;
    if (on) read();
    else {
      secs.forEach(function (s) { s.style.opacity = ''; s.style.pointerEvents = ''; });
      sent = '';
      document.documentElement.dataset.arSec = '';   /* the desktop reads rects */
      dispatchEvent(new CustomEvent('ar:section', { detail: '' }));
    }
  }
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', function () { apply(); tick(); });
  if (mq.addEventListener) mq.addEventListener('change', apply);
  apply(); tick();
}());
