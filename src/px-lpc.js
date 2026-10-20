
// ================= 角色精灵（Liberated Pixel Cup 素材合成） =================
// 20 名角色的像素精灵表由 tools/lpc/ 用 Universal LPC 生成器合成（数据在 lpc-data.js）。每名角色一张图，里面有几行动画（都是面朝右）：
//   walk 行走（第 0 帧是站姿）、hurt 受击（最后一帧倒地）、front 正面站姿（头像用）、cast 施法、atk 出手（挥砍 / 刺击 / 射击，按武器而定）
// 帧尺寸 64（武器大的角色 128 / 192），anims[名].{y,fw,fh,n,ax,ay}，ax/ay 是脚底在帧里的位置。
const LPC_K = 1.5;   // 战场上的放大倍数（RS=2 时每个素材像素正好占 3 个设备像素，边缘不糊）
// 角色：每人 nude（裸体）+ 两套外观各 3 个阶段（s0t2…s1t4）+ weapon（武器层，大尺寸武器的出手动画单独一层，叠在身体上面）。
// 阶数 1 = 裸体，2 / 3 / 4 阶一件件穿上当前外观的衣服；部件图按需加载（头像要 4 阶 + 武器，战场上要全部阶段）。
const LPC_IMG = {}, LPC_FOE_IMG = {};
const SKIN_EQ = {};                     // 每名角色当前穿的外观（0 / 1），来自存档
const skinEq = id => SKIN_EQ[id] | 0;
let lpcReady = false, lpcLeft = 0;
function lpcWant(id, part) {            // 请求加载某名角色的某个部件图（已经请求过就什么都不做）
  const P = LPC_PACK[id]; if (!P || !P.parts[part]) return null;
  const store = LPC_IMG[id] || (LPC_IMG[id] = {}); if (store[part]) return store[part];
  const im = new Image(), e = store[part] = { im, ready: false };
  im.onload = () => { e.ready = true; lpcDirty(); }; im.src = P.parts[part].src; return e;
}
const lpcTiers = (id, skin) => ["nude", `s${skin}t2`, `s${skin}t3`, `s${skin}t4`];
function lpcWantHero(id, full) {        // full = 战场上要用的全部阶段；否则只要头像要用的（裸体、4 阶、武器）
  const skin = skinEq(id); lpcWant(id, "weapon"); lpcWant(id, "nude"); lpcWant(id, `s${skin}t4`);
  if (full) { lpcWant(id, `s${skin}t2`); lpcWant(id, `s${skin}t3`); }
}
function lpcLoad() {
  const ids = Object.keys(LPC_FOE_PACK); lpcLeft = ids.length;
  for (const id of ids) {
    const im = new Image(), e = LPC_FOE_IMG[id] = { im, ready: false };
    im.onload = () => { e.ready = true; if (--lpcLeft === 0) lpcDone(); }; im.onerror = () => { if (--lpcLeft === 0) lpcDone(); };
    im.src = LPC_FOE_PACK[id].src;
  }
  for (const id in LPC_PACK) lpcWantHero(id, false);
}
// 有新图解码好：头像、对话半身像之前可能是临时画的，隔一会儿统一重画（一批图连着到的时候只重画一次）
let lpcDirtyT = 0;
function lpcDirty() { clearTimeout(lpcDirtyT); lpcDirtyT = setTimeout(lpcDone, 60); }
function lpcDone() {
  lpcReady = true; HERO_PIC.clear(); FOE_VER++;
  try { for (const D of UNITS) drawPortrait(D); teamKey = ""; cardKey = ""; piTeamKey = ""; hudKey = ""; if (typeof drawSkinThumbs === "function") drawSkinThumbs(); } catch (e) { }
}
const LPC_ATK_LEN = { slash: 0.42, thrust: 0.4, shoot: 0.36, cast: 0.4 };
// 角色某一阶当前能用的图层：优先这一阶，没加载好就退到低一阶（最低裸体）
function heroLayers(id, tier) {
  const P = LPC_PACK[id], st = LPC_IMG[id]; if (!P || !st) return null;
  const w = st.weapon && st.weapon.ready ? st.weapon : null, skin = skinEq(id);
  for (let t = Math.max(1, Math.min(4, tier | 0 || 1)); t >= 1; t--) {
    const part = t === 1 ? "nude" : `s${skin}t${t}`, e = st[part];
    if (e && e.ready) return { P, b: e.im, BA: P.parts[part].anims, w: w && w.im, WA: w && P.parts.weapon.anims };
    lpcWant(id, part);
  }
  return null;
}
const lpcOk = (id, foe) => (foe ? lpcReady && LPC_FOE_IMG[id] && LPC_FOE_IMG[id].ready : !!heroLayers(id, 1));
// 一帧：根据状态选动画和帧号，画到 (x, y)（脚底）。o: { t, id, face, atkT, cast, walking, hurt, flash, down, lv（阶数 = 穿几阶的衣服） }
// 怪物另有 foe: true、tint（盖色）、sx / sy（压扁）、phase（行走相位）
function drawLpc(g, D, o, x, y, ks) {
  if (o.foe) return drawLpcFoe(g, D, o, x, y, ks);
  const L = heroLayers(D.id, o.tier != null ? o.tier : o.lv || 1); if (!L) return false;
  const BA = L.BA, t = o.t || 0; let name, f = 0, bobY = 0;
  const atkLen = LPC_ATK_LEN[L.P.std] || 0.4;
  if (o.down) { name = "hurt"; f = BA.hurt.n - 1; }
  else if (o.hurt) { name = "hurt"; f = Math.min(2, BA.hurt.n - 1); }
  else if (o.cast != null && o.cast >= 0) { name = "atk"; f = Math.min(BA.atk.n - 1, Math.floor(o.cast * BA.atk.n)); bobY = -2.5 * Math.sin(Math.min(1, o.cast) * Math.PI); }   // 放招：用自己的出手动作（武器一直在手上）慢速做一遍，身子微微抬起
  else if (o.atkT != null && o.atkT >= 0 && o.atkT < atkLen) { name = "atk"; f = Math.min(BA.atk.n - 1, Math.floor(o.atkT / atkLen * BA.atk.n)); }
  else if (o.walking) { name = "walk"; f = 1 + Math.floor(o.phase != null ? o.phase : t * 11) % (BA.walk.n - 1); }
  else { name = "walk"; f = 0; bobY = Math.sin(t * 2.6 + (o.id || 0)) * 0.6; }   // 站着：轻轻起伏
  const k = LPC_K * (ks || 1), b = BA[name], WA = L.w && L.WA[name], w = WA ? Math.min(f, WA.n - 1) : 0;
  g.save(); g.translate(x, y + bobY * k); g.scale((o.face || 1) * k, k);
  if (o.flash) {   // 受击闪白：身体和武器先画到小画布上盖一层白再贴上来
    const c = lpcTmp(192, 192), cg = c.getContext("2d"); cg.clearRect(0, 0, 192, 192);
    cg.drawImage(L.b, f * b.fw, b.y, b.fw, b.fh, 96 - b.ax, 122 - b.ay, b.fw, b.fh);
    if (WA) cg.drawImage(L.w, w * WA.fw, WA.y, WA.fw, WA.fh, 96 - WA.ax, 122 - WA.ay, WA.fw, WA.fh);
    cg.globalCompositeOperation = "source-atop"; cg.fillStyle = "rgba(255,255,255,.75)"; cg.fillRect(0, 0, 192, 192); cg.globalCompositeOperation = "source-over";
    g.drawImage(c, 0, 0, 192, 192, -96, -122, 192, 192);
  } else {
    g.drawImage(L.b, f * b.fw, b.y, b.fw, b.fh, -b.ax, -b.ay, b.fw, b.fh);
    if (WA) g.drawImage(L.w, w * WA.fw, WA.y, WA.fw, WA.fh, -WA.ax, -WA.ay, WA.fw, WA.fh);
  }
  g.restore(); return true;
}
// 怪物：每种一张图（walk / atk 两行）
function drawLpcFoe(g, D, o, x, y, ks) {
  if (!lpcOk(D.id, true)) return false;
  const P = LPC_FOE_PACK[D.id], A = P.anims, t = o.t || 0; let a, f = 0, bobY = 0;
  const atk = A.atk, atkLen = (P.atk === "slash_128" || P.atk === "slash_oversize" || P.atk === "slash") ? 0.42 : P.atk === "shoot" ? 0.36 : 0.4;
  if (o.cast != null && o.cast >= 0) { a = atk; f = Math.min(a.n - 1, Math.floor(o.cast * a.n)); bobY = -2.5 * Math.sin(Math.min(1, o.cast) * Math.PI); }
  else if (o.atkT != null && o.atkT >= 0 && o.atkT < atkLen) { a = atk; f = Math.min(a.n - 1, Math.floor(o.atkT / atkLen * a.n)); }
  else if (o.walking) { a = A.walk; f = 1 + Math.floor(o.phase != null ? o.phase : t * 11) % (a.n - 1); }
  else { a = A.walk; f = 0; bobY = Math.sin(t * 2.6 + (o.id || 0)) * 0.6; }
  const k = LPC_K * (ks || 1), im = LPC_FOE_IMG[D.id].im;
  g.save(); g.translate(x, y + bobY * k); g.scale((o.face || 1) * k * (o.sx || 1), k * (o.sy || 1));
  const tint = o.flash ? "rgba(255,255,255,.75)" : o.tint || null;
  if (tint) {
    const c = lpcTmp(a.fw, a.fh), cg = c.getContext("2d"); cg.clearRect(0, 0, a.fw, a.fh); cg.drawImage(im, f * a.fw, a.y, a.fw, a.fh, 0, 0, a.fw, a.fh);
    cg.globalCompositeOperation = "source-atop"; cg.fillStyle = tint; cg.fillRect(0, 0, a.fw, a.fh); cg.globalCompositeOperation = "source-over";
    g.drawImage(c, 0, 0, a.fw, a.fh, -a.ax, -a.ay, a.fw, a.fh);
  } else g.drawImage(im, f * a.fw, a.y, a.fw, a.fh, -a.ax, -a.ay, a.fw, a.fh);
  g.restore(); return true;
}
let lpcTmpCv = null;
function lpcTmp(w, h) { if (!lpcTmpCv) lpcTmpCv = document.createElement("canvas"); if (lpcTmpCv.width !== w) lpcTmpCv.width = w; if (lpcTmpCv.height !== h) lpcTmpCv.height = h; return lpcTmpCv; }
// 统一入口（还没加载好时什么都不画，几十毫秒的事）
function drawHeroFig(g, D, o, x, y, ks) {
  const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  const ok = drawLpc(g, D, o, x, y, ks); g.imageSmoothingEnabled = sm; return ok;
}
// 静态图（头像、对话半身像、技能特写）：正面站姿放大 4 倍画进 256×256 的缓存画布（最近邻，保持像素块）。
// o.lv = 穿几阶的衣服（1 = 裸体，不写 = 4 阶全套）
const HERO_PIC = new Map(), HERO_PIC_POOL = [];
function heroPic(D, o) {
  o = o || {};
  const tier = o.lv >= 1 ? Math.min(4, o.lv) : 4, key = [D.id, tier, skinEq(D.id), o.face || 1].join("|");
  let c = HERO_PIC.get(key); if (c) return c;
  const L = heroLayers(D.id, tier);
  if (HERO_PIC.size >= 60) { for (const v of HERO_PIC.values()) HERO_PIC_POOL.push(v); HERO_PIC.clear(); }
  c = HERO_PIC_POOL.pop() || document.createElement("canvas"); c.width = 256; c.height = 256;   // 赋宽高顺便清空
  if (!L) return c;   // 还没加载好：给一张空的，不缓存，加载完会整体重画
  const g = c.getContext("2d"), fr = L.BA.front, wf = L.w && L.WA.front; g.imageSmoothingEnabled = false;
  if (o.face === -1) { g.translate(256, 0); g.scale(-1, 1); }
  g.drawImage(L.b, 0, fr.y, 64, 64, 0, 0, 256, 256);
  if (wf) g.drawImage(L.w, 0, wf.y, wf.fw, wf.fh, (fr.ax - wf.ax) * 4, (fr.ay - wf.ay) * 4, wf.fw * 4, wf.fh * 4);
  HERO_PIC.set(key, c); return c;
}
// 出手阶段（只用来判断「在出手」）
function heroPhase(D, atkT) { return atkT != null && atkT >= 0 && atkT < 0.42 ? "strike" : "idle"; }
