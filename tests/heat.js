// 发热/耗电：手机默认省电（30 帧），暂停和面板打开时更低；自动画质不会因为 30 帧封顶被误判成「卡」而掉到最低档
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 750 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ tutorial: true, ver: 13, stars: new Array(19).fill(3) }))); await p.reload(); await p.waitForTimeout(400);
await p.evaluate(() => { localStorage.setItem('chenxing-td-news', '12.0'); closeOverlay(); startRun(2, { hero: 'mage', charOpen: UNITS.map(u => u.id) }); const S = __td.S; S.pending = 0; S.offer = null; S.cine = null; S.autoWave = true; for (const id of ['knight', 'archer', 'priest']) pickCard('ally_' + id); });
check(await p.evaluate(() => OPT.eco === true), '触屏设备默认开省电（30 帧）');
// 数一秒钟里 render 被调用了几次
const rate = async (ms = 2000) => p.evaluate(async ms => { let n = 0; const o = window.render; window.render = function (t) { n++; return o(t); }; await new Promise(r => setTimeout(r, ms)); window.render = o; return n / ms * 1000; }, ms);
const fight = await rate(); check(fight <= 36, `战斗中每秒画 ${fight.toFixed(0)} 帧（≤ 36）`, fight); check(fight >= 20, `战斗中不低于 20 帧（${fight.toFixed(0)}）`, fight);
await p.evaluate(() => { __td.S.paused = true; }); await p.waitForTimeout(300);
const paused = await rate(); check(paused <= 18, `暂停时每秒画 ${paused.toFixed(0)} 帧（≤ 18）`, paused);
await p.evaluate(() => { __td.S.paused = false; showLevels(); }); await p.waitForTimeout(300);
const menu = await rate(); check(menu <= 10, `菜单盖住战场时每秒画 ${menu.toFixed(0)} 帧（≤ 10）`, menu);
await p.evaluate(() => { closeOverlay(); });
// 省电关掉就是 60 帧封顶
await p.evaluate(() => { setOpt('eco', false); }); await p.waitForTimeout(200);
const full = await rate(); check(full <= 62 && full > 36, `省电关掉后约 60 帧（${full.toFixed(0)}）`, full);
await p.evaluate(() => { setOpt('eco', true); });
// 打一阵：自动画质不能因为 30 帧封顶被判成卡而掉到「低」
const lv = await p.evaluate(async () => { const S = __td.S; for (let i = 0; i < 30; i++) { S.crystal.hp = S.crystal.maxHp; await new Promise(r => setTimeout(r, 200)); } return GFX.name; });
check(lv === '中', `连打 6 秒后自动画质仍是「中」（${lv}）`, lv);
noErrors(errs); report('heat'); await b.close(); })();
