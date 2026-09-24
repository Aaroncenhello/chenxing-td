// 阶段 4「爽感」回归测试：画质档位、打击感、预警、竖屏信息区、翻牌、结算、图鉴
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
const GFXcap = () => 800;   // 高画质上限 700，加上横幅等关键特效的余量
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, ver: 12, story: [...Array(16).keys()].map(i => 'pre' + i).concat([...Array(16).keys()].map(i => 'post' + i)) })));
  await p.reload(); await p.waitForTimeout(400);
  // 跑一段战斗，给各种特效一个真实环境
  const fight = (st, sec) => p.evaluate(([st, sec]) => {
    __td.newRun(st, { charLv: Object.fromEntries(__td.UNITS.map(u => [u.id, 8])) });
    const T = __td, S = T.S;
    for (let i = 0; i < 30 * sec && !S.over; i++) { if (S.offer) { T.pickCard(S.offer[0].id); T.openOffer(); } if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); T.step(1 / 30); }
    S.pending = 0; S.offer = null;
  }, [st, sec]);

  // ---------- 画质档位 ----------
  const g = await p.evaluate(() => {
    const out = {};
    showLevels(); out.auto = document.getElementById('btn-gfx').textContent;
    const cyc = []; for (let i = 0; i < 4; i++) { document.getElementById('btn-gfx').click(); cyc.push([loadSave().gfx, GFX.name]); }
    out.cyc = cyc;
    // 低画质：粒子数量打折、特效有上限
    applyGfx(0); __td.newRun(0, {}); const S = __td.S; S.fx = [];
    burst(5, 4, '#fff', 20, 2, 0.5, 0.05); out.lowParts = S.fx[0].parts.length;
    for (let i = 0; i < 1000; i++) burst(5, 4, '#fff', 4, 2, 5, 0.05);
    addFx({ kind: 'banner', text: '关键横幅', life: 2 });
    out.lowCount = S.fx.length; out.bannerKept = S.fx.some(f => f.kind === 'banner');
    applyGfx(2); S.fx = []; burst(5, 4, '#fff', 20, 2, 0.5, 0.05); out.highParts = S.fx[0].parts.length;
    applyGfx(loadSave().gfx);
    return out;
  });
  console.log('画质:', JSON.stringify(g));
  check(/画质 · 自动/.test(g.auto), '选关页有画质按钮，默认自动', g.auto);
  check(g.cyc.map(x => x[0]).join() === '0,1,2,-1' && g.cyc[0][1] === '低' && g.cyc[2][1] === '高', '画质按钮在 低/中/高/自动 之间切换并存档', g.cyc);
  check(g.lowParts === 6 && g.highParts === 20, '低画质粒子约三成、高画质全量', g);
  check(g.lowCount <= 201 && g.bannerKept, '特效数量有上限，但横幅这类关键反馈照常出现', g);

  // ---------- 打击感 ----------
  const h = await p.evaluate(() => {
    applyGfx(2); __td.newRun(3, {}); const S = __td.S; S.pending = 0; S.offer = null; S.fx = [];
    const u = S.units[0], e = spawnAt('orc', 5, 3, false); e.afx = []; S.fx = [];
    for (let i = 0; i < 5; i++) hurt(e, e.maxHp * 0.01, 'phys', false, u);   // 同一目标连续小伤害 → 合并成一个数字
    const nums = S.fx.filter(f => f.kind === 'text' && f.key === e.id);
    const out = { merged: nums.length, mergedVal: nums[0] && +nums[0].text, want: Math.round(e.maxHp * 0.05), sz1: nums[0] && nums[0].sz };
    hurt(e, e.maxHp * 0.4, 'magic', false, u);   // 一下打掉 4 成 → 最大号（颜色不同，单独一个数字）
    out.bigSz = S.fx.filter(f => f.kind === 'text' && f.key === e.id).map(f => f.sz);
    const el = spawnAt('goblin', 8, 3, true); el.afx = []; S.hitStop = 0; S.fx = [];
    hurt(el, el.maxHp * 3, 'phys', false, u);
    out.shatter = S.fx.filter(f => f.kind === 'shatter').map(f => f.blocks.length); out.hitStop = S.hitStop; out.ring = S.fx.some(f => f.kind === 'ring' && f.color === '#ffffff');
    applyGfx(0); S.fx = []; const w = spawnAt('wolf', 8, 5, false); w.afx = []; hurt(w, w.maxHp * 3, 'phys', false, u);
    out.lowCorpse = S.fx.some(f => f.kind === 'corpse') && !S.fx.some(f => f.kind === 'shatter');
    applyGfx(loadSave().gfx);
    return out;
  });
  console.log('打击感:', JSON.stringify(h));
  check(h.merged === 1 && Math.abs(h.mergedVal - h.want) <= 3 && h.sz1 === 2, '同一目标连续伤害合并成一个数字', h);
  check(h.bigSz.includes(4), '一下打掉 4 成血显示最大号数字', h.bigSz);
  check(h.shatter.length === 1 && h.shatter[0] >= 6, '敌人死亡碎成像素块', h.shatter);
  check(h.hitStop > 0 && h.ring, '击杀精英有顿帧和白色冲击环', h);
  check(h.lowCorpse, '低画质不碎裂，用原来的倒地', h.lowCorpse);
  // 实战跑一段，确认新特效不报错、特效数量受控
  await fight(11, 40);
  const fxN = await p.evaluate(() => __td.S.fx.length);
  check(fxN <= GFXcap(), '实战中特效数量在上限内', fxN);

  noErrors(errs);
  report('juice');
  await b.close();
})();
