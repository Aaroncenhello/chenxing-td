// 阶段 4「爽感」回归测试：画质档位、打击感、预警、竖屏信息区、翻牌、结算、图鉴
const GAME = 'file://' + require('path').resolve(__dirname, '../dist/chenxing.html');
const { chromium } = require('playwright');
const { check, noErrors, report } = require('./lib');
const GFXcap = () => 800;   // 高画质上限 700，加上横幅等关键特效的余量
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(GAME); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, ver: 12, story: [...Array(16).keys()].map(i => 'pre' + i).concat([...Array(16).keys()].map(i => 'post' + i)) })));
  await p.reload(); await p.waitForTimeout(400);
  // 跑一段战斗，给各种特效一个真实环境
  const fight = (st, sec) => p.evaluate(([st, sec]) => {
    __td.newRun(st, { charLv: Object.fromEntries(__td.UNITS.map(u => [u.id, 8])) });
    const T = __td, S = T.S;
    for (let i = 0; i < 30 * sec && !S.over; i++) { if (S.offer) { T.pickCard(S.offer[0].id); T.openOffer(); } if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); T.step(1 / 30); }
    S.pending = 0; S.offer = null;
  }, [st, sec]);

  // ---------- 画质档位 ----------
  const g = await p.evaluate(() => {
    const out = {};
    showLevels(); out.auto = document.getElementById('btn-gfx').textContent;
    const cyc = []; for (let i = 0; i < 4; i++) { document.getElementById('btn-gfx').click(); cyc.push([loadSave().gfx, GFX.name]); }
    out.cyc = cyc;
    // 低画质：粒子数量打折、特效有上限
    applyGfx(0); __td.newRun(0, {}); const S = __td.S; S.fx = [];
    burst(5, 4, '#fff', 20, 2, 0.5, 0.05); out.lowParts = S.fx[0].parts.length;
    for (let i = 0; i < 1000; i++) burst(5, 4, '#fff', 4, 2, 5, 0.05);
    addFx({ kind: 'banner', text: '关键横幅', life: 2 });
    out.lowCount = S.fx.length; out.bannerKept = S.fx.some(f => f.kind === 'banner');
    applyGfx(2); S.fx = []; burst(5, 4, '#fff', 20, 2, 0.5, 0.05); out.highParts = S.fx[0].parts.length;
    applyGfx(loadSave().gfx);
    return out;
  });
  console.log('画质:', JSON.stringify(g));
  check(/画质 · 自动/.test(g.auto), '选关页有画质按钮，默认自动', g.auto);
  check(g.cyc.map(x => x[0]).join() === '0,1,2,-1' && g.cyc[0][1] === '低' && g.cyc[2][1] === '高', '画质按钮在 低/中/高/自动 之间切换并存档', g.cyc);
  check(g.lowParts === 6 && g.highParts === 20, '低画质粒子约三成、高画质全量', g);
  check(g.lowCount <= 201 && g.bannerKept, '特效数量有上限，但横幅这类关键反馈照常出现', g);

  // ---------- 打击感 ----------
  const h = await p.evaluate(() => {
    applyGfx(2); __td.newRun(3, {}); const S = __td.S; S.pending = 0; S.offer = null; S.fx = [];
    const u = S.units[0], e = spawnAt('orc', 5, 3, false); e.afx = []; S.fx = [];
    for (let i = 0; i < 5; i++) hurt(e, e.maxHp * 0.01, 'phys', false, u);   // 同一目标连续小伤害 → 合并成一个数字
    const nums = S.fx.filter(f => f.kind === 'text' && f.key === e.id);
    const out = { merged: nums.length, mergedVal: nums[0] && +nums[0].text, want: Math.round(e.maxHp * 0.05), sz1: nums[0] && nums[0].sz };
    hurt(e, e.maxHp * 0.4, 'magic', false, u);   // 一下打掉 4 成 → 最大号（颜色不同，单独一个数字）
    out.bigSz = S.fx.filter(f => f.kind === 'text' && f.key === e.id).map(f => f.sz);
    const el = spawnAt('goblin', 8, 3, true); el.afx = []; S.hitStop = 0; S.fx = [];
    hurt(el, el.maxHp * 3, 'phys', false, u);
    out.shatter = S.fx.filter(f => f.kind === 'shatter').map(f => f.blocks.length); out.hitStop = S.hitStop; out.ring = S.fx.some(f => f.kind === 'ring' && f.color === '#ffffff');
    applyGfx(0); S.fx = []; const w = spawnAt('wolf', 8, 5, false); w.afx = []; hurt(w, w.maxHp * 3, 'phys', false, u);
    out.lowCorpse = S.fx.some(f => f.kind === 'corpse') && !S.fx.some(f => f.kind === 'shatter');
    applyGfx(loadSave().gfx);
    return out;
  });
  console.log('打击感:', JSON.stringify(h));
  check(h.merged === 1 && Math.abs(h.mergedVal - h.want) <= 3 && h.sz1 === 2, '同一目标连续伤害合并成一个数字', h);
  check(h.bigSz.includes(4), '一下打掉 4 成血显示最大号数字', h.bigSz);
  check(h.shatter.length === 1 && h.shatter[0] >= 6, '敌人死亡碎成像素块', h.shatter);
  check(h.hitStop > 0 && h.ring, '击杀精英有顿帧和白色冲击环', h);
  check(h.lowCorpse, '低画质不碎裂，用原来的倒地', h.lowCorpse);
  // ---------- 出怪预告 + 大波预警 ----------
  const wv = await p.evaluate(() => {
    const T = __td, out = {};
    const probe = (st, w) => { T.newRun(st, {}); const S = T.S; S.pending = 0; S.offer = null; S.wave = w; S.shopWave = 99; S.eventWave = 99; S.spawnQueue = []; S.enemies = []; S.nextWaveIn = 3.02; S.fx = [];
      const info = nextWaveInfo(); T.step(1 / 30); const banner = S.fx.filter(f => f.kind === 'banner').map(f => f.text);
      T.step(1 / 30); const again = S.fx.filter(f => f.kind === 'banner').length;
      const ports = [...info.ports.keys()].every(i => PORTALS[i]);
      return { kind: info.kind, banner, again, ports }; };
    out.tide = probe(11, 4); out.boss = probe(3, 11); out.plain = probe(0, 1);
    return out;
  });
  console.log('波次预告:', JSON.stringify(wv));
  check(wv.tide.kind === 'tide' && /潮汐来袭/.test(wv.tide.banner.join()), '潮汐波前 3 秒弹出「潮汐来袭」', wv.tide);
  check(wv.boss.kind === 'boss' && /首领将至/.test(wv.boss.banner.join()), '首领波前 3 秒弹出「首领将至」', wv.boss);
  check(wv.plain.kind === '' && wv.plain.banner.length === 0, '普通波不弹预警', wv.plain);
  check(wv.tide.again === 1 && wv.boss.again === 1, '预警每波只弹一次', { t: wv.tide.again, b: wv.boss.again });
  check(wv.tide.ports && wv.boss.ports, '预告标出的传送门都存在', wv);

  // ---------- 竖屏信息区 ----------
  const pc = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pp = await pc.newPage(); pp.on('pageerror', e => errs.push('竖屏 ' + e.message));
  await pp.goto(GAME); await pp.waitForTimeout(300);
  await pp.evaluate(() => localStorage.setItem('chenxing-td-v2', JSON.stringify({ stars: new Array(16).fill(3), tutorial: true, ver: 12, story: [...Array(16).keys()].map(i => 'pre' + i) })));
  await pp.reload(); await pp.waitForTimeout(400);
  await pp.evaluate(() => { __td.newRun(6, {}); const T = __td, S = T.S;
    for (let i = 0; i < 30 * 40 && !S.over; i++) { if (S.pending > 0 && !S.offer) T.openOffer(); if (S.offer) { T.pickCard((S.offer.find(c => c.join) || S.offer[0]).id); } if (S.shop) T.closeShop(); if (S.event) T.takeEvent(0); S.crystal.hp = S.crystal.maxHp; T.step(1 / 30); }
    S.pending = 0; S.offer = null; S.combo = 30; S.comboT = 3; });
  await pp.waitForTimeout(300);
  const pi = await pp.evaluate(() => {
    const S = __td.S, team = S.units.filter(u => !u.summon), box = document.getElementById('pinfo').getBoundingClientRect(), field = document.getElementById('screen').getBoundingClientRect(), btn = document.querySelector('.hud-l').getBoundingClientRect();
    const out = { shown: box.height > 0, between: box.top >= field.bottom - 1 && box.bottom <= btn.top + 1, tiles: document.querySelectorAll('#pi-team .pu').length, team: team.length, combo: document.getElementById('pi-combo').textContent, cards: document.querySelectorAll('#pi-cards canvas').length, have: Object.keys(S.cards).length + S.relics.length + Object.keys(S.curses).length };
    // 点一下选中；技力满时再点一下放技能
    const u = team[0], tile = () => document.querySelector(`#pi-team [data-pu="${u.id}"]`);
    u.skillT = 0; u.sp = 0; tile().click(); out.sel = S.selUnit === u;
    u.sp = u.def.sp; updatePInfo(); out.rdy = tile().classList.contains('rdy'); tile().click(); out.cast = u.sp === 0 || u.skillT > 0;
    return out;
  });
  console.log('竖屏信息区:', JSON.stringify(pi));
  check(pi.shown && pi.between, '竖屏全屏时信息区显示在战场和按钮之间', pi);
  check(pi.tiles === pi.team && pi.team >= 2, '信息区列出全部队员', pi);
  check(pi.combo === '连杀 ×30', '信息区显示大号连杀', pi.combo);
  check(pi.cards === pi.have, '信息区列出这局的卡牌和遗物', pi);
  check(pi.sel && pi.rdy && pi.cast, '点队员选中；技力满时金光，再点一下放技能', pi);
  await pc.close();
  const deskHidden = await p.evaluate(() => document.getElementById('pinfo').offsetHeight === 0);
  check(deskHidden, '电脑 / 横屏不显示竖屏信息区', deskHidden);

  // 实战跑一段，确认新特效不报错、特效数量受控
  await fight(11, 40);
  const fxN = await p.evaluate(() => __td.S.fx.length);
  check(fxN <= GFXcap(), '实战中特效数量在上限内', fxN);

  noErrors(errs);
  report('juice');
  await b.close();
})();
