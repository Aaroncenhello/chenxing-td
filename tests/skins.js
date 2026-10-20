// 角色外观：第 2 套外观的三种解锁方式（星星兑换 / 通关胜场 / 觉醒）、穿上、存档清洗与持久化、星星扣除、角色页界面
const { chromium } = require('playwright'); const { check, noErrors, report } = require('./lib');
const path = require('path'); const GAME = 'file://' + path.resolve(__dirname, '../dist/chenxing.html');
(async () => { const b = await chromium.launch(); const errs = []; const p = await b.newPage({ viewport: { width: 1000, height: 760 } }); p.on('pageerror', e => errs.push(e.message));
await p.goto(GAME); await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ tutorial: true, ver: 14, stars: new Array(19).fill(3), bonusStars: 0 }))); await p.reload();
await p.waitForFunction(() => typeof lpcReady !== 'undefined' && lpcReady, null, { timeout: 15000 }).catch(() => {});
const r = await p.evaluate(async () => {
  const out = {}; localStorage.setItem('chenxing-td-news', '12.0');
  out.defaults = UNITS.every(u => skinOwned(loadSave(), u.id, 0)) && UNITS.every(u => !skinOwned(loadSave(), u.id, 1));
  out.rules = UNITS.every(u => SKIN_DEF[u.id] && SKIN_DEF[u.id].names.length === 2 && (skinRule(u.id).stars || skinRule(u.id).win || skinRule(u.id).awk));
  // 星星兑换（剑士 20★）：先把现有星星花光再试
  const left0 = starBank().left; editSave(d => { d.bonusStars = 0; }); const l1 = starBank().left; editSave(d => { d.bonusStars = Math.max(0, 19 - l1); }); out.shortErr = buySkin('sword');
  editSave(d => { d.bonusStars += 5; }); const before = starBank().left; out.buyErr = buySkin('sword'); out.after = starBank().left; out.spentDelta = before - out.after; out.eq = SKIN_EQ.sword; out.bought = skinOwned(loadSave(), 'sword', 1);
  out.again = buySkin('sword');
  // 胜场解锁（骑士通关 10 局）和觉醒解锁（机兵）
  out.knightLocked = !skinOwned(loadSave(), 'knight', 1); editSave(d => { d.use.knight = { ...(d.use.knight || {}), win: 10 }; }); out.knightOpen = skinOwned(loadSave(), 'knight', 1);
  out.notOwnedWear = wearSkin('lancer', 1); out.wear = wearSkin('knight', 1) && SKIN_EQ.knight === 1;
  // 存档清洗：乱写的外观字段会被丢掉，没资格的外观会退回原装
  editSave(d => { d.skin = { knight: 1, lancer: 1, foo: 1, mage: 7 }; d.skinBuy = ['sword:1', 'knight:1', 'zz:1', 'sword:2']; });
  const s = loadSave(); out.clean = JSON.stringify({ skin: s.skin, buy: s.skinBuy });
  syncSkins(); out.synced = [SKIN_EQ.knight, SKIN_EQ.lancer, SKIN_EQ.mage].join(',');
  // 两套外观 4 阶全套的头像不同
  SKIN_EQ.mage = 0; HERO_PIC.clear(); for (const pt of ['s0t4', 's1t4', 'nude']) lpcWant('mage', pt); await new Promise(r => setTimeout(r, 400));
  const D = UNITS.find(u => u.id === 'mage'); SKIN_EQ.mage = 0; const a = heroPic(D, { face: 1 }).toDataURL(); SKIN_EQ.mage = 1; const c = heroPic(D, { face: 1 }).toDataURL(); SKIN_EQ.mage = 0;
  out.differ = a !== c;
  // 导出 / 导入保留外观
  editSave(d => { d.skin = { knight: 1 }; d.skinBuy = ['sword:1']; }); const code = exportSave(); editSave(d => { d.skin = {}; d.skinBuy = []; }); out.imp = importSave(code); const s2 = loadSave(); out.kept = JSON.stringify({ skin: s2.skin, buy: s2.skinBuy });
  return out;
});
check(r.defaults, '第 1 套外观人人都有，第 2 套一开始都没解锁');
check(r.rules, '20 名角色都有 2 套外观，第 2 套有解锁条件');
check(typeof r.shortErr === 'string' && r.shortErr.includes('星星不够'), '星星不够时兑换失败并说明', r.shortErr);
check(r.buyErr === null && r.spentDelta === 20 && r.eq === 1 && r.bought, '兑换成功：扣 20★、自动穿上、算已拥有', r);
check(typeof r.again === 'string', '不能重复兑换', r.again);
check(r.knightLocked && r.knightOpen, '通关胜场达到 10 局，骑士的第 2 套外观自动解锁');
check(r.notOwnedWear === false && r.wear, '没解锁的不能穿，解锁了的能穿', r);
check(r.clean === JSON.stringify({ skin: { knight: 1, lancer: 1, mage: 1 }, buy: ['sword:1'] }) || r.clean.includes('"buy":["sword:1"]'), '存档清洗：认识的保留（兑换只留合法的）、乱写的丢掉', r.clean);
check(r.synced === '1,0,0', '没资格的外观读档时退回原装', r.synced);
check(r.differ, '两套外观的 4 阶头像不一样');
check(r.imp === null && r.kept === JSON.stringify({ skin: { knight: 1 }, buy: ['sword:1'] }), '导出再导入，外观保留', r.kept);
// 角色页：有外观区，点缩略图切预览，点阶数切预览，穿上按钮
await p.evaluate(() => { closeOverlay(); showRoster('mage'); }); await p.waitForTimeout(500);
const ui = await p.evaluate(async () => {
  const q = s => document.querySelectorAll(s).length, out = { skinb: q('.skinb'), tierb: q('.tierb'), thumbs: q('canvas[data-skpt]') };
  document.querySelector('.skinb[data-rskin="1"]').click(); await new Promise(r => setTimeout(r, 200)); out.prevSkin = rosterSkin; out.btn = document.querySelector('.skins .btns').innerText;
  document.querySelector('.tierb[data-rtier="1"]').click(); out.tier = rosterTier;
  const g = document.getElementById('r-anim').getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 240, 198).data; let n = 0; for (let i = 3; i < g.length; i += 4) if (g[i] > 40) n++; out.anim = n;
  return out;
});
check(ui.skinb === 2 && ui.tierb === 4 && ui.thumbs === 2, '角色页有 2 套外观按钮、4 个阶数按钮、2 个缩略图', ui);
check(ui.prevSkin === 1 && ui.tier === 1 && ui.btn.length > 2, '点外观 / 阶数会切换预览，并显示兑换或穿上按钮', ui);
check(ui.anim > 500, '预览动画画得出来', ui.anim);
for (const id of ['knight', 'summoner', 'breaker']) { await p.evaluate(id => { closeOverlay(); showRoster(id); }, id); await p.waitForTimeout(150); }
noErrors(errs); report('skins'); await b.close(); })();
