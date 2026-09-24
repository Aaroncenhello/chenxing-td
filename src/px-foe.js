
// ---------- 像素敌人 ----------
const mirror = halves => halves.map(h => h + h.split("").reverse().join(""));
const FOE = {
  slime: { pal: { K: "#1a3a1a", G: "#58c858", g: "#2f8a3a", L: "#a8f090", E: "#1a1a1a" }, h: 9,
    frames: [["....KKKK....", "..KKLLGGKK..", ".KLLGGGGGGK.", "KLGGEGGGEGGK", "KGGGEGGGEGGK", "KGGGGGGGGGGK", "KgGGGGGGGGgK", ".KggggggggK.", "..KKKKKKKK.."],
      ["............", "....KKKK....", ".KKLLLGGGKK.", "KLLGEGGGEGGK", "KGGGEGGGEGGK", "KGGGGGGGGGGK", "KgGGGGGGGGgK", "KKggggggggKK", ".KKKKKKKKKK."]] },
  bigslime: { pal: { K: "#143014", G: "#48a840", g: "#256a2c", L: "#98e080", E: "#101810", m: "#1a3a1a" }, h: 12,
    frames: [mirror(["......KK", "....KKLL", "...KLLGG", "..KLGGGG", ".KLGGGGG", ".KGGGEGG", "KGGGGEGG", "KGGGGGGG", "KgGGGGGm", "KggGGGGG", ".KgggggG", "..KKKKKK"])] },
  goblin: { pal: { K: "#1c2410", G: "#8ab040", g: "#5a7a28", Y: "#ffe040", e: "#c02020", N: "#8a5a30", n: "#5a3a1a" }, h: 14, legs: [[3, 0], [8, 1]],
    frames: [["...KKKKKK...", "KK.KGGGGK.KK", "KGKGGGGGGKGK", ".KGGYeGYeGK.", "..KGGGGGGK..", "..KGgKKgGK..", "...KKKKKK...",
      "..KNNNNNNK..", ".KGNNnnNNGK.", ".KGNNNNNNGK.", "..KnnnnnnK..", "..KKKKKKKK.."]] },
  shaman: { pal: { K: "#1c2410", G: "#8ab040", g: "#5a7a28", Y: "#ffe040", e: "#c02020", N: "#3a7a8a", n: "#245a66", F: "#e04030", f: "#f0c040", B: "#40a0e0" }, h: 16, legs: [[3, 0], [8, 1]],
    frames: [["..F.f..f.F..", "..FfKKKKfF..", "KK.KGGGGK.KK", "KGKGGGGGGKGK", ".KGGYeGYeGK.", "..KGGGGGGK..", "..KGgKKgGK..",
      "...KKBBKK...", "..KNNBBNNK..", ".KGNNNNNNGK.", ".KGNNnnNNGK.", "..KNNNNNNK..", "..KnnnnnnK..", "..KKKKKKKK.."]] },
  bomber: { pal: { K: "#141018", B: "#3a3448", b: "#262030", L: "#6a6480", R: "#ff4030", F: "#c8a060", W: "#ffffff" }, h: 14, legs: [[4, 0], [7, 1]],
    frames: [["......F.....", ".....F......", "....KKKK....", "..KKBBBBKK..", ".KBLLBBBBBK.", ".KBLBBBBBBK.", "KBBRBBBBRBBK", "KBBRBBBBRBBK",
      "KBBBBWWBBBBK", ".KbBBBBBBbK.", "..KKbbbbKK..", "....KKKK...."]] },
  wolf: { pal: { K: "#1a1c24", F: "#9098a8", f: "#5a6070", L: "#c0c8d8", R: "#ff4040" }, h: 11, legs: [[4, 0], [6, 1], [11, 0], [13, 1]],
    frames: [["..............KK..", ".............KFFK.", "KK........KKKFFFFK", "KFK...KKLLLLLFFRFK", ".KFKKKLLLLLLFFFFFK",
      "..KFFFFFFFFFFFFKKK", "..KfFFFFFFFFFFfK..", "...KffffffffffK...", "...KKKKKKKKKKKK..."]] },
  orc: { pal: { K: "#1a1c14", G: "#6a9a48", g: "#466a2c", A: "#a0a8b8", a: "#687080", H: "#c0c8d8", R: "#ff4020", W: "#f0ead8", N: "#5a3a20", n: "#3a2410" }, h: 19, legs: [[4, 0], [10, 1]], legW: 2,
    frames: [mirror(["....KKKK", "...KHHHH", "..KHHAHH", "..KHHHHH", "..KKKKKK", "..KGGRGG", "..KGGGGG", "..KGWGKK", "...KKGGG",
      ".KKGAAAA", "KGGKAaAA", "KGGKAAAA", "KGgKAaAA", ".KKKAAAA", "...KNNNN", "...KNnNN", "...KKKKK"])] },
  garg: { pal: { K: "#1c1828", S: "#8a80a8", s: "#5a5478", L: "#b0a8c8", Y: "#ffb030", H: "#3a3450" }, h: 10, fly: true,
    frames: [mirror(["K.......H", "KSK....KS", "KSSK..KSS", ".KSSKKSYS", ".KsSSSSSS", "..KssSSLL", "...KKsSSS", ".....KsSS", "......KSK", "......KK."]),
      mirror(["........H", ".......KS", "......KSS", "..KKKKSYS", ".KSSSSSSS", "KSSsSSSLL", "KSK.KsSSS", "KK...KsSS", "......KSK", "......KK."])] },
  dmage: { pal: { K: "#120a1c", P: "#5a3a8a", p: "#2e1e4a", L: "#7a5aaa", D: "#1a1026", V: "#e8b0ff" }, h: 16,
    frames: [mirror([".....K", "....KP", "...KPP", "..KPPP", "..KPDD", ".KPDVD", ".KPDDD", ".KPPDD", "KPPPPP", "KPLPPP", "KPLPPP", "KPPLPP", "KPPLPP", "KPPPPP", "Kppppp", ".KKKKK"])] },
  skeleton: { pal: { K: "#1c1a18", B: "#e8e0c8", b: "#a8a088", E: "#ff5040", D: "#3a3430" }, h: 15, legs: [[4, 0], [7, 1]],
    frames: [["...KKKKKK...", "..KBBBBBBK..", "..KBEBBEBK..", "..KBBBBBBK..", "...KBDDBK...", "....KBBK....", "..KKKBBKKK..",
      ".KBKBBBBKBK.", ".KBKbBBbKBK.", "..K.KBBK.K..", "....KbbK....", "...KBKKBK...", "...KK..KK..."]] },
  ghost: { pal: { K: "#1a3038", G: "#c8f4f8", g: "#80c8d8", E: "#1a2a40", L: "#ffffff" }, h: 16,
    frames: [mirror(["...KKK", "..KGGG", ".KGLGG", ".KGGGG", "KGGEEG", "KGGEEG", "KGGGGG", "KGGGGK", "KGGGGG", "KgGGGG", "KgGGGG", "KggGGG", "KggGgG", ".KgKgg", ".K..Kg", "......"]),
      mirror(["...KKK", "..KGGG", ".KGLGG", ".KGGGG", "KGGEEG", "KGGEEG", "KGGGGG", "KGGGGK", "KGGGGG", "KgGGGG", "KgGGGG", "KggGGG", "KgGgGG", "Kgg.Kg", ".K...K", "......"])] },
  necro: { pal: { K: "#140c1c", P: "#3a2458", p: "#22143a", L: "#6a4a9a", S: "#e8e0c8", E: "#80ff90", G: "#4a3a2a" }, h: 18,
    frames: [mirror(["....KK", "...KPP", "..KPPP", ".KPPSS", ".KPSES", ".KPSSS", "..KPSK", ".KPPPP", "KPLPPP", "KPLPPP", "KPPLPP", "KPPLPP", "KPPPPP", "KPPPPP", "KpPPPP", "Kppppp", "KppKpp", ".KK.KK"])] },
  shield: { pal: { K: "#141820", A: "#8a9ab8", a: "#5a6a88", S: "#c8d0e0", s: "#8a98b0", Y: "#e0b040", R: "#ff5040", N: "#4a3a2a", n: "#2e2418" }, h: 15, legs: [[4, 0], [6, 1]], legW: 2,
    frames: [["....KKKK......", "...KAAAAK.....", "...KARRAK.....", "...KAAAAK.....", "..KKKAAKKK....", ".KAAAAAAAKKKK.", ".KAaAAAAKSSSSK",
      ".KAAAAAAKSYYSK", ".KAaAAAAKSYYSK", ".KAAAAAAKSSSSK", "..KNNNNKKsSSsK", "..KNnnNK.KKKK.", "..KKKKKK......"]] },
  stalker: { pal: { K: "#100c18", H: "#3a3458", h: "#262040", S: "#d8c0b0", E: "#ff4060", C: "#7a2a5a", D: "#2a2438" }, h: 11,
    frames: [["....KKKK....", "...KHHHHK...", "..KHHHHHHK..", "..KHSESEHK..", "..KHSSSSHK..", "..KCCCCCCK..", ".KDCDDDDCDK.",
      ".KDDDDDDDDK.", "..KDhDDhDK..", "..KDDKKDDK..", "..KKK..KKK.."]] },
  sandworm: { pal: { K: "#2a1a0e", S: "#d8a860", s: "#a87838", L: "#f2d494", M: "#7a1a2a", T: "#fff4e0", D: "#c8a062", d: "#9a7440" }, h: 15,
    frames: [["....KKKK....", "...KLLSSK...", "..KLSSSSSKK.", "..KSSsKKTTK.", "..KSSKMMMMK.", "..KsSKTTMMK.", "..KSSsKKKK..", "..KLSSsK....",
      "...KSSSsK...", "...KsSSSK...", "...KLSSsK...", "..KSSSSSsK..", ".KsSSSSSSsK.", "KDDDDDDDDDDK", "KDdDDdDDdDDK"]] },
  scorpion: { pal: { K: "#1c0e08", B: "#c8703a", b: "#8a4a22", L: "#eaa062", E: "#ffe040", S: "#f4e4c4", P: "#9ae040" }, h: 11,
    frames: [["..KKKKK.........", ".KBBLBBK........", "KBKKKKSK........", "KBK..KPK........", "KBK...K.........", ".KBK........KK..",
      "..KBKKKKKK.KLBK.", "..KLLBBBBBBKKBBK", ".KBBBBBBBEBBK...", ".KbBbBbBBBBBKLBK", "..KKbKbKbKKK.KK.", "...K.K.K.K......"]] },
  harpy: { pal: { K: "#1e1428", F: "#c89ad8", f: "#8a5aa0", S: "#f2cab4", H: "#6a3a8a", E: "#ff4060", Y: "#f0c040", W: "#f0e0f8" }, h: 12, fly: true,
    frames: [mirror(["KK.....", "KFK....", "KFFK...", ".KFFKKK", "..KFfKH", "...KKHS", "....KSE", "....KFF", "....KfF", ".....KY", "......K"]),
      mirror([".......", ".......", "......K", "KKKKKKH", "KFFFfKS", ".KFFfKS", "..KKKSE", "....KFF", "....KfF", ".....KY", "......K"])] },
  wyvern: { pal: { K: "#10200e", G: "#5aa06a", g: "#2e6a3a", L: "#9ad89a", W: "#7ac08a", w: "#3a7a48", E: "#ffd040", R: "#ff6a3a", Y: "#e8d8a0" }, h: 12, fly: true,
    frames: [["......KK............", ".....KWWK...........", "....KWwWWK..........", "...KWWwWWWK....KKK..", "..KWWwWWWWWK..KGGGK.", "KKKKKKGGGGGKKKGGEGK.",
      "KGgGGGGGGGGGGGGGGRRK", ".KKgGGLLLLLGGGGKKKK.", "...KKgGGGGGgKK......", ".....KYK.KYK........", ".....KK...KK........"],
      ["....................", "....................", "....................", "...............KKK..", "..............KGGGK.", "KKKKKKKKKKKKKKGGEGK.",
      "KGgGGGGGGGGGGGGGGRRK", ".KKgGGLLLLLGGGGKKKK.", "..KWWwGGGGGgKK......", ".KWWwWWKKYK.........", "KWWwWWK.KK.........."]] },
  golem: { pal: { K: "#141820", S: "#7a8ab8", s: "#4a5a80", L: "#a8b8e0", C: "#c0a0ff", c: "#7a4ad8", E: "#ff5a9a" }, h: 20,
    frames: [mirror(["......KKK", ".....KSSS", "....KSLSS", "....KSSSS", "....KSESS", "....KsSSS", "..KKKKKKK", ".KCKSSSSS", "KCCKSLSSS", "KCcKSSSCC",
      "KSSKSSCCc", "KSLKSSSCc", "KSSKsSSSS", "KsSK.KSSS", "KSSK.KsSS", "KKKK.KSSs", "....KSSK.", "....KSSK.", "....KsSK.", "....KKKK."])] },
  imp: { pal: { K: "#1a0808", R: "#d04a5a", r: "#8a2030", Y: "#ffe040", H: "#f0e0c0", W: "#5a1a2a", w: "#8a3a4a" }, h: 12, legs: [[3, 0], [6, 1]],
    frames: [mirror(["H....", "HK...", ".KKKK", "KRRRR", "KRYRR", "KRRRr", ".KrKK", "WKRRR", "WwKRr", ".KRRR", "..Krr"])] },
  sovereign: { pal: { K: "#0a0610", P: "#5a2a8a", p: "#3a1a5a", L: "#8a5ac0", D: "#1e1028", d: "#2e1a40", G: "#ffd040", E: "#ff4a8a", H: "#2a2030", h: "#6a5a78", V: "#c890ff", S: "#b4aac8", s: "#8a80a0" }, h: 28,
    frames: [mirror(["..KK..........", "..KhK.........", "...KhK......KK", "...KHhK....KGG", "....KHHKKKKGGG", ".....KKPPPPPPP", ".....KPPPPPPPP",
      ".....KPSSSSSSS", ".....KPSKEEKSS", ".....KPsSSSSSS", "..KKKKPPsSSKSs", ".KLLLLKKPPPPPP", "KLPPPPPKPPGPPP", "KPPpPPPKPpPGPP",
      "KPpPPPKDPPPPGP", ".KKKKKDdPPPPPG", "...KDDdKPpPPPP", "..KDDdDKPPPPPP", "..KDdDDKGGGGGG", ".KDDdDDKPPpPPP", ".KDdDDDKPPPPPP",
      "KDDdDDDKPpPPPP", "KDdDDDDKPPPPPP", "KDDDDDKKPPpPPP", "KKKKKK.KPPKKKK", "......KppK....", "......KKKK...."])] },
  boss: { pal: { K: "#140608", R: "#c83838", r: "#7a1a20", D: "#3a0e14", Y: "#ffe040", H: "#2a1a1c", h: "#5a4448", F: "#ffb040", f: "#ff6030", W: "#f0e6d0" }, h: 24,
    frames: [mirror([".KK.........", ".KHK........", "..KHK.......", "..KhHK....KK", "...KhHKKKKRR", "....KHHKRRRR", ".....KKRRRRR", "......KRYYRR",
      "......KRRYRR", "......KrRRRR", ".......KrRDD", "....KKKKKrWD", "...KRRRRRKKK", "..KRRRRRRRRF", ".KRrRRRRRRFF", ".KRrKRRRRFFf",
      "KRrK.KRRRRFF", "KrK..KRRRRRF", "KWK..KrRRRRR", "WKW..KrrRRRR", ".....KDrrrrr", ".....KDDDDDD", ".....KKDDDKK", "......KKKK.."])] },
  mechspider: { pal: { K: "#16181e", M: "#c8a030", m: "#8a6a10", L: "#ffe060", E: "#ff5030", S: "#6a6c78", s: "#44464e" }, h: 11, legs: [[2, 0], [5, 1], [10, 0], [13, 1]], legW: 1,
    frames: [mirror(["........", "...KKKK.", "..KMMMMK", ".KMmMMMM", "KMMLMMMM", "KMEMMEMM", "KMMMMMMM", ".KmMMMMm", "..KKKKKK", "...KssK."])] },
  drone: { pal: { K: "#1a1014", B: "#e0704a", b: "#8a3a20", L: "#ffb090", S: "#6a6c78", s: "#3a3c48", E: "#ff3020", W: "#ffffff" }, h: 10, fly: true,
    frames: [mirror([".....KKK", "...KKSSS", "..KSsSSS", ".KKKKKKB", "KBBBBBBB", "KBbBBEBB", "KBBBBBBB", ".KbBBBBB", "..KKKKKK", "....KsK."]),
      mirror(["........", ".....KKK", "...KKSSS", "..KSsSSK", ".KKKKKKB", "KBBBBBBB", "KBbBBEBB", ".KBBBBBB", "..KKKKKK", "....KsK."])] },
};
const ELITE_OUT = "#ffc830";

const foeSkin = type => { const d = ENEMIES[type]; return (d && d.skin) || type; };
const FOE_CACHE = {};
function foeOf(type) {
  if (FOE[type]) return FOE[type];
  if (FOE_CACHE[type]) return FOE_CACHE[type];
  const d = ENEMIES[type] || {}, base = FOE[d.skin] || FOE.slime;
  const f = { ...base, pal: { ...base.pal, ...(d.pal || {}) } };
  FOE_CACHE[type] = f; return f;
}
function drawFoe(g, type, o) {
  const F = foeOf(type), W = !!o.flash, C = c => (W ? "#ffffff" : c), t = o.t || 0, ol = o.elite ? ELITE_OUT : null;
  const step = o.step || 0, wind = o.ph === "wind", hit = o.ph === "hit";
  let fi = 0;
  const skin = foeSkin(type);
  if (skin === "slime") fi = wind || hit ? 1 : step;
  if (skin === "garg" || skin === "harpy" || skin === "wyvern" || type === "drone") fi = Math.floor(t * (skin === "wyvern" ? 5 : 8)) % 2;
  if (skin === "ghost") fi = Math.floor(t * 4) % 2;
  const rows = F.frames[fi], w = rows[0].length, h = rows.length, legH = F.legs ? 2 : 0;
  const bob = skin === "dmage" || skin === "boss" || skin === "necro" || skin === "sovereign" ? R0(Math.sin(t * 3)) : skin === "golem" || skin === "sandworm" ? (step ? -1 : 0) : skin === "ghost" ? R0(Math.sin(t * 4) * 2) - 2 : skin === "bigslime" ? (step ? 1 : 0) : type === "drone" ? R0(Math.sin(t * 9)) : legH && step ? -1 : 0;
  const x0 = -Math.floor(w / 2), y0 = -h - legH + bob;
  if (legH) for (const [lx, ph] of F.legs) {
    const up = step === ph ? 1 : 0;
    rect(g, x0 + lx, -legH - up, F.legW || 1, legH + up - (up ? 1 : 0), C(ol || F.pal.K));
  }
  if (skin === "bigslime" && step) { g.drawImage(sprite(type + ":0", rows, F.pal, W, ol), 0, 0, w, h, x0 - 1, y0 + 1, w + 2, h - 1); }
  else g.drawImage(sprite(type + ":" + fi, rows, F.pal, W, ol), x0, y0);
  if (skin === "goblin") {
    const hx = x0 + 10, hy = y0 + 9, a = wind ? -2.2 : hit ? 0.1 : -0.6, L = hit ? 5 : 4;
    line(g, hx, hy, hx + Math.cos(a) * L, hy + Math.sin(a) * L, C("#dfe4ea")); dot(g, hx, hy, C("#5a3a1a"));
  } else if (skin === "shaman") {
    const hx = x0 + 10, hy = y0 + 10;
    line(g, hx, hy + 4, hx + (wind ? 2 : 0), hy - 8, C("#e8e0c8"));
    rect(g, hx - 1 + (wind ? 2 : 0), hy - 10, 3, 3, C("#f0f0e0")); dot(g, hx + (wind ? 2 : 0), hy - 9, C(OUT));
    if (wind && !W) { g.globalAlpha = 0.5; disc(g, hx + 2, hy - 9, 3, "#7ee89c"); g.globalAlpha = 1; }
  } else if (skin === "bomber") {
    if (!W && (o.fuse || (t * 4 | 0) % 2)) { dot(g, x0 + 6, y0 - 1, "#ffe060"); dot(g, x0 + 7, y0 - 2, "#ff8a30"); }
    if (o.fuse && !W && (t * 12 | 0) % 2) { g.globalAlpha = 0.45; rect(g, x0 + 1, y0 + 3, w - 2, 8, "#ff3020"); g.globalAlpha = 1; }
  } else if (type === "wolf" && hit && !W) {
    rect(g, x0 + 16, y0 + 5, 2, 1, "#ff6060"); dot(g, x0 + 17, y0 + 4, "#ffffff"); dot(g, x0 + 17, y0 + 6, "#ffffff");
  } else if (skin === "orc") {
    const px_ = x0 + 14, py_ = y0 + 11, a = (wind ? -130 : hit ? 25 : -75) * Math.PI / 180, L = 11;
    const ex = px_ + Math.cos(a) * L, ey = py_ + Math.sin(a) * L;
    if (hit && !W) for (let d = -130; d <= 25; d += 6) { const r = d * Math.PI / 180; dot(g, px_ + Math.cos(r) * (L + 2), py_ + Math.sin(r) * (L + 2), "#ffffff"); }
    line(g, px_ - Math.cos(a) * 2, py_ - Math.sin(a) * 2, ex, ey, C("#6a4428"));
    const nx = -Math.sin(a), ny = Math.cos(a);
    for (let k = 0; k < 4; k++) line(g, ex - Math.cos(a) * k, ey - Math.sin(a) * k, ex - Math.cos(a) * k + nx * 4, ey - Math.sin(a) * k + ny * 4, C(k === 0 ? "#ffffff" : "#c8ced8"));
    rect(g, px_ - 1, py_ - 1, 2, 2, C(F.pal.G));
  } else if (skin === "dmage") {
    for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; rect(g, Math.cos(a) * 8 - 1, y0 + 8 + Math.sin(a) * 3, 2, 2, C(i ? "#e8b0ff" : "#b070ff")); }
    if (wind && !W) { g.globalAlpha = 0.5; disc(g, 5, y0 + 6, 3, "#c080ff"); g.globalAlpha = 1; dot(g, 5, y0 + 6, "#ffffff"); }
  } else if (type === "shield" && o.broken && !W) {
    line(g, x0 + 10, y0 + 6, x0 + 12, y0 + 10, OUT); line(g, x0 + 11, y0 + 8, x0 + 9, y0 + 11, OUT); dot(g, x0 + 12, y0 + 7, "#5a6a88");
  } else if (skin === "stalker") {
    const a = wind ? -2.1 : hit ? 0.3 : -0.5;
    for (const [hx, hy] of [[x0 + 10, y0 + 7], [x0 + 1, y0 + 7]]) { line(g, hx, hy, hx + Math.cos(a) * 4 * (hx > 0 ? 1 : -1), hy + Math.sin(a) * 4, C("#d0d8e4")); dot(g, hx, hy, C("#d8c0b0")); }
  } else if (skin === "skeleton") {
    const hx = x0 + 10, hy = y0 + 8, a = wind ? -2.0 : hit ? 0.2 : -0.9;
    line(g, hx, hy, hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, C("#c8ccd4")); dot(g, hx, hy, C("#5a4a3a"));
  } else if (skin === "necro") {
    const hx = x0 + 11, hy = y0 + 9;
    line(g, hx, hy + 8, hx + (wind ? 1 : 0), hy - 8, C("#4a3a2a"));
    rect(g, hx - 1 + (wind ? 1 : 0), hy - 11, 3, 3, C("#e8e0c8")); dot(g, hx + (wind ? 1 : 0), hy - 10, C("#80ff90"));
    if (wind && !W) { g.globalAlpha = 0.5; disc(g, hx + 1, hy - 10, 4, "#80ff90"); g.globalAlpha = 1; }
  } else if (skin === "sovereign") {
    const px_ = x0 + 25, py_ = y0 + 15, a = (wind ? -110 : hit ? 30 : 75) * Math.PI / 180, L = 17;
    const ex = px_ + Math.cos(a) * L, ey = py_ + Math.sin(a) * L, nx = -Math.sin(a), ny = Math.cos(a);
    if (hit && !W) for (let d = -110; d <= 30; d += 5) { const r = d * Math.PI / 180; dot(g, px_ + Math.cos(r) * (L + 2), py_ + Math.sin(r) * (L + 2), "#e0b0ff"); }
    line(g, px_ + nx, py_ + ny, ex + nx, ey + ny, C(OUT)); line(g, px_ - nx, py_ - ny, ex - nx, ey - ny, C(OUT));
    line(g, px_, py_, ex, ey, C("#3a2a4a")); line(g, px_ + Math.cos(a) * 3, py_ + Math.sin(a) * 3, ex, ey, C(W ? "#fff" : (t * 4 | 0) % 2 ? "#c890ff" : "#9a60e0"));
    line(g, px_ - nx * 3, py_ - ny * 3, px_ + nx * 3, py_ + ny * 3, C("#ffd040"));
    rect(g, px_ - 1, py_ - 1, 3, 3, C("#5a2a8a"));
    if (!W && (t * 6 | 0) % 3 === 0) { dot(g, -2, y0 + 8, "#ffffff"); dot(g, 1, y0 + 8, "#ffffff"); }
  } else if (skin === "imp") {
    const hx = x0 + 9, hy = y0 + 6, a = wind ? -2.0 : hit ? 0.3 : -1.2;
    line(g, hx, hy + 5, hx + Math.cos(a) * 7, hy + 5 + Math.sin(a) * 7, C("#4a2a2a"));
    const ex = hx + Math.cos(a) * 7, ey = hy + 5 + Math.sin(a) * 7; dot(g, ex, ey, C("#ffd040")); dot(g, ex + Math.cos(a + 0.6) * 2, ey + Math.sin(a + 0.6) * 2, C("#ffd040")); dot(g, ex + Math.cos(a - 0.6) * 2, ey + Math.sin(a - 0.6) * 2, C("#ffd040"));
    line(g, x0 + 1, y0 + 10, x0 - 2, y0 + 13, C("#8a2030")); dot(g, x0 - 3, y0 + 12, C("#d04a5a"));
  } else if (type === "scorpion" && wind && !W) {
    dot(g, x0 + 6, y0 + 3, "#c8ff80"); dot(g, x0 + 7, y0 + 4, "#9ae040");
  } else if (skin === "golem") {
    if (!W && (t * 3 | 0) % 2) { dot(g, -1, y0 + 9, "#ffffff"); dot(g, 0, y0 + 10, "#ffffff"); }
    if (hit && !W) { rect(g, x0 + 17, y0 + 13, 3, 3, "#c8d0f0"); dot(g, x0 + 20, y0 + 12, "#ffffff"); dot(g, x0 + 20, y0 + 16, "#ffffff"); }
  } else if (type === "treasure") {
    if (!W) { const k2 = (t * 3 | 0) % 2; dot(g, -3, y0 + 4 + k2, "#fff6c0"); dot(g, 3, y0 + 6 - k2, "#fff6c0"); rect(g, x0 + 3, y0 + 3, w - 6, 1, "#ffe8a0"); }
  } else if (skin === "boss") {
    if (!W && (t * 6 | 0) % 2) { dot(g, -1, y0 + 14, "#ffffff"); dot(g, 0, y0 + 14, "#fff0a0"); }
    if (wind && !W) { dot(g, -4, y0 + 7, "#ffffff"); dot(g, 3, y0 + 7, "#ffffff"); }
  }
}

// 1 倍画进 60×60（脚底 30,56）→ Scale2x 到 120×120（脚底 60,112），按帧缓存
function renderFoe(type, o) {
  const sk = foeSkin(type);
  const moving = ["dmage", "boss", "garg", "ghost", "necro", "harpy", "wyvern", "sovereign"].includes(sk) || type === "drone";
  const tq = moving ? Math.floor((o.t || 0) * 6) % 12 : (sk === "bomber" ? Math.floor((o.t || 0) * 12) % 2 : 0);
  const key = [type, o.step || 0, o.ph || "", o.flash ? 1 : 0, o.face || 1, o.elite ? 1 : 0, o.fuse ? 1 : 0, o.broken ? 1 : 0, tq].join("|");
  return cached2x("f:" + key, g => { g.translate(30, 56); g.scale(o.face || 1, 1); drawFoe(g, type, { ...o, t: moving ? tq / 6 : tq / 12 }); }, 60, 60);
}
const FOE_FOOT = [60, 112];
