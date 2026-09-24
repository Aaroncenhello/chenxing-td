// 依次跑全部功能测试（在 tests/out 目录里，截图也存在那），全部跑完再汇总；任何一个失败就以非零状态退出
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const ALL = ['smoke-full', 'events', 'affix', 'boss', 'formation', 'codex', 'waves-endless', 'meta', 'rewards', 'save', 'seeded', 'juice', 'help', 'soak-heroes'];
const list = only.length ? only : ALL;
const failed = [];
for (const name of list) {
  console.log(`\n===== ${name} =====`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.resolve(__dirname, name + '.js')], { cwd: OUT, stdio: 'inherit' });
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0) failed.push(name);
  console.log(`----- ${name}：${r.status === 0 ? '通过' : '失败'}（${sec}s）`);
}
console.log('\n' + (failed.length ? `✗ ${failed.length}/${list.length} 个测试失败：${failed.join(', ')}` : `✓ ${list.length} 个测试全部通过`));
if (failed.length) process.exitCode = 1;
