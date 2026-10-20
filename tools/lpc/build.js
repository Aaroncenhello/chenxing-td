// 用本地跑着的 Universal LPC 生成器（http://127.0.0.1:5199，vite dev）把 heroes.js 里的搭配渲染成精灵表，存到 tools/lpc/out/<id>.png
// 用法：先在生成器仓库里 `npx vite --port 5199`，再 `node tools/lpc/build.js [id,id,...]`
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SET = process.env.SET || 'heroes';   // heroes = 20 名角色，foes = 怪物
const HEROES = require('./' + SET + '.js'); delete HEROES.ATK; delete HEROES.META; const OUT = path.join(__dirname, SET === 'heroes' ? 'out' : 'out-' + SET); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(HEROES), b = await chromium.launch(), meta = fs.existsSync(path.join(OUT, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8')) : {};
  for (const id of only) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => console.log('ERR', id, e.message));
    await p.goto('http://127.0.0.1:5199/#' + HEROES[id]); await p.waitForTimeout(500);
    await p.waitForFunction(() => window.__LPC_waitCatalogAllReady, null, { timeout: 30000 }); await p.evaluate(() => window.__LPC_waitCatalogAllReady());
    await p.getByLabel('Show transparency grid').uncheck().catch(() => {});   // 预览画布默认把棋盘格画进像素里，导出前要关掉
    let last = -1, same = 0;
    for (let i = 0; i < 50 && same < 4; i++) { await p.waitForTimeout(400); const n = await p.evaluate(() => { const c = document.getElementById('spritesheet-preview'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i]) n++; return n; }); if (n === last && n > 0) same++; else same = 0; last = n; }
    const r = await p.evaluate(async () => { const m = await import('/sources/canvas/preview-animation.ts'); const ca = m.getCustomAnimations(); const c = document.getElementById('spritesheet-preview');
      return { data: c.toDataURL('image/png'), w: c.width, h: c.height, custom: Object.entries(ca).map(([k, v]) => ({ name: k, fs: v.frameSize, rows: v.frames.length, cols: v.frames[0].length, frames: v.frames.map(f => f.length) })), sel: [...document.querySelectorAll('[class*=selection] , .tag')].map(e => e.textContent.trim()).slice(0, 30) }; });
    // 署名：点生成器的「Credits (CSV)」下载这套搭配用到的所有素材的作者 / 许可证
    try { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.getByText('Credits (CSV)').click()]); const cp = await dl.path(); fs.copyFileSync(cp, path.join(OUT, id + '.credits.csv')); } catch (e) { console.log('署名下载失败', id, e.message); }
    fs.writeFileSync(path.join(OUT, id + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); meta[id] = { w: r.w, h: r.h, custom: r.custom };
    console.log(id, r.w + 'x' + r.h, r.custom.map(c => c.name + ':' + c.fs).join(','), '| 未识别:', r.sel.length); await p.close();
  }
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1)); await b.close();
})();
