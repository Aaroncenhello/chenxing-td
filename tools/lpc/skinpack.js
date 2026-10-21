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
  for (const id of Object.keys(SK).filter(k => SK[k] && SK[k].s)) {
    packMeta[id] = { atk: ATK[id], std: stdOf(ATK[id]), parts: {} };
    for (const part of SK.partsOf(id)) {
      const key = id + '.' + part; if (!fs.existsSync(path.join(OUT, key + '.png'))) { console.log('缺', key); continue; }
      const src = 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, key + '.png')).toString('base64'), weapon = part === 'weapon';
      if (/^s1x\d+$/.test(part) || part === 'skin' || part === 'quiver') continue;   // 裁短图层和皮肤遮罩只是打包的原料，不进最终数据
      // 第 2 套外观的 2/3/4 阶：把裁短的图层（抹胸、比基尼裤 / 超短裙）叠到「身体 + 衣服」上，只画在露出皮肤的地方（衣服遮住的地方不动）
      let extra = null, mt = /^s1t(\d)$/.exec(part);
      if (mt) { const tr = SK.trims(id).filter(t => t.tier <= +mt[1]); if (tr.length) extra = { skin: 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.skin.png')).toString('base64'), trims: tr.map(t => ({ src: 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.s1x' + t.i + '.png')).toString('base64'), keep: t.keep })) }; }
      const stowSrc = weapon && SK[id].stow ? 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.quiver.png')).toString('base64') : null;   // 弓手 / 猎人：行走、站立、受击用只有箭袋的图（弓收起来）
      const r = await p.evaluate(async ([src, STD, custom, atkName, stdName, weapon, extra, curve, skinSrc, stowSrc]) => {
        const im = new Image(); im.src = src; await im.decode(); const all = {};
        let base = im, base2 = null; if (stowSrc) { base2 = new Image(); base2.src = stowSrc; await base2.decode(); }
        if (extra) {   // 叠裁短图层
          const load = async s => { const i = new Image(); i.src = s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0); return g; };
          const bg = await load(src), sg = await load(extra.skin), tgs = []; for (const t of extra.trims) tgs.push([await load(t.src), t.keep]);
          const rows = [[10, 1], [11, 9], [20, 6], [{ slash: 15, thrust: 7, shoot: 19, cast: 3 }[stdName], STD[stdName].n]];
          for (const [row, n] of rows) for (let f = 0; f < n; f++) {
            const bd = bg.getImageData(f * 64, row * 64, 64, 64), sd = sg.getImageData(f * 64, row * 64, 64, 64);
            for (const [tg, keep] of tgs) {
              const td = tg.getImageData(f * 64, row * 64, 64, 64); let top = 64, bot = -1;
              for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (td.data[(y * 64 + x) * 4 + 3] > 0) { if (y < top) top = y; if (y > bot) bot = y; }
              if (bot < 0) continue; const lim = top + Math.round((bot - top + 1) * keep);
              for (let y = top; y < lim; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4; if (td.data[i + 3] === 0 || sd.data[i + 3] === 0) continue;
                if (bd.data[i] === sd.data[i] && bd.data[i + 1] === sd.data[i + 1] && bd.data[i + 2] === sd.data[i + 2] && bd.data[i + 3] === sd.data[i + 3]) { bd.data[i] = td.data[i]; bd.data[i + 1] = td.data[i + 1]; bd.data[i + 2] = td.data[i + 2]; bd.data[i + 3] = td.data[i + 3]; } }
            }
            bg.putImageData(bd, f * 64, row * 64);
          }
          base = bg.canvas;
        }
        if (curve && skinSrc && !weapon) {   // 胸和臀加大：只处理朝右的侧面动画（行走、受击、出手），正面站姿不动
          const lo = async s => { const i = new Image(); i.src = s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0); return g; };
          const bctx = base === im ? await lo(src) : base.getContext('2d', { willReadFrequently: true }), sg2 = await lo(skinSrc);
          const [ac, ah] = curve, rows2 = [[11, 9], [20, 6], [{ slash: 15, thrust: 7, shoot: 19, cast: 3 }[stdName], STD[stdName].n]];
          for (const [row, n] of rows2) for (let f = 0; f < n; f++) {
            const srcd = bctx.getImageData(f * 64, row * 64, 64, 64), sd = sg2.getImageData(f * 64, row * 64, 64, 64), out = bctx.createImageData(64, 64); let top = 64, bot = -1;
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (sd.data[(y * 64 + x) * 4 + 3] > 0) { if (y < top) top = y; if (y > bot) bot = y; }
            if (bot < 0) continue; const H = bot - top + 1, cyC = top + H * 0.44, cyH = top + H * 0.64, sgm = H * 0.055;   // 身高按「只有身体和脸」的遮罩量，戴帽子也不会错位
            for (let y = 0; y < 64; y++) {
              const bc = ac * Math.exp(-(((y - cyC) / sgm) ** 2)), bh = ah * Math.exp(-(((y - cyH) / (sgm * 1.5)) ** 2));   // 胸（朝前，向右）和臀（朝后，向左）各一个高斯形的隆起
              for (let x = 0; x < 64; x++) { const xs = x > 32 ? Math.round(32 + (x - 32) / (1 + bc)) : Math.round(32 + (x - 32) / (1 + bh)); if (xs < 0 || xs > 63) continue; const si = (y * 64 + xs) * 4, di = (y * 64 + x) * 4; for (let k = 0; k < 4; k++) out.data[di + k] = srcd.data[si + k]; }
            }
            bctx.putImageData(out, f * 64, row * 64);
          }
          base = bctx.canvas;
        }
        for (const [name, s] of Object.entries(STD)) all[name] = { sy: s.row * 64, fw: 64, fh: 64, n: s.n };
        let y = 3456; for (const c of custom) { all[c.name] = { sy: y + 3 * c.fs, fw: c.fs, fh: c.fs, n: c.frames[3] }; y += c.fs * c.rows; }
        const pick = weapon ? { walk: base2 ? all.walk : all.walk_128 || all.walk, hurt: all.hurt, front: all.front, atk: all[atkName] || all[stdName] } : { walk: all.walk, hurt: all.hurt, front: all.front, atk: all[stdName] };
        const rows = Object.entries(pick).map(([name, r]) => ({ name, ...r })), W = Math.max(...rows.map(r => r.fw * r.n)), H = rows.reduce((a, r) => a + r.fh, 0);
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); let dy = 0; const out = {};
        for (const r of rows) { g.drawImage(base2 && r.name !== 'atk' ? base2 : base, 0, r.sy, r.fw * r.n, r.fh, 0, dy, r.fw * r.n, r.fh); out[r.name] = { y: dy, fw: r.fw, fh: r.fh, n: r.n, ax: r.fw / 2, ay: r.fh / 2 + 26 }; dy += r.fh; }
        return { data: c.toDataURL('image/png'), anims: out };
      }, [src, STD, (meta[key].custom || []), ATK[id], stdOf(ATK[id]), weapon, extra, SK[id].curve || null, weapon ? null : 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, id + '.skin.png')).toString('base64'), stowSrc]);
      fs.writeFileSync(path.join(PACK, key + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); packMeta[id].parts[part] = { anims: r.anims };
    }
    const kb = Object.keys(packMeta[id].parts).reduce((a, k) => a + fs.statSync(path.join(PACK, id + '.' + k + '.png')).size, 0) / 1024;
    console.log(id, Object.keys(packMeta[id].parts).length + ' 部件', Math.round(kb) + 'KB');
  }
  fs.writeFileSync(path.join(PACK, 'meta.json'), JSON.stringify(packMeta)); await b.close(); })();
