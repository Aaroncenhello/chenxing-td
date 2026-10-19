// 批次 E：新系统可见性（更新说明只弹一次、本局规则页、天气标签、首领特性、一次性提示）
const { chromium } = require("playwright");
const { check, noErrors, report } = require("./lib");
const path = require("path");
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 844, height: 390 } }), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../dist/chenxing.html"));
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("chenxing-td-v2", JSON.stringify({ tutorial: true, ver: 13, story: ["pre0", "pre3"] })); });
  await p.reload(); await p.waitForTimeout(500);
  check((await p.locator("#ovbox").innerText()).includes("12.0 更新内容"), "首次进入弹出 12.0 更新说明");
  await p.screenshot({ path: "vis-news.png" });
  await p.click("#btn-newsok"); await p.waitForTimeout(200);
  check(!(await p.locator("#ovbox").innerText()).includes("更新内容"), "点「知道了」回到选关页");
  await p.reload(); await p.waitForTimeout(400);
  check(!(await p.locator("#ovbox").innerText()).includes("更新内容"), "再次进入不再弹更新说明");
  // 本局规则：森林关有天气；第 4 关（index 3）首领有特性
  const r = await p.evaluate(() => {
    __td.newRun(3, { hero: "knight", contracts: ["ironhide"], charLv: {}, charAwk: {}, assist: 0 });
    const S = __td.S; S.pending = 0; S.offer = null; S.wave = 4; S.cine = null;
    showSynGuide(); return document.getElementById("ovbox").innerText;
  });
  check(/本局规则/.test(r) && /自选契约/.test(r) && /铁壁/.test(r), "规则页列出契约", r.slice(0, 120));
  check(/天气/.test(r) && /首领特性/.test(r), "规则页列出天气和首领特性", r.slice(0, 300));
  await p.screenshot({ path: "vis-rules.png" });
  await p.evaluate(() => { closeOverlay(); });
  // 天气标签 + 首领条里有特性名
  const t = await p.evaluate(() => {
    __td.newRun(0, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.autoWave = false;
    for (let i = 0; i < 20; i++) { S.wave = 4; S.shop = null; S.event = null; S.offer = null; __td.step(1 / 30); }
    return { wx: S.wx };
  });
  check(t.wx === "rain", "第 4 波森林下雨", t);
  const hints = await p.evaluate(() => JSON.parse(localStorage.getItem("chenxing-td-hints") || "[]"));
  check(hints.includes("wx"), "第一次下雨弹过一次性提示", hints);
  // 图鉴总完成度：空存档 0%，敏感档位给称号和星星
  const cp = await p.evaluate(() => {
    const d0 = loadSave(); const a = codexProgress(d0);
    const d = loadSave(); d.seen = Object.keys(ENEMIES); d.relicSeen = RELICS.map(r => r.id); d.afxSeen = AFFIX.map(x => x.id); d.evSeen = EVENTS.map(e => e.id);
    d.cardSeen = CODEX_CARDS().concat(EVO_CARDS, SIG, CURSES).map(c => c.id);
    return { a, b: codexProgress(d) };
  });
  check(cp.a.pct < 25 && cp.a.stars === 0, "空档图鉴没有称号和星星", cp.a);
  check(cp.b.pct === 100 && cp.b.tier.title === "晨星全书" && cp.b.stars === 20, "全收集 100% 得「晨星全书」，累计 +20★", cp.b);
  noErrors(errs);
  await b.close(); report("vis");
})();
