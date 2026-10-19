// Karanlık Ev - mobil korku oyunu
(() => {
'use strict';

const TS = 48;
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

const params = new URLSearchParams(location.search);
const TRAILER = params.has('trailer');

// ---------- yardımcılar ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wall = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H || MAP[ty][tx] === '#';
const wallAt = (x, y) => wall(Math.floor(x / TS), Math.floor(y / TS));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileOf = e => ({ x: Math.floor(e.x / TS), y: Math.floor(e.y / TS) });
const center = (tx, ty) => ({ x: tx * TS + TS / 2, y: ty * TS + TS / 2 });
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

function bfs(sx, sy, tx, ty) {
  if (wall(tx, ty)) return [];
  const prev = new Int32Array(W * H).fill(-1);
  const q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
  const goal = ty * W + tx;
  while (q.length) {
    const c = q.shift(); if (c === goal) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
      if (!wall(nx, ny) && prev[n] < 0) { prev[n] = c; q.push(n); }
    }
  }
  if (prev[goal] < 0) return [];
  const path = []; let c = goal;
  while (c !== sy * W + sx) { path.push({ x: c % W, y: (c / W) | 0 }); c = prev[c]; }
  return path.reverse();
}

function lineOfSight(a, b) {
  const steps = Math.ceil(dist(a, b) / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (wallAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

// ---------- canvas ----------
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const light = document.createElement('canvas'), lctx = light.getContext('2d');
let VW = 0, VH = 0, DPR = 1, SCALE = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = innerWidth; VH = innerHeight;
  cv.width = light.width = VW * DPR; cv.height = light.height = VH * DPR;
  SCALE = (VH * DPR) / (9.5 * TS);
}
addEventListener('resize', resize); resize();

// harita dokusu bir kere çizilir
const worldCv = document.createElement('canvas');
worldCv.width = W * TS; worldCv.height = H * TS;
(function drawWorld() {
  const g = worldCv.getContext('2d'), r = rng(7);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x * TS, py = y * TS;
    if (MAP[y][x] === '#') {
      g.fillStyle = '#1b1612'; g.fillRect(px, py, TS, TS);
      g.fillStyle = '#231c17';
      for (let i = 0; i < 3; i++) g.fillRect(px + (i % 2) * 8, py + i * 16 + 2, TS - 8, 12);
      if (!wall(x, y + 1)) { g.fillStyle = '#0c0907'; g.fillRect(px, py + TS - 8, TS, 8); }
    } else {
      const s = 40 + r() * 10 | 0;
      g.fillStyle = `rgb(${s + 22},${s + 10},${s - 4})`; g.fillRect(px, py, TS, TS);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(px, py + i * 12 + 1); g.lineTo(px + TS, py + i * 12 + 1); g.stroke(); }
      if (r() < .07) { // kan lekesi
        g.fillStyle = `rgba(${90 + r() * 40 | 0},5,5,.7)`;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(px + 10 + r() * 28, py + 10 + r() * 28, 3 + r() * 9, 0, 7); g.fill(); }
      } else if (r() < .06) { // çatlak
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; g.beginPath();
        let cx = px + r() * TS, cy = py + r() * TS; g.moveTo(cx, cy);
        for (let i = 0; i < 4; i++) { cx += r() * 20 - 10; cy += r() * 20 - 10; g.lineTo(cx, cy); } g.stroke();
      } else if (r() < .05) { // devrik sandalye / kutu
        g.fillStyle = '#2e1f14'; g.fillRect(px + 12, py + 14, 22, 18);
        g.fillStyle = '#3d2a1b'; g.fillRect(px + 14, py + 16, 18, 4);
      }
    }
  }
})();

// ---------- ses ----------
let AC = null, master, noiseBuf, droneGain;
function initAudio() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // uğultu
  droneGain = AC.createGain(); droneGain.gain.value = .05;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
  lp.connect(droneGain); droneGain.connect(master);
  for (const f of [55, 55.7, 82.3]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
}
function env(node, t, a, peak, dec) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(freq, type, peak, dec, delay = 0, slideTo) {
  if (!AC) return; const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dec);
  env(g, t, .005, peak, dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + dec + .05);
}
function noise(peak, dec, fType = 'lowpass', freq = 800, delay = 0) {
  if (!AC) return; const t = AC.currentTime + delay;
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loopStart = Math.random();
  const f = AC.createBiquadFilter(); f.type = fType; f.frequency.value = freq;
  const g = AC.createGain(); env(g, t, .004, peak, dec);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dec + .05);
}
const sfx = {
  step: run => noise(run ? .09 : .05, .08, 'bandpass', 300 + Math.random() * 120),
  heart: v => { tone(58, 'sine', .5 * v + .05, .16); tone(52, 'sine', .4 * v + .04, .18, .2); },
  key: () => { tone(1320, 'sine', .25, .9); tone(1980, 'sine', .12, .7, .05); },
  battery: () => { tone(660, 'square', .06, .12); tone(990, 'square', .06, .15, .1); },
  locked: () => { noise(.3, .1, 'lowpass', 500); noise(.3, .1, 'lowpass', 500, .15); },
  knock: () => { for (let i = 0; i < 3; i++) noise(.35, .12, 'lowpass', 200, i * .28); },
  whisper: () => noise(.08, 1.2, 'bandpass', 2500),
  scream: () => { noise(.9, 1.4, 'highpass', 900); tone(900, 'sawtooth', .5, 1.2, 0, 180); tone(1300, 'square', .25, 1, 0, 300); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 'triangle', .2, 1.2, i * .15)); },
};

// ---------- durum ----------
let S = null;
function reset() {
  const s = { t: 0, keys: [], bats: [], keysGot: 0, battery: 100, state: 'play', msgT: 0,
    heartT: 0, stepT: 0, eventT: 12, flick: 1 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = MAP[y][x], p = center(x, y);
    if (c === 'P') s.player = { ...p, ang: 0, stam: 100, run: false, moving: false };
    if (c === 'G') s.ghost = { ...p, path: [], repath: 0, mode: 'wander', chaseT: 0, wob: 0 };
    if (c === 'K') s.keys.push({ ...p, got: false });
    if (c === 'B') s.bats.push({ ...p, got: false });
    if (c === 'X') s.exit = { ...p };
  }
  S = s;
}

// ---------- girdi ----------
const input = { dx: 0, dy: 0, run: false };
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const keysDown = {};
addEventListener('keydown', e => keysDown[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keysDown[e.key.toLowerCase()] = false);
const runBtn = document.getElementById('runBtn');
runBtn.addEventListener('touchstart', e => { e.preventDefault(); input.run = true; runBtn.classList.add('on'); }, { passive: false });
runBtn.addEventListener('touchend', e => { e.preventDefault(); input.run = false; runBtn.classList.remove('on'); }, { passive: false });
cv.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) if (joy.id === null && t.clientX < VW * .6) { joy.id = t.identifier; joy.ox = joy.x = t.clientX; joy.oy = joy.y = t.clientY; }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.x = t.clientX; joy.y = t.clientY; }
}, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) if (t.identifier === joy.id) joy.id = null; };
cv.addEventListener('touchend', endTouch); cv.addEventListener('touchcancel', endTouch);

function readInput() {
  if (TRAILER) return;
  let dx = 0, dy = 0;
  if (joy.id !== null) {
    const mx = joy.x - joy.ox, my = joy.y - joy.oy, m = Math.hypot(mx, my);
    if (m > 8) { const k = Math.min(1, m / 60); dx = mx / m * k; dy = my / m * k; }
  }
  if (keysDown['a'] || keysDown['arrowleft']) dx -= 1;
  if (keysDown['d'] || keysDown['arrowright']) dx += 1;
  if (keysDown['w'] || keysDown['arrowup']) dy -= 1;
  if (keysDown['s'] || keysDown['arrowdown']) dy += 1;
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  input.dx = dx; input.dy = dy;
  if (keysDown['shift'] !== undefined && !('ontouchstart' in window)) input.run = !!keysDown['shift'];
}

// ---------- mesaj ----------
const msgEl = document.getElementById('msg');
function say(t, dur = 2.5) { msgEl.textContent = t; msgEl.style.opacity = 1; S.msgT = dur; }

// ---------- güncelleme ----------
function moveEnt(e, vx, vy, r) {
  const nx = e.x + vx;
  if (!wallAt(nx - r, e.y - r) && !wallAt(nx + r, e.y - r) && !wallAt(nx - r, e.y + r) && !wallAt(nx + r, e.y + r)) e.x = nx;
  const ny = e.y + vy;
  if (!wallAt(e.x - r, ny - r) && !wallAt(e.x + r, ny - r) && !wallAt(e.x - r, ny + r) && !wallAt(e.x + r, ny + r)) e.y = ny;
}

const LIGHT_RANGE = 380, CONE = .52;
function inCone(p, e) {
  if (S.battery <= 0) return false;
  const d = dist(p, e); if (d > LIGHT_RANGE * lightFactor()) return false;
  return Math.abs(angDiff(p.ang, Math.atan2(e.y - p.y, e.x - p.x))) < CONE && lineOfSight(p, e);
}
const lightFactor = () => S.battery <= 0 ? 0 : .45 + .55 * Math.min(1, S.battery / 40);

function update(dt) {
  if (S.state !== 'play') return;
  S.t += dt;
  const p = S.player, g = S.ghost;
  if (TRAILER && window.GAME.autopilot) autopilot();
  else readInput();

  // oyuncu
  const m = Math.hypot(input.dx, input.dy);
  p.moving = m > .05;
  p.run = input.run && p.moving && p.stam > 1;
  p.stam = clamp(p.stam + (p.run ? -28 : 14) * dt, 0, 100);
  const sp = (p.run ? 3.7 : 2.3) * TS * dt;
  if (p.moving) {
    moveEnt(p, input.dx * sp, input.dy * sp, 13);
    p.ang += angDiff(p.ang, Math.atan2(input.dy, input.dx)) * Math.min(1, dt * 10);
    S.stepT -= dt * m;
    if (S.stepT <= 0) { sfx.step(p.run); S.stepT = p.run ? .28 : .45; }
  }

  // pil
  S.battery = Math.max(0, S.battery - 1.05 * dt);
  S.flick = S.battery < 20 && Math.random() < (20 - S.battery) / 60 ? .15 : 1;
  if (S.battery === 0 && !S.batWarned) { S.batWarned = true; say('Fenerin pili bitti...'); }

  for (const k of S.keys) if (!k.got && dist(p, k) < 26) {
    k.got = true; S.keysGot++; sfx.key();
    say(S.keysGot < 3 ? `Bir anahtar buldun. (${S.keysGot}/3)` : 'Son anahtar! Çıkış kapısını bul.');
  }
  for (const b of S.bats) if (!b.got && dist(p, b) < 26) {
    b.got = true; S.battery = Math.min(100, S.battery + 55); S.batWarned = false; sfx.battery(); say('Pil buldun.');
  }
  if (dist(p, S.exit) < 34) {
    if (S.keysGot >= 3) return finish(true);
    if (S.msgT <= 0) { sfx.locked(); say(`Kapı kilitli. ${3 - S.keysGot} anahtar daha lazım.`); }
  }

  // hayalet
  const d = dist(p, g) / TS;
  const sees = d < 8 && lineOfSight(p, g);
  const hearR = p.run ? 9 : p.moving ? 3.5 : 1.5;
  if (sees || d < hearR) {
    if (g.mode !== 'chase' && d < 9) { sfx.whisper(); }
    g.mode = 'chase'; g.chaseT = 4; g.last = tileOf(p);
  }
  g.repath -= dt;
  if (g.mode === 'chase') {
    g.chaseT -= dt;
    if (sees || d < hearR) g.last = tileOf(p);
    if (g.repath <= 0) { const t = tileOf(g); g.path = bfs(t.x, t.y, g.last.x, g.last.y); g.repath = .3; }
    if (g.chaseT <= 0) { g.mode = 'wander'; g.path = []; }
  } else if (!g.path.length || g.repath < -8) {
    let tx, ty; do { tx = Math.random() * W | 0; ty = Math.random() * H | 0; } while (wall(tx, ty));
    // ara sıra oyuncunun bulunduğu bölgeye doğru dolaşır
    if (Math.random() < .35) { const pt = tileOf(p); tx = clamp(pt.x + (Math.random() * 8 - 4 | 0), 1, W - 2); ty = clamp(pt.y + (Math.random() * 8 - 4 | 0), 1, H - 2); if (wall(tx, ty)) { tx = pt.x; ty = pt.y; } }
    const t = tileOf(g); g.path = bfs(t.x, t.y, tx, ty); g.repath = 0;
  }
  let gs = (g.mode === 'chase' ? 2.5 + S.keysGot * .18 : 1.2) * TS;
  g.lit = inCone(p, g);
  if (g.lit) gs *= .3;
  if (g.path.length) {
    const n = center(g.path[0].x, g.path[0].y), dd = dist(g, n);
    if (dd < 4) g.path.shift();
    else { const k = Math.min(dd, gs * dt) / dd; g.x += (n.x - g.x) * k; g.y += (n.y - g.y) * k; }
  }
  g.wob += dt;
  if (dist(p, g) < 24) return finish(false);

  // kalp atışı
  S.heartT -= dt;
  const near = clamp(1 - d / 10, 0, 1);
  if (S.heartT <= 0 && near > 0) { sfx.heart(near); S.heartT = 1.1 - near * .75; }
  if (droneGain) droneGain.gain.value = .04 + near * .06;

  // rastgele olaylar
  S.eventT -= dt;
  if (S.eventT <= 0) {
    S.eventT = 14 + Math.random() * 16;
    const lines = ['...arkana bakma...', 'Bir yerden kapı vuruluyor.', 'Soğuk bir nefes hissettin.', '...buradayım...', 'Yukarıdan ayak sesleri geliyor.'];
    const l = lines[Math.random() * lines.length | 0];
    if (l.includes('vuruluyor')) sfx.knock(); else sfx.whisper();
    say(l, 3);
  }

  if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) msgEl.style.opacity = 0; }
  hud();
}

// fragman için otomatik pilot
function autopilot() {
  const p = S.player, pt = tileOf(p);
  const left = S.keys.filter(k => !k.got).sort((a, b) => dist(p, a) - dist(p, b));
  const target = left[0] || S.exit;
  const tt = tileOf(target);
  const path = bfs(pt.x, pt.y, tt.x, tt.y);
  const n = path.length ? center(path[0].x, path[0].y) : target;
  const dx = n.x - p.x, dy = n.y - p.y, m = Math.hypot(dx, dy) || 1;
  input.dx = dx / m; input.dy = dy / m;
  input.run = window.GAME.forceRun || dist(p, S.ghost) < TS * 4;
}

// ---------- çizim ----------
function rays(cx, cy, a0, a1, range, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, ca = Math.cos(a), sa = Math.sin(a);
    let r = 0;
    while (r < range) { r += 6; if (wallAt(cx + ca * r, cy + sa * r)) { r += 10; break; } }
    pts.push([cx + ca * Math.min(r, range), cy + sa * Math.min(r, range)]);
  }
  return pts;
}

function render() {
  const p = S.player, g = S.ghost;
  const sw = cv.width, sh = cv.height;
  let shake = 0;
  const camX = p.x - sw / 2 / SCALE, camY = p.y - sh / 2 / SCALE;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, sw, sh);
  const near = clamp(1 - dist(p, g) / TS / 6, 0, 1);
  if (g.mode === 'chase') shake = near * 3;
  ctx.setTransform(SCALE, 0, 0, SCALE, -camX * SCALE + (Math.random() - .5) * shake, -camY * SCALE + (Math.random() - .5) * shake);
  ctx.drawImage(worldCv, 0, 0);

  // çıkış kapısı
  const ex = S.exit;
  ctx.fillStyle = S.keysGot >= 3 ? '#4a2a10' : '#3a0c0c';
  ctx.fillRect(ex.x - 18, ex.y - 22, 36, 44);
  ctx.strokeStyle = '#120404'; ctx.lineWidth = 3; ctx.strokeRect(ex.x - 18, ex.y - 22, 36, 44);
  ctx.fillStyle = '#c9a040'; ctx.beginPath(); ctx.arc(ex.x + 10, ex.y, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#d0c8b0'; ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center'; ctx.fillText('ÇIKIŞ', ex.x, ex.y - 26);

  for (const k of S.keys) if (!k.got) drawKey(k.x, k.y);
  for (const b of S.bats) if (!b.got) {
    ctx.fillStyle = '#2a6a2a'; ctx.fillRect(b.x - 10, b.y - 6, 20, 12);
    ctx.fillStyle = '#9c9'; ctx.fillRect(b.x + 10, b.y - 3, 3, 6); ctx.fillRect(b.x - 8, b.y - 4, 8, 8);
  }

  drawGhost(g);
  drawPlayer(p);

  // ışık
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = 'rgba(0,0,0,.985)'; lctx.fillRect(0, 0, sw, sh);
  lctx.setTransform(SCALE, 0, 0, SCALE, -camX * SCALE, -camY * SCALE);
  lctx.globalCompositeOperation = 'destination-out';
  const amb = 95;
  let grd = lctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, amb);
  grd.addColorStop(0, 'rgba(0,0,0,.85)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = grd; poly(lctx, rays(p.x, p.y, 0, Math.PI * 2, amb, 40)); lctx.fill();
  const lf = lightFactor() * S.flick;
  if (lf > 0) {
    const R = LIGHT_RANGE * lf;
    grd = lctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, R);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(.6, 'rgba(0,0,0,.95)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grd;
    const pts = rays(p.x, p.y, p.ang - CONE, p.ang + CONE, R, 60); pts.unshift([p.x, p.y]);
    poly(lctx, pts); lctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(light, 0, 0);
  // ışık rengi
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,200,120,.08)'; ctx.fillRect(0, 0, sw, sh);
  ctx.globalCompositeOperation = 'source-over';

  // karanlığın üstünde: parıldayan anahtarlar ve kırmızı gözler
  ctx.setTransform(SCALE, 0, 0, SCALE, -camX * SCALE, -camY * SCALE);
  for (const k of S.keys) if (!k.got && dist(p, k) < TS * 6) {
    ctx.fillStyle = `rgba(255,220,120,${.25 + .25 * Math.sin(S.t * 4 + k.x)})`;
    ctx.beginPath(); ctx.arc(k.x, k.y, 2.5, 0, 7); ctx.fill();
  }
  if (g.mode === 'chase' && !g.lit) {
    const a = clamp(1 - dist(p, g) / (TS * 9), 0, 1) * .9;
    ctx.fillStyle = `rgba(255,20,20,${a})`; ctx.shadowColor = '#f00'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(g.x - 6, g.y - 14, 2.5, 0, 7); ctx.arc(g.x + 6, g.y - 14, 2.5, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // vinyet + gren
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(sw / 2, sh / 2, sh * .3, sw / 2, sh / 2, sw * .7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(${20 + near * 130 | 0},0,0,${.6 + near * .25})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, sw, sh);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; ctx.fillRect(Math.random() * sw, Math.random() * sh, 2, 2); }

  // joystick
  if (joy.id !== null) {
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2 * DPR;
    ctx.beginPath(); ctx.arc(joy.ox * DPR, joy.oy * DPR, 60 * DPR, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    const mx = joy.x - joy.ox, my = joy.y - joy.oy, m = Math.max(1, Math.hypot(mx, my)), k = Math.min(m, 60) / m;
    ctx.beginPath(); ctx.arc((joy.ox + mx * k) * DPR, (joy.oy + my * k) * DPR, 26 * DPR, 0, 7); ctx.fill();
  }
}

function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }

function drawKey(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.5);
  ctx.strokeStyle = '#d8b040'; ctx.fillStyle = '#d8b040'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(-8, 0, 5, 0, 7); ctx.stroke();
  ctx.fillRect(-3, -1.5, 16, 3); ctx.fillRect(9, 0, 3, 6); ctx.fillRect(4, 0, 3, 5);
  ctx.restore();
}

function drawPlayer(p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
  ctx.fillStyle = '#2b2b33'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c9a98a'; ctx.beginPath(); ctx.arc(2, 0, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(0, 0, 7, Math.PI * .6, Math.PI * 1.4); ctx.fill();
  ctx.fillStyle = '#555'; ctx.fillRect(8, 6, 12, 4);
  ctx.restore();
}

function drawGhost(g) {
  const w = Math.sin(g.wob * 3) * 3;
  ctx.save(); ctx.translate(g.x, g.y + w); ctx.scale(1.45, 1.45); ctx.globalAlpha = .9;
  const gr = ctx.createRadialGradient(0, -8, 2, 0, -4, 30);
  gr.addColorStop(0, '#f2f0ea'); gr.addColorStop(.7, '#a8a8a0'); gr.addColorStop(1, 'rgba(120,120,120,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(-16, 18);
  ctx.quadraticCurveTo(-20, -28, 0, -30); ctx.quadraticCurveTo(20, -28, 16, 18);
  for (let i = 0; i < 4; i++) ctx.lineTo(16 - (i + .5) * 8, 10 + (i % 2) * 10 + Math.sin(g.wob * 6 + i) * 2);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(-6, -14, 4, 6, 0, 0, 7); ctx.ellipse(6, -14, 4, 6, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 8 + Math.sin(g.wob * 2) * 2, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- arayüz ----------
const $ = id => document.getElementById(id);
function hud() {
  $('keys').textContent = S.keysGot;
  $('bat').style.width = S.battery + '%';
  $('bat').style.background = S.battery < 20 ? '#c44' : '#d8c070';
  $('sta').style.width = S.player.stam + '%';
}

const scareCv = $('scare'), sctx = scareCv.getContext('2d');
function jumpscare(done) {
  scareCv.classList.remove('hidden');
  scareCv.width = VW; scareCv.height = VH;
  sfx.scream();
  if (navigator.vibrate) navigator.vibrate([400, 100, 500]);
  const t0 = performance.now();
  (function frame() {
    const t = (performance.now() - t0) / 1000;
    drawScareFace(sctx, VW, VH, t);
    if (t < 1.4) requestAnimationFrame(frame); else { scareCv.classList.add('hidden'); done(); }
  })();
}
function drawScareFace(c, w, h, t) {
  const s = Math.min(w, h) * (1.05 + t * .6), jx = (Math.random() - .5) * 40, jy = (Math.random() - .5) * 40;
  c.fillStyle = Math.random() < .2 ? '#2a0000' : '#000'; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2 + jx, h / 2 + jy); c.rotate((Math.random() - .5) * .06);
  // çarpık kafa
  const gr = c.createRadialGradient(0, -s * .12, s * .02, 0, 0, s * .52);
  gr.addColorStop(0, '#d9d6c8'); gr.addColorStop(.5, '#8d8a7e'); gr.addColorStop(.85, '#2c2a25'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = 1 + Math.sin(a * 5 + 1) * .04 + Math.sin(a * 11) * .02;
    c.lineTo(Math.cos(a) * s * .34 * r, Math.sin(a) * s * .5 * r); }
  c.fill();
  // çökük yanaklar
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(-s * .2, s * .1, s * .07, s * .16, .3, 0, 7); c.ellipse(s * .2, s * .1, s * .07, s * .16, -.3, 0, 7); c.fill();
  // oyuk gözler
  for (const sx of [-1, 1]) {
    const eg = c.createRadialGradient(sx * s * .13, -s * .1, 0, sx * s * .13, -s * .1, s * .13);
    eg.addColorStop(0, '#000'); eg.addColorStop(.6, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = eg; c.beginPath(); c.ellipse(sx * s * .13, -s * .1, s * .1, s * .13, sx * .35, 0, 7); c.fill();
    c.fillStyle = '#ff2a10'; c.shadowColor = '#f00'; c.shadowBlur = 25;
    c.beginPath(); c.arc(sx * s * .13 + (Math.random() - .5) * 4, -s * .07, s * .014, 0, 7); c.fill(); c.shadowBlur = 0;
    // kan gözyaşı
    c.strokeStyle = 'rgba(110,0,0,.9)'; c.lineWidth = s * .012;
    c.beginPath(); c.moveTo(sx * s * .14, -s * .0); c.bezierCurveTo(sx * s * .15, s * .08, sx * s * .12, s * .14, sx * s * .135, s * .24 + t * s * .1); c.stroke();
  }
  // yırtık ağız ve dişler
  const mh = s * (.22 + Math.sin(t * 40) * .02);
  c.fillStyle = '#050000'; c.beginPath();
  c.moveTo(-s * .12, s * .16); c.quadraticCurveTo(0, s * .1, s * .12, s * .16);
  c.quadraticCurveTo(s * .1, s * .16 + mh, 0, s * .18 + mh); c.quadraticCurveTo(-s * .1, s * .16 + mh, -s * .12, s * .16); c.fill();
  c.fillStyle = '#b8b09a';
  for (let i = 0; i < 7; i++) { const x = -s * .1 + i * s * .033; c.beginPath(); c.moveTo(x, s * .155); c.lineTo(x + s * .016, s * .155); c.lineTo(x + s * .008, s * .2); c.fill(); }
  // çatlaklar
  c.strokeStyle = 'rgba(30,20,15,.8)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-s * .05, -s * .45); c.lineTo(-s * .02, -s * .32); c.lineTo(-s * .06, -s * .25); c.lineTo(-s * .01, -s * .2); c.stroke();
  c.restore();
  // gren ve kırmızı kenar
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .25})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(120,0,0,.7)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  if (Math.random() < .12) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, 0, w, h); }
}

function finish(win) {
  S.state = win ? 'win' : 'dead';
  $('hud').classList.add('hidden'); runBtn.classList.add('hidden'); msgEl.style.opacity = 0;
  if (droneGain) droneGain.gain.value = .02;
  const show = () => {
    $('overTitle').textContent = win ? 'KURTULDUN' : 'YAKALANDIN';
    $('overText').textContent = win ? `Evden ${Math.round(S.t)} saniyede kaçtın. Ama arkandan bir şey seni izliyor...` : `${S.keysGot}/3 anahtar buldun. Ev seni bırakmayacak.`;
    $('over').classList.remove('hidden');
  };
  if (TRAILER) return;
  if (win) { sfx.win(); show(); } else jumpscare(show);
}

function start() {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  reset();
  $('menu').classList.add('hidden'); $('over').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if ('ontouchstart' in window) runBtn.classList.remove('hidden');
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
  say('Anahtarları bul. Sessiz ol.', 3);
  hud();
}
$('startBtn').onclick = start;
$('againBtn').onclick = start;

reset();
let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!$('menu').classList.contains('hidden')) { S.player.ang += dt * .3; render(); }
  else { update(dt); render(); }
  requestAnimationFrame(loop);
}

window.GAME = { start, update, render, reset, input, drawScareFace, get S() { return S; }, autopilot: false, forceRun: false, TS };
if (!TRAILER) requestAnimationFrame(loop);
})();
