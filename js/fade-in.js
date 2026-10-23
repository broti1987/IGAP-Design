/* Fade in from bottom.
   The page's other two text animations are per-letter (js/text-reveal.js
   scrambles on appear, js/scramble-hover.js on hover). This is the quiet one
   for everything else: a block arrives 16px low and settles as it enters.

   Two ways in:
     data-fade              -> this element fades
     data-fade-group        -> each child fades, staggered in DOM order
     data-fade-group="sel"  -> the matching descendants stagger instead, so a
                               set split across sub-groups (the capability
                               index, in two columns of three) still counts
                               1..6 rather than restarting per column
     data-fade-stagger="ms" -> override the step for that group. Six items at
                               the 60ms default all overlap inside one 600ms
                               fade and read as a single move; a longer step
                               makes them arrive one at a time.

   Elements animate on entry and reset on exit, so a capability re-read on the
   way back up plays again, matching how text-reveal.js already behaves.
   Transforms do not affect layout, so none of this changes scroll height --
   which matters on mobile, where the panels are themselves scrollable. */
document.addEventListener("DOMContentLoaded", function () {
  var STAGGER = 60;    // ms between siblings in a group
  var STAGGER_MAX = 8; // beyond this, siblings share the last delay

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var items = [];
  document.querySelectorAll("[data-fade]").forEach(function (el) {
    items.push({ el: el, delay: 0 });
  });
  document.querySelectorAll("[data-fade-group]").forEach(function (group) {
    var sel = group.getAttribute("data-fade-group");
    var targets = sel ? group.querySelectorAll(sel) : group.children;
    var step = +(group.getAttribute("data-fade-stagger") || STAGGER);
    Array.prototype.forEach.call(targets, function (child, i) {
      child.setAttribute("data-fade", "");
      items.push({ el: child, delay: Math.min(i, STAGGER_MAX) * step });
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      var delay = +(el.dataset.fadeDelay || 0);
      if (entry.isIntersecting) {
        el.style.transitionDelay = delay + "ms";
        el.classList.add("is-in");
      } else {
        /* Reset with no delay, so leaving never looks staggered. */
        el.style.transitionDelay = "0ms";
        el.classList.remove("is-in");
      }
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -5% 0px" });

  items.forEach(function (item) {
    item.el.dataset.fadeDelay = item.delay;
    io.observe(item.el);
  });
});
