// --- Paramètres ---
const COLS = 100;
const ROWS = 100;               // 10 000 carrés
const N = COLS * ROWS;
const FADE_MS = 5000;           // durée (réelle) de l'apparition d'un carré
const GAP = 0;                  // 0 = aplat parfait à la fin, 1-2 = grille visible
const FILL_SCREEN = true;       // true : couvre tout l'écran / false : grille entière
const GRID_SCALE = 2;            // surface de la grille en multiples de la fenêtre
const BATCH = 1000;
const FADE_CAP = 800;
const BACKGROUND_COLOR = '#FFFAD3';
const SQUARE_COLOR = '#FFCCB8';

// Paramètres d'URL :
//   (rien)      -> heure réelle, reset à minuit
//   ?speed=600  -> journée accélérée x600 (24h en 2 min 24 s), départ à vide
//   ?p=0.5      -> départ à 50 % de la journée (combinable avec speed)
const params = new URLSearchParams(location.search);
const SPEED = parseFloat(params.get('speed')) || 1;
const P0 = params.has('p') ? parseFloat(params.get('p')) : null;
const SIM = params.has('speed') || params.has('p');

let times = [], order = [];
let committed = 0;
let dayKey = '', dayStart = 0, dayLen = 0, hueDay = 0;
let pg, cell, offX, offY, worldWidth, worldHeight;
let viewX = 0, viewY = 0;
let dragging = false, dragStartX = 0, dragStartY = 0;
let viewStartX = 0, viewStartY = 0;
let displayedCount = -1;
let displayedTime = '';
let loadT = Date.now();

function getElement(selector) {
  return document.querySelector(selector);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getDayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function initDay() {
  const now = new Date();
  dayKey = getDayKey(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  dayStart = start.getTime();
  dayLen = end.getTime() - dayStart;

  const rng = mulberry32(hashString(dayKey));
  hueDay = rng() * 360;

  times = new Array(N);
  for (let i = 0; i < N; i++) times[i] = rng() * dayLen;
  order = Array.from({ length: N }, (_, i) => i).sort((a, b) => times[a] - times[b]);

  resetBuffer();
}

function computeLayout() {
  cell = (FILL_SCREEN ? max(width / COLS, height / ROWS)
                      : min(width / COLS, height / ROWS)) * GRID_SCALE;
  worldWidth = max(width, cell * COLS);
  worldHeight = max(height, cell * ROWS);
  offX = (worldWidth - cell * COLS) / 2;
  offY = (worldHeight - cell * ROWS) / 2;
  clampView();
}

function resetBuffer() {
  computeLayout();
  if (pg) pg.remove();
  pg = createGraphics(worldWidth, worldHeight);
  pg.pixelDensity(1);
  pg.colorMode(RGB, 255, 255, 255, 255);
  pg.noStroke();
  pg.fill(SQUARE_COLOR);
  committed = 0;
}

function clampView() {
  viewX = constrain(viewX, 0, max(0, worldWidth - width));
  viewY = constrain(viewY, 0, max(0, worldHeight - height));
}

function drawCell(g, idx, offsetX = 0, offsetY = 0) {
  const x = offX + (idx % COLS) * cell - offsetX;
  const y = offY + floor(idx / COLS) * cell - offsetY;
  const s = cell - GAP + (GAP === 0 ? 0.5 : 0);
  g.rect(x, y, s, s);
}

// Temps virtuel écoulé dans la journée (ms)
function getElapsed() {
  if (!SIM) return Date.now() - dayStart;
  const base = (P0 !== null ? P0 : 0) * dayLen;
  return base + (Date.now() - loadT) * SPEED;
}

function getClickCount(elapsed) {
  let low = 0;
  let high = N;

  while (low < high) {
    const middle = floor((low + high) / 2);
    if (times[order[middle]] <= elapsed) low = middle + 1;
    else high = middle;
  }

  return low;
}

function updateCounters(elapsed) {
  const countElement = getElement('#clickCount, #clickcount');
  const timeElement = getElement('#heure');
  const clickCount = getClickCount(elapsed);
  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  if (countElement && clickCount !== displayedCount) {
    countElement.textContent = `Nombre de clics : ${clickCount}`;
    displayedCount = clickCount;
  }

  if (timeElement && currentTime !== displayedTime) {
    timeElement.textContent = currentTime;
    displayedTime = currentTime;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(RGB, 255, 255, 255, 255);
  noStroke();
  initDay();
}

function draw() {
  if (!SIM && getDayKey(new Date()) !== dayKey) initDay();   // reset à minuit

  const elapsed = getElapsed();
  updateCounters(elapsed);
  if (SIM && elapsed > dayLen) {                             // en simulation : on reboucle
    loadT = Date.now();
    resetBuffer();
    updateCounters(0);
    return;
  }

  // 1. Carrés dont l'apparition est terminée -> buffer
  let n = 0;
  while (committed < N && n < BATCH &&
         (elapsed - times[order[committed]]) / SPEED >= FADE_MS) {
    drawCell(pg, order[committed]);
    committed++;
    n++;
  }

  // 2. Fond vide + buffer
  background(BACKGROUND_COLOR);
  image(pg, -viewX, -viewY);

  // 3. Carrés en train d'apparaître : clairs -> saturés
  let k = committed, drawn = 0;
  while (k < N && drawn < FADE_CAP) {
    const idx = order[k];
    const age = (elapsed - times[idx]) / SPEED;              // ms réelles
    if (age < 0) break;
    const t = min(age / FADE_MS, 1);
    const ease = 1 - pow(1 - t, 3);
    const squareColor = color(SQUARE_COLOR);
    squareColor.setAlpha(min(t * 4, 1) * 255);
    fill(squareColor);
    drawCell(window, idx, viewX, viewY);
    k++;
    drawn++;
  }

  filter(BLUR, 10); //FLOU !!!!!!
}

function mousePressed() {
  dragging = true;
  dragStartX = mouseX;
  dragStartY = mouseY;
  viewStartX = viewX;
  viewStartY = viewY;
  return false;
}

function mouseDragged() {
  if (!dragging) return false;
  viewX = viewStartX - (mouseX - dragStartX);
  viewY = viewStartY - (mouseY - dragStartY);
  clampView();
  return false;
}

function mouseReleased() {
  dragging = false;
  return false;
}

function touchStarted() {
  return mousePressed();
}

function touchMoved() {
  return mouseDragged();
}

function touchEnded() {
  return mouseReleased();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetBuffer();
}