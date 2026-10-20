
// ---------- 像素角色：1 倍画好后用 Scale2x 放大 ----------
// 魔兽风格：头小、肩宽、重甲大肩甲（头 10 : 身体 10 : 腿 7），不再是大头 Q 版。
// 角色 = 头 + 身体 + 腿 + 披风/背饰/头饰。头、身体、饰品用 mk() 按矩形一层层涂出来，最后自动描黑边（空位旁边有颜色就变黑线），
// 所以每个形状要离画布边缘留 1 格。调色盘字母：H/h/L 头发(主/暗/亮) S/s 皮肤(主/暗) E 眼睛 q 嘴 M/m/l 肩甲金属(主/暗/亮)
// A/a 胸甲或衣服(主/暗) B 衬布 Y 镶边 P/p 长袍(主/暗) X/c 兜帽(主/暗) G 护目镜
function mk(w, h, ops) {
  const g = Array.from({ length: h }, () => Array(w).fill("."));
  for (const [c, x, y, ww, hh] of ops) for (let j = y; j < y + (hh || 1); j++) for (let i = x; i < x + (ww || 1); i++) if (j >= 0 && j < h && i >= 0 && i < w) g[j][i] = c;
  const o = g.map(r => r.slice());
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j][i] === ".") {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = g[j + dy] && g[j + dy][i + dx]; if (a && a !== ".") { o[j][i] = "K"; break; } }
  }
  return o.map(r => r.join(""));
}
const HW = 11, HH = 10, BW = 17, BH = 10;   // 头、身体画布大小
// 脸的位置都一样：眼睛在 (3,5) 和 (7,5)，受击时在这里画眯眼
const FACE_EYES = [[3, 5], [7, 5]];
const HEADS = {
  // 女性长发（发型靠 hairBack 往肩上垂）
  hair: mk(HW, HH, [["H", 1, 1, 9, 3], ["H", 1, 4, 1, 5], ["H", 9, 4, 1, 5], [".", 1, 1], [".", 9, 1], ["L", 3, 1, 3, 1], ["S", 2, 4, 7, 4], ["S", 3, 8, 5, 1], ["h", 1, 8], ["h", 9, 8], ["h", 3, 4], ["h", 7, 4],
    ["E", 3, 5], ["E", 7, 5], ["s", 5, 6], ["q", 5, 7], ["s", 2, 7], ["s", 8, 7]]),
  // 敞脸头盔
  helm: mk(HW, HH, [["T", 1, 1, 9, 4], ["T", 1, 5, 2, 4], ["T", 8, 5, 2, 4], [".", 1, 1], [".", 9, 1], ["u", 3, 1, 3, 1], ["u", 2, 2], ["t", 2, 4, 7, 1], ["S", 3, 5, 5, 3], ["S", 4, 8, 3, 1], ["t", 5, 5, 1, 2],
    ["E", 3, 5], ["E", 7, 5], ["q", 5, 7], ["t", 2, 8], ["t", 8, 8]]),
  // 兜帽（露出脸）
  hood: mk(HW, HH, [["X", 1, 1, 9, 8], [".", 1, 1], [".", 9, 1], ["c", 3, 3, 5, 1], ["c", 2, 4, 1, 4], ["c", 8, 4, 1, 4], ["S", 3, 4, 5, 4], ["E", 3, 5], ["E", 7, 5], ["q", 5, 7], ["X", 4, 8, 3, 1], ["c", 1, 8, 9, 1], ["u", 3, 1, 3, 1]]),
  // 兜帽 + 面罩（刺客）
  mask: mk(HW, HH, [["X", 1, 1, 9, 8], [".", 1, 1], [".", 9, 1], ["c", 3, 3, 5, 1], ["c", 2, 4, 1, 4], ["c", 8, 4, 1, 4], ["S", 3, 4, 5, 2], ["E", 3, 5], ["E", 7, 5], ["c", 3, 6, 5, 3], ["X", 4, 7, 3, 1], ["u", 3, 1, 3, 1]]),
};
const BODIES = {
  plate: mk(BW, BH, [["M", 1, 1, 5, 3], ["M", 11, 1, 5, 3], [".", 1, 1], [".", 15, 1], ["l", 2, 1, 2, 1], ["m", 1, 3, 5, 1], ["m", 11, 3, 5, 1], ["A", 6, 1, 5, 2], ["M", 2, 4, 2, 4], ["m", 2, 7, 2, 1],
    ["A", 4, 3, 9, 5], ["a", 11, 3, 2, 5], ["l", 5, 3, 1, 3], ["Y", 8, 3, 1, 3], ["Y", 7, 4, 3, 1], ["Y", 4, 6, 9, 1], ["B", 6, 7, 5, 3], ["Y", 8, 8, 1, 2]]),
  leather: mk(BW, BH, [["M", 2, 1, 4, 3], ["M", 11, 1, 4, 3], [".", 2, 1], [".", 14, 1], ["l", 3, 1, 2, 1], ["B", 6, 1, 5, 2], ["A", 2, 4, 3, 4], ["a", 2, 7, 3, 1],
    ["A", 5, 2, 7, 6], ["a", 11, 2, 1, 6], ["l", 5, 2, 1, 4], ["B", 5, 4, 7, 1], ["Y", 5, 6, 7, 1], ["B", 6, 7, 5, 3], ["a", 8, 7, 1, 3]]),
  robe: mk(BW, BH, [["P", 2, 1, 13, 3], [".", 2, 1], [".", 14, 1], ["Y", 6, 1, 5, 1], ["P", 4, 3, 9, 7], ["P", 3, 7, 11, 3], ["p", 11, 3, 2, 7], ["p", 12, 7, 2, 3], ["l", 4, 2, 3, 1], ["Y", 4, 6, 9, 1], ["p", 8, 4, 1, 6], ["Y", 3, 9, 11, 1],
    ["p", 2, 3, 2, 5], ["P", 2, 4, 2, 4]]),
  mech: mk(BW, BH, [["M", 1, 1, 5, 4], ["M", 11, 1, 5, 4], [".", 1, 1], [".", 15, 1], ["l", 2, 1, 2, 1], ["m", 1, 4, 5, 1], ["m", 11, 4, 5, 1], ["Y", 3, 2, 1, 1], ["Y", 13, 2, 1, 1], ["A", 6, 1, 5, 2],
    ["A", 4, 3, 9, 5], ["a", 4, 3, 1, 5], ["a", 11, 3, 2, 5], ["E", 7, 4, 3, 2], ["Y", 7, 6, 3, 1], ["m", 5, 7, 7, 1], ["B", 6, 8, 5, 2], ["M", 2, 5, 2, 3]]),
};
const BODY_LEGS = { plate: 7, leather: 7, robe: 2, mech: 7 };
// 头饰 / 背饰（相对头的左上角摆放）
const mkItem = (w, h, ops) => mk(w, h, ops);
const IT = {
  wizHat: mkItem(17, 12, [["P", 1, 8, 15, 2], ["P", 4, 6, 9, 2], ["P", 5, 4, 7, 2], ["P", 6, 2, 5, 2], ["P", 8, 1, 3, 1], ["Y", 4, 7, 9, 1], ["p", 1, 9, 15, 1], ["l", 5, 5, 2, 1]]),
  plumeR: mkItem(7, 8, [["R", 2, 1, 3, 5], ["R", 1, 3, 1, 3], ["R", 5, 2, 1, 4], ["r", 3, 1, 1, 2]]),
  wings: mkItem(15, 7, [["l", 1, 1, 3, 2], ["l", 2, 3, 3, 1], ["l", 11, 1, 3, 2], ["l", 10, 3, 3, 1], ["Y", 4, 4, 1, 1], ["Y", 10, 4, 1, 1], ["m", 3, 2, 1, 1], ["m", 11, 2, 1, 1]]),
  goggles: mkItem(11, 3, [["G", 1, 0, 9, 1], ["l", 2, 1, 2, 2], ["l", 7, 1, 2, 2], ["m", 4, 1, 3, 1]]),
  featherCap: mkItem(15, 10, [["X", 1, 5, 11, 3], ["c", 1, 7, 11, 1], ["X", 3, 3, 7, 3], ["F", 9, 0, 2, 6], ["F", 11, 1, 2, 3], ["l", 9, 1, 1, 3]]),
  crown: mkItem(11, 6, [["l", 1, 3, 9, 2], ["l", 1, 1, 1, 2], ["l", 5, 0, 1, 3], ["l", 9, 1, 1, 2], ["Y", 3, 4, 1, 1], ["Y", 7, 4, 1, 1]]),
  starTiara: mkItem(11, 7, [["Y", 5, 0, 1, 3], ["Y", 4, 1, 3, 1], ["Y", 3, 3, 5, 1], ["E", 5, 1, 1, 1]]),
  hourglass: mkItem(9, 9, [["Y", 1, 1, 7, 1], ["l", 2, 2, 5, 2], ["Y", 4, 4, 1, 1], ["E", 4, 5, 1, 1], ["l", 3, 6, 3, 1], ["Y", 1, 8, 7, 1], ["E", 2, 7, 5, 1]]),
  horns: mkItem(15, 7, [["l", 1, 0, 2, 3], ["l", 2, 3, 2, 2], ["l", 12, 0, 2, 3], ["l", 11, 3, 2, 2]]),
  bandana: mkItem(11, 3, [["Y", 1, 0, 9, 1], ["Y", 9, 1, 2, 2]]),
  helmSpike: mkItem(5, 6, [["l", 2, 0, 1, 4], ["m", 1, 3, 3, 1]]),
};
const BACKS = {
  capeRed: mk(15, 14, [["R", 1, 0, 13, 13], ["r", 1, 9, 13, 4], ["Y", 1, 0, 13, 1], [".", 1, 12, 2], [".", 12, 12, 2]]),
  quiver: mk(5, 12, [["N", 1, 1, 3, 9], ["Y", 1, 1, 3, 1], ["W", 1, 0, 1, 2], ["W", 3, 0, 1, 2], ["n", 1, 8, 3, 2]]),
  banner: mk(9, 20, [["N", 1, 0, 1, 19], ["R", 2, 1, 6, 8], ["r", 2, 7, 6, 2], ["Y", 4, 3, 2, 3], [".", 6, 9, 2, 1], ["l", 1, 0, 1, 1]]),
  tanks: mk(15, 10, [["G", 1, 1, 4, 7], ["G", 10, 1, 4, 7], ["l", 2, 2, 1, 3], ["l", 11, 2, 1, 3], ["m", 1, 4, 4, 1], ["m", 10, 4, 4, 1], ["Y", 5, 3, 5, 1]]),
  cannons: mk(21, 10, [["M", 1, 2, 4, 6], ["M", 16, 2, 4, 6], ["m", 1, 4, 4, 1], ["m", 16, 4, 4, 1], ["Y", 2, 1, 2, 1], ["Y", 17, 1, 2, 1], ["E", 2, 6, 2, 1], ["E", 17, 6, 2, 1]]),
  totem: mk(7, 12, [["N", 2, 1, 3, 10], ["E", 3, 2, 1, 1], ["Y", 2, 4, 3, 1], ["E", 3, 6, 1, 1], ["Y", 1, 8, 5, 1]]),
};
const BASE_PAL = { K: OUT, S: "#ffdcc4", s: "#f0b898", E: "#241830", q: "#c06060", W: "#f0ece0", N: "#8a5a30", n: "#5a3a1a", Y: "#e8c050", l: "#ffffff", u: "#ffffff", G: "#6a7078", T: "#c8d0dc", t: "#8a94a8", R: "#c83a4a", r: "#8a2030", F: "#f07aa8" };
const SHIELD_K = mk(10, 13, [["Y", 1, 1, 8, 8], ["Y", 2, 9, 6, 1], ["Y", 3, 10, 4, 1], ["A", 2, 2, 6, 6], ["A", 3, 8, 4, 1], ["A", 4, 9, 2, 1], ["Y", 4, 3, 2, 6], ["Y", 3, 5, 4, 1], ["a", 7, 2, 1, 6]]);
const SHIELD_C = mk(9, 9, [["M", 1, 1, 7, 7], [".", 1, 1], [".", 7, 1], [".", 1, 7], [".", 7, 7], ["A", 2, 2, 5, 5], ["Y", 4, 3, 1, 3], ["Y", 3, 4, 3, 1]]);
const HERO = {
  knight: { head: "helm", body: "plate", hairBack: 7, legs: "#4a5a8a", boot: "#b8c0d0", sleeve: "#e8c050", weapon: "sword", blade: 9, shield: SHIELD_K,
    back: [{ it: "capeRed", x: -2, y: 5 }],
    pal: { H: "#f0c860", h: "#b88a30", L: "#fff0a0", T: "#d8e0ec", t: "#8a98b0", u: "#ffffff", M: "#e8c050", m: "#a8802a", l: "#fff4c0", A: "#3a5cc0", a: "#26408c", B: "#f0f0f8", Y: "#ffe070", R: "#3a5cc0", r: "#26408c" } },
  sword: { head: "hair", body: "leather", hairBack: 6, legs: "#4a3038", boot: "#2a1c1c", sleeve: "#7a2a30", weapon: "sword", blade: 11,
    top: [{ it: "bandana", x: 0, y: 2 }],
    pal: { H: "#d83848", h: "#8a1c2c", L: "#ff8090", M: "#6a6a78", m: "#44444e", l: "#c0c0d0", A: "#8a2a34", a: "#5a1a22", B: "#4a3038", Y: "#d83040" } },
  assassin: { head: "mask", body: "leather", legs: "#2e3440", boot: "#1c2028", sleeve: "#2e3440", weapon: "dagger",
    pal: { X: "#2e4450", c: "#1a2830", u: "#5a7a88", M: "#2e4450", m: "#1a2830", l: "#5a7a88", A: "#2e3440", a: "#1c2028", B: "#2a8a7c", Y: "#4fc0b0", E: "#40e0c0" } },
  lancer: { head: "helm", body: "plate", hairBack: 6, legs: "#2c6a66", boot: "#a88838", sleeve: "#2c7f7a", weapon: "lance",
    top: [{ it: "wings", x: -2, y: 1 }], back: [{ it: "capeRed", x: -2, y: 5 }],
    pal: { H: "#3a4a88", h: "#232c5a", L: "#6a80c8", T: "#e0c070", t: "#a88838", u: "#fff0b0", M: "#e0c070", m: "#a88838", l: "#fff0b0", A: "#2c7f7a", a: "#1c5450", B: "#3a4a88", Y: "#e8c050", R: "#3a4a88", r: "#232c5a" } },
  archer: { head: "hair", body: "leather", hairBack: 9, ears: true, legs: "#5a6a38", boot: "#6a4428", sleeve: "#4fa050", weapon: "bow",
    back: [{ it: "quiver", x: 9, y: 4 }],
    pal: { H: "#f6e6a8", h: "#c8b070", L: "#fffbe0", M: "#6a4428", m: "#4a2c18", l: "#9a6a34", A: "#4fa050", a: "#2f6a38", B: "#8a5a30", Y: "#d8b050" } },
  mage: { head: "hair", body: "robe", hairBack: 7, legs: "#4a2c70", boot: "#4a2c70", sleeve: "#7a4cc0", weapon: "staff", orb: "mage",
    top: [{ it: "wizHat", x: -3, y: -6 }],
    pal: { H: "#9058c8", h: "#5a3088", L: "#c090f0", P: "#7a4cc0", p: "#4a2c80", Y: "#f0c040", l: "#b090f0" } },
  gunner: { head: "hair", body: "leather", hairBack: 5, legs: "#5a3a1a", boot: "#3a2410", sleeve: "#8a5a30", weapon: "cannon",
    top: [{ it: "goggles", x: 0, y: 2 }],
    pal: { H: "#e8783a", h: "#a84818", L: "#ffb080", M: "#8a5a30", m: "#5a3a1a", l: "#c8905a", A: "#e08a3a", a: "#a85a1a", B: "#5a3a1a", Y: "#f0c040", G: "#8ad0f0" } },
  priest: { head: "hood", body: "robe", legs: "#d8d0c0", boot: "#d8d0c0", sleeve: "#f8f4ec", weapon: "staff", orb: "priest",
    pal: { S: "#d8a070", s: "#a8703c", X: "#f8f4ec", c: "#d0c8b8", u: "#ffffff", P: "#f8f4ec", p: "#d0c8b8", Y: "#e8b830", l: "#ffffff", E: "#3a2418" } },
  frost: { head: "hair", body: "robe", hairBack: 9, ears: true, legs: "#9adcf6", boot: "#f0f8ff", sleeve: "#9adcf6", weapon: "wand", orb: "frost",
    top: [{ it: "crown", x: 0, y: -2 }],
    pal: { S: "#dcefff", s: "#a8c8e8", H: "#e8f4fc", h: "#a8c8dc", L: "#ffffff", P: "#9adcf6", p: "#4f98c8", Y: "#ffffff", l: "#80d8f8", E: "#2a78b0" } },
  alchemist: { head: "hair", body: "leather", hairBack: 6, legs: "#5a3a22", boot: "#3a2414", sleeve: "#8a5a3a", weapon: "flask",
    top: [{ it: "goggles", x: 0, y: 2 }], back: [{ it: "tanks", x: -2, y: 7 }],
    pal: { H: "#e87aa0", h: "#a84a70", L: "#ffb4cc", M: "#8a5a3a", m: "#5a3a22", l: "#c8905a", A: "#8a5a3a", a: "#5a3a22", B: "#f0e8d8", Y: "#e0b040", G: "#60e080" } },
  bard: { head: "hair", body: "leather", hairBack: 5, legs: "#3a5a9a", boot: "#6a4428", sleeve: "#5a9ae0", weapon: "lute",
    top: [{ it: "featherCap", x: -2, y: -3 }],
    pal: { H: "#a8603a", h: "#6a3a20", L: "#e0a070", X: "#5a9ae0", c: "#3a6ab0", F: "#f07aa8", M: "#3a6ab0", m: "#26467a", l: "#8ac0f0", A: "#5a9ae0", a: "#3a6ab0", B: "#f8f4ec", Y: "#f0c040" } },
  summoner: { head: "hood", body: "robe", legs: "#7a5434", boot: "#7a5434", sleeve: "#b8845a", weapon: "book",
    back: [{ it: "totem", x: -6, y: 0 }],
    pal: { X: "#b8845a", c: "#7a5434", u: "#e0b080", P: "#b8845a", p: "#7a5434", Y: "#7af0e0", l: "#e0b080", E: "#7af0e0", N: "#6a4428", n: "#3a2414" } },
  mech: { head: "helm", body: "mech", legs: "#5a5c68", boot: "#3a3c48", sleeve: "#8a8c9c", weapon: "lance",
    top: [{ it: "goggles", x: 0, y: 2 }], back: [{ it: "cannons", x: -5, y: 3 }],
    pal: { T: "#8a8c9c", t: "#5a5c68", u: "#d8dae8", M: "#8a8c9c", m: "#5a5c68", l: "#d8dae8", A: "#c8a030", a: "#8a6a10", Y: "#e8c050", B: "#5a5c68", E: "#ff8a30", G: "#ff8a30" } },
  star: { head: "hair", body: "robe", hairBack: 11, ears: true, legs: "#242c50", boot: "#242c50", sleeve: "#3a4478", weapon: "staff", orb: "star",
    top: [{ it: "starTiara", x: 0, y: -4 }],
    pal: { H: "#c8d0ff", h: "#8a92c8", L: "#ffffff", P: "#3a4478", p: "#242c50", Y: "#ffe060", l: "#8a92c8", E: "#6a78e0" } },
  chrono: { head: "hair", body: "robe", hairBack: 8, ears: true, legs: "#1c4448", boot: "#1c4448", sleeve: "#2e6a70", weapon: "staff", orb: "frost",
    top: [{ it: "hourglass", x: 1, y: -3 }],
    pal: { H: "#8ae8d8", h: "#4aa898", L: "#c8fff4", P: "#2e6a70", p: "#1c4448", Y: "#ffd040", l: "#8ae8d8", E: "#ffd040" } },
  marshal: { head: "helm", body: "plate", legs: "#6a2a34", boot: "#9a9284", sleeve: "#b83a48", weapon: "lance",
    top: [{ it: "plumeR", x: 2, y: -5 }], back: [{ it: "banner", x: 12, y: -10 }],
    pal: { T: "#e0d8c8", t: "#9a9284", u: "#ffffff", M: "#b83a48", m: "#8a2a38", l: "#e86a78", A: "#e0d8c8", a: "#9a9284", B: "#b83a48", Y: "#e8c050", R: "#c83a4a", r: "#8a2030", N: "#6a4428", E: "#4a2030" } },
  counter: { head: "hair", body: "plate", hairBack: 5, legs: "#5a4224", boot: "#7a5a30", sleeve: "#c89860", weapon: "sword", blade: 8, shield: SHIELD_C,
    pal: { S: "#b07a50", s: "#7a5030", H: "#5a3420", h: "#3a2010", L: "#9a6a44", M: "#c89860", m: "#7a5a30", l: "#f0d090", A: "#2a8a88", a: "#1a6a68", B: "#c89860", Y: "#ffd860", E: "#58c0b0" } },
  hunter: { head: "hood", body: "leather", legs: "#3a2e56", boot: "#3a2a1a", sleeve: "#5a4a7a", weapon: "bow",
    back: [{ it: "quiver", x: 9, y: 4 }],
    pal: { X: "#5a4a7a", c: "#3a2e56", u: "#9a8ac0", M: "#3a2e56", m: "#241c3a", l: "#9a8ac0", A: "#5a4a7a", a: "#3a2e56", B: "#8a5a30", Y: "#e04a4a", E: "#e04a4a" } },
  songstress: { head: "hair", body: "robe", hairBack: 9, legs: "#164868", boot: "#164868", sleeve: "#2a6a9a", weapon: "wand", orb: "frost",
    top: [{ it: "crown", x: 0, y: -2 }],
    pal: { H: "#58b8e8", h: "#2a78b0", L: "#c8f0ff", P: "#2a6a9a", p: "#164868", Y: "#e8fbff", l: "#c8f0ff", E: "#2a5a8a" } },
  breaker: { head: "hair", body: "leather", hairBack: 6, legs: "#262a40", boot: "#262a40", sleeve: "#3a3e5a", weapon: "dagger",
    pal: { H: "#e8e8f8", h: "#a8a8c0", L: "#ffffff", M: "#3a3e5a", m: "#262a40", l: "#8a96e0", A: "#3a3e5a", a: "#262a40", B: "#8a96e0", Y: "#8a96e0", E: "#a0b0ff" } },
};
// 米拉的石像守卫「咚咚」
const GOLEM_PAL = { K: "#1c1a24", S: "#9ab0c8", s: "#6a7a94", L: "#c8d6e6", C: "#7af0e0", c: "#3ab0a8", E: "#7af0e0", M: "#6aa858" };
const GOLEM_ROWS = [".....KKKKKK.....", "...KKSSLLSSKK...", "..KSSLLLSSMSSK..", "..KSSEESSEESsK..", "..KSSEESSEESsK..", "..KsSSSSSSSSsK..",
  ".KKKsSSSSSSsKKK.", "KSSKKKKKKKKKKSSK", "KSLSKSSCCSSKSLSK", "KSSSKSCCCcSKSSsK", "KsSsKSSCcSSKsSsK", ".KKKKSSSSSSKKKK.", "....KsSSSSsK....",
  "...KSSK..KSSK...", "...KssK..KssK...", "...KKKK..KKKK..."];
for (const id in HERO) HERO[id].pal = Object.assign({}, BASE_PAL, HERO[id].pal);
const EAR_L = ["K...", "KSK.", ".KSK", "..KK"], EAR_R = ["...K", ".KSK", "KSK.", "KK.."];
const LV3_OUT = "#7a4a08";

// ---------- 9.0：4 阶转职换外观 ----------
const hx2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const h2s = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
function mixHex(a, b, k) {
  if (typeof a !== "string" || a[0] !== "#" || a.length < 7) return a;
  const A = hx2(a), B = hx2(b);
  return "#" + h2s(A[0] + (B[0] - A[0]) * k) + h2s(A[1] + (B[1] - A[1]) * k) + h2s(A[2] + (B[2] - A[2]) * k);
}
// A = 光之路（圣洁、发亮）  B = 血之路（暗沉、赤红）
const BR_LOOK = {
  A: { tint: "#eaf2ff", k: 0.3, trim: "#ffe060", glow: "#bfe0ff", out: "#1a4aa0" },
  B: { tint: "#6a1018", k: 0.32, trim: "#ff5a3a", glow: "#ff7a5a", out: "#901a1a" },
};
const SKIN_KEYS = "SsEq";
const BR_HERO = {};
function branchHero(id, branch) {
  const b = branch === "B" ? "B" : "A", k = id + b;
  if (BR_HERO[k]) return BR_HERO[k];
  const H = HERO[id], L = BR_LOOK[b], pal = {};
  for (const key in H.pal) pal[key] = key === "K" || SKIN_KEYS.includes(key) ? H.pal[key] : mixHex(H.pal[key], L.tint, L.k);
  BR_HERO[k] = { ...H, pal, sleeve: mixHex(H.sleeve, L.tint, L.k), boot: mixHex(H.boot, L.tint, L.k) };
  return BR_HERO[k];
}
// 披风（16 宽，画在身体后面，下摆盖到脚边）
const CAPE_A = [
  "....KKKKKKKK....", "...KCCCCCCCCK...", "..KCCCCCCCCCCK..", ".KCCCcccccccCCK.", ".KCCcccccccccCK.", "KCCcccccccccccCK",
  "KCcccccccccccccK", "KCcccccccccccccK", "KCcccccccccccccK", ".KcccccccccccCK.", ".KYYYYYYYYYYYYK.", "..KKKKKKKKKKKK..",
];
const CAPE_B = [
  "....KKKKKKKK....", "...KCCCCCCCCK...", "..KCCCCCCCCCCK..", ".KCCCcccccccCCK.", ".KCCcccccccccCK.", "KCCcccccccccccCK",
  "KCcccccccccccccK", "KYcccccccccccccK", "KcccKcccccKccccK", "KccK.KcccK.KccCK", ".KK...KcK...KK..", "......K.K.......",
];
const CAPE_PAL = {};
function capePal(D, branch) {
  const k = D.id + branch;
  if (CAPE_PAL[k]) return CAPE_PAL[k];
  const L = BR_LOOK[branch === "B" ? "B" : "A"];
  CAPE_PAL[k] = { K: OUT, C: mixHex(D.color, L.tint, 0.18), c: mixHex(D.color, "#100a18", 0.35), Y: L.trim };
  return CAPE_PAL[k];
}
// 转职后的披风 / 光环 / 犄角 / 肩甲
function drawBranchGear(g, D, o, hx, ht, bx, bt, bw, lean) {
  const branch = o.branch === "B" ? "B" : "A", L = BR_LOOK[branch], W = !!o.flash, t = o.t || 0;
  const P = capePal(D, branch), rows = branch === "B" ? CAPE_B : CAPE_A;
  const sway = Math.round(Math.sin(t * 2.2) * 1) + (o.phase === "strike" ? -2 : 0);
  g.drawImage(sprite("cape:" + D.id + branch, rows, P, W), Math.round(bx + (bw - 16) / 2) + sway - lean, bt);
}
function drawBranchCrown(g, D, o, hx, ht, bx, bt, bw, topY) {
  const branch = o.branch === "B" ? "B" : "A", L = BR_LOOK[branch], W = !!o.flash, t = o.t || 0;
  const C = c => (W ? "#ffffff" : c);
  ht += Math.min(0, topY || 0);
  // 肩甲
  rect(g, bx + 1, bt + 1, 5, 1, C(L.trim)); rect(g, bx + bw - 6, bt + 1, 5, 1, C(L.trim));   // 肩甲镶边
  if (branch === "A") {
    // 光环：贴着头顶的一圈细光
    const b = Math.round(Math.sin(t * 3) * 0.5);
    ring(g, hx + 5, ht - 3 + b, 5, 2, C(L.trim));
    if (!W) { dot(g, hx + 5, ht - 5 + b, "#ffffff"); dot(g, hx, ht - 3 + b, "#ffffff"); dot(g, hx + 10, ht - 3 + b, "#ffffff"); }
  } else {
    // 犄角：从头顶两侧长出来
    for (const i of [0, 1]) {
      const x = hx + (i ? 8 : 2), dx = i ? 1 : -1;
      rect(g, x, ht, 2, 2, C(OUT));
      rect(g, x + dx, ht - 2, 2, 2, C(OUT));
      dot(g, x + dx, ht - 1, C(L.trim));
      dot(g, x + dx * 2, ht - 3, C(L.glow));
    }
  }
}

function heroPhase(D, atkT) {
  const w = HERO[D.id].weapon;
  if (w === "sword" || w === "dagger") return atkT < 0.13 ? "wind" : atkT < 0.25 ? "strike" : atkT < 0.4 ? "recover" : "idle";
  return atkT < 0.17 ? "wind" : atkT < 0.32 ? "release" : "idle";
}

function drawHero(g, D, o) {
  const lv = o.lv || 1, lv4 = lv >= 4 && HERO[D.id];
  const H = lv4 ? branchHero(D.id, o.branch) : HERO[D.id], P = H.pal, W = !!o.flash, C = c => (W ? "#ffffff" : c), ph = o.phase || "idle";
  const ol = lv >= 4 ? (o.branch === "B" ? "#901a1a" : "#1a4aa0") : lv >= 3 ? LV3_OUT : null, key = D.id + (ol ? ol : "");
  const melee = H.weapon === "sword" || H.weapon === "dagger";
  const lean = (ph === "wind" && melee) || ph === "hurt" ? -1 : (ph === "strike" || ph === "release") ? 1 : 0;
  const bw = BW, bh = BH, by = o.bob || 0, lh = BODY_LEGS[H.body];
  const bt = -lh - bh + 2 + by, ht = bt - 7, bx = -Math.floor(bw / 2) + lean, hx = -Math.floor(HW / 2) + lean;
  const fwd = ph === "strike" ? 1 : 0, out = C(ol || OUT);
  // 腿和靴子
  rect(g, -4, -lh, 3, lh, out); rect(g, 1 + fwd, -lh, 3, lh, out);
  rect(g, -3, -lh, 2, lh - 1, C(H.legs || H.boot)); rect(g, 2 + fwd, -lh, 2, lh - 1, C(H.legs || H.boot));
  rect(g, -3, -2, 2, 1, C(H.boot)); rect(g, 2 + fwd, -2, 2, 1, C(H.boot));
  if (H.hairBack) {
    const x = hx, y = ht + 4, w = HW, h = H.hairBack + 3;
    rect(g, x, y, w, h, out); rect(g, x + 1, y, w - 2, h - 1, C(P.H)); rect(g, x + 1, y + h - 3, w - 2, 2, C(P.h));
  }
  if (lv4) drawBranchGear(g, D, o, hx, ht, bx, bt, bw, lean);
  (H.back || []).forEach((b, i) => g.drawImage(sprite(key + ":bk" + i, BACKS[b.it], P, W, ol), hx + b.x, ht + b.y));
  if (H.shield) g.drawImage(sprite(key + ":shield", H.shield, P, W, ol), bx - 3, bt + 3);
  g.drawImage(sprite(key + ":body", BODIES[H.body], P, W, ol), bx, bt);
  if (H.weapon === "dagger") line(g, bx + 3, bt + 6, bx, bt + 9, C("#cfd8e4"));
  g.drawImage(sprite(key + ":head", HEADS[H.head], P, W, ol), hx, ht);
  if (H.ears) { g.drawImage(sprite(key + ":el", EAR_L, P, W, ol), hx - 3, ht + 3); g.drawImage(sprite(key + ":er", EAR_R, P, W, ol), hx + HW - 1, ht + 3); }
  if (ph === "hurt" && !W) for (const [ex, ey] of FACE_EYES) rect(g, hx + ex - 1, ht + ey, 3, 1, OUT);   // 受击：眯眼
  (H.top || []).forEach((t, i) => g.drawImage(sprite(key + ":top" + i, IT[t.it], P, W, ol), hx + t.x, ht + t.y));
  if (lv4) drawBranchCrown(g, D, o, hx, ht, bx, bt, bw, 0);
  heroWeapon(g, D, H, ph === "hurt" ? "idle" : ph, bx + bw - 3, bt + 3, W, o);
}

function heroWeapon(g, D, H, ph, sx, sy, W, o) {
  const C = c => (W ? "#ffffff" : c), skin = C(H.pal.S), t = o.t || 0;
  let hx, hy;
  if (H.weapon === "sword" || H.weapon === "dagger") {
    const dag = H.weapon === "dagger", L = dag ? 5 : H.blade; let ang;
    if (ph === "wind") { hx = sx - (dag ? 2 : 3); hy = sy - (dag ? 2 : 4); ang = dag ? -120 : -150; }
    else if (ph === "strike") { hx = sx + (dag ? 4 : 3); hy = sy + 1; ang = dag ? 0 : 22; }
    else if (ph === "recover") { hx = sx + 2; hy = sy + 3; ang = dag ? 30 : 65; }
    else { hx = sx + 1; hy = sy + (dag ? 3 : 2); ang = dag ? -30 : -62; }
    line(g, sx, sy, hx, hy, C(H.sleeve), 2);
    if (ph === "strike" && !W) {
      const R = dag ? L + 3 : L + 2, a0 = dag ? -120 : -150;
      for (let a = a0; a <= ang; a += 5) {
        const r = a * Math.PI / 180;
        dot(g, sx + Math.cos(r) * R, sy + Math.sin(r) * R, "#ffffff");
        dot(g, sx + Math.cos(r) * (R - 1), sy + Math.sin(r) * (R - 1), a > ang - 60 ? "#ffffff" : "#bfe0ff");
        if (a > ang - 50) dot(g, sx + Math.cos(r) * (R - 2), sy + Math.sin(r) * (R - 2), D.color);
      }
    }
    const r = ang * Math.PI / 180, cx = Math.cos(r), cy = Math.sin(r), ex = hx + cx * L, ey = hy + cy * L;
    const glow = o.skill && (D.id === "sword" || D.id === "assassin");
    const bl = glow ? (D.id === "sword" ? ["#ff8a8a", "#ffe0e0"] : ["#6ff0e0", "#e0fff8"]) : ["#dfe6f2", "#ffffff"];
    line(g, hx + cx * 2 - 1, hy + cy * 2 - 1, ex - 1, ey - 1, C(OUT), 4);   // 黑边
    line(g, hx + cx * 2, hy + cy * 2, ex, ey, C(bl[0]), 2);
    line(g, hx + cx * 2, hy + cy * 2, ex, ey, C(bl[1]), 1);
    line(g, hx + cx * 1.5 - cy * 2, hy + cy * 1.5 + cx * 2, hx + cx * 1.5 + cy * 2, hy + cy * 1.5 - cx * 2, C(dag ? "#4fc0b0" : "#f0c040"));
    dot(g, hx - cx, hy - cy, C("#5a3a22"));
  } else if (H.weapon === "bow") {
    hx = sx + 3; hy = sy + 1;
    line(g, sx, sy, hx - 1, hy, C(H.sleeve), 2);
    for (const [dx, dy] of [[-1, -6], [0, -5], [1, -4], [1, -3], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [1, 3], [1, 4], [0, 5], [-1, 6]]) dot(g, hx + dx, hy + dy, C(Math.abs(dy) > 4 ? "#5a3a1a" : "#9a6a34"));
    const pull = ph === "wind" ? -4 : 0, wob = ph === "release" ? ((t * 40 | 0) % 2 ? 1 : -1) : 0;
    line(g, hx - 1, hy - 6, hx - 1 + pull + wob, hy, C("#e8e0c8")); line(g, hx - 1 + pull + wob, hy, hx - 1, hy + 6, C("#e8e0c8"));
    if (ph === "wind") { line(g, hx - 5, hy, hx + 4, hy, C("#c8a878")); dot(g, hx + 5, hy, C("#ffffff")); dot(g, hx + 4, hy - 1, C("#ffffff")); dot(g, hx + 4, hy + 1, C("#ffffff")); }
    if (ph === "release" && !W) { dot(g, hx + 4, hy - 1, "#fff6c0"); dot(g, hx + 5, hy + 1, "#fff6c0"); }
    rect(g, hx - 1, hy - 1, 2, 2, skin);
  } else if (H.weapon === "cannon") {
    const recoil = ph === "release" ? -2 : 0, aim = ph === "wind" ? -1 : 0;
    hx = sx + 1 + recoil; hy = sy + 3;
    line(g, sx, sy, hx, hy, C(H.sleeve), 2);
    rect(g, hx - 4, hy - 2 + aim, 11, 4, C(OUT));
    rect(g, hx - 3, hy - 1 + aim, 9, 2, C("#4a4a5a")); rect(g, hx - 3, hy - 1 + aim, 9, 1, C("#8a8a9c"));
    rect(g, hx + 3, hy - 2 + aim, 2, 4, C("#e0b040")); rect(g, hx + 7, hy - 2 + aim, 1, 4, C(OUT));
    if (ph === "wind" && !W && (t * 16 | 0) % 2) { dot(g, hx - 4, hy - 3 + aim, "#ffe060"); dot(g, hx - 5, hy - 4 + aim, "#ff8a30"); }
    if (ph === "release" && !W) {
      rect(g, hx + 8, hy - 2, 3, 3, "#fff6c0"); dot(g, hx + 11, hy - 1, "#ffb040"); dot(g, hx + 10, hy - 3, "#ff8a30"); dot(g, hx + 10, hy + 1, "#ff8a30");
      rect(g, hx + 6, hy - 5, 2, 2, "#b0a8a0"); dot(g, hx + 9, hy - 6, "#d0c8c0");
    }
    rect(g, hx - 1, hy, 2, 2, skin);
  } else if (H.weapon === "lance") {
    let ang, L = 13;
    if (ph === "wind") { hx = sx - 2; hy = sy + 1; ang = -6; }
    else if (ph === "strike") { hx = sx + 4; hy = sy + 1; ang = 0; }
    else if (ph === "recover") { hx = sx + 2; hy = sy + 1; ang = -10; }
    else { hx = sx + 1; hy = sy + 2; ang = -52; }
    line(g, sx, sy, hx, hy, C(H.sleeve), 2);
    const r = ang * Math.PI / 180, cx = Math.cos(r), cy = Math.sin(r), ex = hx + cx * L, ey = hy + cy * L, nx = -cy, ny = cx;
    if (ph === "strike" && !W) for (let k = 2; k < 9; k += 2) { dot(g, hx - cx * k, hy - cy * k - 2, "#ffffff"); dot(g, hx - cx * k, hy - cy * k + 2, "#bfe0ff"); }
    line(g, hx - cx * 7, hy - cy * 7, ex, ey, C("#4a3a6a"));
    line(g, hx - cx * 6 + nx, hy - cy * 6 + ny, ex - cx * 2 + nx, ey - cy * 2 + ny, C("#7a6aa0"));
    for (let k = 0; k < 5; k++) { const w = k < 2 ? 2 : k < 4 ? 1 : 0; line(g, ex + cx * k - nx * w, ey + cy * k - ny * w, ex + cx * k + nx * w, ey + cy * k + ny * w, C(k === 4 ? "#ffffff" : "#dfe6f2")); }
    dot(g, ex + cx * 1 - nx * 2, ey + cy * 1 - ny * 2, C("#a8b4c8"));
    line(g, ex - nx * 2, ey - ny * 2, ex - nx * 2 - cx * 2 + ny * 3, ey - ny * 2 - cy * 2 - nx * 3 + 1, C("#d83a4a"));
    if (ph === "strike" && !W) { dot(g, ex + cx * 6, ey + cy * 6, "#fff6c0"); dot(g, ex + cx * 5 + nx * 2, ey + cy * 5 + ny * 2, "#ffffff"); dot(g, ex + cx * 5 - nx * 2, ey + cy * 5 - ny * 2, "#ffffff"); }
    rect(g, hx - 1, hy - 1, 2, 2, skin);
  } else if (H.weapon === "flask") {
    if (ph === "wind") { hx = sx - 1; hy = sy - 5; }
    else if (ph === "release") { hx = sx + 4; hy = sy - 1; }
    else { hx = sx + 2; hy = sy + 2; }
    line(g, sx, sy, hx, hy, C(H.sleeve), 2);
    if (ph !== "release") {
      const fx = hx, fy = hy - 2;
      rect(g, fx - 2, fy - 2, 5, 5, C(OUT)); rect(g, fx - 1, fy - 1, 3, 3, C("#60e080")); dot(g, fx - 1, fy - 1, C("#d8ffe0"));
      rect(g, fx - 1, fy - 4, 3, 2, C(OUT)); dot(g, fx, fy - 4, C("#c8e8d0")); dot(g, fx, fy - 5, C("#b08050"));
      if (!W && ((t * 4) | 0) % 2) dot(g, fx + 1, fy - 7, "#a8f0b0");
    } else if (!W) { dot(g, hx + 3, hy - 2, "#c8f070"); dot(g, hx + 4, hy, "#a8d848"); dot(g, hx + 2, hy - 4, "#ffffff"); }
    rect(g, hx - 1, hy - 1, 2, 2, skin);
  } else if (H.weapon === "lute") {
    const lx = sx - 3, ly = sy + 4;
    line(g, lx + 2, ly - 1, lx + 8, ly - 7, C("#6a4428")); dot(g, lx + 9, ly - 8, C("#3a2414")); dot(g, lx + 8, ly - 8, C("#e8d8b0")); dot(g, lx + 9, ly - 7, C("#e8d8b0"));
    rect(g, lx - 3, ly - 2, 7, 5, C(OUT)); rect(g, lx - 2, ly - 3, 5, 7, C(OUT));
    rect(g, lx - 2, ly - 2, 5, 5, C("#d8903a")); rect(g, lx - 2, ly - 2, 5, 1, C("#f0b060")); rect(g, lx - 2, ly + 2, 5, 1, C("#a86a2a"));
    dot(g, lx, ly, C("#3a2414"));
    if (ph === "wind") { hx = lx + 3; hy = ly - 3; } else if (ph === "release") { hx = lx + 2; hy = ly + 2; } else { hx = lx + 2; hy = ly; }
    line(g, sx, sy, hx, hy, C(H.sleeve), 2);
    if (ph === "release" && !W) { const k = ((t * 12) | 0) % 3; rect(g, lx + 6 + k, ly - 6 - k, 1, 4, "#f07aa8"); rect(g, lx + 4 + k, ly - 3 - k, 3, 2, "#f07aa8"); dot(g, lx + 9, ly - 9 - k, "#ffffff"); }
    rect(g, hx - 1, hy - 1, 2, 2, skin);
  } else if (H.weapon === "book") {
    hx = sx + 1; hy = sy + 2;
    line(g, sx, sy, hx, hy, C(H.sleeve), 2); rect(g, hx - 1, hy - 1, 2, 2, skin);
    const fl = ph === "idle" ? R0(Math.sin(t * Math.PI * 2)) : ph === "release" ? -2 : -1, bx0 = sx + 3, by0 = sy - 2 + fl;
    const pulse = ph === "wind" ? 2 : ph === "release" ? 3 : 0;
    if (!W && (pulse || o.skill)) { g.globalAlpha = 0.3; disc(g, bx0 + 3, by0, 4 + pulse, "#7af0e0"); g.globalAlpha = 1; }
    rect(g, bx0 - 1, by0 - 3, 9, 6, C(OUT)); rect(g, bx0, by0 - 2, 3, 4, C("#f0e8d8")); rect(g, bx0 + 4, by0 - 2, 3, 4, C("#f0e8d8"));
    rect(g, bx0 + 3, by0 - 3, 1, 6, C("#7a5434")); rect(g, bx0 - 1, by0 + 2, 9, 1, C("#b8845a"));
    dot(g, bx0 + 1, by0 - 1, C("#8a7a6a")); dot(g, bx0 + 5, by0, C("#8a7a6a")); dot(g, bx0 + 1, by0 + 1, C("#3ab0a8")); dot(g, bx0 + 5, by0 - 1, C("#3ab0a8"));
    if (pulse && !W) for (let i = 0; i < 4; i++) { const a = t * 8 + i * 1.57; dot(g, bx0 + 3 + Math.cos(a) * (5 + pulse), by0 - 1 + Math.sin(a) * (3 + pulse / 2), i % 2 ? "#7af0e0" : "#ffffff"); }
  } else {
    const wand = H.weapon === "wand";
    let topx, topy;
    if (ph === "wind") { hx = sx + 2; hy = sy - 1; topx = hx + 2; topy = hy - (wand ? 7 : 11); }
    else if (ph === "release") { hx = sx + 3; hy = sy; topx = hx + 5; topy = hy - (wand ? 6 : 9); }
    else { hx = sx + 1; hy = sy + 2; topx = hx; topy = hy - (wand ? 7 : 11); }
    line(g, sx, sy, hx, hy, C(H.sleeve), 2);
    line(g, hx - (topx - hx) * 0.45, hy + (wand ? 3 : 6), topx, topy, C(H.orb === "priest" ? "#e0b040" : wand ? "#d8e8f0" : "#7a4e2c"));
    const pulse = ph === "wind" ? 2 : ph === "release" ? 3 : 0, glowOn = !W && (pulse || o.skill);
    if (H.orb === "mage") {
      if (glowOn || (t * 2 | 0) % 2) { g.globalAlpha = 0.35; disc(g, topx, topy - 2, 3 + pulse, "#b070ff"); g.globalAlpha = 1; }
      rect(g, topx - 1, topy - 3, 3, 3, C("#9a50f0")); dot(g, topx, topy - 2, "#ffffff"); dot(g, topx - 1, topy - 3, C("#d8b0ff"));
    } else if (H.orb === "priest") {
      if (glowOn) { g.globalAlpha = 0.35; disc(g, topx, topy - 2, 3 + pulse, "#ffe080"); g.globalAlpha = 1; }
      ring(g, topx, topy - 2, 2, 2, C("#f0c040")); dot(g, topx, topy - 2, "#fff6c0");
      if (pulse) for (const [dx, dy] of [[0, -5], [3, -2], [-3, -2], [0, 1]]) dot(g, topx + dx, topy + dy, "#fff6c0");
    } else if (H.orb === "star") {
      if (glowOn || (t * 2 | 0) % 2) { g.globalAlpha = 0.35; disc(g, topx, topy - 2, 3 + pulse, "#a0b8ff"); g.globalAlpha = 1; }
      for (const [dx, dy] of [[0, -5], [0, 1], [-3, -2], [3, -2]]) dot(g, topx + dx, topy + dy, C("#c890ff"));
      rect(g, topx - 1, topy - 3, 3, 3, C("#e8ecff")); dot(g, topx, topy - 2, "#ffffff");
    } else {
      if (glowOn) { g.globalAlpha = 0.35; disc(g, topx, topy - 2, 2 + pulse, "#a0f0ff"); g.globalAlpha = 1; }
      dot(g, topx, topy - 5, C("#ffffff")); rect(g, topx - 1, topy - 4, 3, 3, C("#80d8f8")); dot(g, topx, topy - 1, C("#4f98c8")); dot(g, topx - 1, topy - 4, "#ffffff");
    }
    if (ph === "wind" && !W) for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2.1; dot(g, topx + Math.cos(a) * (4 + pulse), topy - 2 + Math.sin(a) * (4 + pulse), "#ffffff"); }
    rect(g, hx - 1, hy - 1, 2, 2, skin);
  }
}

function drawGolem(g, o) {
  const ph = o.phase || "idle", W = !!o.flash, lean = ph === "wind" ? -1 : ph === "strike" ? 2 : 0, lift = ph === "wind" ? -1 : 0;
  const bob = o.bob || 0;
  g.drawImage(sprite("golem_s", GOLEM_ROWS, GOLEM_PAL, W), -8 + lean, -16 + bob + lift);
  if (!W) { const glow = ((o.t || 0) * 4 | 0) % 2; if (glow) { dot(g, -3 + lean, -13 + bob + lift, "#ffffff"); dot(g, 2 + lean, -13 + bob + lift, "#ffffff"); } }
  if (ph === "strike" && !W) { rect(g, 8 + lean, -9, 3, 3, "#c8d6e6"); dot(g, 11 + lean, -8, "#ffffff"); dot(g, 11 + lean, -10, "#ffffff"); }
}
// 画进 48×44 的小画布再用 Scale2x 放大到 96×88（脚底在 48,80），按帧缓存
const HCW = 48, HOX = 24;
function renderHero(D, o) {
  const ph = o.phase || "idle", tq = ph === "idle" ? ((o.t || 0) * 2 | 0) % 2 : Math.floor((o.t || 0) * 12) % 12;
  const key = [D.id, o.lv || 1, o.branch || "", ph, o.bob || 0, o.flash ? 1 : 0, o.face || 1, o.skill ? 1 : 0, tq].join("|");
  return cached2x(key, g => { g.translate(HOX, 40); g.scale(o.face || 1, 1); const oo = { ...o, t: tq / (ph === "idle" ? 2 : 12) }; D.id === "golem_s" ? drawGolem(g, oo) : drawHero(g, D, oo); }, HCW, 44);
}

// 卡片和信息栏头像
function drawPortrait(D, canvas, lv, branch) {
  const cvs = canvas || document.getElementById("pt-" + D.id);
  if (!cvs) return;
  const size = cvs.clientWidth || 40, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(size * dpr); cvs.height = Math.round(size * dpr);
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = D.color; g.fillRect(0, 0, cvs.width, cvs.height);
  g.fillStyle = "rgba(0,0,0,.16)"; for (let y = 0; y < cvs.height; y += Math.max(2, dpr * 2)) g.fillRect(0, y, cvs.width, Math.max(1, dpr));
  const big = renderHero(D, { phase: "idle", face: 1, lv: lv || 1, branch });
  g.drawImage(big, 18 + (HOX - 20) * 2, 28, 44, 44, 0, 0, cvs.width, cvs.height);
}
