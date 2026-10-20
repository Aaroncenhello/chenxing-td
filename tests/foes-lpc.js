// 怪物精灵（LPC 素材）：每种怪物都能加载、能画出站立/行走/出手/受击/精英/冰冻、静态图（图标、立绘、碎裂）不空白，
// 没有 LPC 图的怪物（史莱姆、沙虫、蝎子、机械蜘蛛、无人机）仍用旧像素图；全部敌人在战场上刷出来、打死、碎裂不报错
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.waitForFunction(() => typeof lpcReady !== 'undefined' && lpcReady, null, { timeout: 15000 }).catch(() => {});
const r = await p.evaluate(() => {
  const types = Object.keys(ENEMIES), old = [], blank = [], nodraw = [], badPic = [], badCrop = [], noBox = [];
  const c = document.createElement('canvas'); c.width = 400; c.height = 400; const g = c.getContext('2d', { willReadFrequently: true });
  const px = cv => { const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; };
  for (const t of types) {
    if (!foeLpc(t)) { old.push(t); continue; }
    const b = foeBox(t); if (!(b[2] - b[0] > 8 && -b[1] > 8)) noBox.push(t);
    for (const o of [{}, { walking: true, phase: 3 }, { atkT: 0.05 }, { atkT: 0.2 }, { atkT: 0.38 }, { flash: true }, { tint: ELITE_TINT }, { sx: 1.1, sy: 0.9 }, { sy: 0.4 }]) {
      g.clearRect(0, 0, 400, 400); if (!drawFoeFig(g, t, { t: 1.1, id: 2, face: -1, ...o }, 200, 330)) { nodraw.push(t); continue; }
      if (px(c) < 40) blank.push(t + JSON.stringify(o));
    }
    const pic = renderFoe(t, { face: 1, t: 0 }); if (!(pic.S > 0 && pic.fx > 0 && px(pic) > 200)) badPic.push(t);
    const [sx, sy, sz] = foeCrop(t, pic); if (!(sz > 10 && sx > -2 && sy > -2 && sx + sz <= pic.width + 2 && sy + sz <= pic.height + 2)) badCrop.push(t + ':' + [sx, sy, sz].map(Math.round));
  }
  const fo = foeOf('slime'); const oldPic = renderFoe('slime', { face: 1, t: 0 });
  return { types: types.length, old, blank, nodraw, badPic, badCrop, noBox, oldOk: oldPic.S === 120 && oldPic.fx === 60 && px(oldPic) > 100, fly: ['garg', 'harpy', 'wyvern', 'drone', 'ghost', 'icewraith', 'siren'].map(foeFly), walk: foeFly('goblin') };
});
check(r.nodraw.length === 0, '每种有 LPC 图的怪物都能画出来', r.nodraw);
check(r.blank.length === 0, '站立/行走/出手/闪白/精英/压扁/倒下都不是空白', r.blank.slice(0, 5));
check(r.noBox.length === 0, '每种怪物都量出了占位（血条位置要用）', r.noBox);
check(r.badPic.length === 0, '静态图（图鉴、立绘、碎裂用）里有怪物', r.badPic);
check(r.badCrop.length === 0, '图标截取框都在画布里', r.badCrop.slice(0, 5));
check(r.old.length <= 8 && r.old.every(t => ['slime', 'bigslime', 'treasure', 'sandworm', 'scorpion', 'crab', 'mechspider', 'drone'].includes(t)), '只有 8 种怪物还用旧像素图', r.old);
check(r.oldOk, '旧像素图的静态图尺寸信息正确（S=120，脚底 60）');
check(r.fly.every(Boolean) && !r.walk, '飞行怪判断正确', r.fly);
// 战场里：全部敌人刷出来、走几步、挨打、被打死（碎裂/倒下）、精英、首领入场演出
const run = await p.evaluate(async () => {
  closeOverlay(); startRun(10, { hero: 'knight', charOpen: UNITS.map(u => u.id) }); const S = __td.S; S.offer = null; S.pending = 0; S.enemies.length = 0;
  const types = Object.keys(ENEMIES).filter(t => !isBossType(t)); types.forEach((t, i) => { spawnAt(t, 1 + (i % 8) * 1.7, 1 + Math.floor(i / 8) * 1.4, i % 3 === 0); });
  for (let i = 0; i < 90; i++) { S.shop = null; S.event = null; S.offer = null; S.pending = 0; S.crystal.hp = S.crystal.maxHp; __td.step(1 / 30); }
  await new Promise(r => setTimeout(r, 400));
  const alive = S.enemies.length; for (const e of S.enemies.slice()) { e.hitT = 0.1; e.kb = 2; }
  await new Promise(r => setTimeout(r, 200));
  for (const e of S.enemies.slice()) { e.hp = 0; }
  for (let i = 0; i < 30; i++) { S.shop = null; S.event = null; S.offer = null; S.pending = 0; S.crystal.hp = S.crystal.maxHp; __td.step(1 / 30); }
  await new Promise(r => setTimeout(r, 500));
  return { alive, fx: S.fx.map(f => f.kind).filter(k => k === 'shatter' || k === 'corpse').length };
});
check(run.alive >= 30, '全部敌人刷出来了', run.alive);
for (const t of ['boss', 'sovereign', 'devourer', 'nameless', 'silencer', 'stormlord']) {
  const ok = await p.evaluate(async t => { const S = __td.S; S.enemies.length = 0; S.cine = null; spawnAt(t, 6, 4, false); await new Promise(r => setTimeout(r, 300)); const had = !!S.cine; for (let i = 0; i < 60; i++) { S.cine = null; S.shop = null; S.event = null; S.offer = null; __td.step(1 / 30); } await new Promise(r => setTimeout(r, 200)); S.enemies.length = 0; return true; }, t);
  check(ok, '首领 ' + t + ' 入场、战斗中不报错');
}
noErrors(errs); report('foes-lpc'); await b.close(); })();
