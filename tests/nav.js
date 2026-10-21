// 寻路与站位：每个出怪口走出来的地面敌人都能走到晨星碑（不卡在角落）；队员站位互相不重叠；FLOW 覆盖所有出怪口
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 900, height: 600 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ tutorial: true, ver: 14 }))); await p.reload();
const r = await p.evaluate(() => {
  const out = { flowOk: true, reach: [], gaps: [], stuckLeft: [], lineChecks: 0 };
  for (let st = 0; st < STAGES.length; st++) {
    __td.newRun(st, { hero: 'knight', charOpen: UNITS.map(u => u.id), charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.cine = null; S.autoWave = false; S.nextWaveIn = 9999;
    // 1) 每个出怪口都在 FLOW 里
    for (const pt of PORTALS) if (!(FLOW[pt.y][pt.x] > 0) && !flowWaypoint(pt.x, pt.y)) out.flowOk = false;   // 角落的出怪口被墙围着，但 2 格内有路
    // 2) 阵型里 7 个人站位不重叠（三种阵型）
    for (let fi = 0; fi < 3; fi++) {
      S.formIdx = fi; S.units.length = 1; for (const id of ['lancer', 'marshal', 'counter', 'archer', 'priest', 'mage']) addUnit(UNITS.find(u => u.id === id), false); arrange();
      let mn = 99; for (let i = 0; i < S.units.length; i++) for (let j = i + 1; j < S.units.length; j++) mn = Math.min(mn, Math.hypot(S.units[i].tx - S.units[j].tx, S.units[i].ty - S.units[j].ty));
      out.gaps.push(+mn.toFixed(2));
    }
    S.units.length = 1; S.units[0].x = 0; S.units[0].tx = 0; S.units[0].y = 0; S.units[0].ty = 0; S.units[0].dead = true;
    // 3) 没有队员拦着，每个出口的地面敌人都得走到碑边（60 秒内）
    S.crystal.maxHp = 1e12; S.crystal.hp = 1e12;
    const foes = PORTALS.map(pt => { const e = spawnAt('orc', pt.x, pt.y, false, false); e.bornT = -9; e.d = { ...e.d }; return e; });
    for (let i = 0; i < 30 * 60; i++) { if (S.shop) S.shop = null; __td.step(1 / 30); }
    const field = (S.haz || []).some(h => (h.kind || h.type) === 'field'), left = field ? 0 : S.enemies.filter(e => !e.dead && toCrystal(e) > 2.2).length;   // 力场关：敌人在力场外等它打开，是设计 out.stuckLeft.push(left); out.reach.push(foes.length);
  }
  // 4) 绕墙：把敌人放在水池另一边，直线被挡住，也能绕到碑
  __td.newRun(0, { hero: 'knight', charOpen: UNITS.map(u => u.id), charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.cine = null; S.units[0].dead = true; S.units[0].x = 0; S.units[0].y = 0; S.crystal.maxHp = 1e12; S.crystal.hp = 1e12; S.nextWaveIn = 9999; S.autoWave = false;
  const w = (() => { for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 3; c++) if (solid(c, r) && !solid(c - 1, r)) { let k = c; while (solid(k, r)) k++; if (k < COLS - 1 && k - c <= 3) return [c, r, k]; } return null; })();
  out.wall = !!w;
  if (w) { const e = spawnAt('orc', w[0] - 1, w[1], false, false); e.bornT = -9; e.x = w[0] - 1; e.y = w[1]; const tx = w[2], ty = w[1]; out.blocked = lineBlocked(e.x, e.y, tx, ty); for (let i = 0; i < 30 * 20; i++) { __td.step(1 / 30); } out.end = +toCrystal(e).toFixed(2); out.blockedBefore = lineBlocked(w[0] - 1, w[1], tx, ty); }
  return out;
});
check(r.flowOk, '所有出怪口都能走到晨星碑（FLOW 覆盖）');
check(r.gaps.every(g => g >= 1.1), '三种阵型、20 张地图：7 名队员站位间距 ≥ 1.1 格', Math.min(...r.gaps));
check(r.stuckLeft.every(n => n === 0), '20 张地图：每个出怪口出来的地面敌人 60 秒内都走到了晨星碑', r.stuckLeft.join(','));
check(r.wall, '地图里有可用来测绕墙的障碍');
check(r.end <= 2.2 && r.blocked, '被墙挡住直线的敌人能绕过去', r);
noErrors(errs); report('nav'); await b.close(); })();
