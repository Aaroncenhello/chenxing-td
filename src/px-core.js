
// ================= 像素画面：原生 640×360，角色用 Scale2x 放大 =================
const T = 40, PW = COLS * T, PHt = ROWS * T, PLAT = 6;
const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
const tx = document.getElementById("tx"), tctx = tx.getContext("2d");
cv.width = PW; cv.height = PHt;
const mapCv = document.createElement("canvas"); mapCv.width = PW; mapCv.height = PHt;
const mctx = mapCv.getContext("2d");
let DPR = 1, mapFor = -1;
const mapKey = () => (S ? S.stage + ":" + ST.theme + ":" + (S.seed || 0) + ":" + (S.gen ? 1 : 0) : -1);
const OUT = "#1c1424";

function resize() {
  const stage = document.querySelector(".stage");
  let w = (stage && stage.clientWidth) || 960, k = w / PW;
  // 沉浸全屏：在整个窗口里等比缩放。横屏左右留出按钮的位置；竖屏宽度撑满，高度给顶栏和下面的按钮区留位置（布局见 CSS 的 orientation:portrait）
  const imm = document.body.classList.contains("imm"), port = imm && window.matchMedia("(orientation: portrait)").matches;
  if (imm) {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (port) {
      const cs = getComputedStyle(stage), hOf = sel => (document.querySelector(sel) || {}).offsetHeight || 0;
      const padH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const room = vh - padV - hOf(".hud-top") - hOf(".hud-l") - hOf(".hud-r") - 3 * 8 - 16;
      k = Math.min((vw - padH) / PW, Math.max(0.2, room / PHt));
    } else k = Math.min(vw / PW, vh / PHt);
  }
  const scr = document.getElementById("screen");
  scr.style.width = Math.floor(PW * k) + "px"; scr.style.height = Math.floor(PHt * k) + "px";
  // 竖屏时提示（新敌人、遗物……）放在战场正下方，不挡战场也不挡按钮
  // 竖屏时提示（新敌人、遗物……）弹在按钮区正上方，盖住的是信息区最下面的卡牌行，不挡战场和按钮
  if (port) { const hl = document.querySelector(".hud-l"); document.body.style.setProperty("--toast-bottom", Math.round(window.innerHeight - (hl ? hl.getBoundingClientRect().top : window.innerHeight * 0.6) + 6) + "px"); }
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  tx.width = Math.round(PW * k * DPR); tx.height = Math.round(PHt * k * DPR);
  if (S && mapFor !== mapKey()) { drawMap(); mapFor = mapKey(); }
  for (const D of UNITS) drawPortrait(D);
}

// ---------- 像素工具 ----------
const R0 = Math.round;
function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(R0(x), R0(y), w, h); }
function dot(g, x, y, c) { g.fillStyle = c; g.fillRect(R0(x), R0(y), 1, 1); }
function line(g, x0, y0, x1, y1, c, w) {
  x0 = R0(x0); y0 = R0(y0); x1 = R0(x1); y1 = R0(y1); w = w || 1;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; g.fillStyle = c;
  for (;;) {
    g.fillRect(x0, y0, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = c; cx = R0(cx); cy = R0(cy); r = R0(r);
  for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); g.fillRect(cx - hw, cy + y, hw * 2 + 1, 1); }
}
function ring(g, cx, cy, rx, ry, c, dotted) {
  const n = Math.max(16, Math.round((rx + ry) * 3)); g.fillStyle = c;
  for (let i = 0; i < n; i++) {
    if (dotted && i % 3 === 2) continue;
    const a = i / n * Math.PI * 2; g.fillRect(R0(cx + Math.cos(a) * rx), R0(cy + Math.sin(a) * ry), 1, 1);
  }
}
function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

// ASCII 像素图 → 小画布（缓存）
const SPR = new Map();
function sprite(key, rows, pal, white, outline) {
  const k = key + (white ? "#w" : "") + (outline ? "#" + outline : "");
  let c = SPR.get(k); if (c) return c;
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]; if (ch === ".") continue;
      const col = white ? "#ffffff" : ch === "K" && outline ? outline : pal[ch]; if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  });
  SPR.set(k, c); return c;
}

// Scale2x：把 1 倍像素图放大 2 倍，同时把斜边修圆滑
function scale2x(src) {
  const w = src.width, h = src.height;
  const s = new Uint32Array(src.getContext("2d").getImageData(0, 0, w, h).data.buffer);
  const W2 = w * 2, out = new ImageData(W2, h * 2), o = new Uint32Array(out.data.buffer);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const E = s[y * w + x], B = y > 0 ? s[(y - 1) * w + x] : E, H = y < h - 1 ? s[(y + 1) * w + x] : E;
    const D = x > 0 ? s[y * w + x - 1] : E, F = x < w - 1 ? s[y * w + x + 1] : E;
    let e0 = E, e1 = E, e2 = E, e3 = E;
    if (B !== H && D !== F) { if (D === B) e0 = D; if (B === F) e1 = F; if (D === H) e2 = D; if (H === F) e3 = F; }
    const i = y * 2 * W2 + x * 2; o[i] = e0; o[i + 1] = e1; o[i + W2] = e2; o[i + W2 + 1] = e3;
  }
  const c = document.createElement("canvas"); c.width = W2; c.height = h * 2;
  c.getContext("2d").putImageData(out, 0, 0); return c;
}
const BIG = new Map();
function cached2x(key, draw, w, h) {
  let c = BIG.get(key); if (c) return c;
  if (BIG.size > 900) BIG.clear();
  const b = document.createElement("canvas"); b.width = w; b.height = h;
  draw(b.getContext("2d")); c = scale2x(b); BIG.set(key, c); return c;
}

// ---------- 主题配色 ----------
const THEMES = {
  forest: { g: ["#3f7f45", "#357239", "#4c9150", "#5aa257"], blade: "#6cb85e", wall: ["#2e6536", "#285a30"],
    path: ["#b38a5a", "#a37a4c", "#c49a68", "#9a7045"], edge: "#6e4c2e", tuft: "#4c9150",
    st: { top: "#b4ab98", hi: "#dcd4c2", hi2: "#ccc3b0", lo: "#948b7a", lo2: "#9c9382", fr: "#7a7064", frLo: "#5f574c", seam: "#5c544a", out: "#3a3430" },
    moss: ["#5f9a4a", "#7cb85a", "#4c8440"], flowers: ["#f0e060", "#f08aa0", "#ffffff", "#a8c8ff"], prop: "tree", bg: "#16241a" },
  snow: { g: ["#e4ecf4", "#d4e0ec", "#f2f6fa", "#c4d4e4"], blade: "#ffffff", wall: ["#cddbe8", "#bccbdb"],
    path: ["#a89a88", "#98897a", "#bcae9a", "#8a7c6c"], edge: "#6e6254", tuft: "#ffffff",
    st: { top: "#a8b6c4", hi: "#e8f2fc", hi2: "#d0dcea", lo: "#8494a6", lo2: "#8e9eb0", fr: "#6a788a", frLo: "#505c6c", seam: "#4a5462", out: "#2c3440" },
    moss: ["#ffffff", "#e8f4ff", "#c8dcf0"], flowers: ["#bfe8ff", "#ffffff"], prop: "pine", bg: "#1a2230" },
  lava: { g: ["#3a2a2a", "#302222", "#453030", "#2a1c1c"], blade: "#5a3a34", wall: ["#241616", "#2c1a1a"],
    path: ["#6a5a50", "#5a4a42", "#7a6a60", "#50403a"], edge: "#2a1a14", tuft: "#4a3a34",
    st: { top: "#4e4652", hi: "#7a7080", hi2: "#665e6c", lo: "#38303c", lo2: "#403844", fr: "#2e2632", frLo: "#221c26", seam: "#ff5a2a", out: "#140e16" },
    moss: ["#ff6a2a", "#ffb040", "#c83a1a"], flowers: ["#ff7a3a"], prop: "spire", bg: "#1a0e0e" },
  grave: { g: ["#2c3430", "#26302c", "#343e38", "#222a26"], blade: "#4a5a48", wall: ["#1e2622", "#222c28"],
    path: ["#5e5a52", "#52504a", "#6c6860", "#48443e"], edge: "#2a2622", tuft: "#3e4c3c",
    st: { top: "#7a7c88", hi: "#a8aab8", hi2: "#9294a2", lo: "#5c5e6a", lo2: "#646672", fr: "#4c4e5a", frLo: "#3a3c46", seam: "#2e3038", out: "#16161c" },
    moss: ["#4a6a4a", "#6a8a5a", "#3a5a3a"], flowers: ["#b070ff", "#80f0c0"], prop: "grave", bg: "#121614" },
  desert: { g: ["#e0c080", "#d4b070", "#ecd092", "#c8a262"], blade: "#b89050", wall: ["#caa46a", "#be9860"],
    path: ["#b09a78", "#a08a6a", "#c2ac8a", "#8e7a5c"], edge: "#7a6040", tuft: "#d8b878",
    st: { top: "#d8b888", hi: "#f2dcac", hi2: "#e4c898", lo: "#b89868", lo2: "#c2a272", fr: "#a08058", frLo: "#806040", seam: "#6a5030", out: "#3a2c1c" },
    moss: ["#8ab050", "#a8c860", "#6a9040"], flowers: ["#f0a0c0", "#ffe070"], prop: "cactus", bg: "#2a2014",
    liquid: { base: "#2a8ab8", d: "#2680b0", l: "#48a8d0", wave: "#78c8e8", shore: "#e8d09a", dk: "#1a6090", foam: "#b8e8f8" } },
  sky: { g: ["#6aa05a", "#5c9250", "#78b068", "#4e8446"], blade: "#8ac870", wall: ["#5c9250", "#528a4a"],
    path: ["#cfc4ae", "#bfb49e", "#ded4c0", "#aca08a"], edge: "#7a6a58", tuft: "#8ac870",
    st: { top: "#d8dce8", hi: "#f6f8fe", hi2: "#e6e8f2", lo: "#b0b6c8", lo2: "#bcc2d2", fr: "#9aa0b4", frLo: "#7a8096", seam: "#6a7088", out: "#2c3040" },
    moss: ["#8ac870", "#a8e088", "#6aa858"], flowers: ["#ffffff", "#ffe070", "#a8c8ff"], prop: "tree", bg: "#6aaee0" },
  cave: { g: ["#3a3848", "#34323f", "#42404f", "#2e2c38"], blade: "#4a4858", wall: ["#26242e", "#2c2a36"],
    path: ["#5e5a6c", "#524e60", "#6c687a", "#484454"], edge: "#1e1c26", tuft: "#6a6484",
    st: { top: "#6a6888", hi: "#9a98b8", hi2: "#84829e", lo: "#4e4c68", lo2: "#56546e", fr: "#403e58", frLo: "#302e44", seam: "#7af0e0", out: "#14121c" },
    moss: ["#7af0e0", "#c0a0ff", "#50c8d8"], flowers: ["#7af0e0", "#e0a0ff"], prop: "crystal", bg: "#0e0c14",
    liquid: { base: "#163656", d: "#12304c", l: "#22507a", wave: "#48a0c8", shore: "#4a4858", dk: "#0c2036", foam: "#7af0e0" } },
  abyss: { g: ["#2a1a30", "#24162a", "#321e38", "#1e1224"], blade: "#4a2a50", wall: ["#1a1020", "#20142a"],
    path: ["#4c3c50", "#403246", "#5a4862", "#362a3a"], edge: "#140a18", tuft: "#6a3a7a",
    st: { top: "#3e3448", hi: "#6a5a7a", hi2: "#54486a", lo: "#2a2234", lo2: "#322a3c", fr: "#221a2a", frLo: "#18121e", seam: "#b070ff", out: "#0a060e" },
    moss: ["#b070ff", "#ff5a9a", "#7a3ac8"], flowers: ["#b070ff", "#ff5a9a"], prop: "abyss", bg: "#0a060e" },
  ice: { g: ["#c8dcec", "#b8cee2", "#dceaf6", "#a8c0d8"], blade: "#eaf4ff", wall: ["#8fa8c4", "#7e97b4"],
    path: ["#9fb4c8", "#8ea3b8", "#b2c6d8", "#7e93a8"], edge: "#5a6e86", tuft: "#eaf4ff",
    st: { top: "#a8c0d8", hi: "#eef8ff", hi2: "#d0e2f2", lo: "#7e96b0", lo2: "#8aa2bc", fr: "#64809c", frLo: "#4a6480", seam: "#8fe0f0", out: "#243448" },
    moss: ["#8fe0f0", "#dff8ff", "#5aa8c8"], flowers: ["#bfe8ff", "#ffffff", "#8fd8f0"], prop: "ice", bg: "#16202e" },
  mech: { g: ["#3e4048", "#36383f", "#484a54", "#303239"], blade: "#5a5c66", wall: ["#282a32", "#2e303a"],
    path: ["#5c5e68", "#50525c", "#6a6c78", "#464852"], edge: "#22242a", tuft: "#6a6c78",
    st: { top: "#6a6c78", hi: "#9a9cac", hi2: "#82849a", lo: "#4a4c58", lo2: "#54566a", fr: "#3a3c48", frLo: "#2a2c36", seam: "#ffb040", out: "#141620" },
    moss: ["#ffb040", "#ffe060", "#c86a10"], flowers: ["#ffb040", "#8ad0f0"], prop: "mech", bg: "#0e1016" },
  blood: { g: ["#48282f", "#3e2229", "#543038", "#361d24"], blade: "#5a2a34", wall: ["#241016", "#2c141c"],
    path: ["#6e464c", "#603c42", "#7c5258", "#563439"], edge: "#2a1014", tuft: "#6a2a34",
    st: { top: "#54343c", hi: "#8a5a62", hi2: "#6e444c", lo: "#3a2028", lo2: "#442830", fr: "#2e181e", frLo: "#221216", seam: "#ff4a5a", out: "#14080c" },
    moss: ["#e04a4a", "#ff8a7a", "#a02030"], flowers: ["#ff6a7a", "#ffd0c0"], prop: "blood", bg: "#180a10" },
  star: { g: ["#2e3462", "#282e56", "#383f72", "#232848"], blade: "#525c96", wall: ["#181d40", "#1e2448"],
    path: ["#4a5286", "#424a78", "#586096", "#3a4270"], edge: "#141936", tuft: "#7a86c8",
    st: { top: "#4a5286", hi: "#98a4e0", hi2: "#727cba", lo: "#333a68", lo2: "#3d4474", fr: "#262c54", frLo: "#1c2142", seam: "#a0b8ff", out: "#0d1026" },
    moss: ["#a0b8ff", "#c890ff", "#60d8f0"], flowers: ["#ffffff", "#a0b8ff", "#c890ff"], prop: "star", bg: "#0b0f24" },
  ash: { g: ["#4a4844", "#42403c", "#54524e", "#3a3835"], blade: "#6a6660", wall: ["#2e2c2a", "#363432"],
    path: ["#7a746c", "#6c6660", "#8a847a", "#605a54"], edge: "#2a2624", tuft: "#8a847a",
    st: { top: "#8a867e", hi: "#c4c0b6", hi2: "#a8a49a", lo: "#66625c", lo2: "#726e66", fr: "#524e48", frLo: "#3e3a36", seam: "#ff8a3a", out: "#1a1816" },
    moss: ["#c4c0b6", "#ff8a3a", "#8a867e"], flowers: ["#ffb060", "#e8e4dc"], prop: "spire", bg: "#12100e" },
  ruin: { g: ["#5a5a52", "#52524a", "#66665c", "#4a4a44"], blade: "#7a7a6e", wall: ["#3a3a34", "#42423c"],
    path: ["#8a8a7e", "#7c7c70", "#9a9a8c", "#6e6e64"], edge: "#34342e", tuft: "#7a8a6a",
    st: { top: "#9a9a8c", hi: "#dcdcc8", hi2: "#bcbcac", lo: "#76766a", lo2: "#828276", fr: "#5e5e54", frLo: "#48483f", seam: "#ffe060", out: "#22221e" },
    moss: ["#6a8a4a", "#8ab060", "#ffe060"], flowers: ["#ffe060", "#ffffff", "#a8c8ff"], prop: "grave", bg: "#1a1a16" },
  storm: { g: ["#2e3446", "#282e3e", "#383f52", "#232838"], blade: "#4a5468", wall: ["#181d28", "#1e2432"],
    path: ["#48506a", "#404860", "#565e7a", "#384058"], edge: "#141828", tuft: "#6a78a8",
    st: { top: "#4a5470", hi: "#9aaad8", hi2: "#7280b0", lo: "#343c56", lo2: "#3e4662", fr: "#282e44", frLo: "#1c2234", seam: "#a0d8ff", out: "#0c1020" },
    moss: ["#a0d8ff", "#ffe040", "#6a90d8"], flowers: ["#a0d8ff", "#ffffff"], prop: "star", bg: "#0a0e1a" },
  dawn: { g: ["#c8b488", "#bca87c", "#d8c498", "#ac9870"], blade: "#e0d0a0", wall: ["#9a8660", "#a8946c"],
    path: ["#e8dcb8", "#dcd0ac", "#f4e8c8", "#cec2a0"], edge: "#8a7650", tuft: "#f0e0b0",
    st: { top: "#f0e4c0", hi: "#fffbe8", hi2: "#f8ecd0", lo: "#d0c49c", lo2: "#dcd0a8", fr: "#b0a480", frLo: "#8e8262", seam: "#ffd040", out: "#463a26" },
    moss: ["#ffe060", "#ffffff", "#ffd040"], flowers: ["#ffffff", "#ffe8a0", "#ffd040"], prop: "crystal", bg: "#2a2416" },
};
const TH = () => THEMES[ST.theme];
const isPath = (c, r) => ".SRB=".includes(tileAt(c, r));
const LAVA = new Set();

function drawMap() {
  const g = mctx, th = TH(), rnd = rng(9173 + S.stage * 101);
  LAVA.clear();
  rect(g, 0, 0, PW, PHt, th.g[0]);
  for (let i = 0; i < 9000; i++) dot(g, rnd() * PW, rnd() * PHt, th.g[i % 4]);
  for (let i = 0; i < 900; i++) { const x = rnd() * PW, y = rnd() * PHt; rect(g, x, y, 1, 2, th.blade); dot(g, x + 1, y + 1, th.g[1]); }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c], x = c * T, y = r * T;
    if (ch === "#") {
      for (let i = 0; i < 160; i++) dot(g, x + rnd() * T, y + rnd() * T, th.wall[i % 2]);
      if (ST.theme === "lava" && rnd() < 0.4) LAVA.add(c + "," + r);
    }
    if (ch === "~") drawWater(g, x, y, c, r, rnd);
  }
  // 小花 / 冰晶 / 火星
  for (let i = 0; i < 70; i++) {
    const c = Math.floor(rnd() * COLS), r = Math.floor(rnd() * ROWS); if (MAP[r][c] !== "#" && MAP[r][c] !== "H") continue;
    const x = c * T + 4 + rnd() * 32, y = r * T + 4 + rnd() * 32, col = th.flowers[Math.floor(rnd() * th.flowers.length)];
    dot(g, x, y - 1, col); dot(g, x - 1, y, col); dot(g, x + 1, y, col); dot(g, x, y + 1, col); dot(g, x, y, "#fff6a0");
  }
  // 土路
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isPath(c, r) && MAP[r][c] !== "=") {
    const x = c * T, y = r * T;
    rect(g, x, y, T, T, th.path[0]);
    for (let i = 0; i < 220; i++) dot(g, x + rnd() * T, y + rnd() * T, th.path[1 + (i % 3)]);
    for (let i = 0; i < 5; i++) { const px_ = x + 3 + rnd() * 32, py_ = y + 3 + rnd() * 32; rect(g, px_, py_, 3, 2, th.path[3]); rect(g, px_, py_ - 1, 2, 1, th.path[2]); }
    const edge = (ex, ey, w, h, tx_, ty_) => { rect(g, ex, ey, w, h, th.edge); for (let i = 0; i < 12; i++) rect(g, tx_(), ty_(), 1, 2, th.tuft); };
    if (!isPath(c, r - 1)) edge(x, y, T, 2, () => x + rnd() * T, () => y + 1);
    if (!isPath(c, r + 1)) edge(x, y + T - 2, T, 2, () => x + rnd() * T, () => y + T - 3);
    if (!isPath(c - 1, r)) edge(x, y, 2, T, () => x + 1 + (rnd() * 2 | 0), () => y + rnd() * T);
    if (!isPath(c + 1, r)) edge(x + T - 2, y, 2, T, () => x + T - 3 + (rnd() * 2 | 0), () => y + rnd() * T);
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MAP[r][c] === "=") drawBridge(g, c * T, r * T, isPath(c - 1, r) || isPath(c + 1, r), c, r);
  // 出生点、基地法阵
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = MAP[r][c]; if (!"SRB".includes(t)) continue;
    const cx = c * T + 20, cy = r * T + 28, col = t === "B" ? "#4a90e0" : "#b0306a";
    ring(g, cx, cy, 16, 6, col); ring(g, cx, cy, 11, 4, col, true); ring(g, cx, cy, 16, 6, "rgba(255,255,255,.25)", true);
  }
  // 高台石块
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MAP[r][c] === "H") drawPlatform(g, c * T, r * T, rnd, th);
  // 树、松树、尖石、岩石
  const props = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MAP[r][c] === "#" && !LAVA.has(c + "," + r)) {
    const n = rnd() < 0.55 ? 2 : 1;
    for (let k = 0; k < n; k++) props.push({ x: c * T + 8 + rnd() * 24, y: r * T + 16 + rnd() * 20, r: 9 + Math.floor(rnd() * 5), rock: rnd() < 0.18 });
  }
  props.sort((a, b) => a.y - b.y);
  const PROP = { tree: drawTree, pine: drawPine, grave: drawGraveProp, spire: drawSpire, cactus: drawCactus, crystal: drawCrystal, abyss: drawAbyssProp, ice: drawIceProp, mech: drawMechProp, blood: drawBloodProp, star: drawStarProp };
  for (const p of props) p.rock ? drawRock(g, p, th) : (PROP[th.prop] || drawTree)(g, p);
}
const WATER = { base: "#2f6ea8", d: "#2a64a0", l: "#3a80b8", wave: "#5a9ad0", shore: "#c8b890", dk: "#1e4a78" };
const wetAt = (cc, rr) => "~=".includes(tileAt(cc, rr)) || (rr >= ROWS || rr < 0 || cc < 0 || cc >= COLS) && ST.theme === "sky";
function drawWater(g, x, y, c, r, rnd, under) {
  if (ST.theme === "sky") return drawSkyVoid(g, x, y, c, r, rnd, under);
  if (ST.theme === "abyss") return drawRift(g, x, y, c, r, rnd, under);
  const W = TH().liquid || WATER;
  rect(g, x, y, T, T, W.base);
  for (let i = 0; i < 90; i++) dot(g, x + rnd() * T, y + rnd() * T, i % 3 ? W.d : W.l);
  for (let i = 0; i < 4; i++) { const yy = y + 5 + i * 9 + rnd() * 3; rect(g, x + 4 + rnd() * 20, yy, 6 + rnd() * 6, 1, W.wave); }
  if (under) return;
  const wet = (cc, rr) => "~=".includes(tileAt(cc, rr));
  if (!wet(c, r - 1)) { rect(g, x, y, T, 2, W.shore); rect(g, x, y + 2, T, 1, W.dk); }
  if (!wet(c, r + 1)) { rect(g, x, y + T - 2, T, 2, W.shore); }
  if (!wet(c - 1, r)) { rect(g, x, y, 2, T, W.shore); rect(g, x + 2, y, 1, T, W.dk); }
  if (!wet(c + 1, r)) { rect(g, x + T - 2, y, 2, T, W.shore); }
}
// 天空：云海 + 浮岛底部的岩石
function drawSkyVoid(g, x, y, c, r, rnd, under) {
  const band = ["#9ad4f4", "#8ccaf0", "#7ec0ec", "#72b6e6", "#68ace0", "#5ea2da", "#5698d4", "#4e8ece", "#4886c8"];
  for (let yy = 0; yy < T; yy += 4) rect(g, x, y + yy, T, 4, band[Math.min(8, Math.floor((y + yy) / PHt * 9))]);
  for (let i = 0; i < 3; i++) if (rnd() < 0.55) { const cx = x + 6 + rnd() * 28, cy = y + 8 + rnd() * 26, w = 8 + rnd() * 10;
    disc(g, cx, cy, w * 0.45, "#dff2fc"); disc(g, cx + w * 0.4, cy + 1, w * 0.35, "#eef8fe"); disc(g, cx - w * 0.4, cy + 2, w * 0.3, "#d2ecfa"); rect(g, cx - w * 0.6, cy + w * 0.25, w * 1.2, 2, "#c4e2f6"); }
  if (under) return;
  const land = (cc, rr) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && !"~=".includes(tileAt(cc, rr));
  if (land(c, r - 1)) { // 上面是浮岛：画悬着的岩石底
    for (let i = 0; i < T; i++) {
      const h = 6 + R0(Math.abs(Math.sin((c * T + i) * 0.23)) * 9 + Math.abs(Math.sin((c * T + i) * 0.61)) * 5);
      rect(g, x + i, y, 1, h, OUT); rect(g, x + i, y, 1, h - 1, i % 7 < 3 ? "#7a6a58" : "#8a7a66"); if (h > 9) rect(g, x + i, y + h - 4, 1, 2, "#5a4c3e");
    }
    rect(g, x, y, T, 2, "#4e8446");
  }
  if (land(c - 1, r)) { rect(g, x, y, 2, T, "rgba(255,255,255,.35)"); }
  if (land(c + 1, r)) { rect(g, x + T - 2, y, 2, T, "rgba(255,255,255,.25)"); }
}
// 深渊：虚空裂隙，边缘发紫光
function drawRift(g, x, y, c, r, rnd, under) {
  rect(g, x, y, T, T, "#12061a");
  for (let i = 0; i < 70; i++) dot(g, x + rnd() * T, y + rnd() * T, i % 4 ? "#1c0c26" : "#2a1236");
  for (let i = 0; i < 5; i++) dot(g, x + rnd() * T, y + rnd() * T, rnd() < 0.5 ? "#b070ff" : "#ff5a9a");
  if (under) return;
  const wet = (cc, rr) => "~=".includes(tileAt(cc, rr));
  const rim = (ex, ey, w, h) => { rect(g, ex, ey, w, h, "#5a2a7a"); };
  if (!wet(c, r - 1)) { rim(x, y, T, 3); rect(g, x, y + 3, T, 1, "#b070ff"); }
  if (!wet(c, r + 1)) { rim(x, y + T - 3, T, 3); rect(g, x, y + T - 4, T, 1, "#b070ff"); }
  if (!wet(c - 1, r)) { rim(x, y, 3, T); rect(g, x + 3, y, 1, T, "#b070ff"); }
  if (!wet(c + 1, r)) { rim(x + T - 3, y, 3, T); rect(g, x + T - 4, y, 1, T, "#b070ff"); }
}
function drawBridge(g, x, y, horizontal, c, r) {
  drawWater(g, x, y, c, r, rng(c * 31 + r * 17), true);
  if (horizontal) {
    rect(g, x, y + 4, T, 32, "#3a2414");
    for (let i = 0; i < 8; i++) { rect(g, x + i * 5, y + 5, 4, 30, i % 2 ? "#9a6a3c" : "#a8784a"); rect(g, x + i * 5, y + 5, 4, 1, "#c89a68"); }
    rect(g, x, y + 3, T, 2, "#6a4428"); rect(g, x, y + 35, T, 2, "#6a4428");
    for (const px_ of [x + 2, x + 36]) { rect(g, px_, y + 1, 3, 5, "#4a2c18"); rect(g, px_, y + 33, 3, 5, "#4a2c18"); }
  } else {
    rect(g, x + 4, y, 32, T, "#3a2414");
    for (let i = 0; i < 8; i++) { rect(g, x + 5, y + i * 5, 30, 4, i % 2 ? "#9a6a3c" : "#a8784a"); rect(g, x + 5, y + i * 5, 30, 1, "#c89a68"); }
  }
}
function drawPlatform(g, x, y, rnd, th) {
  const s = th.st, top = 29;
  rect(g, x + 4, y + T - 2, T - 3, 2, "rgba(0,0,0,.35)"); rect(g, x + T - 2, y + 6, 2, T - 7, "rgba(0,0,0,.25)");
  rect(g, x + 2, y + 2, 36, 36, s.out);
  rect(g, x + 4, y + 4, 32, top - 4, s.top);
  rect(g, x + 4, y + 4, 32, 2, s.hi); rect(g, x + 4, y + 4, 2, top - 4, s.hi2);
  rect(g, x + 4, y + top - 2, 32, 2, s.lo); rect(g, x + 34, y + 6, 2, top - 8, s.lo2);
  for (let i = 0; i < 30; i++) dot(g, x + 6 + rnd() * 28, y + 6 + rnd() * 20, rnd() < 0.5 ? s.hi2 : s.lo2);
  rect(g, x + 12, y + 10, 16, 1, s.lo); rect(g, x + 12, y + 10, 1, 12, s.lo);
  rect(g, x + 13, y + 22, 16, 1, s.hi); rect(g, x + 28, y + 11, 1, 12, s.hi);
  rect(g, x + 4, y + top, 32, 7, s.fr); rect(g, x + 4, y + top, 32, 1, s.frLo);
  for (const [bx, by] of [[x + 13, y + top + 1], [x + 25, y + top + 1], [x + 8, y + top + 4], [x + 20, y + top + 4], [x + 31, y + top + 4]]) rect(g, bx, by, 1, 3, s.seam);
  rect(g, x + 4, y + top + 3, 32, 1, s.seam === "#ff5a2a" ? "#5a1a0a" : s.frLo);
  for (let i = 0; i < 5; i++) if (rnd() < 0.6) {
    const mx = x + (i % 2 ? 28 + rnd() * 6 : 5 + rnd() * 6), my = y + (i < 2 ? 5 + rnd() * 3 : 20 + rnd() * 5);
    rect(g, mx, my, 3, 2, th.moss[0]); dot(g, mx + 1, my - 1, th.moss[1]); if (rnd() < 0.6) dot(g, mx + 3, my + 1, th.moss[2]);
  }
}
function drawTree(g, p) {
  const x = R0(p.x), y = R0(p.y), r = p.r, cy = y - 7 - r;
  for (let i = -r; i <= r + 2; i++) if (Math.abs(i) < r - 2 || i % 2) rect(g, x + i + 2, y + 1, 1, 2, "rgba(0,0,0,.3)");
  rect(g, x - 3, y - 9, 6, 10, OUT); rect(g, x - 2, y - 9, 4, 9, "#7a4e2c"); rect(g, x - 2, y - 8, 1, 7, "#9a6a3c");
  disc(g, x, cy, r + 1, "#16301c"); disc(g, x, cy, r, "#245a30");
  disc(g, x - 2, cy - 1, r - 2, "#357a3c"); disc(g, x - 3, cy - 3, Math.max(2, r - 5), "#4f9a48");
  for (let i = 0; i < r * 2; i++) { const a = i / (r * 2) * Math.PI * 2; if (Math.sin(a) > 0.2) dot(g, x + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), "#1c4a26"); }
  for (let i = 0; i < 6; i++) dot(g, x - r / 2 + (i * 7 % r), cy - r / 2 + (i * 5 % (r - 2)), "#8ad06a");
  rect(g, x - 5, cy - 6, 2, 1, "#a8e080"); rect(g, x - 4, cy - 7, 2, 1, "#a8e080");
}
function drawPine(g, p) {
  const x = R0(p.x), y = R0(p.y), h = p.r * 2 + 6;
  rect(g, x - 8, y + 1, 18, 2, "rgba(40,60,90,.25)");
  rect(g, x - 2, y - 6, 4, 7, "#5a3a24");
  for (let i = 0; i < 3; i++) {
    const ty = y - 6 - i * (h / 4), w = (3 - i) * 4 + 4;
    for (let k = 0; k < h / 3; k++) { const hw = R0(w * (k / (h / 3))); rect(g, x - hw, ty - h / 3 + k, hw * 2 + 1, 1, k < 2 ? "#ffffff" : "#2c5a48"); dot(g, x - hw, ty - h / 3 + k, "#1a3a30"); }
    rect(g, x - w + 1, ty - 1, w * 2 - 1, 1, "#e8f4ff");
  }
  dot(g, x, y - 6 - h, "#ffffff");
}
function drawSpire(g, p) {
  const x = R0(p.x), y = R0(p.y), h = p.r * 2;
  rect(g, x - 7, y + 1, 15, 2, "rgba(0,0,0,.4)");
  for (let k = 0; k < h; k++) { const hw = R0(6 * (k / h)) + 1; rect(g, x - hw, y - h + k, hw * 2, 1, k % 5 === 0 ? "#2a1c20" : "#3a2a30"); dot(g, x - hw, y - h + k, "#5a4450"); }
  dot(g, x, y - h + 3, "#ff6a2a"); dot(g, x + 1, y - h + 8, "#ff9a3a");
}
function drawGraveProp(g, p) {
  const x = R0(p.x), y = R0(p.y), kind = (x * 7 + y * 3) % 3;
  if (kind === 0) { // 墓碑
    rect(g, x - 7, y + 1, 15, 2, "rgba(0,0,0,.4)");
    rect(g, x - 6, y - 14, 12, 15, OUT); rect(g, x - 5, y - 16, 10, 2, OUT); rect(g, x - 3, y - 17, 6, 1, OUT);
    rect(g, x - 5, y - 15, 10, 15, "#8a8c98"); rect(g, x - 4, y - 16, 8, 1, "#a8aab8"); rect(g, x + 3, y - 14, 2, 14, "#6a6c78");
    rect(g, x - 1, y - 12, 2, 7, "#5a5c68"); rect(g, x - 3, y - 10, 6, 2, "#5a5c68");
    rect(g, x - 5, y - 2, 4, 2, "#4a6a4a");
  } else if (kind === 1) { // 枯树
    rect(g, x - 8, y + 1, 17, 2, "rgba(0,0,0,.35)");
    rect(g, x - 2, y - 18, 4, 19, "#3a2e2a"); rect(g, x - 1, y - 18, 1, 18, "#5a4a42");
    line(g, x, y - 12, x - 8, y - 20, "#3a2e2a", 2); line(g, x, y - 15, x + 7, y - 24, "#3a2e2a", 2); line(g, x - 5, y - 17, x - 7, y - 25, "#3a2e2a");
    line(g, x + 4, y - 20, x + 10, y - 21, "#3a2e2a");
  } else { // 石十字
    rect(g, x - 6, y + 1, 13, 2, "rgba(0,0,0,.4)");
    rect(g, x - 2, y - 18, 5, 19, OUT); rect(g, x - 6, y - 14, 13, 5, OUT);
    rect(g, x - 1, y - 17, 3, 17, "#9a9ca8"); rect(g, x - 5, y - 13, 11, 3, "#9a9ca8"); rect(g, x - 5, y - 13, 11, 1, "#babcc8");
    dot(g, x - 1, y - 6, "#5a7a5a"); dot(g, x, y - 5, "#5a7a5a");
  }
}
function drawCactus(g, p) {
  const x = R0(p.x), y = R0(p.y), kind = (x * 7 + y * 3) % 3;
  if (kind === 0) { // 仙人掌
    const h = 12 + (p.r % 4) * 2;
    rect(g, x - 7, y + 1, 15, 2, "rgba(90,60,20,.3)");
    rect(g, x - 3, y - h, 6, h + 1, OUT); rect(g, x - 2, y - h + 1, 4, h, "#5a9a48"); rect(g, x - 2, y - h + 1, 1, h, "#7ab860"); rect(g, x + 1, y - h + 1, 1, h, "#3a7030");
    rect(g, x - 7, y - h + 5, 5, 3, OUT); rect(g, x - 7, y - h + 1, 3, 6, OUT); rect(g, x - 6, y - h + 2, 1, 5, "#5a9a48"); rect(g, x - 6, y - h + 6, 4, 1, "#5a9a48");
    rect(g, x + 2, y - h + 8, 5, 3, OUT); rect(g, x + 4, y - h + 4, 3, 6, OUT); rect(g, x + 5, y - h + 5, 1, 5, "#5a9a48"); rect(g, x + 2, y - h + 9, 4, 1, "#5a9a48");
    dot(g, x, y - h, "#f0a0c0"); dot(g, x - 1, y - h + 4, "#e8e0b0"); dot(g, x + 1, y - h + 8, "#e8e0b0");
  } else if (kind === 1) { // 断掉的石柱
    rect(g, x - 8, y + 1, 17, 2, "rgba(90,60,20,.3)");
    rect(g, x - 5, y - 15, 10, 16, OUT); rect(g, x - 4, y - 14, 8, 15, "#d8b888"); rect(g, x - 4, y - 14, 2, 15, "#f0d8a8"); rect(g, x + 2, y - 14, 2, 15, "#b89868");
    for (const yy of [y - 10, y - 5]) rect(g, x - 4, yy, 8, 1, "#a08058");
    rect(g, x - 6, y - 16, 5, 2, OUT); rect(g, x + 1, y - 15, 5, 1, OUT); dot(g, x - 2, y - 15, "#f0d8a8");
    rect(g, x + 5, y - 2, 6, 3, OUT); rect(g, x + 6, y - 2, 4, 2, "#c8a878");
  } else { // 沙丘和枯骨
    rect(g, x - 10, y - 3, 20, 4, "#d4b070"); rect(g, x - 7, y - 5, 14, 2, "#e0c080"); rect(g, x - 4, y - 6, 8, 1, "#ecd092");
    rect(g, x - 3, y - 7, 6, 3, "#f0ead8"); dot(g, x - 2, y - 6, OUT); dot(g, x + 1, y - 6, OUT); rect(g, x + 4, y - 4, 5, 1, "#f0ead8");
  }
}
function drawCrystal(g, p) {
  const x = R0(p.x), y = R0(p.y), kind = (x * 5 + y * 7) % 3;
  if (kind === 2) { // 石笋
    rect(g, x - 6, y + 1, 13, 2, "rgba(0,0,0,.4)");
    for (let k = 0; k < 16; k++) { const hw = R0(5 * (k / 16)) + 1; rect(g, x - hw, y - 16 + k, hw * 2, 1, k % 4 === 0 ? "#3a3848" : "#4a4858"); dot(g, x - hw, y - 16 + k, "#6a6878"); }
    return;
  }
  const cols = kind ? ["#c0a0ff", "#e8d8ff", "#8a6ad8", "#4a2a8a"] : ["#7af0e0", "#dffffa", "#3ab0a8", "#1a6060"];
  rect(g, x - 9, y + 1, 19, 2, "rgba(0,0,0,.4)");
  g.globalAlpha = 0.18; disc(g, x, y - 8, 12, cols[0]); g.globalAlpha = 1;
  const shard = (sx, h, w) => {
    for (let k = 0; k < h; k++) { const hw = Math.max(0, R0(w * Math.min(1, (k + 1) / (h * 0.35)))); rect(g, sx - hw - 1, y - h + k, hw * 2 + 3, 1, OUT); }
    for (let k = 1; k < h; k++) { const hw = Math.max(0, R0(w * Math.min(1, (k + 1) / (h * 0.35))) - 0); rect(g, sx - hw, y - h + k, hw * 2 + 1, 1, cols[0]); rect(g, sx - hw, y - h + k, 1, 1, cols[1]); rect(g, sx + hw, y - h + k, 1, 1, cols[2]); }
    dot(g, sx, y - h + 1, "#ffffff");
  };
  shard(x - 5, 9, 2); shard(x + 5, 11, 2); shard(x, 17, 3);
  rect(g, x - 9, y - 1, 19, 2, cols[3]);
}
function drawAbyssProp(g, p) {
  const x = R0(p.x), y = R0(p.y), kind = (x * 3 + y * 11) % 3;
  if (kind === 0) { // 黑曜石尖刺
    rect(g, x - 8, y + 1, 17, 2, "rgba(0,0,0,.5)");
    const spike = (sx, h, w) => { for (let k = 0; k < h; k++) { const hw = R0(w * (k / h)); rect(g, sx - hw - 1, y - h + k, hw * 2 + 3, 1, OUT); rect(g, sx - hw, y - h + k, hw * 2 + 1, 1, k % 5 === 0 ? "#4a3a5a" : "#2e2438"); dot(g, sx - hw, y - h + k, "#6a5a7a"); } dot(g, sx, y - h, "#b070ff"); };
    spike(x - 4, 12, 3); spike(x + 4, 16, 4);
  } else if (kind === 1) { // 锁链石柱
    rect(g, x - 7, y + 1, 15, 2, "rgba(0,0,0,.5)");
    rect(g, x - 4, y - 18, 8, 19, OUT); rect(g, x - 3, y - 17, 6, 18, "#3e3448"); rect(g, x - 3, y - 17, 2, 18, "#54486a");
    rect(g, x - 5, y - 19, 10, 2, OUT); dot(g, x, y - 12, "#ff5a9a"); dot(g, x, y - 11, "#b070ff");
    for (let i = 0; i < 4; i++) { rect(g, x + 4 + i * 2, y - 14 + i * 3, 2, 2, "#8a8098"); dot(g, x + 5 + i * 2, y - 14 + i * 3, OUT); }
  } else { // 骨堆
    rect(g, x - 8, y - 2, 16, 3, "#3a2e3e"); rect(g, x - 5, y - 6, 6, 4, "#e8e0c8"); dot(g, x - 4, y - 5, OUT); dot(g, x - 2, y - 5, OUT);
    rect(g, x + 1, y - 3, 7, 1, "#d8d0b8"); rect(g, x - 8, y - 3, 3, 1, "#d8d0b8"); dot(g, x + 3, y - 7, "#b070ff");
  }
}
function drawIceProp(g, p) {
  const x = R0(p.x), y = R0(p.y), h = p.r + 8, k = (x * 5 + y * 3) % 3;
  rect(g, x - 8, y + 1, 17, 2, "rgba(40,70,100,.35)");
  if (k === 2) { // 雪堆
    rect(g, x - 9, y - 3, 19, 4, "#e8f4ff"); rect(g, x - 6, y - 5, 13, 2, "#ffffff"); rect(g, x - 3, y - 6, 7, 1, "#ffffff"); return;
  }
  const cols = ["#bfe8ff", "#ffffff", "#5aa8c8", "#2a5a78"];
  g.globalAlpha = 0.2; disc(g, x, y - 8, 11, cols[0]); g.globalAlpha = 1;
  const shard = (sx, hh, w) => {
    for (let i = 0; i < hh; i++) { const hw = Math.max(0, R0(w * Math.min(1, (i + 1) / (hh * 0.35)))); rect(g, sx - hw - 1, y - hh + i, hw * 2 + 3, 1, OUT); }
    for (let i = 1; i < hh; i++) { const hw = Math.max(0, R0(w * Math.min(1, (i + 1) / (hh * 0.35)))); rect(g, sx - hw, y - hh + i, hw * 2 + 1, 1, cols[0]); rect(g, sx - hw, y - hh + i, 1, 1, cols[1]); rect(g, sx + hw, y - hh + i, 1, 1, cols[2]); }
    dot(g, sx, y - hh + 1, "#ffffff");
  };
  shard(x - 4, h - 4, 2); shard(x + 5, h - 2, 2); shard(x, h + 3, 3);
  rect(g, x - 8, y - 1, 17, 2, cols[3]);
}
function drawMechProp(g, p) {
  const x = R0(p.x), y = R0(p.y), k = (x * 7 + y * 3) % 3;
  rect(g, x - 8, y + 1, 17, 2, "rgba(0,0,0,.45)");
  if (k === 0) { // 管道
    rect(g, x - 4, y - 16, 9, 17, OUT); rect(g, x - 3, y - 15, 7, 16, "#5a5c68"); rect(g, x - 3, y - 15, 2, 16, "#7e8090");
    for (const yy of [y - 12, y - 6]) { rect(g, x - 5, yy, 11, 3, OUT); rect(g, x - 4, yy + 1, 9, 1, "#8a8c9c"); }
    dot(g, x + 1, y - 14, "#ffb040");
  } else if (k === 1) { // 齿轮
    disc(g, x, y - 7, 7, OUT); disc(g, x, y - 7, 6, "#6a6c78"); disc(g, x, y - 7, 2, "#2a2c36");
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; rect(g, x + Math.cos(a) * 7 - 1, y - 7 + Math.sin(a) * 7 - 1, 3, 3, "#8a8c9c"); }
    dot(g, x - 2, y - 9, "#b0b2c0");
  } else { // 能量柱
    rect(g, x - 3, y - 18, 7, 19, OUT); rect(g, x - 2, y - 17, 5, 18, "#3a3c48");
    for (let i = 0; i < 4; i++) rect(g, x - 1, y - 15 + i * 4, 3, 2, i % 2 ? "#ffb040" : "#ffe060");
    rect(g, x - 5, y - 20, 11, 3, OUT); rect(g, x - 4, y - 19, 9, 1, "#8a8c9c");
  }
}
function drawBloodProp(g, p) {
  const x = R0(p.x), y = R0(p.y), k = (x * 3 + y * 11) % 3;
  rect(g, x - 8, y + 1, 17, 2, "rgba(0,0,0,.45)");
  if (k === 0) { // 枯骨
    rect(g, x - 8, y - 2, 16, 3, "#3a2028"); rect(g, x - 5, y - 7, 7, 5, "#e8d8c8"); dot(g, x - 4, y - 6, OUT); dot(g, x - 1, y - 6, OUT);
    rect(g, x + 2, y - 4, 7, 1, "#d8c8b8"); rect(g, x - 9, y - 4, 3, 1, "#d8c8b8");
  } else if (k === 1) { // 血色枯树
    rect(g, x - 2, y - 17, 5, 18, "#3a1c22"); rect(g, x - 1, y - 17, 1, 17, "#6a2c34");
    line(g, x, y - 11, x - 8, y - 19, "#3a1c22", 2); line(g, x, y - 14, x + 7, y - 22, "#3a1c22", 2);
    dot(g, x - 8, y - 20, "#ff6a7a"); dot(g, x + 8, y - 22, "#ff6a7a");
  } else { // 血池
    g.globalAlpha = 0.8; disc(g, x, y - 1, 8, "#5a1a22"); disc(g, x - 1, y - 2, 5, "#8a2028"); g.globalAlpha = 1;
    dot(g, x + 3, y - 3, "#ff6a7a");
  }
}
function drawStarProp(g, p) {
  const x = R0(p.x), y = R0(p.y), k = (x * 5 + y * 7) % 3;
  if (k === 0) { // 漂浮的碎石
    rect(g, x - 7, y - 6, 15, 6, OUT); rect(g, x - 6, y - 5, 13, 4, "#3a4068"); rect(g, x - 6, y - 5, 13, 1, "#5c66a0");
    for (let i = 0; i < 3; i++) dot(g, x - 4 + i * 4, y - 3, "#a0b8ff");
  } else if (k === 1) { // 星门碎片
    g.globalAlpha = 0.25; disc(g, x, y - 8, 10, "#a0b8ff"); g.globalAlpha = 1;
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; rect(g, x + Math.cos(a) * 8, y - 8 + Math.sin(a) * 8, 2, 2, i % 2 ? "#c890ff" : "#a0b8ff"); }
    rect(g, x - 1, y - 9, 3, 3, "#ffffff");
  } else { // 星尘簇
    for (const [dx, dy, c] of [[0, -10, "#ffffff"], [4, -6, "#a0b8ff"], [-5, -5, "#c890ff"], [2, -2, "#60d8f0"], [-3, -12, "#ffffff"]]) { dot(g, x + dx, y + dy, c); dot(g, x + dx + 1, y + dy, c); }
  }
}
function drawRock(g, p, th) {
  const x = R0(p.x), y = R0(p.y), snow = ST.theme === "snow";
  rect(g, x - 9, y + 1, 19, 2, "rgba(0,0,0,.3)");
  rect(g, x - 9, y - 8, 18, 9, OUT); rect(g, x - 7, y - 11, 14, 3, OUT);
  rect(g, x - 8, y - 9, 16, 9, "#8a8a92"); rect(g, x - 6, y - 10, 10, 3, "#b4b4bc"); rect(g, x - 8, y - 2, 16, 2, "#62626c");
  dot(g, x + 3, y - 5, "#62626c"); dot(g, x + 4, y - 4, "#62626c");
  if (snow) { rect(g, x - 6, y - 11, 12, 2, "#ffffff"); rect(g, x - 8, y - 9, 4, 1, "#ffffff"); }
  else if (ST.theme === "desert") { rect(g, x - 6, y - 11, 12, 2, "#e0c080"); rect(g, x - 8, y - 3, 16, 3, "#d4b070"); }
  else if (ST.theme === "cave") { dot(g, x - 3, y - 9, "#7af0e0"); dot(g, x + 2, y - 6, "#7af0e0"); }
  else if (ST.theme === "forest") { rect(g, x - 5, y - 11, 4, 1, "#6a9a4a"); }
}

// ---------- 会动的环境 ----------
const AMB = Array.from({ length: 50 }, () => ({ x: Math.random() * 640, y: Math.random() * 360, p: Math.random() * 6.28, s: 0.3 + Math.random() * 0.5 }));
function drawAmbient(now) {
  const t = now / 1000, theme = ST.theme;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c], x = c * T + 20, y = r * T + 20;
    if (ch === "~" && theme === "abyss") {
      for (let i = 0; i < 4; i++) { const a = t * (1.2 + i * 0.3) + c * 1.7 + r + i * 1.6, rr = 6 + i * 3; dot(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, i % 2 ? "#b070ff" : "#ff5a9a"); }
    } else if (ch === "~" && theme === "sky") {
      const k = (t * 0.05 + c * 0.37 + r * 0.21) % 1; rect(ctx, c * T + R0(k * 36), r * T + 12 + (c * 7 % 16), 6, 1, "rgba(255,255,255,.55)");
    } else if (ch === "~" || ch === "=") {
      const wc = theme === "cave" ? "#48a0c8" : "#a8d4f4";
      for (let i = 0; i < 3; i++) { const k = ((t * 0.4 + i / 3 + c * 0.13) % 1); if (ch === "~") rect(ctx, c * T + 4 + k * 30, r * T + 8 + i * 11, 3, 1, wc); }
    } else if (LAVA.has(c + "," + r)) {
      const glow = 0.5 + Math.sin(t * 2 + c) * 0.15;
      rect(ctx, c * T + 4, r * T + 6, 32, 28, "#2a0e08");
      ctx.fillStyle = `rgba(255,${90 + R0(glow * 60)},20,1)`; ctx.fillRect(c * T + 6, r * T + 8, 28, 24);
      ctx.fillStyle = "#ffb040"; for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i * 0.25 + r * 0.3) % 1; ctx.fillRect(c * T + 8 + i * 7, r * T + 10 + R0(k * 18), 3, 1); }
      if ((t * 3 + c) % 2 < 0.3) { disc(ctx, c * T + 14 + (c * 7 % 12), r * T + 18, 2, "#ffe080"); }
    }
    if (ch === "S" || ch === "R") {
      for (let yy = -14; yy <= 14; yy++) { const hw = R0(Math.sqrt(1 - (yy / 15) ** 2) * 10); rect(ctx, x - hw, y + yy - 2, hw * 2 + 1, 1, Math.abs(yy) > 11 ? "#3a0f2a" : "#12040e"); }
      for (let i = 0; i < 14; i++) { const a = t * 3 + i / 14 * 6.283; rect(ctx, x + Math.cos(a) * 10, y - 2 + Math.sin(a) * 14, 2, 2, i % 2 ? "#ff5a9a" : "#ffc0e0"); }
      for (let i = 0; i < 6; i++) { const a = -t * 5 + i / 6 * 6.283; dot(ctx, x + Math.cos(a) * 4, y - 2 + Math.sin(a) * 6, "#e060c0"); }
    } else if (ch === "B") {
      const low = S.crystal.hp < S.crystal.maxHp * 0.3, bob = R0(Math.sin(t * 2.5) * 2), cy = y - 14 + bob;
      const A = low ? ["#ffe0d8", "#ff6a5a", "#a02030"] : ["#e8f8ff", "#62b4ff", "#2a5aa8"];
      // 光柱
      ctx.globalAlpha = 0.1 + Math.sin(t * 3) * 0.04; ctx.fillStyle = A[1]; ctx.fillRect(x - 5, y - 46, 10, 52); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.26 + Math.sin(t * 4) * 0.08; disc(ctx, x, cy, 21, A[1]); ctx.globalAlpha = 1;
      // 石座（三层台阶）
      rect(ctx, x - 15, y + 12, 30, 5, OUT); rect(ctx, x - 14, y + 12, 28, 3, "#6a6a78"); rect(ctx, x - 14, y + 12, 28, 1, "#9a9aa8");
      rect(ctx, x - 12, y + 7, 24, 6, OUT); rect(ctx, x - 11, y + 7, 22, 4, "#8a8a96"); rect(ctx, x - 11, y + 7, 22, 1, "#c4c4d0");
      rect(ctx, x - 8, y + 3, 16, 5, OUT); rect(ctx, x - 7, y + 3, 14, 3, "#7a7a88"); rect(ctx, x - 7, y + 3, 14, 1, "#b4b4c0");
      for (let i = 0; i < 4; i++) { const a = -t * 1.2 + i / 4 * 6.283; dot(ctx, x + Math.cos(a) * 13, y + 2 + Math.sin(a) * 4, A[0]); }
      // 晶体本体（更高更宽）
      const H = 26, W = 1.15;
      for (let i = 0; i <= H; i++) { const hw = i <= 11 ? R0(i * W) : R0((H - i) * 0.85); rect(ctx, x - hw - 1, cy - 22 + i, hw * 2 + 3, 1, OUT); }
      for (let i = 1; i < H; i++) { const hw = (i <= 11 ? R0(i * W) : R0((H - i) * 0.85)) - 1; if (hw < 0) continue; rect(ctx, x - hw, cy - 22 + i, hw * 2 + 1, 1, A[1]); rect(ctx, x - hw, cy - 22 + i, 2, 1, A[0]); rect(ctx, x + hw - 1, cy - 22 + i, 2, 1, A[2]); }
      rect(ctx, x - 1, cy - 17, 1, 14, A[0]);
      if ((t * 2 | 0) % 3 === 0) { dot(ctx, x - 4, cy - 11, "#ffffff"); dot(ctx, x + 7, cy - 16, "#ffffff"); }
    }
  }
  if (GFX.amb) for (const f of AMB) {
    if (theme === "snow") { const y = (f.y + t * 18 * f.s) % PHt, x = f.x + Math.sin(t + f.p) * 6; dot(ctx, x, y, "#ffffff"); if (f.s > 0.6) dot(ctx, x + 1, y, "#e0ecff"); }
    else if (theme === "grave") {
      const x = (f.x + t * 8 * f.s) % (PW + 60) - 30, y = f.y + Math.sin(t * 0.7 + f.p) * 6;
      ctx.fillStyle = "rgba(200,220,210,.06)"; ctx.fillRect(R0(x), R0(y), 26 + R0(f.s * 20), 3); ctx.fillRect(R0(x) + 6, R0(y) - 2, 14, 2);
      if (f.s > 0.72) { const a = Math.sin(t * 2 + f.p * 4); if (a > 0) { rect(ctx, f.x, (f.y + Math.sin(t + f.p) * 10), 2, 2, "#80f0c0"); dot(ctx, f.x + 1, f.y - 1 + Math.sin(t + f.p) * 10, "#e0fff0"); } }
    }
    else if (theme === "desert") { const x = (f.x + t * 40 * f.s) % (PW + 40) - 20, y = f.y + Math.sin(t * 1.5 + f.p) * 3; rect(ctx, x, y, f.s > 0.6 ? 4 : 2, 1, f.s > 0.6 ? "#f0dca0" : "#d8bc80"); }
    else if (theme === "sky") { const x = (f.x + t * 30 * f.s) % (PW + 60) - 30; if (f.s > 0.5) rect(ctx, x, f.y, 10 + R0(f.s * 12), 1, "rgba(255,255,255,.35)"); else if (f.p > 5) { const bx = (f.x - t * 18) % PW, by = f.y * 0.5 + Math.sin(t + f.p) * 4, w = (t * 6 | 0) % 2; dot(ctx, bx < 0 ? bx + PW : bx, by, "#3a4a60"); dot(ctx, (bx < 0 ? bx + PW : bx) - 1, by - w, "#3a4a60"); dot(ctx, (bx < 0 ? bx + PW : bx) + 1, by - w, "#3a4a60"); } }
    else if (theme === "cave") { const a = Math.sin(t * 2 + f.p * 5); if (a > 0.2) { const y = f.y - (t * 6 * f.s) % 40; rect(ctx, f.x + Math.sin(t * 0.8 + f.p) * 6, y, a > 0.7 ? 2 : 1, a > 0.7 ? 2 : 1, f.s > 0.55 ? "#7af0e0" : "#c0a0ff"); } }
    else if (theme === "abyss") { const y = PHt - ((PHt - f.y + t * 14 * f.s) % PHt), x = f.x + Math.sin(t * 1.4 + f.p) * 5; dot(ctx, x, y, f.s > 0.6 ? "#ff5a9a" : "#b070ff"); if (f.s > 0.7) dot(ctx, x, y + 1, "#5a2a7a"); }
    else if (theme === "lava") { const y = PHt - ((PHt - f.y + t * 20 * f.s) % PHt), x = f.x + Math.sin(t * 2 + f.p) * 4; dot(ctx, x, y, f.s > 0.55 ? "#ffb040" : "#ff5a2a"); }
    else { const a = Math.sin(t * 3 + f.p * 5); if (a > 0) rect(ctx, f.x + Math.sin(t * f.s + f.p) * 16, f.y + Math.cos(t * f.s * 1.3 + f.p) * 10, a > 0.6 ? 2 : 1, a > 0.6 ? 2 : 1, a > 0.6 ? "#f0ffa0" : "#a8d060"); }
  }
}
