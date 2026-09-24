
// ================= 存档：读写、版本升级、导出导入、星星账本、角色等级 =================
// ---------- 存档 ----------
const SAVE_KEY = "chenxing-td-v2", BACKUP_KEY = SAVE_KEY + "-backup";
// 存档版本：改存档结构时 +1，并在 SAVE_MIGRATE 末尾加一步升级。旧存档读进来会按顺序补跑还没跑过的步骤。
// 新加存档字段还要在 loadSave 的白名单里声明（带类型清洗），否则下次写存档就被丢掉。
const SAVE_VER = 12;
const SAVE_MIGRATE = [
  // 5.0：角色等级上线，按已通关关卡数补发初始角色经验
  [5, d => { const cleared = d.stars.filter(x => x > 0).length; for (const u of UNITS) if (!u.joinAt) { const c = d.chars[u.id] || (d.chars[u.id] = { exp: 0 }); c.exp = Math.max(c.exp || 0, cleared * 150); } }],
  // 11.0：星之祝福升级成天赋星盘，以前花掉的星星全部退还（选关页提示一次）
  [11, d => { d.refunded = d.perks.length; d.perks = []; }],
  // 12：存档带上版本号 ver，数据结构不变
  [12, () => { }],
];
// 清洗用的小工具：数字夹在范围内、只留认识的 id，这样导入被改坏的存档也不会让页面出错
const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);
const clampN = (x, lo, hi) => { x = +x; return isFinite(x) ? Math.min(hi == null ? Infinity : hi, Math.max(lo, x)) : lo; };
const numMap = (o, lo, hi) => Object.fromEntries(Object.entries(isObj(o) ? o : {}).filter(([, x]) => x != null && isFinite(+x)).map(([k, x]) => [k, clampN(x, lo, hi)]));
const objMap = (o, fn) => Object.fromEntries(Object.entries(isObj(o) ? o : {}).filter(([, x]) => isObj(x)).map(([k, x]) => [k, fn(x, k)]));
const idList = (a, ok) => [...new Set((Array.isArray(a) ? a : []).filter(x => typeof x === "string" && (!ok || ok(x))))];
// 旧存档没有 ver，用以前的升级标记推算跑到了哪一步
const legacyVer = v => (v.v5 ? (v.v11 ? 11 : 5) : 0);
// noBackup：导入/恢复时用，那时已经先备份过玩家自己的进度了，升级前别再拿导入的数据把备份冲掉
function loadSave(noBackup) {
  let raw = null, v = {};
  try { raw = localStorage.getItem(SAVE_KEY); v = JSON.parse(raw || "{}"); } catch (e) { v = {}; }
  if (!isObj(v)) v = {};
  const arr = k => (Array.isArray(v[k]) ? v[k] : []), obj = k => (isObj(v[k]) ? v[k] : {});
  const achvIds = new Set(ACHV.map(a => a.id)), diffIds = new Set(DIFFS.map(x => x.id)), diskMax = Object.fromEntries(DISK.map(x => [x.id, x.max]));
  const d = {
    stars: arr("stars").slice(0, STAGES.length).map(x => Math.round(clampN(x, 0, 3))), best: arr("best").slice(0, STAGES.length).map(x => Math.floor(clampN(x, 0))),
    perks: idList(v.perks), seen: idList(v.seen, id => !!ENEMIES[id]), achv: idList(v.achv, id => achvIds.has(id)),
    diffClear: Object.fromEntries(Object.entries(obj("diffClear")).map(([k, a]) => [k, idList(a, id => diffIds.has(id))])),
    daily: objMap(v.daily, r => ({ wave: Math.floor(clampN(r.wave, 0)), cleared: !!r.cleared })),
    tutorial: !!v.tutorial, chars: objMap(v.chars, c => ({ ...c, exp: Math.floor(clampN(c.exp, 0)) })), story: idList(v.story),
    hero: UNITS.some(u => u.id === v.hero) ? v.hero : "knight",
    vigil: isObj(v.vigil) ? { best: Math.floor(clampN(v.vigil.best, 0)), clear: !!v.vigil.clear, runs: Math.floor(clampN(v.vigil.runs, 0)) } : {},
    tal: objMap(v.tal, t => Object.fromEntries(Object.entries(t).filter(([, n]) => typeof n === "string" || n === null))),
    form: Number.isInteger(v.form) && v.form >= 0 && v.form < FORMS.length ? v.form : 1, autoWave: v.autoWave !== false,
    foeKill: numMap(v.foeKill, 0), use: objMap(v.use, u => numMap(u, 0)),
    afxSeen: idList(v.afxSeen, id => !!AFFIX_BY[id]), evSeen: idList(v.evSeen, id => EVENTS.some(e => e.id === id)),
    disk: Object.fromEntries(Object.entries(numMap(v.disk, 0)).filter(([k]) => k in diskMax).map(([k, n]) => [k, Math.min(diskMax[k], Math.floor(n))])),
    abyss: Object.fromEntries(Object.entries(numMap(v.abyss, 0, ABYSS_MAX)).map(([k, n]) => [k, Math.floor(n)])),
    week: objMap(v.week, r => ({ clear: !!r.clear, best: Math.floor(clampN(r.best, 0)) })),
    gfx: Number.isInteger(v.gfx) && v.gfx >= -1 && v.gfx <= 2 ? v.gfx : -1,   // 画质：-1 自动，0 低 1 中 2 高
    relicSeen: idList(v.relicSeen, id => !!RELIC_BY[id]), bonusStars: Math.floor(clampN(v.bonusStars, 0)), refunded: Math.floor(clampN(v.refunded, 0)),
    ver: Number.isInteger(v.ver) ? v.ver : legacyVer(v),
  };
  if (d.ver < SAVE_VER) {
    if (raw && !noBackup) backupSave(raw, `升级前的存档（版本 ${d.ver}）`);
    for (const [to, fn] of SAVE_MIGRATE) if (d.ver < to) { fn(d); d.ver = to; }
    writeSave(d);
  }
  return d;
}
// 备份只留一份：导入别的存档、存档升级之前各自动存一次；存档页可以一键恢复（恢复时会把当前存档换进备份，所以还能再换回来）
function backupSave(raw, why) { try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: Date.now(), why, data: raw })); } catch (e) { } }
function readBackup() { try { const b = JSON.parse(localStorage.getItem(BACKUP_KEY) || "null"); return b && typeof b.data === "string" ? b : null; } catch (e) { return null; } }
function restoreBackup() {
  const b = readBackup(); if (!b) return false;
  const cur = localStorage.getItem(SAVE_KEY);
  try { localStorage.setItem(SAVE_KEY, b.data); } catch (e) { return false; }
  if (cur) backupSave(cur, "恢复备份之前的存档"); else localStorage.removeItem(BACKUP_KEY);
  writeSave(loadSave(true));
  return true;
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
const starHtml = n => `<span class="stars">${[0, 1, 2].map(i => i < n ? '<span class="on">★</span>' : '<span class="off">★</span>').join("")}</span>`;

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
  if (!isObj(d) || !Array.isArray(d.stars)) return "这不是《晨星守望》的存档代码。";
  if (Number.isInteger(d.ver) && d.ver > SAVE_VER) return "这份存档来自更新的版本，请先把游戏更新到最新再导入。";
  const cur = localStorage.getItem(SAVE_KEY);
  if (cur) backupSave(cur, "导入存档之前的进度");
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch (e) { return "浏览器不让写入存档（可能是隐私模式或空间满了）。"; }
  writeSave(loadSave(true));   // 读一遍：补跑版本升级、清洗掉类型不对的字段，再存回去
  return null;
}
