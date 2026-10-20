// 矢量 Q 版角色：20 名角色在各种姿势下都能画出来（不报错、不是空白），转职外观和普通不同，静态头像可用
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 800, height: 600 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const bad = [], blank = [], same = [];
  const c = document.createElement('canvas'); c.width = 160; c.height = 160; const g = c.getContext('2d', { willReadFrequently: true });
  const states = [{ }, { walking: true }, { atkT: 0.05 }, { atkT: 0.12 }, { atkT: 0.2 }, { atkT: 0.3 }, { hurt: true }, { flash: true }, { skill: true, atkT: 0.2 }, { lv: 3 }, { lv: 4, branch: 'A' }, { lv: 4, branch: 'B' }];
  for (const D of UNITS) for (const s of states) {
    try { g.clearRect(0, 0, 160, 160); const ok = drawChibi(g, D, { t: 1.3, id: 3, face: -1, ...s }, 80, 130, 2); if (!ok) bad.push(D.id + ':nodraw');
      const d = g.getImageData(0, 0, 160, 160).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; if (n < 800) blank.push(D.id + JSON.stringify(s)); }
    catch (e) { bad.push(D.id + ':' + e.message); }
  }
  for (const D of UNITS) { const a = heroPic(D, { face: 1, lv: 4, branch: 'A' }).toDataURL(), b = heroPic(D, { face: 1, lv: 4, branch: 'B' }).toDataURL(), n = heroPic(D, { face: 1, lv: 1 }).toDataURL(); if (a === b || a === n) same.push(D.id); }
  // 头像画布
  const pc = document.createElement('canvas'); pc.style.width = '40px'; pc.style.height = '40px'; document.body.appendChild(pc); drawPortrait(UNITS[0], pc, 1); const pd = pc.getContext('2d').getImageData(0, 0, pc.width, pc.height).data; let pn = 0; for (let i = 0; i < pd.length; i += 4) if (pd[i] !== pd[0] || pd[i + 1] !== pd[1]) pn++;
  return { bad, blank, same, portraitDetail: pn };
});
check(r.bad.length === 0, '20 名角色 × 12 种姿势都能画出来', r.bad.slice(0, 5));
check(r.blank.length === 0, '每个姿势画出来都不是空白', r.blank.slice(0, 5));
check(r.same.length === 0, '每个角色 4 阶两个分支外观和普通不同', r.same);
check(r.portraitDetail > 100, '头像画布里有角色（不是纯色）', r.portraitDetail);
noErrors(errs); report('chibi'); await b.close(); })();
