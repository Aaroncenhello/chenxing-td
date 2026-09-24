const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({viewport:{width:1100,height:820}})).newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message+' || '+(e.stack||'').split('\n')[1]));
  p.on('console', m=>{ if(m.type()==='error'&&!/ERR_|net::/.test(m.text())) errs.push('c: '+m.text()); });
  await p.goto(GAME); await p.waitForTimeout(500);
  const out = await p.evaluate(() => {
    const T = window.__td, o = { bad: [] };
    // 所有菜单页都能打开
    const pages = ['showLevels','showPerks','showCodex','showAchv','showSaveBox'];
    for (const f of pages) { try { window[f](); } catch (e) { o.bad.push(f + ': ' + e.message); } }
    for (const u of T.UNITS) { try { showRoster(u.id); } catch (e) { o.bad.push('roster ' + u.id + ': ' + e.message); } }
    try { showRoster(); } catch (e) { o.bad.push('rosterList: ' + e.message); }
    closeOverlay();
    // 每个英雄开局 20 秒
    for (const u of T.UNITS) {
      try {
        T.newRun(0, { hero: u.id, charOpen: T.UNITS.map(x => x.id), charLv: Object.fromEntries(T.UNITS.map(x => [x.id, 6])), charTal: { [u.id]: {0:'t_atk',1:'t_sp',2:'t_focus'} } });
        const S = T.S; S.offer=null; S.pending=0;
        for (let i=0;i<30*20;i++){ if(S.shop)T.closeShop(); if(S.offer)T.pickCard(S.offer[0].id); T.step(1/30); }
      } catch (e) { o.bad.push('run ' + u.id + ': ' + e.message); }
    }
    // 每关都能开、地图和波次合法
    for (let st = 0; st < T.STAGES.length; st++) {
      try {
        T.newRun(st, { hero: 'knight', charOpen: T.UNITS.map(x => x.id) });
        const S = T.S; S.offer=null; S.pending=0;
        for (let i=0;i<30*8;i++){ if(S.shop)T.closeShop(); if(S.offer)S.offer=null; T.step(1/30); }
      } catch (e) { o.bad.push('stage ' + st + ': ' + e.message); }
    }
    // 守望 + 无尽 + 每日
    try { T.newRun(0, { hero:'marshal', vigil:true, charOpen:T.UNITS.map(x=>x.id) }); for(let i=0;i<30*20;i++){const S=T.S; if(S.shop)T.closeShop(); if(S.offer)T.pickCard(S.offer[0].id); T.step(1/30);} o.vigilWave = T.S.wave; } catch(e){ o.bad.push('vigil: '+e.message); }
    try { T.newRun(3, { hero:'chrono', endless:true, charOpen:T.UNITS.map(x=>x.id) }); for(let i=0;i<30*20;i++){const S=T.S; if(S.shop)T.closeShop(); if(S.offer)T.pickCard(S.offer[0].id); T.step(1/30);} o.endlessWave = T.S.wave; } catch(e){ o.bad.push('endless: '+e.message); }
    // 所有卡都能拿
    T.newRun(0, { hero:'knight', charOpen:T.UNITS.map(x=>x.id) });
    const S2 = T.S; S2.offer=null; S2.pending=0;
    let cardFail = 0;
    for (const c of CARDS) { try { T.pickCard(c.id, true); } catch(e) { cardFail++; o.bad.push('card '+c.id+': '+e.message); } }
    for (const c of SIG) { try { T.pickCard(c.id, true); } catch(e) { o.bad.push('sig '+c.id+': '+e.message); } }
    for (const c of CURSES) { try { T.pickCard(c.id, true); } catch(e) { o.bad.push('curse '+c.id+': '+e.message); } }
    for (let i=0;i<30*15;i++){ if(S2.shop)T.closeShop(); if(S2.offer)S2.offer=null; T.step(1/30); }
    o.cards = Object.keys(S2.cards).length; o.cardFail = cardFail;
    // 商店全买一遍
    T.newRun(0, { hero:'knight', charOpen:T.UNITS.map(x=>x.id) });
    const S3 = T.S; S3.dust = 99999; S3.offer=null; S3.pending=0;
    for (let k=0;k<6;k++){ openShop(); if (S3.shop) { for (const it of S3.shop.items) { try { T.buyShop(it.id); } catch(e){ o.bad.push('shop '+it.id+': '+e.message); } } T.closeShop(); } }
    o.dustLeft = S3.dust;
    return o;
  });
  console.log(JSON.stringify(out, null, 1));
  console.log('ERRORS', errs.slice(0,10));
  await b.close();
})();
