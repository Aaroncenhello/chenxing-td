const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + require('path').resolve(__dirname, '../dist/chenxing.html')); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = {}; __td.newRun(2); const S = __td.S; S.pending = 0; S.offer = null; S.dust = 500; S.charOpen = __td.UNITS.map(u => u.id);
  const open = id => { S.event = null; const def = EVENT_BY[id]; S.event = { def, opts: def.opts.filter(o => (!o.need || o.need()) && (!o.cost || S.dust >= o.cost)) }; return S.event.opts.length; };
  open('stranger'); __td.takeEvent(0); out.flag = S.evFlags.slice();
  out.noFlagNoChain = (() => { __td.newRun(2); const S2 = __td.S; S2.eventsDone = []; let seen = new Set(); for (let i = 0; i < 40; i++) { S2.event = null; S2.eventWave = -1; S2.dust = 999; openEvent(); if (S2.event) seen.add(S2.event.def.id); S2.eventsDone = []; } return [...seen].some(id => EVENT_BY[id].requires); })();
  __td.newRun(2); const S3 = __td.S; S3.evFlags = ['map']; S3.eventsDone = []; S3.dust = 999; S3.event = null; S3.eventWave = -1; openEvent(); out.followUp = S3.event && S3.event.def.id;
  // 每个事件的每个选项都执行一遍，别出 NaN / 报错
  out.bad = [];
  for (const ev of EVENTS) for (let i = 0; i < ev.opts.length; i++) {
    __td.newRun(3); const S4 = __td.S; S4.pending = 0; S4.offer = null; S4.dust = 999; S4.cards.sk_fire = 1; S4.cards.atk = 1;
    S4.event = { def: ev, opts: ev.opts }; try { __td.takeEvent(i); for (let k = 0; k < 60; k++) __td.step(1/30); } catch (e) { out.bad.push(ev.id + '#' + i + ':' + e.message); }
    if (!isFinite(S4.crystal.hp) || S4.units.some(u => !isFinite(u.hp)) || !isFinite(S4.dust)) out.bad.push('NaN ' + ev.id + '#' + i);
  }
  out.n = EVENTS.length; return out; });
console.log(JSON.stringify(r));
check(r.flag.includes('map') && r.followUp === 'treasure_map', '买下地图后，下次事件必出藏宝点', r);
check(r.noFlagNoChain === false, '没有前置标记时连锁事件不会出现', r);
check(r.bad.length === 0 && r.n === 20, `${r.n} 个事件、每个选项都能执行且无 NaN`, r.bad);
noErrors(errs); report('evchain'); await b.close(); })();
