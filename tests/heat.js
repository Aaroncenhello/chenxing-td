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
await p.evaluate(() => { setOpt('eco', true); autoIdx = 1; applyGfx(-1); });   // 60 帧档下无头浏览器达不到目标帧率会自动降档，这里复位
// 打一阵：自动画质不能因为 30 帧封顶被判成卡而掉到「低」
const lv = await p.evaluate(async () => { const S = __td.S; for (let i = 0; i < 30; i++) { S.crystal.hp = S.crystal.maxHp; await new Promise(r => setTimeout(r, 200)); } return GFX.name; });
check(lv === '中', `连打 6 秒后自动画质仍是「中」（${lv}）`, lv);
// 清晰度：战场画布按设备分辨率整数倍渲染（手机 ≥ 2 倍），低档回到 1 倍
{
  const r = await p.evaluate(() => ({ rs: RS, w: cv.width, pw: PW, gfx: GFX.name }));
  check(r.rs >= 2 && r.w === Math.round(r.pw * r.rs), `手机默认画质下战场画布 ${r.rs} 倍渲染（${r.w} 宽）`, r);
  await p.evaluate(() => applyGfx(0)); await p.waitForTimeout(300);
  const lo = await p.evaluate(() => ({ rs: RS, w: cv.width, pw: PW }));
  check(lo.rs === 1 && lo.w === lo.pw, '低档画质回到 1 倍渲染（省电）', lo);
  await p.evaluate(() => applyGfx(-1)); await p.waitForTimeout(300);
}
// 防黑屏：画面循环被判定停了 2.5 秒就由看门狗重开，并且帧里出错会在屏幕上留提示
{
  const id0 = await p.evaluate(() => loopId);
  await p.evaluate(() => { window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; });   // 模拟循环断了
  await p.waitForTimeout(3200);
  await p.evaluate(() => { window.requestAnimationFrame = window.__raf; }); await p.waitForTimeout(4200);
  const r = await p.evaluate(() => ({ id: loopId, alive: performance.now() - lastFrameAt < 1000 }));
  check(r.id > id0 && r.alive, '画面循环停了会被看门狗重新拉起来', { id0, ...r });
  await p.evaluate(() => { const o = window.updatePInfo; window.updatePInfo = () => { throw new Error('boom'); }; setTimeout(() => { window.updatePInfo = o; }, 400); });
  await p.waitForTimeout(700);
  check(await p.evaluate(() => !!errBanner && !errBanner.hidden && errBanner.textContent.includes('boom')), '帧里出错时屏幕上有提示');
  for (let i = errs.length - 1; i >= 0; i--) if (errs[i] === 'boom') errs.splice(i, 1);
}
// 自动画质升降不能动战场画布（以前一降一升就把画布销毁重建，画面反复黑一下）
{
  const r = await p.evaluate(() => {
    setOpt('eco', true); autoIdx = 1; gfxDropped = false; autoRS = null; fpsEma = null; gfxAdaptCd = 0; applyGfx(-1); resizeSoon();
    return new Promise(res => setTimeout(() => {
      const size0 = cv.width + 'x' + cv.height, log0 = DIAG.length, rs0 = RS;
      for (let i = 0; i < 400; i++) adaptGfx(1 / 12, 30);          // 持续很卡：降档
      const dropped = GFX.name;
      for (let i = 0; i < 1500; i++) adaptGfx(1 / 30, 30);          // 之后一直流畅：不应该再升回去
      res({ size0, size1: cv.width + 'x' + cv.height, rs0, rs1: RS, dropped, after: GFX.name, canvasLogs: DIAG.slice(log0).filter(r => r[1] === '画布').length });
    }, 400));
  });
  check(r.dropped === '低' && r.after === '低', '卡了会降到「低」，之后不再来回升降', r);
  check(r.size0 === r.size1 && r.rs0 === r.rs1 && r.canvasLogs === 0, '自动升降画质时战场画布大小和倍数不变', r);
  const d = await p.evaluate(() => { showDiag(); const t = document.getElementById('ovbox').innerText; closeOverlay(); return t; });
  check(d.includes('诊断信息') && d.includes('战场画布') && d.includes('画质'), '菜单里有「诊断信息」页，能看到画布和画质记录');
}
noErrors(errs); report('heat'); await b.close(); })();
