// 说明与奖励：星盘节点说清楚加什么、羁绊看板和说明页、每日挑战 / 困难噩梦的星星奖励
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
const SAVE = JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, ver: 12, disk: { atk: 3 }, story: [...Array(16).keys()].map(i => 'pre' + i).concat([...Array(16).keys()].map(i => 'post' + i)) });
async function page(b, vp, mobile) {
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(300);
  await p.evaluate(s => localStorage.setItem('chenxing-td-v2', s), SAVE); await p.reload(); await p.waitForTimeout(300);
  return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await page(b, { width: 1280, height: 860 }, false);

  // ---------- 天赋星盘：当前 / 下一级都写全 ----------
  const dk = await p.evaluate(() => {
    showPerks();
    const node = name => [...document.querySelectorAll('.dnode')].find(n => n.querySelector('.dh b').textContent === name);
    const t = n => [...n.querySelectorAll('p')].map(x => x.textContent);
    return { atk: t(node('锋芒')), walls: t(node('碑座')), star: t(node('星辉')) };
  });
  console.log('星盘:', JSON.stringify(dk));
  check(dk.atk[0] === '当前：全队攻击 +9%' && dk.atk[1] === '下一级：全队攻击 +12%', '已点的节点写出当前和下一级的完整效果', dk.atk);
  check(dk.walls[0] === '还没点亮' && /^点亮后：晨星碑.*生命上限 \+6%$/.test(dk.walls[1]), '没点的节点写出点亮后加什么属性', dk.walls);

  // ---------- 奖励 ----------
  const rw = await p.evaluate(() => {
    const T = __td, out = {};
    const bonus = () => loadSave().bonusStars;
    const run = (st, opts, over, reached) => { T.newRun(st, opts); const S = T.S; S.pending = 0; S.offer = null; S.wave = reached + 1; S.over = over; const b0 = bonus(); const R = T.settle(); return { got: bonus() - b0, R }; };
    // 普通 / 困难 / 噩梦通关
    out.norm = run(2, {}, 'win', 0).got; out.hard = run(2, { diff: 1 }, 'win', 0).got; out.night = run(2, { diff: 2 }, 'win', 0).got;
    // 每日：输了但过半 → +2；再输一次 → 0；通关 → 补 3；再通关 → 0
    const dly = { seed: 42, mod: DAILY_MODS[0].id, date: '2099-01-01' };
    const half = Math.ceil(STAGES[3].waves / 2);
    out.d1 = run(3, { daily: dly }, 'lose', half).got; out.d2 = run(3, { daily: dly }, 'lose', half).got;
    out.d3 = run(3, { daily: dly }, 'win', 0).got; out.d4 = run(3, { daily: dly }, 'win', 0).got;
    out.rec = loadSave().daily['2099-01-01'];
    out.early = run(3, { daily: { ...dly, date: '2099-01-02' } }, 'lose', 1).got;
    return out;
  });
  console.log('奖励:', JSON.stringify(rw));
  check(rw.norm === 1 && rw.hard === 3 && rw.night === 4, '每次通关：普通 +1★、困难 +3★、噩梦 +4★', rw);
  check(rw.d1 === 2 && rw.d2 === 0 && rw.d3 === 3 && rw.d4 === 0 && rw.rec.got === 5, '每日挑战：过半 +2★，通关补齐到 +5★，当天不重复发', rw);
  check(rw.early === 0, '每日挑战没撑过一半不给星星', rw.early);

  // ---------- 羁绊看板和说明 ----------
  const sy = await p.evaluate(() => {
    const T = __td; closeOverlay(); T.newRun(6, {}); const S = T.S; S.pending = 0; S.offer = null;
    S.cards.sk_fire = 1; S.cards.sk_meteor = 1; S.cards.vamp = 1; updateSyn(); updateSynBar();
    const chips = [...document.querySelectorAll('#syns .sc:not(.help)')].map(e => e.className + ':' + e.textContent);
    document.querySelector('#syns [data-synhelp]').click();
    const out = { chips, open: !document.getElementById('overlay').hidden, n: document.querySelectorAll('.codex.syng .cx').length, paused: menuOpen,
      inferno: [...document.querySelectorAll('.codex.syng .cx')].find(e => /烈焰环绕/.test(e.textContent)).textContent };
    document.getElementById('btn-synback').click(); out.back = document.getElementById('overlay').hidden && !menuOpen;
    showCodex('syn'); out.codex = document.querySelectorAll('.codex.syng .cx').length; out.tab = document.querySelector('.tab.on').textContent;
    return out;
  });
  console.log('羁绊:', JSON.stringify(sy));
  check(sy.chips[0].includes('on') && /烈焰环绕/.test(sy.chips[0]) && sy.chips.some(c => /嗜血1\/2/.test(c)), '看板先列已凑齐的，再列正在凑的和进度', sy.chips);
  check(sy.open && sy.paused && sy.n === 8 && /已生效/.test(sy.inferno) && /陨星雨/.test(sy.inferno), '点看板打开羁绊一览（暂停、带进度和凑法）', sy);
  check(sy.back, '「返回战斗」回到战斗', sy.back);
  check(sy.codex === 8 && /羁绊/.test(sy.tab), '图鉴里有羁绊说明页', sy);

  // 手机竖屏：信息区里有看板；横屏：看板在左边黑边里，不压战场
  for (const [name, vp] of [['竖屏', { width: 390, height: 844 }], ['横屏', { width: 844, height: 390 }]]) {
    const m = await page(b, vp, true);
    await m.evaluate(() => { closeOverlay(); __td.newRun(6, {}); const S = __td.S; S.pending = 0; S.offer = null; S.cards.sk_fire = 1; updateSyn(); });
    await m.waitForTimeout(400);
    const r = await m.evaluate(port => {
      const el = document.getElementById(port ? 'pi-syn' : 'h-syn'), box = el.getBoundingClientRect(), f = document.getElementById('screen').getBoundingClientRect();
      const help = el.querySelector('[data-synhelp]').getBoundingClientRect();
      return { shown: box.height > 0 && box.width > 0, chips: el.querySelectorAll('.sc:not(.help)').length, clear: port ? box.top >= f.bottom - 1 : box.right <= f.left + 1,
        helpIn: help.bottom <= innerHeight && help.height > 0 };
    }, name === '竖屏');
    console.log(name, JSON.stringify(r));
    check(r.shown && r.chips >= 1 && r.clear && r.helpIn, `${name}：羁绊看板显示出来、不压战场、「?」能点到`, r);
    noErrors(m.errs);
  }

  // ---------- 队员等级和属性 ----------
  const P = await page(b, { width: 390, height: 844 }, true);
  await P.evaluate(() => { closeOverlay(); __td.newRun(6, { charLv: { knight: 8 } }); const S = __td.S; S.pending = 0; S.offer = null; S.selUnit = null; });
  await P.waitForTimeout(500);
  const pu = await P.evaluate(() => {
    const S = __td.S, hero = S.units.find(u => u.hero), out = {};
    out.tile = document.querySelector(`#pi-team [data-pu="${hero.id}"] .lv`).textContent;
    out.card = document.getElementById('pi-sel').textContent;
    return out;
  });
  const L = await page(b, { width: 844, height: 390 }, true);
  await L.evaluate(() => { closeOverlay(); __td.newRun(6, {}); const S = __td.S; S.pending = 0; S.offer = null; S.selUnit = null; });
  await L.waitForTimeout(400);
  const lu = await L.evaluate(() => ({ hidden: document.getElementById('h-unit').offsetHeight === 0 }));
  await L.evaluate(() => { __td.S.selUnit = __td.S.units[0]; }); await L.waitForTimeout(400);
  Object.assign(lu, await L.evaluate(() => { const c = document.getElementById('h-unit').getBoundingClientRect(), t = document.querySelector('.hud-top').getBoundingClientRect();
    return { shown: c.height > 0, text: document.getElementById('h-unit').textContent, clearTop: c.right <= t.left + 1 || c.top >= t.bottom - 1 }; }));
  console.log('队员属性:', JSON.stringify({ pu, lu }));
  check(pu.tile === 'Lv8 · 1阶', '竖屏队员格显示角色等级和阶数', pu.tile);
  check(/Lv8/.test(pu.card) && /攻击 \d+/.test(pu.card) && /生命 \d+\/\d+/.test(pu.card) && /防御/.test(pu.card) && /攻速/.test(pu.card) && /技能/.test(pu.card), '竖屏属性栏默认显示英雄的等级和主要属性', pu.card);
  check(lu.hidden && lu.shown && /攻击/.test(lu.text) && lu.clearTop, '横屏选中队员才弹属性卡，不挡顶栏', lu);
  noErrors(P.errs); noErrors(L.errs);

  noErrors(p.errs);
  report('help');
  await b.close();
})();
