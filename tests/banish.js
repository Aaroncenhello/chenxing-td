const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
await p.evaluate(() => { const T = __td; T.newRun(2); const S = T.S; S.pending = 1; S.offer = null; T.openOffer(); window.__victim = S.offer[0].id; });
await p.waitForTimeout(300);
await p.evaluate(() => document.getElementById('btn-banish').click()); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const T = __td, S = T.S, victim = window.__victim;
  const out = { left0: 2 };
  out.mode = document.getElementById('cards3').classList.contains('banishing');
  document.querySelector('#cards3 [data-pick]').click();
  out.left1 = S.banishLeft; out.banished = S.banished.slice(); out.still = S.offer.some(x => x.id === victim); out.n = S.offer.length; out.unique = new Set(S.offer.map(x => x.id)).size === S.offer.length;
  // 放逐过的卡不会再进牌堆：把池子翻 300 次
  let leak = 0; for (let i = 0; i < 300; i++) if (randomCards(3).some(x => x.id === victim)) leak++; out.leak = leak;
  // 用完次数
  S.banishLeft = 0; out.refuse = banishCard(S.offer[0].id);
  return out; });
console.log(JSON.stringify(r));
check(r.left0 === 2 && r.left1 === 1 && r.banished.length === 1, '放逐扣次数、记录被放逐的卡', r);
check(r.mode && r.n === 3 && r.unique && !r.still, '放逐后原位补一张不重复的新卡', r);
check(r.leak === 0, '被放逐的卡 300 次抽牌里一次都没再出现', r.leak);
check(r.refuse === false, '次数用完不能再放逐', r);
noErrors(errs); report('banish'); await b.close(); })();
