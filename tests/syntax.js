// 语法检查 + 顶层重名检查（拼接后所有文件共享同一个作用域，重名会直接报错）
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../dist/chenxing.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
try { new Function(js); console.log('syntax OK'); } catch (e) { console.log('SYNTAX ERROR:', e.message); process.exitCode = 1; }
const names = {}, dup = [];
for (const f of fs.readdirSync(path.resolve(__dirname, '../src'))) {
  const s = fs.readFileSync(path.resolve(__dirname, '../src', f), 'utf8');
  for (const m of s.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (names[m[1]]) dup.push(`${m[1]}: ${f} & ${names[m[1]]}`); else names[m[1]] = f;
  }
}
console.log(dup.length ? 'DUPLICATES: ' + dup.join(', ') : 'no duplicate top-level names');
if (dup.length) process.exitCode = 1;
