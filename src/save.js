
// ================= 存档：读写、版本升级、导出导入、星星账本、角色等级 =================
// ---------- 存档 ----------
const SAVE_KEY = "chenxing-td-v2";
function loadSave() {
  let v = {};
  try { v = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch (e) { v = {}; }
  const arr = k => (Array.isArray(v[k]) ? v[k] : []), obj = k => (v[k] && typeof v[k] === "object" && !Array.isArray(v[k]) ? v[k] : {});
  const d = { stars: arr("stars"), best: arr("best"), perks: arr("perks"), seen: arr("seen"), achv: arr("achv"), diffClear: obj("diffClear"), daily: obj("daily"),
    tutorial: !!v.tutorial, chars: obj("chars"), story: arr("story"), hero: v.hero || "knight", vigil: obj("vigil"), tal: obj("tal"), form: typeof v.form === "number" ? v.form : 1, autoWave: v.autoWave !== false,
    foeKill: obj("foeKill"), use: obj("use"), afxSeen: arr("afxSeen"), evSeen: arr("evSeen"),
    disk: obj("disk"), abyss: obj("abyss"), week: obj("week"), relicSeen: arr("relicSeen"), bonusStars: +v.bonusStars || 0, v11: !!v.v11, v5: !!v.v5, v7: !!v.v7 };
  // 11.0：星之祝福升级成天赋星盘，以前花掉的星星全部退还
  if (!d.v11) { d.v11 = true; d.refunded = d.perks.length; d.perks = []; writeSave(d); }
  if (!d.v5) { const cleared = d.stars.filter(x => x > 0).length; for (const u of UNITS) if (!u.joinAt) { const c = d.chars[u.id] || (d.chars[u.id] = { exp: 0 }); c.exp = Math.max(c.exp || 0, cleared * 150); } d.v5 = true; writeSave(d); }
  return d;
}
function writeSave(d) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) { } }
function editSave(fn) { const d = loadSave(); fn(d); writeSave(d); return d; }
const saveStars = (i, s) => editSave(d => { d.stars[i] = Math.max(d.stars[i] || 0, s); });
const saveBest = (i, w) => editSave(d => { d.best[i] = Math.max(d.best[i] || 0, w); });
const endlessStars = (d, i) => Math.min(3, Math.floor((d.best[i] || 0) / 10));
function starBank() {
  const d = loadSave();
  const earned = STAGES.reduce((n, _, i) => n + (d.stars[i] || 0) + endlessStars(d, i) + ((d.diffClear[i] || []).length), 0) + d.achv.length;
  const abyssEarned = Object.values(d.abyss).reduce((n, top) => { for (let l = 1; l <= top; l++) n += abyssStars(l); return n; }, 0);
  const weekEarned = Object.keys(d.week).filter(k => d.week[k] && d.week[k].clear).length * WEEK_STARS;
  const total = earned + abyssEarned + weekEarned + d.bonusStars;
  const spent = diskSpent(d.disk);
  return { earned: total, spent, left: total - spent, perks: d.perks, disk: d.disk };
}
const unlocked = i => i === 0 || (loadSave().stars[i - 1] || 0) > 0;
const starHtml = n => `<span class="stars">${[0, 1, 2].map(i => i < n ? "★" : '<span class="off">★</span>').join("")}</span>`;

// ---------- 角色等级 ----------
function levelOf(exp) { let lv = 1, e = exp || 0; while (lv < PROG.max && e >= expNeed(lv)) { e -= expNeed(lv); lv++; } return { lv, into: e, need: lv < PROG.max ? expNeed(lv) : 0 }; }
function joinExp(D) { let e = 0; for (let l = 1; l < (D.joinAt || 0); l++) e += expNeed(l); return e; }
const charExp = (d, id) => Math.max((d.chars[id] && d.chars[id].exp) || 0, joinExp(UNITS.find(u => u.id === id) || {}));
function charLevels(d) { d = d || loadSave(); const o = {}; for (const u of UNITS) o[u.id] = levelOf(charExp(d, u.id)).lv; return o; }
const charOpen = u => unlocked(u.joinAt || 0);
const openChars = () => UNITS.filter(charOpen);

// ---------- 存档导出 / 导入 ----------
const SAVE_TAG = "CX9";
function exportSave() {
  try { return SAVE_TAG + "-" + btoa(unescape(encodeURIComponent(JSON.stringify(loadSave())))); }
  catch (e) { return ""; }
}
function importSave(code) {
  const txt = String(code || "").trim().replace(/\s+/g, "");
  const body = txt.startsWith(SAVE_TAG + "-") ? txt.slice(SAVE_TAG.length + 1) : txt;
  let d;
  try { d = JSON.parse(decodeURIComponent(escape(atob(body)))); } catch (e) { return "这串代码看不懂，请确认完整复制了。"; }
  if (!d || typeof d !== "object" || !Array.isArray(d.stars)) return "这不是《晨星守望》的存档代码。";
  writeSave(d);
  return null;
}
