document.addEventListener("DOMContentLoaded", function () {
  const textEls = document.querySelectorAll(
    ".btn-label, .menu__links a, .menu__socials a, .footer-nav a, .eyebrow"
  );
  const SPEED = 0.6;
  const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function getRandomChar() {
    return randomChars[Math.floor(Math.random() * randomChars.length)];
  }
  function clearExistingTimers(el) {
    if (!el) return;
    if (el._scrambleIntervals) {
      el._scrambleIntervals.forEach((interval) => clearInterval(interval));
    }
    if (el._scrambleTimeouts) {
      el._scrambleTimeouts.forEach((timeout) => clearTimeout(timeout));
    }
    el._scrambleIntervals = [];
    el._scrambleTimeouts = [];
  }
  function makeLetter(char) {
    const letter = document.createElement("span");
    letter.className = "scramble-hover-letter";
    letter.dataset.finalChar = char;
    letter.dataset.layoutChar = char === " " ? "\u00A0" : char;
    const glyph = document.createElement("span");
    glyph.className = "scramble-hover-glyph";
    glyph.textContent = char === " " ? "\u00A0" : char;
    letter.appendChild(glyph);
    return letter;
  }
  function buildText(el) {
    clearExistingTimers(el);
    const originalText = el.dataset.originalText || el.textContent;
    el.dataset.originalText = originalText;
    el.innerHTML = "";
    // Every letter is its own inline-block, so without this a line could
    // break between any two of them and a heading comes out as "WHAT SH /
    // APES OU / R WORK". Words are kept in a box of their own; the spaces
    // stay loose, so the only break opportunities are where they should be.
    originalText.split(/(\s)/).forEach((chunk) => {
      if (chunk === "") return;
      // a newline in the source text is a line the design asks for, so it
      // survives the split as a real break rather than becoming a space
      if (chunk === "\n") { el.appendChild(document.createElement("br")); return; }
      if (/^\s$/.test(chunk)) { el.appendChild(makeLetter(chunk)); return; }
      const word = document.createElement("span");
      word.className = "scramble-hover-word";
      [...chunk].forEach((char) => word.appendChild(makeLetter(char)));
      el.appendChild(word);
    });
    el.dataset.animating = "false";
  }
  function scrambleText(el) {
    if (el.dataset.animating === "true") return;
    clearExistingTimers(el);
    el.dataset.animating = "true";
    const letters = el.querySelectorAll(".scramble-hover-letter");
    const scrambleStep = 35 * SPEED;
    const scrambleIterations = 8;
    letters.forEach((letter, index) => {
      let iterations = 0;
      const finalChar = letter.dataset.finalChar;
      const glyph = letter.querySelector(".scramble-hover-glyph");
      const interval = setInterval(() => {
        iterations++;
        if (iterations >= scrambleIterations + index * 0.35) {
          glyph.textContent = finalChar === " " ? "\u00A0" : finalChar;
          clearInterval(interval);
        } else {
          glyph.textContent = finalChar === " " ? "\u00A0" : getRandomChar();
        }
      }, scrambleStep);
      el._scrambleIntervals.push(interval);
    });
    const totalDuration =
      scrambleStep * (scrambleIterations + letters.length * 0.35);
    const endTimeout = setTimeout(() => {
      el.dataset.animating = "false";
    }, totalDuration);
    el._scrambleTimeouts.push(endTimeout);
  }
  textEls.forEach((el) => {
    buildText(el);
    const hoverTarget = el.closest("a, button, .w-button") || el;
    hoverTarget.addEventListener("mouseenter", function () {
      scrambleText(el);
    });
  });

  /* [data-scramble] — the same scramble, but played once when the element
     first comes into view rather than on hover. Add data-scramble="repeat"
     for one every time it comes back. Nothing on the site uses it unless it
     asks for it by that attribute. */
  const onView = document.querySelectorAll("[data-scramble]");
  if (onView.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onView.forEach((el) => {
      buildText(el);
      // anything holding the scroll clock can ask for a scramble by hand:
      //   el.dispatchEvent(new Event("scramble"))
      el.addEventListener("scramble", () => scrambleText(el));
    });
    // data-scramble="manual" is driven by something else and is not watched
    const watched = [...onView].filter((el) => el.dataset.scramble !== "manual");
    if (watched.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            scrambleText(entry.target);
            if (entry.target.dataset.scramble !== "repeat") io.unobserve(entry.target);
          });
        },
        { threshold: 0.4 }
      );
      watched.forEach((el) => io.observe(el));
    }
  }
});
