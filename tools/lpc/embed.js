// 把 pack/*.png + pack/meta.json 打成 src/lpc-data.js（图片转 base64 内嵌进单文件网页）。SET=foes 时打包怪物 → src/lpc-foe-data.js
const fs = require('fs'), path = require('path'); const SET = process.env.SET || 'heroes', foes = SET !== 'heroes';
const PACK = path.join(__dirname, foes ? 'pack-' + SET : 'pack'), meta = JSON.parse(fs.readFileSync(path.join(PACK, 'meta.json'), 'utf8'));
const out = {}; for (const id of Object.keys(meta)) out[id] = { src: 'data:image/png;base64,' + fs.readFileSync(path.join(PACK, id + '.png')).toString('base64'), anims: meta[id].anims, atk: meta[id].atk, box: meta[id].box };
const file = foes ? 'lpc-foe-data.js' : 'lpc-data.js', name = foes ? 'LPC_FOE_PACK' : 'LPC_PACK';
fs.writeFileSync(path.join(__dirname, '../../src/' + file), '// 由 tools/lpc/embed.js 生成，别手改。' + (foes ? '怪物' : '角色') + '精灵表（Liberated Pixel Cup 素材合成，署名见游戏内「素材署名」）\nconst ' + name + ' = ' + JSON.stringify(out) + ';\n');
console.log('src/' + file, Math.round(fs.statSync(path.join(__dirname, '../../src/' + file)).size / 1024) + 'KB');
