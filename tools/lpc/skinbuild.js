// 渲染外观：把 skins.js 里每名角色的各个部分（裸体 / 6 个阶段 / 武器）用本地生成器渲染成精灵表，存到 tools/lpc/out-skins/<id>.<part>.png
// 用法：先在生成器仓库里 `npx vite --port 5199`，再 `node tools/lpc/skinbuild.js [id,id,...] [part,part,...]`（不写 = 全部），3 个页面并行
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SK = require('./skins.js'), OUT = path.join(__dirname, 'out-skins'); fs.mkdirSync(OUT, { recursive: true });
const ids = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : Object.keys(SK).filter(k => SK[k] && SK[k].s);
const arg = process.argv[3];   // 不写 = 全部；bikini = 第 2 套外观相关的（skin、s1t2–4、裁短图层）；也可以写部件名列表
const partsFor = id => (!arg ? SK.partsOf(id) : arg === 'bikini' ? ['skin', 's1t2', 's1t3', 's1t4', ...SK.trims(id).map(t => 's1x' + t.i)] : arg.split(','));
(async () => {
  const b = await chromium.launch(), jobs = []; for (const id of ids) for (const part of partsFor(id)) jobs.push([id, part]);
  const metaFile = path.join(OUT, 'meta.json'), meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  let next = 0, done = 0;
  async function worker() {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.on('pageerror', e => console.log('ERR', e.message));
    while (next < jobs.length) {
      const [id, part] = jobs[next++], key = id + '.' + part;
      try {
        await p.goto('http://127.0.0.1:5199/#' + SK.spec(id, part)); await p.reload(); await p.waitForTimeout(400);
        await p.waitForFunction(() => window.__LPC_waitCatalogAllReady, null, { timeout: 30000 }); await p.evaluate(() => window.__LPC_waitCatalogAllReady());
        await p.getByLabel('Show transparency grid').uncheck().catch(() => {});
        let last = -1, same = 0;
        for (let i = 0; i < 50 && same < 3; i++) { await p.waitForTimeout(350); const n = await p.evaluate(() => { const c = document.getElementById('spritesheet-preview'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i]) n++; return n; }); if (n === last && n > 0) same++; else same = 0; last = n; }
        const r = await p.evaluate(async () => { const m = await import('/sources/canvas/preview-animation.ts'); const ca = m.getCustomAnimations(); const c = document.getElementById('spritesheet-preview'); return { data: c.toDataURL('image/png'), w: c.width, h: c.height, custom: Object.entries(ca).map(([k, v]) => ({ name: k, fs: v.frameSize, rows: v.frames.length, cols: v.frames[0].length, frames: v.frames.map(f => f.length) })) }; });
        if (!/nude|weapon/.test(part) || part === 'nude' || part === 'weapon') { try { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 12000 }), p.getByText('Credits (CSV)').click()]); fs.copyFileSync(await dl.path(), path.join(OUT, key + '.credits.csv')); } catch (e) { console.log('署名下载失败', key); } }
        fs.writeFileSync(path.join(OUT, key + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); meta[key] = { w: r.w, h: r.h, custom: r.custom };
        console.log(++done + '/' + jobs.length, key, r.w + 'x' + r.h, r.custom.map(c => c.name + ':' + c.fs).join(','));
      } catch (e) { console.log('失败', key, e.message.slice(0, 100)); }
    }
    await p.close();
  }
  await Promise.all([worker(), worker(), worker()]);
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 1)); await b.close();
})();
