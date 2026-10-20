// 汇总 out/*.credits.csv → src/lpc-credits.js（游戏里「素材署名」页用）+ CREDITS-LPC.md（仓库根目录）
const fs = require('fs'), path = require('path'); const OUTS = [path.join(__dirname, 'out'), path.join(__dirname, 'out-foes'), path.join(__dirname, 'out-skins')].filter(d => fs.existsSync(d));
function parseCsv(t) { const rows = []; let row = [], cur = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } if (cur || row.length) { row.push(cur); rows.push(row); } return rows; }
const seen = new Map(), authors = new Set(), licenses = new Set();
for (const OUT of OUTS) for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.credits.csv'))) {
  const rows = parseCsv(fs.readFileSync(path.join(OUT, f), 'utf8')).slice(1);
  for (const [file, notes, au, li, urls] of rows) { if (!file) continue; const key = file.replace(/\/[^/]+\.png$/, '').replace(/\/(walk|slash|thrust|shoot|spellcast|hurt|idle|combat_idle|backslash|halfslash|[a-z_]+)$/, '');
    if (!seen.has(key)) seen.set(key, { file: key, notes, authors: au, licenses: li, urls }); au.split(',').map(s => s.trim()).filter(Boolean).forEach(a => authors.add(a)); li.split(',').map(s => s.trim()).filter(Boolean).forEach(l => licenses.add(l)); }
}
const list = [...seen.values()].sort((a, b) => a.file.localeCompare(b.file));
const data = { authors: [...authors].sort((a, b) => a.localeCompare(b)), licenses: [...licenses].sort(), items: list };
fs.writeFileSync(path.join(__dirname, '../../src/lpc-credits.js'), '// 由 tools/lpc/credits.js 生成，别手改\nconst LPC_CREDITS = ' + JSON.stringify(data) + ';\n');
const md = ['# 角色素材署名', '', '游戏里 20 名角色和大部分怪物的像素精灵由 **Liberated Pixel Cup（LPC）** 社区艺术家的素材合成（Universal LPC Spritesheet Character Generator，https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator ）。', '素材按各自的许可证使用：' + data.licenses.join('、') + '。其中 CC-BY-SA / GPL 要求：保留署名，并且基于这些素材的衍生美术（本游戏里合成出来的角色精灵）按同样的许可证继续分享。', '', '## 作者', '', data.authors.join('、'), '', '## 素材明细', ''];
for (const i of list) md.push(`- \`${i.file}\` — ${i.authors}；${i.licenses}${i.notes ? '；' + i.notes : ''}${i.urls ? '；' + i.urls.split(', ')[0] : ''}`);
fs.writeFileSync(path.join(__dirname, '../../CREDITS-LPC.md'), md.join('\n') + '\n');
console.log('素材', list.length, '条，作者', authors.size, '人，许可证', [...licenses].join('/'));
