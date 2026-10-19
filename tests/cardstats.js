// 每张卡的「出场率 / 拿到后胜率」报表：先跑一遍 balance.js（会留下 tests/out/bal-*.json），再 cd tests/out && node ../cardstats.js
// 只看这批模拟局：拿到某张卡的局和没拿到的局，胜率差多少。样本少（出场不足 MIN 局）的卡不下结论。
const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, 'out'), MIN = +(process.env.MIN || 20);
const runs = [];
for (const f of fs.readdirSync(OUT).filter(f => /^bal-.*\.json$/.test(f))) {
  try { for (const r of JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')).res) if (r.pickIds) runs.push(r); } catch (e) {}
}
if (!runs.length) { console.log('没有找到带 pickIds 的模拟结果：先在 tests/out 里跑 node ../balance.js'); process.exit(1); }
const base = runs.filter(r => r.win).length / runs.length;
const by = {};
for (const r of runs) for (const id of new Set(r.pickIds)) { const e = by[id] || (by[id] = { n: 0, w: 0 }); e.n++; if (r.win) e.w++; }
const rows = Object.entries(by).map(([id, e]) => {
  const rest = runs.length - e.n, restW = runs.filter(r => r.win).length - e.w;
  return { id, n: e.n, rate: e.n / runs.length, win: e.w / e.n, lift: e.w / e.n - (rest ? restW / rest : 0) };
}).filter(r => r.n >= MIN).sort((a, b) => b.lift - a.lift);
console.log(`共 ${runs.length} 局，总胜率 ${(base * 100).toFixed(0)}%（出场不足 ${MIN} 局的卡不列）`);
console.log('注意：打得久的局本来就拿得到更多牌，所以数字偏乐观，只适合卡与卡之间横向比较。');
console.log('卡牌                出场率   拿到后胜率   相对没拿的局');
for (const r of rows) console.log(r.id.padEnd(18), (r.rate * 100).toFixed(0).padStart(4) + '%', (r.win * 100).toFixed(0).padStart(8) + '%', ((r.lift >= 0 ? '+' : '') + (r.lift * 100).toFixed(0) + '点').padStart(12));
