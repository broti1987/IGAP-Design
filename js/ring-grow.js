/* ------------------------------------------------- THE RING GROWS AS YOU GO
   Figma does not draw one ring three times: it draws the same artwork at
   three sizes and three places down the page.

       hero     circles 446, cluster centred at  928, 476
       index    circles 446, cluster centred at 1202, 450
       areas    circles 498, cluster centred at 1251, 450

   A circle renders at 275/700 of the svg box, and the svg is --ring scaled
   by the 1.111 of the wide state, which every screen carries now -- it used
   to come on at the hero's edge, and that switch was a 191px jump. So 1022
   draws the 446 both hero screens want and 1143 the areas' 498, and the
   whole crossing is one interpolation with nothing to toggle.

   So it crosses the page as you scroll -- in from the left of the hero,
   settling where the index wants it, then opening out for the eight areas.
   This reads the scroll and sets the three knobs the stylesheet exposes:

       --ring     the box the artwork is drawn into. A circle comes out
                  .6167 of it, which is how 723 and 807 give 446 and 498.
       --ring-dx  sideways, from where the stylesheet parks the cluster
                  (1250.5, which is the box's centre less the fixed 191.5
                  the artwork sits left of it).
       --ring-dy  and down, which only the hero asks for.
       --ring-rot and a few degrees of turn, so the artwork rolls into
                  place instead of sliding flat across the page. It comes
                  back to 0 by the time the first area starts, because
                  below the hero the rotation is doing a job -- it brings
                  each area's circle to nine o'clock -- and a leftover
                  drift would sit every one of them off that slot.

   The index holds its own values for most of its track and only starts
   opening out towards the end of it, so the screen you are reading is
   still rather than always on its way somewhere. Desktop only: the phone
   has its own --ring and its own idea of where the artwork goes. */
(function () {
  var ring = document.getElementById('ar-ring');
  var hero = document.getElementById('ar-hero');
  var idx  = document.getElementById('ar-hero-index');
  var a1   = document.getElementById('area-1');
  if (!ring || !hero || !idx || !a1) return;

  var mq = window.matchMedia('(min-width: 768px)');
  var queued = false, on = false;

  function top(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function track(el) { return el.closest('.area-track') || el; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* [scroll, ring, dx, dy, rot] -- the hero, the index, the index again at
     the end of its dwell, and the areas */
  function stops() {
    var i = top(track(idx)), iH = track(idx).offsetHeight;
    return [
      [top(hero),     1022, -323, 26, -18],
      [i,             1022,  -49,  0, -12],
      [i + iH * 0.6,  1022,  -49,  0, -12],
      [top(track(a1)), 1143,    0,  0,   0]
    ];
  }

  function read() {
    queued = false;
    if (!on) return;
    var s = stops(), y = window.scrollY, i;
    var a = s[0], b = s[s.length - 1], t = 1;
    if (y <= s[0][0]) { a = b = s[0]; t = 0; }
    else if (y >= b[0]) { a = b; t = 0; }
    else {
      for (i = 0; i < s.length - 1; i++) {
        if (y >= s[i][0] && y <= s[i + 1][0]) {
          a = s[i]; b = s[i + 1];
          var span = b[0] - a[0];
          t = span > 0 ? ease((y - a[0]) / span) : 0;
          break;
        }
      }
    }
    var r  = a[1] + (b[1] - a[1]) * t;
    var dx = a[2] + (b[2] - a[2]) * t;
    var dy = a[3] + (b[3] - a[3]) * t;
    var rt = a[4] + (b[4] - a[4]) * t;
    ring.style.setProperty('--ring', r.toFixed(1) + 'px');
    ring.style.setProperty('--ring-dx', dx.toFixed(1) + 'px');
    ring.style.setProperty('--ring-dy', dy.toFixed(1) + 'px');
    ring.style.setProperty('--ring-rot', rt.toFixed(2) + 'deg');
  }

  function tick() { if (!queued) { queued = true; requestAnimationFrame(read); } }

  function apply() {
    var want = mq.matches;
    if (want === on) return;
    on = want;
    if (on) read();
    else {
      ring.style.removeProperty('--ring');
      ring.style.removeProperty('--ring-dx');
      ring.style.removeProperty('--ring-dy');
      ring.style.removeProperty('--ring-rot');
    }
  }

  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', function () { apply(); tick(); });
  if (mq.addEventListener) mq.addEventListener('change', apply);
  apply(); tick();
}());
