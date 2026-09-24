const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, story: [...Array(16).keys()].map(i => 'pre' + i) })));
  await p.reload(); await p.waitForTimeout(500);
  await p.screenshot({ path: 'L-menu.png' });
  await p.evaluate(() => { __td.newRun(5, { charLv: Object.fromEntries(__td.UNITS.map(u => [u.id, 6])) }); });
  await p.waitForTimeout(400);
  const imm = await p.evaluate(() => document.body.classList.contains('imm'));
  await p.screenshot({ path: 'L-draft.png' });
  await p.evaluate(() => { const T = __td, S = T.S; for (let i = 0; i < 1300; i++) { T.step(1/30); if (S.offer) { T.pickCard(S.offer[0].id); T.openOffer(); } if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); } S.pending = 0; S.offer = null; S.xp = 0; });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'L-battle.png' });
  // 每个 HUD 按钮都要在屏幕里、能点到
  const vis = await p.evaluate(() => [...document.querySelectorAll('#hud button')].map(b => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return b.dataset.h + ':' + (r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth ? 'in' : 'OUT') + (el && (el === b || b.contains(el)) ? '' : '!blocked'); }));
  console.log('imm', imm, vis.join(' '));
  check(imm, '手机横屏开局自动进入沉浸全屏');
  check(vis.length > 0 && vis.every(v => v.endsWith(':in')), '每个 HUD 按钮都在屏幕内且没被挡住', vis.filter(v => !v.endsWith(':in')));
  // 点一下 HUD 的速度和出击
  await p.tap('#h-speed'); await p.tap('#h-call');
  const tapped = await p.evaluate(() => [__td.S.speed, __td.S.wave]);
  console.log(tapped);
  check(tapped[0] > 1, '点 HUD 倍速按钮生效', tapped);
  // 菜单
  await p.tap('[data-h="menu"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'L-levels.png' });
  // 页面自己要带 viewport 声明（以前测试里偷偷注入，结果真机上整页按 980px 宽缩小）
  check(await p.evaluate(() => /width=device-width/.test((document.querySelector('meta[name=viewport]') || {}).content || '')), '页面带 viewport 声明');
  noErrors(errs);

  // 竖屏：开局自动进沉浸全屏，战场撑满宽度，所有按钮在一屏里、能点到、不用滚动；再模拟 Claude App 里更矮的框
  for (const [w, h] of [[390, 844], [375, 667], [390, 600]]) {
    const pc = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const pp = await pc.newPage(); const perr = []; pp.on('pageerror', e => perr.push(e.message));
    await pp.goto(GAME); await pp.waitForTimeout(300);
    await pp.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, ver: 12, story: [...Array(16).keys()].map(i => 'pre' + i) })));
    await pp.reload(); await pp.waitForTimeout(400);
    await pp.evaluate(() => { __td.newRun(5, {}); const T = __td, S = T.S; for (let i = 0; i < 300; i++) { T.step(1/30); if (S.offer) { T.pickCard(S.offer[0].id); T.openOffer(); } if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); } S.pending = 0; S.offer = null; });
    await pp.waitForTimeout(400);
    const r = await pp.evaluate(() => {
      const sc = document.getElementById('screen').getBoundingClientRect();
      const bad = [...document.querySelectorAll('#hud button')].filter(b => b.offsetParent).map(b => { const q = b.getBoundingClientRect(); const el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return b.dataset.h + ((q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth) ? '' : ':OUT') + (el && (el === b || b.contains(el)) ? '' : ':blocked') + (q.height >= 44 ? '' : ':small'); }).filter(x => x.includes(':'));
      const hl = document.querySelector('.hud-l').getBoundingClientRect();
      return { imm: document.body.classList.contains('imm'), fieldW: Math.round(sc.width), fieldBottom: Math.round(sc.bottom), btnTop: Math.round(hl.top), bad };
    });
    console.log(`竖屏 ${w}×${h}:`, JSON.stringify(r));
    check(r.imm, `竖屏 ${w}×${h} 开局自动进入全屏布局`);
    check(r.fieldW >= w - 2, `竖屏 ${w}×${h} 战场撑满屏幕宽度`, r.fieldW);
    check(r.fieldBottom <= r.btnTop, `竖屏 ${w}×${h} 战场和按钮区不重叠`, r);
    check(r.bad.length === 0, `竖屏 ${w}×${h} 每个按钮都在屏幕内、没被挡住、够大好点`, r.bad);
    // 翻牌时新敌人提示不能压在卡上
    await pp.evaluate(() => { __td.S.pending = 1; __td.openOffer(); toast('<b>测试提示</b>'); }); await pp.waitForTimeout(200);
    check(await pp.evaluate(() => getComputedStyle(document.getElementById('toasts')).display === 'none'), `竖屏 ${w}×${h} 翻牌时提示不压在卡上`);
    await pp.screenshot({ path: `P-${w}x${h}.png` });
    noErrors(perr);
    await pc.close();
  }
  report('mobile-landscape');
  await b.close();
})();
