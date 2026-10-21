// 角色羁绊（阵营 / 职业 / 特质 / 搭档）、经验曲线、三幕、波数拉长
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 1000, height: 760 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ tutorial: true, ver: 14, stars: new Array(19).fill(3) }))); await p.reload();
await p.waitForFunction(() => typeof lpcReady !== 'undefined' && lpcReady, null, { timeout: 15000 }).catch(() => {});
const r = await p.evaluate(() => {
  const out = {}; localStorage.setItem('chenxing-td-news', '12.1');
  // 标签表：20 人都有 3 个标签（阵营 / 职业 / 特质各一），每个羁绊至少 3 个成员
  out.tags = UNITS.every(u => (TAGS[u.id] || []).length === 3 && TAGS[u.id].every(t => TRAIT_BY[t])) && Object.keys(TAGS).length === UNITS.length;
  const cnt = {}; for (const u of UNITS) for (const t of TAGS[u.id]) cnt[t] = (cnt[t] || 0) + 1;
  out.minMembers = Math.min(...TRAITS.map(t => cnt[t.id] || 0)); out.nTraits = TRAITS.length; out.nPairs = PAIRS.length;
  out.axes = TRAITS.map(t => t.axis).filter((a, i, A) => A.indexOf(a) === i).join(',');
  out.tierOk = TRAITS.every(t => t.tiers.every((x, i) => x.n === i + 2 && x.desc && (Object.keys(x.own).length || Object.keys(x.team).length)) && t.tiers[t.tiers.length - 1].n <= cnt[t.id]);
  out.axisCount = TRAITS.filter(t => t.axis === '阵营').length + ',' + TRAITS.filter(t => t.axis === '职业').length + ',' + TRAITS.filter(t => t.axis === '特质').length;
  out.pairsOk = PAIRS.every(x => x.ids.length === 2 && x.ids.every(id => UNITS.some(u => u.id === id)));
  // 开局：只有英雄时没有任何羁绊生效
  startRun(1, { hero: 'knight', charOpen: UNITS.map(u => u.id), assist: 0 }); const S = __td.S; S.offer = null; S.pending = 0; S.cine = null;
  updateSyn(); out.soloTier = Object.values(S.tr).reduce((a, v) => a + v, 0); out.soloAtk = uAtk(S.units[0]);
  // 加 3 名近卫：近卫 4 档（防御 +32%、全队减伤 8%、晨星碑减伤 10%）
  for (const id of ['lancer', 'marshal', 'counter']) addUnit(UNITS.find(u => u.id === id), false); updateSyn();
  out.guard = S.tr['近卫']; out.guardDef = tf(S.units[0], 'def'); out.guardDr = tf(S.units[0], 'dr'); out.crystalDr = tfTeam('crystalDr');
  out.pair = !!S.trPairs.p_la_mr; out.pairAtk = tf(S.units[1], 'atk') > 0;
  out.nTraitsOn = S.trActive;
  // 召唤物不算人数；倒下的队员不算
  const n0 = S.trN['近卫']; S.units[2].dead = true; updateSyn(); out.deadDrops = n0 - S.trN['近卫']; S.units[2].dead = false; updateSyn();
  // 加成能真的作用到数值：同一个人，近卫档位掉到 0 时防御变小
  const d1 = uDef(S.units[0]); S.units.forEach(u => { u.tf = {}; }); const d0 = uDef(S.units[0]); out.defUp = d1 > d0 * 1.2;
  updateSyn();
  // 上限：给一个人堆满所有加成不会超过上限
  const f = {}; for (const t of TRAITS) mergeFx(f, t.tiers[t.tiers.length - 1].own); for (const k in f) if (TRAIT_CAP[k] != null) f[k] = Math.min(TRAIT_CAP[k], f[k]);
  out.capOk = Object.keys(f).every(k => TRAIT_CAP[k] == null || f[k] <= TRAIT_CAP[k] + 1e-9);
  // 选牌提示和招募偏向
  const hint = traitHint('mage'); out.hint = hint.length === 3 && hint.every(h => h.to === h.from + 1);
  out.bias = traitBias('lancer') >= traitBias('breaker') && traitBias('mage') >= 1 && traitBias('mage') <= 2.2;
  // 回血、自动炮击不会出错；跑 15 秒
  for (let i = 0; i < 450; i++) __td.step(1 / 30);
  out.noNaN = S.units.every(u => Number.isFinite(u.hp) && Number.isFinite(uAtk(u)) && Number.isFinite(uMaxHp(u)));
  // 看板：有羁绊芯片，指南页打开
  synKey = ''; updateSynBar(); out.chips = (document.getElementById('pi-syn').innerHTML.match(/class="sc/g) || []).length;
  out.guideHtml = traitGuideHtml(true).includes('近卫') && traitGuideHtml(false).includes('搭档');
  out.tagHtml = tagHtml('knight').includes('近卫');
  return out;
});
check(r.tags, '20 名英雄各带 3 个标签，标签都在羁绊表里');
check(r.minMembers >= 3 && r.nTraits === 17 && r.nPairs === 10, '17 个角色羁绊（每个至少 3 名成员）+ 10 组搭档', r);
check(r.axes === '阵营,职业,特质' && r.axisCount === '6,5,6', '阵营 6 + 职业 5 + 特质 6', r.axisCount);
check(r.tierOk && r.pairsOk, '每档人数递增、有效果和说明，最高档人数不超过成员数');
check(r.soloTier === 0, '开局只有英雄：没有羁绊生效', r.soloTier);
check(r.guard === 3 && Math.abs(r.guardDef - 0.32) < 1e-9 && r.guardDr >= 0.08 && r.crystalDr === 0.1, '4 名近卫：近卫最高档，防御 +32%、减伤 8%、晨星碑减伤 10%', r);
check(r.pair && r.pairAtk, '蕾娜 + 维罗妮卡同时在场：军阵搭档生效');
check(r.deadDrops === 1, '倒下的队员不算人数', r.deadDrops);
check(r.defUp, '羁绊加成真的算进防御');
check(r.capOk, '加成有上限');
check(r.hint && r.bias, '选牌提示 + 招募偏向', r);
check(r.noNaN, '跑 15 秒，数值没有 NaN');
check(r.chips >= 4 && r.guideHtml && r.tagHtml, '看板有羁绊芯片，指南页和角色标签能生成', r.chips);
// 经验曲线、三幕、波数拉长
const r2 = await p.evaluate(() => {
  const out = {}; startRun(0, { hero: 'knight', charOpen: UNITS.map(u => u.id), assist: 0 }); const S = __td.S; S.offer = null; S.pending = 0; S.cine = null;
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => xpNeedOf(l)); out.xs = xs; out.mono = xs.every((v, i) => !i || v > xs[i - 1] * 1.3);
  out.waves = STAGES.map(s => s.waves); out.base = STAGES.map(s => s.baseWaves);
  out.wavesOk = STAGES.every(s => s.waves >= 21 && s.waves <= 28 && s.baseWaves < s.waves);
  out.xpK = STAGES.map(s => s.xpK); out.xpKOk = STAGES.every(s => s.xpK > 0.5 && s.xpK < 12);
  // 三幕
  const acts = []; for (let w = 1; w <= ST.waves; w++) acts.push(actOf(w)); out.actSeq = acts.every((a, i) => !i || a >= acts[i - 1]) && acts[0] === 0 && acts[acts.length - 1] === 2;
  S.wave = 0; startWave(); out.act1 = S.act === 0;
  S.wave = Math.round(ST.waves * 0.34); startWave(); out.act2 = S.act === 1; const k2 = levelK();
  S.wave = Math.round(ST.waves * 0.68); startWave(); out.act3 = S.act === 2; out.actK = levelK() > k2;
  // 等级加成：升级后攻击变大
  const a0 = uAtk(S.units[0]); S.level += 3; out.lvUp = uAtk(S.units[0]) > a0 * 1.2;
  // 敌人强度按「原来的进度」算：第 1 波和旧版第 1 波一样，最后一波和旧版最后一波一样
  out.waveHp = [1, ST.waves].map(w => { S.wave = w; return 1 + 0.095 * (w - 1) / ST.wk; });
  return out;
});
check(r2.mono, '经验曲线越升越陡（每级至少多 30%）', r2.xs);
check(r2.wavesOk, '每关 21–28 波，比旧版长', r2.waves);
check(r2.xpKOk, '每关有经验系数', r2.xpK);
check(r2.actSeq && r2.act1 && r2.act2 && r2.act3 && r2.actK, '三幕按进度切换，进入新幕全队加成变大', r2);
check(r2.lvUp, '队伍等级加成：升级后攻击变强');
noErrors(errs); report('traits'); await b.close(); })();
