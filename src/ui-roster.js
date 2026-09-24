
// ================= 5.0：剧情对话、编队、角色养成 =================
let dlg = null;
const speakerName = id => (SPEAKERS[id] ? SPEAKERS[id].name : (UNITS.find(u => u.id === id) || {}).name || "");
const isVillain = id => !!(SPEAKERS[id] && SPEAKERS[id].foe);

// 立绘：从像素角色图里截出上半身，整数倍放大
function drawBust(cvs, id, face, bob) {
  const size = 128; if (cvs.width !== size) { cvs.width = size; cvs.height = size; }
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false; g.clearRect(0, 0, size, size);
  if (isVillain(id)) {
    const big = renderFoe(SPEAKERS[id].foe, { face, t: 0 });
    g.drawImage(big, 28, 50 - (bob ? 1 : 0), 64, 64, 0, 0, size, size);
  } else {
    const D = UNITS.find(u => u.id === id); if (!D) return;
    const big = renderHero(D, { phase: "idle", face, bob: bob ? 1 : 0, lv: 1 });
    g.drawImage(big, HOX * 2 - 32, 22, 64, 64, 0, 0, size, size);
  }
}
function playStory(lines, done, opts) {
  opts = opts || {};
  if (!lines || !lines.length) { if (done) done(); return; }
  dlg = { lines, i: -1, done, L: null, R: null, active: null, who: null, text: "", shown: 0, t: 0, mode: "line" };
  $("dlg").hidden = false; $("dlg-title").hidden = true; $("dlg-join").hidden = true;
  if (S) { S.selUnit = null; S.spellMode = null; S.selSpell = null; }
  if (opts.title) { dlg.mode = "title"; $("dlg-title").hidden = false; $("dlg-title").textContent = opts.title; $("dlg").classList.add("narr"); $("bust-L").hidden = $("bust-R").hidden = true; $("dlgbox").hidden = true; return; }
  dlgAdvance();
}
function dlgAdvance() {
  if (!dlg) return;
  dlg.i++;
  $("dlg-title").hidden = true; $("dlg-join").hidden = true; $("dlgbox").hidden = false;
  if (dlg.i >= dlg.lines.length) return dlgClose();
  const [who, text] = dlg.lines[dlg.i];
  if (who === "!join") return dlgJoin(text);
  dlg.mode = "line"; dlg.who = who; dlg.text = text; dlg.shown = 0;
  if (who !== "narr") {
    if (isVillain(who)) { dlg.R = who; dlg.active = "R"; }
    else if (dlg.L === who) dlg.active = "L";
    else if (dlg.R === who) dlg.active = "R";
    else { const slot = dlg.R && isVillain(dlg.R) ? "L" : dlg.active === "L" ? "R" : "L"; dlg[slot] = who; dlg.active = slot; }
  } else dlg.active = null;
  renderDlg();
}
function renderDlg() {
  const narr = dlg.who === "narr", box = $("dlg");
  box.classList.toggle("narr", narr);
  setText("dlg-name", narr ? "" : speakerName(dlg.who)); $("dlg-name").hidden = narr;
  $("dlg-name").style.background = narr ? "" : isVillain(dlg.who) ? "#c83a4a" : (UNITS.find(u => u.id === dlg.who) || {}).color || "var(--gold)";
  for (const side of ["L", "R"]) {
    const c = $("bust-" + side), id = dlg[side];
    c.hidden = !id || narr;
    if (id && !narr) { drawBust(c, id, side === "L" ? 1 : -1, false); c.classList.toggle("on", dlg.active === side); }
  }
  $("dlg-text").textContent = "";
}
function dlgJoin(id) {
  const D = UNITS.find(u => u.id === id); if (!D) return dlgAdvance();
  dlg.mode = "join"; dlg.shown = 0;
  const box = $("dlg-join"); box.hidden = false; $("dlgbox").hidden = true; $("bust-L").hidden = $("bust-R").hidden = true;
  box.style.setProperty("--c", D.color);
  box.innerHTML = `<canvas aria-hidden="true"></canvas><div><small>新伙伴</small><b>${D.name} · ${D.cls}</b><p>${D.note}</p><p class="tip">加入了队伍！出战前可以在编队里选她。</p></div>`;
  drawBust(box.querySelector("canvas"), id, 1, false);
  if (openChars().length >= UNITS.length) unlockAchv("allchars");
}
function dlgNext() {
  if (!dlg) return;
  if (dlg.mode === "line" && dlg.shown < dlg.text.length) { dlg.shown = dlg.text.length; setText("dlg-text", dlg.text); return; }
  dlgAdvance();
}
function dlgSkip() { if (dlg) dlgClose(); }
function dlgClose() {
  $("dlg").hidden = true; $("dlg").classList.remove("narr");
  const d = dlg && dlg.done; dlg = null;
  if (d) d();
}
function updateDlg(dt) {
  if (!dlg || dlg.mode !== "line") return;
  dlg.t += dt;
  if (dlg.shown < dlg.text.length) { dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * 34); setText("dlg-text", dlg.text.slice(0, Math.floor(dlg.shown))); }
  const talking = dlg.shown < dlg.text.length, bob = talking && Math.floor(dlg.t * 5) % 2 === 1;
  if (dlg.active && bob !== dlg.bob) { dlg.bob = bob; drawBust($("bust-" + dlg.active), dlg[dlg.active], dlg.active === "L" ? 1 : -1, bob); }
}
$("dlg").addEventListener("click", ev => { if (ev.target.id === "dlg-skip") { dlgSkip(); return; } dlgNext(); });
function storyOn(type) {
  if (!S || S.endless || S.daily) return;
  const st = STORY[S.stage], lines = st && st.on && st.on[type]; if (!lines) return;
  const key = "on" + S.stage + type;
  if (loadSave().story.includes(key)) return;
  editSave(d => { d.story.push(key); });
  playStory(lines, null);
}

// ---------- 选英雄 ----------
let heroCtx = null;
function showHeroPick(stage, opts) {
  heroCtx = { stage, opts };
  const open = openChars().filter(D => !opts.week || weekAllows(D, opts.week.rules)), lvs = charLevels(), save = loadSave(), last = save.hero;
  const st = STAGES[stage], seen = save.seen;
  const foes = opts.endless || opts.daily ? [] : [...new Set(st.pool.map(p => p[0]).concat(st.boss.map(b => b[0])))];
  openOverlay(`<h2>选择出战英雄</h2><p>${opts.week ? "每周挑战" : opts.daily ? "每日挑战" : opts.endless ? "无尽模式" : `第 ${stage + 1} 关`}${opts.abyss ? ` · 深渊 ${opts.abyss} 层` : ""} · ${st.name}：一局只带 1 个英雄上场，其他伙伴靠升级翻牌加入。</p>
    ${foes.length ? `<div class="wavebar" style="justify-content:center"><span>本关敌人：</span>${foes.map(k => `<span class="chip${ENEMIES[k].flying ? " elite" : ""}">${seen.includes(k) ? ENEMIES[k].name + (ENEMIES[k].flying ? " · 飞行" : "") : "？？？"}</span>`).join("")}</div>` : ""}
    <div class="heroes">${open.map(D => `<button class="card${D.id === last ? " sel" : ""}" data-hero="${D.id}" style="--c:${D.color}">
      <canvas class="pt" id="hp-${D.id}" aria-hidden="true"></canvas><span class="nm">${D.name}</span>
      <span class="meta">${D.cls} · ${D.place === "ground" ? "前排拦怪" : D.dmg === "heal" ? "治疗" : D.air ? "能打飞行" : "只打地面"}</span><span class="clv">Lv${lvs[D.id]}</span></button>`).join("")}</div>
    <div class="btns"><button id="btn-menu">返回选关</button></div>`);
  for (const D of open) drawPortrait(D, $("hp-" + D.id), 1);
}

// ---------- 角色养成 ----------
let rosterAnim = null;

// ---------- 天赋树 ----------
function treePicks(id, d) { const t = (d || loadSave()).tal || {}; return t[id] || {}; }
function treeHtml(D, lv, d) {
  const picks = treePicks(D.id, d);
  return `<div class="tree"><b>天赋树</b><small>Lv3 / Lv6 / Lv9 各选一个，随时可以改</small>` +
    TREE_TIERS.map((T, i) => {
      const on = lv >= T.lv, cur = picks[i];
      return `<div class="trow${on ? "" : " lock"}"><span class="tlv">${on ? T.name : "Lv" + T.lv}</span>` +
        treeOptions(D, i).map(n => { const N = TREE_NODE[n];
          return `<button class="tnode${cur === n ? " on" : ""}" ${on ? `data-tal="${D.id}:${i}:${n}"` : "disabled"}>
            <b>${N.name}</b><em>${N.desc}</em></button>`; }).join("") + `</div>`;
    }).join("") + `</div>`;
}
const placeName = D => (D.place === "ground" ? "前排 · 挡怪" : D.dmg === "heal" ? "后排 · 治疗" : "后排 · 输出");
// 战绩：大数字压成 1.2万 这种好读的形式
const bigN = n => (n >= 1e8 ? (n / 1e8).toFixed(1) + "亿" : n >= 1e4 ? (n / 1e4).toFixed(n >= 1e5 ? 0 : 1) + "万" : String(Math.round(n)));
function recHtml(d, D) {
  const u = d.use[D.id];
  if (!u || !u.runs) return `<div class="tree"><b>战绩</b><small>他还没上过场，打一局就会开始记录</small></div>`;
  const cell = (n, v) => `<div><span>${n}</span><b>${v}</b></div>`;
  return `<div class="tree"><b>战绩</b><small>出战 ${u.runs} 局 · 胜 ${u.win || 0} 局${u.hero ? ` · 当英雄 ${u.hero} 次` : ""}</small>
    <div class="rrec">${cell("累计伤害", bigN(u.dmg || 0))}${D.dmg === "heal" || u.heal ? cell("累计治疗", bigN(u.heal || 0)) : cell("场均伤害", bigN((u.dmg || 0) / u.runs))}${cell("累计击杀", bigN(u.kills || 0))}${cell("承受伤害", bigN(u.taken || 0))}</div></div>`;
}
function expBar(exp) { const L = levelOf(exp); return { L, pct: L.lv >= PROG.max ? 100 : Math.round(L.into / L.need * 100) }; }
function showRoster(id) {
  rosterAnim = null;
  const d = loadSave();
  if (!id) {
    openOverlay(`<h2>角色</h2><p>角色上场会获得经验，最高 ${PROG.max} 级：每级生命、攻击 +4%，3 级出场生命 +10%，5 级解锁天赋，7 级复活更快，10 级出场自带 50% 技力。</p>
      <div class="roster">${UNITS.map(D => { const open = charOpen(D), { L, pct } = expBar(charExp(d, D.id));
        return `<button class="card rc${open ? "" : " locked"}" ${open ? `data-ros="${D.id}"` : "disabled"} style="--c:${D.color}"><canvas class="pt" id="rs-${D.id}" aria-hidden="true"></canvas>
          <span class="nm">${open ? D.name : "？？？"}</span><span class="meta">${open ? `${D.cls} · Lv${L.lv}` : `第 ${D.joinAt + 1} 关加入`}</span>
          ${open ? `<span class="xp"><i style="width:${pct}%"></i></span>` : ""}</button>`; }).join("")}</div>
      <div class="btns"><button id="btn-menu">返回选关</button></div>`);
    for (const D of UNITS) { const c = $("rs-" + D.id); if (charOpen(D)) drawPortrait(D, c, 1); else { c.width = 40; c.height = 40; const g = c.getContext("2d"); g.fillStyle = "#1a1f2e"; g.fillRect(0, 0, 40, 40); } }
    return;
  }
  const D = UNITS.find(u => u.id === id), exp = charExp(d, id), { L, pct } = expBar(exp), k = 1 + PROG.perLv * (L.lv - 1), tal = TALENTS[id];
  const open = UNITS.filter(charOpen), idx = open.indexOf(D);
  const st = (name, base, mul) => `<div><span>${name}</span><b>${R0(base * mul)}</b>${mul > 1 ? `<small>+${R0(base * mul) - base}</small>` : ""}</div>`;
  openOverlay(`<div class="rdetail">
    <div class="rleft"><canvas id="r-anim" class="ranim" aria-hidden="true" style="--c:${D.color}"></canvas>
      <h3>${D.name} <small>${D.cls} · ${placeName(D)}</small></h3>
      <div class="rlv"><b>Lv ${L.lv}</b><span>${L.lv >= PROG.max ? "已满级" : `经验 ${L.into} / ${L.need}`}</span></div><div class="meter"><i style="width:${pct}%;background:var(--gold)"></i></div>
      <p class="bio">${BIO[id]}</p></div>
    <div class="rright">
      <div class="rstats">${st("生命", D.hp, k)}${st("攻击", D.atk, k)}${st("防御", D.def, 1)}${st("法抗", D.res, 1)}
        <div><span>攻击范围</span><b>${D.range}</b></div><div><span>${D.place === "ground" ? "拦截数" : "站位"}</span><b>${D.place === "ground" ? D.block : "后排"}</b></div><div><span>攻击间隔</span><b>${D.interval}s</b></div><div><span>技力</span><b>${D.sp}</b></div></div>
      ${D.note ? `<p class="skill"><b>特点</b>：${D.note}</p>` : ""}
      <p class="skill"><b>技能 · ${D.skill.name}</b>（技力 ${D.sp}）：${D.skill.desc}</p>
      <p class="skill"><b>3 阶特性</b>：${D.trait}</p>
      <p class="skill"><b>4 阶转职</b>：<span style="color:#8ac8ff">${D.branches[0].name}</span>（${D.branches[0].desc}）／<span style="color:#ff8a7a">${D.branches[1].name}</span>（${D.branches[1].desc}）</p>
      <p class="skill${L.lv >= PROG.talentLv ? "" : " lock"}"><b>天赋 · ${tal.name}</b>${L.lv >= PROG.talentLv ? "（已解锁）" : `（${PROG.talentLv} 级解锁）`}：${tal.desc}</p>
      ${treeHtml(D, L.lv, d)}
      ${recHtml(d, D)}
      <div class="miles">${MILESTONES.map(([lv, txt]) => `<span class="${L.lv >= lv ? "on" : ""}">${L.lv >= lv ? "✓" : "Lv" + lv} ${txt}</span>`).join("")}</div>
    </div></div>
    <div class="btns"><button data-rnav="${open[(idx - 1 + open.length) % open.length].id}">← 上一个</button><button data-rnav="${open[(idx + 1) % open.length].id}">下一个 →</button><button id="btn-roster">角色列表</button><button id="btn-menu">返回选关</button></div>`);
  rosterAnim = { D, cvs: $("r-anim"), t0: performance.now() };
}
function animRoster(now) {
  if (!rosterAnim || !menuOpen) return;
  const { D, cvs } = rosterAnim, t = (now - rosterAnim.t0) / 1000, cyc = t % 2.2, atkT = cyc - 1.2;
  if (cvs.width !== 240) { cvs.width = 240; cvs.height = 198; }
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 240, 198);
  const ph = atkT < 0 ? "idle" : heroPhase(D, atkT), bob = ph === "idle" ? Math.floor(t * 2.4) % 2 : 0;
  const big = renderHero(D, { phase: ph, face: 1, bob, t: atkT < 0 ? t : atkT, lv: 1, skill: false });
  g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(120 - 36, 172, 72, 6);
  g.drawImage(big, 8, 22, 80, 66, 0, 0, 240, 198);
}

function expHtml(gains) {
  if (!gains || !gains.length) return "";
  return `<div class="expt">${gains.map(g => { const { pct } = expBar(g.exp), up = g.after.lv > g.before;
    return `<div class="ex${up ? " up" : ""}"><canvas data-ept="${g.D.id}" aria-hidden="true"></canvas><div><b>${g.D.name}</b><span>+${g.gain} 经验</span>
      <em>${up ? `Lv${g.before} → Lv${g.after.lv}${g.before < PROG.talentLv && g.after.lv >= PROG.talentLv ? " · 天赋解锁" : ""}` : `Lv${g.after.lv}`}</em>
      <span class="xp"><i style="width:${pct}%"></i></span></div></div>`; }).join("")}</div>`;
}
function drawExpPortraits() { for (const c of $("ovbox").querySelectorAll("canvas[data-ept]")) drawPortrait(UNITS.find(u => u.id === c.dataset.ept), c, 1); }
