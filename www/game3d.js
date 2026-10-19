// Karanlık Ev 3D - birinci şahıs mobil korku oyunu
import * as THREE from 'three';

const MAP = [
  "################################",
  "#P.....#........#.......#......#",
  "#......#........#....B..#..K...#",
  "#...............#..............#",
  "#......#........#.......###.####",
  "###.####........#.......#......#",
  "#......#####.####.......#......#",
  "#......#........#####.###......#",
  "#..B...#.......................#",
  "#..............#...............#",
  "#......#.......#......G........#",
  "########..K....#...............#",
  "#......#.......#######.#########",
  "#......#.......#...............#",
  "#..............................#",
  "#......#.......#.........B.....#",
  "####.#######.###...............#",
  "#..............######.#####.####",
  "#..K...........#........#......#",
  "#..............#...............#",
  "#..............#........#...X..#",
  "################################",
];
const W = MAP[0].length, H = MAP.length;
const T = 2;          // bir karonun metre boyu
const WALL_H = 2.7;
const EYE = 1.6;
const TRAILER = new URLSearchParams(location.search).has('trailer');

// ---------- yardımcılar ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wall = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || MAP[ty][tx] === '#';
const wallAt = (x, z) => wall(Math.floor(x / T), Math.floor(z / T));
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const tileOf = e => ({ x: Math.floor(e.x / T), y: Math.floor(e.z / T) });
const center = (tx, ty) => ({ x: tx * T + T / 2, z: ty * T + T / 2 });
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

function bfs(sx, sy, tx, ty) {
  if (wall(tx, ty) || wall(sx, sy)) return [];
  const prev = new Int32Array(W * H).fill(-1), start = sy * W + sx, goal = ty * W + tx;
  const q = [start]; prev[start] = start;
  for (let h = 0; h < q.length; h++) {
    const c = q[h]; if (c === goal) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
      if (!wall(nx, ny) && prev[n] < 0) { prev[n] = c; q.push(n); }
    }
  }
  if (prev[goal] < 0) return [];
  const path = []; let c = goal;
  while (c !== start) { path.push({ x: c % W, y: (c / W) | 0 }); c = prev[c]; }
  return path.reverse();
}
function los(a, b) {
  const n = Math.ceil(d2(a, b) / .25);
  for (let i = 1; i < n; i++) { const t = i / n; if (wallAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false; }
  return true;
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// ---------- dokular ----------
const R = rng(11);
const wallTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5b5a48'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(40,40,25,.35)'; g.fillRect(x, 0, 10, h); }
  g.fillStyle = 'rgba(90,85,60,.5)';
  for (let y = 10; y < h * .65; y += 28) for (let x = 16; x < w; x += 32) { g.beginPath(); g.ellipse(x, y + (x / 32 % 2) * 14, 5, 8, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) { // lekeler
    const x = R() * w, y = R() * h, r = 10 + R() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(50,35,15,.55)'); gr.addColorStop(1, 'rgba(50,35,15,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 6; i++) { // akıntı izleri
    const x = R() * w; g.fillStyle = 'rgba(40,30,10,.35)'; g.fillRect(x, R() * 60, 2 + R() * 3, 60 + R() * 120);
  }
  g.fillStyle = '#2b1d12'; g.fillRect(0, h * .7, w, h * .3);               // ahşap lambri
  g.fillStyle = '#3a2717'; for (let x = 0; x < w; x += 64) g.fillRect(x + 6, h * .73, 52, h * .23);
  g.fillStyle = '#1a110a'; g.fillRect(0, h * .68, w, 6);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${R() * .15})`; g.fillRect(R() * w, R() * h, 2, 2); }
});
const floorTex = canvasTex(256, 256, (g, w, h) => {
  for (let i = 0; i < 8; i++) {
    const s = 55 + R() * 20 | 0; g.fillStyle = `rgb(${s + 15},${s},${s - 15})`; g.fillRect(0, i * 32, w, 32);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, i * 32, w, 2); g.fillRect(((i * 97) % w), i * 32, 2, 32);
    for (let k = 0; k < 20; k++) { g.fillStyle = `rgba(0,0,0,${R() * .2})`; g.fillRect(R() * w, i * 32 + R() * 30, 30 + R() * 60, 1); }
  }
  for (let i = 0; i < 8; i++) {
    const x = R() * w, y = R() * h, r = 15 + R() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}, [W, H]);
const ceilTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#3a3830'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 10; i++) {
    const x = R() * w, y = R() * h, r = 10 + R() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,40,10,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}, [W, H]);

function decalTex(kind) {
  return canvasTex(256, 256, (g, w, h) => {
    const blood = a => `rgba(${100 + R() * 40 | 0},0,0,${a})`;
    if (kind === 'pool') {
      for (let i = 0; i < 18; i++) { g.fillStyle = blood(.75); g.beginPath(); g.arc(128 + (R() - .5) * 120, 128 + (R() - .5) * 120, 10 + R() * 40, 0, 7); g.fill(); }
    } else if (kind === 'hand') {
      for (let k = 0; k < 3; k++) {
        const ox = 50 + k * 70, oy = 70 + R() * 60; g.fillStyle = blood(.85);
        g.beginPath(); g.ellipse(ox, oy + 30, 20, 24, 0, 0, 7); g.fill();
        for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(ox - 18 + f * 9, oy - 2 - (f === 0 ? -14 : f === 2 ? 6 : 0), 4, 14, (f - 2) * .15, 0, 7); g.fill(); }
        g.fillRect(ox - 4, oy + 50, 4, 30 + R() * 50);
      }
    } else {
      g.font = 'bold 110px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = blood(.9); g.fillText(kind, 128, 110);
      for (let i = 0; i < 12; i++) { g.fillRect(30 + R() * 196, 130, 3 + R() * 3, 20 + R() * 90); }
    }
  });
}

// ---------- sahne ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, .1);
const camera = new THREE.PerspectiveCamera(72, 1, .05, 60);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight(0x223040, 0x100808, .12));

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); sizeUI(); }

// fener
const flash = new THREE.SpotLight(0xffe2b8, 40, 24, .55, .5, 1.5);
flash.castShadow = true; flash.shadow.mapSize.set(512, 512); flash.shadow.camera.near = .2; flash.shadow.bias = -.002;
flash.position.set(.25, -.25, .1); camera.add(flash);
flash.target.position.set(0, -.1, -5); camera.add(flash.target);
const glowNear = new THREE.PointLight(0xffd8a0, 1.2, 4, 2); camera.add(glowNear);

// duvarlar
const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
const wallTiles = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
  if (wall(x, y) && (!wall(x + 1, y) || !wall(x - 1, y) || !wall(x, y + 1) || !wall(x, y - 1) || !wall(x+1,y+1) || !wall(x-1,y-1) || !wall(x+1,y-1) || !wall(x-1,y+1))) wallTiles.push([x, y]);
const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(T, WALL_H, T), wallMat, wallTiles.length);
const m4 = new THREE.Matrix4();
wallTiles.forEach(([x, y], i) => { m4.makeTranslation(x * T + T / 2, WALL_H / 2, y * T + T / 2); walls.setMatrixAt(i, m4); });
walls.castShadow = walls.receiveShadow = true; scene.add(walls);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * T, H * T), new THREE.MeshLambertMaterial({ map: floorTex }));
floor.rotation.x = -Math.PI / 2; floor.position.set(W * T / 2, 0, H * T / 2); floor.receiveShadow = true; scene.add(floor);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W * T, H * T), new THREE.MeshLambertMaterial({ map: ceilTex }));
ceil.rotation.x = Math.PI / 2; ceil.position.set(W * T / 2, WALL_H, H * T / 2); scene.add(ceil);

// lekeler ve duvar yazıları
const decals = { pool: decalTex('pool'), hand: decalTex('hand'), KAÇ: decalTex('KAÇ'), BURADA: decalTex('BURADA'), ÖLÜ: decalTex('ÖLÜ') };
function decalMat(t) { return new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); }
const DR = rng(5);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  if (wall(x, y)) continue;
  const c = center(x, y);
  if (DR() < .06) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), decalMat(decals.pool));
    m.rotation.x = -Math.PI / 2; m.rotation.z = DR() * 6; m.position.set(c.x + (DR() - .5), .01, c.z + (DR() - .5)); scene.add(m);
  }
  const dirs = [[0, -1, 0], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2]];
  for (const [dx, dy, rot] of dirs) if (wall(x + dx, y + dy) && DR() < .045) {
    const kind = ['hand', 'hand', 'KAÇ', 'BURADA', 'ÖLÜ'][DR() * 5 | 0];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), decalMat(decals[kind]));
    m.position.set(c.x + dx * (T / 2 - .01), 1.3 + DR() * .3, c.z + dy * (T / 2 - .01)); m.rotation.y = rot; scene.add(m);
  }
}

// eşyalar (duvar dibinde, yolu kapatmaz)
const woodMat = new THREE.MeshLambertMaterial({ color: 0x3b2818 });
const clothMat = new THREE.MeshLambertMaterial({ color: 0x6a665c });
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  if (MAP[y][x] !== '.' || DR() > .1) continue;
  const c = center(x, y), g = new THREE.Group();
  const side = [[0, -1], [0, 1], [-1, 0], [1, 0]].find(([dx, dy]) => wall(x + dx, y + dy));
  if (!side) continue;
  const kind = DR();
  if (kind < .4) { // sandık
    const b = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .6), woodMat); b.position.y = .3; b.rotation.y = DR(); g.add(b);
  } else if (kind < .7) { // devrik sandalye
    const seat = new THREE.Mesh(new THREE.BoxGeometry(.45, .05, .45), woodMat); seat.position.y = .25; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(.45, .5, .05), woodMat); back.position.set(0, .25, .2); back.rotation.x = 1.3; g.add(back);
    g.rotation.z = 1.4; g.position.y = .2;
  } else { // örtülü mobilya
    const b = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .6), clothMat); b.position.y = .45; g.add(b);
    const top = new THREE.Mesh(new THREE.SphereGeometry(.45, 8, 6), clothMat); top.scale.set(1, .5, .7); top.position.y = .9; g.add(top);
  }
  g.position.x = c.x + side[0] * .55; g.position.z = c.z + side[1] * .55;
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  scene.add(g);
}

// titrek ampuller
const bulbs = [];
for (const [tx, ty, col] of [[11, 9, 0xff7744], [27, 18, 0xff3322], [20, 14, 0xffaa66]]) {
  const c = center(tx, ty);
  const l = new THREE.PointLight(col, 4, 8, 1.6); l.position.set(c.x, WALL_H - .5, c.z); scene.add(l);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: col })); b.position.copy(l.position); scene.add(b);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .45), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  wire.position.set(c.x, WALL_H - .25, c.z); scene.add(wire);
  bulbs.push({ l, b, base: 4, t: Math.random() * 10 });
}

// anahtar, pil, kapı
const keyMat = new THREE.MeshLambertMaterial({ color: 0xd8b040, emissive: 0x6a4a08 });
function keyMesh() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.07, .02, 6, 14), keyMat); ring.position.x = -.12; g.add(ring);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(.22, .03, .03), keyMat); shaft.position.x = .04; g.add(shaft);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(.03, .07, .03), keyMat); t1.position.set(.13, -.04, 0); g.add(t1);
  const t2 = t1.clone(); t2.position.x = .08; g.add(t2);
  return g;
}
const batMat = new THREE.MeshLambertMaterial({ color: 0x2f8a3a, emissive: 0x0a3010 });
function batMesh() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .22, 10), batMat); b.rotation.z = Math.PI / 2; g.add(b);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .04, 8), new THREE.MeshLambertMaterial({ color: 0xbbbbbb }));
  cap.rotation.z = Math.PI / 2; cap.position.x = .13; g.add(cap);
  return g;
}
const exitSign = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#100'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3020'; g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.fillText('ÇIKIŞ', w / 2, 47); });

// hayalet görseli
function ghostTex() {
  return canvasTex(256, 512, (g, w, h) => {
    // saç arkası
    g.fillStyle = '#060404'; g.beginPath(); g.ellipse(128, 105, 70, 80, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(64, 100); g.quadraticCurveTo(40, 220, 70, 300); for (let x = 70; x <= 186; x += 12) g.lineTo(x + 6, 300 + (x % 24) * 1.5); g.quadraticCurveTo(216, 220, 192, 100); g.fill();
    // elbise
    const dress = g.createLinearGradient(0, 150, 0, h);
    dress.addColorStop(0, 'rgba(225,222,210,1)'); dress.addColorStop(.7, 'rgba(170,168,158,.85)'); dress.addColorStop(1, 'rgba(120,120,110,0)');
    g.fillStyle = dress; g.beginPath(); g.moveTo(92, 160); g.lineTo(164, 160);
    g.quadraticCurveTo(200, 330, 214, h);
    for (let x = 214; x > 42; x -= 14) g.lineTo(x - 7, h - 20 - (x * 7 % 40));
    g.quadraticCurveTo(56, 330, 92, 160); g.fill();
    g.strokeStyle = 'rgba(90,10,10,.6)'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(100 + i * 10, 200 + i * 15); g.lineTo(96 + i * 12, 260 + i * 20); g.stroke(); }
    // kollar
    g.strokeStyle = '#d6d2c4'; g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(96, 175); g.quadraticCurveTo(58, 260, 52, 340); g.stroke();
    g.beginPath(); g.moveTo(160, 175); g.quadraticCurveTo(198, 260, 204, 340); g.stroke();
    g.lineWidth = 3; for (const [x, s] of [[52, -1], [204, 1]]) for (let f = 0; f < 4; f++) { g.beginPath(); g.moveTo(x, 340); g.lineTo(x + s * (f * 4 - 6), 372 + f * 3); g.stroke(); }
    // yüz
    const face = g.createRadialGradient(128, 100, 5, 128, 110, 50);
    face.addColorStop(0, '#f2efe4'); face.addColorStop(.8, '#a8a698'); face.addColorStop(1, '#55534a');
    g.fillStyle = face; g.beginPath(); g.ellipse(128, 112, 40, 54, 0, 0, 7); g.fill();
    // ön saç tutamları
    g.fillStyle = '#060404';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128, 58); g.quadraticCurveTo(128 + s * 50, 70, 128 + s * 30, 200); g.lineTo(128 + s * 18, 200); g.quadraticCurveTo(128 + s * 26, 100, 128, 66); g.fill(); }
    // gözler
    for (const s of [-1, 1]) {
      const e = g.createRadialGradient(128 + s * 13, 104, 0, 128 + s * 13, 104, 12);
      e.addColorStop(0, '#000'); e.addColorStop(.7, '#000'); e.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = e; g.beginPath(); g.ellipse(128 + s * 13, 104, 10, 13, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(100,0,0,.9)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(128 + s * 13, 114); g.lineTo(128 + s * 14, 150); g.stroke();
    }
    // ağız
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(128, 140, 9, 15, 0, 0, 7); g.fill();
  });
}
const gTex = ghostTex();
const ghostMat = new THREE.SpriteMaterial({ map: gTex, transparent: true, fog: true, depthWrite: false });
const ghostSprite = new THREE.Sprite(ghostMat); ghostSprite.scale.set(1.3, 2.6, 1); scene.add(ghostSprite);
const eyeTex = canvasTex(64, 32, (g) => { for (const x of [20, 44]) { const e = g.createRadialGradient(x, 16, 0, x, 16, 10); e.addColorStop(0, 'rgba(255,40,20,1)'); e.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = e; g.fillRect(0, 0, 64, 32); } });
const eyes = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeTex, transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
eyes.scale.set(.42, .21, 1); scene.add(eyes);
const appMat = new THREE.SpriteMaterial({ map: gTex, transparent: true, fog: true, depthWrite: false, opacity: 0 });
const apparition = new THREE.Sprite(appMat); apparition.scale.set(1.3, 2.6, 1); scene.add(apparition);

// ---------- ses ----------
let AC = null, master, noiseBuf, drone, ghostVoice, ghostPan;
function initAudio() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  drone = AC.createGain(); drone.gain.value = .05;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; lp.connect(drone); drone.connect(master);
  for (const f of [55, 55.6, 82.2, 41]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
  // hayaletin konumlu nefesi
  ghostPan = AC.createPanner(); ghostPan.panningModel = 'HRTF'; ghostPan.distanceModel = 'exponential'; ghostPan.refDistance = 1.5; ghostPan.rolloffFactor = 1.4;
  ghostVoice = AC.createGain(); ghostVoice.gain.value = 0;
  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 3;
  const lfo = AC.createOscillator(); lfo.frequency.value = .45; const lg = AC.createGain(); lg.gain.value = .5;
  const breath = AC.createGain(); breath.gain.value = .5; lfo.connect(lg); lg.connect(breath.gain); lfo.start();
  src.connect(bp); bp.connect(breath); breath.connect(ghostVoice);
  const moan = AC.createOscillator(); moan.type = 'triangle'; moan.frequency.value = 110;
  const ml = AC.createOscillator(); ml.frequency.value = .3; const mg = AC.createGain(); mg.gain.value = 18; ml.connect(mg); mg.connect(moan.frequency); ml.start();
  const mv = AC.createGain(); mv.gain.value = .12; moan.connect(mv); mv.connect(ghostVoice); moan.start();
  ghostVoice.connect(ghostPan); ghostPan.connect(master); src.start();
}
function env(gn, t, a, peak, dec) { gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(peak, t + a); gn.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
function tone(f, type, peak, dec, delay = 0, slide) {
  if (!AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dec);
  env(g, t, .005, peak, dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + dec + .05);
}
function noise(peak, dec, type = 'lowpass', f = 800, delay = 0, pos) {
  if (!AC) return; const t = AC.currentTime + delay, s = AC.createBufferSource(); s.buffer = noiseBuf;
  const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = AC.createGain(); env(g, t, .004, peak, dec);
  s.connect(fl); fl.connect(g);
  if (pos) { const p = AC.createPanner(); p.panningModel = 'HRTF'; p.refDistance = 2; setPos(p, pos.x, 1, pos.z); g.connect(p); p.connect(master); } else g.connect(master);
  s.start(t, Math.random()); s.stop(t + dec + .05);
}
function setPos(p, x, y, z) { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
const sfx = {
  step: run => noise(run ? .1 : .055, .08, 'bandpass', 260 + Math.random() * 120),
  heart: v => { tone(58, 'sine', .55 * v + .05, .16); tone(50, 'sine', .45 * v + .04, .18, .2); },
  key: () => { tone(1320, 'sine', .25, .9); tone(1980, 'sine', .12, .7, .05); },
  battery: () => { tone(660, 'square', .05, .12); tone(990, 'square', .05, .15, .1); },
  locked: () => { noise(.3, .1, 'lowpass', 500); noise(.3, .1, 'lowpass', 500, .15); },
  knock: pos => { for (let i = 0; i < 3; i++) noise(.5, .12, 'lowpass', 220, i * .3, pos); },
  slam: pos => { noise(.9, .5, 'lowpass', 300, 0, pos); tone(45, 'sine', .5, .5); },
  whisper: pos => noise(.12, 1.3, 'bandpass', 2600, 0, pos),
  ghostStep: pos => noise(.35, .14, 'lowpass', 180, 0, pos),
  sting: () => { tone(1800, 'sawtooth', .18, .9, 0, 1200); tone(1907, 'sawtooth', .14, .9, 0, 1300); noise(.4, .6, 'highpass', 2000); tone(40, 'sine', .7, .8); },
  scream: () => { noise(1, 1.4, 'highpass', 900); tone(900, 'sawtooth', .55, 1.2, 0, 180); tone(1300, 'square', .3, 1, 0, 300); tone(60, 'sine', .8, 1.2); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', .2, 1.2, i * .15)),
};

// ---------- durum ----------
let S;
const pickups = [];
function reset() {
  for (const p of pickups) scene.remove(p.mesh); pickups.length = 0;
  S = { t: 0, keysGot: 0, battery: 100, state: 'play', msgT: 0, heartT: 0, stepT: 0, eventT: 18, appT: 22, flick: 1, bob: 0, scareSeen: false };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = MAP[y][x], p = center(x, y);
    if (c === 'P') S.player = { x: p.x, z: p.z, yaw: Math.PI, pitch: 0, stam: 100 };
    if (c === 'G') S.ghost = { x: p.x, z: p.z, path: [], repath: 0, mode: 'wander', chaseT: 0, stepT: 0, wob: 0 };
    if (c === 'K' || c === 'B') {
      const mesh = c === 'K' ? keyMesh() : batMesh(); mesh.position.set(p.x, .9, p.z); scene.add(mesh);
      pickups.push({ kind: c, x: p.x, z: p.z, mesh, got: false });
    }
    if (c === 'X') S.exit = { x: p.x, z: p.z, tx: x, ty: y };
  }
  apparition.visible = false; S.app = null;
  msgEl.style.opacity = 0;
}
// çıkış kapısını kuzey duvarına yerleştir
(function buildExit() {
  const ex = MAP.findIndex(r => r.includes('X')), xx = MAP[ex].indexOf('X'), c = center(xx, ex);
  // kapı, yanındaki duvara (güney) dayalı
  const doorZ = c.z + T / 2 - .06;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, .1), new THREE.MeshLambertMaterial({ color: 0x3a0e0a }));
  door.position.set(c.x, 1.05, doorZ); door.receiveShadow = true; scene.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.04, 8, 6), new THREE.MeshLambertMaterial({ color: 0xc9a040, emissive: 0x332200 }));
  knob.position.set(c.x + .4, 1.0, doorZ - .07); scene.add(knob);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.8, .2), new THREE.MeshBasicMaterial({ map: exitSign }));
  sign.position.set(c.x, 2.3, doorZ - .06); sign.rotation.y = Math.PI; scene.add(sign);
  const red = new THREE.PointLight(0xff2010, 3, 5, 2); red.position.set(c.x, 2.2, doorZ - .4); scene.add(red);
})();

// ---------- girdi ----------
const input = { mx: 0, my: 0, run: false, lookX: 0, lookY: 0 };
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
const runBtn = document.getElementById('runBtn');
runBtn.addEventListener('touchstart', e => { e.preventDefault(); input.run = true; runBtn.classList.add('on'); }, { passive: false });
runBtn.addEventListener('touchend', e => { e.preventDefault(); input.run = false; runBtn.classList.remove('on'); }, { passive: false });
const ui = document.getElementById('ui'), uctx = ui.getContext('2d');
function sizeUI() { ui.width = innerWidth; ui.height = innerHeight; }
const touchTarget = document.body;
touchTarget.addEventListener('touchstart', e => {
  if (S.state !== 'play') return;
  for (const t of e.changedTouches) {
    if (t.target === runBtn) continue;
    if (t.clientX < innerWidth * .42 && joy.id === null) { joy.id = t.identifier; joy.ox = joy.x = t.clientX; joy.oy = joy.y = t.clientY; }
    else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
  }
}, { passive: true });
touchTarget.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { joy.x = t.clientX; joy.y = t.clientY; }
    if (t.identifier === look.id) { input.lookX += t.clientX - look.x; input.lookY += t.clientY - look.y; look.x = t.clientX; look.y = t.clientY; }
  }
}, { passive: true });
const endT = e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) joy.id = null; if (t.identifier === look.id) look.id = null; } };
touchTarget.addEventListener('touchend', endT); touchTarget.addEventListener('touchcancel', endT);
canvas.addEventListener('click', () => { if (!('ontouchstart' in window) && S.state === 'play') canvas.requestPointerLock && canvas.requestPointerLock(); });
addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { input.lookX += e.movementX; input.lookY += e.movementY; } });

function readInput() {
  let mx = 0, my = 0;
  if (joy.id !== null) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy); if (m > 8) { const k = Math.min(1, m / 60); mx = dx / m * k; my = dy / m * k; } }
  if (keys.a || keys.arrowleft) mx -= 1; if (keys.d || keys.arrowright) mx += 1;
  if (keys.w || keys.arrowup) my -= 1; if (keys.s || keys.arrowdown) my += 1;
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  input.mx = mx; input.my = my;
  if (!('ontouchstart' in window)) input.run = !!keys.shift;
}

// ---------- mesaj ----------
const msgEl = document.getElementById('msg');
function say(t, dur = 2.5) { msgEl.textContent = t; msgEl.style.opacity = 1; S.msgT = dur; }

// ---------- oyun mantığı ----------
function moveEnt(e, vx, vz, r) {
  const free = (x, z) => !wallAt(x - r, z - r) && !wallAt(x + r, z - r) && !wallAt(x - r, z + r) && !wallAt(x + r, z + r);
  if (free(e.x + vx, e.z)) e.x += vx;
  if (free(e.x, e.z + vz)) e.z += vz;
}
const LIGHT_RANGE = 14, CONE = .48;
const lightFactor = () => S.battery <= 0 ? 0 : .4 + .6 * Math.min(1, S.battery / 40);
function inBeam(p, e) {
  if (S.battery <= 0 || S.flick < .5) return false;
  const d = d2(p, e); if (d > LIGHT_RANGE * lightFactor()) return false;
  const a = Math.atan2(-(e.x - p.x), -(e.z - p.z));
  return Math.abs(angDiff(p.yaw, a)) < CONE && los(p, e);
}

function update(dt) {
  if (S.state !== 'play') return;
  S.t += dt;
  const p = S.player, g = S.ghost;
  if (TRAILER && GAME.autopilot) autopilot(dt); else readInput();

  // bakış
  p.yaw -= input.lookX * .0055; p.pitch = clamp(p.pitch - input.lookY * .0045, -1.1, 1.1);
  input.lookX = input.lookY = 0;

  // yürüme
  const m = Math.hypot(input.mx, input.my), moving = m > .05;
  const running = input.run && moving && p.stam > 1;
  p.stam = clamp(p.stam + (running ? -26 : 13) * dt, 0, 100);
  const sp = (running ? 4.6 : 2.6) * dt;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  if (moving) {
    moveEnt(p, (fx * -input.my + rx * input.mx) * sp, (fz * -input.my + rz * input.mx) * sp, .3);
    S.bob += dt * m * (running ? 13 : 8.5);
    S.stepT -= dt * m; if (S.stepT <= 0) { sfx.step(running); S.stepT = running ? .3 : .5; }
  }
  p.running = running; p.moving = moving;

  // pil ve titreme
  S.battery = Math.max(0, S.battery - .95 * dt);
  const gd = d2(p, g);
  const nearFlick = g.mode === 'chase' && gd < 7 ? (7 - gd) / 7 * .5 : 0;
  S.flick = (S.battery < 20 && Math.random() < (20 - S.battery) / 50) || Math.random() < nearFlick ? .05 : 1;
  if (S.battery === 0 && !S.batWarned) { S.batWarned = true; say('Fenerin pili bitti...'); }

  for (const k of pickups) {
    if (k.got) continue;
    k.mesh.rotation.y += dt * 1.5; k.mesh.position.y = .9 + Math.sin(S.t * 2 + k.x) * .05;
    if (d2(p, k) < .8) {
      k.got = true; scene.remove(k.mesh);
      if (k.kind === 'K') { S.keysGot++; sfx.key(); say(S.keysGot < 3 ? `Bir anahtar buldun. (${S.keysGot}/3)` : 'Son anahtar! Çıkış kapısını bul.');
        if (S.keysGot === 2) { g.mode = 'chase'; g.chaseT = 6; g.last = tileOf(p); sfx.slam({ x: g.x, z: g.z }); } }
      else { S.battery = Math.min(100, S.battery + 55); S.batWarned = false; sfx.battery(); say('Pil buldun.'); }
    }
  }
  if (d2(p, S.exit) < 1.2) {
    if (S.keysGot >= 3) return finish(true);
    if (S.msgT <= 0) { sfx.locked(); say(`Kapı kilitli. ${3 - S.keysGot} anahtar daha lazım.`); }
  }

  // hayalet
  const sees = gd < 16 && los(p, g);
  const hearR = running ? 18 : moving ? 6 : 2.5;
  if ((sees && gd < 14) || gd < hearR) {
    if (g.mode !== 'chase') sfx.whisper({ x: g.x, z: g.z });
    g.mode = 'chase'; g.chaseT = 4.5; g.last = tileOf(p);
  }
  g.repath -= dt;
  if (g.mode === 'chase') {
    g.chaseT -= dt;
    if ((sees && gd < 14) || gd < hearR) g.last = tileOf(p);
    if (g.repath <= 0) { const t = tileOf(g); g.path = bfs(t.x, t.y, g.last.x, g.last.y); g.repath = .3; }
    if (g.chaseT <= 0) { g.mode = 'wander'; g.path = []; }
  } else if (!g.path.length || g.repath < -10) {
    const pt = tileOf(p); let tx, ty;
    if (Math.random() < .4) { tx = clamp(pt.x + (Math.random() * 10 - 5 | 0), 1, W - 2); ty = clamp(pt.y + (Math.random() * 10 - 5 | 0), 1, H - 2); }
    else { tx = Math.random() * W | 0; ty = Math.random() * H | 0; }
    if (wall(tx, ty)) { tx = pt.x; ty = pt.y; }
    const t = tileOf(g); g.path = bfs(t.x, t.y, tx, ty); g.repath = 0;
  }
  let gs = g.mode === 'chase' ? 3.0 + S.keysGot * .3 : 1.3;
  g.lit = inBeam(p, g);
  if (g.lit && !GAME.noSlow) gs *= .25;
  if (g.path.length) {
    const n = center(g.path[0].x, g.path[0].y), dd = d2(g, n);
    if (dd < .1) g.path.shift(); else { const k = Math.min(dd, gs * dt) / dd; g.x += (n.x - g.x) * k; g.z += (n.z - g.z) * k; }
  }
  g.wob += dt;
  g.stepT -= dt; if (g.mode === 'chase' && g.stepT <= 0 && gd < 14) { sfx.ghostStep({ x: g.x, z: g.z }); g.stepT = g.lit ? 1.2 : .42; }
  if (gd < .75) return finish(false);

  // görüntü: ani beliren hayalet
  S.appT -= dt;
  if (!S.app && S.appT <= 0 && g.mode !== 'chase' && S.battery > 0) {
    S.appT = 25 + Math.random() * 20;
    for (let d = 9; d >= 5; d--) {
      const x = p.x + fx * d, z = p.z + fz * d;
      if (!wallAt(x, z) && los(p, { x, z }) && d2({ x, z }, g) > 4) { S.app = { x, z, t: 0, seen: 0 }; break; }
    }
  }
  if (S.app) {
    const a = S.app; a.t += dt;
    if (inBeam(p, a)) { a.seen += dt; if (a.seen > 0 && !a.stung) { a.stung = true; sfx.sting(); } }
    if (a.seen > .45 || a.t > 4) { S.app = null; }
  }

  // kalp atışı ve atmosfer
  S.heartT -= dt;
  const near = clamp(1 - gd / 14, 0, 1);
  if (S.heartT <= 0 && near > 0) { sfx.heart(near); S.heartT = 1.1 - near * .78; }
  if (drone) drone.gain.value = .04 + near * .07;
  if (ghostVoice) ghostVoice.gain.value = g.mode === 'chase' ? .9 : .35;
  document.getElementById('redfx').style.opacity = (g.mode === 'chase' ? near : near * .3).toFixed(2);

  S.eventT -= dt;
  if (S.eventT <= 0) {
    S.eventT = 15 + Math.random() * 18;
    const ang = Math.random() * Math.PI * 2, pos = { x: p.x + Math.cos(ang) * 6, z: p.z + Math.sin(ang) * 6 };
    const ev = [['...arkana bakma...', 'whisper'], ['Bir yerden kapı vuruluyor.', 'knock'], ['Bir kapı çarptı.', 'slam'], ['...buradayım...', 'whisper'], ['Soğuk bir nefes ensende.', 'whisper']][Math.random() * 5 | 0];
    sfx[ev[1]](pos); say(ev[0], 3);
  }
  for (const b of bulbs) { b.t += dt; const on = Math.sin(b.t * 13) + Math.sin(b.t * 7.3) > -1.2 && Math.random() > .04; b.l.intensity = on ? b.base : 0; b.b.visible = on; }

  if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) msgEl.style.opacity = 0; }
  hud();
}

function autopilot(dt) {
  const p = S.player, pt = tileOf(p);
  const left = pickups.filter(k => k.kind === 'K' && !k.got).sort((a, b) => d2(p, a) - d2(p, b));
  const target = GAME.target || left[0] || S.exit, tt = tileOf(target);
  const path = bfs(pt.x, pt.y, tt.x, tt.y);
  const n = path.length > 1 ? center(path[1].x, path[1].y) : path.length ? center(path[0].x, path[0].y) : target;
  const want = Math.atan2(-(n.x - p.x), -(n.z - p.z));
  if (!GAME.lockLook) p.yaw += angDiff(p.yaw, want) * Math.min(1, dt * 4);
  input.mx = 0; input.my = GAME.stand ? 0 : -1; input.run = GAME.forceRun;
}

// ---------- çizim ----------
const tmp = new THREE.Vector3();
function render() {
  const p = S.player, g = S.ghost;
  const bob = Math.sin(S.bob) * .045, sway = Math.cos(S.bob * .5) * .03;
  camera.position.set(p.x, EYE + bob, p.z);
  camera.rotation.set(p.pitch + Math.abs(bob) * .2, p.yaw, sway * .3);
  const lf = lightFactor() * S.flick;
  flash.intensity = 40 * lf; flash.distance = 24 * Math.max(.3, lf); glowNear.intensity = 1.2 * (lf > 0 ? 1 : .2);
  flash.target.position.set(Math.sin(S.bob * .5) * .15, -.9 + Math.cos(S.bob) * .08, -5);

  // hayalet görünürlüğü: fenerde parlak, karanlıkta neredeyse yok
  const gd = d2(p, g);
  const bulbLit = bulbs.some(b => b.l.intensity > 0 && d2({ x: b.l.position.x, z: b.l.position.z }, g) < 4);
  let vis = g.lit ? clamp(1.3 - gd / (LIGHT_RANGE * 1.1), .25, 1) : bulbLit ? .5 : gd < 2.2 ? .35 : .04;
  ghostMat.color.setScalar(vis); ghostMat.opacity = .92;
  ghostSprite.position.set(g.x, 1.3 + Math.sin(g.wob * 1.7) * .05, g.z);
  // titreyerek kayma
  if (g.mode === 'chase' && Math.random() < .05) ghostSprite.position.x += (Math.random() - .5) * .2;
  eyes.position.set(g.x, 2.07, g.z);
  eyes.material.opacity = g.mode === 'chase' && !g.lit ? clamp(1 - gd / 16, 0, 1) : 0;
  if (S.app) {
    apparition.visible = true; apparition.position.set(S.app.x, 1.3, S.app.z);
    appMat.opacity = clamp(1 - S.app.seen / .45, 0, 1) * .9; appMat.color.setScalar(.9);
  } else apparition.visible = false;

  renderer.render(scene, camera);
  drawUI();
}

// gren ve joystick
const grain = document.getElementById('grain'), gctx = grain.getContext('2d');
grain.width = 256; grain.height = 256;
const grainFrames = [];
for (let f = 0; f < 4; f++) { const id = gctx.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } grainFrames.push(id); }
let gf = 0;
function drawUI() {
  gctx.putImageData(grainFrames[(gf++ >> 1) % 4], 0, 0);
  uctx.clearRect(0, 0, ui.width, ui.height);
  if (joy.id !== null) {
    uctx.strokeStyle = 'rgba(255,255,255,.18)'; uctx.lineWidth = 2;
    uctx.beginPath(); uctx.arc(joy.ox, joy.oy, 60, 0, 7); uctx.stroke();
    const mx = joy.x - joy.ox, my = joy.y - joy.oy, m = Math.max(1, Math.hypot(mx, my)), k = Math.min(m, 60) / m;
    uctx.fillStyle = 'rgba(255,255,255,.14)'; uctx.beginPath(); uctx.arc(joy.ox + mx * k, joy.oy + my * k, 26, 0, 7); uctx.fill();
  }
}

// ---------- arayüz ----------
const $ = id => document.getElementById(id);
function hud() {
  $('keys').textContent = S.keysGot;
  $('bat').style.width = S.battery + '%'; $('bat').style.background = S.battery < 20 ? '#c44' : '#d8c070';
  $('sta').style.width = S.player.stam + '%';
}
const scareCv = $('scare'), sctx = scareCv.getContext('2d');
function drawScareFace(c, w, h, t) {
  const s = Math.min(w, h) * (1.05 + t * .6), jx = (Math.random() - .5) * 40, jy = (Math.random() - .5) * 40;
  c.fillStyle = Math.random() < .2 ? '#2a0000' : '#000'; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2 + jx, h / 2 + jy); c.rotate((Math.random() - .5) * .06);
  // saç
  c.fillStyle = '#050303'; c.beginPath(); c.ellipse(0, -s * .05, s * .48, s * .62, 0, 0, 7); c.fill();
  const gr = c.createRadialGradient(0, -s * .12, s * .02, 0, 0, s * .52);
  gr.addColorStop(0, '#d9d6c8'); gr.addColorStop(.5, '#8d8a7e'); gr.addColorStop(.85, '#2c2a25'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = 1 + Math.sin(a * 5 + 1) * .04 + Math.sin(a * 11) * .02; c.lineTo(Math.cos(a) * s * .3 * r, Math.sin(a) * s * .45 * r); }
  c.fill();
  c.fillStyle = '#050303';
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, -s * .48); c.quadraticCurveTo(sx * s * .4, -s * .3, sx * s * .26, s * .5); c.lineTo(sx * s * .17, s * .5); c.quadraticCurveTo(sx * s * .22, -s * .1, 0, -s * .42); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(-s * .16, s * .1, s * .06, s * .15, .3, 0, 7); c.ellipse(s * .16, s * .1, s * .06, s * .15, -.3, 0, 7); c.fill();
  for (const sx of [-1, 1]) {
    const eg = c.createRadialGradient(sx * s * .11, -s * .1, 0, sx * s * .11, -s * .1, s * .12);
    eg.addColorStop(0, '#000'); eg.addColorStop(.6, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = eg; c.beginPath(); c.ellipse(sx * s * .11, -s * .1, s * .09, s * .12, sx * .35, 0, 7); c.fill();
    c.fillStyle = '#ff2a10'; c.shadowColor = '#f00'; c.shadowBlur = 25;
    c.beginPath(); c.arc(sx * s * .11 + (Math.random() - .5) * 4, -s * .07, s * .013, 0, 7); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(110,0,0,.9)'; c.lineWidth = s * .012;
    c.beginPath(); c.moveTo(sx * s * .12, 0); c.bezierCurveTo(sx * s * .13, s * .08, sx * s * .1, s * .14, sx * s * .115, s * .24 + t * s * .1); c.stroke();
  }
  const mh = s * (.22 + Math.sin(t * 40) * .02);
  c.fillStyle = '#050000'; c.beginPath();
  c.moveTo(-s * .1, s * .15); c.quadraticCurveTo(0, s * .1, s * .1, s * .15);
  c.quadraticCurveTo(s * .09, s * .15 + mh, 0, s * .17 + mh); c.quadraticCurveTo(-s * .09, s * .15 + mh, -s * .1, s * .15); c.fill();
  c.fillStyle = '#b8b09a';
  for (let i = 0; i < 6; i++) { const x = -s * .085 + i * s * .03; c.beginPath(); c.moveTo(x, s * .145); c.lineTo(x + s * .015, s * .145); c.lineTo(x + s * .0075, s * .19); c.fill(); }
  c.restore();
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .25})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(120,0,0,.7)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  if (Math.random() < .12) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, 0, w, h); }
}
function jumpscare(done) {
  scareCv.classList.remove('hidden'); scareCv.width = innerWidth; scareCv.height = innerHeight;
  sfx.scream(); if (navigator.vibrate) navigator.vibrate([400, 100, 500]);
  const t0 = performance.now();
  (function frame() {
    const t = (performance.now() - t0) / 1000; drawScareFace(sctx, innerWidth, innerHeight, t);
    if (t < 1.5) requestAnimationFrame(frame); else { scareCv.classList.add('hidden'); done(); }
  })();
}
function finish(win) {
  S.state = win ? 'win' : 'dead';
  $('hud').classList.add('hidden'); runBtn.classList.add('hidden'); msgEl.style.opacity = 0; $('redfx').style.opacity = 0;
  if (document.exitPointerLock) document.exitPointerLock();
  if (drone) drone.gain.value = .02; if (ghostVoice) ghostVoice.gain.value = 0;
  if (TRAILER) return;
  const show = () => {
    $('overTitle').textContent = win ? 'KURTULDUN' : 'YAKALANDIN';
    $('overText').textContent = win ? `Evden ${Math.round(S.t)} saniyede kaçtın. Ama o hâlâ pencereden seni izliyor...` : `${S.keysGot}/3 anahtar buldun. Ev seni bırakmayacak.`;
    $('over').classList.remove('hidden');
  };
  if (win) { sfx.win(); show(); } else jumpscare(show);
}
function start() {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  reset();
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  if ('ontouchstart' in window) runBtn.classList.remove('hidden');
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
  say('Anahtarları bul. Sessiz ol.', 3); hud();
}
$('startBtn').onclick = start; $('againBtn').onclick = start;

addEventListener('resize', resize); resize();
reset();
renderer.compile(scene, camera);
$('loading').classList.add('hidden');

let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!$('menu').classList.contains('hidden')) { S.player.yaw += dt * .15; S.t += dt; for (const b of bulbs) { b.t += dt; } }
  else update(dt);
  if (AC && AC.listener) {
    const L = AC.listener, p = S.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = EYE; L.positionZ.value = p.z; L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(p.x, EYE, p.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
    if (ghostPan) setPos(ghostPan, S.ghost.x, 1.4, S.ghost.z);
  }
  render();
  requestAnimationFrame(loop);
}
window.GAME = { start, update, render, reset, input, drawScareFace, get S() { return S; }, autopilot: false, forceRun: false, stand: false, lockLook: false, target: null };
if (!TRAILER) requestAnimationFrame(loop);
