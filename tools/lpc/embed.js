// 把 pack/*.png + pack/meta.json 打成 src/lpc-data.js（图片转 base64 内嵌进单文件网页）
const fs = require('fs'), path = require('path'); const PACK = path.join(__dirname, 'pack'), meta = JSON.parse(fs.readFileSync(path.join(PACK, 'meta.json'), 'utf8'));
const out = {}; for (const id of Object.keys(meta)) out[id] = { src: 'data:image/png;base64,' + fs.readFileSync(path.join(PACK, id + '.png')).toString('base64'), anims: meta[id].anims, atk: meta[id].atk };
fs.writeFileSync(path.join(__dirname, '../../src/lpc-data.js'), '// 由 tools/lpc/embed.js 生成，别手改。角色精灵表（Liberated Pixel Cup 素材合成，署名见游戏内「素材署名」）\nconst LPC_PACK = ' + JSON.stringify(out) + ';\n');
console.log('src/lpc-data.js', Math.round(fs.statSync(path.join(__dirname, '../../src/lpc-data.js')).size / 1024) + 'KB');
