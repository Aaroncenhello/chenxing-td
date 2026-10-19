const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const out = {};
  // 守卫：身边的敌人挨远程打少 40%
  __td.newRun(2); let S = __td.S; S.pending = 0; S.offer = null;
  const w = spawnAt('warden', 3, 3, false, true), near = spawnAt('orc', 3.5, 3, false, true), far = spawnAt('orc', 9, 6, false, true);
  S.enemies = [w, near, far]; guardAuras(); out.guarded = [near.guarded, far.guarded];
  const archer = { def: { place: 'high' }, key: 'x' }, melee = { def: { place: 'ground' }, key: 'y' };
  const hp0 = near.hp; hurt(near, 1000, 'phys', false, archer); const dA = hp0 - near.hp; const hp1 = near.hp; hurt(near, 1000, 'phys', false, melee); const dM = hp1 - near.hp; out.guardRatio = +(dA / dM).toFixed(2);
  // 窃贼偷星尘，击杀退还 1.5 倍
  __td.newRun(2); S = __td.S; S.pending = 0; S.offer = null; S.dust = 100; const t = spawnAt('pilferer', 8, 5, false, true);
  t.target = S.units[0]; t.pend = 0.001; t.atkCd = 0; S.enemies = [t]; for (let i = 0; i < 90; i++) __td.step(1/30); out.stolen = t.stolen || 0; out.dustAfter = S.dust;
  if (t.stolen) { const d0 = S.dust; killEnemy(t, null); out.refund = S.dust - d0; }
  // 驱魔者抽技力
  __td.newRun(2); S = __td.S; S.pending = 0; S.offer = null; const u = S.units[0]; u.sp = u.def.sp; const h = spawnAt('hexer', u.x + 0.5, u.y, false, true); h.target = u; h.pend = 0.001; S.enemies = [h]; for (let i = 0; i < 30; i++) __td.step(1/30); out.sp = +(u.sp / u.def.sp).toFixed(2);
  // 新敌人出现在关卡池里、整局跑得动
  out.inPools = ['warden', 'pilferer', 'hexer'].map(k => STAGES.filter(s => s.pool.some(q => q[0] === k)).length);
  for (const st of [2, 3, 9]) { __td.newRun(st, { charLv: Object.fromEntries(__td.UNITS.map(u => [u.id, 6])) }); const S5 = __td.S; let g = 0; while (!S5.over && g++ < 30 * 200) { if (S5.shop) { __td.closeShop(); continue; } if (S5.event) { __td.takeEvent(0); continue; } if (S5.pending > 0 && !S5.offer) __td.openOffer(); if (S5.offer) { __td.pickCard(S5.offer[0].id); continue; } if (S5.wave >= 3 && S5.spawnQueue.length) __td.callWaveEarly(); __td.step(1/30); } if (S5.enemies.some(e => !isFinite(e.hp))) out.nan = true; }
  return out; });
console.log(JSON.stringify(r));
check(r.guarded[0] === 1 && !r.guarded[1] && r.guardRatio === 0.6, '持盾哨兵身边的敌人挨远程少 40%，远处不受影响', r);
check(r.stolen > 0 && r.refund === Math.round(r.stolen * 1.5), '窃贼偷星尘，击杀退还 1.5 倍', r);
check(r.sp < 0.8, '驱魔者命中会抽走技力', r);
check(r.inPools.every(n => n === 5) && !r.nan, '新敌人进了关卡池，整局跑完无 NaN', r);
noErrors(errs); report('foe3'); await b.close(); })();
