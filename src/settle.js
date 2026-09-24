
// ================= 结算：一局结束时写存档（星星、记录、成就、经验） =================
// 只做数据、不画界面；结算页 showResult(R) 按这里返回的结果来画。
// frame() 里的 checkOver 会调它；无头测试可以直接调 __td.settle()。同一局只结算一次。
const stageAchv = i => (STAGES[i] && STAGES[i].clearAchv) || [];
function settleRun() {
  if (!S || !S.over) return null;
  if (S.settled) return S.settled;
  const win = S.over === "win";
  const mode = S.exped ? "exped" : S.vigil ? "vigil" : S.daily ? "daily" : S.endless ? "endless" : S.week ? "week" : "main";
  const R = S.settled = { win, mode, reached: win && !S.endless ? ST.waves : Math.max(0, S.wave - 1) };
  recordRun(win);
  R.exp = awardExp(win);
  // 「通关某关 / 任意关卡」类成就和通关剧情只算主线；守望之战的 S.stage 是解锁到的最后一关，每周挑战是指定关卡，都不算真的打通了那一关
  if (mode === "exped") expSettle(R);
  checkBounties(R);
  if (win && mode === "main") {
    const full = S.crystal.hp >= S.crystal.maxHp;
    for (const id of stageAchv(S.stage)) unlockAchv(id);
    if (full) unlockAchv("perfect");
    if (S.allies === 0) unlockAchv("solo");
    if (S.diff === 1) unlockAchv("hard");
    if (S.diff === 2) unlockAchv("nightmare");
    const st = STORY[S.stage], key = "post" + S.stage;
    if (st && st.post && !loadSave().story.includes(key)) { editSave(d => { d.story.push(key); }); R.story = st.post; }
  }
  if (mode === "vigil") {
    const old = loadSave().vigil || {};
    R.best = Math.max(old.best || 0, R.reached); R.clear = !!old.clear || win;
    editSave(d => { d.vigil = { best: R.best, clear: R.clear, runs: (old.runs || 0) + 1 }; });
    if (R.reached >= 20) unlockAchv("vigil");
  } else if (mode === "daily") {
    // 今天的奖励按最好的一次算，之前拿过的部分不重复发
    const worth = win ? DAILY_STARS.win : R.reached >= Math.ceil(ST.waves / 2) ? DAILY_STARS.half : 0;
    editSave(d => { const r = d.daily[S.daily.date] || { wave: 0, cleared: false, got: 0 }; r.wave = Math.max(r.wave, R.reached); r.cleared = r.cleared || win;
      R.got = Math.max(0, worth - (r.got || 0)); r.got = Math.max(r.got || 0, worth); d.bonusStars += R.got; d.daily = { [S.daily.date]: r }; });   // 每日只留今天这一条
    if (win) unlockAchv("daily");
  } else if (mode === "endless") {
    const oldStars = endlessStars(loadSave(), S.stage);
    saveBest(S.stage, R.reached);
    if (R.reached >= 20) unlockAchv("endless20");
    const after = loadSave();
    R.got = endlessStars(after, S.stage) - oldStars; R.best = after.best[S.stage];
  } else if (mode === "week") {
    const key = S.week.key, old = loadSave().week[key] || {};
    R.first = win && !old.clear;
    editSave(d => { d.week[key] = { clear: !!old.clear || win, best: Math.max(old.best || 0, R.reached) }; if (win) d.bonusStars += 1; });   // 只改本周这一条：以前各周的首通都算在星星账本里
  } else if (win) {
    R.reward = runReward();
    if (S.diff === 0) saveStars(S.stage, S.stars);
    else editSave(d => { const a = d.diffClear[S.stage] || []; const id = DIFFS[S.diff].id; if (!a.includes(id)) { a.push(id); R.diffFirst = true; } d.diffClear[S.stage] = a; });
  }
  return R;
}

// ---------- 每日悬赏：按日期固定抽 3 条，每条 +3★，三条都完成再 +3★（哪种模式打的都算）----------
const BOUNTY_STARS = 3, BOUNTY_ALL = 3;
const mainWin = R => R.win && R.mode === "main";
const BOUNTY_TYPES = [
  { id: "hero", make: r => { const pool = openChars(), D = pool[Math.floor(r() * pool.length)] || UNITS[0]; return { key: "hero_" + D.id, text: `用「${D.name}」当英雄通关任意主线关卡`, ok: R => mainWin(R) && S.heroId === D.id }; } },
  { id: "elite", make: r => { const n = [6, 8, 10][Math.floor(r() * 3)]; return { key: "elite" + n, text: `一局里击败 ${n} 个精英或首领`, ok: () => (S.eliteKills || 0) >= n }; } },
  { id: "focus", make: () => ({ key: "focus", text: "一局里集火击杀 3 个敌人（点敌人就能集火）", ok: () => (S.focusKills || 0) >= 3 }) },
  { id: "combo", make: r => { const n = [30, 40, 50][Math.floor(r() * 3)]; return { key: "combo" + n, text: `一局里连杀达到 ${n}`, ok: () => S.comboBest >= n }; } },
  { id: "break", make: () => ({ key: "break", text: "一局里打断 2 次首领读条", ok: () => (S.breaks || 0) >= 2 }), need: 3 },
  { id: "syn", make: () => ({ key: "syn2", text: "一局里同时激活 2 个羁绊", ok: () => (S.bestSyn || 0) >= 2 }) },
  { id: "noreroll", make: () => ({ key: "noreroll", text: "一次都不重抽，通关任意关卡", ok: R => R.win && !S.rerollsUsed && R.mode !== "endless" }) },
  { id: "nospell", make: () => ({ key: "nospell", text: "不放陨星术和圣愈之光，通关任意关卡", ok: R => R.win && !S.usedSpell && R.mode !== "endless" }) },
  { id: "hard", make: () => ({ key: "hard", text: "在困难或噩梦难度通关任意主线关卡", ok: R => mainWin(R) && S.diff >= 1 }), need: 4 },
  { id: "legend", make: () => ({ key: "legend2", text: "一局里拿到 2 张传说卡", ok: () => S.legends >= 2 }) },
  { id: "evo", make: () => ({ key: "evo", text: "一局里拿到一张进化卡（技能卡升满级后出现）", ok: () => Object.keys(S.cards).some(id => id.startsWith("ev_")) }), need: 4 },
  { id: "lv", make: r => { const n = [14, 16][Math.floor(r() * 2)]; return { key: "lv" + n, text: `一局里升到 ${n} 级`, ok: () => S.level >= n }; } },
  { id: "daily", make: () => ({ key: "daily", text: "通关今天的每日挑战", ok: R => R.win && R.mode === "daily" }) },
  { id: "exped", make: () => ({ key: "exped", text: "远征里打赢一场精英战或首领战", ok: R => R.win && R.mode === "exped" && S.exped && S.exped.node !== "fight" }), need: 4 },
];
// 今天的 3 条悬赏：同一天打开几次都一样（用日期当种子）
function todayBounties() {
  const td = todayInfo(), r = seeded(td.seed ^ 0x5bd1e995), cleared = loadSave().stars.filter(x => x > 0).length;
  const types = BOUNTY_TYPES.filter(t => cleared >= (t.need || 0));
  const out = [];
  while (out.length < 3 && types.length) out.push(types.splice(Math.floor(r() * types.length), 1)[0].make(r));
  return { date: td.date, list: out };
}
function checkBounties(R) {
  const B = todayBounties(), got = [];
  let bonus = 0;
  editSave(d => {
    if (d.bounty.date !== B.date) d.bounty = { date: B.date, done: [] };
    for (const b of B.list) if (!d.bounty.done.includes(b.key)) { let ok = false; try { ok = b.ok(R); } catch (e) {} if (ok) { d.bounty.done.push(b.key); got.push(b.text); bonus += BOUNTY_STARS; } }
    if (got.length && B.list.every(b => d.bounty.done.includes(b.key))) bonus += BOUNTY_ALL;
    d.bonusStars += bonus;
  });
  R.bounty = got; R.bountyStars = bonus;
}

// 通关奖励：每次都给 1★，困难再 +2、噩梦再 +3，深渊每 5 层 +1；深渊新层首通另算
function runReward() {
  const prev = loadSave().abyss[S.stage] || 0, lay = S.abyss || 0;
  const bonus = 1 + (DIFF_BONUS[S.diff] || 0) + Math.floor(lay / 5);
  let first = 0; for (let l = prev + 1; l <= lay; l++) first += abyssStars(l);
  editSave(d => { d.bonusStars += bonus; if (lay > prev) d.abyss[S.stage] = lay; });
  return `通关奖励 +${bonus}★` + (first ? ` · 深渊 ${lay} 层首通 +${first}★` : "") + (S.relics.length ? ` · 本局带了 ${S.relics.length} 件遗物` : "");
}

// ---------- 结算：战绩入档（图鉴和角色页要用）----------
function recordRun(win) {
  editSave(d => {
    for (const k in S.foeKill) d.foeKill[k] = (d.foeKill[k] || 0) + S.foeKill[k];
    for (const id of S.afxSeen || []) if (!d.afxSeen.includes(id)) d.afxSeen.push(id);
    for (const id of S.eventsDone || []) if (!d.evSeen.includes(id)) d.evSeen.push(id);
    for (const id of Object.keys(S.cards).concat(Object.keys(S.curses || {}))) if (!d.cardSeen.includes(id) && ANY_CARD(id)) d.cardSeen.push(id);
    for (const id of S.relics || []) if (!d.relicSeen.includes(id)) d.relicSeen.push(id);
    const joined = new Set(S.picks.filter(p => p.startsWith("ally_")).map(p => p.slice(6)).concat([S.heroId]));
    for (const D of UNITS) {
      const s = S.stats[D.id];
      if (!joined.has(D.id) && !s) continue;
      const u = d.use[D.id] || (d.use[D.id] = { runs: 0, win: 0, hero: 0, dmg: 0, heal: 0, kills: 0, taken: 0 });
      u.runs = (u.runs || 0) + 1;
      if (win) u.win = (u.win || 0) + 1;
      if (D.id === S.heroId) u.hero = (u.hero || 0) + 1;
      if (s) { u.dmg = (u.dmg || 0) + Math.round(s.dmg); u.heal = (u.heal || 0) + Math.round(s.heal); u.kills = (u.kills || 0) + s.kills; u.taken = (u.taken || 0) + Math.round(s.taken); }
    }
  });
  // 收集类成就：图鉴集齐（哪种模式打的都算）
  const d = loadSave();
  if (RELICS.every(r => d.relicSeen.includes(r.id))) unlockAchv("relics");
  if (CODEX_CARDS().every(c => d.cardSeen.includes(c.id))) unlockAchv("cards");
}
const CODEX_CARDS = () => CARDS.filter(c => !c.filler && !c.evo);
const EVO_CARDS = CARDS.filter(c => c.evo);

// ---------- 结算经验 ----------
function awardExp(win) {
  const d = loadSave(), gains = [];
  const joined = new Set(S.picks.filter(p => p.startsWith("ally_")).map(p => p.slice(6)).concat([S.heroId]));
  const score = D => { const s = S.stats[D.id]; return s ? s.dmg + s.heal + s.taken * 0.5 : 0; };
  const list = openChars();
  const total = list.reduce((n, D) => n + score(D), 0) || 1;
  const waves = Math.min(30, S.endless ? Math.max(0, S.wave - 1) : win ? ST.waves : Math.max(0, S.wave - 1));
  const mult = (win ? 1.5 : 1) * (1 + 0.15 * dk("mentor")) * [1, 1.25, 1.5][S.diff || 0];
  for (const D of list) {
    const played = joined.has(D.id);
    const gain = Math.round(((played ? 30 : 8) + (played ? score(D) / total * 120 : 0) + waves * (played ? 3 : 1)) * mult);
    const c = d.chars[D.id] || (d.chars[D.id] = { exp: 0 });
    c.exp = Math.max(c.exp || 0, joinExp(D));
    const before = levelOf(c.exp).lv;
    c.exp += gain;
    gains.push({ D, gain, before, after: levelOf(c.exp), exp: c.exp, played });
  }
  writeSave(d);
  if (gains.some(g => g.after.lv >= PROG.max)) unlockAchv("lv10");
  return gains.sort((a, b) => (b.played ? 1 : 0) - (a.played ? 1 : 0) || b.gain - a.gain);
}
