
// ================= 远征模式：连闯 6 层，队伍 / 卡牌 / 遗物 / 星尘一路带下去 =================
// 进度单独存在 localStorage 的 EXPED.key 里（不进主存档的白名单）：中途关掉页面，回来还停在路线图上；战斗打到一半关掉就从这一层的战斗重新开始。
// 主存档里只记战绩 save.exped = { best, clears, runs }。
const EXPED = { floors: 6, unlockAt: 3, restAfter: [1, 3], waveK: 0.6, hpStep: 0.38, atkStep: 0.12, eliteHp: 1.3, eliteExtra: 0.15, heal: 0.25, minHp: 0.4, key: "chenxing-td-exp",
  stars: { fight: 2, elite: 3, boss: 10 } };
const EXP_NODE = {
  fight: { name: "战斗", desc: "普通的一关（波数缩短），打赢继续前进", color: "#8fb3e0" },
  elite: { name: "精英战", desc: "敌人更硬、精英更多；打赢必得一件遗物", color: "#ff6a5a" },
  boss: { name: "首领", desc: "远征终点：打赢就完成远征", color: "#c860ff" },
};
const expUnlocked = d => ((d || loadSave()).stars[EXPED.unlockAt] || 0) > 0;
function expLoad() { try { const v = JSON.parse(localStorage.getItem(EXPED.key) || "null"); return v && v.v === 1 && Array.isArray(v.map) && UNITS.some(u => u.id === v.hero) ? v : null; } catch (e) { return null; } }
function expSave(st) { try { localStorage.setItem(EXPED.key, JSON.stringify(st)); } catch (e) {} }
function expClear() { try { localStorage.removeItem(EXPED.key); } catch (e) {} }

// 路线图：每层都是一场仗（普通战 / 精英战二选一或三选一），最后一层是首领关；第 2、4 场打赢后有一次休整
function expMakeMap() {
  const cleared = STAGES.map((_, i) => i).filter(i => (loadSave().stars[i] || 0) > 0);
  const pickStage = f => {   // 越往后越挑后面的关卡
    const c = cleared.length ? cleared : [0], mid = (f / (EXPED.floors - 1)) * (c.length - 1), j = Math.round(mid + (Math.random() - 0.5) * 2);
    return c[Math.max(0, Math.min(c.length - 1, j))];
  };
  const bosses = cleared.filter(i => i % 4 === 3);
  const map = [];
  for (let f = 0; f < EXPED.floors; f++) {
    if (f === EXPED.floors - 1) { map.push([{ type: "boss", stage: bosses.length ? bosses[Math.floor(Math.random() * bosses.length)] : pickStage(f) }]); continue; }
    const row = [{ type: "fight", stage: pickStage(f) }, f === 0 ? { type: "fight", stage: pickStage(f) } : { type: "elite", stage: pickStage(f) }];
    if (f > 0 && Math.random() < 0.5) row.push({ type: "fight", stage: pickStage(f) });
    map.push(row.sort(() => Math.random() - 0.5));
  }
  return map;
}
function expStart(hero) {
  const st = { v: 1, hero, floor: 0, map: expMakeMap(), path: [], snap: null, flips: 0, stars: 0, won: 0 };
  expSave(st); editSave(d => { d.exped.runs++; });
  showExpMap();
}
// 本局打完后记下来带到下一层的东西
function expSnap() {
  return { cards: { ...S.cards }, curses: { ...S.curses }, relics: [...S.relics], dust: S.dust, rerolls: S.rerolls, level: S.level, xp: S.xp, legends: S.legends,
    units: S.units.filter(u => !u.summon && !u.dead).map(u => ({ id: u.def.id, lv: u.lv, branch: u.branch, hero: u.hero })), crystal: S.crystal.maxHp ? S.crystal.hp / S.crystal.maxHp : 1 };
}
// newRun 末尾调用：把上一层带来的队伍、卡牌、遗物装回去（拿牌时的一次性效果在这里补算）
function expRestore(sn, flips) {
  S.cards = { ...sn.cards }; S.curses = { ...sn.curses }; S.relics = [...sn.relics].filter(id => RELIC_BY[id]);
  S.dust = sn.dust; S.rerolls = sn.rerolls; S.level = sn.level; S.xp = sn.xp; S.xpNeed = xpNeedOf(S.level); S.legends = sn.legends || 0;
  const hero = S.units.find(u => u.hero), hs = sn.units.find(u => u.hero);
  if (hero && hs) { hero.lv = hs.lv; hero.branch = hs.branch; }
  for (const x of sn.units) if (!x.hero) { const D = UNITS.find(u => u.id === x.id); if (!D) continue; const u = addUnit(D); u.lv = x.lv; u.branch = x.branch; }
  S.crystal.maxHp = Math.round(S.crystal.maxHp * Math.pow(1.2, cl("shield")) * Math.pow(1.4, cl("lg_aegis")) * Math.pow(0.75, cu("cu_brittle")));
  S.crystal.hp = Math.round(S.crystal.maxHp * Math.min(1, Math.max(EXPED.minHp, (sn.crystal || 1) + EXPED.heal)));
  for (const u of S.units) { u.maxHp = uMaxHp(u); u.hp = u.maxHp; }
  if (cl("sk_blade")) buildBlades();
  if (hero && hero.def.id === "summoner" && (sg("sg_su1") || sg("sg_su2"))) summonGolem(hero);
  updateSyn(); arrange();
  S.pending = flips || 0;
}
function expBattle(node) {
  const st = expLoad(); if (!st) return;
  const f = st.floor, elite = node.type === "elite";
  startRun(node.stage, { hero: st.hero, exped: { node: node.type, floor: f, waves: Math.max(5, Math.ceil(STAGES[node.stage].waves * (node.type === "boss" ? 0.75 : EXPED.waveK))),
    hpK: (1 + EXPED.hpStep * f) * (elite ? EXPED.eliteHp : 1), atkK: 1 + EXPED.atkStep * f, elite: elite ? EXPED.eliteExtra : 0, snap: st.snap, flips: st.flips } });
}
// 结算（settleRun 里调用）：赢了记快照、发星星、前进一层；输了远征结束
function expSettle(R) {
  const st = expLoad(); R.expFloor = (st ? st.floor : 0) + 1;
  if (!st) return;
  const node = S.exped.node;
  if (R.win) {
    const got = EXPED.stars[node] || 2;
    if (node === "elite") { const pool = RELICS.filter(r => !S.relics.includes(r.id)); if (pool.length && S.relics.length < RELIC_MAX) { const id = pool[Math.floor(Math.random() * pool.length)].id; S.relics.push(id); R.expRelic = id; editSave(d => { if (!d.relicSeen.includes(id)) d.relicSeen.push(id); }); } }
    st.snap = expSnap(); st.flips = 0; st.won++; st.stars += got; st.path.push(node);
    if (EXPED.restAfter.includes(st.floor)) st.rest = true;   // 这一层打完有休整
    st.floor++;
    R.expStars = got;
    editSave(d => { d.bonusStars += got; d.exped.best = Math.max(d.exped.best, st.floor); });
    if (node === "boss" || st.floor >= EXPED.floors) { R.expDone = true; R.expTotal = st.stars; editSave(d => { d.exped.clears++; }); unlockAchv("exped"); expClear(); }
    else expSave(st);
  } else { R.expEnd = true; R.expTotal = st.stars; editSave(d => { d.exped.best = Math.max(d.exped.best, st.floor); }); expClear(); }
}

// ---------- 界面 ----------
function expRowHtml(st) {
  const sn = st.snap, H = UNITS.find(u => u.id === st.hero);
  if (!sn) return `<p>英雄：<b style="color:${H.color}">${H.name}</b> · 还没出发</p>`;
  const nc = Object.keys(sn.cards).length, team = sn.units.map(u => UNITS.find(d => d.id === u.id)).filter(Boolean);
  return `<p>队伍：${team.map(d => `<b style="color:${d.color}">${d.name}</b>`).join("、")} · Lv ${sn.level} · 卡牌 ${nc} 张 · 遗物 ${sn.relics.length} 件 · 星尘 ${sn.dust} · 晨星碑 ${Math.round(sn.crystal * 100)}%（下一战开局回复到至少 ${Math.round(Math.min(1, Math.max(EXPED.minHp, sn.crystal + EXPED.heal)) * 100)}%）${st.flips ? ` · 下一战多翻 ${st.flips} 张` : ""}</p>`;
}
function showExpMap() {
  const st = expLoad(); if (!st) { showLevels(); return; }
  if (st.rest && st.snap) { openOverlay(expRestHtml(st)); return; }
  const f = st.floor;
  const floors = st.map.map((row, i) => {
    const cls = i < f ? "past" : i === f ? "now" : "next";
    const chosen = i < f ? st.path[i] : null;
    return `<div class="exf ${cls}"><span class="exn">第 ${i + 1} 层</span>${i === f
      ? row.map((n, k) => { const N = EXP_NODE[n.type]; return `<button class="exnode" data-exnode="${k}" style="--c:${N.color}"><b>${N.name}</b>${n.stage != null ? `<small>第 ${n.stage + 1} 关 · ${STAGES[n.stage].name}</small>` : ""}<span>${N.desc}</span></button>`; }).join("")
      : i < f ? `<span class="exdone" style="--c:${(EXP_NODE[chosen] || EXP_NODE.fight).color}">✓ ${(EXP_NODE[chosen] || EXP_NODE.fight).name}</span>`
      : row.map(n => `<span class="exfut" style="--c:${EXP_NODE[n.type].color}">${EXP_NODE[n.type].name}</span>`).join("")}</div>`;
  }).reverse().join("");
  openOverlay(`<h2>远征 · 第 ${f + 1}/${EXPED.floors} 层</h2>${expRowHtml(st)}
    <p class="dsrc">每层选一场仗：普通战，或者更难但必掉遗物的精英战；第 2、4 场打赢后能休整一次。战斗之间队伍、卡牌、遗物、星尘和等级都会带下去，敌人一层比一层强。输一场远征就结束（已经拿到的星星不会扣）。本次远征已得 ${st.stars}★。</p>
    <div class="exmap">${floors}</div>
    <div class="btns"><button id="btn-expquit">放弃远征</button><button id="btn-menu">返回选关（进度保留）</button></div>`);
}
function expChoose(k) {
  const st = expLoad(); if (!st || st.rest) return;
  const node = st.map[st.floor][k]; if (node) expBattle(node);
}
// 休整站：五选一
const EXP_REST = [
  { id: "heal", name: "修补晨星碑", desc: "下一战开局晨星碑满血" },
  { id: "dust", name: "整理行囊", desc: "星尘 +80" },
  { id: "rank", name: "操练", desc: "队伍里没到 3 阶的角色各升 1 阶" },
  { id: "relic", name: "打开宝箱", desc: "随机一件遗物" },
  { id: "flip", name: "研读星图", desc: "下一战开局多翻 2 张牌" },
];
function expRestHtml(st) {
  const sn = st.snap, can = { rank: sn.units.some(u => u.lv < 3), relic: sn.relics.length < RELIC_MAX };
  return `<h2>休整</h2>${expRowHtml(st)}<p>连打了几场，找个地方歇口气。选一样：</p>
    <div class="btns col">${EXP_REST.map(r => `<button data-exrest="${r.id}"${can[r.id] === false ? " disabled" : ""}><b>${r.name}</b> · ${r.desc}</button>`).join("")}</div>`;
}
function expRest(what) {
  const st = expLoad(); if (!st || !st.snap || !st.rest) return;
  const sn = st.snap;
  if (what === "heal") sn.crystal = 1;
  if (what === "dust") sn.dust += 80;
  if (what === "rank") for (const u of sn.units) if (u.lv < 3) u.lv++;
  if (what === "relic") { const pool = RELICS.filter(r => !sn.relics.includes(r.id)); if (pool.length && sn.relics.length < RELIC_MAX) { const id = pool[Math.floor(Math.random() * pool.length)].id; sn.relics.push(id); editSave(d => { if (!d.relicSeen.includes(id)) d.relicSeen.push(id); }); toast(`<b>遗物 · ${RELIC_BY[id].name}</b>${RELIC_BY[id].desc}`, c => drawRelicIcon(c, id, 44)); } }
  if (what === "flip") st.flips += 2;
  st.rest = false; expSave(st); showExpMap();
}
function expCardHtml(save) {
  if (!expUnlocked(save)) return `<div class="daily exped lockd"><div><b>远征</b><p>通关第 ${EXPED.unlockAt + 1} 关后解锁</p></div></div>`;
  const st = expLoad(), E = save.exped;
  return `<div class="daily exped"><div><b>远征 · 连闯 ${EXPED.floors} 层</b><p>队伍、卡牌、遗物一路带下去，连打 ${EXPED.floors} 场：每层选普通战或精英战，中途休整两次，最后一层打首领。每赢一场 +${EXPED.stars.fight}★（精英 +${EXPED.stars.elite}★，首领 +${EXPED.stars.boss}★）。</p>
    <p>${st ? `进行中：第 ${st.floor + 1} 层 · 已得 ${st.stars}★` : `最好成绩：第 ${E.best} 层 · 完成 ${E.clears} 次`}</p></div><button class="primary" id="btn-exped">${st ? "继续远征" : "开始远征"}</button></div>`;
}
