// 批次 H2：4 名新角色（反击者 / 猎魔人 / 潮汐歌者 / 断音者）的机制、像素图和接入
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = {}; const NEW = ['counter', 'hunter', 'songstress', 'breaker'];
  const fresh = (hero, st) => { __td.newRun(st == null ? 17 : st, { hero, charLv: {}, charAwk: {}, assist: 0, charOpen: UNITS.map(u => u.id) }); const S = __td.S; S.pending = 0; S.offer = null; S.shop = null; S.event = null; S.cine = null; return S; };
  const tick = (S, n) => { for (let i = 0; i < n; i++) { S.shop = null; S.event = null; S.offer = null; S.pending = 0; S.cine = null; S.crystal.hp = S.crystal.maxHp; __td.step(1 / 30); } };
  out.n = UNITS.length;
  out.art = NEW.every(id => { const c = document.createElement('canvas'); drawPortrait(UNITS.find(u => u.id === id), c, 1); drawPortrait(UNITS.find(u => u.id === id), c, 4, 'A'); drawPortrait(UNITS.find(u => u.id === id), c, 4, 'B'); return c.width > 0; });
  out.info = NEW.every(id => TALENTS[id] && BIO[id] && UNITS.find(u => u.id === id).branches.length === 2);
  // 反击者：挨一下还一下
  let S = fresh('counter'); const c = S.units.find(u => u.def.id === 'counter'); const foe = spawnAt('orc', c.x + 0.8, c.y, false, false); foe.hp = foe.maxHp = 1e9; const h0 = foe.hp; hurtUnit(c, 1000, 'phys', foe); out.counter = { reflected: h0 - foe.hp };
  c.branch = 'B'; const f2 = spawnAt('orc', c.x + 1.0, c.y, false, false); f2.hp = f2.maxHp = 1e9; const f3 = spawnAt('orc', c.x + 1.5, c.y, false, false); f3.hp = f3.maxHp = 1e9; hurtUnit(c, 1000, 'phys', f2); out.counterB = { aoe: f3.maxHp - f3.hp > 0 };
  // 猎魔人：技能标记最高血量的敌人，全队伤害 +50%
  S = fresh('hunter'); const hu = S.units.find(u => u.def.id === 'hunter'); const big = spawnAt('golem', 5, 4, false, false); big.hp = big.maxHp = 1e9; const small = spawnAt('wolf', 6, 4, false, false); hu.sp = hu.def.sp; const d1 = hurt(big, 1000, 'phys', false, S.units[0]); useSkill(hu); const d2 = hurt(big, 1000, 'phys', false, S.units[0]); out.hunter = { marked: big.huntMark > S.t, ratio: +(d2 / d1).toFixed(2) };
  // 潮汐歌者：攻击减速 + 回血；技能减速全场
  S = fresh('songstress'); const so = S.units.find(u => u.def.id === 'songstress'); const wolf = spawnAt('wolf', 5, 4, false, false); wolf.hp = wolf.maxHp = 1e9; S.units[0].hp = S.units[0].maxHp * 0.3; const before = S.units[0].hp; shoot(so, wolf, 'songstress', uAtk(so)); for (let i = 0; i < 60; i++) { __td.step(1 / 30); S.crystal.hp = S.crystal.maxHp; }
  out.song = { slow: wolf.slowT > 0 || wolf.slowK < 1, healed: S.units[0].hp > before };
  const w2 = spawnAt('orc', 6, 4, false, false); so.sp = so.def.sp; useSkill(so); out.songSkill = { slow: w2.slowK <= 0.45 && w2.slowT > 5 };
  // 断音者：技能打断首领读条，读条中的敌人多吃伤害
  S = fresh('breaker'); const br = S.units.find(u => u.def.id === 'breaker'); const bo = spawnAt('boss', 5, 4, false, false); bo.hp = bo.maxHp = 1e9; startCast(bo, ULT_DEF.roar); const x1 = hurt(bo, 1000, 'phys', false, br); bo.cast = null; const x2 = hurt(bo, 1000, 'phys', false, br); startCast(bo, ULT_DEF.roar); br.sp = br.def.sp; useSkill(br); out.breaker = { ratio: +(x1 / x2).toFixed(2), broken: !bo.cast && bo.brokenT > 0 };
  // 都当英雄 / 都当伙伴，跑 40 秒看有没有 NaN
  out.nan = [];
  for (const id of NEW) for (const mode of ['hero', 'ally']) {
    S = fresh(mode === 'hero' ? id : 'knight'); if (mode === 'ally') { pickCard('ally_' + id); }
    for (const x of S.units) if (x.def.id === id) { x.branch = 'A'; }
    __td.callWaveEarly(); tick(S, 1200);
    if (!isFinite(S.crystal.hp) || S.units.some(x => !isFinite(x.hp)) || S.enemies.some(x => !isFinite(x.hp))) out.nan.push(id + ':' + mode);
  }
  return out; });
console.log(JSON.stringify(r));
check(r.n === 20 && r.art && r.info, '20 名角色，新角色的像素图 / 天赋 / 传记 / 转职都齐', { n: r.n, art: r.art, info: r.info });
check(r.counter.reflected > 400 && r.counterB.aoe, '凯伦：挨打反弹，雷鸣反击是范围伤害', { c: r.counter, b: r.counterB });
check(r.hunter.marked && Math.abs(r.hunter.ratio - 1.5) < 0.05, '薇拉：猎杀标记 +50%', r.hunter);
check(r.song.slow && r.song.healed && r.songSkill.slow, '莉亚：攻击减速并回血，技能减速全场', { s: r.song, k: r.songSkill });
check(r.breaker.ratio > 1.5 && r.breaker.broken, '澈：对读条敌人 +60%，技能打断读条并破防', r.breaker);
check(r.nan.length === 0, '四名新角色当英雄 / 当伙伴各跑 40 秒无 NaN', r.nan);
noErrors(errs); report('heroes5'); await b.close(); })();
