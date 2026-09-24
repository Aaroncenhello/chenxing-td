
// ================= 结算：一局结束时写存档（星星、记录、成就、经验） =================
// 只做数据、不画界面；结算页 showResult(R) 按这里返回的结果来画。
// frame() 里的 checkOver 会调它；无头测试可以直接调 __td.settle()。同一局只结算一次。
const stageAchv = i => (STAGES[i] && STAGES[i].clearAchv) || [];
function settleRun() {
  if (!S || !S.over) return null;
  if (S.settled) return S.settled;
  const win = S.over === "win";
  const mode = S.vigil ? "vigil" : S.daily ? "daily" : S.endless ? "endless" : S.week ? "week" : "main";
  const R = S.settled = { win, mode, reached: win && !S.endless ? ST.waves : Math.max(0, S.wave - 1) };
  recordRun(win);
  R.exp = awardExp(win);
  // 「通关某关 / 任意关卡」类成就和通关剧情只算主线；守望之战的 S.stage 是解锁到的最后一关，每周挑战是指定关卡，都不算真的打通了那一关
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
const CODEX_CARDS = () => CARDS.filter(c => !c.filler);

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
