
// ================= 界面：顶栏、队伍、卡牌栏、提示、法术按钮 =================
const $ = id => document.getElementById(id);
const teamEl = $("team"), cardbarEl = $("cardbar"), infoEl = $("info"), spellsEl = $("spells");
function setText(id, v) { const el = $(id); if (!el) return; const s = String(v); if (el.textContent !== s) el.textContent = s; }
let menuOpen = false;

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
      <canvas class="pt" id="tm-${u.id}" aria-hidden="true"></canvas><b>${u.def.name}</b><span>${u.summon ? "召唤物" : "Lv" + clv(u.def.id) + " · " + (u.lv >= 4 ? u.def.branches[u.branch === "A" ? 0 : 1].name : u.lv + " 阶")}</span><i class="hpb" style="width:100%"></i></button>`).join("");
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
