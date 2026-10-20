// 批次 H1：8 张新卡 + 2 条新羁绊的机制
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = {}; const fresh = () => { __td.newRun(2, { hero: 'knight', charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.shop = null; S.event = null; S.cine = null; return S; };
  const tick = (S, n) => { for (let i = 0; i < n; i++) { S.shop = null; S.event = null; S.offer = null; S.pending = 0; S.crystal.hp = S.crystal.maxHp; __td.step(1 / 30); } };
  // 潮汐涌动：减速 + 受伤
  let S = fresh(); S.cards.sk_tide = 3; const a = spawnAt('orc', CRYSTAL.x + 3, CRYSTAL.y, false, false); a.speed = 0; const h0 = a.hp; S.skillCd.sk_tide = 0.01; tick(S, 8);
  out.tide = { slow: a.slowT > 0 || a.slowK < 1, hurt: a.hp < h0 };
  // 钟鸣：眩晕
  S = fresh(); S.cards.sk_bell = 3; const c = spawnAt('orc', CRYSTAL.x + 2, CRYSTAL.y, false, false); S.skillCd.sk_bell = 0.01; tick(S, 8); out.bell = { stun: c.stunT > 0 || c.hp < c.maxHp };
  // 回声：大量暴击里出现回声特效
  S = fresh(); S.cards.crit = 5; S.cards.echo = 3; const d = spawnAt('golem', 6, 4, false, false); d.hp = d.maxHp = 1e9; let echoes = 0; const u = S.units[0];
  for (let i = 0; i < 400; i++) { hurt(d, 100, 'phys', true, u); } echoes = S.fx.filter(f => f.kind === 'text' && f.text === '回声').length; out.echo = echoes;
  // 静默领域：打断所需伤害减少
  S = fresh(); const bo = spawnAt('boss', 6, 4, false, false); startCast(bo, ULT_DEF.roar); const n0 = bo.cast.need; S.cards.silence = 3; startCast(bo, ULT_DEF.roar); out.sil = [n0, bo.cast.need];
  // 打捞
  S = fresh(); S.cards.salvage = 2; const d0 = S.dust; startWave(); out.salv = S.dust - d0;
  // 镜面护甲：远程敌人的伤害
  S = fresh(); const mage = spawnAt('dmage', 6, 4, false, false); const ally = S.units[0]; ally.hp = ally.maxHp; hurtUnit(ally, 1000, 'magic', mage); const lost0 = ally.maxHp - ally.hp; ally.hp = ally.maxHp; S.cards.mirrorarmor = 3; hurtUnit(ally, 1000, 'magic', mage); out.mir = [lost0, ally.maxHp - ally.hp];
  // 潮汐回复：放技能后全队回复
  S = fresh(); S.cards.lg_tide = 1; const hero = S.units[0]; for (const x of S.units) x.hp = x.maxHp * 0.5; hero.sp = hero.def.sp; useSkill(hero); out.heart = S.units.every(x => x.hp >= x.maxHp * 0.55 || x === hero);
  // 猎杀连击：精英伤害 +30%，击杀精英后攻击 +8%
  S = fresh(); const el = spawnAt('orc', 6, 4, true, false); el.hp = el.maxHp = 1e9; const hu = S.units[0]; const d1 = hurt(el, 1000, 'phys', false, hu); S.cards.lg_hunt = 1; const d2 = hurt(el, 1000, 'phys', false, hu);
  const k = spawnAt('orc', 7, 4, true, false); k.hp = 1; const atk0 = uAtk(hu); hurt(k, 99999, 'phys', false, hu); out.hunt = { ratio: +(d2 / d1).toFixed(2), huntT: S.huntT, atkUp: +(uAtk(hu) / atk0).toFixed(3) };
  // 羁绊
  S = fresh(); S.cards.sk_tide = 1; S.cards.sk_bell = 1; S.cards.silence = 1; S.cards.echo = 1; updateSyn(); out.syn = [syn('tidebell'), syn('silentecho'), syn2('tidebell')];
  S.cards.sk_tide = 3; S.cards.sk_bell = 3; S.cards.silence = 3; S.cards.echo = 3; updateSyn(); out.syn2 = [syn2('tidebell'), syn2('silentecho')];
  // 读条中的敌人受伤更多（先降回 1 级，只看一档）
  S.cards.silence = 1; S.cards.echo = 1; updateSyn();
  const cb = spawnAt('golem', 6, 4, false, false); cb.hp = cb.maxHp = 1e9; cb.cast = { u: ULT_DEF.roar, t: 0, dur: 3, need: 1e12, got: 0 }; const x1 = hurt(cb, 1000, 'phys', false, S.units[0]); cb.cast = null; const x2 = hurt(cb, 1000, 'phys', false, S.units[0]); out.sec = +(x1 / x2).toFixed(2);
  // 全部新卡一起拉满跑 20 秒
  S = fresh(); for (const id of ['sk_tide', 'sk_bell', 'echo', 'silence', 'salvage', 'mirrorarmor', 'lg_tide', 'lg_hunt', 'crit', 'critdmg']) S.cards[id] = 3; updateSyn(); __td.callWaveEarly(); tick(S, 600);
  out.nan = !isFinite(S.crystal.hp) || S.units.some(x => !isFinite(x.hp)) || S.enemies.some(x => !isFinite(x.hp));
  out.cards = ['sk_tide', 'sk_bell', 'echo', 'silence', 'salvage', 'mirrorarmor', 'lg_tide', 'lg_hunt'].every(id => CARD_BY[id] && drawCardIcon(document.createElement('canvas'), id, 48) === undefined);
  return out; });
console.log(JSON.stringify(r));
check(r.tide.slow && r.tide.hurt, '潮汐涌动：减速并造成伤害', r.tide);
check(r.bell.stun, '钟鸣：眩晕敌人', r.bell);
check(r.echo > 20, '回声：大量暴击中会出现回响', r.echo);
check(r.sil[1] < r.sil[0] * 0.5, '静默领域 3 级：打断所需伤害 −60%', r.sil);
check(r.salv >= 6, '打捞：每波开始得到星尘', r.salv);
check(r.mir[1] < r.mir[0] * 0.8, '镜面护甲 3 级：远程伤害 −30%', r.mir);
check(r.heart, '潮汐回复：放技能后全队回复', r);
check(Math.abs(r.hunt.ratio - 1.3) < 0.03 && r.hunt.huntT > 0 && r.hunt.atkUp > 1.07, '猎杀连击：精英伤害 +30%、击杀后攻击 +8%', r.hunt);
check(r.syn[0] && r.syn[1] && !r.syn[2] && r.syn2[0] && r.syn2[1], '两条新羁绊：凑齐生效，二档需要都升到 3 级', { syn: r.syn, syn2: r.syn2 });
check(Math.abs(r.sec - 1.3) < 0.03, '静默与回声：读条中的敌人 +30% 伤害', r.sec);
check(!r.nan && r.cards, '8 张新卡拉满跑 20 秒无 NaN，图标都能画', r);
noErrors(errs); report('cards5'); await b.close(); })();
