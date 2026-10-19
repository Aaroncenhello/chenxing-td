const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const out = {};
  __td.newRun(2, {}); let S = __td.S; const base = { hp: S.diffK.hp, el: S.diffK.elite, allies: maxAllies(), spd: eSpeed({ d: { speed: 1 }, slowT: 0 }) };
  __td.newRun(2, { contracts: ['ironhide', 'elite', 'fewer', 'swift', 'seal', 'drought', 'bogus'] }); S = __td.S;
  out.list = S.contracts.slice(); out.hpK = +(S.diffK.hp / base.hp).toFixed(2); out.eliteAdd = +(S.diffK.elite - base.el).toFixed(2); out.allies = maxAllies() - base.allies;
  out.spd = +(eSpeed({ d: { speed: 1 }, slowT: 0 }) / base.spd).toFixed(2); out.mod = S.mod; S.spells.meteor = 0; out.sealed = castSpell('meteor', 5, 5);
  S.pending = 0; S.offer = null; let gain = 0; for (let i = 0; i < 400; i++) { const e = spawnAt('orc', 4, 4, false); const d0 = S.dust; killEnemy(e, null); gain += S.dust - d0; }
  __td.newRun(2, {}); const S2 = __td.S; S2.pending = 0; S2.offer = null; let g2 = 0; for (let i = 0; i < 400; i++) { const e2 = spawnAt('orc', 4, 4, false); const d1 = S2.dust; killEnemy(e2, null); g2 += S2.dust - d1; } out.dustRatio = +(gain / g2).toFixed(1);
  // 每日挑战里契约不生效
  __td.newRun(2, { daily: { seed: 5, mod: DAILY_MODS[0].id, date: '2099-01-01' }, contracts: ['ironhide'] }); out.dailyCt = __td.S.contracts.length;
  // 通关奖励
  const save0 = loadSave().bonusStars; __td.newRun(2, { contracts: ['ironhide', 'elite', 'seal'] }); S = __td.S; S.pending = 0; S.offer = null; S.over = 'win'; const R = __td.settle(); out.bonus = loadSave().bonusStars - save0; out.txt = R && R.reward || '';
  out.stars5 = [contractStars(['ironhide']), contractStars(['elite']), contractStars(['ironhide','swift','fewer']), contractStars(CONTRACTS.map(c => c.id))];
  return out; });
console.log(JSON.stringify(r));
check(r.list.length === 6 && !r.list.includes('bogus'), '无效契约 id 被过滤', r.list);
check(r.hpK === 1.25 && r.eliteAdd === 0.22 && r.allies === -1 && r.spd === 1.15 && r.dustRatio >= 0.5 && r.dustRatio <= 0.7, '铁壁 ×1.25 生命、精英潮 +22%、寡兵 −1、疾袭 ×1.15、枯竭 ×0.6', r);
check(r.mod === 'noSpell' && r.sealed === false, '封印：不能放主动法术', r);
check(r.dailyCt === 0, '每日挑战不吃契约', r);
check(/\+5★（含契约 \+4★）/.test(r.txt) && r.stars5.join() === '1,2,3,5', '通关奖励 = 基础 1★ + 契约 4★（5 点）；档位 1,2,3,5', { stars: r.stars5, txt: r.txt });
noErrors(errs); report('ct6'); await b.close(); })();
