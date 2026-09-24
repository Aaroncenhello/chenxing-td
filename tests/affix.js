const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({viewport:{width:1100,height:820}})).newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message+' || '+(e.stack||'').split('\n')[1]));
  p.on('console', m=>{ if(m.type()==='error'&&!/ERR_|net::/.test(m.text())) errs.push('c: '+m.text()); });
  await p.goto(GAME); await p.waitForTimeout(500);
  const o = await p.evaluate(() => {
    const T = window.__td, out = { bad: [], affix: AFFIX.length, rolled: {} };
    // 每条词缀都强制挂一次，跑 30 秒看有没有报错
    for (const a of AFFIX) {
      T.newRun(3, { hero:'knight', charOpen:T.UNITS.map(u=>u.id), charLv: Object.fromEntries(T.UNITS.map(u=>[u.id,6])) });
      const S = T.S; S.offer=null; S.pending=0;
      for (const id of ['ally_sword','ally_archer','ally_priest']) { try { T.pickCard(id, true); } catch(e){} }
      const e = spawnAt('orc', 3, 4, true);
      e.afx = [a.id];
      if (a.id === 'bulwark') { e.shield = Math.round(e.maxHp*0.25); e.maxShield = e.shield; e.afxWard = 1; }
      const hp0 = e.hp;
      for (let i=0;i<30*30;i++){ if(S.shop)T.closeShop(); if(S.event)T.takeEvent(0); if(S.offer)S.offer=null; T.step(1/30); }
      if (!isFinite(S.crystal.hp)) out.bad.push('NaN crystal after ' + a.id);
      if (S.units.some(u => !isFinite(u.hp))) out.bad.push('NaN unit after ' + a.id);
    }
    // 自然掷出的分布
    T.newRun(7, { hero:'knight', charOpen:T.UNITS.map(u=>u.id) });
    const S2 = T.S; S2.offer=null; S2.pending=0;
    for (let i=0;i<300;i++){ const e = spawnAt('orc', 2, 2, true); for (const id of (e.afx||[])) out.rolled[id] = (out.rolled[id]||0)+1; e.dead = true; }
    S2.enemies = [];
    // 首领必带 2 条
    const bs = spawnAt('boss', 5, 4, false);
    out.bossAfx = bs.afx;
    out.eRes = eRes(bs) - bs.d.res;
    return out;
  });
  console.log(JSON.stringify(o, null, 1));
  check(o.bad.length === 0, '每条词缀挂上后都不出 NaN', o.bad);
  check(Object.keys(o.rolled).length === o.affix, '300 只精英里每条词缀都至少出现过一次', o.rolled);
  check(Array.isArray(o.bossAfx) && o.bossAfx.length >= 2, '首领至少带 2 条词缀', o.bossAfx);
  noErrors(errs);
  report('affix');
  await b.close();
})();
