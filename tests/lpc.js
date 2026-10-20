// 角色精灵（LPC 素材）：20 名角色的精灵表都能加载，各种状态画得出来、不是空白，转职外观和普通不同，头像里有角色
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 800, height: 600 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.waitForFunction(() => typeof lpcReady !== 'undefined' && lpcReady, null, { timeout: 15000 }).catch(() => {});
const r = await p.evaluate(() => {
  const bad = [], blank = [], same = [], missing = [];
  const c = document.createElement('canvas'); c.width = 260; c.height = 260; const g = c.getContext('2d', { willReadFrequently: true });
  const states = [{}, { walking: true }, { atkT: 0.05 }, { atkT: 0.2 }, { atkT: 0.38 }, { hurt: true }, { flash: true }, { skill: true }, { down: true }, { lv: 3 }, { lv: 4, branch: 'A' }, { lv: 4, branch: 'B' }];
  for (const D of UNITS) {
    if (!lpcOk(D.id)) { missing.push(D.id); continue; }
    for (const s of states) { try { g.clearRect(0, 0, 260, 260); const ok = drawLpc(g, D, { t: 1.3, id: 3, face: -1, ...s }, 130, 200, 1.5); if (!ok) bad.push(D.id + ':nodraw');
      const d = g.getImageData(0, 0, 260, 260).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; if (n < 300) blank.push(D.id + JSON.stringify(s)); } catch (e) { bad.push(D.id + ':' + e.message); } }
  }
  for (const D of UNITS) { const a = heroPic(D, { face: 1, lv: 4, branch: 'A' }).toDataURL(), b2 = heroPic(D, { face: 1, lv: 4, branch: 'B' }).toDataURL(), n = heroPic(D, { face: 1, lv: 1 }).toDataURL(); if (a === b2 || a === n) same.push(D.id); }
  const pc = document.createElement('canvas'); pc.style.width = '40px'; pc.style.height = '40px'; document.body.appendChild(pc); drawPortrait(UNITS[0], pc, 1); const pd = pc.getContext('2d').getImageData(0, 0, pc.width, pc.height).data; let pn = 0; for (let i = 0; i < pd.length; i += 4) if (pd[i] !== pd[0] || pd[i + 1] !== pd[1]) pn++;
  return { bad, blank, same, missing, portraitDetail: pn, credits: typeof LPC_CREDITS !== 'undefined' && LPC_CREDITS.authors.length > 10 && LPC_CREDITS.items.length > 20 };
});
check(r.missing.length === 0, '20 名角色的精灵表都加载好了', r.missing);
check(r.bad.length === 0, '20 名角色 × 12 种状态都能画出来', r.bad.slice(0, 5));
check(r.blank.length === 0, '每个状态画出来都不是空白', r.blank.slice(0, 5));
check(r.same.length === 0, '每个角色 4 阶两个分支的头像和普通不同', r.same);
check(r.portraitDetail > 100, '头像画布里有角色（不是纯色）', r.portraitDetail);
check(r.credits, '素材署名数据齐全（作者、素材明细）');
await p.evaluate(() => showCredits()); await p.waitForTimeout(200);
check(await p.evaluate(() => document.getElementById('ovbox').innerText.includes('Liberated Pixel Cup')), '「素材署名」页能打开');
noErrors(errs); report('lpc'); await b.close(); })();
