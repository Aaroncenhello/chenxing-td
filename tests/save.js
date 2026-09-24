// 结算和存档的回归测试：每周记录不互相覆盖、每周/守望通关不误发主线成就和剧情、存档版本升级、坏存档清洗、导入备份和恢复
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
  // 今天的悬赏先标成已完成，免得结算时顺带完成一条、多出几颗星
  const w0 = await p.evaluate(() => { const B = todayBounties(); editSave(d => { d.bounty = { date: B.date, done: B.list.map(b => b.key) }; }); return { earned: starBank().earned, key: weekInfo().key, achv: loadSave().achv.length }; });
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

  // 3b) 结算可以不经过界面直接调（__td.settle），同一局只结算一次；主线通关在通关剧情播之前就把星星写好了
  await fresh({});
  await p.reload(); await p.waitForTimeout(400);
  const st = await p.evaluate(() => {
    const T = __td; T.newRun(7, {}); const S = T.S; S.pending = 0; S.offer = null;
    const b0 = starBank().earned;
    S.stars = 3; S.over = 'win';
    const R1 = T.settle(), b1 = starBank().earned, R2 = T.settle(), b2 = starBank().earned;
    return { mode: R1.mode, story: !!R1.story, same: R1 === R2, stars: loadSave().stars[7], achv: loadSave().achv, b0, b1, b2, reward: R1.reward };
  });
  console.log('直接结算:', JSON.stringify(st));
  check(st.mode === 'main' && st.stars === 3 && /通关奖励/.test(st.reward), '直接调结算：星级和通关奖励写进存档', st);
  check(st.story, '第 8 关首通带通关剧情（剧情在结算之后播，关掉页面也不丢奖励）', st.story);
  check(st.achv.includes('chapter2') && st.achv.includes('final'), '通关第 8 关解锁「第二章完结」「封印深渊」（配在关卡数据的 clearAchv 里）', st.achv);
  check(st.same && st.b2 === st.b1 && st.b1 > st.b0, '同一局重复结算不会重复发星星', st);
  // 配置自检：每个 clearAchv 都是真实存在的成就，主线通关类成就都挂在某一关上
  const cfg = await p.evaluate(() => {
    const ids = new Set(ACHV.map(a => a.id)), used = STAGES.flatMap(s => s.clearAchv || []);
    return { unknown: used.filter(id => !ids.has(id)), missing: ['first', 'chapter1', 'chapter2', 'chapter3', 'final', 'devourer', 'nameless'].filter(id => !used.includes(id)) };
  });
  check(!cfg.unknown.length && !cfg.missing.length, '关卡 clearAchv 配置和成就表对得上', cfg);

  // 4) 存档导出 → 清空 → 导入，每周记录完整保留
  const io = await p.evaluate(() => {
    editSave(d => { d.week = { W1: { clear: true, best: 12 }, W9: { clear: true, best: 12 } }; });
    const code = exportSave(), before = starBank().earned;
    localStorage.removeItem('chenxing-td-v2');
    const err = importSave(code);
    return { err, weeks: Object.keys(loadSave().week).length, same: starBank().earned === before };
  });
  check(io.err === null && io.weeks === 2 && io.same, '存档导出导入后每周记录和星星不变', io);

  // 5) 存档版本：旧存档（只有 v5/v11 标记、没有 ver）读进来补上版本号，并先自动备份
  const legacy = await p.evaluate(() => {
    localStorage.removeItem('chenxing-td-v2-backup');
    localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: [3, 2], v5: true, v11: true, tutorial: true, week: { W3: { clear: true, best: 12 } } }));
    const d = loadSave(), again = JSON.parse(localStorage.getItem('chenxing-td-v2')), bk = readBackup();
    return { ver: d.ver, savedVer: again.ver, week: again.week, bk: bk && bk.why, bkStars: bk && JSON.parse(bk.data).stars };
  });
  console.log('旧存档升级:', JSON.stringify(legacy));
  check(legacy.ver === 12 && legacy.savedVer === 12, '旧存档读进来升到当前版本并写回', legacy);
  check(legacy.week.W3 && legacy.week.W3.clear, '升级不丢数据', legacy.week);
  check(!!legacy.bk && legacy.bkStars.join() === '3,2', '升级前自动备份了原来的存档', legacy);

  // 10.x 以前的存档：星之祝福退还，提示标记要能留到选关页（以前白名单漏了 refunded，提示永远出不来）
  const refund = await p.evaluate(() => {
    localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: [3, 3, 3], perks: ['walls', 'veteran'], tutorial: true }));
    loadSave();
    return { refunded: loadSave().refunded, perks: loadSave().perks, exp: loadSave().chars.knight && loadSave().chars.knight.exp };
  });
  check(refund.refunded === 2 && refund.perks.length === 0 && refund.exp === 450, '10.x 存档：退还星之祝福、按通关数补经验、退还提示能留下来', refund);

  // 6) 导入被改坏的存档：类型不对、id 不认识的都清洗掉，页面照常能用
  const bad = await p.evaluate(() => {
    const raw = { stars: ['3', 'x', 9, null], best: ['12'], hero: '<img src=x onerror=alert(1)>', seen: ['slime', 'nope'], achv: ['first', 'fake'],
      disk: { atk: 999, zzz: 3, star: 'a' }, abyss: { 0: 99 }, week: { W1: { clear: 'yes', best: '8' }, W2: 5 }, bonusStars: '7', form: 99, chars: { knight: { exp: '100' } },
      use: { knight: { runs: '2', dmg: 'lots' } }, daily: { '2026-01-01': { wave: '4' } }, tal: { knight: { 0: 't_atk', 1: 5 } }, ver: 12 };   // 标成当前版本，只测清洗（不触发按通关数补经验的旧升级）
    const err = importSave('CX9-' + btoa(unescape(encodeURIComponent(JSON.stringify(raw)))));
    const d = loadSave(), bank = starBank();
    let menu = null; try { showLevels(); showSaveBox(); showPerks(); showCodex(); showAchv(); showRoster('knight'); closeOverlay(); } catch (e) { menu = e.message; }
    return { err, stars: d.stars, best: d.best, hero: d.hero, seen: d.seen, achv: d.achv, disk: d.disk, abyss: d.abyss, week: d.week, bonus: d.bonusStars, form: d.form, exp: d.chars.knight.exp, use: d.use.knight, tal: d.tal.knight, bank: bank.earned, menu };
  });
  console.log('坏存档:', JSON.stringify(bad));
  check(bad.err === null, '坏存档能导入（清洗后）', bad.err);
  check(bad.stars.join() === '3,0,3,0' && bad.best[0] === 12, '星级转成 0–3 的数字', { stars: bad.stars, best: bad.best });
  check(bad.hero === 'knight' && bad.seen.join() === 'slime' && bad.achv.join() === 'first', '不认识的英雄/敌人/成就 id 被丢掉', bad);
  check(bad.disk.atk === 10 && !('zzz' in bad.disk) && !('star' in bad.disk) && bad.abyss[0] === 20, '星盘和深渊层数夹在上限内', { disk: bad.disk, abyss: bad.abyss });
  check(bad.week.W1.clear === true && bad.week.W1.best === 8 && !bad.week.W2 && bad.bonus === 7 && bad.form === 1 && bad.exp === 100, '每周记录、星星、阵型、经验的类型被纠正', bad);
  check(bad.use.runs === 2 && !('dmg' in bad.use) && bad.tal[0] === 't_atk' && !(1 in bad.tal), '战绩和天赋里的坏值被丢掉', { use: bad.use, tal: bad.tal });
  check(typeof bad.bank === 'number' && isFinite(bad.bank), '星星账本算出来是正常数字', bad.bank);
  check(bad.menu === null, '导入坏存档后各个菜单页都能打开', bad.menu);

  // 7) 导入前自动备份，能恢复，恢复后还能换回来；更新版本的存档拒绝导入
  const swap = await p.evaluate(() => {
    localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: [3, 3, 3, 3, 3], ver: 12, tutorial: true }));
    const mine = starBank().earned;
    const err = importSave(exportSaveOf({ stars: [1], ver: 12 }));
    const imported = starBank().earned, why = readBackup().why;
    const ok = restoreBackup(), back = starBank().earned, why2 = readBackup().why;
    restoreBackup(); const again = starBank().earned;
    const future = importSave(exportSaveOf({ stars: [3], ver: 999 })), after = starBank().earned;
    return { err, mine, imported, why, ok, back, why2, again, future, after };
    function exportSaveOf(o) { return 'CX9-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
  });
  console.log('备份恢复:', JSON.stringify(swap));
  check(swap.err === null && swap.imported < swap.mine && /导入/.test(swap.why), '导入别的存档前自动备份了自己的进度', swap);
  check(swap.ok && swap.back === swap.mine, '一键恢复回导入前的进度', swap);
  check(swap.again === swap.imported, '恢复后还能再换回来', swap);
  check(/更新的版本/.test(swap.future || '') && swap.after === swap.imported, '更新版本的存档拒绝导入、当前进度不动', swap);

  // 存档页上有恢复按钮
  const btn = await p.evaluate(() => { showSaveBox(); const has = !!document.getElementById('btn-svbak'); closeOverlay(); return has; });
  check(btn, '存档页显示「恢复备份」按钮');

  noErrors(errs);
  report('save');
  await b.close();
})();
