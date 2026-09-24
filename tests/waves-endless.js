const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(GAME);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true })));
  await p.reload(); await p.waitForTimeout(400);
  // 1) 无尽：强英雄，跑到 70 波以上，看有没有空波、商店有没有乱弹、牌有没有翻完
  const r1 = await p.evaluate(() => {
    const T = __td, clv = Object.fromEntries(T.UNITS.map(u => [u.id, 10]));
    T.newRun(0, { endless: true, charLv: clv, charOpen: T.UNITS.map(u => u.id) });
    const S = T.S; let shops = 0, emptyWaves = 0, lastW = 0, noOffer = 0, fillers = 0, guard = 0;
    // 作弊：让队伍几乎无敌，只为了跑到很后面
    while (!S.over && S.wave < 75 && guard++ < 30 * 60 * 60) {
      if (S.shop) { shops++; T.closeShop(); continue; }
      if (S.event) { T.takeEvent(0); continue; }
      if (S.pending > 0 && !S.offer) { T.openOffer(); if (!S.offer && S.pending > 0) noOffer++; }
      if (S.offer) { const c = S.offer[0]; if (c.id.startsWith('fl_')) fillers++; T.pickCard(c.id); continue; }
      if (S.wave !== lastW) { if (S.spawnQueue.length === 0 && S.wave > 0 && !S.enemies.length) emptyWaves++; lastW = S.wave; }
      for (const u of S.units) u.hp = u.maxHp;
      S.crystal.hp = S.crystal.maxHp;
      for (const e of S.enemies) if (!e.dead && e.hp > 1) e.hp = Math.min(e.hp, e.maxHp * 0.3);
      T.step(1 / 30);
    }
    return { wave: S.wave, over: S.over, shops, emptyWaves, noOffer, fillers, level: S.level, t: Math.round(S.t) };
  });
  console.log('无尽:', JSON.stringify(r1));
  // 2) 手动开波
  const r2 = await p.evaluate(() => {
    const T = __td; T.newRun(1, { autoWave: false }); const S = T.S;
    S.pending = 0; S.offer = null;
    for (let i = 0; i < 30 * 20; i++) T.step(1 / 30);
    const w0 = S.wave;                        // 手动模式下 20 秒过去也不该出第一波
    T.callWaveEarly? 0 : 0;
    T.callWaveEarly();
    for (let i = 0; i < 30; i++) T.step(1 / 30);
    const w1 = S.wave, q = S.spawnQueue.length;
    const d0 = S.dust;
    T.callWaveEarly();   // 出怪中再按：叠波
    const w2 = S.wave, q2 = S.spawnQueue.length, bonus = S.dust - d0;
    T.toggleAutoWave();
    return { w0, w1, q, w2, q2, bonus, auto: S.autoWave, btn: document.getElementById('btn-call').textContent, next: document.getElementById('s-next').textContent };
  });
  console.log('手动开波:', JSON.stringify(r2));
  // 3) 叠波跳过第 4、5 波，商店和事件还是要补
  const r3 = await p.evaluate(() => {
    const T = __td; T.newRun(2, { autoWave: false }); const S = T.S;
    S.pending = 0; S.offer = null;
    let shop = 0, ev = 0;
    for (let k = 0; k < 7; k++) { S.nextWaveIn = 0; T.step(1/30); if (S.spawnQueue.length) T.S.spawnQueue.length; }
    // 连按 6 次叠到第 6 波
    for (let k = 0; k < 6; k++) { S.offer = null; S.pending = 0; if (S.spawnQueue.length) { T.callWaveEarly(); } else { S.nextWaveIn = 0; T.step(1/30); } }
    const wAfter = S.wave;
    for (let i = 0; i < 30 * 400 && !S.over; i++) {
      for (const u of S.units) u.hp = u.maxHp; S.crystal.hp = S.crystal.maxHp;
      if (S.pending && !S.offer) T.openOffer(); if (S.offer) { T.pickCard(S.offer[0].id); continue; }
      if (S.shop) { shop++; T.closeShop(); continue; }
      if (S.event) { ev++; T.takeEvent(0); continue; }
      if (S.wave >= 9) break;
      T.step(1/30);
      if (!S.spawnQueue.length && !S.enemies.length) S.nextWaveIn = Math.min(S.nextWaveIn, 0);
    }
    return { wAfter, wave: S.wave, shop, ev };
  });
  console.log('叠波补商店/事件:', JSON.stringify(r3));
  const r4 = await p.evaluate(() => {
    const T = __td; T.newRun(0, {}); const S = T.S; S.pending = 0; S.offer = null;
    for (const c of T.CARDS) if (!c.filler) S.cards[c.id] = c.max;
    for (const D of T.UNITS) S.charOpen = S.charOpen.filter(x => false);
    const pool = T.cardPool().map(x => x.id); S.pending = 3; T.openOffer();
    return { pool, offer: S.offer && S.offer.map(x => x.id) };
  });
  console.log('补充卡:', JSON.stringify(r4));
  console.log('ERR', errs.slice(0, 4));
  await b.close();
})();
