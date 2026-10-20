
// ================= 矢量 Q 版角色（骨骼动画） =================
// 角色不再是像素贴图：头、身体、四肢、头发、武器都是用路径画出来的矢量图形，每帧按「骨骼」姿势直接画到战场上，
// 所以分辨率跟着屏幕走，动作是连续的（呼吸、眨眼、走路摆腿、出手挥砍、拉弓、施法、受击）。
// 坐标：脚底中心为 (0,0)，向右是角色面朝的方向（face=-1 时整体水平翻转），单位约等于战场上的一个逻辑像素，身高约 46。
// 角度：0 = 朝前（+x），90 = 朝下，-90 = 朝上，180 = 朝后。
const CH_OUT = "#2a1a2e";
const CH_SKIN = ["#ffe2cc", "#f2b99c"];

// ---------- 小工具 ----------
const chRad = d => d * Math.PI / 180;
const chLerp = (a, b, t) => a + (b - a) * t;
const chSmooth = t => t * t * (3 - 2 * t);
// 关键帧姿势：keys = [[时间, {参数}], ...]，在相邻两帧之间平滑插值
function chKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = chSmooth((t - t0) / (t1 - t0)), out = {};
      for (const key in b) out[key] = a[key] === undefined ? b[key] : chLerp(a[key], b[key], k);
      return out;
    }
  }
  return keys[keys.length - 1][1];
}
// 圆角矩形、椭圆路径（不用 roundRect，老 Safari 没有）
function chRR(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
}
// 沿点列画平滑曲线（取相邻点中点做二次贝塞尔）
function chSmoothPath(c, pts, close) {
  const n = pts.length; c.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  for (let i = 1; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; if (!close && i === n - 1) { c.lineTo(p[0], p[1]); break; } c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  if (close) { const p = pts[0], q = pts[1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); c.closePath(); }
}

// ---------- 角色设定 ----------
// hair: 发型 long 长发 / pony 马尾 / twin 双马尾 / bob 短发 / hood 兜帽（hairCol 是露出来的发色）
// outfit: plate 板甲 / leather 皮甲 / robe 长袍 / mech 机甲；gear: 头饰；weapon: 武器；back: 背饰
const CHIBI = {
  knight: { skin: 0, hair: "pony", hc: ["#f4d070", "#c89a38", "#fff0b0"], eye: "#3a70d8", outfit: "plate", main: ["#c8d4e8", "#8a98b8"], cloth: "#3a5cc0", trim: "#f0c040", metal: ["#e8c050", "#a8802a"], boot: "#4a5a8a", gear: "circlet", weapon: "sword", shield: "kite", back: "cape", backCol: ["#3a60c8", "#26408c"] },
  sword: { skin: 0, hair: "pony", hc: ["#d83848", "#8a1c2c", "#ff8090"], eye: "#e89830", outfit: "leather", main: ["#7a2a34", "#4a1a22"], cloth: "#d83040", trim: "#f0c040", metal: ["#8a8a98", "#5a5a68"], boot: "#2a1c1c", gear: "bandana", weapon: "sword" },
  assassin: { skin: 0, hair: "hood", hc: ["#2e4450", "#1a2830", "#5a7a88"], eye: "#40e0c0", outfit: "leather", main: ["#2e3440", "#1c2028"], cloth: "#2a8a7c", trim: "#4fc0b0", metal: ["#3a4a58", "#222c36"], boot: "#1c2028", gear: "mask", weapon: "dagger", hood: ["#2e4450", "#1a2830"] },
  lancer: { skin: 0, hair: "long", hc: ["#3a4a88", "#232c5a", "#6a80c8"], eye: "#e8b030", outfit: "plate", main: ["#2c8a84", "#1c5a56"], cloth: "#3a4a88", trim: "#f0d070", metal: ["#e0c070", "#a88838"], boot: "#a88838", gear: "wings", weapon: "lance", back: "cape", backCol: ["#3a4a88", "#232c5a"] },
  archer: { skin: 0, hair: "long", hc: ["#f6e6a8", "#c8b070", "#fffbe0"], eye: "#38b060", outfit: "leather", main: ["#4fa050", "#2f6a38"], cloth: "#8a5a30", trim: "#d8b050", metal: ["#6a4428", "#4a2c18"], boot: "#6a4428", gear: "leaf", ears: true, weapon: "bow", back: "quiver" },
  mage: { skin: 0, hair: "long", hc: ["#9058c8", "#5a3088", "#c090f0"], eye: "#c060f0", outfit: "robe", main: ["#7a4cc0", "#4a2c80"], cloth: "#5a3088", trim: "#f0c040", metal: ["#f0c040", "#a88020"], boot: "#4a2c70", gear: "wizhat", weapon: "staff", orb: "mage" },
  gunner: { skin: 0, hair: "twin", hc: ["#e8783a", "#a84818", "#ffb080"], eye: "#3a8ad8", outfit: "leather", main: ["#e08a3a", "#a85a1a"], cloth: "#5a3a1a", trim: "#f0c040", metal: ["#8a5a30", "#5a3a1a"], boot: "#3a2410", gear: "goggles", weapon: "cannon" },
  priest: { skin: 2, hair: "hood", hc: ["#f8f4ec", "#d0c8b8", "#ffffff"], eye: "#d8a030", outfit: "robe", main: ["#f8f4ec", "#d0c8b8"], cloth: "#e8e0d0", trim: "#e8b830", metal: ["#e8b830", "#a88020"], boot: "#d8d0c0", gear: "veil", weapon: "staff", orb: "priest", hood: ["#f8f4ec", "#d0c8b8"] },
  frost: { skin: 1, hair: "long", hc: ["#e8f4fc", "#a8c8dc", "#ffffff"], eye: "#40b8e8", outfit: "robe", main: ["#9adcf6", "#4f98c8"], cloth: "#e8f4fc", trim: "#ffffff", metal: ["#80d8f8", "#4f98c8"], boot: "#f0f8ff", gear: "icecrown", ears: true, weapon: "wand", orb: "frost" },
  alchemist: { skin: 0, hair: "twin", hc: ["#e87aa0", "#a84a70", "#ffb4cc"], eye: "#3ab870", outfit: "leather", main: ["#8a5a3a", "#5a3a22"], cloth: "#f0e8d8", trim: "#e0b040", metal: ["#8a5a3a", "#5a3a22"], boot: "#3a2414", gear: "goggles", weapon: "flask", back: "tanks" },
  bard: { skin: 0, hair: "bob", hc: ["#a8603a", "#6a3a20", "#e0a070"], eye: "#4a8ae8", outfit: "leather", main: ["#5a9ae0", "#3a6ab0"], cloth: "#f8f4ec", trim: "#f0c040", metal: ["#3a6ab0", "#26467a"], boot: "#6a4428", gear: "featherCap", weapon: "lute" },
  summoner: { skin: 0, hair: "hood", hc: ["#c0a8e8", "#8a70b8", "#ece0ff"], eye: "#e0a040", outfit: "robe", main: ["#b8845a", "#7a5434"], cloth: "#f0e8d8", trim: "#7af0e0", metal: ["#7af0e0", "#3ab0a8"], boot: "#7a5434", gear: "none", weapon: "book", back: "totem", hood: ["#b8845a", "#7a5434"] },
  mech: { skin: 0, hair: "bob", hc: ["#d8a020", "#a06a10", "#ffe060"], eye: "#ff8a30", outfit: "mech", main: ["#9a9cac", "#5a5c68"], cloth: "#c8a030", trim: "#e8c050", metal: ["#c8a030", "#8a6a10"], boot: "#3a3c48", gear: "goggles", weapon: "lance", back: "cannons" },
  star: { skin: 0, hair: "long", hc: ["#c8d0ff", "#8a92c8", "#ffffff"], eye: "#6a78e0", outfit: "robe", main: ["#3a4478", "#242c50"], cloth: "#242c50", trim: "#ffe060", metal: ["#ffe060", "#a88820"], boot: "#242c50", gear: "startiara", ears: true, weapon: "staff", orb: "star" },
  chrono: { skin: 0, hair: "bob", hc: ["#8ae8d8", "#4aa898", "#c8fff4"], eye: "#ffd040", outfit: "robe", main: ["#2e6a70", "#1c4448"], cloth: "#1c4448", trim: "#ffd040", metal: ["#ffd040", "#a88820"], boot: "#1c4448", gear: "hourglass", ears: true, weapon: "staff", orb: "frost" },
  marshal: { skin: 0, hair: "pony", hc: ["#e8c070", "#a88838", "#fff0c0"], eye: "#c83a4a", outfit: "plate", main: ["#e0d8c8", "#9a9284"], cloth: "#b83a48", trim: "#e8c050", metal: ["#b83a48", "#8a2a38"], boot: "#6a2a34", gear: "plumehelm", weapon: "lance", back: "banner" },
  counter: { skin: 3, hair: "bob", hc: ["#7a4a30", "#4a2a18", "#b07a50"], eye: "#58c0b0", outfit: "plate", main: ["#2a8a88", "#1a6a68"], cloth: "#c89860", trim: "#ffd860", metal: ["#c89860", "#7a5a30"], boot: "#7a5a30", gear: "none", weapon: "sword", shield: "round" },
  hunter: { skin: 0, hair: "hood", hc: ["#d8dce8", "#9a9eb0", "#ffffff"], eye: "#e04a4a", outfit: "leather", main: ["#5a4a7a", "#3a2e56"], cloth: "#8a5a30", trim: "#e04a4a", metal: ["#3a2e56", "#241c3a"], boot: "#3a2a1a", gear: "mask2", weapon: "bow", back: "quiver", hood: ["#5a4a7a", "#3a2e56"] },
  songstress: { skin: 0, hair: "long", hc: ["#58b8e8", "#2a78b0", "#c8f0ff"], eye: "#ffd040", outfit: "robe", main: ["#2a6a9a", "#164868"], cloth: "#e8fbff", trim: "#e8fbff", metal: ["#7ae0f0", "#2a78b0"], boot: "#164868", gear: "pearl", weapon: "wand", orb: "frost" },
  breaker: { skin: 0, hair: "bob", hc: ["#e8e8f8", "#a8a8c0", "#ffffff"], eye: "#a0b0ff", outfit: "leather", main: ["#3a3e5a", "#262a40"], cloth: "#8a96e0", trim: "#8a96e0", metal: ["#4a56a0", "#2a3060"], boot: "#262a40", gear: "none", weapon: "dagger" },
};
const CH_SKINS = [["#ffe2cc", "#f2b99c"], ["#e4f2ff", "#b4d0ec"], ["#d8a070", "#a8703c"], ["#b88258", "#8a5a38"]];

// ---------- 姿势（每种武器一套：待机 / 出手关键帧） ----------
const CH_IDLE = { sword: { fa: 62, fw: -52, ba: 100 }, dagger: { fa: 70, fw: -40, ba: 110, bw: -40 }, lance: { fa: 50, fw: -78, ba: 100 }, bow: { fa: -8, ba: 70, draw: 0 }, staff: { fa: 52, fw: -90, ba: 100 }, wand: { fa: 52, fw: -75, ba: 100 }, cannon: { fa: -12, fw: -6, ba: 80 }, flask: { fa: 40, fw: -30, ba: 100 }, lute: { fa: 40, fw: -60, ba: 60 }, book: { fa: 24, fw: 0, ba: 100 } };
const CH_ATK = {
  sword: [[0, { fa: 62, fw: -52, ba: 100, lean: 0 }], [0.1, { fa: -120, fw: -128, ba: 126, lean: -1.6 }], [0.2, { fa: 14, fw: 28, ba: 80, lean: 3 }], [0.42, { fa: 62, fw: -52, ba: 100, lean: 0 }]],
  dagger: [[0, { fa: 70, fw: -40, ba: 110, bw: -40, lean: 0 }], [0.1, { fa: -100, fw: -120, ba: 140, bw: -100, lean: -1.4 }], [0.2, { fa: 5, fw: 20, ba: 20, bw: 10, lean: 3 }], [0.4, { fa: 70, fw: -40, ba: 110, bw: -40, lean: 0 }]],
  lance: [[0, { fa: 50, fw: -78, ba: 100, lean: 0 }], [0.1, { fa: 160, fw: -10, ba: 100, lean: -2 }], [0.2, { fa: -4, fw: 0, ba: 60, lean: 4 }], [0.4, { fa: 50, fw: -78, ba: 100, lean: 0 }]],
  bow: [[0, { fa: -8, ba: 70, draw: 0, lean: 0 }], [0.17, { fa: -4, ba: 176, draw: 1, lean: -1 }], [0.2, { fa: -8, ba: 40, draw: 0, lean: 1.2 }], [0.34, { fa: -8, ba: 70, draw: 0, lean: 0 }]],
  staff: [[0, { fa: 52, fw: -90, ba: 100, lean: 0 }], [0.17, { fa: -105, fw: -78, ba: 120, lean: -1 }], [0.24, { fa: -28, fw: -30, ba: 90, lean: 2 }], [0.4, { fa: 52, fw: -90, ba: 100, lean: 0 }]],
  wand: [[0, { fa: 52, fw: -75, ba: 100, lean: 0 }], [0.17, { fa: -105, fw: -80, ba: 120, lean: -1 }], [0.24, { fa: -30, fw: -20, ba: 90, lean: 2 }], [0.4, { fa: 52, fw: -75, ba: 100, lean: 0 }]],
  cannon: [[0, { fa: -12, fw: -6, ba: 80, lean: 0, kick: 0 }], [0.17, { fa: -18, fw: -10, ba: 70, lean: 1, kick: 0 }], [0.22, { fa: -8, fw: -2, ba: 90, lean: -2.5, kick: 3 }], [0.4, { fa: -12, fw: -6, ba: 80, lean: 0, kick: 0 }]],
  flask: [[0, { fa: 40, fw: -30, ba: 100, lean: 0 }], [0.17, { fa: -130, fw: -140, ba: 100, lean: -2 }], [0.26, { fa: -10, fw: 10, ba: 90, lean: 3 }], [0.42, { fa: 40, fw: -30, ba: 100, lean: 0 }]],
  lute: [[0, { fa: 40, fw: -60, ba: 60, lean: 0 }], [0.17, { fa: 55, fw: -60, ba: 45, lean: 0 }], [0.3, { fa: 30, fw: -60, ba: 60, lean: 0 }], [0.42, { fa: 40, fw: -60, ba: 60, lean: 0 }]],
  book: [[0, { fa: 24, fw: 0, ba: 100, lean: 0 }], [0.17, { fa: -40, fw: 0, ba: 120, lean: -1 }], [0.3, { fa: -20, fw: 0, ba: 90, lean: 1.5 }], [0.42, { fa: 24, fw: 0, ba: 100, lean: 0 }]],
};
const CH_ATK_LEN = { sword: 0.42, dagger: 0.4, lance: 0.4, bow: 0.34, staff: 0.4, wand: 0.4, cannon: 0.4, flask: 0.42, lute: 0.42, book: 0.42 };

// ---------- 画一个角色 ----------
// o: { t 秒, id, face, atkT 距上次出手的时间, walking, flash, skill, lv, branch, hurt, nowalk }
function drawChibi(g, D, o, x, y, k) {
  const V = CHIBI[D.id]; if (!V) return false;
  const t = o.t || 0, W = !!o.flash, lv = o.lv || 1, br = lv >= 4 ? (o.branch === "B" ? "B" : "A") : "";
  const L = br ? BR_LOOK[br] : null;
  const OL = W ? "#ffffff" : br === "B" ? "#901a1a" : br === "A" ? "#1a4aa0" : lv >= 3 ? "#7a4a08" : CH_OUT;
  const C = c => (W ? mixHex(c, "#ffffff", 0.82) : (L && !c.startsWith("rgba") ? mixHex(c, L.tint, L.k * 0.45) : c));
  const CS = c => (W ? mixHex(c, "#ffffff", 0.82) : c);   // 皮肤不染色
  const skin = CH_SKINS[V.skin || 0], id = o.id || 0;
  const wp = V.weapon, idle = CH_IDLE[wp];
  // ----- 姿势 -----
  const atkOn = o.atkT != null && o.atkT >= 0 && o.atkT < (CH_ATK_LEN[wp] || 0.4) && !o.hurt;
  const P = atkOn ? chKeys(CH_ATK[wp], o.atkT) : idle, lean = (atkOn ? P.lean : 0) || 0;
  const wlk = !!o.walking, ph = t * (wlk ? 11 : 2.2) + id * 1.7;
  const breath = wlk ? 0 : Math.sin(t * 2.4 + id) * 0.5 + 0.5;
  const bob = wlk ? -Math.abs(Math.sin(ph)) * 1.8 : -breath * 0.7;
  const hurt = !!o.hurt, hurtX = hurt ? -2.2 : 0;
  const tilt = hurt ? -0.12 : Math.sin(t * 1.3 + id) * 0.025 + lean * 0.018;
  const legSw = wlk ? Math.sin(ph) * 0.55 : 0;
  const blink = !hurt && ((t + id * 0.9) % 3.7) < 0.12;
  g.save(); g.translate(x, y); if (k) g.scale(k, k); g.scale(o.face || 1, 1);
  g.lineJoin = "round"; g.lineCap = "round";
  const shade = (c0, c1, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; };
  const fs = (fill, lw) => { g.fillStyle = fill; g.fill(); g.lineWidth = lw || 1.3; g.strokeStyle = OL; g.stroke(); };
  // 光环：转职 A 光环、B 犄角在头上，脚下阴影由外面画
  const bx = lean + hurtX;   // 身体前倾量
  // ----- 背饰（在身后） -----
  chBack(g, V, C, CS, OL, fs, t, id, bx, bob, wlk, atkOn);
  // ----- 后发 -----
  g.save(); g.translate(bx * 0.6, bob);
  chHairBack(g, V, C, OL, fs, t, id, wlk, shade);
  g.restore();
  // ----- 后手臂（身体后面那只）；拉弓时拉弦的手要画在脸前面，等画完头再画 -----
  const aBack = chRad(P.ba !== undefined ? P.ba : 100) + (wlk ? -Math.sin(ph) * 0.5 : 0), sbx = -6.4 + bx * 0.8, sby = -20.5 + bob;
  const bowDraw = wp === "bow" && (P.draw || 0) > 0.05;
  if (wp === "bow") o._bh = [sbx + Math.cos(aBack) * 9, sby + Math.sin(aBack) * 9];
  if (!bowDraw) chArm(g, V, C, CS, OL, fs, sbx, sby, aBack, 9, true, wp, P, t, o);
  // ----- 腿 -----
  chLegs(g, V, C, OL, fs, legSw, wlk, bx);
  // ----- 躯干 -----
  g.save(); g.translate(bx * 0.7, bob); g.scale(1, 1 + breath * 0.02);
  chTorso(g, V, C, CS, OL, fs, shade, t, id);
  g.restore();
  // ----- 副手装备（盾）在身前 -----
  if (V.shield) chShield(g, V, C, OL, fs, bx, bob, atkOn);
  // ----- 头 -----
  g.save(); g.translate(bx * 1.1, bob * 1.0 - 33 + 0); g.rotate(tilt);
  chHead(g, V, C, CS, OL, fs, shade, skin, t, id, blink, hurt, atkOn, o);
  g.restore();
  if (bowDraw) chArm(g, V, C, CS, OL, fs, sbx, sby, aBack, 9, true, wp, P, t, o);
  // ----- 前手臂 + 武器 -----
  const aFront = chRad(P.fa !== undefined ? P.fa : 60);
  chArm(g, V, C, CS, OL, fs, 6.6 + bx * 0.8, -20.5 + bob, aFront + (wlk ? Math.sin(ph) * 0.5 : 0), 9, false, wp, P, t, o);
  g.restore();
  return true;
}

// ---------- 背饰 ----------
function chBack(g, V, C, CS, OL, fs, t, id, bx, bob, wlk, atkOn) {
  const sw = Math.sin(t * 2.2 + id) * 1.2 + (wlk ? Math.sin(t * 11 + id) * 1.5 : 0);
  if (V.back === "cape") {
    const [c0, c1] = V.backCol; g.beginPath(); g.moveTo(-6, -22 + bob); g.quadraticCurveTo(-13 - sw, -12, -11 - sw * 1.5, -2); g.quadraticCurveTo(0, 0 + sw * 0.3, 11 - sw * 0.5, -2); g.quadraticCurveTo(13, -12, 6, -22 + bob); g.closePath();
    const gr = g.createLinearGradient(0, -22, 0, 0); gr.addColorStop(0, C(c0)); gr.addColorStop(1, C(c1)); fs(gr, 1.2);
  } else if (V.back === "quiver") {
    g.save(); g.translate(-5 + bx * 0.5, -17 + bob); g.rotate(-0.5); g.beginPath(); chRR(g, -2.6, -9, 5.2, 15, 1.4); fs(C("#7a5030"), 1.1);
    g.fillStyle = C("#e8e0c8"); for (const dx of [-1.4, 0, 1.4]) { g.fillRect(dx - 0.5, -13, 1, 5); } g.fillStyle = C("#c83a4a"); g.fillRect(-1.9, -12, 1.2, 2); g.fillRect(0.7, -12.5, 1.2, 2); g.restore();
  } else if (V.back === "tanks") {
    for (const sx of [-9, 9]) { g.beginPath(); chRR(g, sx - 3, -23 + bob, 6, 13, 2.4); fs(C("#7ae090"), 1.1); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(sx - 1.6, -21.5 + bob, 1.2, 8); }
    g.strokeStyle = OL; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -18 + bob); g.quadraticCurveTo(0, -14, 6, -18 + bob); g.stroke();
  } else if (V.back === "totem") {
    g.save(); g.translate(-13 + bx * 0.4, 0); g.beginPath(); chRR(g, -2.6, -44, 5.2, 42, 1.6); fs(C("#8a6040"), 1.2);
    g.fillStyle = C("#7af0e0"); g.fillRect(-1.4, -41, 2.8, 2.4); g.fillRect(-1.4, -33, 2.8, 2.4); g.fillStyle = C("#ffd860"); g.fillRect(-3.4, -28, 6.8, 1.8); g.restore();
  } else if (V.back === "cannons") {
    for (const sx of [-1, 1]) { g.save(); g.translate(sx * 11, -23 + bob); g.rotate(sx * -0.5); g.beginPath(); chRR(g, -3.2, -11, 6.4, 15, 2); fs(shade2(g, C(V.main[0]), C(V.main[1]), -3, 0, 3, 0), 1.2); g.fillStyle = C("#ff8a30"); g.fillRect(-1.6, -12.4, 3.2, 2); g.restore(); }
  } else if (V.back === "banner") {
    g.save(); g.translate(-14 + bx * 0.4, 0); g.strokeStyle = OL; g.lineWidth = 3.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -56); g.stroke(); g.strokeStyle = C("#8a6040"); g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -56); g.stroke();
    g.beginPath(); g.moveTo(0.8, -54); g.quadraticCurveTo(-8, -52 + sw * 0.6, -15 + sw, -50); g.lineTo(-15 + sw, -37); g.quadraticCurveTo(-8, -39 - sw * 0.6, 0.8, -36); g.closePath(); fs(C("#c83a4a"), 1.2);
    g.fillStyle = C("#ffe060"); g.beginPath(); g.arc(-7, -44.5, 2.4, 0, 6.3); g.fill(); g.restore();
  }
}
function shade2(g, c0, c1, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }

// ---------- 后发 ----------
function chHairBack(g, V, C, OL, fs, t, id, wlk, shade) {
  const [h0, h1] = V.hc, sw = Math.sin(t * 2.4 + id) * 1.6 + (wlk ? Math.sin(t * 11) * 1.4 : 0), cy = -33;
  const fill = c => { fs(shade2(g, C(h0), C(h1), 0, cy - 12, 0, cy + 16), 1.2); };
  if (V.hair === "long") { g.beginPath(); chSmoothPath(g, [[-13.5, cy - 4], [-14.2, cy - 12], [-8, cy - 17], [0, cy - 18], [8, cy - 17], [14.2, cy - 12], [13.5, cy - 4], [14, cy + 8], [12, cy + 18 + sw * 0.4], [6, cy + 20], [0, cy + 17], [-6, cy + 20], [-12, cy + 18 - sw * 0.4], [-14, cy + 8]], true); fill(); }
  else if (V.hair === "pony") {
    g.beginPath(); chSmoothPath(g, [[-13, cy - 3], [-13.6, cy - 11], [-8, cy - 16.5], [0, cy - 17.4], [8, cy - 16.5], [13.6, cy - 11], [13, cy - 3], [10, cy + 4], [-10, cy + 4]], true); fill();
    g.beginPath(); g.moveTo(-9, cy - 12); g.bezierCurveTo(-20, cy - 15 + sw, -27, cy - 2 + sw, -22 - sw, cy + 12); g.bezierCurveTo(-19, cy + 5, -16, cy - 4, -9, cy - 6); g.closePath(); fs(shade2(g, C(h0), C(h1), -9, cy - 12, -22, cy + 12), 1.2);
  } else if (V.hair === "twin") {
    g.beginPath(); chSmoothPath(g, [[-13, cy - 3], [-13.6, cy - 11], [-8, cy - 16.5], [0, cy - 17.4], [8, cy - 16.5], [13.6, cy - 11], [13, cy - 3], [10, cy + 4], [-10, cy + 4]], true); fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 11, cy - 8); g.bezierCurveTo(s * 21, cy - 6 + sw * s, s * 25, cy + 8, s * (19 + sw * 0.6), cy + 17); g.bezierCurveTo(s * 15, cy + 9, s * 14, cy, s * 10, cy + 1); g.closePath(); fs(shade2(g, C(h0), C(h1), s * 11, cy - 8, s * 20, cy + 16), 1.2); }
  } else if (V.hair === "bob") { g.beginPath(); chSmoothPath(g, [[-13.6, cy - 3], [-14, cy - 11], [-8, cy - 17], [0, cy - 18], [8, cy - 17], [14, cy - 11], [13.6, cy - 3], [14, cy + 5], [9, cy + 9], [0, cy + 7], [-9, cy + 9], [-14, cy + 5]], true); fill(); }
  else if (V.hair === "hood") { const [x0, x1] = V.hood; g.beginPath(); chSmoothPath(g, [[-14, cy - 2], [-14.6, cy - 12], [-8, cy - 18.5], [0, cy - 19.5], [8, cy - 18.5], [14.6, cy - 12], [14, cy - 2], [15, cy + 8], [9, cy + 13], [0, cy + 10], [-9, cy + 13], [-15, cy + 8]], true); fs(shade2(g, C(x0), C(x1), 0, cy - 18, 0, cy + 12), 1.2); }
}

// ---------- 腿 ----------
function chLegs(g, V, C, OL, fs, legSw, wlk, bx) {
  const robe = V.outfit === "robe", pants = V.outfit === "plate" ? V.main[1] : V.outfit === "mech" ? V.main[1] : V.cloth === "#f0e8d8" || V.cloth === "#f8f4ec" || V.cloth === "#e8f4fc" ? V.main[1] : V.main[1];
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * 2.9 + bx * 0.4, -11); g.rotate(s * legSw * (s > 0 ? 1 : -1));
    const len = robe ? 8 : 8.4;
    g.beginPath(); chRR(g, -2.3, 0, 4.6, len, 2); fs(C(pants), 1.2);
    g.beginPath(); chRR(g, -2.7, len - 3.4, 5.4, 4.4, 1.8); fs(C(V.boot), 1.2); g.restore();
  }
}

// ---------- 躯干 ----------
function chTorso(g, V, C, CS, OL, fs, shade, t, id) {
  const [m0, m1] = V.main, sk = CH_SKINS[V.skin || 0];
  // 脖子
  g.beginPath(); g.rect(-2, -25, 4, 4); fs(CS(sk[1]), 1);
  if (V.outfit === "plate") {
    // 腰甲裙摆
    g.beginPath(); g.moveTo(-6.6, -12.5); g.lineTo(6.6, -12.5); g.quadraticCurveTo(9.4, -7, 9, -4.6); g.lineTo(-9, -4.6); g.quadraticCurveTo(-9.4, -7, -6.6, -12.5); g.closePath(); fs(shade(C(V.cloth), C(mixHex(V.cloth, "#000000", 0.28)), 0, -12, 0, -4.6), 1.2);
    g.strokeStyle = C(V.trim); g.lineWidth = 1.1; g.beginPath(); g.moveTo(-8.8, -5.4); g.lineTo(8.8, -5.4); g.stroke(); g.beginPath(); g.moveTo(0, -12.3); g.lineTo(0, -5.4); g.stroke();
    // 胸甲
    g.beginPath(); chRR(g, -6.4, -23, 12.8, 11.6, 3.6); fs(shade(C(m0), C(m1), -6, -23, 6, -11), 1.3);
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-4.4, -20.6); g.quadraticCurveTo(-4.6, -17, -3.6, -14.8); g.stroke();
    g.strokeStyle = C(V.trim); g.lineWidth = 1.1; g.beginPath(); g.moveTo(-5.6, -12.8); g.lineTo(5.6, -12.8); g.stroke();
    g.fillStyle = C(V.trim); g.beginPath(); g.moveTo(0, -21.6); g.lineTo(2.1, -18.6); g.lineTo(0, -15.6); g.lineTo(-2.1, -18.6); g.closePath(); g.fill();
    // 肩甲
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 8, -21.4, 4.3, 0, 6.3); fs(shade(C(V.metal[0]), C(V.metal[1]), s * 8 - 3, -25, s * 8 + 3, -18), 1.3); g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.arc(s * 8 - 1.2, -22.8, 1.2, 0, 6.3); g.fill(); }
  } else if (V.outfit === "leather" || V.outfit === "mech") {
    const mech = V.outfit === "mech";
    g.beginPath(); g.moveTo(-6, -12.4); g.lineTo(6, -12.4); g.quadraticCurveTo(8.2, -8, 7.6, -6); g.lineTo(-7.6, -6); g.quadraticCurveTo(-8.2, -8, -6, -12.4); g.closePath(); fs(C(V.cloth), 1.2);
    g.beginPath(); chRR(g, -6, -23, 12, 11.4, mech ? 2 : 3.4); fs(shade(C(m0), C(m1), -6, -23, 6, -11), 1.3);
    if (!mech) { g.beginPath(); g.moveTo(-3.6, -23); g.lineTo(0, -17.6); g.lineTo(3.6, -23); g.closePath(); fs(C(V.cloth === "#f0e8d8" || V.cloth === "#f8f4ec" ? V.cloth : mixHex(V.cloth, "#ffffff", 0.2)), 1); g.strokeStyle = C(m1); g.lineWidth = 1.1; g.beginPath(); g.moveTo(-5.6, -21); g.lineTo(5, -13.4); g.stroke(); g.beginPath(); g.moveTo(5.6, -21); g.lineTo(-5, -13.4); g.stroke(); }
    else { g.fillStyle = C("#ff8a30"); g.beginPath(); g.arc(0, -18, 2.4, 0, 6.3); g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(-0.6, -18.6, 0.9, 0, 6.3); g.fill(); }
    g.beginPath(); chRR(g, -6.4, -13.8, 12.8, 2.6, 1); fs(C(V.boot), 1); g.fillStyle = C(V.trim); g.fillRect(-1.2, -13.6, 2.4, 2.2);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 7.6, -21.4, mech ? 4.2 : 3.2, 0, 6.3); fs(shade(C(V.metal[0]), C(V.metal[1]), s * 7 - 2, -24, s * 7 + 2, -19), 1.2); }
  } else {   // robe
    g.beginPath(); g.moveTo(-6.2, -22.6); g.quadraticCurveTo(0, -24, 6.2, -22.6); g.lineTo(10.2, -4); g.quadraticCurveTo(5, -2.2, 0, -3.4); g.quadraticCurveTo(-5, -2.2, -10.2, -4); g.closePath(); fs(shade(C(m0), C(m1), -6, -22, 8, -3), 1.3);
    g.strokeStyle = C(m1); g.lineWidth = 1; g.beginPath(); g.moveTo(0, -17); g.lineTo(0, -4); g.stroke(); g.beginPath(); g.moveTo(-3.6, -14); g.quadraticCurveTo(-4.6, -9, -6, -5); g.stroke(); g.beginPath(); g.moveTo(3.6, -14); g.quadraticCurveTo(4.6, -9, 6, -5); g.stroke();
    g.strokeStyle = C(V.trim); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, -4.4); g.quadraticCurveTo(0, -2, 10, -4.4); g.stroke();
    g.beginPath(); chRR(g, -6.6, -14.6, 13.2, 2.4, 1); fs(C(V.trim), 1); g.fillStyle = C(V.cloth); g.beginPath(); g.moveTo(-3.4, -22.8); g.lineTo(0, -17.2); g.lineTo(3.4, -22.8); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
    if (V.orb === "star") { g.fillStyle = C("#ffe060"); for (const [px, py, r] of [[-3.6, -9, 1.2], [4, -7, 1], [2.6, -12.6, 0.9]]) { g.beginPath(); g.arc(px, py, r, 0, 6.3); g.fill(); } }
  }
}

// ---------- 盾 ----------
function chShield(g, V, C, OL, fs, bx, bob, atkOn) {
  g.save(); g.translate(-9.4 + bx * 0.6, -15.4 + bob);
  if (V.shield === "kite") { g.beginPath(); g.moveTo(-5.4, -8); g.lineTo(5.4, -8); g.lineTo(5.4, 1); g.quadraticCurveTo(5, 8, 0, 12.4); g.quadraticCurveTo(-5, 8, -5.4, 1); g.closePath(); fs(shade2(g, C(V.metal[0]), C(V.metal[1]), -5, -8, 5, 12), 1.3);
    g.beginPath(); g.moveTo(-3.6, -6.2); g.lineTo(3.6, -6.2); g.lineTo(3.6, 0.6); g.quadraticCurveTo(3.4, 5.6, 0, 9); g.quadraticCurveTo(-3.4, 5.6, -3.6, 0.6); g.closePath(); g.fillStyle = C(V.cloth); g.fill();
    g.fillStyle = C(V.trim); g.fillRect(-0.8, -5, 1.6, 11); g.fillRect(-2.8, -1.4, 5.6, 1.6); }
  else { g.beginPath(); g.arc(0, 0, 6.4, 0, 6.3); fs(shade2(g, C(V.metal[0]), C(V.metal[1]), -5, -5, 5, 5), 1.3); g.beginPath(); g.arc(0, 0, 4.2, 0, 6.3); g.fillStyle = C(V.main[0]); g.fill(); g.fillStyle = C(V.trim); g.beginPath(); g.arc(0, 0, 1.6, 0, 6.3); g.fill(); }
  g.restore();
}

// ---------- 手臂 + 武器 ----------
function chArm(g, V, C, CS, OL, fs, sx, sy, ang, len, isBack, wp, P, t, o) {
  const hx = sx + Math.cos(ang) * len, hy = sy + Math.sin(ang) * len, robe = V.outfit === "robe";
  const w = robe ? 5 : 4, sk = CH_SKINS[V.skin || 0], sleeve = V.outfit === "plate" ? V.main[0] : robe ? V.main[0] : V.main[0];
  g.strokeStyle = OL; g.lineWidth = w + 2.2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
  g.strokeStyle = C(sleeve); g.lineWidth = w; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
  if (robe) { g.strokeStyle = C(V.trim); g.lineWidth = w + 0.2; g.beginPath(); g.moveTo(hx - Math.cos(ang) * 2.6, hy - Math.sin(ang) * 2.6); g.lineTo(hx - Math.cos(ang) * 1.6, hy - Math.sin(ang) * 1.6); g.stroke(); }
  // 手
  const holdsBack = isBack && (wp === "dagger" || wp === "bow");
  if (!isBack || holdsBack) { /* 武器在手后面画，手盖在武器上 */ }
  if (!isBack) chWeapon(g, V, wp, hx, hy, chRad(P.fw !== undefined ? P.fw : -50), P, t, o, C, OL, fs, sx, sy);
  else if (wp === "dagger") chWeapon(g, V, "dagger", hx, hy, chRad(P.bw !== undefined ? P.bw : -40), P, t, o, C, OL, fs, sx, sy, true);
  g.beginPath(); g.arc(hx, hy, 2.3, 0, 6.3); fs(CS(sk[0]), 1.1);
}

function chWeapon(g, V, wp, hx, hy, psi, P, t, o, C, OL, fs, sx, sy, second) {
  const atkT = o.atkT, atkOn = atkT != null && atkT >= 0 && atkT < 0.45 && !o.hurt, cast = (atkOn && atkT > 0.12 && atkT < 0.38) || o.skill;
  g.save(); g.translate(hx, hy);
  if (wp === "sword" || wp === "dagger") {
    const L = wp === "dagger" ? 11 : (V.outfit === "plate" ? 22 : 20); g.rotate(psi);
    if (atkOn && atkT > 0.1 && atkT < 0.26 && !second) {   // 挥砍的弧光
      const a = Math.min(1, (0.26 - atkT) / 0.12);
      g.strokeStyle = `rgba(255,255,255,${(0.6 * a).toFixed(2)})`; g.lineWidth = 4; g.beginPath(); g.arc(-3, 0, L * 0.82, -1.5, 0.1); g.stroke();
      g.strokeStyle = `rgba(190,225,255,${(0.5 * a).toFixed(2)})`; g.lineWidth = 2; g.beginPath(); g.arc(-3, 0, L * 0.95, -1.3, 0.1); g.stroke();
    }
    g.beginPath(); chRR(g, -4.4, -1.4, 6.4, 2.8, 1.2); fs(C("#6a4428"), 1.1);
    g.beginPath(); chRR(g, 1.4, -3.8, 2.4, 7.6, 1.2); fs(C(V.trim), 1.1);
    const glow = o.skill && !second; if (glow) { g.shadowColor = V.eye; g.shadowBlur = 6; }
    g.beginPath(); g.moveTo(3.6, -2.1); g.lineTo(L - 3, -2.1); g.lineTo(L + 1, 0); g.lineTo(L - 3, 2.1); g.lineTo(3.6, 2.1); g.closePath();
    const gr = g.createLinearGradient(0, -2.1, 0, 2.1); gr.addColorStop(0, C("#ffffff")); gr.addColorStop(0.5, C("#d6e0ee")); gr.addColorStop(1, C("#9aa8bc")); fs(gr, 1.2); g.shadowBlur = 0;
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(5, -0.5); g.lineTo(L - 3, -0.5); g.stroke();
  } else if (wp === "lance") {
    g.rotate(psi);
    if (atkOn && atkT > 0.12 && atkT < 0.3) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.4; for (const dy of [-3, 3]) { g.beginPath(); g.moveTo(8, dy); g.lineTo(-6, dy); g.stroke(); } }
    g.beginPath(); chRR(g, -12, -1.3, 42, 2.6, 1.2); fs(C("#7a5434"), 1.1);
    g.beginPath(); g.moveTo(29, -3); g.lineTo(37, 0); g.lineTo(29, 3); g.lineTo(31.4, 0); g.closePath(); fs(shade2(g, C("#ffffff"), C("#9aa8bc"), 29, -3, 29, 3), 1.1);
    g.beginPath(); g.moveTo(25, 0); g.quadraticCurveTo(21, 4 + Math.sin(t * 6) * 1.2, 17, 2 + Math.sin(t * 6 + 1) * 1.4); g.quadraticCurveTo(21, 0.4, 25, -1); g.closePath(); fs(C("#d83a4a"), 0.9);
    g.beginPath(); chRR(g, 24.4, -2.2, 2.4, 4.4, 1); fs(C(V.trim), 0.9);
  } else if (wp === "bow") {
    g.beginPath(); g.moveTo(1, -14); g.bezierCurveTo(9, -9, 9, 9, 1, 14); g.lineWidth = 3.8; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(1, -14); g.bezierCurveTo(9, -9, 9, 9, 1, 14); g.lineWidth = 2.2; g.strokeStyle = C("#a8743c"); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(3.4, -9); g.bezierCurveTo(6.6, -5, 6.6, 2, 5.4, 6); g.stroke();
    const bh = o._bh, draw = P.draw || 0;
    g.strokeStyle = "rgba(245,240,225,.95)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(1, -14);
    if (bh && draw > 0.05) { g.lineTo(bh[0] - hx, bh[1] - hy); } g.lineTo(1, 14); g.stroke();
    if (bh && draw > 0.05) { g.strokeStyle = C("#e8d8b0"); g.lineWidth = 1.2; g.beginPath(); g.moveTo(bh[0] - hx, bh[1] - hy); g.lineTo(8, 0); g.stroke(); g.fillStyle = C("#ffffff"); g.beginPath(); g.moveTo(8, -1.6); g.lineTo(11.5, 0); g.lineTo(8, 1.6); g.closePath(); g.fill(); }
    else if (atkOn && atkT > 0.2 && atkT < 0.3) { g.strokeStyle = "rgba(255,246,200,.8)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(12, 0); g.lineTo(26, 0); g.stroke(); }
  } else if (wp === "staff" || wp === "wand") {
    const wand = wp === "wand", S = wand ? 15 : 27; g.rotate(psi);
    g.beginPath(); chRR(g, wand ? -5 : -12, -1.2, (wand ? 5 : 12) + S - 1, 2.4, 1.1); fs(C(wand ? "#e8eef6" : V.orb === "priest" ? "#e0b040" : "#8a5a30"), 1);
    g.rotate(-psi);   // 宝珠不跟着转，始终正着画；位置按杖头算
    const tx = Math.cos(psi) * S, ty = Math.sin(psi) * S;
    chOrb(g, V, C, OL, fs, tx, ty, cast, t, wand);
    g.rotate(psi);
  } else if (wp === "cannon") {
    g.rotate(psi); const kick = P.kick || 0; g.translate(-kick, 0);
    g.beginPath(); chRR(g, -7, -3.8, 23, 7.6, 2.4); fs(shade2(g, C("#7a7a8c"), C("#3a3a46"), 0, -3.8, 0, 3.8), 1.3);
    g.fillStyle = C("#e0b040"); g.fillRect(2.4, -3.8, 2.4, 7.6); g.fillRect(11.4, -3.8, 1.6, 7.6);
    g.beginPath(); chRR(g, 14.4, -4.6, 3.2, 9.2, 1.2); fs(C("#4a4a58"), 1.1);
    if (atkOn && atkT > 0.2 && atkT < 0.3) { g.fillStyle = "#fff6c0"; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 4 : 8; g.lineTo(21 + Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.fillStyle = "#ff9a30"; g.beginPath(); g.arc(21, 0, 3, 0, 6.3); g.fill(); }
  } else if (wp === "flask") {
    if (!(atkOn && atkT > 0.26)) {
      g.beginPath(); g.arc(1, -6, 4.2, 0, 6.3); fs(C("#d8f6e0"), 1.1); g.beginPath(); g.arc(1, -5.2, 3.2, 0.2, 2.9); g.fillStyle = C("#60e080"); g.fill();
      g.beginPath(); chRR(g, -0.6, -13, 3.2, 4, 1); fs(C("#e8f4ec"), 1); g.fillStyle = C("#b08050"); g.fillRect(-0.4, -14.6, 2.8, 2);
      g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(-0.6, -7.2, 1, 0, 6.3); g.fill();
      const bub = (t * 1.4) % 1; g.fillStyle = "rgba(200,255,210,.85)"; g.beginPath(); g.arc(1 + Math.sin(t * 5) * 1.2, -9 - bub * 5, 0.9, 0, 6.3); g.fill();
    }
  } else if (wp === "lute") {
    g.rotate(psi * 0.2 - 0.3);
    g.beginPath(); g.ellipse(2, 1, 6.2, 5, 0, 0, 6.3); fs(shade2(g, C("#e8a050"), C("#a86a2a"), 0, -5, 0, 6), 1.3);
    g.beginPath(); g.arc(2.6, 1, 1.7, 0, 6.3); g.fillStyle = C("#3a2414"); g.fill();
    g.beginPath(); chRR(g, 6, -1, 15, 2.4, 1); fs(C("#7a4a28"), 1); g.beginPath(); chRR(g, 20, -2.2, 4.4, 4.6, 1.2); fs(C("#4a2c16"), 1);
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(3, 0); g.lineTo(21, 0); g.stroke();
    if (atkOn) { g.fillStyle = C("#f07aa8"); const k = ((t * 6) | 0) % 3; g.font = "bold 7px sans-serif"; g.fillText("♪", 14 + k * 3, -9 - k * 3); }
  } else if (wp === "book") {
    const fl = Math.sin(t * 2.4 + (o.id || 0)) * 1.6, by = -11 + fl - (atkOn ? 3 : 0);
    if (cast || o.skill) { g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(2, by, 1, 2, by, 12); gr.addColorStop(0, "rgba(122,240,224,.7)"); gr.addColorStop(1, "rgba(122,240,224,0)"); g.fillStyle = gr; g.fillRect(-12, by - 14, 28, 28); g.globalCompositeOperation = "source-over"; }
    g.beginPath(); g.moveTo(-6, by - 4); g.lineTo(2, by - 2.6); g.lineTo(10, by - 4); g.lineTo(10, by + 4); g.lineTo(2, by + 5.4); g.lineTo(-6, by + 4); g.closePath(); fs(C("#7a5434"), 1.2);
    g.beginPath(); g.moveTo(-5, by - 3); g.lineTo(2, by - 1.8); g.lineTo(2, by + 4.2); g.lineTo(-5, by + 3); g.closePath(); g.fillStyle = C("#f6efe0"); g.fill();
    g.beginPath(); g.moveTo(9, by - 3); g.lineTo(2, by - 1.8); g.lineTo(2, by + 4.2); g.lineTo(9, by + 3); g.closePath(); g.fillStyle = C("#efe6d2"); g.fill();
    g.fillStyle = C("#3ab0a8"); g.fillRect(-3.6, by - 0.8, 4, 0.8); g.fillRect(3.6, by - 0.4, 4, 0.8); g.fillRect(-3.6, by + 1.2, 3, 0.8);
  }
  g.restore();
}
// 杖头宝珠
function chOrb(g, V, C, OL, fs, x, y, cast, t, wand) {
  const kind = V.orb, pulse = cast ? 1 : (Math.sin(t * 3) * 0.5 + 0.5) * 0.35;
  const col = kind === "mage" ? "#b070ff" : kind === "priest" ? "#ffe080" : kind === "star" ? "#a0b8ff" : "#a0f0ff";
  g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(x, y, 0.5, x, y, 11); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalAlpha = 0.25 + pulse * 0.55; g.fillStyle = gr; g.fillRect(x - 12, y - 12, 24, 24); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  if (kind === "priest") { g.beginPath(); g.arc(x, y - 2.4, 3.8, 0, 6.3); g.lineWidth = 2.6; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = C("#f0c040"); g.stroke(); g.fillStyle = C("#fff6c0"); g.beginPath(); g.arc(x, y - 2.4, 1.4, 0, 6.3); g.fill(); }
  else if (kind === "star") { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.4 : 5; g.lineTo(x + Math.cos(a) * r, y - 2 + Math.sin(a) * r); } g.closePath(); fs(shade2(g, C("#ffffff"), C("#a0b8ff"), x, y - 7, x, y + 3), 1.1); }
  else if (kind === "frost") { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 3.4, y - 2); g.lineTo(x, y + 3); g.lineTo(x - 3.4, y - 2); g.closePath(); fs(shade2(g, C("#e8fcff"), C("#4fb8e8"), x, y - 8, x, y + 3), 1.1); g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(x - 1.4, y - 5.6, 1, 3); }
  else { g.beginPath(); g.arc(x, y - 2.4, 4, 0, 6.3); fs(shade2(g, C("#e0b8ff"), C("#7a3ad0"), x - 3, y - 6, x + 3, y + 2), 1.2); g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(x - 1.3, y - 3.8, 1.2, 0, 6.3); g.fill(); }
}

// ---------- 头（脸、眼睛、头发、头饰） ----------
function chHead(g, V, C, CS, OL, fs, shade, skin, t, id, blink, hurt, atkOn, o) {
  const sk = [CS(skin[0]), CS(skin[1])], [h0, h1, h2] = V.hc, fx = 1.1;
  const hairFill = () => shade(C(h0), C(h1), 0, -16, 0, 6);
  // 精灵耳朵
  if (V.ears) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 11.4, -1.6); g.quadraticCurveTo(s * 17, -4.4, s * 21.4, -9.4); g.quadraticCurveTo(s * 18.2, 0, s * 12.4, 3.8); g.closePath(); fs(sk[0], 1.1); g.fillStyle = "rgba(240,150,150,.35)"; g.beginPath(); g.moveTo(s * 13.4, -1.4); g.quadraticCurveTo(s * 16.6, -3.4, s * 18.6, -6); g.quadraticCurveTo(s * 16.4, -0.6, s * 13.2, 1.6); g.fill(); }
  // 脸
  g.beginPath(); g.moveTo(-12.4, -1); g.bezierCurveTo(-12.4, -8, -7, -11.4, 0, -11.4); g.bezierCurveTo(7, -11.4, 12.4, -8, 12.4, -1); g.bezierCurveTo(12.4, 6, 6, 11, 0, 11.4); g.bezierCurveTo(-6, 11, -12.4, 6, -12.4, -1); g.closePath();
  const fg = g.createRadialGradient(-2, -2, 1.5, 0, 2, 15); fg.addColorStop(0, sk[0]); fg.addColorStop(0.7, sk[0]); fg.addColorStop(1, sk[1]); fs(fg, 1.4);
  if (!o.flash) { g.fillStyle = "rgba(255,110,125,.34)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 7.4 + fx, 4.6, 2.6, 1.5, 0, 0, 6.3); g.fill(); } }
  // 眼睛
  const eyeCol = V.eye, dark = mixHex(eyeCol, "#10101c", 0.55);
  const eye = (ex, ey) => {
    if (hurt) { g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex - 2.4, ey - 2.4); g.lineTo(ex + 1.4, ey); g.lineTo(ex - 2.4, ey + 2.4); g.stroke(); return; }
    if (blink) { g.strokeStyle = OL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex - 3.1, ey + 0.4); g.quadraticCurveTo(ex, ey + 2.8, ex + 3.1, ey + 0.4); g.stroke(); return; }
    g.beginPath(); g.ellipse(ex, ey, 3.2, 4, 0, 0, 6.3); g.fillStyle = CS("#ffffff"); g.fill();
    const ig = g.createLinearGradient(0, ey - 3.6, 0, ey + 3.6); ig.addColorStop(0, C(dark)); ig.addColorStop(0.55, C(eyeCol)); ig.addColorStop(1, C(mixHex(eyeCol, "#ffffff", 0.45)));
    g.beginPath(); g.ellipse(ex + 0.2, ey + 0.5, 2.6, 3.4, 0, 0, 6.3); g.fillStyle = ig; g.fill();
    g.fillStyle = C("#1a1220"); g.beginPath(); g.ellipse(ex + 0.2, ey + 0.6, 1.2, 1.9, 0, 0, 6.3); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ex - 0.9, ey - 1.2, 1.05, 0, 6.3); g.fill(); g.beginPath(); g.arc(ex + 1.1, ey + 1.7, 0.55, 0, 6.3); g.fill();
    g.strokeStyle = OL; g.lineWidth = 1.7; g.beginPath(); g.ellipse(ex, ey, 3.2, 4, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
  };
  eye(-5 + fx, 0.9); eye(5 + fx, 0.9);
  g.strokeStyle = C(h1); g.lineWidth = 1.1; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 5 + fx - 2.4, -5.3); g.quadraticCurveTo(s * 5 + fx, hurt ? -5.2 : -6.6, s * 5 + fx + 2.4, -5.6 + (hurt ? 1 : 0)); g.stroke(); }
  g.fillStyle = C(sk[1]); g.beginPath(); g.arc(fx * 0.9, 5, 0.65, 0, 6.3); g.fill();
  // 嘴
  g.strokeStyle = C("#a8484e"); g.lineWidth = 1.1;
  if (hurt) { g.beginPath(); g.moveTo(fx - 2, 8.4); g.lineTo(fx - 0.7, 7.2); g.lineTo(fx + 0.7, 8.4); g.lineTo(fx + 2, 7.2); g.stroke(); }
  else if (atkOn) { g.beginPath(); g.ellipse(fx, 7.8, 1.7, 1.6, 0, 0, 6.3); g.fillStyle = C("#7a2a34"); g.fill(); g.stroke(); }
  else { g.beginPath(); g.moveTo(fx - 1.9, 7.1); g.quadraticCurveTo(fx, 8.9, fx + 1.9, 7.1); g.stroke(); }
  // 头发 / 兜帽 / 头盔
  chHairFront(g, V, C, OL, fs, shade, hairFill, t, id, fx);
  chGear(g, V, C, OL, fs, shade, t, id);
  // 转职：A 光环 / B 犄角
  if (o.lv >= 4) {
    if (o.branch !== "B") { const b = Math.sin(t * 3 + id) * 0.8; g.strokeStyle = C("#ffe060"); g.lineWidth = 1.8; g.shadowColor = "#ffe060"; g.shadowBlur = 4; g.beginPath(); g.ellipse(0, -21 + b, 9, 2.8, 0, 0, 6.3); g.stroke(); g.shadowBlur = 0; }
    else for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 7, -13); g.quadraticCurveTo(s * 11, -19, s * 8, -26); g.quadraticCurveTo(s * 13, -20, s * 11.4, -12); g.closePath(); fs("#7a1010", 1.1); }
  }
}

function chHairFront(g, V, C, OL, fs, shade, hairFill, t, id, fx) {
  const [h0, h1, h2] = V.hc;
  if (V.hair === "hood") {
    const [x0, x1] = V.hood; const mask = V.gear === "mask" || V.gear === "mask2";
    // 刘海露一点
    g.beginPath(); chSmoothPath(g, [[-9.6, -4], [-9, -9.6], [0, -11.8], [9, -9.6], [9.6, -4], [6.4, -6.8], [3.2, -2.4], [0.2, -7], [-3, -2.6], [-6.2, -6.6]], true); fs(hairFill(), 1.1);
    // 兜帽外圈（evenodd 挖出脸）
    g.beginPath(); chSmoothPath(g, [[-14.4, -1], [-14.8, -11], [-8, -18], [0, -19.6], [8, -18], [14.8, -11], [14.4, -1], [13.6, 9], [8, 14], [0, 12.4], [-8, 14], [-13.6, 9]], true);
    chSmoothPath(g, [[-9.8, -3], [-8.4, -10], [0, -12.4], [8.4, -10], [9.8, -3], [9.2, 5.4], [5, 10.6], [0, 11.8], [-5, 10.6], [-9.2, 5.4]], true);
    g.fillStyle = shade(C(x0), C(x1), 0, -18, 0, 12); g.fill("evenodd"); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke();
    if (V.gear === "veil") { g.strokeStyle = C(V.trim); g.lineWidth = 1.3; g.beginPath(); chSmoothPath(g, [[-9.8, -3], [-8.4, -10], [0, -12.4], [8.4, -10], [9.8, -3], [9.2, 5.4], [5, 10.6], [0, 11.8], [-5, 10.6], [-9.2, 5.4]], true); g.stroke(); g.fillStyle = C(V.trim); g.beginPath(); g.arc(0, -15, 1.6, 0, 6.3); g.fill(); }
    if (mask) { g.beginPath(); g.moveTo(-9.6, 3); g.quadraticCurveTo(0, 5.4, 9.6, 3); g.quadraticCurveTo(8, 11.4, 0, 12.2); g.quadraticCurveTo(-8, 11.4, -9.6, 3); g.closePath(); fs(shade(C(x1), C(x0), 0, 3, 0, 12), 1.2); }
    return;
  }
  if (V.gear === "plumehelm") { return; }
  // 头顶 + 刘海
  const dome = [[-13.6, -1], [-14.4, -9], [-8, -15], [0, -16.2], [8, -15], [14.4, -9], [13.6, -1]];
  const lower = [[10.8, -5.2], [9, -1], [6.4, -5.8], [3.4, -1.4], [0.4, -6.2], [-2.6, -1.8], [-5.8, -6.6], [-9, -2], [-10.8, -5.2]];
  g.beginPath(); chSmoothPath(g, dome.concat(lower), true); fs(hairFill(), 1.3);
  g.strokeStyle = C(h2); g.globalAlpha = 0.75; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8.4, -11.4); g.quadraticCurveTo(-3, -14.4, 2.6, -14.2); g.stroke(); g.globalAlpha = 1;
  if (V.hair !== "bob" || true) for (const s of [-1, 1]) {
    const len = V.hair === "long" ? 12 : V.hair === "bob" ? 7.6 : V.hair === "twin" ? 8 : 6.4;
    g.beginPath(); g.moveTo(s * 12.2, -4); g.quadraticCurveTo(s * 16, 3, s * 13.8, len); g.quadraticCurveTo(s * 11.2, len - 4, s * 10, -2); g.closePath(); fs(shade(C(h0), C(h1), 0, -4, 0, len), 1.1);
  }
}

function chGear(g, V, C, OL, fs, shade, t, id) {
  const gear = V.gear, [h0, h1] = V.hc;
  if (gear === "circlet") { g.strokeStyle = OL; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-12.2, -8); g.quadraticCurveTo(0, -14.4, 12.2, -8); g.stroke(); g.strokeStyle = C(V.trim); g.lineWidth = 1.8; g.stroke(); g.fillStyle = C("#6ab8ff"); g.beginPath(); g.arc(0, -12.6, 1.8, 0, 6.3); g.fill(); }
  else if (gear === "bandana") { g.beginPath(); g.moveTo(-13, -6.4); g.quadraticCurveTo(0, -12.6, 13, -6.4); g.lineTo(13, -9.6); g.quadraticCurveTo(0, -15.6, -13, -9.6); g.closePath(); fs(C(V.cloth), 1.2); g.beginPath(); g.moveTo(-12.4, -8); g.quadraticCurveTo(-18, -7 + Math.sin(t * 5) * 1.5, -21, -2 + Math.sin(t * 5 + 1) * 2); g.quadraticCurveTo(-17, -9, -12.6, -10); g.closePath(); fs(C(V.cloth), 1); }
  else if (gear === "leaf") { g.beginPath(); g.moveTo(8.6, -12); g.quadraticCurveTo(15, -17, 18.6, -12); g.quadraticCurveTo(13, -8.6, 8.6, -12); g.closePath(); fs(C("#6fd07a"), 1.1); g.strokeStyle = C("#2f8a4a"); g.lineWidth = 0.8; g.beginPath(); g.moveTo(9.6, -11.6); g.lineTo(16.4, -12.6); g.stroke(); }
  else if (gear === "wings") { g.strokeStyle = OL; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-12.2, -8); g.quadraticCurveTo(0, -14.4, 12.2, -8); g.stroke(); g.strokeStyle = C(V.metal[0]); g.lineWidth = 1.8; g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 12, -9); g.quadraticCurveTo(s * 17, -17, s * 24, -15.4); g.quadraticCurveTo(s * 19, -12.4, s * 21.4, -9.4); g.quadraticCurveTo(s * 17, -9.6, s * 14, -5.4); g.closePath(); fs(C("#ffffff"), 1.1); } }
  else if (gear === "wizhat") {
    g.beginPath(); g.moveTo(-11.6, -11); g.quadraticCurveTo(-6, -22, 2, -30); g.quadraticCurveTo(6, -37, 14, -39); g.quadraticCurveTo(9, -33, 10.4, -26); g.quadraticCurveTo(12.4, -18, 11.6, -11); g.closePath(); fs(shade(C(V.main[0]), C(V.main[1]), 0, -38, 0, -10), 1.3);
    g.beginPath(); g.ellipse(0, -11, 19.6, 4.6, -0.04, 0, 6.3); fs(shade(C(V.main[0]), C(V.main[1]), 0, -16, 0, -6), 1.3);
    g.beginPath(); g.moveTo(-11.4, -13.4); g.quadraticCurveTo(0, -9.6, 11.4, -13.4); g.lineTo(11.6, -11); g.quadraticCurveTo(0, -7.4, -11.6, -11); g.closePath(); fs(C(V.trim), 1); g.fillStyle = C("#fff0a0"); g.beginPath(); g.arc(14, -38, 1.8, 0, 6.3); g.fill(); }
  else if (gear === "goggles") { g.strokeStyle = OL; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-13.2, -7.4); g.quadraticCurveTo(0, -12.6, 13.2, -7.4); g.stroke(); g.strokeStyle = C("#6a4a30"); g.lineWidth = 2; g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 5.6, -10.2, 3.6, 0, 6.3); fs(C("#3a3a44"), 1.1); g.beginPath(); g.arc(s * 5.6, -10.2, 2.4, 0, 6.3); g.fillStyle = C(V.gear === "goggles" && V.eye === "#ff8a30" ? "#ff8a30" : "#9ad8f0"); g.fill(); g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(s * 5.6 - 0.8, -11, 0.8, 0, 6.3); g.fill(); } }
  else if (gear === "featherCap") {
    g.beginPath(); g.moveTo(-13.4, -7.6); g.quadraticCurveTo(-12, -17.6, -1, -18.4); g.quadraticCurveTo(10, -18, 12.6, -9.6); g.quadraticCurveTo(16, -9.4, 18, -7.6); g.quadraticCurveTo(6, -4.4, -13.4, -7.6); g.closePath(); fs(shade(C(V.main[0]), C(V.main[1]), 0, -18, 0, -6), 1.3);
    g.beginPath(); g.moveTo(8, -15); g.quadraticCurveTo(15, -26, 24, -22); g.quadraticCurveTo(17, -21.6, 11.6, -13.6); g.closePath(); fs(C("#f07aa8"), 1.1); g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(10, -15); g.quadraticCurveTo(15, -21, 21, -22); g.stroke(); }
  else if (gear === "icecrown") { for (const [dx, h, w] of [[-8, 7, 2.6], [-4, 10, 2.8], [0, 13, 3], [4, 10, 2.8], [8, 7, 2.6]]) { g.beginPath(); g.moveTo(dx - w, -12.4 + Math.abs(dx) * 0.12); g.lineTo(dx, -12.4 - h); g.lineTo(dx + w, -12.4 + Math.abs(dx) * 0.12); g.closePath(); fs(shade(C("#f4fdff"), C("#7ad0f0"), dx, -12 - h, dx, -10), 1); } }
  else if (gear === "startiara") { g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.moveTo(-9, -10); g.quadraticCurveTo(0, -15, 9, -10); g.stroke(); g.strokeStyle = C(V.trim); g.lineWidth = 1.6; g.stroke(); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.4; g.lineTo(Math.cos(a) * r, -17 + Math.sin(a) * r); } g.closePath(); fs(C("#ffe060"), 1); }
  else if (gear === "hourglass") { const b = Math.sin(t * 2 + id) * 1; g.save(); g.translate(0, -24 + b); g.beginPath(); g.moveTo(-4.6, -5); g.lineTo(4.6, -5); g.lineTo(0.8, 0); g.lineTo(4.6, 5); g.lineTo(-4.6, 5); g.lineTo(-0.8, 0); g.closePath(); fs("rgba(255,255,255,.55)", 1.2); g.fillStyle = C("#ffd040"); g.beginPath(); g.moveTo(-3, 4.4); g.lineTo(3, 4.4); g.lineTo(0.6, 1.4); g.lineTo(-0.6, 1.4); g.closePath(); g.fill(); g.fillStyle = C(V.trim); g.fillRect(-5.2, -6, 10.4, 1.6); g.fillRect(-5.2, 4.6, 10.4, 1.6); g.restore(); }
  else if (gear === "plumehelm") {
    g.beginPath(); g.moveTo(-13.4, -1); g.bezierCurveTo(-15, -12, -8, -17.4, 0, -17.6); g.bezierCurveTo(8, -17.4, 15, -12, 13.4, -1); g.lineTo(11, -1); g.lineTo(11, -6); g.quadraticCurveTo(0, -11, -11, -6); g.lineTo(-11, -1); g.closePath(); fs(shade(C(V.main[0]), C(V.main[1]), 0, -17, 0, -2), 1.3);
    g.strokeStyle = C(V.trim); g.lineWidth = 1.3; g.beginPath(); g.moveTo(-11.4, -6.6); g.quadraticCurveTo(0, -11.4, 11.4, -6.6); g.stroke();
    g.beginPath(); g.moveTo(-2, -17); g.quadraticCurveTo(-14, -30 + Math.sin(t * 3) * 1.2, -20, -14); g.quadraticCurveTo(-12, -22, 3, -16.4); g.closePath(); fs(C("#c83a4a"), 1.2);
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-6.6, -15.4); g.quadraticCurveTo(-2, -17.4, 3, -16.4); g.stroke(); }
  else if (gear === "pearl") { for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(i * 3.4, -12.6 + Math.abs(i) * 0.9 - 2.4 + (3 - Math.abs(i)) * -0.2, 1.5, 0, 6.3); fs(C("#f8fdff"), 0.9); } }
}

// ---------- 静态图（头像、对话半身像、技能特写）：画进 256×256 的缓存画布，脚底在 (128, 226)，1 个角色单位 = 4 像素 ----------
const HERO_PIC = new Map(), HERO_PIC_POOL = [];
function heroPic(D, o) {
  o = o || {};
  const key = [D.id, o.lv || 1, o.branch || "", o.face || 1, o.flash ? 1 : 0].join("|");
  let c = HERO_PIC.get(key); if (c) return c;
  if (HERO_PIC.size >= 60) { for (const v of HERO_PIC.values()) HERO_PIC_POOL.push(v); HERO_PIC.clear(); }
  c = HERO_PIC_POOL.pop() || document.createElement("canvas"); c.width = 256; c.height = 256;   // 赋宽高顺便清空
  const g = c.getContext("2d");
  if (!drawChibi(g, D, { t: 0.6, id: 1, face: o.face || 1, lv: o.lv || 1, branch: o.branch, flash: o.flash }, 128, 226, 4)) {
    const old = renderHero(D, { phase: "idle", face: o.face || 1 }); g.imageSmoothingEnabled = false; g.drawImage(old, 0, 0, 96, 88, 128 - 96, 226 - 160, 192, 176);
  }
  HERO_PIC.set(key, c); return c;
}
