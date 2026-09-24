// 阶段 5：技能卡进化、集火、首领演出、技能特写
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, ver: 12, story: [...Array(16).keys()].map(i => 'pre' + i).concat([...Array(16).keys()].map(i => 'post' + i)) })));
  await p.reload(); await p.waitForTimeout(400);
  const fresh = st => p.evaluate(st => { closeOverlay(); __td.newRun(st, {}); const S = __td.S; S.pending = 0; S.offer = null; S.shopWave = 99; S.eventWave = 99; S.enemies = []; S.spawnQueue = []; S.fx = []; S.nextWaveIn = 999; }, st);

  // ---------- 技能卡进化 ----------
  await fresh(4);
  const ev = await p.evaluate(() => {
    const T = __td, S = T.S, out = {}, evoIn = () => cardPool().filter(c => c.card && c.card.evo).map(c => c.id);
    S.cards.sk_meteor = 4; out.before = evoIn();
    S.cards.sk_meteor = 5; out.after = evoIn();
    out.rare = cardPool(2).some(c => c.id === 'ev_meteor');
    T.pickCard('ev_meteor', true); out.banner = S.fx.some(f => f.kind === 'banner' && /进化 · 天罚陨星/.test(f.text));
    out.gone = !evoIn().includes('ev_meteor');
    out.legendSyn = SYNERGY.find(g => g.id === 'legendary').prog()[0]; out.legends = S.legends;
    // 陨星：三处敌群各砸一颗
    for (const [x, y] of [[3, 2], [12, 2], [8, 7]]) for (let i = 0; i < 3; i++) { const e = spawnAt('orc', x + i * 0.3, y, false); e.afx = []; }
    S.meteors = []; autoCast('sk_meteor', 5); out.meteors = S.meteors.length; out.burn = S.meteors.every(m => m.burn > 0);
    // 冰霜新星：5 格、冻 2.5 秒
    S.enemies = []; S.cards.sk_nova = 5; S.cards.ev_nova = 1;
    const far = spawnAt('orc', CRYSTAL.x + 4.4, CRYSTAL.y, false); far.afx = []; autoCast('sk_nova', 5); out.nova = [far.freezeT, far.hp < far.maxHp];
    // 闪电：麻痹
    S.enemies = []; S.cards.sk_chain = 5; S.cards.ev_chain = 1;
    const c1 = spawnAt('orc', 8, 3, false), c2 = spawnAt('orc', 9, 3, false); c1.afx = c2.afx = []; autoCast('sk_chain', 5); out.chain = [c1.stunT, c2.stunT];
    // 飞刃：多 3 把
    S.cards.sk_blade = 5; buildBlades(); const n0 = S.blades.length; T.pickCard('ev_blade', true); out.blades = [n0, S.blades.length];
    // 圣光：进化后对普通敌人也有伤害
    S.enemies = []; S.cards.sk_holy = 4; const o = spawnAt('orc', CRYSTAL.x + 1, CRYSTAL.y, false); o.afx = []; autoCast('sk_holy', 4); const h0 = o.hp < o.maxHp;
    S.cards.ev_holy = 1; autoCast('sk_holy', 4); out.holy = [h0, o.hp < o.maxHp];
    return out;
  });
  console.log('进化:', JSON.stringify(ev));
  check(ev.before.length === 0 && ev.after.includes('ev_meteor'), '技能卡满级前不出进化卡，满级后才进牌堆', ev);
  check(ev.rare && ev.banner && ev.gone, '进化卡能在稀有货架出现；拿了有横幅，之后不再出现', ev);
  check(ev.legendSyn === 0 && ev.legends === 0, '进化卡不算传说卡（不触发传说之证）', ev);
  check(ev.meteors === 3 && ev.burn, '天罚陨星：一次砸 3 颗并附带灼烧', ev);
  check(ev.nova[0] >= 1.9 && ev.nova[1], '绝对零度：4.4 格外的敌人也被冻 2 秒', ev.nova);
  check(ev.chain.every(t => t >= 0.35), '雷霆风暴：被闪电击中的敌人麻痹', ev.chain);
  check(ev.blades[1] === ev.blades[0] + 2, '剑刃风暴：多 2 把飞刃', ev.blades);
  check(!ev.holy[0] && ev.holy[1], '神圣审判：进化前圣光不伤普通敌人，进化后会', ev.holy);

  // ---------- 集火 ----------
  await fresh(2);
  const fo = await p.evaluate(() => {
    const T = __td, S = T.S, out = {};
    const shooter = S.units.find(u => u.def.place === 'high') || (addUnit(UNITS.find(d => d.id === 'archer')), S.units[S.units.length - 1]);
    shooter.x = CRYSTAL.x; shooter.y = CRYSTAL.y;
    const near = spawnAt('orc', CRYSTAL.x + 1, CRYSTAL.y, false), farE = spawnAt('orc', CRYSTAL.x + 2.4, CRYSTAL.y, false); near.afx = farE.afx = []; near.revealed = farE.revealed = true;
    out.def = pickTargets(shooter)[0] === near;
    setFocus(farE); out.pick = pickTargets(shooter)[0] === farE; out.tip = S.events.some(e => e.type === 'tip');
    const h0 = farE.hp; hurt(farE, 1000, 'true', false, shooter); const d1 = h0 - farE.hp;
    const h1 = near.hp; hurt(near, 1000, 'true', false, shooter); const d2 = h1 - near.hp; out.bonus = +(d1 / d2).toFixed(2);
    setFocus(farE); out.toggled = S.focus === null;
    setFocus(farE); hurt(farE, farE.hp * 5, 'true', false, shooter); out.cleared = focusFoe() === null;
    // 点战场上的敌人 = 集火
    const e3 = spawnAt('orc', 5, 5, false); e3.afx = []; const r = cv.getBoundingClientRect();
    cv.dispatchEvent(new MouseEvent('click', { clientX: r.left + (e3.x + 0.5) / COLS * r.width, clientY: r.top + (e3.y + 0.5) / ROWS * r.height, bubbles: true }));
    out.click = S.focus === e3;
    return out;
  });
  console.log('集火:', JSON.stringify(fo));
  check(fo.def && fo.pick, '集火目标在射程内就优先打它', fo);
  check(fo.bonus === 1.15, '集火目标受到的伤害 +15%', fo.bonus);
  check(fo.toggled && fo.cleared && fo.tip, '再点一下取消；目标死了自动清掉；第一次集火有提示', fo);
  check(fo.click, '点战场上的敌人就能集火', fo.click);

  // ---------- 首领演出 ----------
  await fresh(3);
  const bo = await p.evaluate(() => {
    const T = __td, S = T.S, out = {};
    const e = spawnAt('boss', 8, 2, false); e.afx = []; S.boss = e; S.cine = null; S.fx = [];
    hurt(e, e.maxHp * 0.55, 'true', false, S.units[0]);
    out.enrage = e.enraged; out.box = S.fx.some(f => f.kind === 'letterbox');
    S.fx = []; hurt(e, e.maxHp * 2, 'true', false, S.units[0]);
    out.q = (S.fxq || []).length; out.box2 = S.fx.some(f => f.kind === 'letterbox');
    S.enemies = []; for (let i = 0; i < 45; i++) T.step(1 / 30);
    out.after = S.fx.filter(f => f.kind === 'banner').map(f => f.text); out.left = (S.fxq || []).length;
    out.booms = S.fx.filter(f => f.kind === 'boom').length;
    return out;
  });
  console.log('首领:', JSON.stringify(bo));
  check(bo.enrage && bo.box, '首领狂暴 / 换形态时上下黑边', bo);
  check(bo.q >= 8 && bo.box2, '首领被击破：排队放连环爆炸', bo);
  check(bo.after.some(t => /首领击破 · 深渊领主/.test(t)) && bo.left === 0, '爆炸放完弹出「首领击破」横幅', bo);

  // ---------- 技能特写 ----------
  await fresh(2);
  const sk = await p.evaluate(() => {
    const T = __td, S = T.S, u = S.units[0];
    spawnAt('orc', u.x + 0.5, u.y, false).afx = [];
    u.sp = u.def.sp; u.skillT = 0; useSkill(u);
    const a = S.fx.filter(f => f.kind === 'skillcut');
    const u2 = S.units[1] || u; u2.sp = u2.def.sp; u2.skillT = 0; u2.down = 0; if (u2 !== u) useSkill(u2);
    const b2 = S.fx.filter(f => f.kind === 'skillcut');
    return { n: a.length, name: a[0] && a[0].skill, one: b2.length };
  });
  console.log('技能特写:', JSON.stringify(sk));
  check(sk.n === 1 && sk.name && sk.one === 1, '放技能时弹出一条技能特写（同时只留一条）', sk);

  // 实战跑一段：全部进化 + 首领关，确认不报错
  await p.evaluate(() => { closeOverlay(); __td.newRun(7, {}); const T = __td, S = T.S; S.pending = 0; S.offer = null;
    for (const c of CARDS.filter(c => c.evo)) { S.cards[c.evo] = CARD_BY[c.evo].max; S.cards[c.id] = 1; } buildBlades();
    for (let i = 0; i < 30 * 60 && !S.over; i++) { if (S.offer) T.pickCard(S.offer[0].id); if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); T.step(1 / 30); } });
  await p.waitForTimeout(300);
  noErrors(errs);
  report('phase5');
  await b.close();
})();
