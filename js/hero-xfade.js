/* ------------------------------------------------- HERO -> INDEX, ON PHONES
   On desktop the capabilities hero is two screens: the copy, then the index,
   and you scroll from one to the other -- the first travels up and off, the
   second rises into its place.

   On a phone neither should travel. css/capabilities.css pins the hero inside
   a two-screen track and pulls the index's track up over it, so both are
   stuck to the same fold at once; this just dissolves between them. The board
   behind them never moves, which is the point: it is the same board on both
   screens, so the only thing that should change is the column in front.

   The two halves do not share the screen. The hero clears out and the index
   only starts once it is gone, so there is never a moment with two columns
   of type over each other -- a true simultaneous crossfade left the hero's
   copy reading straight through the index's six links, which is unreadable
   at any opacity. And it happens fast: the whole swap is over a quarter of
   the way into the fold, leaving the rest of the track to the index.

   Everything here is inline opacity, and it is cleared the moment the layout
   is not the phone's, so the desktop keeps the plain two-screen scroll. */
(function () {
  var hero = document.getElementById('xp-hero');
  var idx  = document.getElementById('xp-hero-index');
  if (!hero || !idx) return;

  var mq = window.matchMedia('(max-width: 767px)');
  var on = false, queued = false;

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  /* Out, not in-and-out: the steepest part is at the start, so the hero is
     mostly gone in the first pixels of its window and the index is mostly
     there in the first pixels of its own. Eased in as well and the whole
     thing feels like it is thinking about it. */
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function clear() {
    hero.style.opacity = '';
    idx.style.opacity = '';
    hero.style.pointerEvents = '';
    idx.style.pointerEvents = '';
  }

  function read() {
    queued = false;
    if (!on) return;
    /* the hero's own height is the fade's measure, not innerHeight: it is
       100svh, which is what the track is cut from, and it does not move
       when the browser chrome does */
    var span = hero.offsetHeight || window.innerHeight;
    var p = span > 0 ? window.scrollY / span : 0;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    /* OUT is where the hero has finished leaving, and the index starts at
       exactly that point -- so the two never carry opacity at once. Both
       windows are short on purpose: the swap is done a quarter of the way
       into the fold, and the rest of the track is the index simply standing
       there. Scrolling should change the column, not spend a screen on it. */
    var OUT = 0.10, IN = 0.16;
    var out = ease(clamp(p / OUT));
    var into = ease(clamp((p - OUT) / IN));
    hero.style.opacity = (1 - out).toFixed(3);
    idx.style.opacity  = into.toFixed(3);
    /* taps follow the one that is actually there */
    hero.style.pointerEvents = p < OUT ? '' : 'none';
    idx.style.pointerEvents  = p < OUT ? 'none' : '';
  }

  function tick() { if (!queued) { queued = true; requestAnimationFrame(read); } }

  function apply() {
    var want = mq.matches;
    if (want === on) return;
    on = want;
    if (on) { read(); }
    else { clear(); }
  }

  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', function () { apply(); tick(); });
  if (mq.addEventListener) mq.addEventListener('change', apply);
  else if (mq.addListener) mq.addListener(apply);
  apply();
  tick();
}());
