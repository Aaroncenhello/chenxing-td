const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 760 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const out = {};
  const fresh = i => { applySpell2(i); __td.newRun(2); const S = __td.S; S.pending = 0; S.offer = null; for (let k = 0; k < 6; k++) spawnAt('orc', 6 + k * 0.3, 4, false, true); S.spells.heal = 0; return S; };
  let S = fresh(1); const u = S.units[0]; const hp0 = u.hp; castSpell('heal'); out.shieldT = S.shieldT; hurtUnit(u, 1000, 'phys', null); out.shieldTaken = Math.round(hp0 - u.hp);
  S = fresh(0); const u0 = S.units[0]; const h0 = u0.hp; hurtUnit(u0, 1000, 'phys', null); out.plainTaken = Math.round(h0 - u0.hp);
  S = fresh(2); const i0 = uInterval(S.units[0]); castSpell('heal'); out.rally = +(i0 / uInterval(S.units[0])).toFixed(2); out.rallyT = S.rallyT;
  S = fresh(3); castSpell('heal'); out.frozen = S.enemies.filter(e => e.freezeT > 1.7).length + '/' + S.enemies.length;
  S = fresh(0); S.units[0].hp = 100; castSpell('heal'); out.healed = S.units[0].hp > 100;
  out.names = SPELL2.map(s => s.name); applySpell2(0); __td.newRun(0);
  for (let i = 0; i < 4; i++) { applySpell2(i); __td.newRun(2); const S2 = __td.S; S2.pending = 0; S2.offer = null; __td.callWaveEarly(); S2.spells.heal = 0; castSpell('heal'); for (let k = 0; k < 300; k++) __td.step(1/30); if (S2.enemies.some(e => !isFinite(e.hp)) || !isFinite(S2.crystal.hp)) out.nan = true; }
  applySpell2(0); return out; });
console.log(JSON.stringify(r));
check(r.shieldT > 4.9 && r.shieldTaken * 3.3 > r.plainTaken * 0.95 && r.shieldTaken < r.plainTaken * 0.4, '星盾 5 秒、伤害 −70%', r);
check(r.rally >= 1.39 && r.rallyT > 7.9, '号令：攻速 ×1.4、持续 8 秒', r);
check(r.frozen === '6/6' && r.healed && !r.nan, '时停定住全场；圣愈照常；四种都能跑 10 秒无 NaN', r);
noErrors(errs); report('sp2'); await b.close(); })();
