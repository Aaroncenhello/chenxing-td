// 把 out/<id>.png（生成器导出的整张精灵表）裁成游戏要用的紧凑精灵表：只留面朝右的动画 + 一张正面站姿，存到 tools/lpc/pack/<id>.png 和 pack/meta.json
// meta[id] = { anims: { 名字: { y, fw, fh, n, ax, ay } }, atk: 出手动画名 }，ax/ay 是脚底锚点在帧里的位置
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SET = process.env.SET || 'heroes', OUT = path.join(__dirname, SET === 'heroes' ? 'out' : 'out-' + SET), PACK = path.join(__dirname, SET === 'heroes' ? 'pack' : 'pack-' + SET); fs.mkdirSync(PACK, { recursive: true });
const HEROES = require('./' + SET + '.js'), ATK = HEROES.ATK; delete HEROES.ATK; delete HEROES.META;
const STD = { walk: { row: 11, n: 9 }, cast: { row: 3, n: 7 }, thrust: { row: 7, n: 8 }, slash: { row: 15, n: 6 }, shoot: { row: 19, n: 13 }, hurt: { row: 20, n: 6 }, front: { row: 10, n: 1 } };
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setContent('<body></body>'); const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8')), packMeta = {};
  for (const id of Object.keys(HEROES)) {
    const src = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.png')).toString('base64');
    const r = await p.evaluate(async ([src, STD, custom, atkName, foes]) => {
      const im = new Image(); im.src = src; await im.decode(); const all = {};   // 全部可用动画
      for (const [name, s] of Object.entries(STD)) all[name] = { sy: s.row * 64, fw: 64, fh: 64, n: s.n };
      let y = 3456; for (const c of custom) { all[c.name] = { sy: y + 3 * c.fs, fw: c.fs, fh: c.fs, n: c.frames[3] }; y += c.fs * c.rows; }
      // 游戏里只要这几行：行走（有大尺寸行走就用它，武器才完整）、受击、正面站姿、施法、出手
      if (!all[atkName]) throw new Error('没有这段动画：' + atkName + '（可用：' + Object.keys(all).join(',') + '）');
      const pick = foes ? { walk: all.walk_128 || all.walk, cast: all.cast, atk: all[atkName] } : { walk: all.walk_128 || all.walk, hurt: all.hurt, front: all.front, cast: all.cast, atk: all[atkName] };   // 怪物只要行走、施法（放大招、治疗、召唤时用）和出手
      const rows = Object.entries(pick).map(([name, r]) => ({ name, ...r }));
      const W = Math.max(...rows.map(r => r.fw * r.n)), H = rows.reduce((a, r) => a + r.fh, 0); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); let dy = 0; const out = {};
      for (const r of rows) { g.drawImage(im, 0, r.sy, r.fw * r.n, r.fh, 0, dy, r.fw * r.n, r.fh); out[r.name] = { y: dy, fw: r.fw, fh: r.fh, n: r.n, ax: r.fw / 2, ay: r.fh / 2 + 26 }; dy += r.fh; }
      const wk = out.walk, d = g.getImageData(0, wk.y, wk.fw, wk.fh).data; let l = 1e9, t = 1e9, r = -1, bt = -1;   // 站姿（行走第 0 帧）的实际占位，相对脚底锚点
      for (let y = 0; y < wk.fh; y++) for (let x = 0; x < wk.fw; x++) if (d[(y * wk.fw + x) * 4 + 3] > 40) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bt) bt = y; }
      return { data: c.toDataURL('image/png'), anims: out, w: W, h: H, box: [l - wk.fw / 2, t - out.walk.fh / 2 - 26, r + 1 - wk.fw / 2, bt + 1 - wk.fh / 2 - 26] };
    }, [src, STD, meta[id].custom.map(c => ({ name: c.name, fs: c.fs, rows: c.rows, frames: c.frames })), ATK[id], SET !== 'heroes']);
    fs.writeFileSync(path.join(PACK, id + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); packMeta[id] = { anims: r.anims, atk: ATK[id], box: r.box };
    console.log(id, r.w + 'x' + r.h, Math.round(fs.statSync(path.join(PACK, id + '.png')).size / 1024) + 'KB', Object.keys(r.anims).join(','));
  }
  fs.writeFileSync(path.join(PACK, 'meta.json'), JSON.stringify(packMeta)); await b.close(); })();
