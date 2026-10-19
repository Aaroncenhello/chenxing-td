// 竖屏大画面：战场转 90° 后，点选 / 集火 / 拖动站位 / 陨星落点都要落在对的格子上；横屏不受影响
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = [];
const prep = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(GAME); await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ tutorial: true, ver: 13, stars: new Array(19).fill(3), story: [...Array(20).keys()].map(i => 'pre' + i) }))); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('chenxing-td-news', '12.0'); closeOverlay(); startRun(0, { hero: 'mage', charOpen: UNITS.map(u => u.id) }); const S = __td.S; S.pending = 0; S.offer = null; S.cine = null; S.autoWave = false; for (const id of ['knight', 'archer', 'priest']) pickCard('ally_' + id); for (let i = 0; i < 10; i++) __td.step(1 / 30); });
  await p.waitForTimeout(300); return p;
};
// 把游戏里的格子坐标换算成屏幕坐标（页面里用同一个 tpx，再按画布缩放）
const toScreen = (p, x, y) => p.evaluate(([x, y]) => { const r = cv.getBoundingClientRect(), [px, py] = tpx(x, y); return { x: r.left + px / PW * r.width, y: r.top + py / PHt * r.height + 8 / PHt * r.height }; }, [x, y]);
for (const [w, h, wantRot] of [[390, 844, true], [844, 390, false]]) {
  const p = await prep(w, h); const rot = await p.evaluate(() => ROT); check(rot === wantRot, `${w}×${h} 竖屏大画面 ${wantRot ? '开' : '关'}`, rot);
  const info = await p.evaluate(() => { const S = __td.S; return { units: S.units.map(u => ({ id: u.id, x: u.x, y: u.y })) }; });
  // 1) 点选队员
  const u = info.units[1], pos = await toScreen(p, u.x, u.y);
  await p.mouse.click(pos.x, pos.y - 14); await p.waitForTimeout(120);
  const sel = await p.evaluate(() => (__td.S.selUnit || {}).id); check(sel === u.id, `${w}×${h} 点队员能选中`, { sel, want: u.id });
  // 2) 点敌人 = 集火
  const e = await p.evaluate(() => { const S = __td.S; const e = spawnAt('goblin', 11, 2, false, false); e.speed = 0; e.hp = e.maxHp = 1e9; return { x: e.x, y: e.y, id: e.id }; });
  const ep = await toScreen(p, e.x, e.y); await p.mouse.click(ep.x, ep.y - 14); await p.waitForTimeout(120);
  const foc = await p.evaluate(() => (__td.S.focus || {}).id); check(foc === e.id, `${w}×${h} 点敌人能集火`, { foc, want: e.id });
  // 3) 拖动队员到目标点（固定站位）
  const tgt = { x: 6.0, y: 6.2 }, sp = await toScreen(p, u.x, u.y), tp = await toScreen(p, tgt.x, tgt.y);
  await p.mouse.move(sp.x, sp.y - 14); await p.mouse.down(); await p.mouse.move((sp.x + tp.x) / 2, (sp.y + tp.y) / 2 - 14, { steps: 4 }); await p.mouse.move(tp.x, tp.y - 14, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150);
  const slot = await p.evaluate(id => { const uu = __td.S.units.find(x => x.id === id); return { slot: !!uu.slot, tx: uu.tx, ty: uu.ty }; }, u.id);
  const near = Math.hypot(slot.tx - tgt.x, slot.ty - tgt.y);
  check(slot.slot && near < 1.2, `${w}×${h} 拖动队员能固定站位（落点误差 ${near.toFixed(2)} 格）`, { slot, tgt });
  // 4) 陨星落点
  await p.evaluate(() => { __td.S.spellMode = 'meteor'; __td.S.spells.meteor = 0; window.__cs = null; const o = window.castSpell; window.castSpell = (...a) => { window.__cs = a; return o(...a); }; });
  await p.waitForTimeout(350); const mp = await toScreen(p, 4, 3); await p.mouse.click(mp.x, mp.y); await p.waitForTimeout(100);
  const met = await p.evaluate(() => window.__cs && [window.__cs[1], window.__cs[2]]);
  check(met && Math.hypot(met[0] - 4, met[1] - 3) < 0.8, `${w}×${h} 陨星落点在点的位置`, met);
  await p.context().close();
}
// 压力：竖屏大画面下换几张有水 / 熔岩 / 机关 / 天气 / 首领演出的地图跑一会，每 10 步画一帧，不能报错
{
  const p = await prep(390, 844);
  const r = await p.evaluate(() => { const bad = []; for (const st of [2, 3, 5, 10, 14, 16, 17, 18, 19]) { try {
    startRun(st, { hero: 'mage', charOpen: UNITS.map(u => u.id) }); const S = __td.S; S.pending = 0; S.offer = null; S.autoWave = true; for (const id of ['knight', 'archer', 'priest']) pickCard('ally_' + id);
    S.wave = Math.max(1, ST.waves - 1); S.cine = null; const e = spawnAt(ST.boss && ST.boss[0] ? ST.boss[0][0] : 'orc', 5, 4, true, false); if (isBoss(e)) { S.boss = e; startCine(e); }
    for (let i = 0; i < 300; i++) { S.shop = null; S.event = null; S.offer = null; S.crystal.hp = S.crystal.maxHp; __td.step(1 / 30); if (i % 10 === 0) render(1000 + i * 33); }
  } catch (ex) { bad.push(st + ':' + ex); } } return { bad, rot: ROT }; });
  check(r.rot && r.bad.length === 0, '竖屏大画面下 9 张地图跑 10 秒 + 首领演出都能画', r);
  await p.context().close();
}
noErrors(errs); report('big'); await b.close(); })();
