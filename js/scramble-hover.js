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
  function buildText(el) {
    clearExistingTimers(el);
    const originalText = el.dataset.originalText || el.textContent;
    el.dataset.originalText = originalText;
    el.innerHTML = "";
    [...originalText].forEach((char) => {
      const letter = document.createElement("span");
      letter.className = "scramble-hover-letter";
      letter.dataset.finalChar = char;
      letter.dataset.layoutChar = char === " " ? "\u00A0" : char;
      const glyph = document.createElement("span");
      glyph.className = "scramble-hover-glyph";
      glyph.textContent = char === " " ? "\u00A0" : char;
      letter.appendChild(glyph);
      el.appendChild(letter);
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
});
