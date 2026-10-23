/* =============================================================================
   site.js — menu overlay + scroll reveals.
   Replaces the Webflow IX2 interactions the wireframe used:
     · "menu open 3" / "menu close 3"  -> toggleMenu()
     · "Fade In" / "Slide In Bottom"   -> revealOnScroll()
   The 2px accent-bar hover is pure CSS (see .hl in style.css).
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------ menu */
  var MENU_OUT_MS = 500; // must match the .menu__bg transition in style.css

  function setupMenu(root) {
    var menu = root.querySelector(".menu");
    var openBtn = root.querySelector("[data-menu-open]");
    var closeBtn = root.querySelector("[data-menu-close]");
    if (!menu || !openBtn) return;

    var hideTimer = null;

    function open() {
      clearTimeout(hideTimer);
      menu.hidden = false;
      // next frame, so the transition runs from the closed state
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { menu.classList.add("is-open"); });
      });
      openBtn.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
    }

    function close() {
      menu.classList.remove("is-open");
      openBtn.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
      hideTimer = setTimeout(function () { menu.hidden = true; }, MENU_OUT_MS);
    }

    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    menu.addEventListener("click", function (e) {
      if (e.target === menu || e.target.classList.contains("menu__bg")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) close();
    });
  }

  /* Scroll reveals ([data-fade] / [data-slide-in] + an IntersectionObserver)
     were removed on request. The [data-reveal] letter scramble is separate and
     lives in js/text-reveal.js. */

  /* ------------------------------------------------------- blue mode */
  /* The navy is a property of the PAGE, not of one section. The canvas behind
     everything turns navy for the "Who We Are" stretch, and whatever else
     happens to be on screen while that is true — the tail of "What We Do", the
     head of "Research & Insights", the header — has to come with it. So this
     toggles a single class on <html> and the stylesheet recolours everything
     from there (search "blue mode" in css/style.css).

     Thresholds are the same two js/hero-scene.js uses for the background itself
     (BG_FADE_PX / measureDarkRange), so the whole screen turns over together.
     Change one, change the other.
       on  — "What We Do" reaches the top of the screen, which is the moment the
             hero finishes clearing
       off — "Research & Insights" comes into view at the bottom
     Blue therefore covers "What We Do" and "Who We Are" together. "Who We Are"
     is one screen tall with a 100px gap to research, so the colour has to change
     while one of the two is on view; this keeps research light throughout and
     accepts that "Who We Are" is framed when it recolours. See the comment on
     measureDarkRange() in js/hero-scene.js before changing it. */
  /* Defaults are the homepage's. A page can name its own blue stretch with
     data-blue-from / data-blue-until on <body>, which is how the expertise
     page turns blue for the capabilities and light again either side. */
  var BLUE_FROM = ".expertise";
  var BLUE_UNTIL = ".research";
  // Extra hold past the natural end, as a fraction of the viewport.
  // MUST MATCH BLUE_HOLD in js/hero-scene.js — this flips the type and the card
  // colours, that one fades the background, and they have to land together.
  var BLUE_HOLD = 0.30;

  function setupBlueMode() {
    var d = document.body.dataset;
    var section = document.querySelector(d.blueFrom || BLUE_FROM);
    if (!section && (d.blueFrom || "") === "scroll") section = document.body;
    if (!section) return;
    var end = document.querySelector(d.blueUntil || BLUE_UNTIL);
    var root = document.documentElement;
    var queued = false;

    /* data-blue-from="scroll" turns blue on the first pixel of scroll rather
       than when a section reaches the top. The expertise page wants that: its
       hero is light and the capabilities are navy, and waiting until the first
       capability lands means the colour changes while it is already on screen.
       Starting at once means the page is blue before anything blue arrives. */
    var fromScroll = (d.blueFrom || "") === "scroll";

    function apply() {
      queued = false;
      var vh = window.innerHeight;
      var endTop = end ? end.getBoundingClientRect().top : Infinity;
      var started = fromScroll
        ? (window.scrollY || document.documentElement.scrollTop) > 0
        : section.getBoundingClientRect().top <= 0;
      root.classList.toggle("is-blue", started && endTop > vh * (1 - BLUE_HOLD));
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
  }

  /* ------------------------------------------------- header retract */
  /* The footer is a card of its own at the end of the page; the fixed header
     bar would otherwise hover over it. Slide the bar out once the footer is
     genuinely up the screen, and bring it back on the way down.

     The margin matters: the bar only ever overlaps the footer near the TOP of
     the viewport, so retracting at the footer's first pixel of contact at the
     bottom was always early. It also broke any page whose content ends within
     a viewport of the footer — capabilities.html, whose rail is exactly 100svh,
     started with no header at all. */
  function setupHeaderRetract() {
    var footer = document.querySelector(".site-footer");
    if (!footer) return;
    var root = document.documentElement;

    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      root.classList.toggle("is-footer-in", entries[0].isIntersecting);
    }, { threshold: 0, rootMargin: "0px 0px -50% 0px" }).observe(footer);
  }

  /* ---------------------------------------------------------- startup */
  function init() {
    document.querySelectorAll("[data-menu-root]").forEach(setupMenu);
    setupBlueMode();
    setupHeaderRetract();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
