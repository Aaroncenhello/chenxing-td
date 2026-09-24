// 每日/每周挑战的可复现性：同样的种子、同样的操作，整局结果必须完全一样；普通模式则每局不同
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, v5: true, v11: true, story: [...Array(16).keys()].map(i => 'pre' + i) })));
  await p.reload(); await p.waitForTimeout(400);

  // 固定的「玩家」：总是选第一张牌、事件选第一个、商店买得起就买第一件，打 6 分钟游戏时间（或打完），记下整局的指纹
  const play = (mode) => p.evaluate((mode) => {
    const T = __td, clv = Object.fromEntries(T.UNITS.map(u => [u.id, 8])), base = { hero: 'mage', charLv: clv, charOpen: T.UNITS.map(u => u.id) };
    if (mode === 'week') { const wi = weekInfo(); T.newRun(wi.stage, { ...base, week: wi, diff: wi.diff }); }
    else if (mode === 'daily') { const td = todayInfo(); T.newRun(td.stage, { ...base, daily: { seed: td.seed, mod: td.mod, date: td.date }, diff: DAILY.diff }); }
    else T.newRun(6, base);
    const S = T.S; let g = 0;
    const offers = [], events = [], shops = [];
    while (!S.over && g < 30 * 360) {
      if (S.shop) { shops.push(S.shop.items.map(i => i.id).join('+')); const it = S.shop.items.find(i => !i.sold && S.dust >= i.price); if (it) T.buyShop(it.id); T.closeShop(); continue; }
      if (S.event) { events.push(S.event.def.id); T.takeEvent(0); continue; }
      if (S.pending > 0 && !S.offer) T.openOffer();
      if (S.offer) { offers.push(S.offer.map(c => c.id).join('+')); T.pickCard(S.offer[0].id); continue; }
      // 晨星碑每步回满（碑受的伤害按最大生命的百分比算，加厚没用），让这局打够久、覆盖到事件和各种词缀；这一步本身也是确定的
      if (g % 30 === 0) S.crystal.hp = S.crystal.maxHp;
      T.step(1 / 30); g++;
    }
    return { over: S.over, wave: S.wave, kills: S.kills, dust: S.dust, hp: Math.round(S.crystal.hp), lv: S.level,
      relics: S.relics.join(','), afx: [...new Set(S.afxSeen || [])].join(','), offers: offers.join('|'), events: events.join(','), shops: shops.join('|'), t: Math.round(S.t) };
  }, mode);

  for (const mode of ['week', 'daily']) {
    const a = await play(mode), b2 = await play(mode);
    console.log(mode + ' A:', JSON.stringify({ ...a, offers: a.offers.slice(0, 80) }));
    console.log(mode + ' B:', JSON.stringify({ ...b2, offers: b2.offers.slice(0, 80) }));
    const diff = Object.keys(a).filter(k => a[k] !== b2[k]);
    check(diff.length === 0, (mode === 'week' ? '每周' : '每日') + '挑战：同样的操作打两次，结果完全一样', diff.map(k => `${k}: ${String(a[k]).slice(0, 60)} ≠ ${String(b2[k]).slice(0, 60)}`));
    check(a.wave >= 8 && a.offers.length > 0 && a.events, (mode === 'week' ? '每周' : '每日') + '挑战这局打了 8 波以上、遇到了事件', { wave: a.wave, events: a.events });
  }
  // 普通模式不带种子，两局应该不一样（不然就是把 Math.random 也换掉了）
  const n1 = await play('normal'), n2 = await play('normal');
  check(n1.offers !== n2.offers || n1.kills !== n2.kills, '普通模式每局随机不同', { a: n1.offers.slice(0, 60), b: n2.offers.slice(0, 60) });

  noErrors(errs);
  report('seeded');
  await b.close();
})();
