// 长局压力：无尽模式模拟 20 分钟（36000 步），每 2 秒画一帧。检查特效/弹道等数组有界、没有 NaN、堆内存没有一路涨
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(async () => {
  closeOverlay(); __td.newRun(14, { hero: 'mage', endless: true, charLv: Object.fromEntries(UNITS.map(u => [u.id, 10])), charAwk: {}, assist: 0, charOpen: UNITS.map(u => u.id) });
  const S = __td.S; const out = { maxFx: 0, maxShots: 0, maxEnemies: 0, maxNums: 0, heap: [], nan: false, wave: 0 };
  const mem = () => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0);
  for (let i = 0; i < 36000; i++) {
    if (S.shop) __td.closeShop(); if (S.event) __td.takeEvent(0); if (S.pending > 0 && !S.offer) __td.openOffer(); if (S.offer) pickCard(S.offer[0].id);
    S.crystal.hp = S.crystal.maxHp; for (const u of S.units) if (u.down > 0) { u.down = 0; u.hp = u.maxHp * 0.5; }
    __td.step(1 / 30);
    if (i % 60 === 0) { render(1000 + i * 33); out.maxFx = Math.max(out.maxFx, S.fx.length); out.maxShots = Math.max(out.maxShots, S.shots.length); out.maxEnemies = Math.max(out.maxEnemies, S.enemies.length); }
    if (i % 6000 === 0) out.heap.push(+mem().toFixed(1));
    if (i % 3000 === 0 && (!isFinite(S.crystal.hp) || S.units.some(u => !isFinite(u.hp)) || S.enemies.some(e => !isFinite(e.hp)))) out.nan = true;
  }
  out.wave = S.wave; out.fxAfter = S.fx.length; out.enemiesLen = S.enemies.length; out.deadKept = S.enemies.filter(e => e.dead).length; return out; });
console.log(JSON.stringify(r));
check(r.wave >= 20, '20 分钟推进到 20 波以上', r.wave);
check(r.maxFx <= 800, '特效数组有上限（≤ 800）', r.maxFx);
check(r.maxShots <= 200, '弹道数组有界', r.maxShots);
check(!r.nan, '全程没有 NaN', r.nan);
check(r.deadKept < 200, '死掉的敌人会被清走，不在数组里越堆越多', r.deadKept);
if (r.heap[0]) check(Math.max(...r.heap) < r.heap[0] + 150, '堆内存没有一路上涨（比开局最多多 150MB）', r.heap);
noErrors(errs); report('soak-long'); await b.close(); })();
