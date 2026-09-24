// 阶段 4「爽感」回归测试：画质档位、打击感、预警、竖屏信息区、翻牌、结算、图鉴
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
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

  noErrors(errs);
  report('juice');
  await b.close();
})();
