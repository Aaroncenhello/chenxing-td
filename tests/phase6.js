// 阶段 6：星盘核心天赋、角色觉醒、每日悬赏、远征
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
const BASE = { stars: new Array(16).fill(3), tutorial: true, ver: 12, story: [...Array(16).keys()].map(i => 'pre' + i).concat([...Array(16).keys()].map(i => 'post' + i)) };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME); await p.waitForTimeout(300);
  const reset = extra => p.evaluate(s => { localStorage.setItem('chenxing-td-v2', JSON.stringify(s)); localStorage.removeItem('chenxing-td-exp'); }, { ...BASE, ...extra });
  await reset({}); await p.reload(); await p.waitForTimeout(400);

  // ---------- 核心天赋 ----------
  const ks = await p.evaluate(() => {
    const out = {};
    out.lock = diskCanBuy({}, 'ks_def', 999);
    const disk = { walls: 6, hp: 6 }; out.open = diskCanBuy(disk, 'ks_def', 999); out.poor = diskCanBuy(disk, 'ks_def', 10);
    const two = { atk: 6, aspd: 6, walls: 6, hp: 6, ks_atk: 1, ks_def: 1, merchant: 5, bounty: 6, reroll: 1 }; out.max2 = diskCanBuy(two, 'ks_eco', 999);
    editSave(d => { d.bonusStars = 500; d.disk = { walls: 6, hp: 6 }; }); showPerks();
    const n = [...document.querySelectorAll('.dnode.dkey')]; out.nodes = n.length;
    out.btn = n.find(x => /不灭之碑/.test(x.textContent)).querySelector('button').disabled;
    n.find(x => /不灭之碑/.test(x.textContent)).querySelector('button').click(); out.bought = loadSave().disk.ks_def;
    // 效果
    const T = __td; closeOverlay(); T.newRun(2, { disk: { ks_def: 1, ks_eco: 1, ks_atk: 1, ks_arc: 1 } }); const S = T.S; S.pending = 0; S.offer = null;
    hurtCrystal(S.crystal.maxHp * 2); out.revive = [Math.round(S.crystal.hp / S.crystal.maxHp * 100), S.over]; hurtCrystal(S.crystal.maxHp * 2);
    T.newRun(2, { disk: { ks_eco: 1, ks_atk: 1, ks_arc: 1 } }); const S2 = T.S; S2.pending = 0; S2.offer = null; S2.wave = 5; const d0 = S2.dust; startWave(); out.eco = [S2.pending, S2.dust - d0];
    S2.enemies = []; const a = spawnAt('orc', 8, 3, false), c = spawnAt('orc', 8.8, 3, false); a.afx = c.afx = [];
    hurt(a, 100, 'phys', true, S2.units[0]); out.bounce = c.hp < c.maxHp;
    S2.star = ULT.max; castUlt(); out.reso = S2.resoT;
    return out;
  });
  console.log('核心天赋:', JSON.stringify(ks));
  check(!ks.lock && ks.open && !ks.poor, '核心天赋要本线投入 12 级、星星够才能点', ks);
  check(!ks.max2, '最多同时点亮 2 个核心天赋', ks.max2);
  check(ks.nodes === 4 && !ks.btn && ks.bought === 1, '星盘页有 4 个核心天赋节点，能点亮', ks);
  check(ks.revive[0] === 40 && !ks.revive[1], '不灭之碑：晨星碑碎了以 40% 复活', ks.revive);
  check(ks.eco[0] === 1 && ks.eco[1] === 30, '点金：打完第 5 波多翻一张牌、+30 星尘', ks.eco);
  check(ks.bounce && ks.reso === 10, '连锁星芒会弹射；星辰共鸣在晨星爆发后生效 10 秒', ks);

  // ---------- 觉醒 ----------
  const aw = await p.evaluate(() => {
    const full = 60 * 45, out = { a0: awkOf(full - 1), a1: awkOf(full), a2: awkOf(full + 600 * 2 + 5), a5: awkOf(full + 600 * 99) };
    editSave(d => { d.chars.mage = { exp: full + 600 * 3 }; });
    out.map = charAwks().mage;
    const T = __td; T.newRun(2, { hero: 'mage', charLv: { mage: 10 }, charAwk: {} }); const base = uAtk(T.S.units[0]);
    T.newRun(2, { hero: 'mage', charLv: { mage: 10 }, charAwk: { mage: 3 } }); out.k = +(uAtk(T.S.units[0]) / base).toFixed(3);
    showRoster('mage'); out.roster = /觉醒 ★★★☆☆/.test(document.getElementById('ovbox').textContent);
    return out;
  });
  console.log('觉醒:', JSON.stringify(aw));
  check(aw.a0 === 0 && aw.a1 === 0 && aw.a2 === 2 && aw.a5 === 5, '满级后每 600 经验觉醒一级，最多 5 级', aw);
  check(aw.map === 3 && aw.k === 1.09, '觉醒 3 级攻击 +9%', aw);
  check(aw.roster, '角色页显示觉醒星级', aw.roster);

  // ---------- 悬赏 ----------
  const bo = await p.evaluate(() => {
    const B = todayBounties(), B2 = todayBounties(), out = { n: B.list.length, same: B.list.map(x => x.key).join() === B2.list.map(x => x.key).join(), uniq: new Set(B.list.map(x => x.key.replace(/\d+/, ''))).size };
    showLevels(); out.card = document.querySelectorAll('.daily.bounty li').length;
    // 让今天的 3 条都满足：直接改判定
    const T = __td; T.newRun(2, {}); const S = T.S; S.over = 'win';
    const stars0 = loadSave().bonusStars;
    const orig = BOUNTY_TYPES.map(t => t.make); BOUNTY_TYPES.forEach(t => { const m = t.make; t.make = r => ({ ...m(r), ok: () => true }); });
    const R = T.settle(); out.got = R.bounty.length; out.stars = loadSave().bonusStars - stars0 - (R.win ? 1 : 0);
    T.newRun(2, {}); T.S.over = 'win'; const R2 = T.settle(); out.again = R2.bounty.length;
    BOUNTY_TYPES.forEach((t, i) => { t.make = orig[i]; });
    showLevels(); out.done = document.querySelectorAll('.daily.bounty li.ok').length;
    return out;
  });
  console.log('悬赏:', JSON.stringify(bo));
  check(bo.n === 3 && bo.same && bo.uniq === 3, '每天 3 条不同的悬赏，同一天固定', bo);
  check(bo.card === 3, '选关页显示今日悬赏', bo.card);
  check(bo.got === 3 && bo.stars === 12 && bo.again === 0, '完成悬赏每条 +3★、全完成再 +3★，不重复发', bo);
  check(bo.done === 3, '完成后选关页打勾', bo.done);

  // ---------- 远征 ----------
  await reset({}); await p.reload(); await p.waitForTimeout(400);
  const ex = await p.evaluate(() => {
    const out = {}, T = __td;
    showLevels(); out.card = !!document.getElementById('btn-exped');
    document.getElementById('btn-exped').click(); document.querySelector('[data-hero="mage"]').click();
    let st = expLoad(); out.map = st.map.length; out.first = st.map[0].every(n => n.type === 'fight'); out.last = st.map[5][0].type;
    out.mapUi = document.querySelectorAll('[data-exnode]').length;
    document.querySelector('[data-exnode="0"]').click();
    let S = T.S; out.short = ST.waves < STAGES[S.stage].waves; out.flag = S.exped && S.exped.floor;
    // 打赢第 1 场：带着伙伴、卡牌、遗物、等级
    S.pending = 0; S.offer = null; S.cards.atk = 2; S.cards.shield = 1; S.relics.push('rl_shard'); S.level = 7; S.dust = 222;
    addUnit(UNITS.find(u => u.id === 'knight')); S.units[1].lv = 2; S.crystal.hp = S.crystal.maxHp * 0.2;
    S.over = 'win'; const R = T.settle(); out.r1 = [R.expFloor, R.expStars];
    st = expLoad(); out.floor = st.floor; out.snapUnits = st.snap.units.length;
    out.types = [...new Set(st.map.flat().map(n => n.type))].sort().join();
    // 第 2 场（第 2 层）打赢后有休整：选修碑
    showExpMap(); document.querySelector('[data-exnode="0"]').click();
    S = T.S; S.crystal.hp = S.crystal.maxHp * 0.3; S.over = 'win'; T.settle();
    st = expLoad(); out.rest = !!st.rest; showExpMap(); out.restUi = document.querySelectorAll('[data-exrest]').length;
    out.blocked = (expChoose(0), T.S.over === 'win');   // 休整没选之前不能直接开打
    document.querySelector('[data-exrest="heal"]').click(); out.camp = expLoad().snap.crystal; out.restDone = !expLoad().rest;
    st = expLoad(); const bi = st.map[st.floor].findIndex(n => n.stage != null);
    document.querySelector(`[data-exnode="${bi}"]`).click();
    S = T.S; out.carry = { cards: S.cards.atk, relic: S.relics.includes('rl_shard'), lv: S.level, dust: S.dust, units: S.units.filter(u => !u.summon).length, klv: (S.units.find(u => u.def.id === 'knight') || {}).lv, crystal: +(S.crystal.hp / S.crystal.maxHp).toFixed(2), shield: S.crystal.maxHp > STAGES[S.stage].crystalHp * 1.1, pend: S.pending };
    // 输掉：远征结束
    S.over = 'lose'; const R2 = T.settle(); out.lose = [!!R2.expEnd, expLoad() === null, loadSave().exped.best];
    return out;
  });
  console.log('远征:', JSON.stringify(ex));
  check(ex.card && ex.map === 6 && ex.first && ex.last === 'boss' && ex.mapUi === 2, '远征：6 层路线，第 1 层两场战斗二选一，最后一层是首领', ex);
  check(ex.short && ex.flag === 0, '远征战斗波数缩短', ex);
  check(ex.r1[0] === 1 && ex.r1[1] === 2 && ex.floor === 1 && ex.snapUnits === 2, '赢一场 +2★ 前进一层，队伍记下来', ex);
  check(ex.types === 'boss,elite,fight', '每层都是一场仗（普通 / 精英），最后是首领', ex.types);
  check(ex.rest && ex.restUi === 5 && ex.blocked && ex.camp === 1 && ex.restDone, '第 2 场打赢后休整五选一；选修碑下一战满血', ex);
  check(ex.carry.cards === 2 && ex.carry.relic && ex.carry.lv === 7 && ex.carry.dust === 222 && ex.carry.units === 2 && ex.carry.klv === 2 && ex.carry.shield && ex.carry.pend === 0, '下一场接着上一场的卡牌、遗物、等级、星尘、伙伴和阶数', ex.carry);
  check(ex.lose[0] && ex.lose[1] && ex.lose[2] === 2, '输一场远征结束，记下最好成绩', ex.lose);

  // 首领层打赢 = 远征完成 + 成就
  const fin = await p.evaluate(() => {
    const T = __td; expSave({ v: 1, hero: 'knight', floor: 5, map: expMakeMap(), path: ['fight', 'fight', 'fight', 'fight', 'fight'], snap: null, flips: 0, stars: 10, won: 5 });
    expChoose(0); const S = T.S; S.over = 'win'; const R = T.settle();
    return { done: R.expDone, stars: R.expStars, achv: loadSave().achv.includes('exped'), clears: loadSave().exped.clears, cleared: expLoad() === null };
  });
  console.log('远征完成:', JSON.stringify(fin));
  check(fin.done && fin.stars === 10 && fin.achv && fin.clears === 1 && fin.cleared, '打赢首领层：远征完成 +10★、成就、进度清掉', fin);

  // 实战跑一段远征战斗，确认不报错
  await p.evaluate(() => { expStart('knight'); expChoose(0); const T = __td, S = T.S;
    for (let i = 0; i < 30 * 40 && !S.over; i++) { if (S.pending > 0 && !S.offer) T.openOffer(); if (S.offer) T.pickCard(S.offer[0].id); if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); T.step(1 / 30); } });
  await p.waitForTimeout(300);
  noErrors(errs);
  report('phase6');
  await b.close();
})();
