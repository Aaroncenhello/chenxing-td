
// ================= 角色羁绊（阵营 / 职业 / 特质 + 搭档） =================
// 每名英雄带 3 个标签：1 个阵营、1 个职业、1 个特质。队里（还活着、不含召唤物）同标签的人数达到 2 / 3 / 4 时，依次激活更强的效果。
// 每档效果分两部分：own = 只给带这个标签的队员，team = 给全队。再加 10 对「搭档」：两人同时在场就生效。
// 和 config-meta.js 里 13 个靠技能卡凑的羁绊（SYNERGY，界面上叫「技能羁绊」）并存，互不影响。
// 效果键：atk hp def（倍率加成）aspd（攻速）range（射程加值）crit critDmg（暴击率 / 暴击伤害加值）spell（法术伤害）sp（技力回复）
//        heal（治疗量）dr（受到伤害减免）crystalDr（晨星碑减伤）regen（每秒回血，占最大生命的比例）exec（打生命 <50% 的敌人加成）
//        extra（远程多打几个目标）dust（星尘获取）reroll（每 5 波多一次重抽）slow（敌人减速）revive（倒下后复活时间缩短）
//        blast（每 8 秒一次自动炮击，值 = 倍数）castSp（放技能后全队技力加值）
const TAGS = {
  knight: ["近卫", "守卫", "光辉"], sword: ["游侠团", "先锋", "兵器"], assassin: ["林地", "先锋", "暗影"], lancer: ["近卫", "先锋", "兵器"],
  archer: ["林地", "射手", "自然"], mage: ["学院", "法师", "奥术"], gunner: ["工坊", "射手", "兵器"], priest: ["游侠团", "支援", "光辉"],
  frost: ["潮汐", "法师", "元素"], alchemist: ["学院", "法师", "元素"], bard: ["学院", "支援", "光辉"], summoner: ["学院", "支援", "自然"],
  mech: ["工坊", "守卫", "元素"], star: ["游侠团", "法师", "奥术"], chrono: ["工坊", "支援", "奥术"], marshal: ["近卫", "守卫", "光辉"],
  counter: ["近卫", "守卫", "兵器"], hunter: ["林地", "射手", "暗影"], songstress: ["潮汐", "支援", "自然"], breaker: ["潮汐", "先锋", "暗影"],
};
const trT = (n, own, team, desc) => ({ n, own: own || {}, team: team || {}, desc });
const TRAITS = [
  // —— 阵营 ——
  { id: "近卫", axis: "阵营", color: "#8fb3e0", tiers: [
    trT(2, { def: 0.12 }, null, "近卫成员防御 +12%"),
    trT(3, { def: 0.2 }, { dr: 0.04 }, "近卫成员防御 +20%，全队受到的伤害 −4%"),
    trT(4, { def: 0.32 }, { dr: 0.08, crystalDr: 0.1 }, "近卫成员防御 +32%，全队受到的伤害 −8%，晨星碑受到的伤害 −10%")] },
  { id: "学院", axis: "阵营", color: "#b18ae8", tiers: [
    trT(2, { sp: 0.15 }, null, "学院成员技力回复 +15%"),
    trT(3, { sp: 0.25, spell: 0.08 }, null, "学院成员技力回复 +25%，法术伤害 +8%"),
    trT(4, { sp: 0.4 }, { spell: 0.12 }, "学院成员技力回复 +40%，全队法术伤害 +12%")] },
  { id: "林地", axis: "阵营", color: "#6fcf8e", tiers: [
    trT(2, { crit: 0.06 }, null, "林地成员暴击率 +6%"),
    trT(3, { crit: 0.12, critDmg: 0.3 }, null, "林地成员暴击率 +12%，暴击伤害 +30%")] },
  { id: "工坊", axis: "阵营", color: "#e0a050", tiers: [
    trT(2, { aspd: 0.1 }, null, "工坊成员攻击速度 +10%"),
    trT(3, { aspd: 0.18 }, { blast: 2.5 }, "工坊成员攻击速度 +18%，每 8 秒一次自动炮击，打最近的 4 个敌人")] },
  { id: "潮汐", axis: "阵营", color: "#5ab8e8", tiers: [
    trT(2, null, { regen: 0.004 }, "全队每秒回复 0.4% 最大生命"),
    trT(3, null, { regen: 0.008, slow: 0.12 }, "全队每秒回复 0.8% 最大生命，敌人移动速度 −12%")] },
  { id: "游侠团", axis: "阵营", color: "#e8c860", tiers: [
    trT(2, null, { dust: 0.15 }, "星尘获取 +15%"),
    trT(3, null, { dust: 0.3, reroll: 1 }, "星尘获取 +30%，每 5 波多一次重抽")] },
  // —— 职业 ——
  { id: "守卫", axis: "职业", color: "#a0b8d8", tiers: [
    trT(2, { hp: 0.18 }, null, "守卫成员生命 +18%"),
    trT(3, { hp: 0.3 }, null, "守卫成员生命 +30%"),
    trT(4, { hp: 0.45, dr: 0.08 }, null, "守卫成员生命 +45%，受到的伤害 −8%")] },
  { id: "先锋", axis: "职业", color: "#e0676a", tiers: [
    trT(2, { atk: 0.12 }, null, "先锋成员攻击 +12%"),
    trT(3, { atk: 0.2 }, null, "先锋成员攻击 +20%"),
    trT(4, { atk: 0.32, aspd: 0.08 }, null, "先锋成员攻击 +32%，攻击速度 +8%")] },
  { id: "射手", axis: "职业", color: "#8fe0a0", tiers: [
    trT(2, { range: 0.4 }, null, "射手成员射程 +0.4"),
    trT(3, { range: 0.7, extra: 1 }, null, "射手成员射程 +0.7，同时多打 1 个目标")] },
  { id: "法师", axis: "职业", color: "#a08ae8", tiers: [
    trT(2, { spell: 0.12 }, null, "法师成员法术伤害 +12%"),
    trT(3, { spell: 0.22 }, null, "法师成员法术伤害 +22%"),
    trT(4, { spell: 0.38 }, null, "法师成员法术伤害 +38%")] },
  { id: "支援", axis: "职业", color: "#7ee89c", tiers: [
    trT(2, { heal: 0.25 }, { sp: 0.08 }, "支援成员治疗量 +25%，全队技力回复 +8%"),
    trT(3, { heal: 0.4 }, { sp: 0.08, dr: 0.05 }, "支援成员治疗量 +40%，全队受到的伤害 −5%"),
    trT(4, { heal: 0.6 }, { sp: 0.08, dr: 0.08, revive: 0.3 }, "支援成员治疗量 +60%，全队受到的伤害 −8%，复活时间 −30%")] },
  // —— 特质 ——
  { id: "光辉", axis: "特质", color: "#ffe9a0", tiers: [
    trT(2, null, { regen: 0.003, heal: 0.1 }, "全队每秒回复 0.3% 最大生命，治疗量 +10%"),
    trT(3, null, { dr: 0.06 }, "全队受到的伤害 −6%"),
    trT(4, null, { atk: 0.1 }, "全队攻击 +10%")] },
  { id: "暗影", axis: "特质", color: "#9c8ac0", tiers: [
    trT(2, { exec: 0.15 }, null, "暗影成员对生命低于一半的敌人伤害 +15%"),
    trT(3, { exec: 0.28, crit: 0.06 }, null, "暗影成员对生命低于一半的敌人伤害 +28%，暴击率 +6%")] },
  { id: "元素", axis: "特质", color: "#ff9a5a", tiers: [
    trT(2, { atk: 0.08 }, null, "元素成员攻击 +8%"),
    trT(3, { atk: 0.2 }, { slow: 0.06, spell: 0.08 }, "元素成员攻击 +20%，敌人移动速度 −6%，全队法术伤害 +8%")] },
  { id: "奥术", axis: "特质", color: "#c8a0ff", tiers: [
    trT(2, { sp: 0.1 }, null, "奥术成员技力回复 +10%"),
    trT(3, { sp: 0.25, range: 0.3 }, { castSp: 4 }, "奥术成员技力回复 +25%，射程 +0.3，每次放技能全队技力 +4")] },
  { id: "兵器", axis: "特质", color: "#d0d0d8", tiers: [
    trT(2, { critDmg: 0.25 }, null, "兵器成员暴击伤害 +25%"),
    trT(3, { atk: 0.1, critDmg: 0.4 }, null, "兵器成员攻击 +10%，暴击伤害 +40%"),
    trT(4, { atk: 0.2, critDmg: 0.4 }, { crit: 0.05 }, "兵器成员攻击 +20%，全队暴击率 +5%")] },
  { id: "自然", axis: "特质", color: "#90d070", tiers: [
    trT(2, null, { regen: 0.003 }, "全队每秒回复 0.3% 最大生命"),
    trT(3, { aspd: 0.12, range: 0.3 }, { regen: 0.003 }, "自然成员攻击速度 +12%，射程 +0.3，全队每秒回复 0.3% 最大生命")] },
];
// 搭档：两人同时在场就生效，给这两个人
const PAIRS = [
  { id: "p_kn_pr", name: "圣护", ids: ["knight", "priest"], own: { dr: 0.06 }, desc: "两人受到的伤害 −6%" },
  { id: "p_ma_fr", name: "冰火交辉", ids: ["mage", "frost"], own: { spell: 0.1 }, desc: "两人法术伤害 +10%" },
  { id: "p_as_hu", name: "夜行", ids: ["assassin", "hunter"], own: { crit: 0.08 }, desc: "两人暴击率 +8%" },
  { id: "p_la_mr", name: "军阵", ids: ["lancer", "marshal"], own: { atk: 0.1 }, desc: "两人攻击 +10%" },
  { id: "p_gu_me", name: "机械师", ids: ["gunner", "mech"], own: { aspd: 0.1 }, desc: "两人攻击速度 +10%" },
  { id: "p_ar_bd", name: "林间小调", ids: ["archer", "bard"], own: { aspd: 0.1 }, desc: "两人攻击速度 +10%" },
  { id: "p_ch_st", name: "星时", ids: ["chrono", "star"], own: { sp: 0.15 }, desc: "两人技力回复 +15%" },
  { id: "p_so_br", name: "潮音", ids: ["songstress", "breaker"], own: { atk: 0.1 }, desc: "两人攻击 +10%" },
  { id: "p_al_su", name: "炼成", ids: ["alchemist", "summoner"], own: { atk: 0.1 }, desc: "两人攻击 +10%" },
  { id: "p_sw_co", name: "双刃", ids: ["sword", "counter"], own: { hp: 0.1, atk: 0.06 }, desc: "两人生命 +10%、攻击 +6%" },
];
const TRAIT_BY = Object.fromEntries(TRAITS.map(t => [t.id, t]));
const TRAIT_CAP = { atk: 0.6, hp: 0.8, def: 0.7, aspd: 0.45, range: 1.2, crit: 0.3, critDmg: 0.9, spell: 0.7, sp: 0.8, heal: 0.9, dr: 0.28, crystalDr: 0.2, regen: 0.012, exec: 0.5, extra: 1, dust: 0.5, reroll: 1, slow: 0.2, revive: 0.4, blast: 2.5, castSp: 6 };
const tagsOf = id => TAGS[id] || [];
// 当前人数 / 档位（S.trN / S.tr 由 updateSyn 每 0.5 秒刷新）
const trTier = id => (S && S.tr && S.tr[id]) || 0;
// 某名队员当前的羁绊加成：u.tf（updateSyn 里算好）
const tf = (u, k) => (u && u.tf && u.tf[k]) || 0;
const tfTeam = k => (S && S.trTeam && S.trTeam[k]) || 0;
function mergeFx(into, fx) { for (const k in fx) into[k] = (into[k] || 0) + fx[k]; }
// 重新算：每个羁绊的人数和档位，每名队员的加成
function updateTraits() {
  const alive = S.units.filter(u => !u.dead && !u.summon), N = {}, tier = {};
  for (const u of alive) for (const tg of tagsOf(u.def.id)) N[tg] = (N[tg] || 0) + 1;
  for (const t of TRAITS) { let k = 0; t.tiers.forEach((x, i) => { if ((N[t.id] || 0) >= x.n) k = i + 1; }); tier[t.id] = k; }
  const pairs = {}; for (const p of PAIRS) if (p.ids.every(id => alive.some(u => u.def.id === id))) pairs[p.id] = 1;
  const team = {};
  for (const t of TRAITS) if (tier[t.id]) mergeFx(team, t.tiers[tier[t.id] - 1].team);
  for (const u of S.units) {
    const f = {}; mergeFx(f, team);
    if (!u.summon) {
      const tg = tagsOf(u.def.id);
      for (const t of TRAITS) if (tier[t.id] && tg.includes(t.id)) mergeFx(f, t.tiers[tier[t.id] - 1].own);
      for (const p of PAIRS) if (pairs[p.id] && p.ids.includes(u.def.id)) mergeFx(f, p.own);
    }
    for (const k in f) if (TRAIT_CAP[k] != null) f[k] = Math.min(TRAIT_CAP[k], f[k]);
    const was = u.tf ? u.tf.hp || 0 : 0; u.tf = f;
    if ((f.hp || 0) !== was && u.maxHp > 1) { const fr = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.max(1, Math.round(u.maxHp * Math.min(1, fr))); }
  }
  for (const k in team) if (TRAIT_CAP[k] != null) team[k] = Math.min(TRAIT_CAP[k], team[k]);
  S.trN = N; S.tr = tier; S.trPairs = pairs; S.trTeam = team;
  if (S.events) announceTraits(tier, pairs);
  const nT = TRAITS.filter(t => tier[t.id]).length, nP = Object.keys(pairs).length;
  S.trActive = nT + nP; S.trBest = Math.max(S.trBest || 0, nT); S.pairBest = Math.max(S.pairBest || 0, nP);
  if (S.events) {
    const ach = (id, ok) => { if (ok && !(S.trAchv || (S.trAchv = {}))[id]) { S.trAchv[id] = 1; S.events.push({ type: "achv", id }); } };
    ach("trait4", TRAITS.some(t => tier[t.id] && t.tiers[tier[t.id] - 1].n >= 4)); ach("trait5", nT >= 5); ach("pair3", nP >= 3);
  }
}
const KILL_MARKS = [50, 100, 200, 300, 500, 800];
// 每帧：回血、自动炮击
function traitStep(dt) {
  for (const u of S.units) { const r = tf(u, "regen"); if (r > 0 && !u.dead && u.down <= 0 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * r * dt); }
  const bk = tfTeam("blast");
  if (bk > 0) {
    S.blastT = (S.blastT == null ? 8 : S.blastT) - dt;
    if (S.blastT <= 0) {
      S.blastT = 8;
      const src = S.units.filter(u => !u.dead && u.down <= 0 && !u.summon && tagsOf(u.def.id).includes("工坊")).sort((a, b) => uAtk(b) - uAtk(a))[0];
      const foes = S.enemies.filter(e => hittable(e) && e.revealed).sort((a, b) => toCrystal(a) - toCrystal(b)).slice(0, 4);
      if (src && foes.length) for (const e of foes) {
        hurt(e, calc(uAtk(src) * bk, "phys", eDef(e), eRes(e)), "phys", false, src);
        addFx({ kind: "ring", x: e.x, y: e.y, color: "#e0a050", life: 0.4, r0: 0.2, r1: 1.0 });
      }
    }
  }
}
// 招募偏向：已经有的羁绊标签越多、能让羁绊升一档的伙伴越容易出现（最多 ×2.2，不会锁死）
function traitBias(id) {
  let b = 1; for (const h of traitHint(id)) { if (h.from >= 1) b += 0.3; if (h.up) b += 0.4; }
  return Math.min(2.2, b);
}
// 角色的标签：<span> 一串，颜色跟羁绊走（角色页、属性卡里用）
function tagHtml(id) { return tagsOf(id).map(tg => `<span class="tg" style="--c:${(TRAIT_BY[tg] || {}).color || "#888"}">${tg}</span>`).join(""); }
// 选牌提示用：假装多一名这个角色，看哪些羁绊会前进。返回 [{name, color, from, to, up}]（只列这个角色带的标签）
function traitHint(id) {
  const alive = S.units.filter(u => !u.dead && !u.summon), out = [];
  for (const tg of tagsOf(id)) {
    const t = TRAIT_BY[tg]; if (!t) continue;
    const n0 = alive.filter(u => tagsOf(u.def.id).includes(tg)).length, n1 = n0 + 1, tier = (S.tr && S.tr[tg]) || 0;
    let tier1 = 0; t.tiers.forEach((x, i) => { if (n1 >= x.n) tier1 = i + 1; });
    const nx = t.tiers[tier1];   // 加入后的下一档
    out.push({ id: tg, name: tg, color: t.color, from: n0, to: n1, up: tier1 > tier, tier, tier1, desc: tier1 > 0 ? t.tiers[tier1 - 1].desc : "", nextN: nx ? nx.n : 0, nextDesc: nx ? nx.desc : "" });
  }
  return out;
}
// 这名英雄加入后，会让哪些搭档生效（搭档的另一个人已经在队里、搭档还没生效）
function pairHint(id) {
  const alive = S.units.filter(u => !u.dead && !u.summon).map(u => u.def.id), out = [];
  for (const p of PAIRS) { if (!p.ids.includes(id) || (S.trPairs && S.trPairs[p.id])) continue; const other = p.ids.find(x => x !== id); if (alive.includes(other)) out.push({ p, other, name: (UNITS.find(u => u.id === other) || {}).name }); }
  return out;
}
// 选牌「推荐」用的分：升档越多、越高档分越高；搭档生效 +3；队里已有的标签 +1
function joinScore(id) {
  let s = 0; for (const h of traitHint(id)) s += h.up ? 3 + h.tier1 : h.from >= 1 ? 1 : 0;
  return s + pairHint(id).length * 3;
}
// 角色的 3 个标签小彩点（队员栏用），生效的亮、没生效的暗；updateDots 每 0.1 秒刷新亮暗
function tagDots(id) { return `<span class="dots">${tagsOf(id).map(tg => `<i data-tg="${tg}" style="--c:${(TRAIT_BY[tg] || {}).color || "#888"}"></i>`).join("")}</span>`; }
function updateDots() { document.querySelectorAll(".dots i[data-tg]").forEach(el => el.classList.toggle("on", trTier(el.dataset.tg) > 0)); }
// 经验条里的目标：再招 1 名某个标签的成员就能升一档（只算这局还没上场、已解锁的角色）
function traitGoal() {
  const here = S.units.filter(u => !u.summon).map(u => u.def.id), open = (S.charOpen || []).filter(id => !here.includes(id)); let best = null;
  for (const t of TRAITS) {
    const n = (S.trN && S.trN[t.id]) || 0, k = (S.tr && S.tr[t.id]) || 0, nx = t.tiers[k]; if (!nx || n < 1 || nx.n - n !== 1) continue;
    const cand = open.filter(id => tagsOf(id).includes(t.id)); if (!cand.length) continue;
    const sc = nx.n + (k ? 1 : 0); if (!best || sc > best.sc) best = { sc, text: `再来 1 名${t.id}成员（${cand.slice(0, 3).map(id => (UNITS.find(u => u.id === id) || {}).name).join("、")}），${t.id}升到 ${nx.n} 人档` };
  }
  return best ? best.text : "";
}
// 羁绊档位提升时提示一次（只在比这局之前达到过的最高档更高时）
function announceTraits(tier, pairs) {
  S.trSeen = S.trSeen || {};
  for (const t of TRAITS) { const k = tier[t.id] || 0; if (k > (S.trSeen[t.id] || 0)) { S.trSeen[t.id] = k; const x = t.tiers[k - 1];
    addFx({ kind: "text", x: CRYSTAL.x, y: CRYSTAL.y - 1.4, text: `${t.id} ${x.n} 人档`, color: t.color, life: 1.6, big: true });
    S.events.push({ type: "trait", name: t.id, n: x.n, desc: x.desc, color: t.color }); } }
  for (const p of PAIRS) if (pairs[p.id] && !S.trSeen["p:" + p.id]) { S.trSeen["p:" + p.id] = 1;
    addFx({ kind: "text", x: CRYSTAL.x, y: CRYSTAL.y - 1.4, text: `搭档 · ${p.name}`, color: "#e8c860", life: 1.6, big: true });
    S.events.push({ type: "trait", name: "搭档 · " + p.name, n: 0, desc: p.desc, color: "#e8c860" }); }
}
