// 批次 J：打击感（分级顿帧、暴击击退、出手强调、数字分类、挨打压扁不报错）
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = {}; __td.newRun(2, { hero: 'knight', charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.cine = null;
  const u = S.units[0];
  // 精英被暴击：轻微顿帧，冷却内不重复
  const el = spawnAt('orc', 6, 4, true, false); el.hp = el.maxHp = 1e9; S.hitStop = 0; S.hitStopCd = 0; hurt(el, 1000, 'phys', true, u); out.stop1 = S.hitStop; S.hitStop = 0; hurt(el, 1000, 'phys', true, u); out.stop2 = S.hitStop;
  // 普通怪被暴击：被推开一点
  const w = spawnAt('goblin', 6, 4, false, false); w.hp = w.maxHp = 1e9; const d0 = toCrystal(w); hurt(w, 1000, 'phys', true, u); out.knock = +(toCrystal(w) - d0).toFixed(2);
  // 技能出手：定格 + 冲击线
  S.hitStop = 0; u.sp = u.def.sp; useSkill(u); out.cast = { stop: S.hitStop, lines: S.fx.some(f => f.kind === 'burstlines') };
  // 治疗数字带 +
  const a = S.units[0]; a.hp = 1; heal(a, 50, false, null); out.healTxt = S.fx.filter(f => f.kind === 'text' && f.color === '#7ee89c').map(f => f.text)[0];
  // 画一帧：压扁、数字、冲击线都不报错
  hurt(w, 10, 'phys', false, u); w.hitT = 0.12; w.kb = 1.6; let err = null; try { for (let i = 0; i < 20; i++) { render(1000 + i * 33); __td.step(1 / 30); } } catch (e) { err = String(e); } out.err = err;
  // 减少闪光：不顿帧
  OPT.calm = true; S.hitStop = 0; S.hitStopCd = 0; hurt(el, 1000, 'phys', true, u); out.calm = S.hitStop; OPT.calm = false;
  return out; });
console.log(JSON.stringify(r));
check(r.stop1 > 0 && r.stop1 < 0.06 && r.stop2 === 0, '精英暴击轻顿帧，冷却内不重复', { a: r.stop1, b: r.stop2 });
check(r.knock > 0.1, '普通怪暴击被推开', r.knock);
check(r.cast.stop > 0 && r.cast.lines, '技能出手有定格和冲击线', r.cast);
check(r.healTxt && r.healTxt.startsWith('+'), '治疗数字带加号', r.healTxt);
check(!r.err, '压扁、暴击描边、冲击线绘制不报错', r.err);
check(r.calm === 0, '「减少闪光」开着时不顿帧', r.calm);
noErrors(errs); report('feel'); await b.close(); })();
