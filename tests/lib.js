// 测试用的小工具：check() 不通过时打印 ✗ 并让进程以非零状态退出，这样 npm test / CI 能发现问题
let fails = 0, passes = 0;
function check(ok, msg, detail) {
  if (ok) { passes++; return true; }
  fails++; process.exitCode = 1;
  console.log('✗ ' + msg + (detail === undefined ? '' : ' → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))));
  return false;
}
// 页面报错一律算失败（字体等网络资源加载失败除外，离线环境里拉不到 Google Fonts 是正常的）
const isNetErr = s => /ERR_|net::|Failed to load resource/.test(s);
function noErrors(errs) { const real = errs.filter(e => !isNetErr(e)); return check(real.length === 0, '页面没有报错', real.slice(0, 6)); }
function report(name) { console.log(fails ? `✗ ${name}：${fails} 项失败，${passes} 项通过` : `✓ ${name}：${passes} 项全部通过`); }
module.exports = { check, noErrors, report, isNetErr };
