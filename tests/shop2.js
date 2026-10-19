const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const out = { bad: [] };
  for (const it of SHOP.items) { __td.newRun(2); const S = __td.S; S.pending = 0; S.offer = null; S.dust = 999; S.cards.atk = 2; S.cards.hp = 1;
    S.shop = { items: [{ ...it, price: it.cost }] };
    const before = { ban: S.banishLeft, rel: S.relics.length, pend: S.pending, atk: S.cards.atk };
    try { __td.buyShop(it.id); for (let k = 0; k < 30; k++) { if (S.offer) S.offer = null; __td.step(1/30); } } catch (e) { out.bad.push(it.id + ':' + e.message); }
    out[it.id] = { ban: S.banishLeft - before.ban, rel: S.relics.length - before.rel, pend: S.pending, lost: (S.cards.atk || 0) + (S.cards.hp || 0) }; }
  out.n = SHOP.items.length; return out; });
console.log(JSON.stringify(r));
check(r.bad.length === 0 && r.n === 10, '十种商品都能买且不报错', r);
check(r.banish.ban === 1 && r.relicbox.rel === 1 && r.recycle.lost === 2, '放逐 +1、遗物 +1、回炉降一级', r);
noErrors(errs); report('shop2'); await b.close(); })();
