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
    const T = window.__td, out = { bad: [], events: EVENTS.length };
    // 每个事件的每个选项都执行一遍，看有没有报错
    for (const def of EVENTS) {
      for (let i = 0; i < def.opts.length; i++) {
        T.newRun(4, { hero: 'knight', charOpen: T.UNITS.map(u=>u.id), charLv: Object.fromEntries(T.UNITS.map(u=>[u.id,6])) });
        const S = T.S; S.offer=null; S.pending=0; S.dust = 500;
        for (const id of ['ally_sword','ally_archer','ally_mage']) { try { T.pickCard(id, true); } catch(e) {} }
        for (let k=0;k<30*30;k++){ if(S.shop)T.closeShop(); if(S.event)S.event=null; if(S.offer)S.offer=null; T.step(1/30); }
        S.event = { def, opts: def.opts };
        try { T.takeEvent(i); } catch (e) { out.bad.push(def.id + '#' + i + ': ' + e.message); continue; }
        const before = { hp: S.crystal.hp, units: S.units.length, dust: S.dust };
        for (let k=0;k<30*40;k++){ if(S.shop)T.closeShop(); if(S.event)T.takeEvent(0); if(S.offer)T.pickCard(S.offer[0].id); T.step(1/30); }
        if (!isFinite(S.crystal.hp) || S.units.some(u => !isFinite(u.maxHp) || u.maxHp <= 0)) out.bad.push('NaN after ' + def.id + '#' + i);
      }
    }
    // 事件触发时机
    T.newRun(0, { hero:'knight', charOpen: T.UNITS.map(u=>u.id), charLv: Object.fromEntries(T.UNITS.map(u=>[u.id,10])), perks:['walls','veteran'] });
    const S = T.S; S.offer=null; S.pending=0;
    const seen = [];
    for (let k=0;k<30*400 && !S.over;k++){
      if (S.shop) { T.closeShop(); continue; }
      if (S.event) { seen.push(S.wave + ':' + S.event.def.id); T.takeEvent(0); continue; }
      if (S.pending>0 && !S.offer) { T.openOffer(); continue; }
      if (S.offer) { const o2=S.offer.slice().sort((a,b)=>((b.rare||0)+(b.kind==='unit'?3:0))-((a.rare||0)+(a.kind==='unit'?3:0))); T.pickCard(o2[0].id); continue; }
      T.step(1/30);
    }
    out.seen = seen; out.wave = S.wave; out.over = S.over; out.eventWave = S.eventWave;
    return out;
  });
  console.log(JSON.stringify(o, null, 1));
  check(o.bad.length === 0, '每个事件的每个选项都能正常执行', o.bad.slice(0, 8));
  // 抽到的事件可用选项不足 2 个时会跳过（设计如此），所以看第 5 波的事件有没有被处理
  check(o.wave <= 5 || o.eventWave >= 5, '打过第 5 波后会处理事件', o);
  check(o.seen.every(x => +x.split(':')[0] >= 5), '事件不会在第 5 波之前出现', o.seen);
  noErrors(errs);
  report('events');
  await b.close();
})();
