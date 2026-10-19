// 批次 C 收尾：角色精通、连败辅助
const { chromium } = require("playwright");
const { check, noErrors, report } = require("./lib");
const path = require("path");
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 844, height: 390 } }), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../dist/chenxing.html"));
  await p.waitForTimeout(300);
  // 精通：只看胜场数
  const m = await p.evaluate(() => { const d = { use: { knight: { win: 0 }, mage: { win: 3 }, archer: { win: 12 }, priest: { win: 40 } } }; return ["knight", "mage", "archer", "priest"].map(id => masteryOf(d, id)); });
  check(JSON.stringify(m) === "[0,1,2,3]", "精通阶数按胜场 0/3/10/25 划分", m);
  // 连败辅助：连输 2 次后第 3 局晨星碑生命 +8%
  const r = await p.evaluate(() => {
    const out = {}; localStorage.clear();
    startRun(0, { hero: "knight" }); const base = S.crystal.maxHp; out.base = base; out.a0 = S.assist;
    for (let i = 0; i < 2; i++) { startRun(0, { hero: "knight" }); S.over = "lose"; settleRun(); }
    out.lose = loadSave().lose[0];
    startRun(0, { hero: "knight" }); out.a1 = S.assist; out.hp1 = S.crystal.maxHp;
    // 赢一次清零
    S.over = "win"; settleRun(); out.after = loadSave().lose[0] || 0;
    startRun(0, { hero: "knight" }); out.a2 = S.assist;
    // 每日 / 无尽不吃辅助
    startRun(0, { endless: true }); out.a3 = S.assist;
    // sim 方式（显式 assist:0）不受影响
    localStorage.setItem("x", "1"); editSave(d => { d.lose[0] = 5; }); startRun(0, { assist: 0 }); out.a4 = S.assist;
    return out;
  });
  check(r.a0 === 0 && r.lose === 2, "头两局没有辅助，连败计数 = 2", r);
  check(r.a1 === 1 && Math.abs(r.hp1 / r.base - 1.08) < 0.01, "连败 2 次：晨星碑生命 +8%", r);
  check(r.after === 0 && r.a2 === 0, "通关一次连败清零", r);
  check(r.a3 === 0 && r.a4 === 0, "无尽模式 / 显式 assist:0 不吃辅助", r);
  // 结算页：输了之后有连败提示
  await p.evaluate(() => { startRun(0, { hero: "mage" }); S.over = "lose"; showResult(settleRun()); });
  await p.waitForTimeout(200);
  check((await p.locator("#ovbox").innerText()).includes("连败"), "输了之后有连败提示", "");
  // 旧存档升级：版本 12 的存档读入后 lose 为空
  const old = await p.evaluate(() => { localStorage.setItem(SAVE_KEY, JSON.stringify({ ver: 12, stars: [1] })); const d = loadSave(); return [d.ver, JSON.stringify(d.lose)]; });
  check(old[0] === 13 && old[1] === "{}", "旧版（12）存档升级到 13", old);
  noErrors(errs);
  await b.close(); report("c3");
})();
