// 结算和存档的回归测试：每周记录不互相覆盖、每周/守望通关不误发主线成就和剧情
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
// 只有主线通关才该发的成就（结算页 showResult 里按关卡/难度发的那些）
const STAGE_ACHV = ['first', 'perfect', 'solo', 'chapter1', 'chapter2', 'chapter3', 'devourer', 'final', 'nameless', 'hard', 'nightmare'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME); await p.waitForTimeout(300);
  const fresh = extra => p.evaluate(extra => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, v5: true, v11: true, story: [...Array(16).keys()].map(i => 'pre' + i), ...extra })), extra);
  // 让结算直接跑完：S.over 设好后等浏览器跑几帧，checkOver 在 frame() 里
  const finish = async (fn, arg) => { await p.evaluate(fn, arg); await p.waitForTimeout(600); };

  // 1) 每周挑战通关，不能把以前各周的记录冲掉
  await fresh({ week: { W1: { clear: true, best: 12 }, W2: { clear: false, best: 7 } } });
  await p.reload(); await p.waitForTimeout(400);
  const w0 = await p.evaluate(() => ({ earned: starBank().earned, key: weekInfo().key, achv: loadSave().achv.length }));
  await finish(() => { const wi = weekInfo(); __td.newRun(wi.stage, { week: wi, diff: wi.diff }); const S = __td.S; S.pending = 0; S.offer = null; S.over = 'win'; });
  const w1 = await p.evaluate(() => ({ week: loadSave().week, earned: starBank().earned, achv: loadSave().achv, story: loadSave().story.filter(k => k.startsWith('post')), h: document.querySelector('#ovbox h2').textContent }));
  console.log('每周通关:', JSON.stringify({ w0, w1 }));
  check(w1.h === '每周挑战完成', '每周挑战结算页正常显示', w1.h);
  check(w1.week.W1 && w1.week.W1.clear && w1.week.W2 && w1.week.W2.best === 7, '以前各周的记录还在', w1.week);
  check(w1.week[w0.key] && w1.week[w0.key].clear, '本周记录为已通关', w1.week[w0.key]);
  // 结算发经验时可能顺带解锁「全员」「10 级」这类账号成就（每个 +1★），那是正常的，要扣掉
  check(w1.earned - (w1.achv.length - w0.achv) === w0.earned + 5 + 1, '星星 = 原来 + 本周首通 5★ + 通关奖励 1★（不算顺带解锁的账号成就）', { before: w0.earned, after: w1.earned, achv: w1.achv });
  check(!w1.achv.some(a => STAGE_ACHV.includes(a)), '每周挑战通关不发主线成就（困难通关、章节等）', w1.achv);
  check(w1.story.length === 0, '每周挑战通关不播关卡通关剧情', w1.story);

  // 再通关一次本周：记录不变，只给 +1★
  await finish(() => { const wi = weekInfo(); __td.newRun(wi.stage, { week: wi, diff: wi.diff }); const S = __td.S; S.pending = 0; S.offer = null; S.over = 'win'; });
  const w2 = await p.evaluate(() => ({ n: Object.keys(loadSave().week).length, earned: starBank().earned, achv: loadSave().achv.length }));
  check(w2.n === 3 && w2.earned - (w2.achv - w1.achv.length) === w1.earned + 1, '重复通关本周只加 1★、记录条数不变', { w2, before: w1.earned });

  // 2) 守望之战通关：S.stage 是解锁到的最后一关，不能因此发章节成就或播那一关的通关剧情
  await fresh({});
  await p.reload(); await p.waitForTimeout(400);
  await finish(() => { __td.newRun(11, { vigil: true, seed: 12345 }); const S = __td.S; S.pending = 0; S.offer = null; S.over = 'win'; });
  const v = await p.evaluate(() => ({ achv: loadSave().achv, vigil: loadSave().vigil, story: loadSave().story.filter(k => k.startsWith('post')), h: document.querySelector('#ovbox h2').textContent }));
  console.log('守望通关:', JSON.stringify(v));
  check(v.h === '长夜守望成功' && v.vigil.clear, '守望之战结算并记录通关', v);
  check(!v.achv.some(a => STAGE_ACHV.includes(a)), '守望之战通关不发主线成就', v.achv);
  check(v.story.length === 0, '守望之战通关不播关卡通关剧情', v.story);

  // 3) 主线通关照常播通关剧情（成就要等剧情播完进结算页才发，这里不等）
  await fresh({});
  await p.reload(); await p.waitForTimeout(400);
  await finish(() => { __td.newRun(3, {}); const S = __td.S; S.pending = 0; S.offer = null; S.stars = 2; S.over = 'win'; });
  const m = await p.evaluate(() => ({ story: loadSave().story.filter(k => k.startsWith('post')) }));
  console.log('主线通关:', JSON.stringify(m));
  check(m.story.includes('post3'), '主线通关会播通关剧情', m.story);

  // 4) 存档导出 → 清空 → 导入，每周记录完整保留
  const io = await p.evaluate(() => {
    editSave(d => { d.week = { W1: { clear: true, best: 12 }, W9: { clear: true, best: 12 } }; });
    const code = exportSave(), before = starBank().earned;
    localStorage.removeItem('chenxing-td-v2');
    const err = importSave(code);
    return { err, weeks: Object.keys(loadSave().week).length, same: starBank().earned === before };
  });
  check(io.err === null && io.weeks === 2 && io.same, '存档导出导入后每周记录和星星不变', io);

  noErrors(errs);
  report('save');
  await b.close();
})();
