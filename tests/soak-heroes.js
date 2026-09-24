const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true })));
  await p.reload(); await p.waitForTimeout(400);
  const out = await p.evaluate(async () => {
    const T = window.__td, res = [];
    const clv = Object.fromEntries(T.UNITS.map(u => [u.id, 9]));
    for (const D of T.UNITS) {
      const st = 4 + (T.UNITS.indexOf(D) % 12);
      T.newRun(st, { hero: D.id, charLv: clv, perks: ['walls','merchant','reroll','arcane'], charOpen: T.UNITS.map(u=>u.id) });
      const S = T.S; let guard = 0, sig = 0;
      while (!S.over && guard < 60 * 30 * 12) {
        if (S.shop) { const a = S.shop.items.filter(i=>!i.sold && S.dust>=i.price).sort((x,y)=>y.price-x.price); if (a.length && S.dust>60) { T.buyShop(a[0].id); continue; } T.closeShop(); continue; }
        if (S.event) { T.takeEvent(Math.floor(Math.random()*S.event.opts.length)); continue; }
        if (S.pending > 0 && !S.offer) T.openOffer();
        if (S.offer) {
          const s = S.offer.find(c => c.sig);           // 优先专属卡，把英雄机制跑一遍
          if (s) sig++;
          const c = s || S.offer.find(c2 => c2.rare >= 2) || S.offer[Math.floor(Math.random()*S.offer.length)];
          T.pickCard(c.id); continue;
        }
        if (S.star >= 100) { try { T.castUlt(); } catch(e){} }
        if (S.spells.meteor <= 0 && S.enemies.length >= 3) { const e = S.enemies[0]; try { T.castSpell('meteor', e.x, e.y); } catch(e2){} }
        if (S.spells.heal <= 0) { try { T.castSpell('heal'); } catch(e){} }
        for (const u of S.units) if (!u.summon && u.sp >= u.def.sp) { try { T.useSkill(u); } catch(e){} }
        T.step(1/30); guard++;
      }
      res.push({ hero: D.id, st, over: S.over, wave: S.wave, sig });
    }
    return res;
  });
  console.log(out.map(r => `${r.hero}@L${r.st+1}:${r.over === 'win' ? '★' : '×w'+r.wave}(sig${r.sig})`).join(' '));
  console.log('ERRORS:', errs.length ? errs.slice(0, 8) : 'none');
  await b.close();
})();
