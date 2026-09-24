const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
// headless balance sim for 7.0
const { chromium } = require('playwright');
const SP = process.env.SP;
const STAGES_N = +(process.env.ST || 8);
const ST0 = +(process.env.ST0 || 0);
const RUNS = +(process.env.RUNS || 3);
const DIFF = +(process.env.DIFF || 0);
const HERO = process.env.HERO || '';
const CLV = +(process.env.CLV || 1);
const PERKS = (process.env.PERKS || '').split(',').filter(Boolean);
const VIG = !!process.env.VIG;
const DISK = JSON.parse(process.env.DISK || "{}");
const ABY = +(process.env.ABY || 0);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 900, height: 700 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' || ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME);
  await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: [3,3,3,3,3,3,3,3,3,3,3,3], tutorial: true, story: [0,1,2,3,4,5,6,7].map(i => 'pre' + i) })));
  await p.reload();
  await p.waitForTimeout(500);

  const out = await p.evaluate(async ({ STAGES_N, ST0, RUNS, DIFF, HERO, CLV, PERKS, VIG, DISK, ABY }) => {
    const res = [];
    const T = window.__td;
    const heroes = T.UNITS.filter(u => u.joinAt === 0).map(u => u.id);
    for (let st = ST0; st < STAGES_N; st++) {
      for (let r = 0; r < RUNS; r++) {
        const hero = HERO || heroes[r % heroes.length];
        const clv = Object.fromEntries(T.UNITS.map(u => [u.id, CLV]));
        T.newRun(st, { hero, diff: DIFF, charLv: clv, perks: PERKS, charOpen: T.UNITS.map(u=>u.id), vigil: !!VIG, disk: DISK, abyss: ABY });
        const S = T.S;
        let guard = 0, picks = [];
        while (!S.over && guard < 60 * 30 * 25) {
          if (S.shop) {
            // 简单 AI：能买就买最贵的买得起的
            const aff = S.shop.items.filter(i => !i.sold && S.dust >= i.price).sort((a, b) => b.price - a.price);
            if (aff.length && S.dust > 60) { T.buyShop(aff[0].id); continue; }
            T.closeShop(); continue;
          }
          if (S.event) { T.takeEvent(Math.floor(Math.random() * S.event.opts.length)); continue; }
          if (S.pending > 0 && !S.offer) T.openOffer();
          if (S.offer) {
            // greedy-ish AI: prefer ally cards, then skill, then stat
            const o = S.offer;
            if (S.rerolls > 0 && !o.some(c => (c.rare || 0) >= 1) && Math.random() < 0.5) { T.rerollOffer(); continue; }
            const score = c2 => ((c2.rare || 0) * 2.2) + (c2.kind === 'unit' ? 3 : c2.kind === 'skill' ? 2 : c2.kind === 'special' ? 1.5 : 1) + Math.random() * 0.6;
            const best = o.slice().sort((a, b) => score(b) - score(a))[0];
            picks.push(best.id);
            T.pickCard(best.id);
            continue;
          }
          // auto ult / spells
          if (S.star >= 100) { try { T.castUlt(); } catch (e) {} }
          if (S.spells.meteor <= 0 && S.enemies.length >= 4) {
            let bx = 8, by = 4, bn = 0;
            for (const e of S.enemies) { let c = 0; for (const o of S.enemies) if (Math.hypot(o.x-e.x,o.y-e.y) <= 1.4) c++; if (c > bn) { bn = c; bx = e.x; by = e.y; } }
            try { T.castSpell('meteor', bx, by); } catch (err) {}
          }
          if (S.spells.heal <= 0 && S.units.some(u => u.down > 0 || u.hp < u.maxHp * 0.45)) { try { T.castSpell('heal'); } catch (err) {} }
          T.step(1 / 30);
          guard++;
        }
        res.push({ st, hero, breaks: S.breaks||0, ults: S.ultsFired||0, win: S.over === 'win', dust: S.dust, syn: Object.keys(S.syn||{}).length, chest: S.chest, stars: S.stars || 0, lv: S.level, wave: S.wave, waves: S.waves ? S.waves.length : 0,
          crystal: Math.round(S.crystal.hp / S.crystal.maxHp * 100), kills: S.kills, sec: Math.round(guard / 30),
          units: S.units.filter(u => !u.summon).length, picks: picks.length });
      }
    }
    return res;
  }, { STAGES_N, ST0, RUNS, DIFF, HERO, CLV, PERKS, VIG, DISK, ABY });

  console.log('ERRORS:', errs.slice(0, 8));
  const byStage = {};
  for (const r of out) (byStage[r.st] = byStage[r.st] || []).push(r);
  for (const st of Object.keys(byStage)) {
    const rs = byStage[st];
    const w = rs.filter(r => r.win).length;
    const avg = k => (rs.reduce((a, r) => a + r[k], 0) / rs.length).toFixed(1);
    console.log(`L${+st + 1} 胜 ${w}/${rs.length} ★${avg('stars')} 晶${avg('crystal')}% Lv${avg('lv')} 波${avg('wave')}/${rs[0].waves} 杀${avg('kills')} 队${avg('units')} 卡${avg('picks')} 断${avg('breaks')}/${avg('ults')} 尘${avg('dust')} 绊${avg('syn')} ${avg('sec')}s  ` +
      rs.map(r => `${r.hero}:${r.win ? '★' + r.stars : '×w' + r.wave}`).join(' '));
  }
  await b.close();
})();
