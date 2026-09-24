const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width,initial-scale=1'; document.head.appendChild(m); }); });
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
  // 点一下 HUD 的速度和出击
  await p.tap('#h-speed'); await p.tap('#h-call');
  console.log(await p.evaluate(() => [__td.S.speed, __td.S.wave]));
  // 菜单
  await p.tap('[data-h="menu"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'L-levels.png' });
  // 竖屏
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  await p.evaluate(() => closeOverlay()); await p.waitForTimeout(300);
  await p.screenshot({ path: 'P-imm.png' });
  console.log('ERR', errs.slice(0, 4));
  await b.close();
})();
