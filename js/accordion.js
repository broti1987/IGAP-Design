/* Capability accordions.
   Exactly one is open at any time. Opening one closes the other, and clicking
   the one that is already open hands it over rather than collapsing both --
   the layout reserves a full column for an open panel, so an all-closed state
   would leave the capability looking empty.

   The open/close height is animated in CSS with grid-template-rows 0fr -> 1fr,
   so there is no height measuring here and nothing to re-measure on resize or
   when a font finally loads. This file only moves a class and keeps
   aria-expanded honest. */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".cap__acc").forEach(function (group) {
    var accs = Array.prototype.slice.call(group.querySelectorAll(".acc"));

    accs.forEach(function (acc) {
      var btn = acc.querySelector(".acc__btn");
      if (!btn) return;

      btn.addEventListener("click", function () {
        // clicking the open one passes the opening to the next, never to none
        var target = acc.classList.contains("is-open")
          ? (accs[(accs.indexOf(acc) + 1) % accs.length])
          : acc;
        accs.forEach(function (other) {
          var isTarget = other === target;
          other.classList.toggle("is-open", isTarget);
          var b = other.querySelector(".acc__btn");
          if (b) b.setAttribute("aria-expanded", isTarget ? "true" : "false");
        });
      });
    });
  });
});
