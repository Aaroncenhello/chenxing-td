const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1320, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await pg.goto(GAME);
  await pg.waitForTimeout(400);

  // 打两局，攒出战绩
  const runs = await pg.evaluate(async () => {
    const T = __td;
    const out = [];
    for (const st of [0, 5]) {
      T.newRun(st, {});
      const S = T.S;
      for (let i = 0; i < 12000 && !S.over; i++) {
        T.step(1 / 30);
        if (S.offer) { T.pickCard((S.offer.find(p => p.kind === 'unit') || S.offer[0]).id); T.openOffer(); }
        if (S.shop) T.closeShop();
        if (S.event) T.takeEvent(0);
      }
      out.push({ st, over: S.over, wave: S.wave, kills: S.kills, foeKinds: Object.keys(S.foeKill).length, afx: (S.afxSeen || []).length, ev: (S.eventsDone || []).length });
      await new Promise(r => setTimeout(r, 60));
    }
    return out;
  });
  console.log('两局:', JSON.stringify(runs));
  check(runs.every(r => r.over && r.kills > 0), '两局都能打完并且有击杀', runs);
  await pg.waitForTimeout(600);

  const save = await pg.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('chenxing-td-v2'));
    const use = Object.entries(d.use || {}).map(([k, v]) => k + ':' + v.runs + '局/' + Math.round(v.dmg) + '伤');
    return { foeKill: d.foeKill, afxSeen: d.afxSeen, evSeen: d.evSeen, use: use.slice(0, 5), form: d.form };
  });
  console.log('存档战绩:', JSON.stringify(save));
  check(Object.keys(save.foeKill || {}).length > 0 && save.use.length > 0, '战绩（击杀、出战）写进了存档', save);

  // 图鉴三个页签
  for (const [tab, name] of [['foe', '敌人'], ['afx', '词缀'], ['ev', '事件']]) {
    const r = await pg.evaluate(t => { showLevels(); showCodex(t); const box = document.getElementById('ovbox'); return { cards: box.querySelectorAll('.cx').length, txt: box.querySelector('p').textContent.trim().slice(0, 60), h: box.innerText.length }; }, tab);
    console.log('图鉴 · ' + name + ':', JSON.stringify(r));
    check(r.cards > 0, '图鉴「' + name + '」页有条目', r);
    await pg.waitForTimeout(150);
    await pg.screenshot({ path: 'codex-' + tab + '.png' });
  }

  // 角色页战绩
  const ros = await pg.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('chenxing-td-v2'));
    const id = Object.keys(d.use || {})[0] || 'knight';
    showRoster(id);
    const box = document.getElementById('ovbox');
    const rec = box.querySelector('.rrec');
    return { id, rec: !!rec, cells: rec ? [...rec.querySelectorAll('div')].map(x => x.innerText.replace(/\n/g, '=')) : [], sub: box.innerText.match(/出战 \d+ 局[^\n]*/) ? box.innerText.match(/出战 \d+ 局[^\n]*/)[0] : '(无)' };
  });
  console.log('角色战绩:', JSON.stringify(ros));
  check(ros.rec && ros.cells.length > 0 && /出战 \d+ 局/.test(ros.sub), '角色页显示战绩', ros);
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: 'roster10.png' });

  // 存档导出导入要能带上新字段
  const io = await pg.evaluate(() => {
    const code = exportSave();
    const before = JSON.parse(localStorage.getItem('chenxing-td-v2'));
    localStorage.removeItem('chenxing-td-v2');
    const err = importSave(code);
    const after = loadSave();
    return { err, sameFoe: JSON.stringify(before.foeKill) === JSON.stringify(after.foeKill), sameUse: JSON.stringify(before.use) === JSON.stringify(after.use), afx: after.afxSeen.length };
  });
  console.log('存档往返:', JSON.stringify(io));
  check(io.err === null && io.sameFoe && io.sameUse, '存档导出再导入不丢数据', io);

  noErrors(errs);
  report('codex');
  await b.close();
})();
