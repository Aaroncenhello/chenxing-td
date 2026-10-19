// 关卡数据体检（全部关卡）+ 第五章：地图可达、敌人和主题都有定义、剧情与关卡一一对应、新关卡能进能打
const { chromium } = require("playwright");
const { check, noErrors, report } = require("./lib");
const path = require("path");
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 844, height: 390 } }), errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../dist/chenxing.html"));
  await p.evaluate(() => localStorage.setItem("chenxing-td-v2", JSON.stringify({ tutorial: true, ver: 13, stars: new Array(16).fill(3), story: [] })));
  await p.reload(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const bad = [];
    STAGES.forEach((st, i) => {
      const tag = `第${i + 1}关`;
      if (!THEMES[st.theme]) bad.push(tag + " 主题没有 THEMES");
      if (!THUMB[st.theme]) bad.push(tag + " 主题没有缩略图配色");
      if (!THEME_NAME[st.theme]) bad.push(tag + " 主题没有名字");
      if (!STORY[i]) bad.push(tag + " 没有剧情");
      if (st.map.length !== 9 || st.map.some(r => r.length !== 16)) bad.push(tag + " 地图不是 16×9");
      const types = [...st.pool, ...(st.boss || []), ...(st.midBoss || [])].map(x => x[0]);
      for (const t of types) if (!ENEMIES[t]) bad.push(tag + " 敌人不存在：" + t);
      // 地图：恰好 1 个晨星碑，新关卡的每个传送门（四个角上的装饰门除外）都能走到晨星碑（水和墙不通）
      let B = null; st.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === "B") B = [x, y]; }));
      if (!B) { bad.push(tag + " 没有晨星碑"); return; }
      const seen = new Set([B.join()]), q = [B];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, c = (st.map[ny] || "")[nx]; if (!c || "#~".includes(c) || seen.has(nx + "," + ny)) continue; seen.add(nx + "," + ny); q.push([nx, ny]); } }
      st.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === "S" && i >= 16 && !((x === 0 || x === 15) && (y === 0 || y === 8))) { const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + "," + (y + dy))); if (!ok) bad.push(`${tag} 传送门 (${x},${y}) 走不到晨星碑`); } }));
      // 首领战的领头敌人要有称号、大招和特性
      const lead = (st.boss || [])[0] && st.boss[0][0];
      if (lead && !BOSS_TITLE[lead]) bad.push(tag + " 首领没有称号：" + lead);
      if (lead && !ULT_OF[lead]) bad.push(tag + " 首领没有大招：" + lead);
      if (lead && !BOSS_MECH[lead]) bad.push(tag + " 首领没有特性：" + lead);
    });
    return { n: STAGES.length, story: STORY.length, chap: CHAPTERS.length, bad };
  });
  check(r.n === 20 && r.story === r.n && r.chap === 5, "20 关、20 段剧情、5 章", r);
  check(r.bad.length === 0, "所有关卡数据完整（主题/敌人/地图可达/首领配置）", r.bad);
  // 选关页：第五章标签 + 第 17 关可点
  await p.evaluate(() => { chapSel = 4; showLevels(); });
  await p.waitForTimeout(300);
  const txt = await p.locator("#ovbox").innerText();
  check(/第五章/.test(txt) && /潮汐海岸/.test(txt), "选关页有第五章和潮汐海岸", txt.slice(0, 120));
  await p.screenshot({ path: "ch5-levels.png" });
  // 每一关都能开局并跑几秒，不报错
  const run = await p.evaluate(() => {
    const out = [];
    for (let i = 16; i < 20; i++) {
      __td.newRun(i, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.autoWave = true;
      let err = null; try { for (let k = 0; k < 30 * 60 && !S.over; k++) { S.shop = null; S.event = null; S.offer = null; S.pending = 0; S.cine = null; __td.step(1 / 30); } } catch (e) { err = String(e); }
      out.push({ i, err, wave: S.wave, enemies: S.enemies.length, kills: S.kills });
    }
    return out;
  });
  for (const x of run) check(!x.err && x.wave >= 1, `第 ${x.i + 1} 关能开局并跑 60 秒`, x);
  // 地图截图
  for (const i of [16, 17, 18, 19]) {
    await p.evaluate(i => { closeOverlay(); __td.newRun(i, { hero: "knight", charLv: {}, charAwk: {}, assist: 0 }); const S = __td.S; S.pending = 0; S.offer = null; S.autoWave = false; S.wave = Math.max(2, Math.floor(ST.waves / 2)); for (let k = 0; k < 90; k++) { S.shop = null; S.event = null; S.offer = null; __td.step(1 / 30); } }, i);
    await p.waitForTimeout(350);
    await p.screenshot({ path: `ch5-map${i + 1}.png` });
  }
  noErrors(errs);
  await b.close(); report("ch5");
})();
