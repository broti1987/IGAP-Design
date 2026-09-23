document.addEventListener("DOMContentLoaded", function () {
  // Add data-reveal to any element in Webflow (Element settings →
  // Custom attributes) or any build. Optional per-element overrides:
  //   data-reveal          → enables the animation
  //   data-reveal="once"   → plays once, no replay on re-scroll
  //   data-reveal-speed    → per-element speed multiplier (e.g. "0.6")
  const ATTR = "data-reveal";
  // ONE MASTER CONTROL — smaller = faster, bigger = slower
  const SPEED = 1;
  // Sharplink's exact values: each letter starts at a random point
  // within a 700ms window and fades in over 300ms (power2.out).
  const SPREAD = 700 * SPEED; // random start-time window (ms)
  const FADE   = 300 * SPEED; // per-letter fade duration (ms)
  const BLUR_FADE = 220 * SPEED; // fast blur clear (ms)
  const EASE   = "cubic-bezier(0.215, 0.61, 0.355, 1)"; // power2.out
  // Applies the CSS text-transform set in Webflow (or anywhere else)
  // to the string itself, word-aware, so the split spans render the
  // same case the un-split text would have.
  function applyTransform(str, transform) {
    switch (transform) {
      case "uppercase":
        return str.toUpperCase();
      case "lowercase":
        return str.toLowerCase();
      case "capitalize":
        return str.replace(/(^|\s)(\S)/gu, (m, p1, p2) => p1 + p2.toUpperCase());
      default:
        return str;
    }
  }
  // Split every text node into .reveal-word > .reveal-letter spans.
  // <br>, nested tags, and text-transform are preserved.
  function splitText(el) {
    if (el.dataset.split) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.textContent.trim()) nodes.push(n);
    }
    nodes.forEach((node) => {
      const transform = getComputedStyle(node.parentElement).textTransform;
      const wrap = document.createElement("span");
      wrap.className = "reveal-text";
      applyTransform(node.textContent, transform).split(/(\s+)/).forEach((chunk) => {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) {
          wrap.appendChild(document.createTextNode(chunk));
          return;
        }
        const word = document.createElement("span");
        word.className = "reveal-word";
        Array.from(chunk).forEach((ch) => {
          const letter = document.createElement("span");
          letter.className = "reveal-letter";
          letter.textContent = ch;
          word.appendChild(letter);
        });
        wrap.appendChild(word);
      });
      node.parentNode.replaceChild(wrap, node);
    });
    el.dataset.split = "1";
    el._letters = Array.from(el.querySelectorAll(".reveal-letter"));
  }
  function animateText(el) {
    if (!el._letters || el.dataset.animating === "true") return;
    el.dataset.animating = "true";
    const speed = parseFloat(el.getAttribute("data-reveal-speed")) || 1;
    el._letters.forEach((letter) => {
      const delay = (Math.random() * SPREAD * speed).toFixed(0) + "ms";
      letter.style.transition =
        "opacity " + FADE * speed + "ms " + EASE + " " + delay + ", " +
        "filter " + BLUR_FADE * speed + "ms " + EASE + " " + delay;
      letter.classList.add("is-visible");
    });
  }
  function resetText(el) {
    if (!el._letters) return;
    el._letters.forEach((letter) => {
      letter.style.transition = "none";
      letter.classList.remove("is-visible");
    });
    // force reflow so the next animate() gets fresh transitions
    void el.offsetWidth;
    el.dataset.animating = "false";
  }
  function init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            animateText(el);
            if (el.getAttribute(ATTR) === "once") observer.unobserve(el);
          } else {
            resetText(el);
          }
        });
      },
      { threshold: 0.35 }
    );
    document.querySelectorAll("[" + ATTR + "]").forEach((el) => {
      splitText(el);
      observer.observe(el);
    });
  }
  init();
});
