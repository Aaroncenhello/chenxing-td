const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const out = { haz: STAGES.map(s => !!(s.haz && s.haz.length)), kills: {} };
  for (let st = 1; st <= 7; st++) { __td.newRun(st, { charLv: Object.fromEntries(__td.UNITS.map(u => [u.id, 6])) }); const S = __td.S; S.pending = 0; S.offer = null; for (const id of ['ally_archer','ally_priest']) try { __td.pickCard(id, true); } catch (e) {} __td.callWaveEarly(); let hz = 0; for (let i = 0; i < 900; i++) { __td.step(1/30); } out.kills[st] = { haz: S.haz.length, nan: S.enemies.some(e => !isFinite(e.hp)) || !isFinite(S.crystal.hp) }; }
  return out; });
console.log(JSON.stringify(r));
check(!r.haz[0] && r.haz.slice(1).every(Boolean), '第 1 关没有机关，其余 15 关都有', r.haz);
check(Object.values(r.kills).every(k => k.haz > 0 && !k.nan), '第 2–8 关机关正常运转无 NaN', r.kills);
noErrors(errs); report('haz8'); await b.close(); })();
