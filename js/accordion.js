/* The capability's one accordion.

   The column carries two readings that share the same room: the overview,
   open to begin with, and the list of areas of work. Opening the list shuts
   the overview and opening it again brings the overview back, so the column
   never has to grow -- the same trade the areas page makes, and the reason
   the state lives on the capability rather than on the accordion.

   The heights are animated in CSS with grid-template-rows 0fr -> 1fr, so
   there is nothing to measure here and nothing to re-measure on resize or
   when a font finally loads. This file moves one class and keeps
   aria-expanded honest. */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".cap").forEach(function (cap) {
    var btn = cap.querySelector(".acc__btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = !cap.classList.contains("is-open");
      cap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
});
