
// ================= 角色精灵（Liberated Pixel Cup 素材合成） =================
// 20 名角色的像素精灵表由 tools/lpc/ 用 Universal LPC 生成器合成（数据在 lpc-data.js）。每名角色一张图，里面有几行动画（都是面朝右）：
//   walk 行走（第 0 帧是站姿）、hurt 受击（最后一帧倒地）、front 正面站姿（头像用）、cast 施法、atk 出手（挥砍 / 刺击 / 射击，按武器而定）
// 帧尺寸 64（武器大的角色 128 / 192），anims[名].{y,fw,fh,n,ax,ay}，ax/ay 是脚底在帧里的位置。
const LPC_K = 1.5;   // 战场上的放大倍数（RS=2 时每个素材像素正好占 3 个设备像素，边缘不糊）
const LPC_IMG = {}, LPC_FOE_IMG = {};
let lpcReady = false;
function lpcLoad() {
  const ids = Object.keys(LPC_PACK).map(id => [id, LPC_PACK[id], LPC_IMG]).concat(Object.keys(LPC_FOE_PACK).map(id => [id, LPC_FOE_PACK[id], LPC_FOE_IMG]));
  let left = ids.length;
  for (const [id, P, store] of ids) {
    const im = new Image(), e = store[id] = { im, ready: false };
    im.onload = () => { e.ready = true; if (--left === 0) lpcDone(); };
    im.onerror = () => { if (--left === 0) lpcDone(); };
    im.src = P.src;
  }
}
// 图都解码好了：头像、对话半身像之前可能是临时画的，全部重画
function lpcDone() {
  lpcReady = true; HERO_PIC.clear(); FOE_VER++;
  try { for (const D of UNITS) drawPortrait(D); teamKey = ""; cardKey = ""; piTeamKey = ""; hudKey = ""; } catch (e) { }
}
const LPC_ATK_LEN = { slash: 0.42, thrust: 0.4, shoot: 0.36, cast: 0.4 };
const lpcOk = (id, foe) => lpcReady && (foe ? LPC_FOE_IMG : LPC_IMG)[id] && (foe ? LPC_FOE_IMG : LPC_IMG)[id].ready;
// 一帧：根据状态选动画和帧号，画到 (x, y)（脚底）。o: { t, id, face, atkT, walking, hurt, flash, skill, down, lv }；怪物另有 foe: true、tint（盖色）、sx / sy（压扁）、phase（行走相位）
function drawLpc(g, D, o, x, y, ks) {
  if (!lpcOk(D.id, o.foe)) return false;
  const P = (o.foe ? LPC_FOE_PACK : LPC_PACK)[D.id], A = P.anims, t = o.t || 0; let a, f = 0, bobY = 0;
  const atk = A.atk, atkLen = (P.atk === "slash_128" || P.atk === "slash_oversize" || P.atk === "slash") ? 0.42 : P.atk === "shoot" ? 0.36 : 0.4;
  if (o.down) { a = A.hurt; f = a.n - 1; }
  else if (o.hurt) { a = A.hurt; f = Math.min(2, a.n - 1); }
  else if (o.cast != null && o.cast >= 0 && A.cast) { a = A.cast; f = Math.min(a.n - 1, Math.floor(o.cast * a.n)); bobY = -2.5 * Math.sin(Math.min(1, o.cast) * Math.PI); }   // 放招：施法动作播一遍，身子微微抬起
  else if (o.atkT != null && o.atkT >= 0 && o.atkT < atkLen) { a = atk; f = Math.min(a.n - 1, Math.floor(o.atkT / atkLen * a.n)); }
  else if (o.skill) { a = A.cast; f = Math.floor(t * 9) % a.n; }
  else if (o.walking) { a = A.walk; f = 1 + Math.floor(o.phase != null ? o.phase : t * 11) % (a.n - 1); }
  else { a = A.walk; f = 0; bobY = Math.sin(t * 2.6 + (o.id || 0)) * 0.6; }   // 站着：轻轻起伏
  const k = LPC_K * (ks || 1), im = (o.foe ? LPC_FOE_IMG : LPC_IMG)[D.id].im;
  g.save(); g.translate(x, y + bobY * k); g.scale((o.face || 1) * k * (o.sx || 1), k * (o.sy || 1));
  // 受击闪白、转职染色：先画到小画布上盖一层颜色再贴上来（3 阶淡金，4 阶 A 偏蓝白 / B 偏红）
  const lv = o.lv || 1, tint = o.flash ? "rgba(255,255,255,.75)" : o.tint ? o.tint : lv >= 4 ? (o.branch === "B" ? "rgba(255,70,50,.26)" : "rgba(160,210,255,.28)") : lv >= 3 ? "rgba(255,210,90,.16)" : null;
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
// 静态图（头像、对话半身像、技能特写）：正面站姿放大 4 倍画进 256×256 的缓存画布（最近邻，保持像素块）。带转职染色
const HERO_PIC = new Map(), HERO_PIC_POOL = [];
function heroPic(D, o) {
  o = o || {};
  const key = [D.id, o.lv || 1, o.branch || "", o.face || 1].join("|");
  let c = HERO_PIC.get(key); if (c) return c;
  const ready = lpcOk(D.id);
  if (HERO_PIC.size >= 60) { for (const v of HERO_PIC.values()) HERO_PIC_POOL.push(v); HERO_PIC.clear(); }
  c = HERO_PIC_POOL.pop() || document.createElement("canvas"); c.width = 256; c.height = 256;   // 赋宽高顺便清空
  if (!ready) return c;   // 还没加载好：给一张空的，不缓存，加载完会整体重画
  const g = c.getContext("2d"), P = LPC_PACK[D.id], fr = P.anims.front; g.imageSmoothingEnabled = false;
  if (o.face === -1) { g.translate(256, 0); g.scale(-1, 1); }
  g.drawImage(LPC_IMG[D.id].im, 0, fr.y, 64, 64, 0, 0, 256, 256);
  const lv = o.lv || 1;
  if (lv >= 3) { g.globalCompositeOperation = "source-atop"; g.fillStyle = lv >= 4 ? (o.branch === "B" ? "rgba(255,70,50,.26)" : "rgba(160,210,255,.28)") : "rgba(255,210,90,.16)"; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = "source-over"; }
  HERO_PIC.set(key, c); return c;
}
// 出手阶段（只用来判断「在出手」）
function heroPhase(D, atkT) { return atkT != null && atkT >= 0 && atkT < 0.42 ? "strike" : "idle"; }
