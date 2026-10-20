// 批次 K：升级层次（卡牌飞向角色、升阶分级特效、卡牌星级点、成长倍数、下一步目标）
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html'));
await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ tutorial: true, ver: 13, story: ['pre0'] }))); await p.reload(); await p.waitForTimeout(400);
const r = await p.evaluate(async () => {
  const out = {}; localStorage.setItem('chenxing-td-news', '12.0'); closeOverlay();
  __td.newRun(0, { hero: 'knight', charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.cine = null;
  // 1) 翻牌 → 选一张伙伴卡 → 有飞牌特效和落地圈
  S.pending = 1; __td.openOffer(0, true); const offer = S.offer; out.offer = !!offer;
  const join = offer && offer.find(x => x.join) || null; const pick = join || offer[0];
  takeCard(pick.id); out.fly = S.fx.some(f => f.kind === 'cardfly') ; out.queued = (S.fxq || []).some(q => q.f.kind === 'ring');
  // 3) 卡牌栏的星级点 / 满级金边
  S.cards.sk_tide = 2; S.cards.sk_fire = 5; cardKey = ''; updateCardbar();
  out.pips = document.querySelectorAll('.cardbar .pips').length; out.maxed = document.querySelectorAll('.cardbar .maxed').length;
  // 4) 成长倍数 + 目标
  const g0 = teamGrowth(); S.cards.atk = 4; S.cards.hp = 3; const g1 = teamGrowth(); out.growth = [g0.k, g1.k];
  S.cards.sk_fire = 1; S.cards.sk_meteor = 0; updateSyn(); out.goal = nextGoal();
  updateStats(); out.pw = document.getElementById('s-pw').textContent; out.xp = document.getElementById('xp-txt').textContent;
  for (let i = 0; i < 30; i++) { render(1000 + i * 33); __td.step(1 / 30); }
  return out; });
console.log(JSON.stringify(r));
check(r.offer && r.fly && r.queued, '选牌后有飞牌特效，落地时排了一圈光', { f: r.fly, q: r.queued });
check(r.pips >= 2 && r.maxed >= 1, '卡牌栏有星级点，满级卡有金边', { p: r.pips, m: r.maxed });
check(r.growth[1] > r.growth[0] && r.pw.startsWith('×'), '战力倍数随卡牌上涨', r.growth);
check(/火系/.test(r.goal) && /目标/.test(r.xp), '经验条里有「下一步目标」', { g: r.goal, x: r.xp });
noErrors(errs); report('grow'); await b.close(); })();
