// 把 pack*/*.png + meta.json 打成 src/ 里的数据文件（图片转 base64 内嵌进单文件网页）：
//   SET=skins → src/lpc-data.js（角色：每人 裸体 + 2 套外观 × 3 阶段 + 武器层）；SET=foes → src/lpc-foe-data.js（怪物）
const SKINS_MODE = process.env.SET === 'skins';
if (SKINS_MODE) {
  const fs = require('fs'), path = require('path'), PACK = path.join(__dirname, 'pack-skins'), meta = JSON.parse(fs.readFileSync(path.join(PACK, 'meta.json'), 'utf8')), out = {};
  for (const id of Object.keys(meta)) { out[id] = { atk: meta[id].atk, std: meta[id].std, parts: {} }; for (const [part, m] of Object.entries(meta[id].parts)) out[id].parts[part] = { src: 'data:image/png;base64,' + fs.readFileSync(path.join(PACK, id + '.' + part + '.png')).toString('base64'), anims: m.anims }; }
  fs.writeFileSync(path.join(__dirname, '../../src/lpc-data.js'), '// 由 tools/lpc/embed.js（SET=skins）生成，别手改。角色精灵：每人 nude（裸体）/ s0t2…s1t4（两套外观的 2、3、4 阶）/ weapon（武器层），署名见游戏内「素材署名」\nconst LPC_PACK = ' + JSON.stringify(out) + ';\n');
  console.log('src/lpc-data.js', Math.round(fs.statSync(path.join(__dirname, '../../src/lpc-data.js')).size / 1024) + 'KB'); process.exit(0);
}
const fs = require('fs'), path = require('path'); const SET = process.env.SET || 'heroes', foes = SET !== 'heroes';
const PACK = path.join(__dirname, foes ? 'pack-' + SET : 'pack'), meta = JSON.parse(fs.readFileSync(path.join(PACK, 'meta.json'), 'utf8'));
const out = {}; for (const id of Object.keys(meta)) out[id] = { src: 'data:image/png;base64,' + fs.readFileSync(path.join(PACK, id + '.png')).toString('base64'), anims: meta[id].anims, atk: meta[id].atk, box: meta[id].box };
const file = foes ? 'lpc-foe-data.js' : 'lpc-data.js', name = foes ? 'LPC_FOE_PACK' : 'LPC_PACK';
fs.writeFileSync(path.join(__dirname, '../../src/' + file), '// 由 tools/lpc/embed.js 生成，别手改。' + (foes ? '怪物' : '角色') + '精灵表（Liberated Pixel Cup 素材合成，署名见游戏内「素材署名」）\nconst ' + name + ' = ' + JSON.stringify(out) + ';\n');
console.log('src/' + file, Math.round(fs.statSync(path.join(__dirname, '../../src/' + file)).size / 1024) + 'KB');
