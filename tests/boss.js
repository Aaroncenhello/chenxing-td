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
    const T = window.__td, out = {};
    T.newRun(2, { hero:'knight', charOpen: T.UNITS.map(x=>x.id) });
    const S = T.S; S.offer=null; S.pending=0;
    // 手动放一个深渊领主，看入场演出
    const e = spawnAt('boss', 3, 4, false);
    out.cine = S.cine ? { name:S.cine.name, title:S.cine.title, ult:S.cine.ult, dur:S.cine.dur } : null;
    out.cineWave = S.cineWave;
    // 演出期间不推进模拟
    S.cine = null;
    // 读条：跳到冷却结束
    e.ultCd = 0.01;
    let castSeen = null;
    for (let i=0;i<30*3;i++){ step(1/30); if (e.cast && !castSeen) castSeen = { name:e.cast.u.name, dur:e.cast.dur, need:Math.round(e.cast.need) }; }
    out.cast = castSeen;
    out.stillCasting = !!e.cast;
    // 打断：直接打够伤害
    if (e.cast) { hurt(e, e.cast.need * 1.05, 'true', false, null); }
    out.broken = e.brokenT > 0; out.breaks = S.breaks; out.dustAfter = S.dust;
    // 破防加伤
    const hp0 = e.hp; hurt(e, 1000, 'true', false, null); out.brokenMult = Math.round((hp0 - e.hp));
    // 等破防结束，让大招放出来一次
    for (let i=0;i<30*10;i++) step(1/30);
    e.ultCd = 0.01; e.brokenT = 0;
    const cr0 = S.crystal.hp;
    let fired = false;
    for (let i=0;i<30*8;i++){ step(1/30); if (!e.cast && fired === false && e.ultCd > 5) fired = true; }
    out.ultFired = fired;
    // 冻结打断
    e.brokenT = 0; e.ultCd = 0.01;
    for (let i=0;i<30*2;i++) step(1/30);
    if (e.cast) { e.freezeT = 1; step(1/30); }
    out.freezeBreak = !e.cast && e.brokenT > 0;
    // 精英入场
    T.newRun(0, { hero:'knight', charOpen: T.UNITS.map(x=>x.id) });
    const S2 = T.S; S2.offer=null; S2.pending=0; S2.wave = totalWaves();
    const e2 = spawnAt('orc', 3, 4, true);
    out.eliteCine = S2.cine ? S2.cine.name + '/' + S2.cine.title : null;
    out.eliteUlt = !!ultOf(e2);
    S2.cine = null;
    // 4 阶外观：确认每个英雄 lv4 两个分支都能画出来且不同
    const px = [];
    for (const u of T.UNITS) {
      const a = renderHero(u, {phase:'idle', face:1, lv:4, branch:'A'});
      const b2 = renderHero(u, {phase:'idle', face:1, lv:4, branch:'B'});
      const c1 = renderHero(u, {phase:'idle', face:1, lv:1});
      const da = a.toDataURL(), db = b2.toDataURL(), dc = c1.toDataURL();
      if (da === db || da === dc) px.push(u.id);
    }
    out.sameLook = px;
    return out;
  });
  console.log(JSON.stringify(o, null, 1));
  check(!!o.cine, '首领入场有演出', o.cine);
  check(!!o.cast && o.cast.need > 0, '首领会读条大招', o.cast);
  check(o.broken && o.breaks === 1, '打够伤害能打断读条并破防', { broken: o.broken, breaks: o.breaks });
  check(o.brokenMult > 1000, '破防期间受到的伤害变多', o.brokenMult);
  check(o.ultFired, '不打断时大招能放出来', o.ultFired);
  check(o.freezeBreak, '冻结能打断读条', o.freezeBreak);
  check(!!o.eliteCine && o.eliteUlt, '最终波精英也有演出和大招', { eliteCine: o.eliteCine, eliteUlt: o.eliteUlt });
  check(o.sameLook.length === 0, '每个英雄 4 阶两个分支外观不同', o.sameLook);
  noErrors(errs);
  report('boss');
  await b.close();
})();
