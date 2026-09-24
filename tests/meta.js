const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack||'').split('\n')[1]));
  await p.goto(GAME);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, perks: ['veteran','walls','arcane'], story: [...Array(16).keys()].map(i => 'pre' + i) })));
  await p.reload(); await p.waitForTimeout(500);
  const r0 = await p.evaluate(() => { const d = loadSave(); return { perks: d.perks, bank: starBank() }; });
  console.log('迁移:', JSON.stringify(r0));
  check(r0.perks.length === 0 && r0.bank.spent === 0 && r0.bank.left > 0, '旧版星之祝福迁移后清空并退还星星', r0);
  // 星盘：买几级
  const r1 = await p.evaluate(() => { showPerks(); for (let i = 0; i < 5; i++) buyDisk('atk'); buyDisk('star'); buyDisk('supply'); const d = loadSave(); return { disk: d.disk, bank: starBank().left, nodes: document.querySelectorAll('.dnode').length }; });
  console.log('星盘:', JSON.stringify(r1));
  check(r1.disk.atk === 5 && r1.disk.star === 1 && r1.nodes > 0 && r1.bank < r0.bank.left, '星盘能买、会扣星星', r1);
  await p.screenshot({ path: 'm12-disk.png', fullPage: false });
  // 选关页：深渊 + 每周
  const r2 = await p.evaluate(() => { editSave(d => { d.abyss = { 0: 3 }; }); showLevels(); return { abyss: !!document.querySelector('.abyss'), week: !!document.querySelector('.daily.week'), open: abyssOpen(), txt: document.querySelector('.daily.week') ? document.querySelector('.daily.week').innerText.slice(0, 120) : '' }; });
  console.log('选关:', JSON.stringify(r2));
  check(r2.abyss && r2.week && r2.open >= 4, '选关页有深渊和每周挑战', r2);
  await p.evaluate(() => { abyssSel = 4; showLevels(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'm12-levels.png' });
  // 深渊 4 层开一局，跑一会儿；看系数、首领词缀
  const r3 = await p.evaluate(() => {
    const T = __td; T.newRun(2, { abyss: 10, diff: 0, disk: loadSave().disk, charLv: Object.fromEntries(T.UNITS.map(u => [u.id, 8])), charOpen: T.UNITS.map(u=>u.id) });
    const S = T.S; const out = { diffK: S.diffK, pending: S.pending, crystal: S.crystal.maxHp, rerolls: S.rerolls, cards: Object.keys(S.cards) };
    let g = 0;
    while (!S.over && g++ < 30 * 400) {
      if (S.shop) { T.closeShop(); continue; } if (S.event) { T.takeEvent(0); continue; }
      if (S.pending > 0 && !S.offer) T.openOffer(); if (S.offer) { T.pickCard(S.offer[0].id); continue; }
      T.step(1 / 30);
    }
    out.over = S.over; out.wave = S.wave; out.relics = S.relics; return out;
  });
  console.log('深渊10:', JSON.stringify(r3));
  check(r3.diffK.hp > 1.2 && r3.over, '深渊 10 层敌人更强，能正常打完', { hp: r3.diffK.hp, over: r3.over });
  // 遗物全开：每件都挂上跑一段，确认不报错
  const r4 = await p.evaluate(() => {
    const T = __td; T.newRun(6, { charLv: Object.fromEntries(T.UNITS.map(u => [u.id, 9])), charOpen: T.UNITS.map(u=>u.id) });
    const S = T.S; S.relics = RELIC_ids = []; 
    for (const R of RELICS) S.relics.push(R.id);
    let g = 0;
    while (!S.over && g++ < 30 * 300) {
      if (S.shop) { T.closeShop(); continue; } if (S.event) { T.takeEvent(0); continue; }
      if (S.pending > 0 && !S.offer) T.openOffer(); if (S.offer) { T.pickCard(S.offer[0].id); continue; }
      if (S.star >= 100) T.castUlt(); if (S.spells.meteor <= 0 && S.enemies[0]) T.castSpell('meteor', S.enemies[0].x, S.enemies[0].y);
      if (S.wave >= 3 && S.spawnQueue.length) T.callWaveEarly();
      T.step(1 / 30);
    }
    return { over: S.over, wave: S.wave, rel: S.relics.length, phoenix: S.phoenixUsed };
  });
  console.log('全遗物:', JSON.stringify(r4));
  check(r4.over && r4.rel >= 20, '全部遗物同时挂上能打完一局', r4);
  // 自然掉落：跑几局统计
  const r5 = await p.evaluate(() => {
    const T = __td, res = [];
    for (let k = 0; k < 3; k++) {
      T.newRun(4 + k, { charLv: Object.fromEntries(T.UNITS.map(u => [u.id, 8])), charOpen: T.UNITS.map(u=>u.id) });
      const S = T.S; let g = 0;
      while (!S.over && g++ < 30 * 600) {
        if (S.shop) { T.closeShop(); continue; } if (S.event) { T.takeEvent(0); continue; }
        if (S.pending > 0 && !S.offer) T.openOffer(); if (S.offer) { T.pickCard(S.offer[0].id); continue; }
        T.step(1 / 30);
      }
      res.push(S.relics.length + '@w' + S.wave);
    }
    return res;
  });
  console.log('掉落:', JSON.stringify(r5));
  // 每周挑战
  const r6 = await p.evaluate(() => {
    const T = __td, wi = weekInfo();
    T.newRun(wi.stage, { week: wi, diff: wi.diff });
    const S = T.S; return { wi, open: S.charOpen.length, relics: S.relics.length, curses: Object.keys(S.curses).length, mod: S.mod, hp: S.diffK.hp };
  });
  console.log('每周:', JSON.stringify(r6));
  check(r6.wi.rules.length >= 1 && r6.wi.key === 'W' + r6.wi.n && r6.open > 0, '每周挑战能开局', r6);
  noErrors(errs);
  report('meta');
  await b.close();
})();
