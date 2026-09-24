// 平衡矩阵：按几档「玩家进度」（角色等级 + 星盘星星）把每一关各跑 RUNS 局，输出胜率表
// 用法：cd tests/out && RUNS=16 node ../balance.js        （4 个进程并行，大约 5 分钟）
//      PROFILES=三章,四章 ST0=8 node ../balance.js       （只跑部分档位 / 关卡）
// 结果同时写到 tests/out/balance.json，方便调数值前后对比
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const RUNS = +(process.env.RUNS || 16), ST0 = +(process.env.ST0 || 0), ST = +(process.env.ST || 16), JOBS = +(process.env.JOBS || 4);
// 每档大约对应「刚打到这一章」的玩家：角色等级按每局经验估算，星星 = 关卡星级 + 通关奖励 + 成就
const ALL = [
  { name: '新手', ch: 0, CLV: 3, STARS: 0 },
  { name: '二章', ch: 1, CLV: 5, STARS: 20 },
  { name: '三章', ch: 2, CLV: 7, STARS: 45 },
  { name: '四章', ch: 3, CLV: 9, STARS: 90 },
  { name: '毕业', ch: 3, CLV: 10, STARS: 400 },
];
const want = (process.env.PROFILES || '').split(',').filter(Boolean);
const profiles = want.length ? ALL.filter(p => want.includes(p.name)) : ALL;
const OUT = path.resolve(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });

// 拆成 (档位, 关卡) 小任务，JOBS 个进程并行跑
const tasks = [];
for (const p of profiles) for (let st = ST0; st < ST; st++) tasks.push({ p, st, file: path.join(OUT, `bal-${p.name}-${st}.json`) });
let next = 0, done = 0;
function runOne() {
  if (next >= tasks.length) return Promise.resolve();
  const t = tasks[next++];
  return new Promise(res => {
    const env = { ...process.env, ST0: String(t.st), ST: String(t.st + 1), RUNS: String(RUNS), CLV: String(t.p.CLV), STARS: String(t.p.STARS), OUT: t.file };
    const c = spawn(process.execPath, [path.resolve(__dirname, 'sim.js')], { cwd: OUT, env, stdio: ['ignore', 'ignore', 'inherit'] });
    c.on('exit', () => { done++; process.stdout.write(`\r${done}/${tasks.length}`); res(); });
  }).then(runOne);
}
(async () => {
  await Promise.all(Array.from({ length: JOBS }, runOne));
  console.log('');
  const table = {};
  for (const t of tasks) {
    const rs = JSON.parse(fs.readFileSync(t.file, 'utf8')).res;
    const win = rs.filter(r => r.win).length / rs.length;
    const reach = rs.reduce((a, r) => a + (r.win ? 1 : Math.max(0, r.wave - 1) / r.waves), 0) / rs.length;   // 平均打到了全程的几成
    const stars = rs.reduce((a, r) => a + (r.stars || 0), 0) / rs.length;
    (table[t.p.name] = table[t.p.name] || {})[t.st] = { win: +win.toFixed(3), reach: +reach.toFixed(3), stars: +stars.toFixed(2), n: rs.length };
  }
  fs.writeFileSync(path.join(OUT, 'balance.json'), JSON.stringify({ RUNS, profiles, table }, null, 1));
  const pct = x => String(Math.round(x * 100)).padStart(3) + '%';
  console.log('胜率（括号里是输掉时平均打到全程的几成）  每档每关 ' + RUNS + ' 局');
  console.log('关卡   ' + profiles.map(p => p.name.padEnd(12)).join(''));
  for (let st = ST0; st < ST; st++) {
    console.log(`L${String(st + 1).padEnd(4)}` + profiles.map(p => { const c = table[p.name][st]; return `${pct(c.win)}(${pct(c.reach)})`.padEnd(14); }).join(''));
  }
})();
