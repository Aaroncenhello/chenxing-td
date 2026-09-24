
// ================= 信息栏、翻牌、操作 =================
let infoKey = "";
function currentKey() {
  if (S.selUnit && !S.selUnit.dead) return "u" + S.selUnit.id + ":" + S.selUnit.lv + ":" + (S.selUnit.branch || "");
  if (S.selSpell) return "s" + S.selSpell;
  return "none:" + S.stage + ":" + S.endless + ":" + !!S.daily;
}
function statLine(key) { const s = S.stats[key]; return s ? `本局：伤害 ${R0(s.dmg)} · 治疗 ${R0(s.heal)} · 击杀 ${s.kills}` : "本局还没有出手"; }
function renderInfo() {
  infoKey = currentKey();
  const u = S.selUnit && !S.selUnit.dead ? S.selUnit : null;
  if (!u && S.selSpell) {
    const sp = SPELLS.find(s => s.id === S.selSpell);
    infoEl.innerHTML = `<h3>${sp.name} <small>主动法术 · 冷却 ${R0(sp.cd * (1 - 0.05 * dk("arcane")) * (ab(17) ? 1.3 : 1))} 秒</small></h3><p class="skill">${sp.desc}</p><p class="skill" id="i-status" style="color:var(--gold)"></p>`;
    return;
  }
  if (!u) {
    const mod = S.daily ? DAILY_MODS.find(m => m.id === S.mod) : null;
    infoEl.innerHTML = `<h3>${ST.name} <small>${S.daily ? "每日挑战" : S.endless ? "无尽模式" : `第 ${S.stage + 1} 关`} · ${S.endless ? "∞" : ST.waves + " 波"} · ${DIFFS[S.diff].name}</small></h3>
      <p class="skill">${mod ? `今日规则：<b>${mod.name}</b>，${mod.desc}。` : ST.brief}</p>
      <p class="skill">敌人从四周的传送门冲向中间的晨星碑。打死敌人攒经验，升级时从 3 张卡里翻 1 张，一直叠加到通关。</p>
      ${S.abyss ? `<p class="skill">深渊 ${S.abyss} 层：${ABYSS.slice(0, S.abyss).map(x => x.name).join("、")}</p>` : ""}${S.week ? `<p class="skill">每周规则：${S.week.rules.map(r => WEEK_BY[r].name + "（" + WEEK_BY[r].desc + "）").join("；")}</p>` : ""}${S.relics.length ? `<p class="skill">遗物：${S.relics.map(id => RELIC_BY[id].name + "（" + RELIC_BY[id].desc + "）").join("；")}</p>` : ""}
      <div class="row"><span>晨星碑</span><span id="i-chp"></span></div><div class="meter"><i id="i-cbar" style="background:#62b4ff"></i></div>
      <div class="row"><span>已击败</span><span id="i-kills">0</span></div><div class="row"><span>最高连杀</span><span id="i-combo">0</span></div>`;
    return;
  }
  const D = u.def, bIdx = u.branch ? (u.branch === "A" ? 0 : 1) : -1;
  const head = `<h3><canvas class="ipt" id="i-pt" aria-hidden="true"></canvas><span>${D.name} <small>${D.cls}${u.hero ? " · 本局英雄" : u.summon ? " · 召唤物" : ""}</small></span>${u.summon ? "" : `<span class="lvtag">${u.lv >= 4 ? D.branches[bIdx].name : u.lv + " 阶"}</span>`}</h3>`;
  const stats = `<div class="row"><span>${D.dmg === "heal" ? "治疗" : "攻击"} ${R0(uAtk(u))}</span><span>防御 ${R0(uDef(u))}</span><span>范围 ${uRange(u).toFixed(1)}</span>${D.place === "ground" ? `<span>拦截 ${uBlock(u)}</span>` : ""}</div>`;
  if (u.summon) {
    infoEl.innerHTML = head + `<div class="row"><span>生命</span><span id="i-hp"></span></div><div class="meter"><i id="i-hpbar" style="background:var(--ok)"></i></div>
      <div class="row"><span>剩余时间</span><span id="i-life"></span></div><div class="meter"><i id="i-lifebar" style="background:#b8845a"></i></div>` + stats +
      `<p class="skill">米拉召唤出来的守卫，时间到了会自己碎掉。</p>`;
    drawPortrait(D, $("i-pt"));
    return;
  }
  const tal = TALENTS[D.id], talOn = clv(D.id) >= PROG.talentLv;
  const skill = (D.note ? `<p class="skill"><b>特点</b>：${D.note}</p>` : "") +
    `<p class="skill"><b>技能 · ${D.skill.name}</b>（技力 ${D.sp}）<br>${D.skill.desc}</p>` +
    `<p class="skill${u.lv >= 3 ? "" : " lock"}"><b>3 阶特性</b>${u.lv >= 3 ? "（已解锁）" : ""}：${D.trait}</p>` +
    (u.lv >= 4 ? `<p class="skill"><b>转职 · ${D.branches[bIdx].name}</b>：${D.branches[bIdx].desc}</p>` : `<p class="skill lock"><b>4 阶转职</b>：翻到这个角色的卡就能升阶</p>`) +
    `<p class="skill${talOn ? "" : " lock"}"><b>天赋 · ${tal.name}</b>${talOn ? "" : `（角色 ${PROG.talentLv} 级解锁）`}：${tal.desc}</p>` +
    (() => {
      const on = TREE_TIERS.map((T, i) => { const n = talPick(D.id, i); return n && clv(D.id) >= T.lv ? TREE_NODE[n] : null; }).filter(Boolean);
      return on.length ? `<p class="skill"><b>天赋树</b>：${on.map(n => `${n.name}（${n.desc}）`).join("、")}</p>` : "";
    })();
  infoEl.innerHTML = head +
    `<div class="row"><span>生命</span><span id="i-hp"></span></div><div class="meter"><i id="i-hpbar" style="background:var(--ok)"></i></div>
     <div class="row"><span>技力</span><span id="i-sp"></span></div><div class="meter"><i id="i-spbar"></i></div>` + stats + skill +
    `<p class="skill" id="i-stat"></p>
     <div class="acts"><button id="btn-skill" class="primary">释放技能</button><button id="btn-autou"></button><button id="btn-pos"></button></div>`;
  drawPortrait(D, $("i-pt"), u.lv, u.branch);
}
function updateInfo() {
  if (currentKey() !== infoKey) renderInfo();
  const u = S.selUnit && !S.selUnit.dead ? S.selUnit : null;
  if (!u && S.selSpell) { const left = Math.ceil(S.spells[S.selSpell]); setText("i-status", S.mod === "noSpell" ? "今日规则禁止使用法术" : left > 0 ? `冷却中，还要 ${left} 秒` : S.spellMode ? "点场地选择落点（Esc 取消）" : "已就绪"); return; }
  if (!u) {
    setText("i-kills", S.kills); setText("i-combo", S.comboBest);
    setText("i-chp", `${Math.ceil(S.crystal.hp)} / ${S.crystal.maxHp}`);
    const b = $("i-cbar"); if (b) b.style.width = (S.crystal.hp / S.crystal.maxHp * 100).toFixed(1) + "%";
    return;
  }
  setText("i-hp", u.down > 0 ? `倒下 · ${Math.ceil(u.down)} 秒后归队` : `${Math.ceil(u.hp)} / ${u.maxHp}`);
  $("i-hpbar").style.width = (u.hp / u.maxHp * 100).toFixed(1) + "%";
  if (u.summon) { setText("i-life", Math.ceil(u.life) + " 秒"); $("i-lifebar").style.width = (u.life / u.maxLife * 100).toFixed(1) + "%"; return; }
  const D = u.def, active = u.skillT > 0, ready = !active && u.sp >= D.sp;
  setText("i-sp", active ? `技能中 ${Math.ceil(u.skillT)} 秒` : `${Math.floor(u.sp)} / ${D.sp}`);
  const spb = $("i-spbar");
  spb.style.width = (active ? u.skillT / (D.skill.dur || 1) * 100 : u.sp / D.sp * 100).toFixed(1) + "%";
  spb.style.background = active ? D.color : ready ? "var(--gold)" : "var(--sp)";
  const castable = ready && canCast(u) && u.down <= 0;
  $("btn-skill").disabled = !castable || !!S.over;
  setText("btn-skill", active ? "技能生效中" : ready ? (castable ? "释放技能" : "没有目标") : "技力积攒中");
  setText("btn-autou", "自动：" + (u.auto ? "开" : "关"));
  const pb = $("btn-pos");
  if (pb) { setText("btn-pos", u.slot ? "站位：已固定" : "站位：跟阵型"); pb.disabled = !u.slot; pb.title = u.slot ? "点一下让他回到阵型里的位置" : "在场上拖动他就能固定站位"; }
  setText("i-stat", statLine(D.id));
}
infoEl.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  const u = S.selUnit; if (!u) return;
  if (b.id === "btn-skill") useSkill(u);
  if (b.id === "btn-autou") u.auto = !u.auto;
  if (b.id === "btn-pos" && u.slot) { clearSlot(u); toast("<b>站位已还原</b>" + u.def.name + "回到「" + formOf().name + "」阵型里的位置。"); }
});
teamEl.addEventListener("click", ev => {
  const b = ev.target.closest("[data-unit]"); if (!b) return;
  S.selUnit = S.units.find(u => u.id === +b.dataset.unit) || null; S.selSpell = null; S.spellMode = null;
});

// ---------- 升级翻牌 ----------
function updateOffer() {
  const box = $("levelup");
  if (!S.offer) { if (!box.hidden) { box.hidden = true; box.dataset.k = ""; } return; }
  const key = S.offer.map(p => p.id).join("|") + "#" + S.rerolls;
  if (box.dataset.k === key) return;
  box.dataset.k = key; box.hidden = false;
  const title = S.offerRare ? "稀有货架！选一张" : S.level <= 1 && !S.kills ? "开局翻牌！选一张" : `升到 Lv ${S.level}！选一张卡`;
  setText("lu-title", title + (S.pending > 1 ? `（还有 ${S.pending - 1} 次）` : ""));
  $("cards3").innerHTML = S.offer.map((p, i) => {
    const c = cardInfo(p), r = p.rare || 0, R = RARITY[r] || { name: "诅咒", color: CURSE_COLOR };
    const tag = r ? `<span class="rt" style="background:${R.color}">${R.name}</span>` : "";
    const body = c.curse ? `<span>${p.curse.good}<em class="bad">代价：${p.curse.bad}</em></span>` : `<span>${c.desc}</span>`;
    return `<button class="pcard r${r}${c.sig ? " sig" : ""}" data-pick="${p.id}" style="--c:${c.color}"><span class="key">${i + 1}</span>${tag}<canvas id="lu-${i}" aria-hidden="true"></canvas>
      <div><small>${KIND_NAME[c.kind] || "诅咒"}</small><b>${c.name}</b>${body}</div></button>`;
  }).join("");
  const rb = $("btn-reroll");
  rb.textContent = S.rerolls > 0 ? `重抽（剩 ${S.rerolls} 次）` : "没有重抽次数了";
  rb.disabled = S.rerolls <= 0;
  S.offer.forEach((p, i) => {
    const cvs = $("lu-" + i), c = cardInfo(p);
    if (c.unit) drawPortrait(c.unit, cvs, p.branch ? 4 : (p.unit ? p.unit.lv + 1 : 1), p.branch);
    else if (c.curse) drawCurseIcon(cvs, c.icon, 48);
    else if (p.sig) drawPortrait(UNITS.find(u => u.id === p.card.hero), cvs, 3);
    else drawCardIcon(cvs, c.icon, 48);
  });
}
$("cards3").addEventListener("click", ev => {
  const b = ev.target.closest("[data-pick]"); if (!b) return;
  takeCard(b.dataset.pick);
});
$("btn-reroll").addEventListener("click", () => { if (rerollOffer()) $("levelup").dataset.k = ""; });

// ---------- 波间商店 ----------
function updateShop() {
  const box = $("shopbox");
  if (!S.shop) { if (!box.hidden) { box.hidden = true; box.dataset.k = ""; } return; }
  const key = S.shop.items.map(i => i.id + (i.sold ? "!" : "")).join("|") + "#" + S.dust;
  if (box.dataset.k === key) return;
  box.dataset.k = key; box.hidden = false;
  setText("shop-title", `第 ${S.wave} 波结束 · 波间商店`);
  setText("shop-dust", `星尘 ${S.dust}`);
  $("shop3").innerHTML = S.shop.items.map(it =>
    `<button class="sitem${it.sold ? " sold" : S.dust < it.price ? " poor" : ""}" data-buy="${it.id}" ${it.sold ? "disabled" : ""}>
      <span class="price">${it.sold ? "已购" : it.price}</span><b>${it.name}</b><span>${it.desc}</span></button>`).join("");
}
// ---------- 局内事件 ----------
function updateEvent() {
  const box = $("eventbox");
  if (!S.event) { if (!box.hidden) { box.hidden = true; box.dataset.k = ""; } return; }
  const key = S.event.def.id + "#" + S.dust;
  if (box.dataset.k === key) return;
  box.dataset.k = key; box.hidden = false;
  setText("ev-title", "事件 · " + S.event.def.name);
  setText("ev-text", S.event.def.text);
  $("ev3").innerHTML = S.event.opts.map((o, i) =>
    `<button class="sitem${o.cost && S.dust < o.cost ? " poor" : ""}" data-ev="${i}" ${o.cost && S.dust < o.cost ? "disabled" : ""}>
      ${o.cost ? `<span class="price">${o.cost} 星尘</span>` : ""}<span class="key">${i + 1}</span><b>${o.name}</b><span>${o.desc}</span></button>`).join("");
}
$("ev3").addEventListener("click", ev => {
  const b = ev.target.closest("[data-ev]"); if (!b) return;
  if (takeEvent(+b.dataset.ev)) { $("eventbox").dataset.k = ""; $("levelup").dataset.k = ""; }
});
$("shop3").addEventListener("click", ev => {
  const b = ev.target.closest("[data-buy]"); if (!b) return;
  if (buyShop(b.dataset.buy)) { $("shopbox").dataset.k = ""; $("levelup").dataset.k = ""; }
});
$("btn-shopgo").addEventListener("click", () => { closeShop(); $("shopbox").dataset.k = ""; });

// ---------- 羁绊 ----------
let synKey = "";
function updateSynBar() {
  const box = $("syns"), on = SYNERGY.filter(g => S.syn && S.syn[g.id]);
  const key = on.map(g => g.id).join("|");
  if (synKey === key) return;
  synKey = key;
  box.innerHTML = on.length
    ? on.map(g => `<span class="syn" style="--c:${g.color}" title="${g.desc}">${g.name}</span>`).join("")
    : `<span class="syn off">羁绊：还没凑齐（凑齐会自动生效）</span>`;
}
function takeCard(id) {
  if (!S.offer) return;
  const p = S.offer.find(x => x.id === id); if (!p) return;
  pickCard(id);
  $("levelup").hidden = true; $("levelup").dataset.k = "";
  openOffer();
}

// ---------- 场地操作 ----------
function posFromEvent(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * COLS - 0.5, y: (ev.clientY - r.top) / r.height * ROWS - 0.5 };
}
const fieldFree = () => S && !S.over && !menuOpen && !dlg && !S.offer && !S.event && !S.shop && !S.cine;
function unitAt(p, rad) {
  let best = null, bd = rad;
  for (const u of S.units) { if (u.dead || u.summon) continue; const d = Math.hypot(u.x - p.x, u.y - p.y); if (d < bd) { bd = d; best = u; } }
  return best;
}
// 拖动角色 = 固定站位（自动战斗里唯一需要手操的地方）
let dragEnd = 0;
cv.addEventListener("pointerdown", ev => {
  if (!fieldFree() || S.spellMode || ev.button === 2) return;
  const p = posFromEvent(ev), u = unitAt(p, 1.0);
  if (!u) return;
  S.drag = { u, x: p.x, y: p.y, moved: false };
  try { cv.setPointerCapture(ev.pointerId); } catch (e) { }
});
cv.addEventListener("pointermove", ev => {
  S.hover = posFromEvent(ev);
  if (!S.drag) return;
  const p = S.hover;
  if (!S.drag.moved && Math.hypot(p.x - S.drag.x, p.y - S.drag.y) > 0.3) S.drag.moved = true;
  S.drag.x = p.x; S.drag.y = p.y;
  if (S.drag.moved) ev.preventDefault();
});
function endDrag(ev, ok) {
  if (!S || !S.drag) return;
  const d = S.drag; S.drag = null;
  try { if (ev) cv.releasePointerCapture(ev.pointerId); } catch (e) { }
  if (!ok || !d.moved) return;
  dragEnd = performance.now();
  setSlot(d.u, d.x, d.y);
  S.selUnit = d.u; S.selSpell = null; infoKey = "";
}
cv.addEventListener("pointerup", ev => endDrag(ev, true));
cv.addEventListener("pointercancel", ev => endDrag(ev, false));
cv.addEventListener("pointerleave", () => { S.hover = null; });
cv.addEventListener("click", ev => {
  if (S.cine) { skipCine(); return; }
  if (S.over || menuOpen || dlg || S.offer || S.event) return;
  if (performance.now() - dragEnd < 250) return;   // 刚拖完，别当成点选
  const p = posFromEvent(ev);
  if (S.spellMode === "meteor") { castSpell("meteor", p.x, p.y); S.spellMode = null; S.selSpell = null; return; }
  S.selUnit = unitAt(p, 1.1) || null; S.selSpell = null;
});
cv.addEventListener("contextmenu", ev => {
  if (S.spellMode || S.selSpell) { ev.preventDefault(); S.spellMode = null; S.selSpell = null; return; }
  if (!fieldFree()) return;
  const u = unitAt(posFromEvent(ev), 1.0);
  if (u && u.slot) { ev.preventDefault(); clearSlot(u); infoKey = ""; toast("<b>站位已还原</b>" + u.def.name + "回到「" + formOf().name + "」阵型里的位置。"); }
});
// 阵型预设：紧凑 / 标准 / 散开
function cycleForm(quiet) {
  if (!S) return;
  if (!quiet) {
    S.formIdx = ((S.formIdx || 0) + 1) % FORMS.length;
    arrange();
    editSave(d => { d.form = S.formIdx; });
  }
  const F = formOf();
  setText("btn-form", "阵型 · " + F.name);
  if (!quiet) toast("<b>阵型 · " + F.name + "</b>" + F.desc);
}
$("btn-call").addEventListener("click", () => callWaveEarly());
$("btn-auto").addEventListener("click", () => {
  const on = toggleAutoWave(); editSave(d => { d.autoWave = on; });
  toast(on ? "<b>自动开波 · 开</b>每波打完隔几秒自动来下一波。" : "<b>自动开波 · 关</b>下一波要你按「立即出击」才会来。场上还有怪时也可以按，叠波越狠星尘奖励越多。");
});
function toggleSpeed() { S.speed = S.speed >= 3 ? 1 : S.speed + 1; setText("btn-speed", S.speed + "×"); }
function togglePause() { if (S.over || menuOpen || dlg || S.offer) return; S.paused = !S.paused; setText("btn-pause", S.paused ? "继续" : "暂停"); }
$("btn-speed").addEventListener("click", toggleSpeed);
$("btn-form").addEventListener("click", () => cycleForm());
$("btn-pause").addEventListener("click", togglePause);
$("btn-levels").addEventListener("click", () => showLevels());
// 沉浸全屏：不依赖浏览器的全屏权限（嵌在页面里时浏览器往往不给），直接把战场铺满窗口
let immOff = false;
function setImm(on) {
  document.body.classList.toggle("imm", on);
  $("hud").hidden = !on;
  if (on) { try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch (e) { } }
  else { immOff = true; try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { } }
  hudKey = ""; resize();
}
const isImm = () => document.body.classList.contains("imm");
// 手机：横屏看高度、竖屏看宽度；开局自动进沉浸全屏（竖屏是战场在上、按钮在下的专用布局）
const isPhone = () => window.matchMedia("(max-height: 520px) and (orientation: landscape), (max-width: 520px) and (orientation: portrait)").matches;
function maybeImm() { if (!immOff && isPhone() && !isImm()) setImm(true); }
$("btn-full").addEventListener("click", () => setImm(!isImm()));
$("hud").addEventListener("click", ev => {
  const b = ev.target.closest("[data-h]"); if (!b || !S) return;
  const h = b.dataset.h;
  if (h === "meteor" || h === "heal") pressSpell(h);
  else if (h === "ult") castUlt();
  else if (h === "call") callWaveEarly();
  else if (h === "auto") $("btn-auto").click();
  else if (h === "speed") toggleSpeed();
  else if (h === "pause") togglePause();
  else if (h === "form") cycleForm();
  else if (h === "menu") showLevels();
  else if (h === "exit") setImm(false);
  hudKey = "";
});
let hudKey = "";
function updateHud() {
  if (!isImm() || !S) return;
  // 全屏时翻牌、商店、菜单、剧情都铺满整屏，提示（新敌人、遗物……）先藏起来，免得压在上面
  document.body.classList.toggle("panel", !!(menuOpen || dlg || S.offer || S.shop || S.event));
  const m = Math.ceil(S.spells.meteor || 0), hl = Math.ceil(S.spells.heal || 0), st = Math.floor(S.star / ULT.max * 100);
  const waiting = S.wave < totalWaves() && !S.spawnQueue.length;
  const nx = waiting ? (S.autoWave ? Math.ceil(Math.max(0, S.nextWaveIn)) + "s" : "手动") : S.spawnQueue.length ? "出怪 " + S.spawnQueue.length : "剩 " + S.enemies.length;
  const key = [Math.ceil(S.crystal.hp), S.wave, S.level, S.dust, nx, m, hl, st, S.speed, S.paused, S.autoWave, canCallWave(), S.spellMode, Math.floor(S.xp / S.xpNeed * 50), S.formIdx].join("|");
  if (key === hudKey) return; hudKey = key;
  setText("h-hp", Math.ceil(S.crystal.hp)); setText("h-wave", S.endless ? S.wave : S.wave + "/" + ST.waves); setText("h-lv", S.level); setText("h-dust", S.dust);
  setText("h-next", "下一波 " + nx); $("h-xpf").style.width = Math.min(100, S.xp / S.xpNeed * 100).toFixed(1) + "%";
  const noSp = S.mod === "noSpell";
  setText("h-cd-meteor", noSp ? "禁用" : S.spellMode === "meteor" ? "点落点" : m > 0 ? m + "s" : "就绪"); $("h-meteor").classList.toggle("rdy", !noSp && m <= 0);
  setText("h-cd-heal", noSp ? "禁用" : hl > 0 ? hl + "s" : "就绪"); $("h-heal").classList.toggle("rdy", !noSp && hl <= 0);
  setText("h-ultp", st + "%"); $("h-ult").classList.toggle("rdy", ultReady());
  setText("h-call", S.spawnQueue.length || S.enemies.length ? "叠波" : "出击"); $("h-call").disabled = !canCallWave();
  setText("h-auto", S.autoWave ? "自动·开" : "自动·关"); setText("h-speed", S.speed + "×"); setText("h-pause", S.paused ? "继续" : "暂停");
  setText("h-form", formOf().name);
}
window.addEventListener("orientationchange", () => setTimeout(() => { maybeImm(); resize(); }, 250));
document.addEventListener("keydown", ev => {
  const k = ev.key.toLowerCase();
  if (dlg) { if (k === " " || k === "enter") { ev.preventDefault(); dlgNext(); } else if (k === "escape") dlgSkip(); return; }
  if (S && S.event) { if (/^[1-3]$/.test(k) && S.event.opts[+k - 1]) { ev.preventDefault(); if (takeEvent(+k - 1)) $("eventbox").dataset.k = ""; } return; }
  if (S && S.shop) { if (k === "enter" || k === " ") { ev.preventDefault(); closeShop(); $("shopbox").dataset.k = ""; } return; }
  if (S && S.offer) {
    if (/^[1-3]$/.test(k) && S.offer[+k - 1]) { ev.preventDefault(); takeCard(S.offer[+k - 1].id); }
    else if (k === "r" && rerollOffer()) $("levelup").dataset.k = "";
    return;
  }
  if (menuOpen) return;
  if (S && S.cine) { if (k === " " || k === "enter" || k === "escape") { ev.preventDefault(); skipCine(); } return; }
  if (k === " ") { ev.preventDefault(); togglePause(); }
  else if (k === "f") toggleSpeed();
  else if (k === "t") cycleForm();
  else if (k === "n") callWaveEarly();
  else if (k === "escape") { S.spellMode = null; S.selSpell = null; S.selUnit = null; }
  else if (k === "q") pressSpell("meteor");
  else if (k === "w") pressSpell("heal");
  else if (k === "e") castUlt();
});
