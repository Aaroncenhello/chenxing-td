
// ================= 界面：存档、顶栏、队伍、卡牌栏 =================
const $ = id => document.getElementById(id);
const teamEl = $("team"), cardbarEl = $("cardbar"), infoEl = $("info"), spellsEl = $("spells");
function setText(id, v) { const el = $(id); if (!el) return; const s = String(v); if (el.textContent !== s) el.textContent = s; }
let menuOpen = false;

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

// ---------- 提示 ----------
function toast(html, draw) {
  const el = document.createElement("div"); el.className = "toast";
  el.innerHTML = (draw ? '<canvas aria-hidden="true"></canvas>' : "") + `<div>${html}</div>`;
  $("toasts").appendChild(el);
  if (draw) draw(el.querySelector("canvas"));
  setTimeout(() => el.remove(), 6000);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}
function drawFoeIcon(cvs, type) {
  cvs.width = 52; cvs.height = 52; const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false;
  const big = renderFoe(type, { face: 1, t: 0 }), F = foeOf(type);
  const sz = Math.max(F.h * 2 + 8, F.frames[0][0].length * 2 + 4, 36);
  g.drawImage(big, 60 - sz / 2, 115 - sz, sz, sz, 0, 0, 52, 52);
}
function unlockAchv(id) {
  const a = ACHV.find(x => x.id === id); if (!a) return false;
  let isNew = false; editSave(d => { if (!d.achv.includes(id)) { d.achv.push(id); isNew = true; } });
  if (isNew) toast(`<b>成就达成 · ${a.name}</b>${a.desc}（+1★）`);
  return isNew;
}
function handleEvents() {
  while (S.events.length) {
    const ev = S.events.shift();
    if (ev.type === "achv") unlockAchv(ev.id);
    else if (ev.type === "relic") { const R = RELIC_BY[ev.id]; editSave(d => { if (!d.relicSeen.includes(ev.id)) d.relicSeen.push(ev.id); }); toast(`<b>遗物 · ${R.name}</b>${R.desc}（${S.relics.length}/${RELIC_MAX}）`, c => drawRelicIcon(c, ev.id, 44)); }
    else if (ev.type === "syn") toast(`<b>羁绊 · ${ev.name}</b>${ev.desc}`);
    else if (ev.type === "first") storyOn(ev.enemy);
    else if (ev.type === "seen") {
      let isNew = false; editSave(d => { if (!d.seen.includes(ev.enemy)) { d.seen.push(ev.enemy); isNew = true; } });
      if (isNew) toast(`<b>新敌人 · ${ENEMIES[ev.enemy].name}</b>${ENEMY_DESC[ev.enemy] || ""}`, c => drawFoeIcon(c, ev.enemy));
    }
  }
}

// ---------- 顶栏 ----------
function updateStats() {
  setText("s-level", (S.daily ? "每日挑战 · " : S.vigil ? "守望之战 · " : S.endless ? "无尽 · " : `第 ${S.stage + 1} 关 · `) + ST.name + (S.diff && !S.daily ? " · " + DIFFS[S.diff].name : ""));
  setText("s-hp", Math.ceil(S.crystal.hp));
  setText("s-lv", S.level);
  setText("s-wave", S.endless ? `${S.wave}/∞` : `${S.wave}/${ST.waves}`);
  setText("s-kills", S.kills);
  setText("s-dust", S.dust);
  const waiting = S.wave < totalWaves() && !S.spawnQueue.length;
  if (waiting && !S.autoWave) { setText("s-next-label", "下一波"); setText("s-next", "手动"); }
  else if (waiting) { setText("s-next-label", "下一波"); setText("s-next", Math.ceil(Math.max(0, S.nextWaveIn)) + "s"); }
  else if (S.spawnQueue.length) { setText("s-next-label", "待出场"); setText("s-next", S.spawnQueue.length); }
  else { setText("s-next-label", "剩余敌人"); setText("s-next", S.enemies.length); }
  $("btn-call").disabled = !canCallWave() || menuOpen;
  setText("btn-call", S.spawnQueue.length || S.enemies.length ? "叠加下一波" : "立即出击");
  setText("btn-auto", S.autoWave ? "自动开波：开" : "自动开波：关");
  $("xp-fill").style.width = Math.min(100, S.xp / S.xpNeed * 100).toFixed(1) + "%";
  setText("xp-txt", `Lv ${S.level} · 经验 ${Math.floor(S.xp)}/${S.xpNeed}` + (S.pending > 0 ? "（可以翻牌！）" : ""));
  const wb = $("wavebar"), key = S.stage + ":" + S.wave + ":" + (waiting ? 1 : 0) + ":" + (S.daily ? 1 : 0);
  if (wb.dataset.k !== key) {
    wb.dataset.k = key;
    const mod = S.daily ? DAILY_MODS.find(m => m.id === S.mod) : null;
    const pre = mod ? `<span class="chip elite">今日规则：${mod.name} · ${mod.desc}</span>` : "";
    if (waiting) {
      const list = nextWaveSummary();
      wb.innerHTML = pre + `<span>第 ${S.wave + 1} 波预告：</span>` + list.map(x => `<span class="chip${x.elite ? " elite" : ""}">${x.elite ? "精英" : ""}${ENEMIES[x.type].name} ×${x.n}</span>`).join("");
    } else wb.innerHTML = pre + (S.wave >= totalWaves() ? "<span>最后一波了，守住！</span>" : `<span>第 ${S.wave} 波进行中（敌人强度 ×${(stageHp() * S.waveHp).toFixed(2)}）</span>`);
  }
}
// ---------- 队伍 ----------
let teamKey = "";
function updateTeam() {
  const key = S.units.map(u => u.def.id + u.lv + (u.branch || "")).join(",");
  if (key !== teamKey) {
    teamKey = key;
    teamEl.innerHTML = S.units.map(u => `<button class="tm${u.hero ? " hero" : ""}" data-unit="${u.id}" style="--c:${u.def.color}">
      <canvas class="pt" id="tm-${u.id}" aria-hidden="true"></canvas><b>${u.def.name}</b><span>${u.summon ? "召唤物" : u.lv >= 4 ? u.def.branches[u.branch === "A" ? 0 : 1].name : u.lv + " 阶"}</span><i class="hpb" style="width:100%"></i></button>`).join("");
    for (const u of S.units) drawPortrait(u.def, $("tm-" + u.id), u.lv, u.branch);
  }
  for (const u of S.units) {
    const el = teamEl.querySelector(`[data-unit="${u.id}"]`); if (!el) continue;
    el.classList.toggle("down", u.down > 0);
    el.querySelector(".hpb").style.width = (u.down > 0 ? 100 : u.hp / u.maxHp * 100).toFixed(0) + "%";
  }
}
let cardKey = "";
function cardIconTo(cvs, id) {
  if (SIG_BY[id]) { drawPortrait(UNITS.find(u => u.id === SIG_BY[id].hero), cvs, 3); return; }
  if (CURSE_BY[id]) { drawCurseIcon(cvs, id, 30); return; }
  drawCardIcon(cvs, id, 30);
}
function updateCardbar() {
  const key = Object.entries(S.cards).map(([k, v]) => k + v).join(",") + "|" + Object.entries(S.curses || {}).map(([k, v]) => k + v).join(",") + "|" + (S.relics || []).join(",");
  if (key === cardKey) return;
  cardKey = key;
  const ids = Object.keys(S.cards);
  const all = ids.concat(Object.keys(S.curses || {}));
  const rels = (S.relics || []).map(id => `<span class="cb rl" title="${RELIC_BY[id].name}：${RELIC_BY[id].desc}"><canvas id="rl-${id}"></canvas></span>`).join("");
  cardbarEl.innerHTML = rels + (all.length ? all.map(id => { const n = (S.cards[id] || S.curses[id]); const c = ANY_CARD(id); return `<span class="cb${CURSE_BY[id] ? " cu" : ""}" title="${c ? c.name : id}"><canvas id="cb-${id}"></canvas>${n > 1 ? `<i>${n}</i>` : ""}</span>`; }).join("")
    : '<span class="none">升级翻到的卡牌会显示在这里</span>');
  for (const id of all) cardIconTo($("cb-" + id), id);
  for (const id of S.relics || []) drawRelicIcon($("rl-" + id), id, 30);
}
// ---------- 晨星爆发 ----------
function updateUlt() {
  const b = $("ult"), pct = Math.floor(S.star / ULT.max * 100), ready = ultReady(), key = pct + ":" + ready + ":" + S.over;
  if (b.dataset.k === key) return;
  b.dataset.k = key;
  b.classList.toggle("ready", ready); b.disabled = !ready;
  $("ult-fill").style.width = pct + "%";
  setText("ult-txt", ready ? "晨星爆发！点这里或按 E" : `晨星之力 ${pct}%（击杀敌人充能）`);
}
$("ult").addEventListener("click", () => { if (!menuOpen && !dlg && !S.offer) castUlt(); });

// ---------- 法术 ----------
function spellIcon(cvs, id) {
  const g = cvs.getContext("2d"); cvs.width = 14; cvs.height = 14; g.imageSmoothingEnabled = false;
  g.fillStyle = "#1a1f2e"; g.fillRect(0, 0, 14, 14);
  if (id === "meteor") {
    for (let i = 0; i < 4; i++) { g.fillStyle = i < 2 ? "#ffb040" : "#ff6a2a"; g.fillRect(8 + i, 2 + i, 2, 2); }
    g.fillStyle = "#ff6a2a"; g.fillRect(3, 6, 6, 6); g.fillStyle = "#ffd060"; g.fillRect(4, 7, 4, 4); g.fillStyle = "#ffffff"; g.fillRect(5, 8, 2, 2);
  } else { g.fillStyle = "#ffe080"; g.fillRect(6, 2, 2, 10); g.fillRect(2, 6, 10, 2); g.fillStyle = "#ffffff"; g.fillRect(6, 6, 2, 2); }
}
function buildSpells() {
  spellsEl.innerHTML = "";
  SPELLS.forEach((sp, i) => {
    const b = document.createElement("button");
    b.className = "spell"; b.id = "spell-" + sp.id;
    b.innerHTML = `<canvas class="ico" aria-hidden="true"></canvas><span><b>${sp.name}</b><small>冷却 ${sp.cd} 秒</small></span><span class="key">${i ? "W" : "Q"}</span><span class="cd" hidden></span>`;
    spellIcon(b.querySelector("canvas"), sp.id);
    b.addEventListener("click", () => pressSpell(sp.id));
    spellsEl.appendChild(b);
  });
}
function pressSpell(id) {
  if (S.over || menuOpen || dlg || S.offer) return;
  S.selUnit = null; S.selSpell = id; S.spellMode = null;
  if (S.spells[id] > 0 || S.mod === "noSpell") return;
  if (id === "meteor") S.spellMode = "meteor";
  else castSpell(id);
}
function updateSpells() {
  for (const sp of SPELLS) {
    const b = $("spell-" + sp.id), cd = b.querySelector(".cd"), left = Math.ceil(S.spells[sp.id]);
    const key = left + (S.spellMode === sp.id ? "*" : "") + S.mod;
    if (b.dataset.k === key) continue;
    b.dataset.k = key;
    b.classList.toggle("sel", S.spellMode === sp.id);
    cd.hidden = left <= 0 && S.mod !== "noSpell"; cd.textContent = S.mod === "noSpell" ? "禁魔" : left + "s";
  }
}
