
// ================= 选关、星盘、图鉴、成就、存档页、进关流程、结算页 =================
const THUMB = {
  forest: { g: "#3f7f45", p: "#b38a5a", b: "#245a30", w: "#2f6ea8" },
  snow: { g: "#e4ecf4", p: "#a89a88", b: "#6a9488", w: "#2f6ea8" },
  lava: { g: "#3a2a2a", p: "#6a5a50", b: "#c8461a", w: "#2f6ea8" },
  grave: { g: "#2c3430", p: "#6c6860", b: "#1a201c", w: "#2f6ea8" },
  desert: { g: "#e0c080", p: "#b09a78", b: "#9a7a48", w: "#2a8ab8" },
  sky: { g: "#6aa05a", p: "#cfc4ae", b: "#4e8446", w: "#8ccaf0" },
  cave: { g: "#3a3848", p: "#5e5a6c", b: "#1e1c26", w: "#163656" },
  abyss: { g: "#2a1a30", p: "#4c3c50", b: "#140a18", w: "#5a2a7a" },
  ice: { g: "#c8dcec", p: "#9fb4c8", b: "#8fa8c4", w: "#5aa8c8" },
  mech: { g: "#3e4048", p: "#5c5e68", b: "#282a32", w: "#ffb040" },
  blood: { g: "#3a2028", p: "#5e3a40", b: "#241016", w: "#8a2028" },
  star: { g: "#1c2040", p: "#3a4068", b: "#101430", w: "#a0b8ff" },
  ash: { g: "#4a4844", p: "#7a746c", b: "#2e2c2a", w: "#2f6ea8" },
  ruin: { g: "#5a5a52", p: "#8a8a7e", b: "#3a3a34", w: "#2f6ea8" },
  storm: { g: "#2e3446", p: "#48506a", b: "#181d28", w: "#2a4a8a" },
  dawn: { g: "#c8b488", p: "#e8dcb8", b: "#9a8660", w: "#5ab0d8" },
};
function drawThumb(cvs, st) {
  const k = 4, g = cvs.getContext("2d"), th = THUMB[st.theme];
  cvs.width = COLS * k; cvs.height = ROWS * k;
  st.map.forEach((row, r) => [...row].forEach((ch, c) => {
    g.fillStyle = ch === "#" ? th.b : ch === "~" ? th.w : ch === "." ? th.p : ch === "B" ? "#62b4ff" : ch === "S" ? "#e0407a" : th.g;
    g.fillRect(c * k, r * k, k, k);
  }));
}
function todayInfo() {
  const d = new Date(), ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let h = 2166136261; for (const ch of ds) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const n = Math.max(1, STAGES.filter((_, i) => unlocked(i)).length);
  return { date: ds, seed: h, stage: h % n, mod: DAILY_MODS[(h >>> 5) % DAILY_MODS.length].id };
}

// 存档文件：在 claude.ai 上要走 downloads 能力，直接打开 html 时退回普通下载
let dlCap = null, dlTried = false;
async function saveFile() {
  const name = "chenxing-save-" + new Date().toISOString().slice(0, 10) + ".txt", code = exportSave();
  if (!dlTried && window.claude && typeof window.claude.use === "function") {
    dlTried = true;
    try { dlCap = await window.claude.use("downloads"); } catch (e) { dlCap = null; }
  }
  if (dlCap && dlCap.save) {
    try { await dlCap.save({ filename: name, data: code }); toast("<b>已保存</b>存档文件下载好了。"); }
    catch (e) { toast("<b>没有保存</b>可以改用「复制代码」。"); }
    return;
  }
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } catch (e) { toast("<b>下载失败</b>可以改用「复制代码」。"); }
}
function showSaveBox(msg) {
  const d = loadSave(), code = exportSave(), bk = readBackup();
  const cleared = d.stars.filter(x => x > 0).length, lvs = charLevels(d);
  const top = UNITS.map(u => `${u.name} ${lvs[u.id]}`).slice(0, 4).join(" · ");
  openOverlay(`<h2>存档</h2>
    <p>当前进度：通关 ${cleared}/${STAGES.length} 关 · 成就 ${d.achv.length}/${ACHV.length} · 图鉴 ${d.seen.length}/${Object.keys(ENEMIES).length}（${top}…）</p>
    <p>存档只存在这台设备的浏览器里。把下面这串代码复制走，就能带到别的设备或者浏览器。</p>
    ${msg ? `<p class="savemsg">${msg}</p>` : ""}
    <div class="savebox"><label>导出代码</label><textarea id="sv-out" readonly rows="4">${code}</textarea>
      <div class="btns"><button class="primary" id="btn-svcopy">复制代码</button><button id="btn-svdl">下载存档文件</button></div></div>
    <div class="savebox"><label>导入代码（会覆盖当前进度；导入前会自动备份一份，导错了可以在下面恢复）</label><textarea id="sv-in" rows="4" placeholder="把代码粘到这里"></textarea>
      <div class="btns"><button class="primary" id="btn-svin">导入并重载</button></div></div>
    ${bk ? `<div class="savebox"><label>自动备份 · ${new Date(bk.at).toLocaleString("zh-CN")} · ${bk.why}（恢复后当前进度会换进备份，还能再换回来）</label>
      <div class="btns"><button id="btn-svbak">恢复这份备份并重载</button></div></div>` : ""}
    <div class="btns"><button id="btn-menu">返回选关</button></div>`);
}
let diffSel = 0, chapSel = null, abyssSel = 0;
const abyssTop = d => Math.max(0, ...Object.values((d || loadSave()).abyss));
const abyssOpen = d => Math.min(ABYSS_MAX, abyssTop(d) + 1);
function openOverlay(html) { rosterAnim = null; $("ovbox").classList.remove("res"); $("ovbox").innerHTML = html; $("overlay").hidden = false; $("overlay").scrollTop = 0; menuOpen = true; if (S) { S.selUnit = null; S.spellMode = null; } }
function closeOverlay() { $("overlay").hidden = true; menuOpen = false; rosterAnim = null; }
const chapterOf = i => CHAPTERS.reduce((k, c, j) => (i >= c.from ? j : k), 0);
function showLevels() {
  const save = loadSave(), bank = starBank(), running = S && !S.over && (S.wave > 0 || S.kills > 0);
  const td = todayInfo(), mod = DAILY_MODS.find(m => m.id === td.mod), rec = save.daily[td.date];
  if (save.refunded) { editSave(d => { d.refunded = 0; }); toast("<b>星之祝福升级成了天赋星盘</b>以前花掉的星星已经全部退还，去「天赋星盘」重新分配吧。"); }
  if (openChars().length >= 14) unlockAchv("allchars");
  if (openChars().length >= UNITS.length) unlockAchv("allchars16");
  if (chapSel == null) { let last = 0; STAGES.forEach((_, i) => { if (unlocked(i)) last = i; }); chapSel = chapterOf(last); }
  const ch = CHAPTERS[chapSel], to = (CHAPTERS[chapSel + 1] || { from: STAGES.length }).from, ids = STAGES.map((_, i) => i).filter(i => i >= ch.from && i < to);
  openOverlay(`<h2>选择关卡</h2>
    <div class="diffs">${CHAPTERS.map((c, j) => `<button data-chap="${j}" class="${j === chapSel ? "on" : ""}" ${unlocked(c.from) ? "" : "disabled"}>${c.name}${unlocked(c.from) ? "" : "（未解锁）"}</button>`).join("")}</div>
    <div class="diffs">${DIFFS.map((d, i) => `<button data-diff="${i}" class="${i === diffSel ? "on" : ""}">${d.name}</button>`).join("")}</div>
    <p>${DIFFS[diffSel].desc}${diffSel ? "。要先在普通难度通关，通关后额外 +1★。" : "。"}</p>
    ${abyssOpen(save) > 0 && save.stars.some(x => x > 0) ? abyssHtml(save) : ""}
    <div class="btns"><button id="btn-roster">角色 · ${openChars().length}/${UNITS.length}</button><button id="btn-perks">天赋星盘 · 可用 <span class="starbank">${bank.left}★</span></button><button id="btn-codex">图鉴 ${save.seen.length}/${Object.keys(ENEMIES).length}</button><button id="btn-achv">成就 ${save.achv.length}/${ACHV.length}</button><button id="btn-save">存档</button><button id="btn-gfx" title="特效太多手机卡的话调低">画质 · ${gfxSel >= 0 ? GFX.name : "自动（" + GFX.name + "）"}</button>${running ? '<button id="btn-resume">继续当前关卡</button>' : ""}</div>
    <div class="daily"><div><b>每日挑战 · ${td.date}</b><p>场地：${STAGES[td.stage].name} · 规则：${mod.name}（${mod.desc}）</p>
      <p>${rec ? (rec.cleared ? "今天已经通关 ✓" : `今天最好成绩：第 ${rec.wave} 波`) : "今天还没挑战"}</p></div><button class="primary" id="btn-daily">开始挑战</button></div>
    ${weekHtml(save)}
    ${unlocked(VIGIL.unlockAt) ? `<div class="daily vigil"><div><b>守望之战 · 长夜</b><p>随机生成的地图 + ${VIGIL.waves} 波超长局：第 8、16、25 波是首领，中途有补给，能把等级和卡叠到很高。</p>
      <p>${save.vigil && save.vigil.best ? `最好成绩：撑到第 ${save.vigil.best} 波${save.vigil.clear ? " · 已通关 ✓" : ""}` : "还没挑战过"}</p></div><button class="primary" id="btn-vigil">开始守望</button></div>`
      : `<div class="daily vigil lockd"><div><b>守望之战 · 长夜</b><p>通关第 ${VIGIL.unlockAt + 1} 关后解锁</p></div></div>`}
    <div class="levels">` +
    ids.map(i => { const st = STAGES[i];
      const open = unlocked(i), cleared = (save.stars[i] || 0) > 0, dc = save.diffClear[i] || [];
      const can = open && (diffSel === 0 || cleared);
      return `<div class="lvcard${open ? "" : " locked"}"><canvas id="thumb-${i}" aria-hidden="true"></canvas>
      <h3>${i + 1}. ${st.name}<span>${"★".repeat(save.stars[i] || 0)}${"☆".repeat(3 - (save.stars[i] || 0))}</span></h3>
      <p>${st.brief}（${st.waves} 波${st.haz ? " · 有机关" : ""}）</p>
      <span class="rec">${save.abyss[i] ? `深渊 ${save.abyss[i]} 层 ✓ ` : ""}${dc.includes("hard") ? "困难 ✓ " : ""}${dc.includes("nightmare") ? "噩梦 ✓ " : ""}${save.best[i] ? `无尽最高 ${save.best[i]} 波` : ""}&nbsp;</span>
      <div class="btns"><button class="primary" data-lv="${i}" ${can ? "" : "disabled"}>${!open ? "通关上一关解锁" : can ? "开始 · " + DIFFS[diffSel].name + (abyssSel ? " · 深渊 " + abyssSel : "") : "先通关普通"}</button>
      ${cleared ? `<button data-endless="${i}">无尽</button>` : ""}${open && STORY[i] ? `<button data-story="${i}">剧情</button>` : ""}</div></div>`;
    }).join("") + `</div>`);
  for (const i of ids) drawThumb($("thumb-" + i), STAGES[i]);
}
function showPerks() {
  const bank = starBank(), disk = bank.disk;
  const node = n => {
    const lv = disk[n.id] || 0, inf = n.max > 999, full = !inf && lv >= n.max, cost = full ? 0 : diskCost(n.id, lv);
    return `<div class="dnode${lv ? " on" : ""}${full ? " full" : ""}"><div class="dh"><b>${n.name}</b><span>${inf ? "Lv " + lv : lv + "/" + n.max}</span></div>
      <p>${lv ? n.desc(lv) : n.per}</p>
      <button data-disk="${n.id}" ${full || bank.left < cost ? "disabled" : ""}>${full ? "已满级" : `升级 · ${cost}★`}</button></div>`;
  };
  openOverlay(`<h2>天赋星盘</h2><p>共获得 ${bank.earned}★，已投入 ${bank.spent}★，可用 <span class="starbank">${bank.left}★</span>。每个节点都能升好几级，最底下的「星辉」没有上限。</p>
    <p class="dsrc">星星来源：关卡星级、困难 / 噩梦首通、无尽每 10 波、成就、深渊每层首通、每周挑战首通；另外<b>每次通关 +1★</b>（困难再 +1，深渊每 5 层再 +1）。</p>
    <div class="disk">${DISK_LINES.map(L => `<div class="dline" style="--c:${L.color}"><h4>${L.name}</h4>${DISK.filter(n => n.line === L.id).map(node).join("")}</div>`).join("")}</div>
    <div class="dline dstar" style="--c:#ffe8a0">${node(DISK_BY.star)}</div>
    <div class="btns"><button id="btn-diskreset">重置星盘（全部退还）</button><button id="btn-menu">返回选关</button></div>`);
}
function buyDisk(id) {
  const n = DISK_BY[id], bank = starBank(), lv = bank.disk[id] || 0;
  if (!n || lv >= n.max || bank.left < diskCost(id, lv)) return;
  editSave(d => { d.disk[id] = lv + 1; });
  const sc = $("overlay").scrollTop; showPerks(); $("overlay").scrollTop = sc;
}
function abyssHtml(save) {
  const open = abyssOpen(save);
  abyssSel = Math.min(abyssSel, open);
  const a = abyssSel ? ABYSS[abyssSel - 1] : null;
  return `<div class="abyss"><div class="abrow"><button data-abyss="-1" ${abyssSel ? "" : "disabled"}>−</button><b>${abyssSel ? `深渊 ${abyssSel} 层` : "深渊：关闭"}</b><button data-abyss="1" ${abyssSel < open ? "" : "disabled"}>＋</button><small>已解锁到第 ${open} 层</small></div>
    <p>${a ? `本层新增<b>「${a.name}」</b>：${a.desc}。前面各层的规则同时生效。首次通关这一层 +${abyssStars(abyssSel)}★。` : "在任意一关通关深渊第 N 层，就能解锁第 N+1 层（最高 20 层）。每层都会叠一条新的敌方加成，星星奖励也越来越多。"}</p>
    ${abyssSel > 1 ? `<p class="abl">${ABYSS.slice(0, abyssSel).map((x, i) => `<span title="${x.desc}">${i + 1}·${x.name}</span>`).join("")}</p>` : ""}</div>`;
}
function weekHtml(save) {
  if (!save.stars.some((x, i) => i >= 3 && x > 0)) return `<div class="daily week lockd"><div><b>每周挑战</b><p>通关第 4 关后解锁</p></div></div>`;
  const wi = weekInfo(), rec = save.week[wi.key];
  return `<div class="daily week"><div><b>每周挑战 · 第 ${wi.n + 1} 周</b><p>场地：${STAGES[wi.stage].name} · 困难难度 · 每周一换</p>
    <p>${wi.rules.map(r => `<span class="wr">${WEEK_BY[r].name}</span>${WEEK_BY[r].desc}`).join("　")}</p>
    <p>${rec ? (rec.clear ? "本周已通关 ✓（再通关每次 +1★）" : `本周最好：第 ${rec.best} 波 · 首通 +${WEEK_STARS}★`) : `本周首通 +${WEEK_STARS}★`}</p></div><button class="primary" id="btn-week">开始挑战</button></div>`;
}
let codexTab = "foe";
function showCodex(tab) {
  if (tab) codexTab = tab;
  const save = loadSave(), kills = save.foeKill, nFoe = Object.keys(ENEMIES).length;
  const total = Object.values(kills).reduce((a, b) => a + b, 0);
  const tabs = [["foe", `敌人 ${save.seen.length}/${nFoe}`], ["afx", `词缀 ${save.afxSeen.length}/${AFFIX.length}`], ["ev", `事件 ${save.evSeen.length}/${EVENTS.length}`]];
  const head = `<div class="tabs">${tabs.map(([k, n]) => `<button class="tab${codexTab === k ? " on" : ""}" data-codex="${k}">${n}</button>`).join("")}</div>`;
  let body = "";
  if (codexTab === "afx") {
    body = `<p>精英和首领会随机带 1–2 条词缀，头顶的小圆点就是它们。遇到过的会记在这里。</p>
      <div class="codex">${AFFIX.map(a => { const on = save.afxSeen.includes(a.id);
        return `<div class="cx${on ? "" : " unk"}"><div><b><i class="dot" style="background:${on ? a.color : "#39405a"}"></i>${on ? a.name : "？？？"}</b>
          <p>${on ? a.desc : "还没遇到"}</p></div></div>`; }).join("")}</div>`;
  } else if (codexTab === "ev") {
    body = `<p>每 ${EVENT_EVERY} 波会在两波之间来一次三选一。选过的事件会把三个选项都记下来。</p>
      <div class="codex">${EVENTS.map(e => { const on = save.evSeen.includes(e.id);
        return `<div class="cx${on ? "" : " unk"}"><div><b>${on ? e.name : "？？？"}</b>
          <p>${on ? e.text : "还没遇到"}</p>
          ${on ? e.opts.map(o => `<p class="opt"><b>${o.name}</b>${o.cost ? `（${o.cost} 星尘）` : ""}：${o.desc}</p>`).join("") : ""}</div></div>`; }).join("")}</div>`;
  } else {
    body = `<p>遇到过的敌人会记录在这里（${save.seen.length}/${nFoe}）${total ? ` · 累计击杀 <b class="starbank">${total}</b>` : ""}。<br>带<span style="color:#ffd860">大招</span>的敌人会读条，读条时集火打够伤害、或者冻住眩晕它，就能打断——打断后它破防 6 秒，受到的伤害 ×${BREAK_BONUS}。</p>
      <div class="codex">${Object.keys(ENEMIES).map(k => { const d = ENEMIES[k], seen = save.seen.includes(k), n = kills[k] || 0, ult = ULT_DEF[ULT_OF[k]];
        return `<div class="cx${seen ? "" : " unk"}"><canvas data-foe="${seen ? k : ""}" aria-hidden="true"></canvas><div>
          <b>${seen ? d.name : "？？？"}${seen && BOSS_TYPES.includes(k) ? " · 首领" : ""}</b>
          <p>${seen ? `生命 ${d.hp} · 攻击 ${d.atk} · 防御 ${d.def} · 法抗 ${d.res}${d.flying ? " · 飞行" : ""}` : "还没遇到"}</p><p>${seen ? ENEMY_DESC[k] || "" : ""}</p>
          ${seen && ult ? `<p class="mech"><b>大招 · ${ult.name}</b>：${ult.tip}</p>` : ""}
          ${seen ? `<p class="kn">累计击杀 <b>${n}</b></p>` : ""}</div></div>`; }).join("")}</div>`;
  }
  openOverlay(`<h2>图鉴</h2>${head}${body}
    <div class="btns"><button id="btn-menu">返回选关</button></div>`);
  for (const c of $("ovbox").querySelectorAll("canvas[data-foe]")) { if (c.dataset.foe) drawFoeIcon(c, c.dataset.foe); else { c.width = 52; c.height = 52; } }
}
function showAchv() {
  const save = loadSave();
  openOverlay(`<h2>成就</h2><p>已达成 ${save.achv.length}/${ACHV.length}，每个成就 +1★。</p>
    <div class="codex">${ACHV.map(a => { const ok = save.achv.includes(a.id);
      return `<div class="cx${ok ? "" : " unk"}"><div><b>${ok ? "✓ " : ""}${a.name}</b><p>${a.desc}</p></div></div>`; }).join("")}</div>
    <div class="btns"><button id="btn-menu">返回选关</button></div>`);
}
$("ovbox").addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.diff != null) { diffSel = +b.dataset.diff; showLevels(); }
  else if (b.dataset.abyss != null) { abyssSel = Math.max(0, Math.min(abyssOpen(), abyssSel + +b.dataset.abyss)); showLevels(); }
  else if (b.dataset.disk) { buyDisk(b.dataset.disk); }
  else if (b.id === "btn-diskreset") { if (b.dataset.sure) { editSave(d => { d.disk = {}; }); showPerks(); } else { b.dataset.sure = "1"; b.textContent = "再点一次确认重置"; } }
  else if (b.id === "btn-week") { const wi = weekInfo(); beginStage(wi.stage, { week: wi, diff: wi.diff }); }
  else if (b.dataset.chap != null) { chapSel = +b.dataset.chap; showLevels(); }
  else if (b.id === "btn-save") showSaveBox();
  else if (b.id === "btn-gfx") { const next = gfxSel >= 2 ? -1 : gfxSel + 1; editSave(d => { d.gfx = next; }); applyGfx(next); showLevels(); }
  else if (b.id === "btn-svcopy") {
    const ta = $("sv-out"); ta.select(); ta.setSelectionRange(0, 99999);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast("<b>已复制</b>存档代码在剪贴板里了。"), () => {});
    else toast(ok ? "<b>已复制</b>存档代码在剪贴板里了。" : "<b>请手动复制</b>长按或 Ctrl+C 复制选中的代码。");
  }
  else if (b.id === "btn-svdl") saveFile();
  else if (b.id === "btn-svin") {
    const err = importSave($("sv-in").value);
    if (err) showSaveBox(err);
    else { closeOverlay(); location.reload(); }
  }
  else if (b.id === "btn-svbak") {
    if (restoreBackup()) { closeOverlay(); location.reload(); }
    else showSaveBox("没有可以恢复的备份。");
  }
  else if (b.dataset.tal) {
    const [cid, tier, node] = b.dataset.tal.split(":");
    editSave(dd => { dd.tal = dd.tal || {}; dd.tal[cid] = dd.tal[cid] || {}; dd.tal[cid][tier] = dd.tal[cid][tier] === node ? null : node; });
    showRoster(cid);
  }
  else if (b.dataset.lv != null) beginStage(+b.dataset.lv, { diff: diffSel, abyss: abyssSel });
  else if (b.dataset.endless != null) beginStage(+b.dataset.endless, { endless: true });
  else if (b.dataset.story != null) replayStory(+b.dataset.story);
  else if (b.dataset.hero && heroCtx) { const { stage, opts } = heroCtx; heroCtx = null; editSave(d => { d.hero = b.dataset.hero; }); startRun(stage, { ...opts, hero: b.dataset.hero }); }
  else if (b.dataset.ros) showRoster(b.dataset.ros);
  else if (b.dataset.rnav) showRoster(b.dataset.rnav);
  else if (b.id === "btn-roster") showRoster();
  else if (b.dataset.perk) { const p = PERKS.find(x => x.id === b.dataset.perk); if (p && starBank().left >= p.cost) editSave(d => { if (!d.perks.includes(p.id)) d.perks.push(p.id); }); showPerks(); }
  else if (b.id === "btn-perks") showPerks();
  else if (b.dataset.codex) showCodex(b.dataset.codex);
  else if (b.id === "btn-codex") showCodex();
  else if (b.id === "btn-achv") showAchv();
  else if (b.id === "btn-daily") { const td = todayInfo(); beginStage(td.stage, { daily: { seed: td.seed, mod: td.mod, date: td.date }, diff: DAILY.diff }); }
  else if (b.id === "btn-vigil") { let last = 0; STAGES.forEach((_, i) => { if (unlocked(i)) last = i; }); beginStage(last, { vigil: true, seed: (Math.random() * 1e9) | 0, diff: diffSel }); }
  else if (b.id === "btn-resume") closeOverlay();
  else if (b.id === "btn-retry") startRun(S.stage, lastOpts);
  else if (b.id === "btn-next") beginStage(S.stage + 1, { diff: S.diff && S.stage + 1 < STAGES.length && (loadSave().stars[S.stage + 1] || 0) > 0 ? S.diff : 0, abyss: S.abyss || 0 });
  else if (b.id === "btn-menu") { heroCtx = null; showLevels(); }
});
let lastOpts = {};
// 进关流程：第一次玩先看剧情，然后选英雄
function beginStage(i, opts) {
  opts = opts || {};
  const st = !opts.endless && !opts.daily && !opts.vigil && !opts.week ? STORY[i] : null, d = loadSave();
  const go = () => { previewStage(i); showHeroPick(i, opts); };
  if (st && st.pre && !d.story.includes("pre" + i)) {
    previewStage(i);
    const ch = CHAPTERS.find(c => c.from === i);
    playStory(st.pre, () => { editSave(dd => { if (!dd.story.includes("pre" + i)) dd.story.push("pre" + i); }); go(); }, { title: ch ? ch.name : null });
  } else go();
}
function previewStage(i) {
  newRun(i, { perks: loadSave().perks, charLv: charLevels(), charTal: loadSave().tal, hero: loadSave().hero, charOpen: openChars().map(u => u.id) });
  mapFor = -1; infoKey = ""; teamKey = ""; cardKey = "";
  closeOverlay();
  for (const el of document.querySelectorAll("[data-k]")) el.dataset.k = "";
}
function replayStory(i) {
  const st = STORY[i], cleared = (loadSave().stars[i] || 0) > 0;
  const snap = S && !S.over && (S.wave > 0 || S.kills > 0) ? { S, ST, MAP, PORTALS } : null;
  previewStage(i);
  const lines = [...(st.pre || []), ...(cleared && st.on ? Object.values(st.on).flat() : []), ...(cleared ? st.post || [] : [])];
  const ch = CHAPTERS.find(c => c.from === i);
  playStory(lines, () => {
    if (snap) { ({ S, ST, MAP, PORTALS } = snap); mapFor = -1; infoKey = ""; teamKey = ""; cardKey = ""; }
    showLevels();
  }, { title: ch ? ch.name : null });
}
function startRun(i, opts) {
  opts = opts || {}; lastOpts = opts;
  newRun(i, { ...opts, perks: opts.perks || loadSave().perks, charLv: opts.charLv || charLevels(), charTal: opts.charTal || loadSave().tal, charOpen: opts.charOpen || openChars().map(u => u.id), formIdx: opts.formIdx == null ? loadSave().form : opts.formIdx, disk: opts.disk || loadSave().disk, autoWave: opts.autoWave == null ? loadSave().autoWave : opts.autoWave });
  acc = 0; shownOver = null; mapFor = -1; infoKey = ""; teamKey = ""; cardKey = "";
  setText("btn-speed", "1×"); setText("btn-pause", "暂停"); cycleForm(true);
  for (const el of document.querySelectorAll("[data-k]")) el.dataset.k = "";
  $("levelup").hidden = true; $("levelup").dataset.k = "";
  $("shopbox").hidden = true; $("shopbox").dataset.k = ""; $("eventbox").hidden = true; $("eventbox").dataset.k = ""; synKey = "";
  maybeImm();
  tut = !loadSave().tutorial && i === 0 && !opts.endless && !opts.daily && !opts.diff ? { step: 0, t: 0 } : null;
  closeOverlay();
}

// ---------- 新手引导 ----------
const TUT = [
  ["这一局只带一个英雄，全程自动战斗。敌人会从四周的传送门冲向中间的晨星碑。", (tt) => tt > 6],
  ["打死敌人会攒经验，经验条满了就会暂停，让你翻牌。", () => S.level >= 2 || S.pending > 0 || S.picks.length],
  ["翻到的卡一整局都生效：属性、伙伴、自动技能都可以一直叠加。", () => S.picks.length >= 1],
  ["晨星碑的血被打光就输了。陨星术（Q）和圣愈之光（W）可以救急。", (tt) => S.usedSpell || tt > 40],
  ["击杀还会给晨星之力充能，满了点上面那条金色的按钮（或按 E）放全屏大招。引导结束，祝你守住！", (tt) => S.usedUlt || tt > 30],
];
let tut = null;
function updateTut(dt) {
  const box = $("tut");
  if (!tut || menuOpen || dlg) { box.hidden = true; return; }
  tut.t += dt;
  if (TUT[tut.step][1](tut.t)) { tut.step++; tut.t = 0; box.dataset.k = ""; }
  if (tut.step >= TUT.length) { tut = null; editSave(d => { d.tutorial = true; }); box.hidden = true; return; }
  box.hidden = false;
  if (box.dataset.k !== String(tut.step)) { box.dataset.k = String(tut.step); box.innerHTML = `<span><b>引导 ${tut.step + 1}/${TUT.length}</b>${TUT[tut.step][0]}</span><button id="btn-skiptut">跳过引导</button>`; }
}
$("tut").addEventListener("click", ev => { if (ev.target.id === "btn-skiptut") { tut = null; editSave(d => { d.tutorial = true; }); $("tut").hidden = true; } });

// ---------- 结算 ----------
function statsTable() {
  const rows = Object.entries(S.stats).map(([k, v]) => ({ name: statName(k), ...v })).sort((a, b) => b.dmg + b.heal - (a.dmg + a.heal));
  if (!rows.length) return "";
  const mx = Math.max(1, ...rows.map(r => Math.max(r.dmg, r.heal)));
  return `<div class="tablewrap"><table class="statt"><thead><tr><th>战斗统计</th><th>伤害</th><th>治疗</th><th>击杀</th><th>承受伤害</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td>${r.name}</td><td>${R0(r.dmg)}<i style="width:${R0(r.dmg / mx * 60)}px"></i></td><td>${R0(r.heal)}</td><td>${r.kills}</td><td>${R0(r.taken)}</td></tr>`).join("") + `</tbody></table></div>`;
}
function cardsHtml() {
  const ids = Object.keys(S.cards);
  const syns = SYNERGY.filter(g => S.syn && S.syn[g.id]);
  const allies = S.units.filter(u => !u.summon).map(u => `${u.def.name}${u.lv >= 4 ? " · " + u.def.branches[u.branch === "A" ? 0 : 1].name : " " + u.lv + " 阶"}`);
  return `<p class="skill">本局队伍：${allies.join("、")}</p>` +
    (ids.length ? `<div class="wavebar" style="justify-content:center">${ids.map(id => { const c = ANY_CARD(id) || { name: id }, R = RARITY[c.rare || 0];
      return `<span class="chip" style="${c.rare ? `color:${R.color};border-color:${R.color}` : ""}">${c.name}${S.cards[id] > 1 ? " ×" + S.cards[id] : ""}</span>`; }).join("")}</div>` : "") +
    (Object.keys(S.curses || {}).length ? `<div class="wavebar" style="justify-content:center"><span>诅咒：</span>${Object.keys(S.curses).map(id => `<span class="chip" style="color:${CURSE_COLOR};border-color:${CURSE_COLOR}">${CURSE_BY[id].name}${S.curses[id] > 1 ? " ×" + S.curses[id] : ""}</span>`).join("")}</div>` : "") +
    (syns.length ? `<div class="wavebar" style="justify-content:center"><span>羁绊：</span>${syns.map(g => `<span class="chip" style="color:${g.color};border-color:${g.color}">${g.name}</span>`).join("")}</div>` : "");
}

// ---------- 结算战报 ----------
function mvpOf() {
  let best = null, bv = -1;
  for (const u of S.units) {
    const st = S.stats[u.def.id]; if (!st || u.summon) continue;
    const v = st.dmg + st.heal * 1.2;
    if (v > bv) { bv = v; best = u; }
  }
  return best;
}
function battleReport() {
  const sec = Math.max(1, Math.round(S.t || (Date.now() - (S.t0 || Date.now())) / 1000));
  const mm = Math.floor(sec / 60), ss = sec % 60;
  const mvp = mvpOf(), legends = Object.keys(S.cards).filter(id => { const c = ANY_CARD(id); return c && (c.rare || 0) === 2; });
  const chip = (k, v, col) => `<div class="rep"><span>${k}</span><b${col ? ` style="color:${col}"` : ""}>${v}</b></div>`;
  const total = Object.values(S.stats).reduce((a, v) => a + v.dmg, 0);
  return `<div class="report">
    <div class="repgrid">
      ${chip("用时", `${mm}:${String(ss).padStart(2, "0")}`)}
      ${chip("波次", `${Math.max(0, S.wave - (S.over === "win" ? 0 : 1))}${S.endless ? "" : " / " + ST.waves}`)}
      ${chip("击败", S.kills)}
      ${chip("最高连杀", S.comboBest, S.comboBest >= 20 ? "#ffd860" : "")}
      ${chip("总伤害", R0(total))}
      ${chip("最大单击", R0(S.maxHit || 0) + (S.maxHitBy ? `<small>${S.maxHitBy}</small>` : ""), "#ffd860")}
      ${chip("打断读条", (S.breaks || 0) + " 次", S.breaks ? "#8fe0f0" : "")}
      ${chip("翻牌", S.picks.length + " 张")}
      ${chip("传说卡", legends.length + " 张", legends.length ? "#ffb040" : "")}
      ${chip("诅咒", Object.keys(S.curses || {}).length + " 张", Object.keys(S.curses || {}).length ? CURSE_COLOR : "")}
      ${chip("羁绊峰值", (S.bestSyn || 0) + " 个")}
      ${chip("星尘", S.dust)}
    </div>
    ${mvp ? `<div class="mvp"><canvas id="rep-mvp" aria-hidden="true"></canvas><div><b>MVP · ${mvp.def.name}</b>
      <span>造成伤害 ${R0((S.stats[mvp.def.id] || {}).dmg || 0)}${(S.stats[mvp.def.id] || {}).heal > 0 ? ` · 治疗 ${R0(S.stats[mvp.def.id].heal)}` : ""} · 击杀 ${(S.stats[mvp.def.id] || {}).kills || 0}</span></div></div>` : ""}
    ${(S.log || []).length > 1 ? `<div class="curvebox"><b>晨星碑血量 / 等级曲线</b><canvas id="rep-curve" aria-hidden="true"></canvas></div>` : ""}
  </div>`;
}
function drawReport() {
  const mvp = mvpOf(), mc = $("rep-mvp");
  if (mvp && mc) drawPortrait(mvp.def, mc, mvp.lv, mvp.branch);
  const cv = $("rep-curve"); if (!cv || !S.log || S.log.length < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 420, h = 78;
  cv.width = R0(w * dpr); cv.height = R0(h * dpr);
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const log = S.log.concat([{ w: S.wave, hp: Math.max(0, S.crystal.hp / S.crystal.maxHp), kills: S.kills, lv: S.level }]);
  const n = log.length, maxLv = Math.max(2, ...log.map(p => p.lv));
  g.fillStyle = "#0e1018"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, h * i / 4); g.lineTo(w, h * i / 4); g.stroke(); }
  const px = i => 4 + i / (n - 1) * (w - 8);
  // 等级（金色柱）
  g.fillStyle = "rgba(255,216,96,.22)";
  log.forEach((p, i) => { const bh = p.lv / maxLv * (h - 8); g.fillRect(px(i) - 1.5, h - bh, 3, bh); });
  // 晶体血量（蓝线）
  g.strokeStyle = "#62b4ff"; g.lineWidth = 2; g.beginPath();
  log.forEach((p, i) => { const y = 4 + (1 - p.hp) * (h - 10); i ? g.lineTo(px(i), y) : g.moveTo(px(i), y); });
  g.stroke();
  g.fillStyle = "#62b4ff";
  log.forEach((p, i) => { const y = 4 + (1 - p.hp) * (h - 10); g.fillRect(px(i) - 1.5, y - 1.5, 3, 3); });
  g.fillStyle = "#7a8396"; g.font = "10px sans-serif"; g.textAlign = "left";
  g.fillText("第 1 波", 4, h - 3); g.textAlign = "right"; g.fillText("第 " + log[n - 1].w + " 波 · Lv" + log[n - 1].lv, w - 4, h - 3);
}
let shownOver = null;
// 一局结束：先把存档结算做完（settleRun，数据都在这一步写好，中途关页面也不会丢），再播通关剧情、出结算页
function checkOver() {
  if (S.over === shownOver) return;
  shownOver = S.over;
  if (!S.over) return;
  S.fx = S.fx.filter(f => f.kind !== "cutin" && f.kind !== "combo" && f.kind !== "banner");
  S.ultPending = 0; S.slowmo = 0;
  const R = settleRun();
  if (R.story) playStory(R.story, () => showResult(R));
  else showResult(R);
}
function showResult(R) {
  R = R || settleRun();
  const win = R.win, exp = expHtml(R.exp), tail = battleReport() + cardsHtml() + statsTable() + exp;
  if (R.mode === "vigil") {
    openOverlay(`<h2>${win ? "长夜守望成功" : "长夜结束"}</h2><p>${ST.name}：撑过 ${R.reached}/${ST.waves} 波，击败 ${S.kills} 个敌人，升到 Lv ${S.level}，攒了 ${S.dust} 星尘。</p>
      <p>最好成绩：第 ${R.best} 波${R.clear ? " · 已通关 ✓" : ""}</p>
      ${tail}<div class="btns"><button class="primary" id="btn-vigil">再守一夜</button><button id="btn-menu">选关</button></div>`);
  } else if (R.mode === "daily") {
    openOverlay(`<h2>${win ? "每日挑战完成" : "每日挑战失败"}</h2><p>${ST.name} · 规则「${DAILY_MODS.find(m => m.id === S.mod).name}」：${win ? `守住了全部 ${ST.waves} 波` : `撑到第 ${R.reached} 波`}，击败 ${S.kills} 个敌人，升到 Lv ${S.level}。</p>
      ${tail}<div class="btns"><button class="primary" id="btn-retry">再来一次</button><button id="btn-menu">选关</button></div>`);
  } else if (R.mode === "endless") {
    openOverlay(`<h2>无尽模式结束</h2><p>${ST.name}：撑过 ${R.reached} 波，击败 ${S.kills} 个敌人，升到 Lv ${S.level}。最高纪录第 ${R.best} 波。</p>
      ${R.got > 0 ? `<p style="color:#ffd860">新获得 ${R.got}★。</p>` : ""}${tail}
      <div class="btns"><button class="primary" id="btn-retry">再来一次</button><button id="btn-menu">选关</button></div>`);
  } else if (R.mode === "week") {
    openOverlay(`<h2>${win ? "每周挑战完成" : "每周挑战失败"}</h2><p>${ST.name} · ${S.week.rules.map(r => WEEK_BY[r].name).join(" + ")}：${win ? `守住了全部 ${ST.waves} 波` : `撑到第 ${R.reached} 波`}。</p>
      ${R.first ? `<p class="stars">本周首通 +${WEEK_STARS}★</p>` : win ? `<p style="color:#ffd860">通关奖励 +1★</p>` : ""}
      ${tail}<div class="btns"><button class="primary" id="btn-week">再来一次</button><button id="btn-menu">选关</button></div>`);
  } else if (win) {
    const hasNext = S.stage + 1 < STAGES.length, final = S.stage === STAGES.length - 1;
    openOverlay(`<h2>${final ? "深渊之门封印了" : "晨星碑守住了"}</h2>${S.diff === 0 ? starHtml(S.stars) : `<p class="stars">${DIFFS[S.diff].name}通关 +1★</p>`}
      <p>第 ${S.stage + 1} 关 · ${ST.name}：击败 ${S.kills} 个敌人，升到 Lv ${S.level}，晨星碑还剩 ${Math.ceil(S.crystal.hp)}/${S.crystal.maxHp}。</p>
      <p style="color:#ffd860">${R.reward}</p>
      ${final ? "<p>主线通关！可以继续挑战困难、噩梦、无尽和每日挑战，把角色都练到 10 级。</p>" : ""}${tail}
      <div class="btns">${hasNext ? '<button class="primary" id="btn-next">下一关</button>' : ""}<button id="btn-retry">再玩一次</button><button id="btn-menu">选关</button></div>`);
  } else {
    openOverlay(`<h2>晨星碑碎了</h2><p>坚持到第 ${S.wave} 波，击败 ${S.kills} 个敌人，升到 Lv ${S.level}。换个英雄、或者优先翻伙伴和范围技能，再试一次吧。</p>
      ${tail}<div class="btns"><button class="primary" id="btn-retry">再试一次</button><button id="btn-menu">选关</button></div>`);
  }
  drawExpPortraits(); drawReport(); animResult();
}
// 结算页入场：标题砸下、星星逐个落下、战报格子依次弹出且数字从 0 滚上去、MVP 聚光、经验条充满
function animResult() {
  const box = $("ovbox"); box.classList.remove("res"); void box.offsetWidth; box.classList.add("res");
  box.querySelectorAll(".rep").forEach((el, i) => { el.style.animationDelay = (0.35 + i * 0.05) + "s"; });
  const nums = [...box.querySelectorAll(".rep b")].map(b => ({ b, t: b.firstChild })).filter(o => o.t && o.t.nodeType === 3 && /^\d+( .*)?$/.test(o.t.nodeValue));
  nums.forEach(o => { const m = o.t.nodeValue.match(/^(\d+)(.*)$/); o.v = +m[1]; o.u = m[2]; o.t.nodeValue = "0" + o.u; });
  const t0 = performance.now(), dur = 900, delay = 350;
  const tick = now => {
    if (!box.classList.contains("res")) return;
    const k = Math.max(0, Math.min(1, (now - t0 - delay) / dur)), e = 1 - Math.pow(1 - k, 3);
    for (const o of nums) o.t.nodeValue = Math.round(o.v * e) + o.u;
    if (k < 1) requestAnimationFrame(tick);
  };
  if (nums.length) requestAnimationFrame(tick);
}
