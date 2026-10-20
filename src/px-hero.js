
// ---------- 角色的 Q 版矢量渲染在 px-chibi.js。这里只留：石像守卫（召唤物）的像素画、颜色混合、转职配色、出手阶段、头像 ----------
// 米拉的石像守卫「咚咚」
const GOLEM_PAL = { K: "#1c1a24", S: "#9ab0c8", s: "#6a7a94", L: "#c8d6e6", C: "#7af0e0", c: "#3ab0a8", E: "#7af0e0", M: "#6aa858" };
const GOLEM_ROWS = [".....KKKKKK.....", "...KKSSLLSSKK...", "..KSSLLLSSMSSK..", "..KSSEESSEESsK..", "..KSSEESSEESsK..", "..KsSSSSSSSSsK..",
  ".KKKsSSSSSSsKKK.", "KSSKKKKKKKKKKSSK", "KSLSKSSCCSSKSLSK", "KSSSKSCCCcSKSSsK", "KsSsKSSCcSSKsSsK", ".KKKKSSSSSSKKKK.", "....KsSSSSsK....",
  "...KSSK..KSSK...", "...KssK..KssK...", "...KKKK..KKKK..."];
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
function heroPhase(D, atkT) {
  const w = (CHIBI[D.id] || {}).weapon;
  if (w === "sword" || w === "dagger") return atkT < 0.13 ? "wind" : atkT < 0.25 ? "strike" : atkT < 0.4 ? "recover" : "idle";
  return atkT < 0.17 ? "wind" : atkT < 0.32 ? "release" : "idle";
}

function drawGolem(g, o) {
  const ph = o.phase || "idle", W = !!o.flash, lean = ph === "wind" ? -1 : ph === "strike" ? 2 : 0, lift = ph === "wind" ? -1 : 0;
  const bob = o.bob || 0;
  g.drawImage(sprite("golem_s", GOLEM_ROWS, GOLEM_PAL, W), -8 + lean, -16 + bob + lift);
  if (!W) { const glow = ((o.t || 0) * 4 | 0) % 2; if (glow) { dot(g, -3 + lean, -13 + bob + lift, "#ffffff"); dot(g, 2 + lean, -13 + bob + lift, "#ffffff"); } }
  if (ph === "strike" && !W) { rect(g, 8 + lean, -9, 3, 3, "#c8d6e6"); dot(g, 11 + lean, -8, "#ffffff"); dot(g, 11 + lean, -10, "#ffffff"); }
}
// 石像守卫仍是像素图：画进 48×44 的小画布再用 Scale2x 放大到 96×88（脚底在 48,80），按帧缓存
const HCW = 48, HOX = 24;
function renderHero(D, o) {
  const ph = o.phase || "idle", tq = ph === "idle" ? ((o.t || 0) * 2 | 0) % 2 : Math.floor((o.t || 0) * 12) % 12;
  const key = [D.id, ph, o.bob || 0, o.flash ? 1 : 0, o.face || 1, tq].join("|");
  return cached2x(key, g => { g.translate(HOX, 40); g.scale(o.face || 1, 1); drawGolem(g, { ...o, t: tq / (ph === "idle" ? 2 : 12) }); }, HCW, 44);
}

// 卡片和信息栏头像
function drawPortrait(D, canvas, lv, branch) {
  const cvs = canvas || document.getElementById("pt-" + D.id);
  if (!cvs) return;
  const size = cvs.clientWidth || 40, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(size * dpr); cvs.height = Math.round(size * dpr);
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = true; cvs.style.imageRendering = "auto";   // 头像用平滑缩放，不要最近邻硬拉伸
  g.fillStyle = D.color; g.fillRect(0, 0, cvs.width, cvs.height);
  g.fillStyle = "rgba(0,0,0,.16)"; for (let y = 0; y < cvs.height; y += Math.max(2, dpr * 2)) g.fillRect(0, y, cvs.width, Math.max(1, dpr));
  g.drawImage(heroPic(D, { face: 1, lv: lv || 1, branch }), 56, 30, 144, 144, 0, 0, cvs.width, cvs.height);
}
