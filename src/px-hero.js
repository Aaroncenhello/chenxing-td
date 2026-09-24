
// ---------- 像素角色：1 倍画好后用 Scale2x 放大 ----------
const HEAD = [
  "....KKKKKK....", "..KKHHHHHHKK..", ".KHHHLLHHHHHK.", ".KHHLLHHHHHHK.", "KHHHHHHHHHHHHK", "KHHHHHHHHHHHHK", "KHHSHHSSHHSHHK",
  "KHSSSSSSSSSSHK", "KHSKKSSSSKKSHK", "KhSEWSSSSEWShK", "KhSEeSSSSEeShK", ".KSMSSSmSSMSK.", "..KKSSSSSSKK..", "....KKKKKK....",
];
const BASE_PAL = { K: OUT, S: "#ffdcc4", s: "#f0b898", W: "#ffffff", e: OUT, M: "#f49090", m: "#c05050" };
const HERO = {
  knight: { pal: { H: "#f4d070", h: "#c89a38", L: "#fff0b0", E: "#3a70d8", A: "#d8e0ec", a: "#8a98b0", B: "#3a5cc0", Y: "#f0c040", R: "#3a60c8" },
    body: [".KKKKKKKK.", "KAAKBBKAAK", "KAaKBBKaAK", ".KAKBYKAK.", ".KAKBBKAK.", ".KaKBBKaK.", ".KKKKKKKK."],
    back: { x: -3, y: 1, rows: ["..RR.", ".KRRK", "KHHHK", "KHHK.", "KhHK.", "KhHK.", ".KhK.", ".KhK.", "..K.."] },
    sleeve: "#d8e0ec", boot: "#b8c0d0", weapon: "sword", blade: 8 },
  sword: { pal: { H: "#d83848", h: "#8a1c2c", L: "#ff8090", E: "#e89830", D: "#4a3038", d: "#2e1e24", R: "#d83040", r: "#8a2030", Y: "#f0c040" },
    body: [".KKKKKKKK.", "KDDDRRDDDK", "KDdDRRDdDK", ".KDDDDDDK.", ".KRRRRRRK.", "KRRrRRrRRK", "KKKKKKKKKK"],
    back: { x: -4, y: -1, rows: ["...KKK.", "..KHHHK", ".KHHHK.", ".KHHK..", "KHHHK..", "KHHK...", "KHhK...", "KHhK...", "KhhK...", ".KhK...", ".KhK...", ".KhK...", "..K...."] },
    sleeve: "#4a3038", boot: "#3a2a2a", weapon: "sword", blade: 11 },
  assassin: { pal: { H: "#2e4450", h: "#1a2830", L: "#5a7a88", E: "#40e0c0", D: "#2e3440", d: "#1c2028", T: "#4fc0b0", t: "#2f8078" },
    body: [".KKKKKKKK.", "KTTTTTTTTK", "KDTtTTtTDK", ".KDDDDDDK.", ".KDdDDdDK.", ".KDDDDDDK.", ".KKKKKKKK."],
    back: { x: -3, y: 11, rows: ["KK...", "KTK..", "KTTK.", ".KTTK", "..KK."] },
    top: { x: 2, y: 11, rows: ["KTTTTTTTTK"] },
    sleeve: "#2e3440", boot: "#1c2028", weapon: "dagger" },
  archer: { pal: { H: "#f6e6a8", h: "#c8b070", L: "#fffbe0", E: "#38b060", G: "#4fa050", g: "#2f6a38", N: "#8a5a30", W: "#f0ece0" },
    body: [".KKKKKKKK.", "KGGKWWKGGK", "KGgGWWGgGK", ".KGGGGGGK.", ".KNNNNNNK.", ".KGgGGgGK.", ".KKKKKKKK."],
    hairBack: 10, ears: true, pin: "#6fd07a", sleeve: "#4fa050", boot: "#6a4428", weapon: "bow" },
  mage: { pal: { H: "#9058c8", h: "#5a3088", L: "#c090f0", E: "#c060f0", P: "#7a4cc0", p: "#4a2c80", Y: "#f0c040" },
    body: ["..KKKKKKKK..", ".KPPPYYPPPK.", ".KPpPPPPpPK.", ".KPPPYPPPPK.", "KPPPPPPPPPPK", "KPpPPYPPPpPK", "KYYYYYYYYYYK", ".KKKKKKKKKK."],
    hairBack: 6, robe: true,
    top: { x: -3, y: -7, rows: ["............KK......", "...........KPPK.....", "..........KPPK......", ".........KPPPK......", "........KPPPPK......",
      ".......KPPPPPK......", "......KPPPPPPK......", "....KKYYYYYYYYKK....", "..KKPPPPPPPPPPPPKK..", "KKPPPPPPPPPPPPPPPPKK", "KppppppppppppppppppK", ".KKKKKKKKKKKKKKKKKK."] },
    sleeve: "#7a4cc0", boot: "#4a2c70", weapon: "staff", orb: "mage" },
  gunner: { pal: { H: "#e8783a", h: "#a84818", L: "#ffb080", E: "#3a8ad8", O: "#8a5a30", o: "#5a3a1a", A: "#e08a3a", G: "#3a3a44", g: "#8ad0f0", Y: "#f0c040" },
    body: [".KKKKKKKK.", "KOOKAAKOOK", "KOoOAAOoOK", ".KOOYYOOK.", ".KAAAAAAK.", ".KOoOOoOK.", ".KKKKKKKK."],
    back: { x: -2, y: 7, rows: ["KHK", "KhK", "KHK", "KhK", ".K."] }, backR: { x: 13, y: 7, rows: ["KHK", "KhK", "KHK", "KhK", ".K."] },
    top: { x: 2, y: 4, rows: ["GGgGGGGgGG"] },
    sleeve: "#8a5a30", boot: "#5a3a1a", weapon: "cannon" },
  priest: { pal: { H: "#c8905a", h: "#8a5a30", L: "#e8b888", E: "#d8a030", V: "#f8f4ec", v: "#d0c8b8", Y: "#e8b830" },
    body: ["..KKKKKKKK..", ".KVVVYYVVVK.", ".KVvVYYVvVK.", ".KVVYYYYVVK.", "KVVVVYYVVVVK", "KVvVVYYVVvVK", "KYYYYYYYYYYK", ".KKKKKKKKKK."],
    hairBack: 11, veilBack: true, robe: true,
    top: { x: -1, y: -1, rows: ["....KKKKKKKK....", "..KKVVVVVVVVKK..", ".KVVVVVYVVVVVVK.", "KVVVVVYYYVVVVVVK", "KVVVVVVYVVVVVVVK", "KVYYYYYYYYYYYYVK",
      "KVK..........KVK", "KVK..........KVK", "KVK..........KVK", "KVK..........KVK", "KVVK........KVVK", "KVVK........KVVK", ".KVVK......KVVK.", "..KK........KK.."] },
    sleeve: "#f8f4ec", boot: "#f0ece0", weapon: "staff", orb: "priest" },
  frost: { pal: { H: "#e8f4fc", h: "#a8c8dc", L: "#ffffff", E: "#40b8e8", I: "#9adcf6", i: "#4f98c8", V: "#ffffff", w: "#ffffff", C: "#80d8f8" },
    body: ["..KKKKKKKK..", ".KVVVIIVVVK.", ".KIiIIIIiIK.", ".KIIIwwIIIK.", "KIIIIIIIIIIK", "KIiIIIIIIiIK", "KVVVVVVVVVVK", ".KKKKKKKKKK."],
    hairBack: 11, ears: true, robe: true, top: { x: 3, y: -2, rows: ["..C..C..", ".CwCCwC.", "KCCCCCCK"] },
    sleeve: "#9adcf6", boot: "#f0f8ff", weapon: "wand", orb: "frost" },
  lancer: { pal: { H: "#3a4a88", h: "#232c5a", L: "#6a80c8", E: "#e8b030", S: "#f2caa6", s: "#dca482", A: "#e0c070", a: "#a88838", T: "#40a8a0", t: "#28706a", R: "#d83a4a" },
    body: [".KKKKKKKK.", "KAAKTTKAAK", "KAaKTTKaAK", ".KTTRRTTK.", ".KAAAAAAK.", ".KTtTTtTK.", ".KKKKKKKK."],
    back: { x: -3, y: 0, rows: [".KK..", "KHHK.", "KHHK.", "KHhK.", ".KhHK", ".KhHK", "..KhK", "..KhK", "...K."] },
    top: { x: 0, y: -2, rows: ["KK..........KK", "KAK........KAK", ".KAK......KAK."] },
    sleeve: "#40a8a0", boot: "#a88838", weapon: "lance" },
  alchemist: { pal: { H: "#e87aa0", h: "#a84a70", L: "#ffb4cc", E: "#3ab870", C: "#8a5a3a", c: "#5a3a22", W: "#f0e8d8", w: "#c8bca8", G: "#60e080", P: "#b070f0", Y: "#e0b040", O: "#8ad8f0" },
    body: [".KKKKKKKK.", "KCCKWWKCCK", "KCcKWWKcCK", ".KCYYYYCK.", ".KCGWWPCK.", ".KCWwwWCK.", ".KKKKKKKK."],
    hairBack: 8, top: { x: 2, y: 3, rows: ["KKKKKKKKKK", "KOOKKKKOOK", ".KK....KK."] },
    sleeve: "#8a5a3a", boot: "#5a3a22", weapon: "flask" },
  bard: { pal: { H: "#a8603a", h: "#6a3a20", L: "#e0a070", E: "#4a8ae8", B: "#5a9ae0", b: "#3a6ab0", W: "#f8f4ec", Y: "#f0c040", F: "#f07aa8", f: "#b84a78" },
    body: [".KKKKKKKK.", "KBBKWWKBBK", "KBbKWWKbBK", ".KBBYYBBK.", ".KWWWWWWK.", ".KBbBBbBK.", ".KKKKKKKK."],
    hairBack: 7, top: { x: 1, y: -2, rows: ["..........FF..", "...KKKKKKKFfK.", "..KBBBBBBBBKF.", ".KBBBBBBBBBBK.", "..KKKKKKKKKK.."] },
    sleeve: "#5a9ae0", boot: "#6a4428", weapon: "lute" },
  summoner: { pal: { H: "#c0a8e8", h: "#8a70b8", L: "#ece0ff", E: "#e0a040", O: "#b8845a", o: "#7a5434", C: "#7af0e0", c: "#3ab0a8", W: "#f0e8d8", Y: "#e0c060" },
    body: ["..KKKKKKKK..", ".KOOOCCOOOK.", ".KOoOOOOoOK.", ".KOOOYOOOOK.", "KOOOOOOOOOOK", "KOoOOYOOOoOK", "KWWWWWWWWWWK", ".KKKKKKKKKK."],
    robe: true,
    back: { x: -3, y: 6, rows: ["KK.", "KHK", "KHK", "KHK", "KhK", "KhK", ".K."] }, backR: { x: 14, y: 6, rows: [".KK", "KHK", "KHK", "KHK", "KhK", "KhK", ".K."] },
    top: { x: 9, y: 0, rows: [".C.", "CcC", ".C."] },
    sleeve: "#b8845a", boot: "#7a5434", weapon: "book" },
  mech: { pal: { H: "#d8a020", h: "#a06a10", L: "#ffe060", E: "#ff8a30", M: "#8a8c9c", m: "#5a5c68", A: "#c8a030", a: "#8a6a10", R: "#ff5030", W: "#e8e8f0" },
    body: [".KKKKKKKK.", "KMMKAAKMMK", "KMmKAAKmMK", ".KMAARAMK.", ".KAAAAAAK.", ".KMmMMmMK.", ".KKKKKKKK."],
    back: { x: -3, y: 2, rows: ["KMK", "KmK", "KMK", "KRK", ".K."] }, backR: { x: 13, y: 2, rows: ["KMK", "KmK", "KMK", "KRK", ".K."] },
    top: { x: 2, y: 3, rows: ["KMMMMMMMMK", "KLKKKKKKLK"] },
    sleeve: "#8a8c9c", boot: "#5a5c68", weapon: "lance" },
  star: { pal: { H: "#c8d0ff", h: "#8a92c8", L: "#ffffff", E: "#a0b8ff", P: "#3a4478", p: "#242c50", V: "#c890ff", Y: "#ffe060", W: "#e8ecff" },
    body: ["..KKKKKKKK..", ".KPPPVVPPPK.", ".KPpPPPPpPK.", ".KPPPYPPPPK.", "KPPPPPPPPPPK", "KPpPPVPPPpPK", "KWWWWWWWWWWK", ".KKKKKKKKKK."],
    hairBack: 12, robe: true, ears: true,
    top: { x: 1, y: -4, rows: ["...V....V...", "..VEV..VEV..", "...V.KK.V...", "....KEEK....", "...KEVVEK...", "..KEVVVVEK..", "...KKKKKK..."] },
    sleeve: "#3a4478", boot: "#242c50", weapon: "staff", orb: "star" },
  chrono: { pal: { H: "#8ae8d8", h: "#4aa898", L: "#c8fff4", E: "#ffd040", P: "#2e6a70", p: "#1c4448", V: "#7ae0d0", Y: "#ffe060", W: "#e8fffa" },
    body: ["..KKKKKKKK..", ".KPPPVVPPPK.", ".KPpPPPPpPK.", ".KPPPYPPPPK.", "KPPPPPPPPPPK", "KPpPPVPPPpPK", "KWWWWWWWWWWK", ".KKKKKKKKKK."],
    hairBack: 9, robe: true, ears: true,
    top: { x: 3, y: -3, rows: ["..Y..Y..", ".YVYYVY.", "KVVVVVVK"] },
    sleeve: "#2e6a70", boot: "#1c4448", weapon: "staff", orb: "frost" },
  marshal: { pal: { H: "#e8c070", h: "#a88838", L: "#fff0c0", E: "#c83a4a", A: "#e0d8c8", a: "#9a9284", B: "#b83a48", b: "#8a2a38", Y: "#ffe060", R: "#d8b040" },
    body: [".KKKKKKKK.", "KAAKBBKAAK", "KAaKBBKaAK", ".KAKBYKAK.", ".KABBBBAK.", ".KaKBBKaK.", ".KKKKKKKK."],
    back: { x: -5, y: -2, rows: ["KKKK.", "KBBBK", "KBYBK", "KBbBK", "KBBBK", ".KBK.", ".KBK.", ".KBK.", ".KBK.", "..K.."] },
    top: { x: 2, y: 3, rows: ["KYYYYYYYYK"] },
    sleeve: "#e0d8c8", boot: "#9a9284", weapon: "lance" },
};
// 米拉的石像守卫「咚咚」
const GOLEM_PAL = { K: "#1c1a24", S: "#9ab0c8", s: "#6a7a94", L: "#c8d6e6", C: "#7af0e0", c: "#3ab0a8", E: "#7af0e0", M: "#6aa858" };
const GOLEM_ROWS = [".....KKKKKK.....", "...KKSSLLSSKK...", "..KSSLLLSSMSSK..", "..KSSEESSEESsK..", "..KSSEESSEESsK..", "..KsSSSSSSSSsK..",
  ".KKKsSSSSSSsKKK.", "KSSKKKKKKKKKKSSK", "KSLSKSSCCSSKSLSK", "KSSSKSCCCcSKSSsK", "KsSsKSSCcSSKsSsK", ".KKKKSSSSSSKKKK.", "....KsSSSSsK....",
  "...KSSK..KSSK...", "...KssK..KssK...", "...KKKK..KKKK..."];
for (const id in HERO) HERO[id].pal = Object.assign({}, BASE_PAL, HERO[id].pal);
const SHIELD = ["KKKKKK", "KBBYBK", "KBYYYK", "KBBYBK", "KBBYBK", ".KBBK.", "..KK.."];
const EAR_L = ["KK..", "KSSK", ".KSK", "..K."], EAR_R = ["..KK", "KSSK", "KSK.", ".K.."];
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
const SKIN_KEYS = "SsWMme";
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
  rect(g, bx - 2, bt, 4, 3, C(OUT)); rect(g, bx + bw - 2, bt, 4, 3, C(OUT));
  rect(g, bx - 1, bt + 1, 3, 1, C(L.trim)); rect(g, bx + bw - 1, bt + 1, 3, 1, C(L.trim));
  if (branch === "A") {
    // 光环：贴着头顶的一圈细光
    const b = Math.round(Math.sin(t * 3) * 0.5);
    ring(g, hx + 6, ht - 3 + b, 5, 2, C(L.trim));
    if (!W) { dot(g, hx + 6, ht - 5 + b, "#ffffff"); dot(g, hx + 1, ht - 3 + b, "#ffffff"); dot(g, hx + 11, ht - 3 + b, "#ffffff"); }
  } else {
    // 犄角：从头顶两侧长出来
    for (const i of [0, 1]) {
      const x = hx + (i ? 10 : 3), dx = i ? 1 : -1;
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
  const bw = H.body[0].length, bh = H.body.length, by = o.bob || 0;
  const bt = -3 - bh + by, ht = bt - 13, bx = -Math.floor(bw / 2) + lean, hx = -7 + lean;
  const lh = H.robe ? 2 : 3, fwd = ph === "strike" ? 1 : 0;
  rect(g, -4, -lh, 3, lh, C(ol || OUT)); rect(g, 1 + fwd, -lh, 3, lh, C(ol || OUT));
  rect(g, -3, -lh, 2, lh - 1, C(H.boot)); rect(g, 2 + fwd, -lh, 2, lh - 1, C(H.boot));
  if (H.hairBack) {
    const x = hx - 1, y = ht + 6, w = 16, h = H.hairBack + 4;
    rect(g, x, y, w, h, C(ol || OUT));
    rect(g, x + 1, y, w - 2, h - 1, C(H.veilBack ? P.V : P.H));
    rect(g, x + 1, y + h - 3, w - 2, 2, C(H.veilBack ? P.v : P.h));
    if (H.veilBack) rect(g, x + 1, y + h - 2, w - 2, 1, C(P.Y));
  }
  if (lv4) drawBranchGear(g, D, o, hx, ht, bx, bt, bw, lean);
  if (H.back) g.drawImage(sprite(key + ":back", H.back.rows, P, W, ol), hx + H.back.x, ht + H.back.y);
  if (H.backR) g.drawImage(sprite(key + ":backR", H.backR.rows, P, W, ol), hx + H.backR.x, ht + H.backR.y);
  if (D.id === "knight") g.drawImage(sprite(key + ":shield", SHIELD, P, W, ol), bx - 4, bt - 1);
  g.drawImage(sprite(key + ":body", H.body, P, W, ol), bx, bt);
  if (!melee) rect(g, bx - 1, bt + 3, 2, 2, C(P.S));
  if (H.weapon === "dagger") line(g, bx, bt + 4, bx - 3, bt + 7, C("#cfd8e4"));
  g.drawImage(sprite(key + ":head", HEAD, P, W, ol), hx, ht);
  if (H.ears) { g.drawImage(sprite(key + ":el", EAR_L, P, W, ol), hx - 3, ht + 7); g.drawImage(sprite(key + ":er", EAR_R, P, W, ol), hx + 13, ht + 7); }
  if (H.pin) { dot(g, hx + 10, ht + 2, C(H.pin)); dot(g, hx + 11, ht + 1, C(H.pin)); }
  if (ph === "hurt" && !W) for (const ex of [3, 9]) { rect(g, hx + ex, ht + 8, 2, 3, P.S); rect(g, hx + ex, ht + 9, 2, 1, OUT); dot(g, hx + ex + (ex === 3 ? 0 : 1), ht + 8, OUT); }
  if (H.top) g.drawImage(sprite(key + ":top", H.top.rows, P, W, ol), hx + H.top.x, ht + H.top.y);
  if (lv4) drawBranchCrown(g, D, o, hx, ht, bx, bt, bw, H.top ? H.top.y : 0);
  heroWeapon(g, D, H, ph === "hurt" ? "idle" : ph, bx + bw - 2, bt + 2, W, o);
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
    line(g, hx + cx * 2, hy + cy * 2, ex, ey, C(bl[0]));
    if (!dag) line(g, hx + cx * 2 - cy, hy + cy * 2 + cx, ex - cy, ey + cx, C(bl[1])); else dot(g, ex, ey, C(bl[1]));
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
  g.drawImage(big, 18 + (HOX - 20) * 2, 20, 44, 44, 0, 0, cvs.width, cvs.height);
}
