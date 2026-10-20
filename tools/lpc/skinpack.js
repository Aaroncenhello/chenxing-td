// 把 out-skins/<id>.<part>.png（生成器导出的整张精灵表）裁成游戏要用的紧凑小图，存到 tools/lpc/pack-skins/<id>.<part>.png + meta.json
//   身体类（nude / s0t2…s1t4）：walk / hurt / front / atk，全是 64 像素的标准动画，面朝右（放招也用 atk，所以不要 cast 行）
//   武器层（weapon）：同样四行，但行走和出手用大尺寸动画（128 / 192），武器叠在身体上面
// meta[id] = { atk: 出手动画名（weapon 层用）, std: 身体层出手用的标准动画名, parts: { part: { anims: { 名字: { y, fw, fh, n, ax, ay } } } } }，ax/ay 是脚底在帧里的位置
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SK = require('./skins.js'), HEROES = require('./heroes.js'), ATK = HEROES.ATK, OUT = path.join(__dirname, 'out-skins'), PACK = path.join(__dirname, 'pack-skins'); fs.mkdirSync(PACK, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8'));
const STD = { walk: { row: 11, n: 9 }, cast: { row: 3, n: 7 }, thrust: { row: 7, n: 8 }, slash: { row: 15, n: 6 }, shoot: { row: 19, n: 13 }, hurt: { row: 20, n: 6 }, front: { row: 10, n: 1 } };
const stdOf = n => (n.startsWith('slash') ? 'slash' : n.startsWith('thrust') ? 'thrust' : n.startsWith('shoot') ? 'shoot' : 'cast');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.setContent('<body></body>'); const packMeta = {};
  for (const id of Object.keys(SK).filter(k => k !== 'spec' && k !== 'PARTS')) {
    packMeta[id] = { atk: ATK[id], std: stdOf(ATK[id]), parts: {} };
    for (const part of SK.PARTS) {
      const key = id + '.' + part; if (!fs.existsSync(path.join(OUT, key + '.png'))) { console.log('缺', key); continue; }
      const src = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, key + '.png')).toString('base64'), weapon = part === 'weapon';
      const r = await p.evaluate(async ([src, STD, custom, atkName, stdName, weapon]) => {
        const im = new Image(); im.src = src; await im.decode(); const all = {};
        for (const [name, s] of Object.entries(STD)) all[name] = { sy: s.row * 64, fw: 64, fh: 64, n: s.n };
        let y = 3456; for (const c of custom) { all[c.name] = { sy: y + 3 * c.fs, fw: c.fs, fh: c.fs, n: c.frames[3] }; y += c.fs * c.rows; }
        const pick = weapon ? { walk: all.walk_128 || all.walk, hurt: all.hurt, front: all.front, atk: all[atkName] || all[stdName] } : { walk: all.walk, hurt: all.hurt, front: all.front, atk: all[stdName] };
        const rows = Object.entries(pick).map(([name, r]) => ({ name, ...r })), W = Math.max(...rows.map(r => r.fw * r.n)), H = rows.reduce((a, r) => a + r.fh, 0);
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); let dy = 0; const out = {};
        for (const r of rows) { g.drawImage(im, 0, r.sy, r.fw * r.n, r.fh, 0, dy, r.fw * r.n, r.fh); out[r.name] = { y: dy, fw: r.fw, fh: r.fh, n: r.n, ax: r.fw / 2, ay: r.fh / 2 + 26 }; dy += r.fh; }
        return { data: c.toDataURL('image/png'), anims: out };
      }, [src, STD, (meta[key].custom || []), ATK[id], stdOf(ATK[id]), weapon]);
      fs.writeFileSync(path.join(PACK, key + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); packMeta[id].parts[part] = { anims: r.anims };
    }
    const kb = Object.keys(packMeta[id].parts).reduce((a, k) => a + fs.statSync(path.join(PACK, id + '.' + k + '.png')).size, 0) / 1024;
    console.log(id, Object.keys(packMeta[id].parts).length + ' 部件', Math.round(kb) + 'KB');
  }
  fs.writeFileSync(path.join(PACK, 'meta.json'), JSON.stringify(packMeta)); await b.close(); })();
