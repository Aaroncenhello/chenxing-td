const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto(GAME);
  await pg.waitForTimeout(500);

  // 开一局，攒几张卡拉几个伙伴上来
  await pg.evaluate(() => { __td.newRun(2, {}); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => {
    const T = __td, S = T.S;
    for (let i = 0; i < 900; i++) {
      T.step(1 / 30);
      if (S.offer) { const u = S.offer.find(p => p.kind === 'unit') || S.offer[0]; T.pickCard(u.id); T.openOffer(); }
      if (S.shop) T.closeShop();
      if (S.event) T.takeEvent(0);
      if (S.over) break;
    }
    S.pending = 0; S.offer = null; S.shop = null; S.event = null; S.cine = null;
  });
  await pg.waitForTimeout(200);

  const r1 = await pg.evaluate(() => {
    const S = __td.S;
    return { form: __td.formOf().name, forms: __td.FORMS.map(f => f.name), units: S.units.length, btn: document.getElementById('btn-form').textContent };
  });
  console.log('初始阵型:', JSON.stringify(r1));

  // 切阵型：位置应该变
  const r2 = await pg.evaluate(() => {
    const S = __td.S, u = S.units[0];
    const before = [u.tx, u.ty];
    __td.cycleForm();
    const after = [u.tx, u.ty];
    return { name: __td.formOf().name, btn: document.getElementById('btn-form').textContent, moved: Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.1, save: JSON.parse(localStorage.getItem('chenxing-td-v2')).form };
  });
  console.log('切阵型:', JSON.stringify(r2));

  // 拖动：canvas 上按下 → 移动 → 抬起
  const drag = await pg.evaluate(async () => {
    const S = __td.S, cv = document.getElementById('cv'), r = cv.getBoundingClientRect();
    const u = S.units[0];
    const toPx = (tx, ty) => ({ x: r.left + (tx + 0.5) / 16 * r.width, y: r.top + (ty + 0.5) / 9 * r.height });
    const a = toPx(u.x, u.y), tgt = toPx(u.x + 1.6, u.y + 1.2);
    const ev = (type, p, extra) => cv.dispatchEvent(new PointerEvent(type, { clientX: p.x, clientY: p.y, bubbles: true, pointerId: 1, button: 0, ...extra }));
    ev('pointerdown', a);
    const started = !!S.drag;
    ev('pointermove', { x: (a.x + tgt.x) / 2, y: (a.y + tgt.y) / 2 });
    ev('pointermove', tgt);
    const moved = !!(S.drag && S.drag.moved);
    ev('pointerup', tgt);
    cv.dispatchEvent(new MouseEvent('click', { clientX: tgt.x, clientY: tgt.y, bubbles: true }));
    return { started, moved, slot: !!u.slot, tx: +u.tx.toFixed(2), ty: +u.ty.toFixed(2), sel: S.selUnit === u, name: u.def.name };
  });
  console.log('拖动:', JSON.stringify(drag));

  // 拖完的站位在跑逻辑之后要保持
  const keep = await pg.evaluate(() => {
    const S = __td.S, u = S.units[0], t0 = [u.tx, u.ty];
    for (let i = 0; i < 300; i++) __td.step(1 / 30);
    return { same: Math.hypot(u.tx - t0[0], u.ty - t0[1]) < 0.01, near: Math.hypot(u.x - u.tx, u.y - u.ty) < 1.2 };
  });
  console.log('站位保持:', JSON.stringify(keep));

  // 切阵型不应该动手动站位的人
  const stay = await pg.evaluate(() => {
    const S = __td.S, u = S.units[0], t0 = [u.tx, u.ty];
    __td.cycleForm();
    return { same: Math.hypot(u.tx - t0[0], u.ty - t0[1]) < 0.01 };
  });
  console.log('切阵型不动固定位:', JSON.stringify(stay));

  // 还原
  const clr = await pg.evaluate(() => {
    const S = __td.S, u = S.units[0];
    __td.clearSlot(u);
    return { slot: !!u.slot };
  });
  console.log('还原:', JSON.stringify(clr));

  // 存档里的阵型要带进下一局
  const persist = await pg.evaluate(async () => {
    const want = JSON.parse(localStorage.getItem('chenxing-td-v2')).form;
    __td.newRun(0, {});
    return { save: want, run: __td.S.formIdx, btn: document.getElementById('btn-form').textContent };
  });
  console.log('存档带入:', JSON.stringify(persist));

  await pg.evaluate(() => { for (let i = 0; i < 600; i++) __td.step(1 / 30); });
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: '/tmp/claude-0/-home-claude/c3db2331-c832-5f42-8a5e-c7e396d6461b/scratchpad/form10.png' });
  console.log(errs.length ? '错误: ' + errs.slice(0, 6).join(' | ') : '无报错');
  await b.close();
})();
