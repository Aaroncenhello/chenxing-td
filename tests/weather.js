// 天气与昼夜：按主题和波次固定出现；数值只有轻微影响；画面不报错
const { chromium } = require("playwright");
const { check, noErrors, report } = require("./lib");
const path = require("path");
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 844, height: 390 } }), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../dist/chenxing.html"));
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const out = {};
    // 0 关（森林）每 5 波有 2 波下雨：(wave + stage) % 5 >= 3
    __td.newRun(0, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); let S = __td.S;
    S.pending = 0; S.offer = null;
    const seq = []; for (let w = 1; w <= 10; w++) { S.wave = w; seq.push(wxNow() || "-"); }
    out.seq = seq.join(",");
    S.wave = 3; __td.step(1 / 30); out.wx3 = S.wx;
    S.wave = 4; __td.step(1 / 30); out.wx4 = S.wx;
    // 暴风雪：敌人移速 ×0.92
    __td.newRun(1, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); S = __td.S; S.pending = 0; S.offer = null;
    const e = spawnAt("wolf", 5, 4, false, false);
    S.wave = 1; S.wx = null; const v0 = eSpeed(e); S.wx = "blizzard"; const v1 = eSpeed(e); out.slow = +(v1 / v0).toFixed(3);
    // 雷暴：8 秒内劈到敌人
    __td.newRun(5, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); S = __td.S; S.pending = 0; S.offer = null;
    const t = spawnAt("golem", 6, 4, false, false); t.speed = 0; const h0 = t.hp;
    S.wave = 4; S.autoWave = false; let seen = false; for (let i = 0; i < 30 * 12; i++) { S.crystal.hp = S.crystal.maxHp; S.wave = 4; __td.step(1 / 30); seen = seen || S.wx === "storm"; } out.storm = seen ? "storm" : S.wx; out.struck = t.hp < h0 || t.dead;
    return out;
  });
  check(r.seq.split(",").filter(x => x === "rain").length === 4, "10 波里有 4 波下雨（每 5 波 2 波）", r.seq);
  check(r.wx3 === "rain" && r.wx4 === "rain", "第 3、4 波森林下雨", r);
  check(Math.abs(r.slow - 0.92) < 0.01, "暴风雪敌人移速 ×0.92", r);
  check(r.storm === "storm" && r.struck, "雷暴 12 秒内劈中敌人", r);
  // 截图：森林傍晚下雨 / 夜里（先把新手引导和剧情标成看过）
  await p.evaluate(() => localStorage.setItem("chenxing-td-v2", JSON.stringify({ tutorial: true, ver: 13, story: ["pre0"] })));
  await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { __td.newRun(0, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; const W = [ST.waves - 1, ST.waves - 2, ST.waves - 3].find(w => w % 5 >= 3); S.autoWave = false; S.shopDue = 0; S.eventDue = 0; for (let i = 0; i < 40; i++) { S.wave = W; S.shop = null; S.event = null; S.offer = null; __td.step(1 / 30); } });
  await p.waitForTimeout(400);
  await p.screenshot({ path: "weather-rain.png" });
  noErrors(errs);
  await b.close(); report("weather");
})();
