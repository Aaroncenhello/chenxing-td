// 生成器素材目录的查验工具：读生成器的 dist/index-metadata.js，检查「类型=名称_变体」写得对不对（写错了生成器不报错，只是那件衣服不出现）
// 用法：const { item } = require('./catalog'); item('legs', 'Short Shorts', 'black') → 'legs=Short_Shorts_black'，名字或变体不存在会直接抛错
const fs = require('fs'), path = require('path');
const GEN = process.env.LPC_GEN || '/home/user/liberatedpixelcup/universal-lpc-spritesheet-character-generator';
let M; { const s = fs.readFileSync(path.join(GEN, 'dist/index-metadata.js'), 'utf8').replace(/export /g, '') + ';module.exports={metadataIndexes}'; const tmp = path.join(require('os').tmpdir(), 'lpc-idx-' + process.pid + '.cjs'); fs.writeFileSync(tmp, s); M = require(tmp).metadataIndexes; fs.unlinkSync(tmp); }
const norm = s => String(s).replace(/ /g, '_');
function variants(type, name) {
  const t = M.byTypeName[type]; if (!t) throw new Error('没有这个类型：' + type);
  const it = Object.values(t).find(v => norm(v.name).toLowerCase() === norm(name).toLowerCase()); if (!it) throw new Error(`类型 ${type} 里没有「${name}」（可用：${Object.values(t).map(v => v.name).join(' / ')}）`);
  const va = M.variantArrays[it.v] || [], ra = M.recolorVariantArrays[it.r] || [];
  return { name: it.name, list: va.length ? va : ra };
}
function item(type, name, variant) {
  const v = variants(type, name), has = x => v.list.map(norm).includes(norm(x));
  if (variant == null && v.list.length) throw new Error(`「${v.name}」要写变体（可用：${v.list.slice(0, 40).join(' / ')}）`);
  if (variant != null && v.list.length && !has(variant)) {   // 金属 / 布料调色板的变体带前缀：steel → metal.steel，blue → cloth.blue
    const alt = ['metal.', 'cloth.', 'body.'].map(p => p + variant).find(has);
    if (!alt) throw new Error(`「${v.name}」没有变体 ${variant}（可用：${v.list.slice(0, 40).join(' / ')}）`);
    variant = alt;
  }
  return `${type}=${norm(v.name)}${variant != null ? '_' + norm(variant) : ''}`;
}
module.exports = { item, variants, M };
