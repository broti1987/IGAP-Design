import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
const BG_COLOR = '#F7FBFD';
const CONFIG = {
  bands: [
    { color: '#22ADAD' },
    { color: '#7ed329' },
    { color: '#1dbcec' },
  ],
  hand: { passes: 5, passesBig: 3, uneven: 0.6, freq: 5, bumpsNode: 2, speed: 0.45,
          spread: 0.07, jitter: 0.04, opacity: 0.95, lighten: 0.45 },
  organicAmount: 0.42,
  organicSpeed:  1.86,
  ripple: { strength: 0.18, radius: 0.5, frequency: 7, speed: 1.5 },
  connector: { color: '#8695A5', weight: 1.5, opacity: 0.8, growStart: 0.82, flowSpeed: 0.8, flowCycles: 1.5 },
  hub: { enabled: true, growStart: 0.62, pointColor: '#000000', pointSize: 0.015, lineColor: '#8695A5', lineWeight: 0.6, magnet: 2,
         midColor: '#B0BFD2', midWeight: 0.6 },
  wire: { color: '#B0BFD2', weight: 0.9, rimWeight: 1.75, spin: 0.4, lighten: 0.45, nodeScale: 0.06, inset: 0.96 },
  fill: { color: '#F7FBFD', opacity: 1 },
  dot: { color: '#CAD4E2', z: -1.5, sizeGradient: [0.5, 1.5], hoverRings: [3.5, 2.5, 2.0, 1.5],
         hoverColor: '#2EC4F2', hoverEase: 0.15, hoverOutDelay: 450, treeOpacity: 0.4 },
  camera: { zoom: 0.3 },
  // Band drop lives per-profile in SIZES (sinkDrop / restDrop) — desktop and
  // mobile have very different loop radii and camera distances, so one set of
  // world-unit offsets cannot serve both.
  // fold 5: bands morph into a "tree" — wide fanned crown up top that gathers
  // into a narrow twisting trunk, leaning right, bleeding past top/bottom edges.
  tree: { cx: 1.1, crown: 0.5, trunk: 0.05, taper: 2.4,
          amp: 0.10, freq: 2.4, speed: 0.3, phase: 2.1,
          passFan: 0.15, passFloor: 0.3, bleed: 1.18, width: 0.0, // 0 = single line per pass; >0 splits into parallel rails
          wander: 0.07, wanderFreq: 5.0, wanderSpeed: 0.5, wanderY: 0.03,
          weight: 0.2,   // stroke thickness multiplier for the tree fold
          passes: 6 },   // strokes per strand (1 = single clean loop / parallel rails)
  // fold 11: tree unfans into a horizontal braid nested along the bottom (full width)
  nest: { y: 0.62, spacing: 0.1, amp: 0.14, freq: 1.6, speed: 0.3, phase: 2.1, width: 0.0, bleedX: 0.92 },
  preview: { useScroll: true, fold: 0 },
};
const BREAKPOINT = 768;
const SIZES = {
  desktop: { loopSize: 1.4, loopX: 1.2, loopY: -0.1, sphereRadius: 0.27, nodeX: 0, nodeY: 0, triScale: 1, detail: 10,
             sphereDotSize: 0.1,
             bigScale: 2.18, bigX: 0, bigY: -4,
             // how far the band sinks to clear the frame, and where it settles
             // once the tree has come back apart
             sinkDrop: 3.2, restDrop: 0.6,
             loopSpread: 0.2, loopAlignY: 1,
             weight: 2.5, weightNode: 1.75, dotSpacing: 0.1, dotRadius: 0.04,
             drift: 0.84, labelDist: 16, labelSize: 12 },
  mobile:  { loopSize: 4, loopX: 3.5, loopY: -1, sphereRadius: 0.4, nodeX: 0, nodeY: 1, triScale: 1.5, detail: 6,
             sphereDotSize: 0.15,
             bigScale: 2, bigX: 0, bigY: -10,
             sinkDrop: 3.2, restDrop: 0.6,
             loopSpread: 0, loopAlignY: 0,
             weight: 4, weightNode: 5, dotSpacing: 0.25, dotRadius: 0.03,
             drift: 0.84, labelDist: 8, labelSize: 10 },
};
function P() { return window.innerWidth < BREAKPOINT ? SIZES.mobile : SIZES.desktop; }
function loopShiftX(prof, i) { return (i - 1) * (prof.loopSpread || 0); }
function loopCY(prof, i) { return LOOP_CENTERS[i].y * (1 - (prof.loopAlignY || 0)); }
const canvas = document.getElementById('igap-scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);
let baseCamZ = 5;
const group = new THREE.Group();
scene.add(group);
// Full-screen backdrop drawn behind the dots; fades in with the tree
const bgFadeMat = new THREE.MeshBasicMaterial({ color: 0x001D3C, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
const bgFade = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), bgFadeMat);
bgFade.position.z = -1.6;
bgFade.renderOrder = -2;
bgFade.frustumCulled = false;
scene.add(bgFade);
const dotUniforms = {
  uColor:   { value: new THREE.Color(CONFIG.dot.color) },
  uSpacing: { value: SIZES.desktop.dotSpacing },
  uRadius:  { value: SIZES.desktop.dotRadius },
  uMouse:      { value: new THREE.Vector2(1e9, 1e9) },
  uHover:      { value: CONFIG.dot.hoverRings },
  uHoverColor: { value: new THREE.Color(CONFIG.dot.hoverColor) },
  uHoverAmt:   { value: 0 },
  uSizeGrad:   { value: new THREE.Vector2(CONFIG.dot.sizeGradient[0], CONFIG.dot.sizeGradient[1]) },
  uFade:       { value: 1 },
};
const dotMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.ShaderMaterial({
    uniforms: dotUniforms,
    transparent: true, depthTest: false, depthWrite: false,
    extensions: { derivatives: true },
    vertexShader: `
      varying vec2 vWorld;
      varying float vScreenY;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xy;
        gl_Position = projectionMatrix * viewMatrix * wp;
        vScreenY = gl_Position.y / gl_Position.w * 0.5 + 0.5;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vWorld; varying float vScreenY;
      uniform vec3 uColor; uniform float uSpacing; uniform float uRadius; uniform vec2 uMouse;
      uniform float uHover[4]; uniform vec3 uHoverColor; uniform float uHoverAmt; uniform vec2 uSizeGrad;
      uniform float uFade;
      void main() {
        vec2 g = vWorld / uSpacing;
        vec2 cellId = floor(g) + 0.5;
        vec2 cur    = floor(uMouse / uSpacing) + 0.5;
        float dist  = distance(cellId, cur);
        float ring =
          dist < 0.5 ? uHover[0] :
          dist < 1.5 ? uHover[1] :
          dist < 2.5 ? uHover[2] :
          dist < 3.5 ? uHover[3] : 1.0;
        float scale = 1.0 + (ring - 1.0) * uHoverAmt;
        float grad = mix(uSizeGrad.y, uSizeGrad.x, clamp(vScreenY, 0.0, 1.0));
        float rad = uRadius * grad * scale;
        float hb = clamp((scale - 1.0) / max(uHover[0] - 1.0, 0.001), 0.0, 1.0);
        vec3 col = mix(uColor, uHoverColor, hb);
        vec2 cell = fract(g) - 0.5;
        float d = length(cell);
        float aa = fwidth(d);
        float alpha = (1.0 - smoothstep(rad - aa, rad + aa, d)) * uFade;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  })
);
dotMesh.position.z = CONFIG.dot.z;
dotMesh.renderOrder = -1;
dotMesh.frustumCulled = false;
scene.add(dotMesh);
const CONFIG_PARTICLES = { max: 400, rate: 2.5, idleRate: 50, speed: 0.9, life: 1.1, size: 0.035,
                           proximity: 0.15, scatter: 0.6, gravity: 0.5, damp: 0.92 };
const pMax = CONFIG_PARTICLES.max;
const pPos = new Float32Array(pMax * 3);
const pCol = new Float32Array(pMax * 3);
const pAlpha = new Float32Array(pMax);
const pSize = new Float32Array(pMax);
const pVel = new Float32Array(pMax * 2);
const pLife = new Float32Array(pMax);
const pMaxLife = new Float32Array(pMax);
let pHead = 0;
const pPalette = CONFIG.bands.map(b => new THREE.Color(b.color));
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
const pMat = new THREE.ShaderMaterial({
  transparent: true, depthTest: false, depthWrite: false,
  uniforms: { uPix: { value: window.innerHeight } },
  vertexShader: `
    attribute vec3 aColor; attribute float aAlpha; attribute float aSize;
    uniform float uPix; varying vec3 vColor; varying float vAlpha;
    void main() {
      vColor = aColor; vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (uPix / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vColor; varying float vAlpha;
    void main() {
      float m = 1.0 - smoothstep(0.35, 0.5, length(gl_PointCoord - 0.5));
      float a = vAlpha * m;
      if (a < 0.01) discard;
      gl_FragColor = vec4(vColor, a);
    }
  `,
});
const pPoints = new THREE.Points(pGeo, pMat);
pPoints.renderOrder = 0.5;
pPoints.frustumCulled = false;
scene.add(pPoints);
function spawnParticle(x, y, col) {
  const i = pHead; pHead = (pHead + 1) % pMax;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = 0.02;
  const c = col || pPalette[(Math.random() * pPalette.length) | 0];
  pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
  const ang = Math.random() * TAU, spd = CONFIG_PARTICLES.speed * (0.2 + Math.random());
  pVel[i * 2] = Math.cos(ang) * spd;
  pVel[i * 2 + 1] = Math.sin(ang) * spd + 0.15;
  pMaxLife[i] = CONFIG_PARTICLES.life * (0.6 + Math.random() * 0.8);
  pLife[i] = pMaxLife[i];
  pAlpha[i] = 1.0;
  pSize[i] = CONFIG_PARTICLES.size * (0.5 + Math.random());
}
function updateParticles(t, dt, time, treeP, nestP) {
  const prof = P();
  let near = false, forceCol = null;
  if (t < 0.6) {
    for (let i = 0; i < LOOP_CENTERS.length; i++) {
      const cx = LOOP_CENTERS[i].x + prof.loopX + loopShiftX(prof, i), cy = loopCY(prof, i) + prof.loopY;
      const d = Math.hypot(mouseWorld.x - cx, mouseWorld.y - cy);
      if (Math.abs(d - prof.loopSize) < CONFIG_PARTICLES.proximity) { near = true; break; }
    }
    const idle = CONFIG_PARTICLES.idleRate * dt * (1 - t / 0.6);
    let m = Math.floor(idle) + (Math.random() < (idle % 1) ? 1 : 0);
    for (let k = 0; k < m; k++) {
      const li = (Math.random() * LOOP_CENTERS.length) | 0;
      const th = Math.random() * TAU;
      const rad = prof.loopSize * (1 + organic(th, time, li * 1.7));
      spawnParticle(LOOP_CENTERS[li].x + prof.loopX + loopShiftX(prof, li) + rad * Math.cos(th),
                    loopCY(prof, li) + prof.loopY + rad * Math.sin(th),
                    pPalette[li]);
    }
    if (m > 0) { pGeo.attributes.aColor.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true; }
  } else if (1 - Math.min(1, Math.abs(t - 1)) > 0.5) {
    for (let i = 0; i < NODE_BASES.length; i++) {
      const c = nodeCenter(i, time);
      const d = Math.hypot(mouseWorld.x - c.x, mouseWorld.y - c.y);
      if (d < prof.sphereRadius + CONFIG_PARTICLES.proximity) { near = true; forceCol = pPalette[i]; break; }
    }
  } else if (treeP > 0.5 && nestP < 0.5) {
    const T = CONFIG.tree;
    const my = mouseWorld.y;
    const treeHalfH = Math.tan((camera.fov * Math.PI / 180) / 2) * Math.abs(camera.position.z);
    const tTop = treeHalfH * T.bleed, tBot = -tTop;
    if (my < tTop && my > tBot) {
      for (let i = 0; i < 3; i++) {
        const v = (tTop - my) / (tTop - tBot);
        const fan = Math.pow(1 - v, T.taper);
        const spreadV = T.trunk + (T.crown - T.trunk) * fan;
        const wave = T.amp * Math.sin(my * T.freq + time * T.speed + i * T.phase);
        const cxs = T.cx + (i - 1) * spreadV + wave;
        if (Math.abs(mouseWorld.x - cxs) < CONFIG_PARTICLES.proximity) { near = true; forceCol = pPalette[i]; break; }
      }
    }
  } else if (nestP >= 0.5) {
    const Nn = CONFIG.nest;
    const treeHalfH = Math.tan((camera.fov * Math.PI / 180) / 2) * Math.abs(camera.position.z);
    const halfW = treeHalfH * camera.aspect;
    const left = -halfW * Nn.bleedX, right = halfW * Nn.bleedX;
    const mx = mouseWorld.x;
    if (mx > left && mx < right) {
      const yBase = -treeHalfH * Nn.y;
      for (let i = 0; i < 3; i++) {
        const waveY = Nn.amp * Math.sin(mx * Nn.freq + time * Nn.speed + i * Nn.phase);
        const yc = yBase + (i - 1) * Nn.spacing + waveY;
        if (Math.abs(mouseWorld.y - yc) < CONFIG_PARTICLES.proximity) { near = true; forceCol = pPalette[i]; break; }
      }
    }
  }
  if (near) {
    const rate = pointerEnergy * CONFIG_PARTICLES.rate;
    let n = Math.floor(rate) + (Math.random() < (rate % 1) ? 1 : 0);
    const sc = CONFIG_PARTICLES.scatter;
    for (let k = 0; k < n; k++)
      spawnParticle(mouseWorld.x + (Math.random() - 0.5) * sc,
                    mouseWorld.y + (Math.random() - 0.5) * sc, forceCol);
    if (n > 0) { pGeo.attributes.aColor.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true; }
  }
  for (let i = 0; i < pMax; i++) {
    if (pAlpha[i] <= 0) continue;
    pLife[i] -= dt;
    if (pLife[i] <= 0) { pAlpha[i] = 0; continue; }
    pPos[i * 3]     += pVel[i * 2] * dt;
    pPos[i * 3 + 1] += pVel[i * 2 + 1] * dt;
    pVel[i * 2]     *= CONFIG_PARTICLES.damp;
    pVel[i * 2 + 1]  = pVel[i * 2 + 1] * CONFIG_PARTICLES.damp - CONFIG_PARTICLES.gravity * dt;
    pAlpha[i] = pLife[i] / pMaxLife[i];
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.aAlpha.needsUpdate = true;
}
const LABELS = [
  { text: 'INSIGHT',    dir: [0, 1] },
  { text: 'ENGAGEMENT', dir: [1, 0.3] },
  { text: 'EXECUTION',  dir: [-0.8, -0.8] }, // top-left of the third sphere
];
const labelEls = LABELS.map((l, i) => {
  const el = document.createElement('div');
  el.className = 'igap-label';
  el.textContent = l.text;
  el.style.color = CONFIG.bands[i].color; // match each label to its sphere colour
  document.body.appendChild(el);
  return el;
});
const _proj = new THREE.Vector3();
function projectPx(x, y, z) {
  _proj.set(x, y, z).project(camera);
  return { x: (_proj.x * 0.5 + 0.5) * window.innerWidth, y: (1 - (_proj.y * 0.5 + 0.5)) * window.innerHeight };
}
const isTouch = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
const raycaster = new THREE.Raycaster();
const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dotPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -CONFIG.dot.z);
const _dotHit = new THREE.Vector3();
const dotMouseTarget = new THREE.Vector2(1e9, 1e9);
const mouseNDC = new THREE.Vector2(10, 10);
const mouseWorld = new THREE.Vector3(9999, 9999, 0);
let pointerEnergy = 0;
const hubOffset = { x: 0, y: 0 };
let hoverTargetAmt = 0;
let hoverLeaveTimer = null;
window.addEventListener('pointermove', e => {
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(zPlane, mouseWorld);
  pointerEnergy = 1;
  hoverTargetAmt = 1;
  if (hoverLeaveTimer) { clearTimeout(hoverLeaveTimer); hoverLeaveTimer = null; }
}, { passive: true });
window.addEventListener('pointerout', e => {
  if (e.relatedTarget || hoverLeaveTimer) return;
  hoverLeaveTimer = setTimeout(() => { hoverTargetAmt = 0; hoverLeaveTimer = null; }, CONFIG.dot.hoverOutDelay);
}, { passive: true });
const N = 320;
const LOOP_CENTERS = [
  { x: -0.16, y:  0.10 },
  { x:  0.13, y: -0.13 },
  { x:  0.04, y:  0.16 },
];
const NODE_BASES = [
  { x: -1.10, y:  0.35, z:  0.25 },
  { x:  0.25, y: -1.00, z: -0.55 },
  { x:  1.00, y:  0.70, z:  0.45 },
];
const NODE_C = {
  x: (NODE_BASES[0].x + NODE_BASES[1].x + NODE_BASES[2].x) / 3,
  y: (NODE_BASES[0].y + NODE_BASES[1].y + NODE_BASES[2].y) / 3,
  z: (NODE_BASES[0].z + NODE_BASES[1].z + NODE_BASES[2].z) / 3,
};
const BIG_X = [-0.55, 0.10, 0.60];
const TAU = Math.PI * 2;
const STROKE_SCALE = 0.007;
const SCRATCH = new Float32Array(N * 3);
const WHITE = new THREE.Color('#ffffff');
function passColor(i, p) {
  const c = new THREE.Color(CONFIG.bands[i].color);
  if (p > 0) c.lerp(WHITE, CONFIG.hand.lighten);
  return c;
}
const MAX_PASSES = 6;
const strands = CONFIG.bands.map((band, i) => {
  const passes = [];
  for (let p = 0; p < MAX_PASSES; p++) {
    const V = (N + 1) * 2;
    const posBuf = new Float32Array(V * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
    const idx = [];
    for (let k = 0; k < N; k++) {
      const a = 2 * k, b = 2 * k + 1, c = 2 * k + 2, d = 2 * k + 3;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({
      color: passColor(i, p),
      transparent: true, opacity: CONFIG.hand.opacity, depthTest: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    group.add(mesh);
    passes.push({
      geo, mat, mesh, posBuf,
      p, main: p === 0,
      seed: i * 1.7 + p * 0.93,
      jx: Math.sin(i * 3.1 + p * 2.7),
      jy: Math.cos(i * 1.7 + p * 4.2),
    });
  }
  const fillMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(CONFIG.fill.color),
    transparent: true, opacity: 0, depthTest: true, depthWrite: true,
  });
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), fillMat);
  fill.renderOrder = 1;
  fill.visible = false;
  group.add(fill);
  return { passes, fill, fillMat, seed: i * 1.7 };
});
function setBandColors(i) {
  strands[i].passes.forEach((p, idx) => p.mat.color.copy(passColor(i, idx)));
}
function refreshAllColors() { strands.forEach((s, i) => setBandColors(i)); }
const WIRE_SEG = 96;
const _polyCache = {};
function buildPoly(detail) {
  const poly = new THREE.IcosahedronGeometry(1, detail);
  const edges = Array.from(new THREE.EdgesGeometry(poly).attributes.position.array);
  const seen = new Set(), nodes = [], p = poly.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const key = p[i].toFixed(3) + ',' + p[i + 1].toFixed(3) + ',' + p[i + 2].toFixed(3);
    if (!seen.has(key)) { seen.add(key); nodes.push(p[i], p[i + 1], p[i + 2]); }
  }
  return { edges, nodes };
}
function clampDetail(d) { return Math.max(0, Math.min(7, Math.round(d))); }
function getPoly(detail) { detail = clampDetail(detail); return _polyCache[detail] || (_polyCache[detail] = buildPoly(detail)); }
let currentDetail = clampDetail(P().detail);
let DODECA_EDGES = getPoly(currentDetail).edges;
let DODECA_NODES = getPoly(currentDetail).nodes;
const NODE_TEX = (() => {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); x.beginPath(); x.arc(s / 2, s / 2, s / 2 * 0.85, 0, TAU);
  x.fillStyle = '#fff'; x.fill();
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
})();
function mkRim() {
  const geo = new LineGeometry();
  geo.setPositions(new Float32Array((WIRE_SEG + 1) * 3));
  const mat = new LineMaterial({
    color: new THREE.Color(0xffffff),
    linewidth: CONFIG.wire.rimWeight,
    transparent: true, opacity: 0, depthTest: false,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);
  const line = new Line2(geo, mat);
  line.renderOrder = 2;
  line.frustumCulled = false;
  group.add(line);
  return { geo, mat, line, buf: new Float32Array((WIRE_SEG + 1) * 3) };
}
const wireCol = new THREE.Color();
const wires = CONFIG.bands.map(() => {
  const globe = new THREE.Group();
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.Float32BufferAttribute(DODECA_NODES, 3));
  const nm = new THREE.PointsMaterial({
    color: new THREE.Color(0xffffff), size: 0.02, sizeAttenuation: true,
    map: NODE_TEX, alphaTest: 0.4, transparent: true, opacity: 0,
    depthTest: true, depthWrite: false,
  });
  const nodes = new THREE.Points(ng, nm);
  nodes.renderOrder = 1.7; nodes.frustumCulled = false;
  globe.add(nodes);
  group.add(globe);
  return { globe, nodes, nm, rim: mkRim() };
});
function applyDetail(detail) {
  detail = clampDetail(detail);
  if (detail === currentDetail) return;
  const poly = getPoly(detail);
  DODECA_EDGES = poly.edges; DODECA_NODES = poly.nodes;
  wires.forEach(w => {
    w.nodes.geometry.setAttribute('position', new THREE.Float32BufferAttribute(poly.nodes, 3));
    w.nodes.geometry.attributes.position.needsUpdate = true;
  });
  currentDetail = detail;
}
const PAIRS = [[0, 1], [1, 2], [2, 0]];
const CSEG = 24;
const connectors = PAIRS.map(() => {
  const geo = new LineGeometry();
  geo.setPositions(new Float32Array((CSEG + 1) * 3));
  geo.setColors(new Float32Array((CSEG + 1) * 3));
  const mat = new LineMaterial({
    color: new THREE.Color(0xffffff),
    linewidth: CONFIG.connector.weight,
    transparent: true, opacity: 0, depthTest: false, vertexColors: true,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);
  const line = new Line2(geo, mat);
  line.renderOrder = 0;
  line.frustumCulled = false;
  group.add(line);
  return { geo, mat, line, buf: new Float32Array((CSEG + 1) * 3), col: new Float32Array((CSEG + 1) * 3) };
});
const hubPointMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(CONFIG.hub.pointColor), transparent: true, opacity: 0, depthTest: false,
});
const hubPoint = new THREE.Mesh(new THREE.CircleGeometry(1, 32), hubPointMat);
hubPoint.renderOrder = 2;
hubPoint.frustumCulled = false;
group.add(hubPoint);
const hubSpokes = [0, 1, 2].map(() => {
  const geo = new LineGeometry();
  geo.setPositions(new Float32Array((CSEG + 1) * 3));
  const mat = new LineMaterial({
    color: new THREE.Color(CONFIG.hub.lineColor),
    linewidth: CONFIG.hub.lineWeight,
    transparent: true, opacity: 0, depthTest: false,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);
  const line = new Line2(geo, mat);
  line.renderOrder = 0;
  line.frustumCulled = false;
  group.add(line);
  return { geo, mat, line, buf: new Float32Array((CSEG + 1) * 3) };
});
const hubMids = PAIRS.map(() => {
  const geo = new LineGeometry();
  geo.setPositions(new Float32Array((CSEG + 1) * 3));
  const mat = new LineMaterial({
    color: new THREE.Color(CONFIG.hub.midColor),
    linewidth: CONFIG.hub.midWeight,
    transparent: true, opacity: 0, depthTest: false,
  });
  mat.resolution.set(window.innerWidth, window.innerHeight);
  const line = new Line2(geo, mat);
  line.renderOrder = 0;
  line.frustumCulled = false;
  group.add(line);
  return { geo, mat, line, buf: new Float32Array((CSEG + 1) * 3) };
});
const lerp = (a, b, t) => a + (b - a) * t;
function organic(theta, time, seed) {
  const t = time * CONFIG.organicSpeed;
  const warp = 0.45 * Math.sin(theta + t * 0.18 + seed);
  const th = theta + warp;
  const w =
      0.22 * Math.sin(2 * th + t * 0.26 + seed)
    + 0.14 * Math.sin(3 * th - t * 0.21 + seed * 1.6)
    + 0.08 * Math.sin(1 * th + t * 0.15 + seed * 0.7);
  return CONFIG.organicAmount * w;
}
function nodeCenter(i, time) {
  const b = NODE_BASES[i];
  const prof = P();
  const d = prof.drift;
  const s = prof.triScale;
  return {
    x: NODE_C.x + (b.x - NODE_C.x) * s + prof.nodeX + d * 0.32 * Math.sin(time * 0.55 + i),
    y: NODE_C.y + (b.y - NODE_C.y) * s + prof.nodeY + d * 0.28 * Math.cos(time * 0.42 + i * 2.0),
    z: NODE_C.z + (b.z - NODE_C.z) * s + d * 0.45 * Math.sin(time * 0.33 + i * 1.3),
  };
}
let targetSP = 0, sp = 0;
function measureSvh() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:-9999px;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h || window.innerHeight;
}
let svhPx = measureSvh();
// How many pixels of scroll the twelve folds are spread across.
// Folds 8-10 are the stretch where the background is fully navy, i.e. p in
// [8/11, 10/11], so the midpoint of that stretch sits at 9/11 of the span.
// Pinning that midpoint to the middle of the "Who We Work With" section keeps
// the dark background under that section no matter how the layout above it
// changes. Falls back to the original flat 11 x 100svh if the section is gone.
const SPAN_ANCHOR = '.audience';    // fold pacing hangs off this — do not retarget
const BLUE_FROM   = '.expertise';   // navy starts as this reaches the top of the screen
const BLUE_UNTIL  = '.research';    // navy ends as this comes into view
// The tree's own two anchors. It used to ride the fold clock, which meant its
// timing drifted with every layout change; both ends are now measured off the
// page, like the drop and the navy.
const TREE_FROM   = '.audience';     // formed by the time "Who We Are" appears
const TREE_UNTIL  = '.cta-section';  // still woven through "Research & Insights"
function measureSpan() {
  // scrollSpan does two jobs, and only one of them is still the fold clock.
  //   1. it normalises sp (0..1), and every position-driven schedule is then
  //      compared against spScroll = sp x scrollSpan. sp is CLAMPED to 1, so
  //      anything past scrollSpan is unreachable — an anchor beyond it silently
  //      stalls half-done.
  //   2. it paces scrollState(), which is now only the fallback for when the
  //      anchors cannot be measured.
  // Job 1 is the one that matters, so the span is simply the whole scrollable
  // page: spScroll is then the eased scroll position in page pixels and every
  // anchor is reachable by construction. The old formula
  // (audienceMidpoint x 11/9) pinned folds 8-10 under "Who We Work With"; it is
  // kept below only as the fallback for a page that has not laid out yet.
  const docSpan = document.documentElement.scrollHeight - window.innerHeight;
  if (docSpan > 0) return docSpan;
  const el = document.querySelector(SPAN_ANCHOR);
  if (!el) return 11 * svhPx;
  const mid = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2;
  return mid > 0 ? mid * 11 / 9 : 11 * svhPx;
}
let scrollSpan = measureSpan();

// ---------------------------------------------------------------------------
// The navy wash is deliberately NOT part of the fold choreography above.
// Riding it on the tree morph spread the colour change over most of a fold
// (~800px of scroll), which left a long stretch of half-mixed grey-blue.
// It now switches on its own clock, over BG_FADE_S:
//   on  — as "What We Do" reaches the top of the screen
//   off — as "Who We Are" clears the top of the screen
// js/site.js flips the header on exactly these two thresholds, so the two land
// together. Keep them in step if you change one.
// ---------------------------------------------------------------------------
// ⚠️ The navy used to cross-fade over 80px of SCROLL while the stylesheet did
// the same switch over 120ms of TIME (--blue-fade). Two different clocks for one
// change: the .is-blue class flips on the threshold, so the type went white
// inside 120ms, while the canvas still had 80px of scrolling left to darken.
// Scroll through it slowly and you sit in the middle of that — white type on a
// half-lit grey page, cards a muddy slate. Scroll fast and it inverts.
// Both sides now do the same thing: flip on the threshold, ease over the same
// duration in SECONDS. Keep this in step with --blue-fade in css/style.css.
const BG_FADE_S = 0.12;
// How much longer the navy holds past its natural end, as a fraction of the
// viewport. 0 = off exactly as "Research & Insights" touches the bottom of the
// screen; 0.3 = a further three tenths of a screen, so research's first strip
// IS briefly navy. Must match BLUE_HOLD in js/site.js.
const BLUE_HOLD = 0.30;
// Scroll over which the tree comes back apart into loops, ending at treeOff —
// "Research & Insights" clearing the top of the screen. The braid therefore
// stands through the whole of that section and only comes apart as the closing
// CTA arrives. This is NOT tied to the navy any more: the page goes light while
// the tree is still up, which is deliberate.
const UNWIND_PX = 500;
// Scroll over which the loops braid up into the tree. The window ENDS as
// "Who We Are" reaches the top of the screen, so the braid is complete at the
// exact moment that section is framed — it is one screen tall, so a window that
// STARTED there finished only as the section was already leaving, and the
// section read as empty on the right for its whole travel.
// Kept short on purpose: the strands only become visible over roughly the last
// third of the morph, so at 350 only ~120px of scroll shows a partial braid
// behind the last "What We Do" card. Lengthening this puts more of the morph
// behind those cards; shortening it makes the braid pop.
const TREE_PX = 350;
// How far ahead of "Who We Are" framing the braid finishes, as a fraction of the
// viewport: 0 = exactly as it lands, 0.5 = half a screen earlier.
// Raising this walks the morph back into the tail of "What We Do". That used to
// be the limit, but the morph is no longer drawn (see REVEAL_* below), so the
// overlap costs nothing and this is free to move.
const TREE_LEAD = 0.50;
// Scroll over which the loops sink out of frame, ending exactly where "What We
// Do" reaches the top of the screen (darkOn) — they are gone the moment that
// section arrives, in one move rather than the old four-fold staircase.
const DROP_PX = 400;
// Scroll over which the spheres open into the big loops. That morph used to sit
// on the fold clock, which put it at roughly 0.18 of the span — right in the
// middle of the hero's second fold, so the spheres came apart while their own
// labels (INSIGHT / ENGAGEMENT / EXECUTION) were still being read. It now ENDS
// where the sink begins (darkOn - DROP_PX) and runs backwards from there, which
// lands its start just after that fold unpins.
const SHAPE_PX = 450;
let darkOn = 0, darkOff = 0;
let treeOn = 0, treeOff = 0;
// The tree's schedule, measured off the page rather than counted in folds.
//   treeOn  — a tenth of a screen BEFORE "Who We Are" reaches the top. The
//             morph ENDS there, so the braid is standing for the whole of that
//             section, and complete just before it frames rather than exactly
//             as it lands. TREE_LEAD is that head start, as a fraction of the
//             viewport so it scales with the breakpoint.
//   treeOff — "Research & Insights" clears the top of the screen; the unwind
//             ENDS here, so the braid is up for the whole of that section.
function measureTreeRange() {
  const from = document.querySelector(TREE_FROM);
  const until = document.querySelector(TREE_UNTIL);
  treeOn = from
    ? from.getBoundingClientRect().top + window.scrollY - TREE_LEAD * window.innerHeight
    : 0;
  treeOff = until ? until.getBoundingClientRect().top + window.scrollY : 0;
  // Never let the unwind start before the braid has finished forming: treeP is
  // min(in, 1 - out), so an overlap does not make it late, it makes it never
  // arrive at all — a permanent half-morph.
  if (treeOff > 0 && treeOff - UNWIND_PX < treeOn) treeOff = treeOn + UNWIND_PX;
  // These are compared against spScroll (sp x scrollSpan), and sp is clamped to
  // 1, so anything past scrollSpan is never reached — the unwind would stall
  // half done at the bottom of the page.
  if (treeOff > scrollSpan) treeOff = scrollSpan;
}
function measureDarkRange() {
  const from = document.querySelector(BLUE_FROM);
  const until = document.querySelector(BLUE_UNTIL);
  if (!from) { darkOn = darkOff = 0; return; }
  // Blue covers "What We Do" and "Who We Are" together, and the two triggers
  // mirror each other: the navy arrives as the first of those sections reaches
  // the top of the screen and leaves as the last one clears it.
  // On as .expertise reaches the top of the screen — which is exactly the
  // moment the hero, which is dark type on light, finishes clearing. The fade
  // runs forward from there so no hero content is ever on a darkening page.
  // Off as "Research & Insights" comes into view at the bottom, so it is never
  // navy — its dark type and white cards always arrive on a light page.
  // ⚠️ THE KNOWN COST, chosen deliberately: "Who We Are" is exactly one screen
  // tall and the gap to research is 100px, so there is no scroll position where
  // neither section is on view — the navy has to leave while one of them is in
  // front of the reader. This trigger protects research, which means "Who We
  // Are" is framed when the colour changes and recolours in place. The only way
  // to have both clean is roughly a screen of separation between them (an empty
  // spacer after the copy, or lead-in padding inside .research), which was
  // tried and removed. Do not "fix" this by moving the trigger without adding
  // that room back — it just moves the flip onto the other section.
  darkOn = from.getBoundingClientRect().top + window.scrollY;
  darkOff = until
    ? until.getBoundingClientRect().top + window.scrollY
      - window.innerHeight * (1 - BLUE_HOLD)
    : darkOn + from.offsetHeight;
}
measureDarkRange();
measureTreeRange();
// Binary, on exactly the thresholds js/site.js toggles .is-blue on. Read from
// window.scrollY, not the eased sp — the loops are allowed to lag, the colour
// is not. frame() eases the result; this only says which side of the line we
// are on.
function bgTarget() {
  if (darkOff <= darkOn) return 0;
  const y = window.scrollY;
  return (y >= darkOn && y < darkOff) ? 1 : 0;
}

function readScroll() {
  targetSP = scrollSpan > 0 ? Math.min(1, window.scrollY / scrollSpan) : 0;
}
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();
function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function smootherstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
// Twelve folds (0-11), each 100svh. Folds 0-2 morph shape (t: 0->2) and that is
// ALL the fold clock still drives. The big band's sink, the braid forming, and
// the braid coming apart are all position-driven (DROP_PX / TREE_PX /
// UNWIND_PX against measured element positions), because anything hung off the
// fold count drifts every time a section changes height.
// Strokes per strand go 3 (big loops) -> 6 (tree). All three extra strokes share
// ONE value, so they can never light up in sequence — a per-pass count that
// ramps 3 -> 6 does exactly that, since clamp(count - pass.p) crosses each pass
// index in turn. That shared value now tracks the braid's own morph rather than
// waiting for it to finish: gating it on "treeP has reached 1" made the braid
// form at 9 strokes and then thicken to 18 a moment later, which reads as a
// second wave of strands arriving. EXTRA_TAU only smooths the value; it is a
// time constant in seconds, so the extras never step.
const EXTRA_TAU = 0.09;
// The braid's middle state — loops half-folded into the hairpin — is the ugly
// part of this animation, so it is simply not drawn. The geometry morphs exactly
// as before; only the strand opacity is gated. Held at 0 for the whole forming
// window, then faded up over REVEAL_TAU (seconds) once the braid is essentially
// complete, so it arrives whole rather than weaving up.
// Scoped to FORMING only: the gate reads treeIn, not treeP, and treeIn stays at
// 1 all the way through the unwind — so the braid still comes apart on screen.
// Nothing is lost at the start of the window either: the big loops are already
// sunk out of frame by then (see DROP_PX), so the cut to 0 is invisible.
//
// The reveal is a per-stroke cascade rather than one fade: each of the 18
// strokes (3 strands x 6 passes) starts REVEAL_STEP after the one before and
// fades over REVEAL_FADE, both in SECONDS, so it plays at the same speed however
// fast you are scrolling. Order is pass-major (pass.p * 3 + i), so the three
// colours arrive together layer by layer instead of one colour at a time.
// It runs BOTH WAYS: revealT winds forward while the braid is formed and back
// while it is morphing, so scrolling up plays the same cascade in reverse —
// strands leaving last-in-first-out rather than the whole braid cutting out.
// That is also why revealT is capped at the cascade's own length: park it at
// some large number and winding back down would take that many seconds.
const REVEAL_STEP = 0.028;
const REVEAL_FADE = 0.16;
const REVEAL_TOTAL = 17 * REVEAL_STEP + REVEAL_FADE;

function scrollState(p) {
  const f = p * 11; // fold progress 0..11
  if (f < 1) return { t: smootherstep(0.35, 1, f), tree: 0, nest: 0 };
  if (f < 2) return { t: 1 + smootherstep(0.35, 1, f - 1), tree: 0, nest: 0 };
  // Everything past fold 2 is held here; the braid is driven by treeOn /
  // treeOff in frame(), not by f. The tree value below is only the fallback for
  // when the anchors cannot be measured.
  if (f < 7) return { t: 2, tree: 0, nest: 0 };
  if (f < 8) return { t: 2, tree: smootherstep(0, 1, f - 7), nest: 0 };
  return { t: 2, tree: 1, nest: 0 };
}
const clock = new THREE.Clock();
let pLastT = 0;
let extraFade = 0;   // 0 = three strokes per strand, 1 = six
let revealT = REVEAL_TOTAL;  // cascade clock, 0 = hidden, REVEAL_TOTAL = fully drawn
let bgWash = 0;      // navy wash 0..1, eased in time to match the stylesheet
                     // (bgFade is already the mesh it drives, above)
function frame() {
  const time = clock.getElapsedTime();
  const dt = Math.min(0.05, time - pLastT);
  pLastT = time;
  sp += (targetSP - sp) * 0.08;
  const st = CONFIG.preview.useScroll ? scrollState(sp) : { t: CONFIG.preview.fold, drop: 0 };
  // Position-driven unwind, on the same eased clock as everything else.
  const spScroll = sp * scrollSpan;
  const unwindP = treeOff > 0
    ? smootherstep(treeOff - UNWIND_PX, treeOff, spScroll)
    : 0;
  const dropP = darkOn > 0
    ? smootherstep(darkOn - DROP_PX, darkOn, spScroll)
    : 0;
  // Shape (t: 0 rings -> 1 spheres -> 2 loops), position-driven like everything
  // else. Stage one finishes as the hero's second fold frames; stage two runs
  // over SHAPE_PX and ends where the sink starts, so the spheres are still
  // spheres for the whole of that fold. st.t is the fallback.
  const vhNow = window.innerHeight;
  const shapeEnd = darkOn > 0 ? darkOn - DROP_PX : 0;
  const t = CONFIG.preview.useScroll && shapeEnd > 0
    ? smootherstep(0.25 * vhNow, vhNow, spScroll)
      + smootherstep(shapeEnd - SHAPE_PX, shapeEnd, spScroll)
    : st.t;
  const prof0 = P();
  const bandDrop = lerp(dropP * prof0.sinkDrop, prof0.restDrop, unwindP); // world units
  // Forming is position-driven too, so "formed by the time Who We Are arrives"
  // stays true however the sections above are spaced. st.tree is the fallback.
  const treeIn = treeOn > 0
    ? smootherstep(treeOn - TREE_PX, treeOn, spScroll)
    : st.tree;
  const treeP = Math.min(treeIn, 1 - unwindP);
  // Hide the morph, reveal the result — and play the same cascade in reverse on
  // the way back up. Three states, because the cascade must NOT run while the
  // strands are still the big loops (before the morph) — that is an ordinary
  // part of the page and is drawn normally.
  const asLoops = treeIn <= 0.001;   // before the morph: not the braid's business
  const formed  = treeIn >= 0.995;   // braid complete: wind the cascade forward
  if (formed)        revealT = Math.min(REVEAL_TOTAL, revealT + dt);
  else if (asLoops)  revealT = 0;
  else               revealT = Math.max(0, revealT - dt);
  // While the cascade is still on screen mid-morph, FREEZE the geometry at the
  // finished braid. Without this the strands un-morph underneath the fade and
  // you see exactly the middle state the gate exists to hide. Once revealT hits
  // 0 nothing is drawn, so the geometry is free to morph again.
  const treeDraw = (!formed && !asLoops && revealT > 0) ? 1 : treeP;
  // Extras follow the braid's own progress, smoothed on a clock so they arrive
  // as one continuous thickening rather than a second wave of strands.
  extraFade += (treeDraw - extraFade) * (1 - Math.exp(-dt / EXTRA_TAU));
  const extraP = extraFade;
  const nestP = st.nest;
  // Eased on a clock so it lands with the stylesheet's 120ms transition. A
  // three-tau exponential is ~95% there at BG_FADE_S, which reads the same as
  // the CSS ease over that duration.
  bgWash += (bgTarget() - bgWash) * (1 - Math.exp(-dt / (BG_FADE_S / 3)));
  const bgP = bgWash;
  bgFadeMat.opacity = bgP;                                          // navy wash in / out
  dotUniforms.uFade.value = lerp(1, CONFIG.dot.treeOpacity, bgP);   // dim the dots with it
  // vertical extent from the current camera view, with bleed past both edges
  const treeHalfH = Math.tan((camera.fov * Math.PI / 180) / 2) * Math.abs(camera.position.z);
  const treeTop = treeHalfH * CONFIG.tree.bleed;
  const treeBot = -treeTop;
  camera.position.z = baseCamZ * (1 - CONFIG.camera.zoom * smootherstep(0, 2, t));
  dotUniforms.uSpacing.value = P().dotSpacing;
  dotUniforms.uRadius.value  = P().dotRadius;
  raycaster.setFromCamera(mouseNDC, camera);
  if (raycaster.ray.intersectPlane(dotPlane, _dotHit)) dotMouseTarget.set(_dotHit.x, _dotHit.y);
  const um = dotUniforms.uMouse.value;
  if (um.x > 1e8) um.copy(dotMouseTarget);
  else { um.x += (dotMouseTarget.x - um.x) * CONFIG.dot.hoverEase; um.y += (dotMouseTarget.y - um.y) * CONFIG.dot.hoverEase; }
  const hoverTarget = window.innerWidth < BREAKPOINT ? 0 : hoverTargetAmt;
  dotUniforms.uHoverAmt.value += (hoverTarget - dotUniforms.uHoverAmt.value) * CONFIG.dot.hoverEase;
  const nodeWeight = 1 - Math.min(1, Math.abs(t - 1));
  const sphereP = smootherstep(0, 0.55, nodeWeight);
  const fillOp  = smoothstep(0.55, 0.7, nodeWeight);
  const outlineFade = smoothstep(0.6, 0.85, nodeWeight);
  pointerEnergy *= 0.93;
  const wantLoops = Math.min(MAX_PASSES, Math.max(1, Math.round(CONFIG.hand.passes)));
  const wantBig   = Math.min(MAX_PASSES, Math.max(1, Math.round(CONFIG.hand.passesBig)));
  // tree fold can override the pass count (1 = single clean loop per strand)
  const wantTree  = Math.min(MAX_PASSES, Math.max(1, CONFIG.tree.passes));
  const wantBigEff = lerp(wantBig, wantTree, treeDraw);          // fan geometry — unchanged;
                                                             // visibility is extraP, below
  const inBig     = smoothstep(1.0, 1.6, t);
  const activeCount = lerp(wantLoops, wantBigEff, inBig);
  group.rotation.set(0, 0, 0);
  strands.forEach((s, i) => {
    const nc = nodeCenter(i, time);
    const lc = LOOP_CENTERS[i];
    const prof = P();
    const shiftX = loopShiftX(prof, i);
    const cy1 = loopCY(prof, i);
    const sphereRadBase = prof.sphereRadius * (1 + 0.05 * Math.sin(time * 0.9 + s.seed));
    s.passes.forEach(pass => {
      const sd = pass.seed;
      const collapse = nodeWeight;
      let opacity = CONFIG.hand.opacity;
      if (!pass.main) {
        const presentLoops = Math.min(1, Math.max(0, wantLoops - pass.p));
        // The three extra tree strokes share one fade rather than lighting up
        // in sequence — a count that ramps 3 -> 6 brings them in one at a time.
        const presentBig   = pass.p < wantBig
          ? Math.min(1, Math.max(0, wantBig - pass.p))
          : extraP;   // same value for passes 3, 4 and 5 — do not make this per-pass
        const present = lerp(presentLoops, presentBig, inBig);
        opacity *= present * (1 - collapse);
      }
      opacity *= (1 - outlineFade);
      // Per-stroke cascade: blanked through the morph, then in one by one.
      // Bypassed entirely while the strands are still the loops.
      if (!asLoops) {
        const revealAt = (pass.p * 3 + i) * REVEAL_STEP;
        opacity *= smootherstep(revealAt, revealAt + REVEAL_FADE, revealT);
      }
      pass.mesh.visible = opacity > 0.001;
      if (!pass.mesh.visible) return;
      const spreadStep = pass.p - (activeCount - 1) / 2;
      const rf = 1 + spreadStep * CONFIG.hand.spread * (1 - collapse);
      const jx = pass.jx * CONFIG.hand.jitter * (1 - collapse);
      const jy = pass.jy * CONFIG.hand.jitter * (1 - collapse);
      for (let k = 0; k < N; k++) {
        const u = k / N;
        const theta = u * TAU;
        const r1 = prof.loopSize * rf * (1 + organic(theta, time, sd));
        const x1 = lc.x + prof.loopX + shiftX + jx + r1 * Math.cos(theta);
        const y1 = cy1 + prof.loopY + jy + r1 * Math.sin(theta);
        const z1 = 0.18 * Math.sin(2 * theta + time * 0.4 + sd);
        const srad = sphereRadBase * rf;
        const sx = nc.x + jx * 0.4 + srad * Math.cos(theta);
        const sy = nc.y + jy * 0.4 + srad * Math.sin(theta);
        const sz = nc.z;
        const r3 = prof.loopSize * prof.bigScale * rf * (1 + organic(theta, time, sd));
        const x3 = lc.x + prof.bigX + jx + r3 * Math.cos(theta);
        const y3 = lc.y + prof.bigY + jy - bandDrop + r3 * Math.sin(theta);
        const z3 = 0.30 * Math.sin(2 * theta + time * 0.4 + sd);
        let ox = t <= 1 ? x1 : x3, oy = t <= 1 ? y1 : y3;
        let oz = t <= 1 ? z1 : z3;
        // Rail parameter: 0 at the crown -> 1 at the trunk -> 0 again, so the
        // closed loop folds into a two-rail strand.
        //
        // This used to be a triangular sweep (u*2 / (1-u)*2), which turns at
        // full speed — a hard 180-degree fold at each end. With tree.width at 0
        // the two halves coincide exactly, so the fold is an infinitely sharp
        // cusp. Once the tree has formed the crown sits just off-screen and you
        // never see it, but mid-morph the lerp from the loop drags it into view
        // as a spike.
        //
        // A raised cosine traces exactly the same path with zero velocity at
        // each end, so the turn reads as a rounded cap at every morph value.
        // railSide opens the two halves apart and closes them again at the
        // caps, so tree.width / nest.width widen the strand into a slim loop
        // without putting a step at the turn.
        const railV = 0.5 - 0.5 * Math.cos(u * TAU);
        const railSide = Math.sin(u * TAU);
        if (treeDraw > 0.0001) {
          const T = CONFIG.tree;
          const yT = treeTop + (treeBot - treeTop) * railV;
          const fan = Math.pow(1 - railV, T.taper);   // 1 at crown -> 0 at trunk
          const spreadV = T.trunk + (T.crown - T.trunk) * fan;
          const side = railSide * T.width;
          // coherent per-strand twist (whole colour twists as a unit)
          const wave = T.amp * Math.sin(yT * T.freq + time * T.speed + i * T.phase);
          // crown fan, keeping a floor so strokes stay separated in the trunk too
          const passLat = spreadStep * T.passFan * (T.passFloor + (1 - T.passFloor) * fan);
          // independent meander per pass so same-colour strokes scatter, not stick
          const wander = T.wander * Math.sin(yT * T.wanderFreq + sd * 2.3 + time * T.wanderSpeed);
          const xT = T.cx + (i - 1) * spreadV + wave + passLat + wander + side + jx;
          ox = lerp(ox, xT, treeDraw);
          oy = lerp(oy, yT + jy * 0.3 + T.wanderY * Math.sin(yT * 1.3 + sd), treeDraw);
          oz = lerp(oz, 0.08 * Math.sin(yT * 1.6 + sd), treeDraw);
        }
        if (nestP > 0.0001) {
          // fold 11: unfanned horizontal braid nested along the bottom, full width
          const Nn = CONFIG.nest;
          const halfW = treeHalfH * camera.aspect;
          const left = -halfW * Nn.bleedX, right = halfW * Nn.bleedX;
          const xN = left + (right - left) * railV + jx;
          const yBase = -treeHalfH * Nn.y;
          const waveY = Nn.amp * Math.sin(xN * Nn.freq + time * Nn.speed + i * Nn.phase);
          const sideY = railSide * Nn.width;
          const yN = yBase + (i - 1) * Nn.spacing + waveY + sideY + jy * 0.3;
          ox = lerp(ox, xN, nestP);
          oy = lerp(oy, yN, nestP);
          oz = lerp(oz, 0.05 * Math.sin(xN * 1.5 + sd), nestP);
        }
        if (pointerEnergy > 0.01) {
          const ddx = ox - mouseWorld.x, ddy = oy - mouseWorld.y;
          const dist = Math.hypot(ddx, ddy);
          const rad = CONFIG.ripple.radius;
          const fall = Math.exp(-(dist * dist) / (2 * rad * rad));
          const amp = CONFIG.ripple.strength * pointerEnergy * fall;
          if (dist > 1e-3 && amp > 1e-4) {
            const wob = Math.sin(dist * CONFIG.ripple.frequency - time * CONFIG.ripple.speed);
            ox += (ddx / dist) * amp * wob;
            oy += (ddy / dist) * amp * wob;
          }
        }
        SCRATCH[k * 3]     = lerp(ox, sx, sphereP);
        SCRATCH[k * 3 + 1] = lerp(oy, sy, sphereP);
        SCRATCH[k * 3 + 2] = lerp(oz, sz, sphereP);
      }
      const foldW = lerp(prof.weight, prof.weightNode, collapse);
      const baseW = foldW * STROKE_SCALE * lerp(1, CONFIG.tree.weight, treeDraw);
      const buf = pass.posBuf;
      for (let k = 0; k < N; k++) {
        const cx = SCRATCH[k * 3], cy = SCRATCH[k * 3 + 1], cz = SCRATCH[k * 3 + 2];
        const np = (k + 1) % N, pp = (k - 1 + N) % N;
        const tx = SCRATCH[np * 3] - SCRATCH[pp * 3], ty = SCRATCH[np * 3 + 1] - SCRATCH[pp * 3 + 1];
        const tl = Math.hypot(tx, ty) || 1e-4;
        const px = -ty / tl, py = tx / tl;
        const u = k / N;
        const sFreq = lerp(CONFIG.hand.freq, CONFIG.hand.bumpsNode, collapse);
        const n = Math.sin(u * TAU * sFreq + time * CONFIG.hand.speed + sd) * 0.6
                + Math.sin(u * TAU * sFreq * 1.7 - time * CONFIG.hand.speed * 0.6 + sd * 1.3) * 0.4;
        const halfW = Math.max(baseW * 0.12, baseW * (1 + CONFIG.hand.uneven * n)) * 0.5;
        const L = 2 * k, R = 2 * k + 1;
        buf[L * 3] = cx + px * halfW; buf[L * 3 + 1] = cy + py * halfW; buf[L * 3 + 2] = cz;
        buf[R * 3] = cx - px * halfW; buf[R * 3 + 1] = cy - py * halfW; buf[R * 3 + 2] = cz;
      }
      for (let j = 0; j < 6; j++) buf[2 * N * 3 + j] = buf[j];
      pass.geo.attributes.position.needsUpdate = true;
      pass.mat.opacity = opacity;
    });
    s.fill.position.set(nc.x, nc.y, nc.z);
    s.fill.scale.setScalar(sphereRadBase);
    s.fillMat.opacity = fillOp * CONFIG.fill.opacity;
    s.fill.visible = fillOp > 0.01;
    const w = wires[i];
    const spin  = CONFIG.wire.spin;
    const beta  = time * spin + s.seed;
    const alpha = 0.42 + 0.16 * Math.sin(time * spin * 0.6 + s.seed);
    const vis = fillOp > 0.01;
    const bandCol = s.passes[0].mat.color;
    wireCol.copy(bandCol).lerp(WHITE, CONFIG.wire.lighten);
    w.globe.position.set(nc.x, nc.y, nc.z);
    w.globe.scale.setScalar(sphereRadBase * CONFIG.wire.inset);
    w.globe.rotation.set(alpha, beta, 0);
    w.nm.color.copy(bandCol);
    w.nm.opacity = fillOp;
    w.nm.size = sphereRadBase * prof.sphereDotSize;
    w.nodes.visible = vis;
    const rim = w.rim;
    for (let k = 0; k <= WIRE_SEG; k++) {
      const a = (k / WIRE_SEG) * TAU;
      rim.buf[k * 3]     = nc.x + sphereRadBase * Math.cos(a);
      rim.buf[k * 3 + 1] = nc.y + sphereRadBase * Math.sin(a);
      rim.buf[k * 3 + 2] = nc.z;
    }
    rim.geo.setPositions(rim.buf);
    rim.mat.color.copy(bandCol);
    rim.mat.linewidth = CONFIG.wire.rimWeight;
    rim.mat.opacity = fillOp;
    rim.line.visible = vis;
    const el = labelEls[i];
    if (fillOp > 0.01) {
      const cs = projectPx(nc.x, nc.y, nc.z);
      const es = projectPx(nc.x + sphereRadBase, nc.y, nc.z);
      const rpx = Math.hypot(es.x - cs.x, es.y - cs.y);
      const d = LABELS[i].dir, dl = Math.hypot(d[0], d[1]) || 1;
      const ox = d[0] / dl, oy = d[1] / dl;
      el.style.left = (cs.x + ox * (rpx + prof.labelDist)) + 'px';
      el.style.top  = (cs.y + oy * (rpx + prof.labelDist)) + 'px';
      const tx = ox > 0.3 ? '0%' : ox < -0.3 ? '-100%' : '-50%';
      const ty = oy > 0.3 ? '0%' : oy < -0.3 ? '-100%' : '-50%';
      el.style.transform = `translate(${tx}, ${ty})`;
      el.style.fontSize = prof.labelSize + 'px';
      el.style.opacity = fillOp.toFixed(3);
    } else {
      el.style.opacity = '0';
    }
  });
  const cent = [0, 1, 2].map(i => nodeCenter(i, time));
  connectors.forEach((conn, idx) => {
    const A = cent[PAIRS[idx][0]], B = cent[PAIRS[idx][1]];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, mz = (A.z + B.z) / 2;
    const gs = Math.min(0.96, CONFIG.connector.growStart + idx * 0.04);
    const grow = smoothstep(gs, 1.0, nodeWeight);
    const ca = pPalette[PAIRS[idx][0]], cb = pPalette[PAIRS[idx][1]];
    const cyc = CONFIG.connector.flowCycles, spd = CONFIG.connector.flowSpeed;
    for (let k = 0; k <= CSEG; k++) {
      const f = k / CSEG;
      conn.buf[k * 3]     = lerp(mx, lerp(A.x, B.x, f), grow);
      conn.buf[k * 3 + 1] = lerp(my, lerp(A.y, B.y, f), grow);
      conn.buf[k * 3 + 2] = lerp(mz, lerp(A.z, B.z, f), grow);
      const m = 0.5 + 0.5 * Math.sin((f * cyc - time * spd) * TAU);
      conn.col[k * 3]     = lerp(ca.r, cb.r, m);
      conn.col[k * 3 + 1] = lerp(ca.g, cb.g, m);
      conn.col[k * 3 + 2] = lerp(ca.b, cb.b, m);
    }
    conn.geo.setPositions(conn.buf);
    conn.geo.setColors(conn.col);
    conn.mat.opacity = grow > 0.002 ? CONFIG.connector.opacity : 0;
    conn.mat.linewidth = CONFIG.connector.weight;
  });
  const center = {
    x: (cent[0].x + cent[1].x + cent[2].x) / 3,
    y: (cent[0].y + cent[1].y + cent[2].y) / 3,
    z: (cent[0].z + cent[1].z + cent[2].z) / 3,
  };
  let txp = 0, typ = 0;
  const mdx = mouseWorld.x - center.x, mdy = mouseWorld.y - center.y;
  const md = Math.hypot(mdx, mdy);
  if (!isTouch && md < 50 && md > 1e-3) {
    const pull = Math.min(CONFIG.hub.magnet, md * 0.5);
    txp = (mdx / md) * pull; typ = (mdy / md) * pull;
  }
  hubOffset.x += (txp - hubOffset.x) * 0.1;
  hubOffset.y += (typ - hubOffset.y) * 0.1;
  center.x += hubOffset.x;
  center.y += hubOffset.y;
  const hubGrow = CONFIG.hub.enabled ? smoothstep(CONFIG.hub.growStart, CONFIG.connector.growStart, nodeWeight) : 0;
  hubSpokes.forEach((spk, idx) => {
    const B = cent[idx];
    for (let k = 0; k <= CSEG; k++) {
      const sFrac = (k / CSEG) * hubGrow;
      spk.buf[k * 3] = lerp(center.x, B.x, sFrac);
      spk.buf[k * 3 + 1] = lerp(center.y, B.y, sFrac);
      spk.buf[k * 3 + 2] = lerp(center.z, B.z, sFrac);
    }
    spk.geo.setPositions(spk.buf);
    spk.mat.opacity = hubGrow > 0.002 ? CONFIG.connector.opacity : 0;
    spk.mat.linewidth = CONFIG.hub.lineWeight;
  });
  hubPoint.position.set(center.x, center.y, center.z);
  hubPoint.scale.setScalar(CONFIG.hub.pointSize);
  hubPointMat.opacity = hubGrow * CONFIG.connector.opacity;
  hubPoint.visible = hubGrow > 0.01;
  hubMids.forEach((mid, idx) => {
    const A = cent[PAIRS[idx][0]], B = cent[PAIRS[idx][1]];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, mz = (A.z + B.z) / 2;
    for (let k = 0; k <= CSEG; k++) {
      const sFrac = (k / CSEG) * hubGrow;
      mid.buf[k * 3]     = lerp(center.x, mx, sFrac);
      mid.buf[k * 3 + 1] = lerp(center.y, my, sFrac);
      mid.buf[k * 3 + 2] = lerp(center.z, mz, sFrac);
    }
    mid.geo.setPositions(mid.buf);
    mid.mat.opacity = hubGrow > 0.002 ? CONFIG.connector.opacity : 0;
    mid.mat.linewidth = CONFIG.hub.midWeight;
  });
  updateParticles(t, dt, time, treeDraw, nestP);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function resize() {
  const vv = window.visualViewport;
  const w = window.innerWidth;
  const h = Math.round(vv ? vv.height : window.innerHeight);
  renderer.setSize(w, h);
  const aspect = w / h;
  camera.aspect = aspect;
  baseCamZ = 5 * Math.max(1, 1.3 / aspect);
  camera.position.z = baseCamZ;
  camera.updateProjectionMatrix();
  connectors.forEach(c => c.mat.resolution.set(w, h));
  hubSpokes.forEach(s => s.mat.resolution.set(w, h));
  hubMids.forEach(m => m.mat.resolution.set(w, h));
  wires.forEach(wf => {
    wf.rim.mat.resolution.set(w, h);
  });
  pMat.uniforms.uPix.value = renderer.domElement.height * 0.5;
  applyDetail(P().detail);
  svhPx = measureSvh();
  scrollSpan = measureSpan();
  measureDarkRange();
  measureTreeRange();
  readScroll();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();
setTimeout(resize, 300);
frame();
