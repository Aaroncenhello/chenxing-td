
// ================= 9.0：首领入场演出 + 可打断读条 =================
const BOSS_TITLE = {
  boss: "深渊的第一位领主", sovereign: "统御深渊的君主", devourer: "吞下过三颗星辰的怪物",
  orc: "兽人前锋队长", bigslime: "沼泽之母", sandworm: "沙海底下的巨虫", wyvern: "天空的暴君",
  golem: "熔岩铸成的巨人", frostgiant: "永冬的看守", warmech: "旧世界留下的战争兵器",
  bloodwolf: "血月下的头狼", shaman: "腐沼祭司", necro: "白骨的主人",
  nameless: "没有名字，也不肯有", stormlord: "雷云里的那个声音", monolith: "醒过来的第一座碑",
  ashwalker: "灰里走出来的旧兵", voidknight: "把名字交出去的骑士",
};
// ---------- 首领大招（可打断读条） ----------
const ULT_DEF = {
  roar: { name: "深渊咆哮", cast: 3.2, cd: 17, need: 0.055, color: "#ff5a4a", tip: "全队会被重创" },
  smash: { name: "碎碑打击", cast: 3.6, cd: 20, need: 0.05, color: "#ffb040", tip: "晨星碑直接掉 9% 生命" },
  call: { name: "深渊召集", cast: 2.8, cd: 16, need: 0.042, color: "#b070ff", tip: "会召来一大群小怪" },
  zero: { name: "绝对零度", cast: 3.0, cd: 16, need: 0.05, color: "#8fe0f0", tip: "全队会被冻住 2.5 秒" },
  mend: { name: "虚空回流", cast: 2.6, cd: 15, need: 0.035, color: "#7ee89c", tip: "首领会回满一大截血" },
  nova: { name: "星海坍缩", cast: 3.8, cd: 18, need: 0.06, color: "#c860ff", tip: "全场毁灭性爆炸" },
};
const ULT_OF = {
  boss: "roar", sovereign: "call", devourer: "nova",
  orc: "roar", bigslime: "call", sandworm: "smash", wyvern: "roar", golem: "smash",
  frostgiant: "zero", warmech: "smash", bloodwolf: "roar", shaman: "mend", necro: "call",
  nameless: "nova", stormlord: "zero", monolith: "smash", ashwalker: "roar", voidknight: "mend",
};
const ultOf = e => ((isBoss(e) || e.lead) && ULT_DEF[ULT_OF[e.type]]) || null;
const BREAK_BONUS = 1.6;   // 破防期间受到的伤害倍率

function startCast(e, U) {
  e.cast = { u: U, t: 0, dur: U.cast * (e.enraged ? 0.82 : 1), need: e.maxHp * U.need, got: 0 };
  e.pend = 0; e.target = null;
  addFx({ kind: "banner", text: `${e.d.name} 正在吟唱 · ${U.name}`, life: 1.6, danger: true });
  addFx({ kind: "ring", x: e.x, y: e.y, color: U.color, life: 0.8, r0: 0.2, r1: 2.2 });
  S.shake = 0.25;
}
function breakCast(e, why) {
  const U = e.cast.u;
  e.cast = null; e.brokenT = 6; e.stunT = Math.max(e.stunT, 1.2); e.ultCd = U.cd * 0.75;
  S.slowmo = 0.45; S.shake = 0.6;
  S.dust += 25; S.star = Math.min(ULT.max, S.star + 1);
  addFx({ kind: "banner", text: `打断！${e.d.name} 破防了`, life: 1.8 });
  addFx({ kind: "text", x: e.x, y: e.y - 1.1, text: "破防 · 星尘 +25", color: "#ffd860", life: 1.4, big: true });
  addFx({ kind: "boom", x: e.x, y: e.y, r: 1.6, color: "#ffe38a", life: 0.5 });
  addFx({ kind: "flash", life: 0.3, color: "#ffffff" });
  burst(e.x, e.y, "#ffe38a", 28, 3.4, 0.8, 0.09);
  S.events.push({ type: "achv", id: "interrupt" });
  S.breaks = (S.breaks || 0) + 1;
  if (S.breaks >= 5) S.events.push({ type: "achv", id: "interrupt5" });
  if (why) addFx({ kind: "text", x: e.x, y: e.y - 1.7, text: why, color: "#8fe0f0", life: 1.2 });
}
function fireUlt(e, U) {
  const k = ULT_OF[e.type], atk = eAtk(e);
  addFx({ kind: "banner", text: `${U.name}！`, life: 1.5, danger: true });
  S.shake = 0.7; S.hitFlash = 0.6;
  if (k === "roar" || k === "nova") {
    const mult = k === "nova" ? 2.2 : 1.8;
    for (const u of [...S.units]) if (alive(u)) hurtUnit(u, calc(atk * mult, "magic", uDef(u), uRes(u)), "magic", e);
    if (k === "nova") hurtCrystal(Math.round(S.crystal.maxHp * 0.08), e);
    addFx({ kind: "boom", x: e.x, y: e.y, r: 9, color: U.color, life: 0.8 });
    burst(e.x, e.y, U.color, 48, 5.5, 1, 0.11);
    addFx({ kind: "flash", life: 0.4, color: U.color });
  } else if (k === "smash") {
    hurtCrystal(Math.round(S.crystal.maxHp * 0.09), e);
    for (const u of [...S.units]) if (alive(u) && toCrystal(u) <= 2.6) hurtUnit(u, calc(atk * 1.4, "phys", uDef(u), uRes(u)), "phys", e);
    addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: U.color, life: 1 });
    addFx({ kind: "boom", x: CRYSTAL.x, y: CRYSTAL.y, r: 2.6, color: U.color, life: 0.7 });
  } else if (k === "call") {
    const minion = (ST.chapter || 0) >= 3 ? "emberling" : (ST.chapter || 0) >= 2 ? "voidling" : "skeleton";
    for (let i = 0; i < 5; i++) spawnNear(ENEMIES[minion] ? minion : "skeleton", e, false, true).hitT = 0.2;
    addFx({ kind: "ring", x: e.x, y: e.y, color: U.color, life: 0.8, r0: 0.2, r1: 2.6 });
    burst(e.x, e.y, U.color, 30, 3, 0.8, 0.08);
  } else if (k === "zero") {
    for (const u of S.units) if (alive(u)) { u.stop = Math.max(u.stop || 0, 2.5); u.frozenT = 2.5; }
    addFx({ kind: "boom", x: CRYSTAL.x, y: CRYSTAL.y, r: 9, color: U.color, life: 0.8 });
    burst(e.x, e.y, U.color, 36, 4, 0.9, 0.09);
  } else if (k === "mend") {
    for (const o of S.enemies) if (!o.dead && (isBoss(o) || o.elite)) { const got = Math.min(o.maxHp * 0.15, o.maxHp - o.hp); o.hp += got; if (got > 0) addNum(o.x, o.y, got, "#7ee89c"); }
    addFx({ kind: "ring", x: e.x, y: e.y, color: U.color, life: 0.8, r0: 0.2, r1: 3 });
  }
}
// 返回 true 表示这一帧首领在读条 / 破防僵直，不做别的事
function ultStep(e, dt) {
  if (e.brokenT > 0) {
    e.brokenT -= dt;
    if (e.brokenT <= 0) addFx({ kind: "text", x: e.x, y: e.y - 1, text: "恢复了", color: "#ff8a7a", life: 1 });
  }
  const U = ultOf(e); if (!U) return false;
  if (e.cast) {
    if (e.freezeT > 0) { breakCast(e, "冻结打断"); return true; }
    if (e.stunT > 0) { breakCast(e, "眩晕打断"); return true; }
    e.cast.t += dt;
    if (e.cast.t >= e.cast.dur) { fireUlt(e, U); e.cast = null; e.ultCd = U.cd; S.ultsFired = (S.ultsFired || 0) + 1; }
    return true;
  }
  if (e.ultCd == null) e.ultCd = U.cd * 0.7;
  if (e.brokenT > 0) return false;
  e.ultCd -= dt;
  if (e.ultCd <= 0 && e.freezeT <= 0 && e.stunT <= 0 && !S.cine) { startCast(e, U); return true; }
  return false;
}
// 伤害累计（在 hurt 里调用）
function castHit(e, amt) {
  if (!e.cast) return;
  e.cast.got += amt;
  if (e.cast.got >= e.cast.need) breakCast(e, null);
}

// ---------- 首领专属机制：每位首领一个自动触发的特性，没有要手动摆放的东西 ----------
// 有「预警」的会在目标脚下先画一圈，1 秒后才结算；反制手段都是现有的：集火、打断、换配置
const BOSS_MECH = {
  orc:       { id: "muster",    name: "战争号角", cd: 15, tip: "每 15 秒吹号，召来 2 只狼" },
  bigslime:  { id: "split",     name: "沼泽分裂", cd: 0,  tip: "生命每掉 25%，分裂出 2 只小史莱姆" },
  boss:      { id: "drain",     name: "汲取魔力", cd: 6,  tip: "身边每有一只小怪就回血，先清小怪" },
  sovereign: { id: "aura",      name: "君主护佑", cd: 3,  tip: "身边 3 格内的小怪受到的伤害 −20%" },
  devourer:  { id: "devour",    name: "饕餮",     cd: 8,  tip: "吞掉身边的小怪回血，别让小怪靠近它" },
  sandworm:  { id: "quake",     name: "震地",     cd: 12, tip: "地面角色被震晕 1 秒（有预警）" },
  wyvern:    { id: "dive",      name: "俯冲",     cd: 11, tip: "俯冲重击一名队员（有预警）" },
  golem:     { id: "stoneskin", name: "岩肤",     cd: 0,  tip: "物理伤害 −30%，法术更有效" },
  frostgiant:{ id: "glacier",   name: "冰甲",     cd: 16, tip: "周期性凝出冰甲，要先打碎" },
  warmech:   { id: "repair",    name: "自动维修", cd: 0,  tip: "3 秒没挨打就自我修复，要持续输出" },
  bloodwolf: { id: "howl",      name: "血月嚎叫", cd: 13, tip: "全体敌人 5 秒内攻击 +20%、移速 +12%" },
  ashwalker: { id: "ember",     name: "余烬",     cd: 10, tip: "点燃两名队员（有预警）" },
  monolith:  { id: "reflect",   name: "碑文反噬", cd: 0,  tip: "被法术打中时，反弹 10% 伤害给攻击者" },
  stormlord: { id: "bolt",      name: "落雷",     cd: 8,  tip: "雷击两名队员（有预警）" },
  nameless:  { id: "erase",     name: "抹除",     cd: 20, tip: "清空一名队员的技力并定身（有预警）" },
};
const mechOf = e => ((isBoss(e) || e.lead) && BOSS_MECH[e.type]) || null;
function mechPick(n) {
  const a = S.units.filter(alive), out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(roll("fight") * a.length), 1)[0]);
  return out;
}
function mechMark(m, us, fn, color) {
  for (const u of us) addFx({ kind: "ring", x: u.x, y: u.y, color, life: 1, r0: 1.1, r1: 0.25 });
  m.pend = { t: 1, fn: () => fn(us.filter(alive)) };
}
function mechStep(e, dt) {
  const M = mechOf(e); if (!M || e.dead || S.cine) return;
  const m = e.mech || (e.mech = { t: M.cd * 0.6, split: 0.75, pend: null, rep: 0 });
  if (m.pend) { m.pend.t -= dt; if (m.pend.t <= 0) { const p = m.pend; m.pend = null; p.fn(); } }
  const id = M.id, atk = eAtk(e), say = (txt, c) => addFx({ kind: "text", x: e.x, y: e.y - 1.3, text: txt, color: c || "#ffb0a0", life: 1.3, big: true });
  if (id === "split") {
    while (m.split > 0 && e.hp <= e.maxHp * m.split && e.hp > 0) { m.split -= 0.25; say(M.name); for (let i = 0; i < 2; i++) spawnNear("slime", e, false, true).hitT = 0.2; }
    return;
  }
  if (id === "repair") {
    if (S.t - e.hurtAt > 3 && e.hp < e.maxHp) { m.rep += dt; if (m.rep >= 1) { m.rep = 0; const g = Math.min(e.maxHp * 0.012, e.maxHp - e.hp); e.hp += g; addNum(e.x, e.y, g, "#7ee89c"); } } else m.rep = 0;
    return;
  }
  if (id === "aura") { S.auraBoss = e; }
  if (e.cast || e.stunT > 0 || e.freezeT > 0 || e.brokenT > 0) return;
  m.t -= dt * (e.enraged ? 1.25 : 1); if (m.t > 0) return; m.t = M.cd;
  if (id === "muster") { say(M.name); for (let i = 0; i < 2; i++) spawnNear("wolf", e, false, true).hitT = 0.2; addFx({ kind: "ring", x: e.x, y: e.y, color: "#ffb040", life: 0.8, r0: 0.2, r1: 2.4 }); }
  else if (id === "drain") {
    const n = Math.min(4, S.enemies.filter(o => o !== e && !o.dead && !isBoss(o) && dist(o, e) <= 2.5).length);
    if (n) { const g = Math.min(e.maxHp * 0.015 * n, e.maxHp - e.hp); if (g > 0) { e.hp += g; addNum(e.x, e.y, g, "#c890ff"); addFx({ kind: "ring", x: e.x, y: e.y, color: "#b070ff", life: 0.7, r0: 2.4, r1: 0.3 }); } }
  }
  else if (id === "aura") addFx({ kind: "ring", x: e.x, y: e.y, color: "#ffd860", life: 1, r0: 0.3, r1: 3.2 });
  else if (id === "devour") {
    let o = null, bd = 3; for (const x of S.enemies) if (x !== e && !x.dead && !isBoss(x) && !x.lead) { const d = dist(x, e); if (d < bd) { bd = d; o = x; } }
    if (o) { o.dead = true; addFx({ kind: "boom", x: o.x, y: o.y, r: 0.7, color: "#c860ff", life: 0.4 }); const g = Math.min(e.maxHp * 0.03, e.maxHp - e.hp); e.hp += g; if (g > 0) addNum(e.x, e.y, g, "#c890ff"); }
  }
  else if (id === "glacier") { e.shield = Math.max(e.shield, Math.round(e.maxHp * 0.06)); e.maxShield = Math.max(e.maxShield, e.shield); say(M.name, "#8fe0f0"); addFx({ kind: "ring", x: e.x, y: e.y, color: "#8fe0f0", life: 0.8, r0: 0.2, r1: 2 }); }
  else if (id === "howl") { say(M.name); for (const o of S.enemies) if (!o.dead) o.howlUntil = S.t + 5; addFx({ kind: "ring", x: e.x, y: e.y, color: "#ff4a5a", life: 1, r0: 0.3, r1: 9 }); }
  else if (id === "quake") { say(M.name, "#ffb040"); const us = S.units.filter(u => alive(u) && u.def.place === "ground"); mechMark(m, us, l => { for (const u of l) { hurtUnit(u, calc(atk * 0.9, "phys", uDef(u), uRes(u)), "phys", e); u.stop = Math.max(u.stop || 0, 1); } S.shake = Math.max(S.shake, 0.4); addFx({ kind: "boom", x: e.x, y: e.y, r: 3, color: "#d0a050", life: 0.5 }); }, "#d0a050"); }
  else if (id === "dive") { say(M.name); mechMark(m, mechPick(1), l => { for (const u of l) { hurtUnit(u, calc(atk * 1.8, "phys", uDef(u), uRes(u)), "phys", e); addFx({ kind: "boom", x: u.x, y: u.y, r: 1, color: "#ffd890", life: 0.4 }); } }, "#ffd890"); }
  else if (id === "ember") { say(M.name, "#ff8a3a"); mechMark(m, mechPick(2), l => { for (const u of l) { hurtUnit(u, calc(atk * 1.1, "magic", uDef(u), uRes(u)), "magic", e); addFx({ kind: "boom", x: u.x, y: u.y, r: 1, color: "#ff8a3a", life: 0.4 }); } }, "#ff8a3a"); }
  else if (id === "bolt") { say(M.name, "#9ed0ff"); mechMark(m, mechPick(2), l => { for (const u of l) { hurtUnit(u, calc(atk * 1.3, "magic", uDef(u), uRes(u)), "magic", e); u.stop = Math.max(u.stop || 0, 0.5); addFx({ kind: "pillar", x: u.x, y: u.y, color: "#c8e0ff", life: 0.5 }); } }, "#9ed0ff"); }
  else if (id === "erase") { say(M.name, "#ffffff"); mechMark(m, mechPick(1), l => { for (const u of l) { u.sp = 0; u.stop = Math.max(u.stop || 0, 2); addFx({ kind: "text", x: u.x, y: u.y - 0.8, text: "被抹除", color: "#ffffff", life: 1.2, big: true }); } }, "#ffffff"); }
}
// ---------- 入场演出 ----------
function cineWorthy(e) {
  if (S.cine || S.cineWave === S.wave) return false;
  if (isBoss(e)) return true;
  return !!(e.elite && BOSS_TITLE[e.type] && (S.wave >= totalWaves() || S.vigil || S.endless));
}
function startCine(e) {
  S.cine = {
    type: e.type, name: e.d.name, title: BOSS_TITLE[e.type] || "强敌", color: e.d.color,
    elite: !!e.elite, ult: (ultOf(e) || {}).name || "", mech: mechOf(e), t: 0, dur: 2.9,
  };
  S.cineWave = S.wave;
  if (mechOf(e)) once("bossmech", "<b>首领特性</b>每位首领有一个专属机制，有「预警」的会先在目标脚下画圈。读条时集火可以打断大招。");
  S.shake = 0.8; S.hitFlash = 0.7;
  addFx({ kind: "ring", x: e.x, y: e.y, color: e.d.color, life: 1, r0: 0.2, r1: 3.6 });
  burst(e.x, e.y, e.d.color, 40, 4.4, 1.1, 0.1);
}
function cineStep(dt) {
  if (!S.cine) return false;
  S.cine.t += dt;
  if (S.cine.t >= S.cine.dur) S.cine = null;
  return true;
}
function skipCine() { if (S.cine && S.cine.t > 0.35) { S.cine = null; return true; } return false; }

// ---------- 画面：入场演出 ----------
function drawCine() {
  const C = S.cine; if (!C) return;
  const a = Math.min(1, C.t / 0.28, (C.dur - C.t) / 0.32);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = a * 0.66; ctx.fillStyle = "#05030a"; ctx.fillRect(0, 0, PW, PHt); ctx.globalAlpha = 1;
  const bh = R0(46 * a);
  ctx.fillStyle = "#05030a"; ctx.fillRect(0, 0, PW, bh); ctx.fillRect(0, PHt - bh, PW, bh);
  ctx.fillStyle = C.color; ctx.fillRect(0, bh - 1, PW, 1); ctx.fillRect(0, PHt - bh, PW, 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, bh, PW, PHt - bh * 2); ctx.clip();
  // 冲刺线
  ctx.globalAlpha = a * 0.5;
  for (let i = 0; i < 16; i++) {
    const y = bh + ((i * 47) % 100) / 100 * (PHt - bh * 2), len = 30 + (i * 53) % 90;
    const x = PW - ((C.t * 620 + i * 137) % (PW + len));
    rect(ctx, x, y, len, 1, i % 3 ? "rgba(255,255,255,.5)" : C.color);
  }
  ctx.globalAlpha = 1;
  // 背后的光
  const gk = 0.5 + Math.sin(C.t * 7) * 0.12;
  ctx.globalAlpha = a * 0.3;
  disc(ctx, PW * 0.62, PHt * 0.52, 70 * gk + 40, C.color);
  ctx.globalAlpha = a * 0.18; disc(ctx, PW * 0.62, PHt * 0.52, 110, C.color); ctx.globalAlpha = 1;
  // 立绘：从右边滑进来
  const img = renderFoe(C.type, { step: 0, ph: C.t > 1.5 ? "wind" : "", face: -1, elite: C.elite, t: C.t });
  const slide = Math.max(0, 1 - C.t / 0.55), out = Math.max(0, (C.t - (C.dur - 0.35)) / 0.35);
  const sc = 2.1 + Math.sin(C.t * 2.2) * 0.05, cx = PW * 0.66 + slide * slide * 260 + out * 90;
  const cy = PHt * 0.56 + 60;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = a;
  ctx.drawImage(img, 0, 0, 120, 120, R0(cx - 60 * sc), R0(cy - 112 * sc), R0(120 * sc), R0(120 * sc));
  ctx.globalAlpha = 1;
  // 三道斩线
  for (let i = 0; i < 3; i++) {
    const st = 0.45 + i * 0.28, k = (C.t - st) / 0.3;
    if (k < 0 || k > 1) continue;
    const y = PHt * (0.3 + i * 0.2), w = PW * Math.min(1, k * 2);
    ctx.globalAlpha = 1 - k;
    rect(ctx, 0, y, w, 2, "#ffffff"); rect(ctx, 0, y + 2, w * 0.7, 1, C.color);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawCineText(s, txt, tk) {
  tk = tk || 1;
  const C = S.cine; if (!C) return;
  const a = Math.min(1, C.t / 0.28, (C.dur - C.t) / 0.32);
  const nk = Math.min(1, Math.max(0, (C.t - 0.35) / 0.3));
  const ttk = Math.min(1, Math.max(0, (C.t - 0.8) / 0.35));
  const uk = Math.min(1, Math.max(0, (C.t - 1.25) / 0.35));
  tctx.save(); tctx.globalAlpha = a; tctx.textAlign = "left";
  const x0 = tx.width * 0.07;
  if (nk > 0) {
    tctx.globalAlpha = a * nk;
    tctx.fillStyle = C.color; tctx.fillRect(x0 - 4 * s, tx.height * 0.36, 3 * s, 34 * s);
    txt(C.name, x0 + 6 * s + (1 - nk) * 90 * s, tx.height * 0.4, 30 * s * tk, "#fff0d0");
  }
  if (ttk > 0) { tctx.globalAlpha = a * ttk; txt(C.title, x0 + 8 * s + (1 - ttk) * 60 * s, tx.height * 0.54, 13 * s * tk, C.color); }
  if (uk > 0 && C.ult) { tctx.globalAlpha = a * uk; txt(`大招 · ${C.ult}（读条时集火可以打断）`, x0 + 8 * s, tx.height * 0.66, 11 * s * tk, "#cfd8e4"); }
  if (uk > 0 && C.mech) { tctx.globalAlpha = a * uk; txt(`特性 · ${C.mech.name}：${C.mech.tip}`, x0 + 8 * s, tx.height * 0.74, 11 * s * tk, "#ffd0a0"); }
  tctx.globalAlpha = a * 0.7; tctx.textAlign = "right";
  txt("点一下跳过", tx.width - 12 * s, tx.height - 14 * s * tk, 10 * s * tk, "#9aa0b4");
  tctx.restore(); tctx.textAlign = "center"; tctx.globalAlpha = 1;
}
// ---------- 画面：读条 ----------
function drawCastBar(e, fx, top) {
  const c = e.cast, k = Math.min(1, c.t / c.dur), bk = Math.min(1, c.got / c.need), w = 44;
  const x = R0(fx - w / 2), y = R0(top - 18);
  rect(ctx, x - 1, y - 1, w + 2, 7, OUT);
  rect(ctx, x, y, w, 5, "#2a1830");
  rect(ctx, x, y, R0(w * k), 5, c.u.color);
  rect(ctx, x, y, R0(w * k), 1, "#ffffff");
  // 打断进度：下面一条金色
  rect(ctx, x, y + 5, R0(w * bk), 1, "#ffe38a");
  for (let i = 1; i < 4; i++) rect(ctx, x + R0(w * i / 4), y, 1, 5, "rgba(0,0,0,.4)");
}
function drawCastAura(e, fx, fy, t) {
  const c = e.cast, col = c.u.color;
  const r = 14 + Math.sin(t * 8) * 3;
  ring(ctx, fx, fy, r + 8, (r + 8) * 0.55, col, (t * 8 | 0) % 2);
  for (let i = 0; i < 6; i++) {
    const kk = (t * 1.4 + i / 6) % 1, ang = i / 6 * 6.283 + t * 1.6;
    rect(ctx, fx + Math.cos(ang) * (r + 6) * (1 - kk * 0.7), fy - kk * 40, 2, 2, kk < 0.6 ? col : "#ffffff");
  }
}
