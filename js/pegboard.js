/* ===========================================================================
   PEGBOARD — scroll-driven icon morph
   ---------------------------------------------------------------------------
   Ported from Pegboard icons/pegboard-scroll.html. The physics is that file's,
   unchanged: least-travel band pairing with a colour bias, ghost partners so
   bands grow out of and shrink into a peg, a leading end that drags the other
   after it, spring-driven ends, and pills that thin and pinch when stretched.

   What is new here is the driver. The demo ran on its own tall sticky track at
   1.1 screens per transition. This page instead takes its ruler from the page:

     band 0 = the hero            -> state 0, the resting pinwheel
     band k = capability k        -> state k

   Within each band the icon HOLDS for the first BAND_HOLD of the band, then
   morphs to the next state across the remainder, landing exactly as the next
   band arrives. So the morph completes on approach and the icon is still while
   its capability is the one you are reading.

   Desktop measures each band vertically (one viewport height per capability).
   Mobile measures the same bands along the carousel (two viewport widths per
   capability). Same t, two rulers.
   ========================================================================= */
(() => {
  'use strict';

  const stage = document.querySelector('.peg-stage');
  const svg = document.querySelector('.board');
  const rail = document.getElementById('rail');
  if (!stage || !svg || !rail) return;

  /* ---------------- Icons ----------------
     State 0 is the resting board — a pinwheel of four bands, one per colour
     slot of icon 1 so every band travels into place. States 1-6 are the six
     capability icons, lifted from Artboard 1-6.svg. Each band is a pill
     stretched between two pegs: [colour, x1,y1, x2,y2] in peg indices (0-11). */
  /* The three band colours ARE the brand accents, so read them off the
     tokens rather than restating them -- the hand-written green (#7ed329) and
     sky (#1dbcec) had drifted a shade off --green/--sky and showed up against
     the Figma artwork. Fallbacks keep this working if the sheet is missing. */
  const token = (n, f) => (getComputedStyle(document.documentElement)
    .getPropertyValue(n).trim() || f);
  const C = {
    teal:  token('--teal',  '#22adad'),
    green: token('--green', '#8cda3e'),
    sky:   token('--sky',   '#46ccf5'),
  };

  const ICONS = [
    [ // 0 — resting: pinwheel
      ['teal', 3,3, 6,3], ['green', 8,3, 8,6], ['sky', 3,5, 3,8], ['teal', 5,8, 8,8],
    ],
    [ // 1 — Research & Policy Advocacy: diagonal cluster
      ['green', 6,6, 8,4], ['teal', 5,6, 7,8], ['teal', 4,3, 6,5], ['sky', 3,7, 5,5],
    ],
    [ // 2 — Policy Insight & Regulatory Strategy: staircase
      ['teal', 2,9, 4,9], ['green', 4,6, 4,9], ['sky', 4,6, 6,6],
      ['green', 6,4, 6,6], ['teal', 6,4, 9,4], ['sky', 9,2, 9,4],
    ],
    [ // 3 — Government Engagement & Institutional Strategy: closed tilted rectangle
      ['sky', 2,6, 5,9], ['sky', 6,2, 9,5], ['green', 6,2, 4,4],
      ['teal', 4,4, 2,6], ['teal', 9,5, 7,7], ['green', 7,7, 5,9],
    ],
    [ // 4 — Policy Communications: three L-steps
      ['sky', 2,7, 4,7], ['teal', 4,7, 4,9], ['teal', 4,5, 6,5],
      ['green', 6,5, 6,7], ['green', 6,3, 8,3], ['sky', 8,3, 8,5],
    ],
    [ // 5 — Market, Investment & Ecosystem Strategy: rising chart + arrowhead
      ['sky', 2,7, 2,9], ['teal', 2,7, 3,7], ['green', 3,7, 5,5], ['sky', 5,5, 7,5],
      ['green', 7,5, 9,3], ['teal', 9,3, 9,5], ['teal', 7,3, 9,3],
    ],
    [ // 6 — Coalitions, Partnerships & Industry Platforms: connected path
      ['green', 2,7, 2,9], ['teal', 2,7, 4,7], ['green', 4,4, 4,7], ['sky', 4,4, 7,4],
      ['green', 7,4, 7,6], ['teal', 7,6, 9,6], ['sky', 9,6, 9,9],
    ],
  ];

  const RING_PEGS = [[1,10], [1,1], [10,1], [10,10]];

  /* ---------------- Tuning ---------------- */
  // Driver
  const BAND_HOLD = 0.5;   // share of each band the icon spends perfectly still
  const SMOOTH_S  = 0.12;  // scroll follower time-constant
  // Morph (the demo's values)
  const HOLD      = 0.12;  // settle margin at each end of a transition
  const STAGGER   = 0.07;  // delay between bands, swept left -> right
  const PULL      = 0.32;  // how far the leading end runs ahead of the trailing one
  const THIN      = 0.5;   // how much a stretched band narrows
  const NECK      = 0.45;  // how much a stretched band pinches in the middle
  const SPRING_K  = 170;
  const SPRING_Z  = 0.42;
  // Pluck
  const PLUCK_AMP = 7;
  const PLUCK_HZ  = 7;
  const PLUCK_TAU = 0.42;

  /* ---------------- Geometry ---------------- */
  const STEP = 260 / 11, R = 6.405;
  const px = i => 2 + i * STEP;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent && parent.appendChild(n);
    return n;
  };

  const gPegs = document.getElementById('peg-pegs');
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++)
    el('circle', { class: 'peg', cx: px(x), cy: px(y), r: 2 }, gPegs);
  const gRings = document.getElementById('peg-rings');
  RING_PEGS.forEach(([x, y]) => el('circle', { class: 'ring', cx: px(x), cy: px(y), r: R }, gRings));

  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

  const base = ICONS.map(ic => ic.map(([c, x1, y1, x2, y2]) => ({
    col: hex(C[c]), a: [px(x1), px(y1)], b: [px(x2), px(y2)], o: 1,
  })));
  const cloneBand = b => ({ col: b.col, a: b.a.slice(), b: b.b.slice(), o: 1 });
  const layout = base.map(ic => ic.map(cloneBand));
  const N = ICONS.length - 1;

  /* ---------------- Pairing ----------------
     Least total travel, colour kept whenever counts allow. Unmatched bands get
     a zero-length ghost partner, so a new band grows out of a peg and a
     leaving band shrinks into one. */
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const COLOUR_COST = 400, GHOST_COST = 60;

  function pairCost(A, B) {
    if (!A || !B) return { c: GHOST_COST, flip: false };
    const straight = d(A.a, B.a) + d(A.b, B.b);
    const flipped  = d(A.a, B.b) + d(A.b, B.a);
    const colour   = A.col.join() === B.col.join() ? 0 : COLOUR_COST;
    return flipped < straight ? { c: flipped + colour, flip: true } : { c: straight + colour, flip: false };
  }

  function bestAssignment(A, B) {
    const n = Math.max(A.length, B.length);
    const a = [...A, ...Array(n - A.length).fill(null)];
    const b = [...B, ...Array(n - B.length).fill(null)];
    const cost = a.map(x => b.map(y => pairCost(x, y)));
    let best = Infinity, bestPerm = null;
    const perm = [], used = Array(n).fill(false);
    (function rec(i, acc) {
      if (acc >= best) return;
      if (i === n) { best = acc; bestPerm = perm.slice(); return; }
      for (let j = 0; j < n; j++) if (!used[j]) {
        used[j] = true; perm[i] = j;
        rec(i + 1, acc + cost[i][j].c);
        used[j] = false;
      }
    })(0, 0);

    return a.map((from, i) => {
      const j = bestPerm[i];
      let to = b[j];
      const flip = !!(from && to && cost[i][j].flip);
      if (flip) to = { ...to, a: to.b, b: to.a };
      if (!from) from = { col: to.col, a: to.a, b: to.a, o: 0 };
      if (!to)   to   = { col: from.col, a: from.b, b: from.b, o: 0 };
      const aLeads = d(from.a, to.a) >= d(from.b, to.b);
      return { from, to, aLeads, flip,
               ai: i < A.length ? i : -1,
               bi: j < B.length ? j : -1,
               fromLen: d(from.a, from.b), toLen: d(to.a, to.b) };
    });
  }

  function buildTransition(i) {
    const pairs = bestAssignment(layout[i], layout[i + 1]);
    const mid = p => (p.from.a[0] + p.from.b[0] + p.to.a[0] + p.to.b[0]) / 4;
    pairs.map((p, k) => [mid(p), k]).sort((x, y) => x[0] - y[0])
         .forEach(([, k], rank) => pairs[k].rank = rank);
    pairs.forEach(p => {
      p.fromId = p.ai >= 0 ? `${i}:${p.ai}` : null;
      p.toId   = p.bi >= 0 ? `${i + 1}:${p.bi}` : null;
    });
    return { pairs, n: pairs.length };
  }
  const transitions = [];
  for (let i = 0; i < N; i++) transitions.push(buildTransition(i));

  let needRemap = false;
  function rebuildAround(i) {
    if (i > 0) transitions[i - 1] = buildTransition(i - 1);
    if (i < N) transitions[i] = buildTransition(i);
    needRemap = true;
  }

  const MAX = Math.max(...transitions.map(t => t.n));
  const gBands = document.getElementById('peg-bands');

  const slots = Array.from({ length: MAX }, (_, k) => ({
    k, path: el('path', { class: 'band' }, gBands),
    a: null, b: null, va: [0, 0], vb: [0, 0],
    pluck: null, visible: false, len: 0, id: null,
  }));

  /* ---------------- Helpers ---------------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rgb = (p, q, t) => `rgb(${[0, 1, 2].map(i => Math.round(lerp(p[i], q[i], t))).join(',')})`;
  const f2 = v => v.toFixed(2);

  /* A pill whose long sides are cubics, so it can pinch when stretched and
     swing sideways when plucked. */
  function pill(a, b, r, bow1, bow2, pinch) {
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    const nx = -dy, ny = dx;
    const K = 1 / 0.75;
    const P = (t, s, off) => [a[0] + dx * len * t + nx * (s * r + off),
                              a[1] + dy * len * t + ny * (s * r + off)];
    const s1a = P(0, 1, 0), s1c1 = P(1/3, 1, K * (bow1 - pinch)), s1c2 = P(2/3, 1, K * (bow2 - pinch)), s1b = P(1, 1, 0);
    const s2b = P(1, -1, 0), s2c2 = P(2/3, -1, K * (bow2 + pinch)), s2c1 = P(1/3, -1, K * (bow1 + pinch)), s2a = P(0, -1, 0);
    const pt = p => `${f2(p[0])},${f2(p[1])}`;
    return `M${pt(s1a)}C${pt(s1c1)} ${pt(s1c2)} ${pt(s1b)}` +
           `A${f2(r)},${f2(r)} 0 0 0 ${pt(s2b)}` +
           `C${pt(s2c2)} ${pt(s2c1)} ${pt(s2a)}` +
           `A${f2(r)},${f2(r)} 0 0 0 ${pt(s1a)}Z`;
  }

  /* ---------------- Targets from t ---------------- */
  function targets(t) {
    const seg = Math.min(transitions.length - 1, Math.floor(t));
    const u = clamp01((t - seg - HOLD / 2) / (1 - HOLD));
    const tr = transitions[seg];
    const span = 1 - STAGGER * (tr.n - 1);
    const rest = u === 0 ? seg : u === 1 ? seg + 1 : -1;
    return { seg, u, rest, n: tr.n, list: tr.pairs.map(p => {
      const e = clamp01((u - p.rank * STAGGER) / span);
      const eLead  = ease(clamp01(e / (1 - PULL)));
      const eTrail = ease(clamp01((e - PULL) / (1 - PULL)));
      const ea = p.aLeads ? eLead : eTrail, eb = p.aLeads ? eTrail : eLead;
      const eMid = ease(e);
      return {
        a: lerp2(p.from.a, p.to.a, ea),
        b: lerp2(p.from.b, p.to.b, eb),
        restLen: lerp(p.fromLen, p.toLen, eMid),
        col: rgb(p.from.col, p.to.col, eMid),
        o: p.from.o === 0 ? clamp01(eLead * 2.5) : p.to.o === 0 ? clamp01((1 - eTrail) * 2.5) : 1,
        id: u < 0.5 ? p.fromId : p.toId,
        p,
      };
    })};
  }

  let curSeg = -1;
  function remap(list) {
    const old = slots.map(s => ({ id: s.id, a: s.a, b: s.b, va: s.va, vb: s.vb, pluck: s.pluck, visible: s.visible }));
    const takenK = new Set(), takenJ = new Set();
    const take = (k, j, flip) => {
      takenK.add(k); takenJ.add(j);
      const s = slots[k], o = old[j];
      s.a = (flip ? o.b : o.a).slice();  s.b = (flip ? o.a : o.b).slice();
      s.va = (flip ? o.vb : o.va).slice(); s.vb = (flip ? o.va : o.vb).slice();
      s.pluck = o.pluck;
    };
    list.forEach((tg, k) => {
      if (!tg.id) return;
      const j = old.findIndex((o, j) => !takenJ.has(j) && o.a && o.id === tg.id);
      if (j < 0) return;
      const o = old[j];
      take(k, j, d(o.a, tg.b) + d(o.b, tg.a) < d(o.a, tg.a) + d(o.b, tg.b));
    });
    const cand = [];
    list.forEach((tg, k) => {
      if (takenK.has(k) || tg.o <= 0.02) return;
      old.forEach((o, j) => {
        if (takenJ.has(j) || !o.a || !o.visible) return;
        const d1 = d(o.a, tg.a) + d(o.b, tg.b), d2 = d(o.a, tg.b) + d(o.b, tg.a);
        cand.push({ k, j, dist: Math.min(d1, d2), flip: d2 < d1 });
      });
    });
    cand.sort((x, y) => x.dist - y.dist);
    for (const c of cand) {
      if (c.dist > STEP * 1.5 || takenK.has(c.k) || takenJ.has(c.j)) continue;
      take(c.k, c.j, c.flip);
    }
    list.forEach((tg, k) => {
      if (takenK.has(k)) return;
      const s = slots[k];
      s.a = tg.a.slice(); s.b = tg.b.slice(); s.va = [0, 0]; s.vb = [0, 0]; s.pluck = null;
    });
  }

  /* ---------------- Frame ---------------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OMEGA = Math.sqrt(SPRING_K), DAMP = 2 * SPRING_Z * OMEGA;

  function stepSpring(pos, vel, target, dt) {
    for (let i = 0; i < 2; i++) {
      const acc = SPRING_K * (target[i] - pos[i]) - DAMP * vel[i];
      vel[i] += acc * dt; pos[i] += vel[i] * dt;
    }
  }

  function frame(t, dt, now, settled) {
    let tg = targets(t);

    if (drag && (tg.rest !== drag.screen || tg.seg !== drag.seg)) { drop(drag.pt, drag.raw); tg = targets(t); }

    if (edited >= 0 && !drag && Math.abs(t - edited) >= 1 - HOLD / 2 - 1e-6) {
      layout[edited] = base[edited].map(cloneBand);
      rebuildAround(edited);
      edited = -1;
      tg = targets(t);
    }

    if (tg.seg !== curSeg || needRemap) {
      if (curSeg < 0) tg.list.forEach((x, k) => { slots[k].a = x.a.slice(); slots[k].b = x.b.slice(); });
      else remap(tg.list);
      curSeg = tg.seg; needRemap = false;
    }
    current = tg;
    canDrag = tg.rest >= 0 && settled && canInteract();
    svg.classList.toggle('can-drag', canDrag || !!drag);

    slots.forEach((s, k) => {
      const x = tg.list[k];
      if (!x) { s.path.style.display = 'none'; s.visible = false; s.id = null; return; }
      s.id = x.id;

      const ta = drag && drag.slot === s && drag.end === 'a' ? drag.pt : x.a;
      const tb = drag && drag.slot === s && drag.end === 'b' ? drag.pt : x.b;

      if (reduce) { s.a = ta.slice(); s.b = tb.slice(); }
      else {
        const sub = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / sub;
        for (let i = 0; i < sub; i++) { stepSpring(s.a, s.va, ta, h); stepSpring(s.b, s.vb, tb, h); }
      }

      const len = d(s.a, s.b);
      s.len = len;
      const rest = Math.max(x.restLen, STEP * 0.8);
      const stretch = Math.max(0, len / rest - 1);
      const r = R * (1 - THIN * (1 - 1 / Math.sqrt(1 + stretch * 2)));
      const pinch = len > 1 ? Math.min(r * 0.8, R * NECK * Math.min(stretch, 1.2)) : 0;

      let bow1 = 0, bow2 = 0, da = s.a, db = s.b;
      if (s.pluck && len <= 1) {
        const age = (now - s.pluck.t0) / 1000;
        const env = Math.exp(-age / PLUCK_TAU);
        if (env < 0.01) s.pluck = null;
        else {
          const w = Math.abs(s.pluck.amp) * 0.55 * env * Math.cos(2 * Math.PI * PLUCK_HZ * age);
          const [ux, uy] = s.pluck.dir;
          da = [s.a[0] - ux * w, s.a[1] - uy * w];
          db = [s.b[0] + ux * w, s.b[1] + uy * w];
        }
      } else if (s.pluck && len > 1) {
        const age = (now - s.pluck.t0) / 1000;
        const env = Math.exp(-age / PLUCK_TAU);
        if (env < 0.01) s.pluck = null;
        else {
          const w = 2 * Math.PI * PLUCK_HZ * age;
          const f1 = s.pluck.amp * env * Math.cos(w);
          const f2 = s.pluck.amp2 * env * env * Math.cos(2 * w + 0.6);
          bow1 = (f1 + f2) * 0.87; bow2 = (f1 - f2) * 0.87;
        }
      }

      s.path.setAttribute('d', pill(da, db, r, bow1, bow2, pinch));
      s.path.setAttribute('stroke', x.col);
      s.path.style.opacity = x.o;
      s.path.style.display = '';
      s.visible = x.o > 0.02;
    });
  }

  /* ---------------- Pluck / drag ----------------
     Pointer-driven, so it stays out of the way on touch: a finger on the board
     must never capture a swipe of the carousel. */
  const canInteract = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

  let lastPt = null, vel = [0, 0];
  function toSvg(e) {
    const m = svg.getScreenCTM().inverse();
    return [m.a * e.clientX + m.c * e.clientY + m.e, m.b * e.clientX + m.d * e.clientY + m.f];
  }
  svg.addEventListener('pointermove', e => {
    const p = toSvg(e);
    if (lastPt) vel = [p[0] - lastPt[0], p[1] - lastPt[1]];
    lastPt = p;
  });
  svg.addEventListener('pointerleave', () => { lastPt = null; });

  function pluck(s) {
    if (reduce || !s.visible || !canInteract()) return;
    const now = performance.now();
    if (s.pluck && now - s.pluck.t0 < 180) return;
    if (s.len < 2) {
      const v = Math.hypot(vel[0], vel[1]);
      const dir = v > 0 ? [vel[0] / v, vel[1] / v] : [Math.SQRT1_2, Math.SQRT1_2];
      s.pluck = { t0: now, amp: PLUCK_AMP * Math.min(1, 0.6 + v / 8), amp2: 0, dir };
      return;
    }
    const dx = (s.b[0] - s.a[0]) / s.len, dy = (s.b[1] - s.a[1]) / s.len;
    const across = vel[0] * -dy + vel[1] * dx;
    const sign = across === 0 ? (Math.random() < .5 ? -1 : 1) : Math.sign(across);
    const speed = Math.min(1, 0.45 + Math.hypot(vel[0], vel[1]) / 8);
    const lenScale = Math.min(1, 0.45 + s.len / (STEP * 4));
    const amp = PLUCK_AMP * speed * lenScale * sign;
    s.pluck = { t0: now, amp, amp2: amp * 0.35 * (Math.random() < .5 ? -1 : 1) };
  }

  let drag = null, canDrag = false, current = null, edited = -1;
  const EDGE = STEP * 0.6, OFF = STEP * 1.2;
  const clampPt = p => p.map(v => Math.min(264 + EDGE, Math.max(-EDGE, v)));
  const pegOf = v => Math.min(11, Math.max(0, Math.round((v - 2) / STEP)));

  function grab(s, e) {
    const k = s.k, x = current && current.list[k];
    if (!canDrag || !x || x.o < 0.5) return false;
    const pt = toSvg(e);
    const end = d(pt, s.a) <= d(pt, s.b) ? 'a' : 'b';
    const atFrom = current.u === 0, p = x.p;
    const ref = atFrom
      ? { screen: current.seg,     idx: p.ai, end }
      : { screen: current.seg + 1, idx: p.bi, end: p.flip ? (end === 'a' ? 'b' : 'a') : end };
    if (ref.idx < 0) return false;
    drag = { slot: s, end, ref, screen: current.rest, seg: current.seg, pt: clampPt(pt), raw: pt, pid: e.pointerId };
    s.pluck = null;
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
    return true;
  }

  function drop(pt, raw) {
    const { ref, slot } = drag;
    drag = null;
    svg.classList.remove('dragging');
    const off = raw[0] < -OFF || raw[0] > 264 + OFF || raw[1] < -OFF || raw[1] > 264 + OFF;
    if (!off) {
      if (edited >= 0 && edited !== ref.screen) {
        layout[edited] = base[edited].map(cloneBand); rebuildAround(edited);
      }
      layout[ref.screen][ref.idx][ref.end] = [px(pegOf(pt[0])), px(pegOf(pt[1]))];
      edited = ref.screen;
      rebuildAround(ref.screen);
    }
    if (!reduce) slot.pluck = { t0: performance.now(), amp: PLUCK_AMP * 0.45 * (Math.random() < .5 ? -1 : 1), amp2: 0,
                                dir: [Math.SQRT1_2, Math.SQRT1_2] };
  }

  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.raw = toSvg(e);
    drag.pt = clampPt(drag.raw);
  });
  const release = e => { if (drag && e.pointerId === drag.pid) drop(drag.pt, drag.raw); };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  slots.forEach(s => {
    s.path.addEventListener('pointerenter', () => { if (!drag) pluck(s); });
    s.path.addEventListener('pointerdown', e => {
      if (grab(s, e)) { e.preventDefault(); return; }
      pluck(s);
    });
  });

  /* ---------------- Driver ----------------
     The bands are the hero and the six capability sections, in DOM order.
     Measuring their real offsets rather than assuming a viewport multiple
     keeps this honest if a section ever grows past 100svh. */
  /* Measure the TRACK where there is one: the capability itself is sticky, so
     its band is the length of its track (dwell + pass), not its own height.
     The existing head-of-band hold then covers the pinned stretch, which is
     exactly the "finish on approach, hold while it is in view" behaviour. */
  const sections = [document.getElementById('xp-hero'),
                    ...Array.from(rail.querySelectorAll('.cap'))
                      .map(c => c.closest('.cap-track') || c)].filter(Boolean);
  const footer = document.querySelector('.site-footer');

  let horizontal = false;
  let starts = [], spans = [];

  /* On a phone the board is hero furniture: it sits in the first fold, plays
     through the icons on its own and then scrolls away. There is no scroll
     left to drive it -- the capabilities have their own screens below -- so
     at this width `t` runs off a clock instead, bouncing 0 -> N -> 0 so every
     step stays between adjacent icons, which is all buildTransition knows
     how to morph between. */
  const phone = matchMedia('(max-width: 767px)');
  const AUTO_S = 2.4;               // seconds per icon
  let auto = 0, autoDir = 1;

  function measure() {
    horizontal = getComputedStyle(rail).overflowX !== 'visible'
              && rail.scrollWidth > rail.clientWidth + 1;
    starts = sections.map(s => horizontal ? s.offsetLeft : s.offsetTop);
    spans = starts.map((v, i) =>
      i < starts.length - 1 ? starts[i + 1] - v
                            : (horizontal ? sections[i].offsetWidth : sections[i].offsetHeight));
  }

  /* Hovering a hero index link plays that capability's board. The index is
     an index: pointing at a row should show you what you would be scrolling
     to, so it takes the board there and lets go on the way out. The band
     that drives the board is [hero, cap 1 ... cap 6] in DOM order, so
     capability n IS t = n, read off the link's own href rather than needing
     anything added to the markup.

     It overrides the scroll only while the pointer is on a row; the same
     spring carries it both ways, so there is nothing to animate by hand and
     releasing lands wherever the page has actually scrolled to. */
  let preview = null;

  Array.prototype.forEach.call(
    document.querySelectorAll('.xp-index__link[href^="#cap-"]'), function (link) {
      const n = +link.getAttribute('href').slice(5);
      if (!n) return;
      const on  = function () { preview = n; };
      const off = function () { preview = null; };
      link.addEventListener('pointerenter', on);
      link.addEventListener('pointerleave', off);
      link.addEventListener('focus', on);
      link.addEventListener('blur', off);
    });

  /* scroll position -> t, with the hold at the head of each band */
  function targetT() {
    if (preview !== null) return preview;
    if (phone.matches) return auto;
    if (!starts.length) return 0;
    const pos = horizontal ? rail.scrollLeft : window.scrollY;
    let k = 0;
    for (let i = 0; i < starts.length; i++) if (pos >= starts[i] - 1) k = i;
    const span = spans[k] || 1;
    const u = clamp01((pos - starts[k]) / span);
    const m = clamp01((u - BAND_HOLD) / (1 - BAND_HOLD));
    return Math.min(N, k + ease(m));
  }

  /* The board belongs to the rail, so it has to retire once the rail is done.
     It used to fade against the footer, which was the first thing after the
     rail -- Who We Work With now sits in between, and the board was painting
     over its cards. Fade against whichever of the two comes first. */
  const tail = document.querySelector('.xp-who') || footer;
  function boardOpacity() {
    /* Nothing to fade against on a phone: the stage is in the page rather
       than fixed over it, so leaving the hero already takes it away. */
    if (phone.matches) return 1;
    if (!tail) return 1;
    const r = tail.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp01((r.top - vh * 0.35) / (vh * 0.3));
  }

  measure();
  addEventListener('resize', () => { measure(); }, { passive: true });
  rail.addEventListener('scroll', () => {}, { passive: true });

  let t = targetT(), last = performance.now(), lastOp = -1;
  frame(t, 0, last, true);
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (phone.matches && !reduce) {
      auto += (dt / AUTO_S) * autoDir;
      if (auto >= N) { auto = N; autoDir = -1; }
      else if (auto <= 0) { auto = 0; autoDir = 1; }
    }
    const target = targetT();
    t = reduce ? target : t + (target - t) * (1 - Math.exp(-dt / SMOOTH_S));
    if (Math.abs(target - t) < 1e-4) t = target;
    frame(t, dt, now, Math.abs(target - t) < 0.02);

    const op = Math.round(boardOpacity() * 100) / 100;
    if (op !== lastOp) { stage.style.setProperty('--peg-opacity', op); lastOp = op; }

    requestAnimationFrame(loop);
  })(last);

  /* expose for verification */
  window.__peg = { get t() { return t; }, get target() { return targetT(); },
                   get preview() { return preview; },
                   get horizontal() { return horizontal; },
                   get starts() { return starts; }, get spans() { return spans; } };
})();
