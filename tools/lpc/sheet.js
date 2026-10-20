// 把 out/*.png 里每个角色的「面朝右、走路第 1 帧」拼成对照图，看搭配对不对：node tools/lpc/sheet.js [输出 png]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out'), ids = Object.keys(require('./heroes.js')).filter(k => k !== 'ATK'); const dst = process.argv[2] || path.join(OUT, 'sheet.png');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const imgs = {}; for (const id of ids) imgs[id] = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.png')).toString('base64');
  await p.setContent('<body></body>');
  const url = await p.evaluate(async ([ids, imgs]) => { const SC = 3, cols = 7, cw = 64 * SC, ch = 64 * SC + 18, rows = Math.ceil(ids.length / cols); const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#4c9150'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < ids.length; i++) { const im = new Image(); im.src = imgs[ids[i]]; await im.decode(); const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; g.drawImage(im, 0, 11 * 64, 64, 64, x, y, 64 * SC, 64 * SC); g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(ids[i], x + 4, y + ch - 4); } return c.toDataURL(); }, [ids, imgs]);
  fs.writeFileSync(dst, Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
