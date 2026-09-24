
// ================= 阵地引擎：场地、波次、角色站位、卡牌 =================
let ST = STAGES[0], MAP = ST.map, PORTALS = [];
const tileAt = (c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? MAP[r][c] : "#";
const canMelee = e => !e.d.flying || toCrystal(e) <= CRYSTAL.r + 0.7;
const solid = (x, y) => "#~H".includes(tileAt(Math.round(x), Math.round(y)));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const distTo = (o, x, y) => Math.hypot(o.x - x, o.y - y);
const toCrystal = o => Math.hypot(o.x - CRYSTAL.x, o.y - CRYSTAL.y);
function loadStage(i, gen) {
  ST = gen || STAGES[i]; MAP = ST.map; PORTALS = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (MAP[r][c] === "S") PORTALS.push({ x: c, y: r });
}
function seeded(seed) { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0), (s >>> 8) / 16777216); }
// 局内随机数按用途分流：每日/每周挑战每条流都带种子，同一天/同一周大家遇到的出怪、事件、遗物、词缀、战斗判定都从同一串随机数里取；
// 分开是为了让「翻了哪张牌、买了什么」不会打乱其他用途的顺序。其他模式全是 Math.random。
// 只影响画面的随机（粒子、飘字、抖屏、走路动画）继续直接用 Math.random，不然帧率不同结果就不同。波次生成用 S.rng。
const RNG_KEYS = ["card", "ev", "relic", "afx", "spawn", "fight", "shop"];
function makeRngs(seed) { const o = {}; RNG_KEYS.forEach((k, i) => { o[k] = seed ? seeded(seed * 7 + (i + 1) * 104729) : Math.random; }); return o; }
const roll = k => S.rngs[k]();

// ---------- 卡牌 / 角色等级 ----------
const cl = id => (S.cards && S.cards[id]) || 0;
const clv = id => (S.charLv && S.charLv[id]) || 1;
const awk = id => (S && S.charAwk && S.charAwk[id]) || 0;
const clvK = u => (1 + PROG.perLv * (clv(u.def.id) - 1)) * (u.summon ? 1 : 1 + AWK.perLv * awk(u.def.id));   // 角色等级 × 觉醒
const awkSp = u => (!u.summon && awk(u.def.id) >= AWK.spLv ? 0.2 : 0);
const hasTal = (u, id) => !!(u && u.def && u.def.id === id) && clv(id) >= PROG.talentLv;
// 天赋树：Lv3 / Lv6 / Lv9 各选一个
const talPick = (id, tier) => (S.charTal && S.charTal[id] && S.charTal[id][tier]) || null;
function tal(u, node) {
  if (!u || !u.def || u.summon) return false;
  const id = u.def.id, lv = clv(id), t = S.charTal && S.charTal[id];
  if (!t) return false;
  for (let i = 0; i < TREE_TIERS.length; i++) if (t[i] === node && lv >= TREE_TIERS[i].lv) return true;
  return false;
}
const lvK = (u, k) => UPGRADE[k][Math.min(3, u.lv - 1)];
const perk = id => S.perks.includes(id);
const syn = id => !!(S.syn && S.syn[id]);
function updateSyn() {
  const o = {}; let n = 0;
  for (const g of SYNERGY) { try { if (g.on()) { o[g.id] = 1; n++; } } catch (e) {} }
  const was = S.syn || {};
  S.syn = o; S.synN = n;
  for (const g of SYNERGY) if (o[g.id] && !was[g.id]) {
    addFx({ kind: "text", x: CRYSTAL.x, y: CRYSTAL.y - 1.4, text: "羁绊 · " + g.name, color: g.color, life: 1.6, big: true });
    S.events.push({ type: "syn", id: g.id, name: g.name, desc: g.desc, color: g.color });
  }
  if (n >= 4) S.events.push({ type: "achv", id: "synergy" });
  S.bestSyn = Math.max(S.bestSyn || 0, n);
}
// 选牌提示：假装拿了这张牌，看哪个还没生效的羁绊会前进一步。返回 {g, a, b, done} 或 null
function synHint(p) {
  if (!p || p.curse || (!p.card && !p.join)) return null;
  const before = SYNERGY.map(g => g.prog()), fake = p.join ? { def: p.def, dead: false } : null;
  let after;
  if (fake) S.units.push(fake); else S.cards[p.id] = cl(p.id) + 1;
  try { after = SYNERGY.map(g => g.prog()); }
  finally { if (fake) S.units.splice(S.units.indexOf(fake), 1); else if (--S.cards[p.id] <= 0) delete S.cards[p.id]; }
  let best = null;
  SYNERGY.forEach((g, i) => {
    const [a0, b] = before[i], a = after[i][0];
    if (a0 >= b || a <= a0) return;
    const h = { g, a: Math.min(a, b), b, done: a >= b };
    if (!best || h.done > best.done || (h.done === best.done && b - a < best.b - best.a)) best = h;
  });
  return best;
}
const BOSS_TYPES = ["boss", "sovereign", "devourer", "nameless", "stormlord"];
const isBossType = t => BOSS_TYPES.includes(t);
const isBoss = e => isBossType(e.type);
const hittable = e => !e.dead && !e.under;
const alive = u => !u.dead && u.down <= 0;
const heroOf = () => S.units[0];

// ---------- 数值 ----------
function uMaxHp(u) {
  let h = u.def.hp * lvK(u, "hp") * clvK(u) * (1 + 0.2 * cl("hp")) * (1 + 0.06 * cl("fl_atk"));
  if (clv(u.def.id) >= PROG.startLv) h *= 1.1;
  if (tal(u, "t_hp")) h *= 1.12;
  h *= S.buff.hp || 1;
  h *= (1 + 0.04 * dk("hp") + 0.01 * dk("star")) * (rl("rl_blade") ? 0.88 : 1) * (wk("glass") ? 0.5 : 1);
  if (br(u, "knight", "A")) h *= 1.4;
  if (br(u, "lancer", "B")) h *= 1.3;
  if (br(u, "marshal", "A")) h *= 1.3;
  if (u.summon) h *= u.sumHp * (u.sigHp || 1);
  if (u.hero && cl("lg_avatar")) h *= 1.6;
  h *= Math.max(0.2, 1 - 0.3 * cu("cu_frenzy"));
  if (syn("scholar")) h *= 1.15;
  if (cl("lg_bond")) h *= 1 + 0.08 * S.allies;
  return Math.round(h);
}
const br = (u, id, b) => u.def.id === id && u.branch === b;
const skillOn = (u, id) => u.skillT > 0 && u.def.id === id;
function auraOn(u) { return S.units.some(p => p !== u && alive(p) && br(p, "priest", "B") && dist(p, u) <= uRange(p)); }
function songOn(u) { return S.units.some(p => p !== u && alive(p) && p.def.id === "bard" && p.skillT > 0 && dist(p, u) <= uRange(p)); }
function bardAura(u) { let a = 0; for (const p of S.units) if (p !== u && alive(p) && p.def.id === "bard" && dist(p, u) <= uRange(p)) a = Math.max(a, br(p, "bard", "A") ? 0.35 : 0.2); return a; }
function chronoAura(u) { let a = 0; for (const p of S.units) if (p !== u && alive(p) && p.def.id === "chrono" && dist(p, u) <= uRange(p)) a = Math.max(a, br(p, "chrono", "A") ? 0.3 : 0.1); return a; }
function marshalGuard(u) { let a = 0; for (const p of S.units) if (p !== u && alive(p) && p.def.id === "marshal" && !br(p, "marshal", "B") && dist(p, u) <= uRange(p) + 1.6) a = Math.max(a, br(p, "marshal", "A") ? 0.25 : 0.15); return a; }
function marshalBanner(u) { for (const p of S.units) if (p !== u && alive(p) && br(p, "marshal", "B") && dist(p, u) <= uRange(p) + 1.6) return 0.3; return 0; }
const rallyOn = () => S.units.some(p => p.def.id === "marshal" && p.skillT > 0 && alive(p));
const bardSp = u => S.units.some(p => p !== u && alive(p) && p.def.id === "bard" && p.lv >= 3 && dist(p, u) <= uRange(p));
const golemOf = u => S.units.find(g => g.summon && g.owner === u && !g.dead);
function uAtk(u) {
  let a = u.def.atk * lvK(u, "atk") * clvK(u) * (1 + 0.12 * cl("atk")) * (1 + 0.06 * cl("fl_atk"));
  if (u.summon) a *= u.sumAtk * (u.sigAtk || 1);
  if (skillOn(u, "sword")) a *= 1.6;
  if (br(u, "knight", "B")) a *= 1.8;
  if (br(u, "archer", "B")) a *= 2;
  if (br(u, "mage", "A")) a *= 1.3;
  if (br(u, "gunner", "A")) a *= 1.6;
  if (br(u, "priest", "A")) a *= 1.4;
  if (br(u, "lancer", "A")) a *= 1.5;
  if (br(u, "alchemist", "B")) a *= 1.6;
  if (br(u, "bard", "B")) a *= 1.4;
  if (br(u, "summoner", "B")) a *= 1.5;
  if (hasTal(u, "assassin") && u.age < 8) a *= 1.6;
  a *= (1 + 0.03 * dk("atk") + 0.01 * dk("star")) * (rl("rl_blade") ? 1.25 : 1) * (rl("rl_banner") ? 1 + 0.04 * S.allies : 1) * (wk("glass") ? 2 : 1);
  if (u.def.dmg !== "heal" && auraOn(u)) a *= 1.25;
  if (u.def.dmg !== "heal" && songOn(u)) a *= 1.3;
  if (u.hero && cl("lg_avatar")) a *= 2;
  if (u.hero) {
    if (sg("sg_sw2")) a *= 1 + Math.min(0.8, 0.08 * S.enemies.filter(e => !e.dead && dist(u, e) <= 2.2).length);
    if (sg("sg_mg1")) a *= 1 + 0.12 * sg("sg_mg1");
    if (sg("sg_gu1")) a *= 1 + 0.2 * sg("sg_gu1");
    if (sg("sg_st1")) a *= 1 + 0.15 * sg("sg_st1");
    if (sg("sg_la2")) a *= 1.4;
    if (sg("sg_pr1") && u.def.dmg === "heal") a *= 1 + 0.25 * sg("sg_pr1");
  }
  if (sg("sg_bd2")) { const h = heroOf(); if (h && h.def.id === "bard") a *= 1 + 0.06 * S.units.filter(x => x !== h && alive(x) && dist(h, x) <= uRange(h)).length; }
  if (tal(u, "t_atk")) a *= 1.12;
  a *= S.buff.atk || 1;
  if (tal(u, "t_last") && u.hp < u.maxHp * 0.35) a *= 1.4;
  a *= 1 + marshalBanner(u);
  if (rallyOn()) a *= 1.3;
  a *= 1 + 0.45 * cu("cu_blood") + 0.6 * cu("cu_frenzy");
  if (cl("lg_bond")) a *= 1 + 0.08 * S.allies;
  if (syn("scholar")) a *= 1.15;
  if (syn("legendary")) a *= 1.2;
  if (syn("arcane") && u.def.dmg === "magic") a *= 1.25;
  if (hasTal(u, "mech") && u.hp < u.maxHp * 0.5) a *= 1;
  return a;
}
function uDef(u) {
  let d = u.def.def * lvK(u, "def") * (1 + 0.3 * cl("armor")) * (skillOn(u, "knight") ? 2 : 1);
  if (br(u, "lancer", "B")) d *= 1.6;
  if (hasTal(u, "knight") && u.hp < u.maxHp * 0.4) d *= 1.8;
  if (tal(u, "t_def")) d *= 1.3;
  d *= (S.buff.def || 1) * (1 + 0.05 * dk("armor"));
  d *= Math.max(0.2, 1 - 0.3 * cu("cu_haste"));
  if (syn("wall")) d *= 1.35;
  if (u.hero && sg("sg_me1")) d *= 1 + 0.2 * sg("sg_me1");
  return d;
}
const uRes = u => u.def.res + 8 * cl("armor") + 10 * cl("res");
function uInterval(u) {
  let i = u.def.interval / (skillOn(u, "archer") ? 2 : skillOn(u, "gunner") ? 3 : 1);
  if (br(u, "sword", "A")) i *= 0.7;
  if (br(u, "gunner", "B")) i *= 0.5;
  if (br(u, "summoner", "B") && golemOf(u)) i *= 0.5;
  if (syn("volley") && u.def.place === "high") i *= 0.8;
  if (u.chill) i *= 1 + u.chill;
  if (u.hero) { if (sg("sg_sw1")) i /= 1 + 0.15 * sg("sg_sw1"); if (sg("sg_ar1")) i /= 1 + 0.1 * sg("sg_ar1"); if (sg("sg_gu1")) i *= Math.max(0.5, 1 - 0.08 * sg("sg_gu1")); }
  i /= 1 + 0.35 * cu("cu_brittle");
  i /= 1 + 0.4 * cu("cu_haste");
  if (hasTal(u, "mech") && u.hp < u.maxHp * 0.5) i *= 0.67;
  if (tal(u, "t_spd")) i *= 0.9;
  i /= S.buff.aspd || 1;
  if (br(u, "chrono", "A")) i *= 0.8;
  i /= 1 + chronoAura(u);
  return i / (1 + bardAura(u)) / (1 + 0.09 * cl("aspd")) / (1 + 0.02 * dk("aspd")) / (rl("rl_boots") ? 1.15 : 1) / (syn("arcane") && u.def.dmg === "magic" ? 1 : 1);
}
function uRange(u) {
  let r = u.def.range + (u.def.place === "ground" ? 0.25 : 0.5) * cl("range");
  if (br(u, "archer", "B")) r += 1.5;
  if (br(u, "lancer", "A")) r += 0.6;
  if (u.def.id === "gunner" && u.lv >= 3) r += 0.6;
  if (u.hero && cl("lg_avatar")) r += 0.8;
  if (u.hero) { r += 0.35 * sg("sg_la1") + (sg("sg_ar2") ? 1.5 : 0); }
  if (sg("sg_bd1") && u.def.id === "bard") r += 0.4 * sg("sg_bd1");
  if (tal(u, "t_range")) r += 0.5;
  if (syn("volley") && u.def.place === "high") r += 0.4;
  return r;
}
const uTaunt = u => (u.def.taunt || 0) + (u.def.place === "ground" ? 0.1 * cl("range") : 0);
const uBlock = u => (u.def.block || 0) + (u.def.id === "knight" && u.lv >= 3 ? 1 : 0) + (br(u, "lancer", "B") ? 1 : 0) + (br(u, "marshal", "A") ? 1 : 0) + (tal(u, "t_block") ? 1 : 0) + (u.hero ? sg("sg_kn1") + sg("sg_ma1") : 0);
const uSplash = u => ((br(u, "mage", "A") ? 2 : br(u, "frost", "B") ? 1.2 : u.def.id === "mage" && u.lv >= 3 ? 1.4 : br(u, "alchemist", "B") ? 1.3 : u.def.splash || 0)
  + (u.hero ? 0.35 * sg("sg_mg1") + 0.3 * sg("sg_st1") + 0.25 * sg("sg_al1") : 0)) * (u.hero && sg("sg_gu2") ? 2 : 1);
const eAtk = e => e.d.atk * (e.warcry ? 1.25 : 1) * (e.elite ? ELITE.atk : 1) * Math.sqrt(e.hpK) * S.diffK.atk * (e.enraged ? 1.3 : 1);
const slowAura = e => (toCrystal(e) <= 3.5 ? 1 - Math.min(0.5, 0.12 * cl("slow")) : 1);
const chillOf = e => 1;
const eSpeed = e => e.d.speed * (hasAfx(e, 'swift') ? 1.35 : 1) * (e.warcry ? 1.15 : 1) * (S.slowWaves > 0 ? (S.eventSlowK || 0.78) : 1) * (1 + 0.18 * cu("cu_whisper")) * (e.slowT > 0 && !hasAfx(e, 'swift') ? (e.slowK || 0.6) : 1) * (e.enraged ? 1.5 : 1) * (S.mod === "fast" ? 1.3 : 1) * (ab(6) ? 1.1 : 1) * (wk("rush") ? 1.3 : 1) * (e.under ? e.d.burrow.speed : 1) * slowAura(e) * hazSlow(e);
const corrodeK = e => (e.corrode && e.corrode.t > 0 ? e.corrode.k : 0);
const eDef = e => (e.d.def + (S.mod === "tough" ? 150 : 0)) * (ab(19) ? 1.2 : 1) * (1 - corrodeK(e)) * (1 - 0.15 * cl("pierce")) * (syn("inferno") && e.burn > 0 ? 0.8 : 1);
const corrodeOf = u => (br(u, "alchemist", "A") ? 0.55 : u.lv >= 3 ? 0.4 : 0.25) + (u.hero ? 0.1 * sg("sg_al1") : 0);
const maxAllies = () => RULES.maxAllies + 2 * cl("lg_army");
const reviveT = () => cl("lg_phoenix") ? 3 : RULES.revive * (1 - 0.06 * dk("rally")) * (1 - 0.25 * cl("revive")) * (ab(15) ? 1.5 : 1);
// 关卡强度在前 6 波内逐渐拉满，避免后期关卡一开局就压死人
const stageHp = () => 1 + (ST.hp - 1) * Math.min(1, (S.wave || 1) / 6);
// 技能威力跟着关卡强度走，但增长比敌人血量慢一点：长局里要靠角色本身的输出
const powerK = () => Math.pow(stageHp() * S.waveHp * S.diffK.hp, 0.75);
function calc(atk, type, def, res) {
  return type === "magic" ? Math.max(atk * (1 - res / 100), atk * 0.05) : Math.max(atk - def, atk * 0.05);
}
function burnEnemy(e, dps, t, src) {
  if (e.dead) return;
  e.burn = Math.max(e.burn || 0, t); e.burnDps = Math.max(e.burnDps || 0, dps * (syn("inferno") ? 1.5 : 1)); e.burnSrc = src || null; e.burnAcc = e.burnAcc || 0;
}
function markEnemy(e, t) { if (!e.dead) e.mark = Math.max(e.mark || 0, t); }
function applyCorrode(e, k, t, src) {
  const c = e.corrode;
  if (!c || c.t <= 0 || k > c.k) e.corrode = { k, t, src };
  else { c.t = Math.max(c.t, t); if (k === c.k) c.src = src; }
}
function knock(e, amt) {
  if (e.dead || e.d.unstoppable || isBoss(e) || e.d.flying) return;
  const d = Math.max(0.01, toCrystal(e));
  const nx = e.x + (e.x - CRYSTAL.x) / d * amt, ny = e.y + (e.y - CRYSTAL.y) / d * amt;
  if (!solid(nx, ny)) { e.x = nx; e.y = ny; }
  e.target = null; e.kb = 1.6; e.pend = 0;
}

// ---------- 统计 ----------
const statKey = src => (src && src.summon ? src.owner.def.id : src && src.def ? src.def.id : src && src.key) || null;
const statName = k => { const u = UNITS.find(x => x.id === k), c = typeof ANY_CARD === "function" ? ANY_CARD(k) : null;
  return u ? u.name : c ? c.name : ({ meteor: "陨星术", heal: "圣愈之光", ult: "晨星爆发", boom: "殉爆", thorn: "荆棘", haz: "场地机关", burn: "灼烧" })[k] || k || ""; };
function addStat(src, k, v) {
  const key = statKey(src); if (!key || !(v > 0)) return;
  const s = S.stats[key] || (S.stats[key] = { dmg: 0, heal: 0, kills: 0, taken: 0 });
  s[k] += v;
}

// ---------- 开局 ----------
let S;
function newRun(stage, opts) {
  opts = opts || {};
  const seedN = opts.daily ? opts.daily.seed : (opts.seed || (Math.random() * 1e9) | 0);
  const gen = opts.vigil || opts.genMap ? genStage(stage, seedN, opts) : opts.exped ? { ...STAGES[stage], waves: opts.exped.waves } : null;   // 远征：同一张图，波数缩短
  loadStage(stage, gen);
  const perks = opts.perks || [], daily = opts.daily || null, abyss = Math.max(0, Math.min(ABYSS_MAX, opts.abyss || 0)), week = opts.week || null;
  // 难度 × 深渊层数 × 每周规则 合成一个敌人强度系数
  const d0 = DIFFS[opts.diff || 0], ak = abyssK(abyss);
  const diffK = { ...d0, hp: d0.hp * ak.hp, atk: d0.atk * ak.atk, elite: d0.elite + ak.elite };
  if (opts.exped) { diffK.hp *= opts.exped.hpK || 1; diffK.atk *= opts.exped.atkK || 1; diffK.elite += opts.exped.elite || 0; }
  if (week && week.rules.includes("giants")) diffK.hp *= 1.7;
  if (week && week.rules.includes("swarm")) diffK.hp *= 0.65;
  if (week && week.rules.includes("elite")) diffK.elite += 0.25;
  const disk = opts.disk || {}, dkk = id => disk[id] || 0;
  const heroDef = UNITS.find(u => u.id === (opts.hero || "knight")) || UNITS[0];
  S = {
    stage, disk, abyss, week, relics: [], phoenixUsed: false, endless: !!opts.endless, vigil: !!opts.vigil, gen: !!gen, seed: seedN, daily, mod: daily ? daily.mod : null, diff: opts.diff || 0, diffK, perks, charLv: opts.charLv || {}, charAwk: opts.charAwk || {}, charTal: opts.charTal || {},
    charOpen: (opts.charOpen || UNITS.map(u => u.id)).filter(id => !week || weekAllows(UNITS.find(u => u.id === id) || {}, week.rules)),
    rng: daily ? seeded(daily.seed) : week ? seeded(week.seed) : Math.random,
    rngs: makeRngs(daily ? daily.seed : week ? week.seed : 0),
    heroId: heroDef.id, t: 0, units: [], enemies: [], shots: [], fx: [], meteors: [], pools: [], blades: [], zones: [],
    crystal: { hp: 0, maxHp: 0, hitT: 0 },
    wave: 0, waveClock: 0, nextWaveIn: RULES.firstWave, spawnQueue: [], waveHp: 1, genWaves: [],
    level: 1, xp: 0, xpNeed: xpNeedOf(1), pending: 0, offer: null, cards: {}, allies: 0, picks: [],
    skillCd: {}, spells: Object.fromEntries(SPELLS.map(s => [s.id, s.first * (1 - 0.05 * dkk("arcane"))])),
    uid: 1, kills: 0, leaked: 0, stats: {}, foeKill: {}, afxSeen: [], events: [], boss: null, spawned: {},
    star: 0, ultPending: 0, ultKills: 0, combo: 0, comboT: 0, comboBest: 0, usedSpell: false, usedUlt: false,
    speed: 1, paused: false, over: null, stars: 0, selUnit: null, selSpell: null, spellMode: null, hover: null, shake: 0, slowmo: 0, slowCd: 0, hitFlash: 0,
    dust: SHOP.start + 10 * dkk("merchant"), rerolls: Math.max(0, REROLLS + dkk("reroll") - (abyss >= 12 ? 2 : 0)),
    shop: null, shopDone: 0, shopWave: 0, syn: {}, synN: 0, chest: 0, haz: [], gate: null, legends: 0, curses: {},
    cine: null, cineWave: -1, breaks: 0, ultsFired: 0, log: [], t0: Date.now(), maxHit: 0, bestSyn: 0,
    formIdx: opts.formIdx == null ? 1 : opts.formIdx, drag: null, autoWave: opts.autoWave !== false, earlyCalls: 0,
    exped: opts.exped ? { node: opts.exped.node, floor: opts.exped.floor } : null, waveScale: opts.exped ? STAGES[stage].waves / opts.exped.waves : 0,
    event: null, eventWave: -1, eventsDone: [], buff: {}, nextWaveK: 1, slowWaves: 0, weakWaves: 0, hazK: 1, hazSlow: false, ultK: 1, forceRare: 0, riftDust: 0,
  };
  if (week && week.rules.includes("nospell")) S.mod = "noSpell";
  initHaz(ST.haz);
  genWaves();
  S.crystal.maxHp = Math.round(ST.crystalHp * (1 + 0.06 * dk("walls")) * (S.mod === "rich" ? 0.5 : 1) * (ab(10) ? 0.8 : 1));
  S.xpNeed = xpNeedOf(1);
  S.crystal.hp = S.crystal.maxHp;
  addUnit(heroDef, true);
  if (opts.exped && opts.exped.snap) { expRestore(opts.exped.snap, opts.exped.flips); return; }   // 远征第 2 场起：接着上一场的队伍打
  for (let i = 0; i < dk("supply"); i++) { const c = randomCards(1)[0]; if (c) pickCard(c.id, true); }
  if (wk("relics")) for (let i = 0; i < 3; i++) gainRelic(null, true);
  if (wk("cursed")) for (let i = 0; i < 2; i++) { const cp = cursePool(); if (cp.length) pickCard(cp[Math.floor(roll("card") * cp.length)].id, true); }
  S.pending = Math.max(0, 1 + dk("prep") - (ab(5) ? 1 : 0));   // 开局先翻一张牌（深渊 5 层起少一张）
}
const xpNeedOf = lv => Math.round((12 + 4 * lv + 0.25 * lv * lv) * (S && S.abyss >= 11 ? 1.15 : 1));   // 10.1：升级明显变慢，翻牌次数大约少三分之一
const totalWaves = () => (S.endless ? Infinity : ST.waves);

// ---------- 角色 ----------
function addUnit(def, isHero) {
  const u = {
    id: S.uid++, def, hero: !!isHero, x: CRYSTAL.x, y: CRYSTAL.y + 0.6, tx: CRYSTAL.x, ty: CRYSTAL.y, lv: 1, branch: null, slot: null,
    hp: 1, maxHp: 1, sp: 0, skillT: 0, atkCd: 0.5, atkT: 9, hitT: 0, age: 0, down: 0, dead: false, face: 1, kb: 0, stop: 0, pend: null, poison: null, auto: true,
  };
  u.maxHp = uMaxHp(u); u.hp = u.maxHp;
  u.sp = def.sp * ((clv(def.id) >= PROG.spLv ? 0.5 : 0) + (tal(u, "t_focus") ? 0.3 : 0));
  S.units.push(u);
  if (!isHero && !u.summon) S.allies++;
  arrange();
  u.x = u.tx; u.y = u.ty;
  addFx({ kind: "pillar", x: u.x, y: u.y, color: def.color, life: 0.7 });
  burst(u.x, u.y + 0.2, "#e9dcc0", 12, 1.8, 0.5, 0.06);
  return u;
}
const formOf = () => FORMS[Math.min(FORMS.length - 1, Math.max(0, S.formIdx || 0))] || FORMS[1];
function arrange() {
  const F = formOf();
  const front = S.units.filter(u => u.def.place === "ground" && !u.summon && !u.slot), back = S.units.filter(u => u.def.place === "high" && !u.slot);
  ringSlots(front, F.front, -Math.PI / 2); ringSlots(back, F.back, Math.PI / 2);
  for (const u of S.units) if (u.slot) placeSlot(u);
}
// 玩家手动拖过的角色：按自己的角度和半径站
function placeSlot(u) {
  let a = u.slot.a, r = u.slot.r, x = 0, y = 0;
  for (let k = 0; k < 16; k++) {
    x = CRYSTAL.x + Math.cos(a) * r; y = CRYSTAL.y + Math.sin(a) * r;
    if (!solid(x, y) && x > 0.6 && x < COLS - 1.6 && y > 0.6 && y < ROWS - 1.6) break;
    a += 0.3;
  }
  u.tx = x; u.ty = y;
}
function setSlot(u, x, y) {
  const dx = x - CRYSTAL.x, dy = y - CRYSTAL.y;
  const r = Math.max(1.1, Math.min(4.3, Math.hypot(dx, dy)));
  u.slot = { a: Math.atan2(dy, dx), r };
  placeSlot(u);
  addFx({ kind: "ring", x: u.tx, y: u.ty, color: u.def.color, life: 0.5, r0: 0.1, r1: 0.9 });
}
function clearSlot(u) { u.slot = null; arrange(); }
function ringSlots(list, r, ph) {
  // 人少的时候往里收一点（保持和以前一样的手感），但阵型的差别还是留着
  const n = Math.max(1, list.length), rr = (n <= 2 ? r * 0.83 : r) + Math.max(0, n - 4) * 0.22;
  list.forEach((u, i) => {
    let a = ph + (i / n) * Math.PI * 2, x = 0, y = 0;
    for (let k = 0; k < 16; k++) {
      x = CRYSTAL.x + Math.cos(a) * rr; y = CRYSTAL.y + Math.sin(a) * rr;
      if (!solid(x, y) && x > 0.6 && x < COLS - 1.6 && y > 0.6 && y < ROWS - 1.6) break;
      a += 0.3;
    }
    u.tx = x; u.ty = y;
  });
}
function knockOut(u) {
  // 专属卡「永不倒下」：每人每局能免一次
  if (!u.summon && !u.savedOnce && sg("sg_ma2") && S.units.some(p => p.hero && p.def.id === "marshal" && !p.dead)) {
    u.savedOnce = true; u.hp = u.maxHp * 0.4; u.hitT = 0.2;
    addFx({ kind: "pillar", x: u.x, y: u.y, color: "#ffe060", life: 0.9 });
    addFx({ kind: "text", x: u.x, y: u.y - 0.8, text: "永不倒下", color: "#ffe060", life: 1.3, big: true });
    return;
  }
  if (u.down > 0 || u.dead) return;
  if (u.summon) { u.dead = true; S.units = S.units.filter(x => x !== u); burst(u.x, u.y, "#9ab0c8", 18, 2.2, 0.7, 0.07); arrange(); return; }
  u.down = reviveT(); u.hp = 0; u.pend = null;
  for (const e of S.enemies) if (e.target === u) e.target = null;
  addFx({ kind: "ucorpse", def: u.def, lv: u.lv, branch: u.branch, x: u.x, y: u.y, face: u.face, life: 0.9 });
  burst(u.x, u.y, "#ff9a8f", 14, 2.4, 0.6, 0.06);
  addFx({ kind: "text", x: u.x, y: u.y - 0.5, text: u.def.name + " 倒下", color: "#e2645a", life: 1.2, big: true });
}
function reviveUnit(u) {
  u.down = 0; u.hp = Math.round(u.maxHp * 0.5); u.atkCd = 0.4; u.age = 0;
  addFx({ kind: "pillar", x: u.x, y: u.y, color: "#7ee89c", life: 0.7 });
  addFx({ kind: "text", x: u.x, y: u.y - 0.5, text: "归队！", color: "#7ee89c", life: 1, big: true });
}

// ---------- 经验和翻牌 ----------
function gainXp(n) {
  if (S.over) return;
  const k = (1 + 0.2 * cl("xp") + 0.6 * cu("cu_whisper")) * (1 + 0.04 * dk("bounty")) * (rl("rl_ring") ? 1.25 : 1) * (wk("rush") ? 1.3 : 1) * (S.mod === "rich" ? 1.5 : 1) * (cl("lg_greed") ? 2 : 1);
  S.xp += n * k;
  while (S.xp >= S.xpNeed) { S.xp -= S.xpNeed; S.level++; if (rl("rl_glasses")) S.rerolls++; S.xpNeed = xpNeedOf(S.level); S.pending++; if (S.level === 20) S.events.push({ type: "achv", id: "lv20" }); }
}
const rareW = r => RARE_W(S.level).map((v, i) => v * (i ? 1 + 0.08 * dk("lucky") : 1))[r] || 1;
function cardPool(minRare) {
  const out = [];
  for (const c of CARDS) {
    if (c.filler || cl(c.id) >= c.max) continue;
    if (minRare && (c.rare || 0) < minRare) continue;
    if (c.id === "lg_army" && S.mod === "solo") continue;
    if (c.evo) { if (cl(c.evo) >= CARD_BY[c.evo].max) out.push({ id: c.id, w: c.w, card: c, rare: 2 }); continue; }   // 进化卡权重固定，不随稀有度打折
    out.push({ id: c.id, w: c.w * rareW(c.rare || 0) / 100, card: c, rare: c.rare || 0 });
  }
  // 英雄专属卡：只有本局英雄的那几张会进牌堆，权重更高
  for (const c of SIG) {
    if (c.hero !== S.heroId || cl(c.id) >= c.max) continue;
    if (minRare && (c.rare || 0) < minRare) continue;
    out.push({ id: c.id, w: c.w * rareW(c.rare || 0) / 100 * 1.6, card: c, rare: c.rare || 0, sig: true });
  }
  if (S.mod !== "solo") for (const D of UNITS) {
    if (!S.charOpen.includes(D.id)) continue;
    const u = S.units.find(x => x.def === D);
    if (!u) { if (S.allies < maxAllies() && !(minRare > 1)) out.push({ id: "ally_" + D.id, w: 9 * rareW(1) / 100, def: D, join: true, rare: 1 }); continue; }
    if (u.lv < 3) { if (!minRare) out.push({ id: "ally_" + D.id, w: 7, def: D, unit: u, rare: 0 }); }
    else if (u.lv === 3) { out.push({ id: "br_" + D.id + "_A", w: 5 * rareW(2) / 100, def: D, unit: u, branch: "A", rare: 2 }); out.push({ id: "br_" + D.id + "_B", w: 5 * rareW(2) / 100, def: D, unit: u, branch: "B", rare: 2 }); }
  }
  // 牌堆快见底了：补上可以无限叠加的补充卡，永远有牌可翻
  if (!minRare && out.length < 6) for (const c of CARDS) if (c.filler) out.push({ id: c.id, w: c.w, card: c, rare: 0 });
  return out;
}
function cursePool() {
  return CURSES.filter(c => cu(c.id) < c.max && !(c.id === "cu_pact" && S.allies < 2)).map(c => ({ id: c.id, w: c.w, curse: c, rare: 3 }));
}
function randomCards(n, minRare) {
  let pool = cardPool(minRare);
  if (!pool.length && minRare) pool = cardPool();
  const out = [];
  // 前两次翻牌保证至少有一张伙伴卡
  // 补短板：没有前排先给前排，打不到飞行先给能打飞行的，队伍太少先给伙伴
  const solo = S.mod === "solo";
  const hasFront = S.units.some(u => !u.dead && u.def.place === "ground");
  const airN = S.units.filter(u => !u.dead && u.def.air).length;
  const stageAir = !S.endless && ST.pool.concat(ST.boss || []).some(p => ENEMIES[p[0]] && ENEMIES[p[0]].flying);
  const needAir = airN < 2 && (stageAir || S.enemies.some(e => e.d.flying));
  const want = minRare || solo ? null : !hasFront ? (p => p.join && p.def.place === "ground") : needAir ? (p => p.join && p.def.air) : (S.allies < 2 && S.level <= 6 ? (p => p.join) : null);
  for (let i = 0; i < n && pool.length; i++) {
    let list = pool;
    if (i === 0 && want) { const a = pool.filter(want); if (a.length) list = a; }
    let total = list.reduce((s, p) => s + p.w, 0), r = roll("card") * total, pick = list[list.length - 1];
    for (const p of list) { r -= p.w; if (r <= 0) { pick = p; break; } }
    out.push(pick);
    const k = pool.indexOf(pick); if (k >= 0) pool.splice(k, 1);
    // 同一个角色的两张转职卡只留一张
    if (pick.branch) for (let j = pool.length - 1; j >= 0; j--) if (pool[j].def === pick.def) pool.splice(j, 1);
  }
  // 恶魔交易：有几率额外加一张诅咒卡，作为独立的第 4 个选项（原本 3 张普通卡不变）
  if (!minRare && S.level >= 5 && out.length === 3 && roll("card") < curseChance()) {
    const cp = cursePool();
    if (cp.length) out.push(cp[Math.floor(roll("card") * cp.length)]);
  }
  return out;
}
function cardInfo(p) {
  if (p.curse) return { kind: "curse", name: "诅咒 · " + p.curse.name, desc: `${p.curse.good}　　代价：${p.curse.bad}`, icon: p.id, color: CURSE_COLOR, curse: true };
  if (p.card) { const lv = cl(p.id) + 1; return { kind: p.card.kind, name: (p.sig ? "专属 · " : "") + p.card.name + (lv > 1 ? ` Lv${lv}` : ""), desc: p.card.desc(lv), icon: p.id, color: p.sig ? "#ffd860" : KIND_COLOR[p.card.kind], sig: p.sig }; }
  if (p.branch) { const b = p.def.branches[p.branch === "A" ? 0 : 1]; return { kind: "ally", name: p.def.name + " · 转职 · " + b.name, desc: b.desc, unit: p.def, color: p.branch === "A" ? "#8ac8ff" : "#ff8a7a" }; }
  if (p.join) return { kind: "ally", name: p.def.name + " 加入", desc: `${p.def.cls} · ${p.def.note}`, unit: p.def, color: p.def.color };
  const lv = p.unit.lv + 1;
  return { kind: "ally", name: `${p.def.name} 升到 ${lv} 阶`, desc: lv === 3 ? `属性提升，解锁特性：${p.def.trait}` : `属性提升（生命 +40%，攻击 +35%）`, unit: p.def, color: p.def.color };
}
function pickCard(id, silent) {
  const pool = cardPool(), p = pool.find(x => x.id === id) || (S.offer || []).find(x => x.id === id) || cursePool().find(x => x.id === id);
  if (!p) return false;
  if (p.curse) {
    S.curses[p.id] = cu(p.id) + 1;
    takeCurse(p.id);
    S.picks.push(id);
    addFx({ kind: "banner", text: "诅咒 · " + p.curse.name, life: 2, danger: true });
    addFx({ kind: "flash", life: 0.5, color: "#e0486a" });
    S.shake = 0.5;
    updateSyn();
    if (!silent) { S.offer = null; S.pending = Math.max(0, S.pending - 1); }
    return true;
  }
  if (p.card) {
    S.cards[p.id] = cl(p.id) + 1;
    if (p.id === "hp") for (const u of S.units) { u.maxHp = uMaxHp(u); u.hp = u.maxHp; }
    if (p.id === "shield") { S.crystal.maxHp = Math.round(S.crystal.maxHp * 1.2); S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * 0.2); }
    if (p.id === "sk_blade") buildBlades();
    if (p.id === "fl_atk") for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(u.maxHp * f); }
    if (p.id === "fl_crystal") S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * 0.2);
    if (p.id === "fl_dust") { S.dust += 60; S.rerolls++; }
    if (p.id === "sg_su2" || p.id === "sg_su1") { const h = S.units.find(u => u.hero); if (h && h.def.id === "summoner") summonGolem(h); }
    if (p.sig) for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(u.maxHp * Math.min(1, f + 0.05)); }
    if (p.id === "lg_aegis") { S.crystal.maxHp = Math.round(S.crystal.maxHp * 1.4); S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * 0.3); }
    if (p.id === "lg_avatar" || p.id === "lg_army") for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(u.maxHp * Math.min(1, f + 0.2)); }
    if (p.id === "lg_army") for (const u of [...S.units]) if (!u.hero && !u.summon && u.lv < 3) { u.lv++; const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(u.maxHp * Math.min(1, f + 0.25)); addFx({ kind: "pillar", x: u.x, y: u.y, color: "#ffd860", life: 0.8 }); }
    if (p.card.evo) { addFx({ kind: "banner", text: "进化 · " + p.card.name, life: 2 }); addFx({ kind: "flash", life: 0.4, color: "#ffe080" }); S.shake = Math.max(S.shake, 0.5); if (p.id === "ev_blade") buildBlades(); }
    else if ((p.card.rare || 0) === 2) { S.legends++; if (S.legends >= 3) S.events.push({ type: "achv", id: "legend" }); addFx({ kind: "banner", text: "传说 · " + p.card.name, life: 1.8 }); }
  } else if (p.join) {
    addUnit(p.def);
    if (S.allies >= maxAllies()) S.events.push({ type: "achv", id: "allies" });
  } else {
    const u = p.unit;
    u.lv++; if (p.branch) u.branch = p.branch;
    const frac = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(Math.min(u.maxHp, (frac + 0.25) * u.maxHp));
    const col = u.lv === 4 ? (u.branch === "A" ? "#6ab4ff" : "#ff6a5a") : "#ffd860";
    addFx({ kind: "pillar", x: u.x, y: u.y, color: col, life: 0.9 });
    addFx({ kind: "text", x: u.x, y: u.y - 0.7, text: u.lv === 4 ? "转职 · " + u.def.branches[u.branch === "A" ? 0 : 1].name : u.lv + " 阶", color: col, life: 1.3, big: true });
    burst(u.x, u.y, col, u.lv === 4 ? 28 : 16, 2.4, 0.8, 0.07);
    if (u.lv === 4 && S.units.filter(x => x.lv >= 4).length >= 3) S.events.push({ type: "achv", id: "branch3" });
  }
  S.picks.push(id);
  if (p.branch) S.legends++;
  updateSyn();
  if (!silent) { S.offer = null; S.pending = Math.max(0, S.pending - 1); }
  return true;
}
function rerollOffer() {
  if (!S.offer || S.rerolls <= 0 || S.over) return false;
  S.rerolls--; S.rerollsUsed = (S.rerollsUsed || 0) + 1; S.offer = randomCards(3, S.offerRare || 0);
  return true;
}
function openOffer(minRare, noCharge) {
  if (S.offer || S.over) return;
  if (!minRare && S.pending <= 0) return;
  S.offerRare = minRare || 0;
  S.offer = randomCards(3, minRare);
  if (!S.offer.length) { S.pending = 0; S.offer = null; return; }
  if (minRare && !noCharge) S.pending++;
}

// ---------- 关卡生成（守望之战 / 随机地图） ----------
function genStage(stage, seed, opts) {
  const R = seeded(seed), base = STAGES[Math.min(STAGES.length - 1, stage)], vig0 = !!opts.vigil;
  const g = genMap(R, opts.theme || (vig0 ? GEN_THEMES[Math.floor(R() * GEN_THEMES.length)] : base.theme));
  const vig = vig0;
  const pool = [];
  const unlocked = STAGES.filter((_, i) => i <= stage);
  for (const st of unlocked) for (const p of st.pool) if (!pool.some(q => q[0] === p[0])) pool.push([p[0], p[1], Math.max(1, Math.round(p[2] * (vig ? 1.4 : 1)))]);
  return {
    name: vig ? "守望之战 · " + THEME_NAME[g.theme] : base.name + " · 变形",
    theme: g.theme, chapter: base.chapter, brief: vig ? "长夜守望：越往后敌人越强，中途有首领和补给。" : base.brief,
    hp: vig ? 1.7 + stage * 0.07 : base.hp, crystalHp: vig ? VIGIL.crystalHp : base.crystalHp,
    waves: vig ? VIGIL.waves : base.waves, budget: vig ? VIGIL.budget : base.budget,
    pool, boss: base.boss, map: g.map, haz: g.haz, generated: true,
  };
}
const THEME_NAME = { forest: "翠林", snow: "霜雪", lava: "熔岩", grave: "幽影", desert: "黄沙", sky: "浮空", cave: "晶洞", abyss: "深渊", ice: "冰封", mech: "机械", blood: "血月", star: "星界", ash: "灰烬", ruin: "碑墓", storm: "雷暴", dawn: "晨光" };
const VIGIL_BOSS = ["boss", "sovereign", "devourer"];

// ---------- 波次 ----------
function genWaves() {
  const all = [];
  const total = S.endless ? 20 : ST.waves;
  for (let w = 1; w <= total; w++) all.push(genWave(w, total));
  S.genWaves = all;
}
// 单独生成一波；无尽模式打到哪生成到哪，不会再出现"空波"
function genWave(w, total) {
  const R = S.rng;
  {
    const out = [], last = !S.endless && w === total, wE = S.waveScale ? Math.max(1, Math.round(w * S.waveScale)) : w;   // 远征波数缩短：按原关卡的进度出怪
    const pool = ST.pool.filter(p => wE >= p[2]);
    let budget = (2.5 + wE * 1.8) * ST.budget * (S.endless ? 1 + w * 0.05 : 1) * (S.vigil ? 1 + w * 0.075 : 1) * (wk("giants") ? 0.7 : 1) * (wk("swarm") ? 1.6 : 1);
    // 特殊波次：潮汐（数量多）/ 精英（少而强）
    let tag = "";
    if (!last && w >= 4 && !S.vigil && w % 5 === 0) { tag = "tide"; budget *= 1.5; }
    if (S.vigil && w % 6 === 3) { tag = "tide"; budget *= 1.45; }
    if (S.vigil && w % 6 === 0 && w > 3) tag = "elite";
    if (last) { for (const [type, n, elite] of ST.boss) out.push([type, n, 1.2, Math.floor(R() * PORTALS.length), elite]); budget *= 0.4; }
    if (S.vigil && VIGIL.bossAt.includes(w) && !last) { const b = VIGIL_BOSS[VIGIL.bossAt.indexOf(w) % VIGIL_BOSS.length]; out.push([b, 1, 2, Math.floor(R() * PORTALS.length), false]); budget *= 0.55; }
    if (ST.midBoss && (S.endless ? w % 15 === 9 : w === Math.round(total * 0.6))) for (const [type, n, elite] of ST.midBoss) out.push([type, n, 1.5, Math.floor(R() * PORTALS.length), elite]);
    if (S.endless && w % 10 === 0) out.push([w % 30 === 0 ? "sovereign" : "boss", 1, 2, Math.floor(R() * PORTALS.length), false]);
    const groups = new Map();
    let guard = 0;
    const cheap = tag === "tide" ? pool.filter(p => p[1] <= 2) : pool;
    const src = cheap.length ? cheap : pool;
    while (budget > 0.6 && src.length && guard++ < 70) {
      const p = src[Math.floor(R() * src.length)];
      groups.set(p[0], (groups.get(p[0]) || 0) + 1); budget -= p[1];
    }
    for (const [type, n] of groups) {
      const elite = tag === "elite" ? type !== "skeleton" : R() < (S.diffK.elite + (S.mod === "elite" ? 0.1 : 0) + w * (S.vigil ? 0.012 : 0.004)) && type !== "skeleton";
      const gap = Math.max(0.25, (tag === "tide" ? 0.7 : 1.1) - w * 0.03);
      out.push([type, n, gap, Math.floor(R() * PORTALS.length), elite]);
    }
    // 深渊 14 层：每波多两只精英
    if (ab(14) && pool.length) { const p = pool[Math.floor(R() * pool.length)]; if (p[0] !== "skeleton") out.push([p[0], 2, 1.2, Math.floor(R() * PORTALS.length), true]); }
    // 宝箱怪：从第 3 波起有几率出现
    if (w >= 3 && !last && R() < (S.vigil ? 0.45 : 0.3)) out.push(["treasure", 1, 1, Math.floor(R() * PORTALS.length), false]);
    out.tag = tag;
    return out;
  }
}
function startWave(append) {
  if (S.endless) while (S.genWaves.length <= S.wave) S.genWaves.push(genWave(S.genWaves.length + 1, Infinity));
  const q = []; let at = append ? S.waveClock + 1.2 : 0;
  for (const [type, count, gap, portal, elite] of S.genWaves[S.wave] || []) {
    for (let i = 0; i < count; i++) { q.push({ type, at, portal: portal % Math.max(1, PORTALS.length), elite: !!elite }); at += gap; }
    at += 0.4;
  }
  const wv = S.genWaves[S.wave] || [];
  if (cu("cu_sand")) { const extra = 3 * cu("cu_sand"), pool = ST.pool.filter(p => S.wave + 1 >= p[2]); for (let i = 0; i < extra && pool.length; i++) { const p = pool[Math.floor(roll("spawn") * pool.length)]; q.push({ type: p[0], at: at + i * 0.5, portal: Math.floor(roll("spawn") * Math.max(1, PORTALS.length)), elite: false }); } }
  if (append) S.spawnQueue = S.spawnQueue.concat(q).sort((a, b) => a.at - b.at);
  else { S.spawnQueue = q; S.waveClock = 0; }
  S.wave++;
  S.waveK = S.nextWaveK || 1; S.nextWaveK = S.nextWaveK2 || 1; S.nextWaveK2 = 1;
  if (S.slowWaves > 0) S.slowWaves--;
  if (S.weakWaves > 0) S.weakWaves--;
  if (rl("rl_beads")) for (const u of S.units) { if (u.down > 0) reviveUnit(u); heal(u, u.maxHp * 0.25, true, null); }
  S.log.push({ w: S.wave, hp: S.crystal.maxHp ? S.crystal.hp / S.crystal.maxHp : 1, kills: S.kills, lv: S.level, units: S.units.filter(u => !u.summon).length });
  S.waveHp = S.vigil ? Math.pow(1 + VIGIL.hpStep, S.wave - 1) : 1 + 0.095 * (S.wave - 1) + (S.endless ? 0.004 * (S.wave - 1) ** 2 : 0);
  // 每波结束前的收尾：永恒壁垒回血、守望之战补给、商店
  if (cl("lg_aegis") && S.wave > 1) { S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * 0.08 * cl("lg_aegis")); addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: "#62b4ff", life: 0.8 }); }
  if (dk("ks_eco") && S.wave > 1 && (S.wave - 1) % 5 === 0) { S.pending++; S.dust += 30; addFx({ kind: "banner", text: "点金 · 多翻一张牌 · 星尘 +30", life: 1.8 }); }
  if (S.vigil && VIGIL.supplyAt.includes(S.wave)) { S.pending++; addFx({ kind: "banner", text: "补给到了 · 多翻一张牌", life: 1.8 }); }
  const isBossW = q.some(x => ENEMIES[x.type] && (isBossType(x.type) || x.elite));
  const tagTxt = wv.tag === "tide" ? " · 潮汐" : wv.tag === "elite" ? " · 精英波" : "";
  const head = S.endless ? `无尽 · 第 ${S.wave} 波` : S.vigil ? `守望 · 第 ${S.wave}/${ST.waves} 波` : `第 ${S.wave}/${ST.waves} 波`;
  addFx({ kind: "banner", text: head + (S.wave === ST.waves && !S.endless ? " · 最终波" : tagTxt || (isBossW ? " · 强敌" : "")), life: 1.8, danger: isBossW });
}
// 立即出击：场上还有怪、甚至还在出怪时也能叫下一波（叠波），越冒险星尘奖励越多
function canCallWave() { return !S.over && S.wave < totalWaves() && !S.offer && !S.shop && !S.event && !S.cine && S.spawnQueue.length <= 30; }
function callWaveEarly() {
  if (!canCallWave()) return false;
  const live = S.enemies.filter(e => !e.dead).length + S.spawnQueue.length;
  const bonus = Math.round((live ? 3 + live * 0.6 : 2) * (1 + S.wave * 0.06) * (S.spawnQueue.length ? 1.5 : 1) * (rl("rl_key") ? 2 : 1));
  if (rl("rl_key") && S.spawnQueue.length) gainXp(6 + S.wave);
  S.dust += bonus; S.earlyCalls = (S.earlyCalls || 0) + 1;
  addFx({ kind: "text", x: CRYSTAL.x, y: CRYSTAL.y - 1.3, text: "提前出击 +" + bonus + " 星尘", color: "#ffd860", life: 1.3, big: true });
  if (S.spawnQueue.length) startWave(true);   // 叠波：直接接在当前队列后面
  else S.nextWaveIn = 0;                       // 交给主循环（事件、商店照常结算）
  return true;
}
function toggleAutoWave() {
  S.autoWave = !S.autoWave;
  if (S.autoWave && !S.spawnQueue.length) S.nextWaveIn = Math.min(S.nextWaveIn, RULES.waveGap);
  return S.autoWave;
}
// 下一波的「性质」：boss（有首领）/ elite（有精英）/ tide（潮汐）/ 普通，以及每个传送门要出什么
function nextWaveInfo() {
  const w = S.genWaves[S.wave]; if (!w) return null;
  const ports = new Map(); let boss = false, elite = false;
  for (const [type, n, , portal, el] of w) {
    const i = portal % Math.max(1, PORTALS.length), m = ports.get(i) || new Map();
    m.set(type, (m.get(type) || 0) + n); ports.set(i, m);
    if (isBossType(type)) boss = true; if (el) elite = true;
  }
  return { ports, kind: boss ? "boss" : w.tag === "tide" ? "tide" : elite || w.tag === "elite" ? "elite" : "" };
}
function nextWaveSummary() {
  const w = S.genWaves[S.wave]; if (!w) return [];
  const m = new Map();
  for (const [type, n, , , elite] of w) { const k = type + (elite ? "*" : ""); m.set(k, (m.get(k) || 0) + n); }
  return [...m].map(([k, n]) => ({ type: k.replace("*", ""), elite: k.endsWith("*"), n }));
}
function spawnAt(type, x, y, elite, summoned) {
  const d = ENEMIES[type], hpK = S.waveHp * (S.waveK || 1), scale = stageHp() * hpK * S.diffK.hp * (1 + 0.12 * cu("cu_greed")) * (rl("rl_ring") ? 1.08 : 1) * (ab(18) && isBossType(type) ? 1.3 : 1);
  const hp = Math.round(d.hp * scale * (elite ? ELITE.hp : 1));
  const e = {
    id: S.uid++, type, d, elite: !!elite, summoned: !!summoned, hpK, hp, maxHp: hp, x, y, face: -1, hurtAt: S.t,
    shield: d.shield ? Math.round(d.shield * scale * (elite ? 1.5 : 1)) : 0, revealed: !d.stealth, under: false, bT: d.burrow ? d.burrow.up * (0.4 + roll("spawn") * 0.6) : 0, phase: 0,
    target: null, atkCd: d.interval * 0.5, slowT: 0, slowK: 0.6, freezeT: 0, stunT: 0, poison: null, corrode: null,
    aoeCd: d.aoe ? d.aoe.every * 0.6 : 0, healCd: d.heal ? d.heal.every * 0.5 : 0, summonCd: d.summon ? d.summon.every * 0.5 : 0,
    fuse: -1, hitT: 0, dead: false, atkT: 9, walk: Math.random() * 3, stop: 0, kb: 0, pend: 0, hitCd: 0,
  };
  e.maxShield = e.shield;
  S.enemies.push(e);
  rollAffix(e);
  S.events.push({ type: "seen", enemy: type });
  if (!S.spawned[type]) { S.spawned[type] = true; S.events.push({ type: "first", enemy: type }); }
  if (isBoss(e)) { S.boss = e; S.slowmo = 0.7; S.shake = 0.5; }
  if (cineWorthy(e)) { e.lead = true; if (!S.boss || S.boss.dead) S.boss = e; startCine(e); }
  else if (isBoss(e)) addFx({ kind: "banner", text: `${d.name} 降临`, life: 2.2, danger: true });
  return e;
}
function spawnPortal(type, portal, elite) {
  let idx = portal;
  if (S.gate && PORTALS.length > 1 && !portalOpen(idx)) { for (let k = 1; k <= PORTALS.length; k++) if (portalOpen((idx + k) % PORTALS.length)) { idx = (idx + k) % PORTALS.length; break; } }
  const p = PORTALS[idx] || PORTALS[0] || { x: 1, y: 1 };
  const jx = (roll("spawn") - 0.5) * 0.7, jy = (roll("spawn") - 0.5) * 0.7;
  return spawnAt(type, p.x + jx, p.y + jy, elite);
}
function spawnNear(type, o, elite, summoned) {
  const a = roll("spawn") * 6.283, r = 0.5 + roll("spawn") * 0.5;
  let x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
  if (solid(x, y)) { x = o.x; y = o.y; }
  return spawnAt(type, x, y, elite, summoned);
}

// ---------- 诅咒 ----------
function takeCurse(id) {
  if (id === "cu_brittle") { S.crystal.maxHp = Math.round(S.crystal.maxHp * 0.75); S.crystal.hp = Math.min(S.crystal.hp, S.crystal.maxHp); }
  if (id === "cu_frenzy") for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(u.maxHp * f); }
  if (id === "cu_pact") {
    S.dust += 120;
    const allies = S.units.filter(u => !u.hero && !u.summon);
    if (allies.length) {
      const v = allies[Math.floor(roll("card") * allies.length)];
      addFx({ kind: "text", x: v.x, y: v.y - 0.6, text: v.def.name + " 被献祭了", color: CURSE_COLOR, life: 1.8, big: true });
      burst(v.x, v.y, CURSE_COLOR, 26, 2.8, 0.8, 0.08);
      v.dead = true; S.units = S.units.filter(u => u !== v); S.allies = Math.max(0, S.allies - 1); arrange();
    }
    const two = randomCards(2, 1);
    for (const c of two) if (c && c.card) pickCard(c.id, true);
  }
}

// ---------- 波间商店 ----------
function shopCost(it) { return Math.round(it.cost * (1 - 0.04 * dk("merchant")) * (ab(7) ? 1.25 : 1) * (cu("cu_greed") ? 0.7 : 1) * (1 + S.shopDone * 0.12)); }
function openShop() {
  if (S.over || S.shop) return;
  const pool = SHOP.items.filter(it => !(it.id === "revive" && S.units.every(u => u.down <= 0 && u.hp >= u.maxHp)) && !(it.id === "ult" && S.star >= ULT.max));
  const out = [];
  const bag = pool.slice();
  while (out.length < 3 && bag.length) out.push(bag.splice(Math.floor(roll("shop") * bag.length), 1)[0]);
  S.shop = { items: out.map(it => ({ ...it, price: shopCost(it) })) };
}
function buyShop(id) {
  if (!S.shop) return false;
  const it = S.shop.items.find(x => x.id === id);
  if (!it || it.sold || S.dust < it.price) return false;
  S.dust -= it.price; it.sold = true; S.shopDone++;
  if (S.shopDone >= 5) S.events.push({ type: "achv", id: "shop" });
  if (it.id === "card") S.pending++;
  if (it.id === "rare") { S.shop = null; openOffer(1); return true; }
  if (it.id === "heal") { S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * 0.3); addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: "#62b4ff", life: 0.9 }); }
  if (it.id === "revive") for (const u of S.units) { if (u.down > 0) reviveUnit(u); u.hp = u.maxHp; addFx({ kind: "pillar", x: u.x, y: u.y, color: "#7ee89c", life: 0.7 }); }
  if (it.id === "reroll") S.rerolls += 2;
  if (it.id === "ult") S.star = ULT.max;
  return true;
}
function closeShop() { S.shop = null; S.nextWaveIn = Math.min(S.nextWaveIn, 3); }
