// 把 out/<id>.png（生成器导出的整张精灵表）裁成游戏要用的紧凑精灵表：只留面朝右的动画 + 一张正面站姿，存到 tools/lpc/pack/<id>.png 和 pack/meta.json
// meta[id] = { anims: { 名字: { y, fw, fh, n, ax, ay } }, atk: 出手动画名 }，ax/ay 是脚底锚点在帧里的位置
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out'), PACK = path.join(__dirname, 'pack'); fs.mkdirSync(PACK, { recursive: true });
const HEROES = require('./heroes.js'), ATK = HEROES.ATK; delete HEROES.ATK;
const STD = { walk: { row: 11, n: 9 }, cast: { row: 3, n: 7 }, thrust: { row: 7, n: 8 }, slash: { row: 15, n: 6 }, shoot: { row: 19, n: 13 }, hurt: { row: 20, n: 6 }, front: { row: 10, n: 1 } };
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setContent('<body></body>'); const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8')), packMeta = {};
  for (const id of Object.keys(HEROES)) {
    const src = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.png')).toString('base64');
    const r = await p.evaluate(async ([src, STD, custom, atkName]) => {
      const im = new Image(); im.src = src; await im.decode(); const all = {};   // 全部可用动画
      for (const [name, s] of Object.entries(STD)) all[name] = { sy: s.row * 64, fw: 64, fh: 64, n: s.n };
      let y = 3456; for (const c of custom) { all[c.name] = { sy: y + 3 * c.fs, fw: c.fs, fh: c.fs, n: c.frames[3] }; y += c.fs * c.rows; }
      // 游戏里只要这几行：行走（有大尺寸行走就用它，武器才完整）、受击、正面站姿、施法、出手
      const pick = { walk: all.walk_128 || all.walk, hurt: all.hurt, front: all.front, cast: all.cast, atk: all[atkName] };
      const rows = Object.entries(pick).map(([name, r]) => ({ name, ...r }));
      const W = Math.max(...rows.map(r => r.fw * r.n)), H = rows.reduce((a, r) => a + r.fh, 0); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); let dy = 0; const out = {};
      for (const r of rows) { g.drawImage(im, 0, r.sy, r.fw * r.n, r.fh, 0, dy, r.fw * r.n, r.fh); out[r.name] = { y: dy, fw: r.fw, fh: r.fh, n: r.n, ax: r.fw / 2, ay: r.fh / 2 + 26 }; dy += r.fh; }
      return { data: c.toDataURL('image/png'), anims: out, w: W, h: H };
    }, [src, STD, meta[id].custom.map(c => ({ name: c.name, fs: c.fs, rows: c.rows, frames: c.frames })), ATK[id]]);
    fs.writeFileSync(path.join(PACK, id + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); packMeta[id] = { anims: r.anims, atk: ATK[id] };
    console.log(id, r.w + 'x' + r.h, Math.round(fs.statSync(path.join(PACK, id + '.png')).size / 1024) + 'KB', Object.keys(r.anims).join(','));
  }
  fs.writeFileSync(path.join(PACK, 'meta.json'), JSON.stringify(packMeta)); await b.close(); })();
