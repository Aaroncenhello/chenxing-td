const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  __td.newRun(2); const S = __td.S; S.pending = 0; S.offer = null; const out = {};
  S.cards.sk_fire = 3; S.cards.sk_meteor = 2; updateSyn(); out.a = [syn('inferno'), syn2('inferno')];
  S.cards.sk_meteor = 3; updateSyn(); out.b = [syn('inferno'), syn2('inferno')];
  const e = spawnAt('orc', 4, 4, false); burnEnemy(e, 100, 3, null); out.burnDps = e.burnDps;
  S.cards.sk_fire = 1; updateSyn(); out.c = [syn('inferno'), syn2('inferno')];
  const e2 = spawnAt('orc', 5, 4, false); burnEnemy(e2, 100, 3, null); out.burnDps1 = e2.burnDps;
  out.guide = !!document.querySelector('x') || synGuideHtml(true).includes('强化 Ⅱ');
  // 全部 6 条二档羁绊一次拉满，跑一会看有没有 NaN
  for (const g of SYNERGY) if (g.t2) for (const id of g.t2.cards) S.cards[id] = 3; updateSyn();
  out.all2 = SYNERGY.filter(g => g.t2 && syn2(g.id)).length;
  __td.callWaveEarly(); for (let i = 0; i < 600; i++) __td.step(1/30);
  out.nan = !isFinite(S.crystal.hp) || S.units.some(u => !isFinite(u.hp)) || S.enemies.some(x => !isFinite(x.hp));
  return out; });
console.log(JSON.stringify(r));
check(r.a[0] === true && r.a[1] === false && r.b[1] === true && r.c[1] === false, '两张卡都 3 级才触发二档，掉级后收回', r);
check(r.burnDps === 200 && r.burnDps1 === 150, '烈焰环绕二档灼烧 ×2，一档 ×1.5', r);
check(r.guide && r.all2 === 6 && !r.nan, '羁绊一览显示二档；六条二档同时生效跑 20 秒无 NaN', r);
noErrors(errs); report('syn2'); await b.close(); })();
