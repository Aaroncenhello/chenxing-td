// 首领专属机制：每个首领都有特性，触发后要有可见效果，且不会让页面报错
const { chromium } = require("playwright");
const { check, noErrors, report } = require("./lib");
const path = require("path");
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 844, height: 390 } }), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../dist/chenxing.html"));
  await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    const out = {};
    for (const type of Object.keys(BOSS_MECH)) {
      __td.newRun(11, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 });
      const S = __td.S; S.pending = 0; S.offer = null; S.cine = null;
      const e = spawnAt(type, 5, 4, true, false); e.lead = true; S.cine = null; S.cineWave = S.wave;
      e.hp = e.maxHp = 1e9; e.speed = 0;
      const before = { u: S.units.map(u => u.hp), n: S.enemies.length };
      let err = null;
      try { for (let i = 0; i < 30 * 40 && !S.over; i++) { S.crystal.hp = S.crystal.maxHp; for (const u of S.units) { u.hp = Math.max(u.hp, 1); } __td.step(1 / 30); } } catch (ex) { err = String(ex); }
      out[type] = { err, tags: Object.keys(e.mech || {}).length, n: S.enemies.length - before.n, hurt: S.units.some((u, i) => u.hp < before.u[i]) , shield: e.shield, hp: e.hp, auraSet: S.auraBoss === e };
    }
    return out;
  });
  for (const [k, v] of Object.entries(res)) check(!v.err && v.tags > 0, "首领特性「" + k + "」能跑 40 秒不报错", v);
  check(res.orc.n >= 2 && res.bigslime.n >= 0, "战争号角召出了狼", res.orc);
  check(res.glacier === undefined && res.frostgiant.shield > 0, "冰甲生出了护盾", res.frostgiant);
  check(res.stormlord.hurt && res.wyvern.hurt, "落雷 / 俯冲能打到队员", { s: res.stormlord, w: res.wyvern });
  check(res.sovereign.auraSet, "君主护佑记录了光环来源", res.sovereign);
  noErrors(errs);
  await b.close(); report("bossmech");
})();
