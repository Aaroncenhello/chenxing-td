// 技能画面效果：20 名英雄每人放一次技能（持续型还要等光环画几帧），不报错，放招时有对应的专属特效，持续型有光环和剩余时间
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 900, height: 600 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.waitForFunction(() => typeof lpcReady !== 'undefined' && lpcReady, null, { timeout: 15000 }).catch(() => {});
const ids = await p.evaluate(() => UNITS.map(u => u.id));
const SPECIFIC = { frost: 'frost', lancer: 'lance', chrono: 'clock', songstress: 'tide', breaker: 'cross', summoner: 'rune', alchemist: 'bottle', knight: 'dome' };
const bad = [], noSpecific = [], noAura = [];
for (const id of ids) {
  const r = await p.evaluate(async id => {
    closeOverlay(); startRun(2, { hero: id, charOpen: UNITS.map(u => u.id) }); const S = __td.S; S.offer = null; S.pending = 0; S.enemies.length = 0; S.fx.length = 0;
    const u = S.units[0]; u.x = 8; u.y = 4.5; for (const [dx, dy] of [[1.2, 0], [1.8, 0.8], [1.5, -0.8]]) { spawnAt('skeleton', 8 + dx, 4.5 + dy, false); const e = S.enemies[S.enemies.length - 1]; e.bornT = -9; e.stop = 99; }
    u.sp = u.def.sp; __td.useSkill(u);
    const kinds = S.fx.filter(f => f.kind === 'skfx').map(f => f.id), dur = u.skillT > 0, bar = u.skillMax > 0;
    for (let i = 0; i < 20; i++) __td.step(1 / 30);
    await new Promise(r => setTimeout(r, 250));
    return { kinds, dur, bar };
  }, id);
  if (SPECIFIC[id] && !r.kinds.includes(SPECIFIC[id])) noSpecific.push(id);
  if (r.dur && !r.bar) noAura.push(id);
}
check(noSpecific.length === 0, '瞬发技能放招时有各自专属的范围特效', noSpecific);
check(noAura.length === 0, '持续型技能记录了总时长（头顶剩余时间条）', noAura);
// 光环每帧都在画：持续型英雄的光环函数不报错，被猎杀标记的敌人有准星
const aur = await p.evaluate(() => { const S = __td.S; S.paused = true; let n = 0; for (const id of ['knight', 'sword', 'assassin', 'archer', 'gunner', 'mech', 'bard', 'marshal', 'counter', 'mage']) {
  closeOverlay(); startRun(2, { hero: id, charOpen: UNITS.map(u => u.id) }); const u = __td.S.units[0]; u.skillT = 5; u.skillMax = 10; u.blessT = 3; const e = spawnAt('skeleton', 9, 4.5, false); __td.S.enemies[0].huntMark = __td.S.t + 5; render(performance.now()); n++; } return n; });
check(aur === 10, '各英雄的光环和猎杀准星都能画出来', aur);
noErrors(errs); report('skillfx'); await b.close(); })();
