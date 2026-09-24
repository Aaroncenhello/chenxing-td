
// ================= 战斗：伤害、出手、技能、每一步 =================
// 画质档位：粒子数量倍率 k、同屏特效上限 cap、抖屏强度 shake、背景飘落物 amb。-1 = 自动（手机用中，电脑用高）
const GFX_LV = [{ name: "低", k: 0.3, cap: 200, shake: 0.5, amb: false }, { name: "中", k: 0.6, cap: 400, shake: 1, amb: true }, { name: "高", k: 1, cap: 700, shake: 1, amb: true }];
let GFX = GFX_LV[2], gfxSel = -1;
function applyGfx(sel) {
  gfxSel = sel == null ? -1 : sel;
  const auto = typeof isPhone === "function" && isPhone() ? 1 : 2;
  GFX = GFX_LV[gfxSel >= 0 ? gfxSel : auto];
}
// 特效满了就先丢掉装饰性的（粒子、伤害数字），横幅、演出、环这类关键反馈照常加
const fxCheap = f => f.kind === "parts" || (f.kind === "text" && !f.big);
function addFx(f) { f.t = 0; if (S.fx.length >= GFX.cap && fxCheap(f)) return; S.fx.push(f); }
function burst(x, y, color, n, spd, life, size) {
  const parts = [];
  n = Math.max(1, Math.round(n * GFX.k));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8);
    parts.push({ vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.5, s: size * (0.5 + Math.random()) });
  }
  addFx({ kind: "parts", x, y, color, parts, life });
}
// 像素碎裂：把敌人的像素图切成 8×8 的小块，每块带一个往外飞的速度，drawFx 里按重力画出来
function shatterFx(e) {
  const F = foeOf(e.type), w = F.frames[0][0].length, h = F.frames[0].length + (F.legs ? 2 : 0), bs = 8, blocks = [];
  const x0 = (30 - Math.floor(w / 2)) * 2, y0 = (56 - h) * 2, cx = x0 + w, cy = y0 + h;
  for (let sy = y0; sy < 112; sy += bs) for (let sx = x0; sx < x0 + w * 2; sx += bs) {
    const dx = sx + bs / 2 - cx, dy = sy + bs / 2 - cy, d = Math.hypot(dx, dy) || 1;
    blocks.push({ sx, sy, vx: dx / d * (40 + Math.random() * 70), vy: dy / d * 40 - 50 - Math.random() * 70, spin: Math.random() < 0.5 });
  }
  return { kind: "shatter", type: e.type, elite: e.elite, face: e.face, x: e.x, y: e.y, fly: !!F.fly, blocks: blocks.slice(0, 64), life: 0.7 };
}
const faceTo = (o, tx) => { if (tx < o.x - 0.05) o.face = -1; else if (tx > o.x + 0.05) o.face = 1; };
// 伤害数字：key = 挨打的对象，短时间内同一对象、同一颜色的数字合并成一个往上滚，不刷屏；
// frac = 这一下（合并后的总数）占对象最大生命的比例，决定字号：≥30% 最大号并带一点抖屏，暴击或 ≥10% 中号
const numSize = (frac, crit) => (frac >= 0.3 ? 4 : crit || frac >= 0.1 ? 3 : 2);
function addNum(x, y, v, color, big, key, maxHp) {
  if (key != null) {
    for (let i = S.fx.length - 1, n = 0; i >= 0 && n < 60; i--, n++) {
      const f = S.fx[i];
      if (f.kind !== "text" || f.key !== key || f.color !== color || f.t > 0.35) continue;
      f.val += v; f.text = String(Math.round(f.val)); f.t = Math.min(f.t, 0.06);
      const sz = Math.max(f.sz, numSize(maxHp ? f.val / maxHp : 0, big)); if (sz === 4 && f.sz < 4) S.shake = Math.max(S.shake, 0.12);
      f.sz = sz; f.crit = f.crit || !!big;
      return;
    }
  }
  const sz = numSize(maxHp ? v / maxHp : 0, big);
  if (sz === 4) S.shake = Math.max(S.shake, 0.12);
  addFx({ kind: "text", x: x + (Math.random() - 0.5) * 0.3, y: y - 0.35, text: String(Math.round(v)), val: v, color, life: sz >= 3 ? 0.95 : 0.8, crit: !!big, sz, key, big: sz === 4 });
}

// ---------- 伤害 ----------
function killEnemy(e, src) {
  e.dead = true; S.kills++;
  S.foeKill[e.type] = (S.foeKill[e.type] || 0) + 1;
  if (e.elite || isBoss(e)) S.eliteKills = (S.eliteKills || 0) + 1;
  if (e === S.focus) S.focusKills = (S.focusKills || 0) + 1;
  addStat(src, "kills", 1);
  gainXp(e.d.reward * RULES.xpKill * (e.elite ? 2 : 1));
  gainStar(e); addCombo();
  afxDeath(e);
  relicDrop(e);
  if (rl("rl_fang") && src && src.def && !src.dead && src.down <= 0) heal(src, src.maxHp * 0.08, true, src);
  if (S.riftDust > 0 && e.elite) { const g = Math.round(S.riftDust / 4); S.dust += g; S.riftDust -= g; addFx({ kind: "text", x: e.x, y: e.y - 0.8, text: "+" + g + " 星尘", color: "#ffd860", life: 1.1, big: true }); }
  // 星尘
  const dust = Math.round((isBoss(e) ? SHOP.dustBoss : e.elite ? SHOP.dustElite : SHOP.dustPerKill * Math.max(1, Math.round(e.d.reward * 0.7))) * (cl("lg_greed") ? 2 : 1) * (cu("cu_greed") ? 2 : 1) * (rl("rl_compass") ? 1.35 : 1) * (wk("poor") ? 0.5 : 1));
  if (!e.summoned) { S.dust += dust; if (dust >= 4) addFx({ kind: "text", x: e.x + 0.2, y: e.y - 0.5, text: "+" + dust + " 星尘", color: "#ffd860", life: 1 }); }
  // 宝箱怪：额外翻一次牌
  if (e.type === "treasure") {
    S.pending++; S.chest++; S.dust += 30;
    S.events.push({ type: "achv", id: "treasure" });
    addFx({ kind: "banner", text: "宝箱打爆了！多翻一张牌 +30 星尘", life: 2 });
    for (let i = 0; i < 4; i++) addFx({ kind: "pillar", x: e.x + (i - 1.5) * 0.3, y: e.y, color: "#ffd860", life: 0.8 });
    burst(e.x, e.y, "#ffe040", 40, 3.4, 1, 0.09); S.shake = 0.4;
  }
  // 传说卡「天罚」
  if (cl("lg_judge") && src && src.def && roll("fight") < 0.2 * cl("lg_judge")) {
    const t = S.enemies.filter(o => hittable(o) && o !== e).sort((a, b) => dist(a, e) - dist(b, e))[0];
    if (t) {
      const dmg = SKILL_DMG.lg_judge * cl("lg_judge") * powerK();
      addFx({ kind: "pillar", x: t.x, y: t.y, color: "#fff6c0", life: 0.7 });
      addFx({ kind: "boom", x: t.x, y: t.y, r: 1.4, color: "#ffd860", life: 0.5 });
      for (const o of S.enemies) if (hittable(o) && dist(o, t) <= 1.4) hurt(o, calc(dmg, "magic", eDef(o), eRes(o)), "true", true, { key: "lg_judge" });
      S.shake = Math.max(S.shake, 0.2);
    }
  }
  if (src && hasTal(src, "sword") && src.skillT <= 0) src.sp = Math.min(src.def.sp, src.sp + 4);
  if (src && tal(src, "t_spark") && !src.dead && src.down <= 0) { heal(src, src.maxHp * 0.03, true, src); if (src.skillT <= 0) src.sp = Math.min(src.def.sp, src.sp + 2); }
  burst(e.x, e.y, e.d.color, 16, 2.6, 0.6, 0.08);
  // 普通/精英：身体碎成像素块飞散（低画质和首领仍用原来的倒地）
  if (GFX.k >= 0.6 && !isBoss(e)) addFx(shatterFx(e)); else addFx({ kind: "corpse", type: e.type, elite: e.elite, x: e.x, y: e.y, face: e.face, life: 0.6 });
  // 顿帧：精英、首领被打死时画面停一下，配一圈白色冲击环
  if (e.elite || isBoss(e)) { S.hitStop = Math.max(S.hitStop || 0, isBoss(e) ? 0.16 : 0.07); addFx({ kind: "ring", x: e.x, y: e.y, color: "#ffffff", life: 0.35, r0: 0.2, r1: isBoss(e) ? 2.6 : 1.5 }); }
  if ((e.elite || isBoss(e)) && S.slowCd <= 0) { S.slowmo = Math.max(S.slowmo, isBoss(e) ? 0.9 : 0.22); S.slowCd = 1.2; }
  if (isBoss(e)) { S.shake = 0.6; bossFanfare(e, "death"); if (S.boss === e) S.boss = null; if (e.type === "boss") S.events.push({ type: "achv", id: "boss" }); }
  if (e.d.split) for (let i = 0; i < e.d.split; i++) { const s = spawnNear("slime", e, false, true); s.stop = 0.2; s.hitT = 0.1; }
  // 殉爆
  if (cl("boom") && roll("fight") < 0.18 * cl("boom") * (syn("bloodlust") ? 1.5 : 1)) {
    const dmg = 500 * cl("boom") * powerK() * (syn("bloodlust") ? 1.5 : 1);
    addFx({ kind: "boom", x: e.x, y: e.y, r: 1.3, color: "#ff8a3a", life: 0.45 });
    burst(e.x, e.y, "#ffb040", 18, 2.8, 0.6, 0.07);
    const br0 = syn("bloodlust") ? 1.9 : 1.3;
    for (const o of S.enemies) if (hittable(o) && dist(o, e) <= br0) hurt(o, dmg, "magic", false, { key: "boom" });
  }
  const c = e.corrode;
  if (c && c.t > 0 && c.src && c.src.hero && sg("sg_al2")) {
    const dmg = uAtk(c.src) * 1.1;
    addFx({ kind: "boom", x: e.x, y: e.y, r: 1.4, color: "#a8d848", life: 0.45 });
    for (const o of S.enemies) if (hittable(o) && dist(o, e) <= 1.4) { hurt(o, calc(dmg, "magic", eDef(o), eRes(o)), "magic", false, c.src); applyCorrode(o, c.k, 4, c.src); }
  }
  if (c && c.t > 0 && c.src && hasTal(c.src, "alchemist")) {
    const dmg = uAtk(c.src) * 0.6;
    addFx({ kind: "boom", x: e.x, y: e.y, r: 1, color: "#a8d848", life: 0.4 });
    for (const o of S.enemies) if (hittable(o) && dist(o, e) <= 1) hurt(o, calc(dmg, "magic", eDef(o), eRes(o)), "magic", false, c.src);
  }
}
function hurt(e, amt, type, crit, src) {
  if (e.dead) return 0;
  if (type === "phys" && e.d.physRes) amt *= 1 - e.d.physRes;
  if (e.brokenT > 0) amt *= BREAK_BONUS;
  if (e.mark > 0) amt *= 1.25;
  if (S.weakWaves > 0) amt *= 1.1;
  if (rl("rl_shard") && (e.freezeT > 0 || e.slowT > 0)) amt *= 1.35;
  if (src && src.hero && sg("sg_fr1") && (e.freezeT > 0 || e.slowT > 0)) amt *= 1 + 0.2 * sg("sg_fr1");
  if (src && src.hero && sg("sg_ch1") && (e.freezeT > 0 || e.slowT > 0)) amt *= 1 + 0.18 * sg("sg_ch1");
  if (syn("frostbite") && (e.freezeT > 0 || e.slowT > 0)) amt *= 1.4;
  if (e.burn > 0 && syn("inferno")) amt *= 1.1;
  if (e === S.focus && src && src.def) amt *= FOCUS_BONUS;
  const byUnit = src && src.def && type !== "poison";
  if (byUnit) {
    if (e.elite || isBoss(e)) amt *= (1 + 0.25 * cl("hunter") + 0.05 * dk("boss")) * (rl("rl_badge") ? 1.3 : 1);
    if (rl("rl_berserk") && !crit) { src.hitN = (src.hitN || 0) + 1; if (src.hitN % 8 === 0) { amt *= 3; crit = true; } }
    if ((cl("crit") || cu("cu_moon") || dk("crit")) && !crit && roll("fight") < 0.08 * cl("crit") + 0.02 * dk("crit") + 0.25 * cu("cu_moon")) { amt *= 2; crit = true; if (cu("cu_moon")) hurtUnit(src, src.maxHp * 0.01, "poison"); }
    if (src.hero && sg("sg_as2") && !isBoss(e) && e.hp <= e.maxHp * 0.25 && e.hp > 0) { amt = e.hp + e.shield + 1; addFx({ kind: "text", x: e.x, y: e.y - 0.6, text: "处决", color: "#4fc0b0", life: 0.9, big: true }); }
    if (cl("freeze") && !e.d.unstoppable && roll("fight") < 0.06 * cl("freeze")) e.freezeT = Math.max(e.freezeT, 0.8 * (syn("frostbite") ? 1.5 : 1));
    if (cl("vamp") && !src.dead && src.down <= 0) heal(src, Math.min(amt, e.hp + e.shield) * 0.06 * cl("vamp") * (syn("bloodlust") ? 2 : 1), true, src);
    if (hasAfx(e, "thorns") && src.def.place === "ground" && !src.dead && src.down <= 0) hurtUnit(src, amt * 0.18, "magic", null);
    if (tal(src, "t_pierce") && !e.dead) applyCorrode(e, 0.25, 4, src);
  }
  if (e.shield > 0) {
    const m = type === "magic" ? 1.5 : 1, eff = amt * m;
    if (eff <= e.shield) { e.shield -= eff; addNum(e.x, e.y, eff, "#8ac8ff", crit, e.id, e.maxHp); e.hitT = 0.1; addStat(src, "dmg", eff); return eff; }
    const left = (eff - e.shield) / m; addNum(e.x, e.y - 0.15, e.shield, "#8ac8ff", false, e.id, e.maxHp); addStat(src, "dmg", e.shield);
    burst(e.x, e.y - 0.2, "#8ac8ff", 14, 2.4, 0.5, 0.06); e.shield = 0; amt = left;
  }
  const real = Math.min(amt, e.hp);
  if (amt > (S.maxHit || 0)) { S.maxHit = amt; S.maxHitBy = statName(statKey(src)); }
  e.hp -= amt; e.hitT = 0.12; e.kb = crit ? 1.6 : 1; e.hurtAt = S.t;
  if (e.cast) castHit(e, amt);
  addStat(src, "dmg", real);
  addNum(e.x, e.y, amt, type === "true" ? "#fff0a0" : crit ? "#ffe040" : type === "magic" ? "#d4b4ff" : type === "poison" ? "#9cf07a" : "#ffffff", crit, e.id, e.maxHp);
  // 核心天赋「连锁星芒」：暴击弹一下给附近另一个敌人（弹出去的这一下不再暴击，不会连环）
  if (crit && src && src.def && dk("ks_atk")) {
    let o = null, bd = 2.2;
    for (const x of S.enemies) if (x !== e && hittable(x)) { const d = dist(x, e); if (d < bd) { bd = d; o = x; } }
    if (o) { addFx({ kind: "bolt", x: e.x, y: e.y, x2: o.x, y2: o.y, life: 0.25, color: "#ffe040" }); hurt(o, amt * 0.5, type, false, src); }
  }
  if (type !== "poison") burst(e.x, e.y - 0.1, type === "magic" ? "#d4b4ff" : "#ffe7a8", crit ? 8 : 4, 2.2, 0.3, 0.045);
  if (e.type === "boss" && !e.enraged && e.hp > 0 && e.hp <= e.maxHp * 0.5) enrage(e);
  if (e.d.phases && e.hp > 0) while (e.phase < e.d.phases.length && e.hp <= e.maxHp * e.d.phases[e.phase]) phaseShift(e, e.phase++);
  if (e.hp <= 0) { if (crit && S.slowCd <= 0) { S.slowmo = Math.max(S.slowmo, 0.12); S.slowCd = 1.2; } killEnemy(e, src); }
  return amt;
}
// ---------- 首领大场面：换形态 / 被击破时的演出（纯画面，不改数值）----------
function queueFx(t, f) { (S.fxq || (S.fxq = [])).push({ t, f }); }
function bossFanfare(e, kind) {
  const death = kind === "death", col = death ? "#ffe38a" : e.enraged ? "#ff4a3a" : "#b070ff";
  addFx({ kind: "letterbox", life: death ? 2.4 : 1.5 });
  addFx({ kind: "flash", life: death ? 0.5 : 0.35, color: death ? "#ffffff" : col });
  addFx({ kind: "ring", x: e.x, y: e.y, color: col, life: 0.9, r0: 0.4, r1: death ? 9 : 6 });
  S.shake = Math.max(S.shake, death ? 0.9 : 0.6);
  if (!death) return;
  // 连环爆炸 → 光柱 → 金色碎片雨 → 击破横幅
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4, r = 0.3 + (i % 3) * 0.45;
    queueFx(0.1 + i * 0.12, { kind: "boom", x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.7, r: 0.9 + (i % 3) * 0.4, color: i % 2 ? "#ffb040" : "#ff5a3a", life: 0.55, burst: 14 });
  }
  queueFx(1.05, { kind: "pillar", x: e.x, y: e.y, color: "#ffe38a", life: 1.2, burst: 60, flash: "#fff6d0" });
  queueFx(1.1, { kind: "ring", x: e.x, y: e.y, color: "#ffffff", life: 0.8, r0: 0.3, r1: 11 });
  queueFx(1.2, { kind: "banner", text: `首领击破 · ${e.d.name}`, life: 2.4 });
}
// 排队中的特效到点放出来（step 里调用；带 burst 的顺便炸一把粒子）
function fxQueueStep(dt) {
  if (!S.fxq || !S.fxq.length) return;
  for (const q of S.fxq) {
    q.t -= dt; if (q.t > 0) continue;
    q.done = true; const f = q.f;
    if (f.burst) burst(f.x, f.y, f.color, f.burst, 3.6, 0.9, 0.09);
    if (f.flash) addFx({ kind: "flash", life: 0.3, color: f.flash });
    if (f.kind === "boom") S.shake = Math.max(S.shake, 0.35);
    addFx(f);
  }
  S.fxq = S.fxq.filter(q => !q.done);
}
function enrage(e) {
  e.enraged = true; S.slowmo = 0.5; S.shake = 0.5;
  bossFanfare(e, "phase");
  addFx({ kind: "banner", text: `${e.d.name} · 狂暴`, life: 2, danger: true });
  addFx({ kind: "boom", x: e.x, y: e.y, r: 1.6, color: "#ff3a2a", life: 0.7 });
  burst(e.x, e.y, "#ff5a3a", 30, 3.4, 0.8, 0.09);
  for (let i = 0; i < 2; i++) { const o = spawnNear("orc", e, true, true); o.hp = o.maxHp = Math.round(o.maxHp * 0.8); }
}
function phaseShift(e, idx) {
  const last = idx === e.d.phases.length - 1;
  e.shield = e.maxShield = Math.round(e.maxHp * 0.08);
  S.slowmo = 0.6; S.shake = 0.5; bossFanfare(e, "phase");
  addFx({ kind: "banner", text: `${e.d.name} · ${last ? "最终形态" : idx === 0 ? "第二形态" : "第 " + (idx + 2) + " 形态"}`, life: 2.2, danger: true });
  addFx({ kind: "boom", x: e.x, y: e.y, r: 2, color: "#b070ff", life: 0.8 });
  burst(e.x, e.y, "#c890ff", 36, 3.6, 0.9, 0.09);
  for (let i = 0; i < 4; i++) spawnNear("imp", e, false, true).hitT = 0.2;
  if (last) { e.enraged = true; for (let i = 0; i < 2; i++) spawnNear("wyvern", e, true, true); }
  else spawnNear("golem", e, false, true);
}
function hurtUnit(u, amt, type, from) {
  if (u.dead || u.down > 0) return;
  if (u.def.id === "knight" && u.lv >= 3) amt *= 0.85;
  if (u.hero && sg("sg_kn1")) amt *= Math.max(0.4, 1 - 0.12 * sg("sg_kn1"));
  if (u.blessT > 0) amt *= 0.75;
  if (rl("rl_mirror")) amt *= 0.85;
  if (tal(u, "t_last") && u.hp < u.maxHp * 0.35) amt *= 0.75;
  amt *= 1 - marshalGuard(u);
  if (sg("sg_ma1")) amt *= Math.max(0.5, 1 - 0.08 * sg("sg_ma1"));
  amt *= 1 + 0.2 * cu("cu_blood");
  if (type === "magic" && hasTal(u, "lancer")) amt *= 0.6;
  if (from && from.d && hasAfx(from, "vampiric") && !from.dead) from.hp = Math.min(from.maxHp, from.hp + amt * 0.4);
  u.hp -= amt; u.hitT = type === "poison" ? Math.max(u.hitT, 0.06) : 0.14; if (type !== "poison") u.kb = 1;
  addStat(u, "taken", amt);
  addNum(u.x, u.y, amt, type === "magic" ? "#d4b4ff" : type === "poison" ? "#9cf07a" : "#ff9a8f", false, "u" + u.id, u.maxHp);
  if (type !== "poison") burst(u.x, u.y - 0.1, "#ff9a8f", 3, 2, 0.3, 0.04);
  if (cl("thorn") && from && !from.dead && type !== "poison") hurt(from, amt * 0.25 * cl("thorn"), "magic", false, { key: "thorn" });
  if (tal(u, "t_thorn") && from && !from.dead && type === "phys") hurt(from, amt * 0.2, "magic", false, { key: "thorn" });
  const rf = (u.def.id === "mech" ? (br(u, "mech", "A") ? 0.5 : 0.2) : 0) + (u.hero ? 0.25 * sg("sg_me1") : 0);
  if (rf && from && !from.dead && type === "phys") hurt(from, amt * rf, "magic", false, { key: "mech" });
  if (u.hp <= 0) knockOut(u);
}
function heal(u, amt, quiet, src) {
  if (u.dead || u.down > 0) return;
  if (src && src.hero && sg("sg_pr2")) u.blessT = 6;
  const got = Math.min(amt, u.maxHp - u.hp);
  u.hp += got;
  if (src) addStat(src, "heal", got);
  if (got > 0 && !quiet) addNum(u.x, u.y, got, "#7ee89c", false, "h" + u.id);
}
function hurtCrystal(amt, e) {
  if (S.over) return;
  if (syn("wall")) amt *= 0.85;
  if (ab(20)) amt *= 1.3;
  if (rl("rl_crown") && e && !e.dead && e.hp !== undefined) hurt(e, amt * 6, "true", false, { key: "rl_crown" });
  S.crystal.hp = Math.max(0, S.crystal.hp - amt);
  if (S.crystal.hp <= 0 && rl("rl_phoenix") && !S.phoenixUsed) {
    S.phoenixUsed = true; S.crystal.hp = S.crystal.maxHp * 0.35;
    addFx({ kind: "banner", text: "凤凰羽 · 晨星碑重生", life: 2 }); addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: "#ff8a3a", life: 1.2 });
  }
  if (S.crystal.hp <= 0 && dk("ks_def") && !S.ksDefUsed) {
    S.ksDefUsed = true; S.crystal.hp = S.crystal.maxHp * 0.4;
    addFx({ kind: "banner", text: "不灭之碑 · 晨星碑重生", life: 2 }); addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: "#62b4ff", life: 1.2 }); addFx({ kind: "flash", life: 0.3, color: "#8ac8ff" });
  }
  S.crystal.hitT = 0.3; S.hitFlash = 0.5; S.shake = Math.max(S.shake, 0.2);
  addNum(CRYSTAL.x + (Math.random() - 0.5), CRYSTAL.y - 0.2, amt, "#ff6a5a", true);
  burst(CRYSTAL.x, CRYSTAL.y - 0.2, "#8ac8ff", 8, 2, 0.4, 0.05);
  S.leaked++;
  if (S.crystal.hp <= 0) S.over = "lose";
}

// ---------- 飞行物 ----------
const SHOT_SPEED = { archer: 10, gunner: 6, alchemist: 6, bard: 8, summoner: 8, fire: 6, dark: 6 };
function shoot(src, target, kind, atk) {
  S.shots.push({ x: src.x, y: src.y - 0.2, target, kind, atk, src, trail: [], speed: SHOT_SPEED[kind] || 7 });
}
function landShot(s) {
  const t = s.target, u = s.src;
  if (s.kind === "archer") hurt(t, calc(s.atk * (t.d.flying && hasTal(u, "archer") ? 1.5 : 1) * (t.d.flying && u.hero && sg("sg_ar2") ? 2 : 1), "phys", eDef(t), eRes(t)), "phys", false, u);
  else if (s.kind === "mage" && br(u, "mage", "B")) {
    let cur = t, dmg = s.atk; const hit = new Set();
    for (let j = 0; j < 4 && cur; j++) {
      hit.add(cur); hurt(cur, calc(dmg, "magic", eDef(cur), eRes(cur)), "magic", false, u);
      const next = S.enemies.filter(e => hittable(e) && !hit.has(e) && dist(e, cur) <= 1.8).sort((a, b) => dist(a, cur) - dist(b, cur))[0];
      if (next) addFx({ kind: "bolt", x: cur.x, y: cur.y, x2: next.x, y2: next.y, life: 0.25 });
      cur = next; dmg *= 0.8;
    }
  } else if (s.kind === "mage" || s.kind === "gunner" || s.kind === "alchemist" || s.kind === "chrono" || (s.kind === "frost" && br(u, "frost", "B"))) {
    const r = uSplash(u), type = s.kind === "gunner" ? "phys" : "magic", pierce = s.kind === "gunner" && hasTal(u, "gunner") ? 0.6 : 1;
    const ck = s.kind === "alchemist" ? corrodeOf(u) : 0;
    for (const e of S.enemies) if (hittable(e) && (e === t || !e.d.flying) && dist(e, t) <= r) {
      if (ck) applyCorrode(e, ck, 4, u);
      const chill = s.kind === "frost" && hasTal(u, "frost") && (e.freezeT > 0 || e.slowT > 0) ? 1.5 : 1;
      hurt(e, calc(s.atk * chill, type, eDef(e) * pierce, eRes(e)), type, false, u);
      if (br(u, "gunner", "A")) e.stunT = Math.max(e.stunT, 0.8);
      if (u.hero && sg("sg_gu2") && !e.d.unstoppable) e.stunT = Math.max(e.stunT, 0.6);
      if (u.hero && sg("sg_me2")) burnEnemy(e, uAtk(u) * 0.35, 4, u);
      if (s.kind === "frost" && e.freezeT <= 0) { e.slowT = 1.5; e.slowK = 0.6; }
      if (s.kind === "chrono" && e.freezeT <= 0 && !e.d.unstoppable) { e.slowT = 2.2; e.slowK = Math.max(0.2, 0.6 - (u.hero ? 0.1 * sg("sg_ch1") : 0)); }
    }
    if (s.kind === "mage" && u.hero && sg("sg_mg2")) {
      let cur = t, dmg2 = s.atk * 0.6; const hit2 = new Set([t]);
      for (let j = 0; j < 4 && cur; j++) {
        const next = S.enemies.filter(e2 => hittable(e2) && !hit2.has(e2) && dist(e2, cur) <= 1.8).sort((x, y2) => dist(x, cur) - dist(y2, cur))[0];
        if (!next) break;
        hit2.add(next); hurt(next, calc(dmg2, "magic", eDef(next), eRes(next)), "magic", false, u);
        addFx({ kind: "bolt", x: cur.x, y: cur.y, x2: next.x, y2: next.y, life: 0.22 });
        cur = next; dmg2 *= 0.85;
      }
    }
    const col = { mage: "#b070ff", frost: "#8fe0f0", gunner: "#ff9a3a", alchemist: "#a8d848", chrono: "#7ae0d0" }[s.kind];
    addFx({ kind: "boom", x: t.x, y: t.y, r, color: col, life: 0.35 });
    if (s.kind === "gunner") S.shake = Math.max(S.shake, 0.08);
  } else if (s.kind === "frost") {
    const chill = hasTal(u, "frost") && (t.freezeT > 0 || t.slowT > 0) ? 1.5 : 1;
    hurt(t, calc(s.atk * chill, "magic", eDef(t), eRes(t)), "magic", false, u);
    const chance = (br(u, "frost", "A") ? 0.5 : u.lv >= 3 ? 0.25 : 0) + (u.hero ? 0.12 * sg("sg_fr1") : 0);
    const ft = (br(u, "frost", "A") ? 1.5 : 1) + (hasTal(u, "frost") ? 0.5 : 0);
    if (roll("fight") < chance) t.freezeT = Math.max(t.freezeT, ft); else if (t.freezeT <= 0) { t.slowT = 1.5; t.slowK = 0.6; }
  } else if (false) {
  } else if (s.kind === "bard" || s.kind === "summoner") {
    hurt(t, calc(s.atk, "magic", eDef(t), eRes(t)), "magic", false, u);
    if (s.kind === "summoner") burst(t.x, t.y - 0.1, "#7af0e0", 5, 1.6, 0.3, 0.045);
  } else if (s.kind === "priest") heal(t, s.atk * (hasTal(u, "priest") && t.hp < t.maxHp * 0.4 ? 1.6 : 1), false, u);
  else if (s.kind === "enemy" || s.kind === "fire" || s.kind === "dark") {
    hurtUnit(t, calc(s.atk, "magic", uDef(t), uRes(t)), "magic", s.src);
    if (s.kind === "fire") burst(t.x, t.y - 0.1, "#ff9a3a", 8, 1.8, 0.35, 0.05);
    if (s.kind === "dark") addFx({ kind: "boom", x: t.x, y: t.y, r: 0.6, color: "#b070ff", life: 0.35 });
  }
}

// ---------- 角色出手 ----------
const WINDUP = { melee: 0.13, ranged: 0.17, enemy: 0.16 };
// ---------- 集火：点一个敌人，全队够得着就优先打它，它受到的伤害 +15% ----------
const FOCUS_BONUS = 1.15;
function focusFoe() { const e = S.focus; if (!e) return null; if (e.dead || !S.enemies.includes(e)) { S.focus = null; return null; } return e; }
function setFocus(e) {
  if (!e || S.focus === e) { S.focus = null; return false; }
  S.focus = e;
  addFx({ kind: "ring", x: e.x, y: e.y, color: "#ff4a4a", life: 0.35, r0: 1.2, r1: 0.3 });
  if (!S.focusTip) { S.focusTip = 1; S.events.push({ type: "tip", title: "集火", text: `全队够得着就优先打「${e.d.name}」，它受到的伤害 +15%。再点它一下取消。` }); }
  return true;
}
function enemyAt(p, rad) {
  let best = null, bd = rad;
  for (const e of S.enemies) { if (!hittable(e)) continue; const d = Math.hypot(e.x - p.x, e.y - (e.d.flying ? 0.3 : 0) - p.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function pickTargets(u) {
  const D = u.def, R = uRange(u);
  if (D.dmg === "heal") {
    const hurtAllies = S.units.filter(a => alive(a) && a.hp < a.maxHp && dist(u, a) <= R).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    return hurtAllies.slice(0, (br(u, "priest", "A") ? 3 : u.lv >= 3 ? 2 : 1) + (u.hero ? sg("sg_pr1") : 0));
  }
  const pool = S.enemies.filter(e => hittable(e) && e.revealed && (D.air || D.place === "ground" || !e.d.flying) && dist(u, e) <= R);
  // 集火：玩家点过的敌人只要够得着就先打它
  const fo = focusFoe(), first = (a, b) => (b === fo) - (a === fo);
  // 飞行敌人贴到晨星碑上啃的时候会降下来，近战也能打到
  if (D.place === "ground") { const g = pool.filter(e => canMelee(e)); if (!g.length) return []; g.sort((a, b) => first(a, b) || toCrystal(a) - toCrystal(b)); return g.slice(0, 1); }
  if (br(u, "archer", "B")) return pool.sort((a, b) => first(a, b) || b.hp - a.hp).slice(0, 1);
  pool.sort((a, b) => first(a, b) || toCrystal(a) - toCrystal(b));
  return pool.slice(0, (D.id === "archer" ? (br(u, "archer", "A") ? 4 : u.lv >= 3 ? 2 : 1) : 1) + (u.hero ? sg("sg_ar1") : 0));
}
function strike(u, targets) {
  const D = u.def, R = uRange(u);
  targets = targets.filter(t => hittable(t));
  if (D.dmg === "heal") { for (const t of targets) shoot(u, t, "priest", uAtk(u)); return; }
  if (br(u, "bard", "B")) {
    const all = S.enemies.filter(e => hittable(e) && dist(u, e) <= R);
    for (const e of all) hurt(e, calc(uAtk(u), "magic", eDef(e), eRes(e)), "magic", false, u);
    addFx({ kind: "wave", x: u.x, y: u.y, r: R, color: D.color, life: 0.45 });
    return;
  }
  if (D.place !== "ground") { for (const t of targets) shoot(u, t, D.id, uAtk(u)); return; }
  // 近战被围住时会横扫：默认最多扫到 3 个，剑士开技能／枪骑士扫全部
  let list = targets;
  const sweep = R + (u.hero ? 0.2 * sg("sg_sw1") : 0);
  const near = S.enemies.filter(e => hittable(e) && canMelee(e) && dist(u, e) <= sweep);
  near.sort((a, b) => toCrystal(a) - toCrystal(b));
  list = (skillOn(u, "sword") || D.id === "lancer" || (u.hero && sg("sg_la2"))) ? near : near.slice(0, 3 + (u.hero ? sg("sg_sw1") : 0));
  if (!list.length) list = targets;
  if (br(u, "marshal", "B") && list[0]) list = [...new Set([...list, ...S.enemies.filter(e => hittable(e) && !e.d.flying && dist(e, list[0]) <= 1.1)])];
  if (br(u, "knight", "B") && list[0]) list = [...new Set([...list, ...S.enemies.filter(e => hittable(e) && !e.d.flying && dist(e, list[0]) <= 1)])];
  let dealt = 0;
  const hits = br(u, "assassin", "A") ? 2 : 1;
  for (const t of list) for (let h = 0; h < hits; h++) {
    if (t.dead) break;
    const critB = u.hero ? 0.15 * sg("sg_as1") : 0;
    const crit = (D.id === "assassin" && (u.skillT > 0 || (u.lv >= 3 && roll("fight") < 0.3 + critB))) || (br(u, "sword", "A") && roll("fight") < 0.2 + critB) || (critB && roll("fight") < critB);
    const mult = crit ? (D.id === "assassin" ? 2.2 : 2) * (u.hero ? 1 + 0.2 * sg("sg_as1") : 1) : 1;
    dealt += hurt(t, calc(uAtk(u) * mult, "phys", eDef(t), eRes(t)), "phys", crit, u);
    if (br(u, "assassin", "B")) t.poison = { dps: uAtk(u) * 0.4, t: 4, acc: 0, src: u };
    if (D.id === "lancer" && u.lv >= 3 && !t.dead && roll("fight") < 0.25) knock(t, 0.5);
    if (u.hero && sg("sg_la1") && !t.dead) knock(t, 0.4);
    if (u.hero && sg("sg_me2") && !t.dead) burnEnemy(t, uAtk(u) * 0.35, 4, u);
    addFx({ kind: D.id === "lancer" ? "thrust" : "slash", x: t.x, y: t.y, color: crit ? "#ffe040" : D.color, face: u.face, life: 0.22, big: crit || h > 0 });
    t.stop = crit ? 0.14 : 0.09;
  }
  if (list.length) u.stop = 0.07;
  if (D.id === "sword" && u.lv >= 3 && dealt > 0) heal(u, dealt * (br(u, "sword", "B") ? 0.5 : 0.2), false, u);
}

// ---------- 角色技能 ----------
function densest(u, R) {
  const pool = S.enemies.filter(e => hittable(e) && !e.d.flying && dist(u, e) <= R);
  let best = null, bestN = 0;
  for (const e of pool) { const n = pool.filter(o => dist(o, e) <= 1.2).length + (e.elite || isBoss(e) ? 1 : 0); if (n > bestN) { bestN = n; best = e; } }
  return best ? [best.x, best.y] : null;
}
function golemSpot(u) {
  const foes = S.enemies.filter(e => hittable(e) && !e.d.flying);
  let a = roll("fight") * 6.283;
  if (foes.length) { const t = foes.sort((p, q) => toCrystal(p) - toCrystal(q))[0]; a = Math.atan2(t.y - CRYSTAL.y, t.x - CRYSTAL.x); }
  for (let k = 0; k < 10; k++) {
    const r = RULES.ringFront + 0.9, x = CRYSTAL.x + Math.cos(a + k * 0.3) * r, y = CRYSTAL.y + Math.sin(a + k * 0.3) * r;
    if (!solid(x, y) && x > 0.8 && x < COLS - 1.8 && y > 0.8 && y < ROWS - 1.8) return [x, y];
  }
  return null;
}
function golemCap(u) { return u.hero && sg("sg_su2") ? 3 : 1; }
function summonGolem(u) {
  const at = golemSpot(u); if (!at) return false;
  const mine = S.units.filter(x => x.summon && x.owner === u && !x.dead);
  if (mine.length >= golemCap(u)) knockOut(mine[0]);
  const g = {
    id: S.uid++, def: GOLEM_S, summon: true, owner: u, x: at[0], y: at[1], tx: at[0], ty: at[1], lv: 1, branch: null,
    hp: 1, maxHp: 1, sp: 0, skillT: 0, atkCd: 0.4, atkT: 9, hitT: 0, age: 0, down: 0, dead: false, face: 1, kb: 0, stop: 0, pend: null, poison: null, auto: false,
    sumHp: lvK(u, "hp") * clvK(u) * (br(u, "summoner", "A") ? 1.6 : 1),
    sumAtk: lvK(u, "atk") * clvK(u) * (br(u, "summoner", "A") ? 1.5 : 1),
    life: 25 + (u.lv >= 3 ? 10 : 0),
  };
  g.maxLife = g.life; g.maxHp = uMaxHp(g); g.hp = g.maxHp;
  S.units.push(g);
  addFx({ kind: "pillar", x: g.x, y: g.y, color: "#7af0e0", life: 0.8 });
  addFx({ kind: "ring", x: g.x, y: g.y, color: "#b8845a", life: 0.6, r0: 0.2, r1: 1.2 });
  burst(g.x, g.y + 0.2, "#b8a890", 20, 2.2, 0.7, 0.07);
  addFx({ kind: "text", x: g.x, y: g.y - 0.7, text: "咚咚！", color: "#7af0e0", life: 1.1, big: true });
  S.shake = Math.max(S.shake, 0.15);
  if (hasTal(u, "summoner")) for (const e of S.enemies) if (hittable(e) && !e.d.unstoppable && dist(e, g) <= 1.4) e.stunT = Math.max(e.stunT, 2);
  return true;
}
function canCast(u) {
  if (u.def.id === "summoner") return !!golemSpot(u);
  if (u.def.id === "alchemist") return !!densest(u, uRange(u));
  return true;
}
function useSkill(u) {
  if (S.over || u.dead || u.down > 0 || u.summon || u.skillT > 0 || u.sp < u.def.sp || !canCast(u)) return;
  const D = u.def, R = uRange(u);
  if (D.id === "summoner" && !summonGolem(u)) return;
  u.sp = 0;
  if (D.skill.dur) u.skillT = (D.skill.dur + (br(u, "sword", "B") ? 6 : 0) + (br(u, "bard", "A") ? 6 : 0)) * (tal(u, "t_focus") ? 1.3 : 1);
  const ground = () => S.enemies.filter(e => hittable(e) && !e.d.flying && dist(u, e) <= R);
  if (D.id === "knight") heal(u, u.maxHp * 0.3, false, u);
  if (D.id === "mage") { for (const e of S.enemies) if (hittable(e) && dist(u, e) <= R) hurt(e, calc(uAtk(u) * 3, "magic", eDef(e), eRes(e)), "magic", false, u); S.shake = 0.3; if (hasTal(u, "mage")) u.sp = D.sp * 0.4; }
  if (D.id === "priest") for (const a of S.units) if (alive(a) && dist(u, a) <= R) heal(a, uAtk(u) * 2.5, false, u);
  if (D.id === "frost") for (const e of ground()) { e.freezeT = hasTal(u, "frost") ? 3.5 : 3; e.slowT = 0; }
  if (D.id === "lancer") {
    for (const e of ground()) {
      hurt(e, calc(uAtk(u) * 2.5, "phys", eDef(e), eRes(e)), "phys", true, u);
      knock(e, 1); if (!e.d.unstoppable) e.stunT = Math.max(e.stunT, 0.6);
      addFx({ kind: "slash", x: e.x, y: e.y, color: D.color, face: u.face, life: 0.25, big: true });
    }
    u.stop = 0.12; S.shake = Math.max(S.shake, 0.2);
  }
  if (D.id === "mech") { heal(u, u.maxHp * 0.15, false, u); for (const e of ground()) burnEnemy(e, uAtk(u) * 0.4, 6, u); }
  if (D.id === "star") {
    const hits = [];
    const pool = S.enemies.filter(hittable);
    for (let k = 0; k < 3 && pool.length; k++) {
      let best = pool[0], bn = -1;
      for (const e of pool) { const n = pool.filter(o => dist(o, e) <= 1.6 && !hits.some(h => dist(o, { x: h[0], y: h[1] }) <= 1.2)).length + (isBoss(e) ? 3 : e.elite ? 1 : 0); if (n > bn) { bn = n; best = e; } }
      hits.push([best.x, best.y]);
      const i = pool.indexOf(best); if (i >= 0) pool.splice(i, 1);
    }
    for (const [hx, hy] of hits) S.meteors.push({ x: hx, y: hy, t: 0.5, dmg: uAtk(u) * 2.4, r: uSplash(u) + 0.7, src: u, color: "#a0b8ff" });
    for (const [hx, hy] of hits) addFx({ kind: "meteor", x: hx, y: hy, life: 0.5, color: "#a0b8ff" });
    S.shake = 0.35;
  }
  if (D.id === "chrono") {
    const big = br(u, "chrono", "B"), R2 = R * (big ? 2 : 1), ft = hasTal(u, "chrono") ? 4.2 : 3.5;
    for (const e of S.enemies) if (hittable(e) && dist(u, e) <= R2) {
      if (!e.d.unstoppable) e.freezeT = Math.max(e.freezeT, ft);
      e.mark = Math.max(e.mark || 0, ft + 1);
      if (big) hurt(e, calc(uAtk(u) * 3, "magic", eDef(e), eRes(e)), "magic", true, u);
    }
    addFx({ kind: "ring", x: u.x, y: u.y, color: "#7ae0d0", life: 0.9, r0: 0.3, r1: R2 });
    addFx({ kind: "wave", x: u.x, y: u.y, r: R2, color: "#7ae0d0", life: 0.5 });
    S.shake = Math.max(S.shake, 0.25);
  }
  if (D.id === "marshal") {
    for (const a of [...S.units]) {
      if (a.dead || a.summon) continue;
      if (a.down > 0) { a.down = 0; reviveUnit(a); addFx({ kind: "pillar", x: a.x, y: a.y, color: "#ffe060", life: 0.8 }); }
      else heal(a, a.maxHp * 0.25, false, u);
      a.blessT = Math.max(a.blessT || 0, hasTal(u, "marshal") ? 12 : 10);
    }
    addFx({ kind: "wave", x: u.x, y: u.y, r: 6, color: "#ffe060", life: 0.6 });
    S.shake = Math.max(S.shake, 0.3);
  }
  if (D.id === "alchemist") {
    const at = densest(u, R), big = br(u, "alchemist", "A");
    if (at) {
      S.pools.push({ x: at[0], y: at[1], r: big ? 1.7 : 1.2, t: big ? 12 : 8, life: big ? 12 : 8, src: u, acc: 0, k: Math.max(0.5, corrodeOf(u)) });
      addFx({ kind: "boom", x: at[0], y: at[1], r: big ? 1.7 : 1.2, color: "#a8d848", life: 0.5 });
      burst(at[0], at[1], "#c8f070", 22, 2.6, 0.7, 0.07);
    }
  }
  addFx({ kind: "ring", x: u.x, y: u.y, color: D.color, life: 0.6, r0: 0.3, r1: R });
  addFx({ kind: "ring", x: u.x, y: u.y, color: "#ffffff", life: 0.4, r0: 0.2, r1: R * 0.6 });
  addFx({ kind: "pillar", x: u.x, y: u.y, color: D.color, life: 0.7 });
  addFx({ kind: "cast", x: u.x, y: u.y, color: D.color, life: 0.9 });
  burst(u.x, u.y, D.color, 24, 2.8, 0.8, 0.07);
  // 技能特写：屏幕一侧斜着滑进一条带头像和技能名的横幅（同一时间只留最新的一条）
  S.fx = S.fx.filter(f => f.kind !== "skillcut");
  addFx({ kind: "skillcut", id: D.id, lv: u.lv, branch: u.branch, name: D.name, skill: D.skill.name, color: D.color, hero: !!u.hero, life: 1.1 });
  if (u.hero) addFx({ kind: "flash", life: 0.18, color: D.color });
}
function autoWant(u) {
  const D = u.def, R = uRange(u), big = e => e.elite || isBoss(e);
  const near = S.enemies.filter(e => hittable(e) && e.revealed && (D.air || !e.d.flying) && dist(u, e) <= R);
  const eng = S.enemies.filter(e => e.target === u && !e.dead);
  switch (D.id) {
    case "knight": return eng.length > 0 && (u.hp < u.maxHp * 0.75 || eng.some(big) || eng.length >= 2);
    case "sword": case "assassin": case "lancer": return near.length >= 2 || near.some(big) || (eng.length > 0 && u.hp < u.maxHp * 0.6);
    case "archer": case "gunner": return near.length >= 2 || near.some(e => big(e) || e.d.flying);
    case "mage": case "frost": return near.length >= 3 || near.some(big);
    case "alchemist": return near.filter(e => !e.d.flying).length >= 3 || near.some(e => big(e) && !e.d.flying);
    case "priest": return S.units.some(a => alive(a) && dist(u, a) <= R && a.hp < a.maxHp * 0.6);
    case "bard": return S.units.filter(a => a !== u && alive(a) && dist(u, a) <= R).length >= 1 && near.length > 0;
    case "summoner": return S.units.filter(x => x.summon && x.owner === u && !x.dead).length < golemCap(u) && S.enemies.some(e => hittable(e) && !e.d.flying && toCrystal(e) <= RULES.ringFront + 2.5);
    case "mech": return eng.length > 0 || near.length >= 2 || near.some(big);
    case "star": return near.length >= 3 || near.some(big) || S.enemies.filter(hittable).length >= 5;
    case "chrono": return near.length >= 3 || near.some(big) || near.some(e => toCrystal(e) <= CRYSTAL.r + 1.2);
    case "marshal": return S.units.some(a => !a.summon && a.down > 0) || eng.length >= 2 || S.units.some(a => alive(a) && a.hp < a.maxHp * 0.45);
  }
  return near.length > 0;
}

// ---------- 主动法术 ----------
function castSpell(id, x, y) {
  const sp = SPELLS.find(s => s.id === id);
  if (!sp || S.over || S.spells[id] > 0 || S.mod === "noSpell") return false;
  S.spells[id] = sp.cd * (1 - 0.05 * dk("arcane")) * (ab(17) ? 1.3 : 1); S.usedSpell = true;
  if (id === "meteor") { S.meteors.push({ x, y, t: 0.6 }); addFx({ kind: "meteor", x, y, life: 0.6 }); }
  if (id === "heal") for (const u of S.units) {
    if (u.down > 0) reviveUnit(u); else heal(u, u.maxHp * 0.4, false, { key: "heal" });
    addFx({ kind: "pillar", x: u.x, y: u.y, color: "#ffe080", life: 0.7 });
  }
  return true;
}

// ---------- 晨星爆发 / 连杀 ----------
const ultReady = () => S.star >= ULT.max && !S.over && S.ultPending <= 0;
function gainStar(e) {
  const g = (isBoss(e) ? ULT.boss : e.elite ? ULT.elite : ULT.kill) * (S.ultK || 1) * (1 + 0.4 * cl("resonance")) * (syn("legendary") ? 1.3 : 1) * (S.combo >= 10 ? 1.25 : 1) * (1 + 0.06 * dk("ult")) * (rl("rl_twin") ? 1.4 : 1);
  S.star = Math.min(ULT.max, S.star + g);
}
function castUlt() {
  if (!ultReady()) return false;
  S.star = 0; S.ultPending = 0.45; S.ultKills = S.kills; S.usedUlt = true;
  if (dk("ks_arc")) S.resoT = 10;
  S.slowmo = Math.max(S.slowmo, 0.9); S.shake = Math.max(S.shake, 0.4);
  const ids = S.units.filter(u => !u.summon).sort((a, b) => b.lv - a.lv).slice(0, 4).map(u => u.def.id);
  addFx({ kind: "cutin", ids, life: 1.5 });
  for (const u of S.units) addFx({ kind: "pillar", x: u.x, y: u.y, color: "#fff0a0", life: 0.8 });
  return true;
}
function ultHit() {
  const flat = 1500 * powerK() * (rl("rl_lodestone") ? 1.5 : 1);
  addFx({ kind: "flash", life: 0.45 });
  for (const e of [...S.enemies]) {
    if (e.dead) continue;
    const dmg = (isBoss(e) ? e.maxHp * ULT.bossHit : Math.max(e.maxHp * 0.3, flat)) * (rl("rl_lodestone") && isBoss(e) ? 1.5 : 1);
    addFx({ kind: "pillar", x: e.x, y: e.y, color: "#fff0a0", life: 0.6 });
    hurt(e, dmg, "true", true, { key: "ult" });
    if (!e.dead && !e.d.unstoppable) e.stunT = Math.max(e.stunT, ULT.stun);
  }
  for (const u of S.units) { if (u.down > 0) reviveUnit(u); else heal(u, u.maxHp * 0.3, true, { key: "ult" }); if (!u.summon && u.skillT <= 0) u.sp = Math.min(u.def.sp, u.sp + u.def.sp * 0.5); }
  S.shake = 0.8;
  if (S.kills - S.ultKills >= 10) S.events.push({ type: "achv", id: "ult" });
}
function addCombo() {
  S.combo = S.comboT > 0 ? S.combo + 1 : 1; S.comboT = COMBO.window; S.comboBest = Math.max(S.comboBest, S.combo);
  const mi = COMBO.marks.indexOf(S.combo);
  if (mi >= 0) { const g = COMBO.xp[mi]; gainXp(g); addFx({ kind: "combo", n: S.combo, dp: g, life: 1.4 }); }
  if (S.combo === 50) S.events.push({ type: "achv", id: "combo50" });
}

// ---------- 卡牌自动技能 ----------
function buildBlades() {
  const n = 1 + cl("sk_blade") + (evo("sk_blade") ? 2 : 0);
  S.blades = Array.from({ length: n }, (_, i) => ({ a: (i / n) * 6.283 }));
}
const twinCd = () => (cl("lg_twin") ? 0.6 : 1) * Math.max(0.3, 1 - 0.35 * cu("cu_sand")) * (S.buff.cd || 1);
const twinDmg = () => (cl("lg_twin") ? 1.35 : 1);
function autoSkills(dt) {
  if (S.resoT > 0) S.resoT -= dt;
  if (sg("sg_st2")) {
    S.sigStar = (S.sigStar || 4) - dt;
    if (S.sigStar <= 0) { S.sigStar = 14; const h = heroOf(); if (h) { const pool = S.enemies.filter(hittable); for (let k = 0; k < 3 && pool.length; k++) { let best = pool[0], bn = -1; for (const e of pool) { const n = pool.filter(o => dist(o, e) <= 1.6).length; if (n > bn) { bn = n; best = e; } } S.meteors.push({ x: best.x, y: best.y, t: 0.5, dmg: uAtk(h) * 2.2, r: uSplash(h) + 0.8, src: h, color: "#a0b8ff" }); addFx({ kind: "meteor", x: best.x, y: best.y, life: 0.5, color: "#a0b8ff" }); const i2 = pool.indexOf(best); if (i2 >= 0) pool.splice(i2, 1); } } }
  }
  for (const id of ["sk_meteor", "sk_chain", "sk_nova", "sk_fire", "sk_holy", "lg_time"]) {
    const lv = cl(id); if (!lv) continue;
    if (S.skillCd[id] == null) S.skillCd[id] = SKILL_CD[id](lv) * twinCd() * 0.4;
    S.skillCd[id] -= dt * (S.resoT > 0 ? 1.5 : 1);
    if (S.skillCd[id] <= 0) { S.skillCd[id] = SKILL_CD[id](lv) * twinCd(); autoCast(id, lv); }
  }
  const spike = cl("sk_spike");
  if (spike) {
    S.spikeCd = (S.spikeCd || 0) - dt;
    if (S.spikeCd <= 0) {
      S.spikeCd = 0.5;
      const ev = evo("sk_spike"), dmg = SKILL_DMG.sk_spike * spike * powerK() * twinDmg() * (ev ? 1.4 : 1), far = ev ? 1.9 : 0.9;
      let any = false;
      for (const e of S.enemies) if (!e.dead && !e.d.flying) { const d = toCrystal(e); if (d >= RULES.ringFront - 0.5 && d <= RULES.ringFront + far) { any = true; hurt(e, calc(dmg, "phys", eDef(e) * 0.5, eRes(e)), "phys", false, { key: "sk_spike" }); if (ev && !e.d.unstoppable) { e.slowT = Math.max(e.slowT, 0.8); e.slowK = Math.min(e.slowK || 1, 0.6); } if (e.under) S.events.push({ type: "achv", id: "trapworm" }); } }
      if (any) S.spikeFire = 0.25;
    }
    S.spikeFire = Math.max(0, (S.spikeFire || 0) - dt);
  }
  const bl = cl("sk_blade");
  if (bl) {
    if (!S.blades.length) buildBlades();
    const ev = evo("sk_blade"), dmg = SKILL_DMG.sk_blade * bl * powerK() * twinDmg() * (ev ? 1.3 : 1);
    S.bladeT = (S.bladeT || 0) + dt;
    S.blades.forEach((b, i) => {
      b.a += dt * (ev ? 2.4 : 1.9);
      const rad = ev ? 2.3 + Math.sin(S.bladeT * 1.3 + i * 1.7) * 0.9 : 2.0;   // 进化后轨道忽远忽近
      const x = CRYSTAL.x + Math.cos(b.a) * rad, y = CRYSTAL.y + Math.sin(b.a) * rad;
      b.x = x; b.y = y;
      for (const e of S.enemies) if (hittable(e) && e.hitCd <= 0 && distTo(e, x, y) <= (ev ? 0.65 : 0.55)) {
        e.hitCd = ev ? 0.3 : 0.5;
        hurt(e, calc(dmg, "phys", eDef(e), eRes(e)), "phys", false, { key: "sk_blade" });
        addFx({ kind: "slash", x: e.x, y: e.y, color: ev ? "#ffe080" : "#dfe6f2", face: 1, life: 0.2 });
      }
    });
  }
}
function autoCast(id, lv) {
  const P = powerK() * twinDmg();
  if (id === "lg_time") {
    const dur = 1.6 + lv * 0.4;
    let n = 0;
    for (const e of S.enemies) if (hittable(e) && !e.d.unstoppable) { e.stunT = Math.max(e.stunT, dur); n++; }
    addFx({ kind: "flash", life: 0.4, color: "#c8d8ff" });
    addFx({ kind: "banner", text: "时间停滞", life: 1.4 });
    addFx({ kind: "ring", x: CRYSTAL.x, y: CRYSTAL.y, color: "#c8d8ff", life: 0.9, r0: 0.5, r1: 9 });
    S.slowmo = Math.max(S.slowmo, 0.4);
    if (!n) S.skillCd[id] = 1.5;
    return;
  }
  if (id === "sk_meteor") {
    const pool = S.enemies.filter(hittable);
    if (!pool.length) { S.skillCd[id] = 0.6; return; }
    const ev = evo("sk_meteor"), dmg = SKILL_DMG.sk_meteor * lv * P;
    for (let k = 0; k < (ev ? 3 : 1) && pool.length; k++) {   // 进化：3 颗，各砸一处敌群
      let best = pool[0], bestN = -1;
      for (const e of pool) { const n = pool.filter(o => dist(o, e) <= 1.5).length + (isBoss(e) ? 3 : e.elite ? 1 : 0); if (n > bestN) { bestN = n; best = e; } }
      S.meteors.push({ x: best.x, y: best.y, t: 0.55 + k * 0.18, dmg, r: ev ? 1.95 : 1.5, burn: ev ? dmg * 0.08 : 0, color: ev ? "#ff5a2a" : null });
      addFx({ kind: "meteor", x: best.x, y: best.y, life: 0.55 + k * 0.18, color: ev ? "#ff5a2a" : undefined });
      for (let i = pool.length - 1; i >= 0; i--) if (dist(pool[i], best) <= 1.8) pool.splice(i, 1);
    }
  } else if (id === "sk_chain") {
    const start = S.enemies.filter(hittable).sort((a, b) => toCrystal(a) - toCrystal(b))[0];
    if (!start) { S.skillCd[id] = 0.6; return; }
    const ev = evo("sk_chain");
    let cur = start, dmg = SKILL_DMG.sk_chain * lv * P; const hit = new Set();
    for (let j = 0; j < (2 + lv) * (ev ? 2 : 1) && cur; j++) {
      hit.add(cur);
      hurt(cur, calc(dmg, "magic", eDef(cur), eRes(cur)), "magic", false, { key: "sk_chain" });
      if (ev && !cur.d.unstoppable) cur.stunT = Math.max(cur.stunT || 0, 0.4);
      const next = S.enemies.filter(e => hittable(e) && !hit.has(e) && dist(e, cur) <= (ev ? 3 : 2.4)).sort((a, b) => dist(a, cur) - dist(b, cur))[0];
      if (next) addFx({ kind: "bolt", x: cur.x, y: cur.y, x2: next.x, y2: next.y, life: ev ? 0.4 : 0.3, color: ev ? "#ffe860" : undefined });
      cur = next; if (!ev) dmg *= 0.88;
    }
  } else if (id === "sk_nova") {
    const ev = evo("sk_nova"), R = ev ? 5 : 3.2, dmg = SKILL_DMG.sk_nova * lv * P * (ev ? 1.3 : 1);
    addFx({ kind: "ring", x: CRYSTAL.x, y: CRYSTAL.y, color: "#8fe0f0", life: ev ? 0.9 : 0.6, r0: 0.4, r1: R, fill: true });
    if (ev) { addFx({ kind: "flash", life: 0.3, color: "#dff8ff" }); burst(CRYSTAL.x, CRYSTAL.y, "#dff8ff", 40, 5, 0.9, 0.06); }
    for (const e of S.enemies) if (hittable(e) && toCrystal(e) <= R) {
      hurt(e, calc(dmg, "magic", eDef(e), eRes(e)), "magic", false, { key: "sk_nova" });
      if (!e.d.unstoppable) { e.freezeT = Math.max(e.freezeT, ev ? 2 : 1); e.slowT = Math.max(e.slowT, ev ? 4 : 2); e.slowK = 0.5; }
    }
  } else if (id === "sk_fire") {
    const ev = evo("sk_fire"), R = ev ? 5 : 3.4, dmg = SKILL_DMG.sk_fire * lv * P;
    addFx({ kind: "ring", x: CRYSTAL.x, y: CRYSTAL.y, color: ev ? "#ff4a1a" : "#ff8a3a", life: ev ? 0.8 : 0.6, r0: 0.4, r1: R, fill: true });
    burst(CRYSTAL.x, CRYSTAL.y, "#ffb040", ev ? 50 : 26, ev ? 5 : 3, 0.7, 0.08);
    for (const e of S.enemies) if (hittable(e) && toCrystal(e) <= R) {
      hurt(e, calc(dmg, "magic", eDef(e), eRes(e)), "magic", false, { key: "sk_fire" });
      burnEnemy(e, dmg * (ev ? 0.4 : 0.25), ev ? 5 : 3.5, { key: "sk_fire" });
    }
  } else if (id === "sk_holy") {
    const R = 4, dmg = SKILL_DMG.sk_holy * lv * P;
    addFx({ kind: "ring", x: CRYSTAL.x, y: CRYSTAL.y, color: "#ffe080", life: 0.7, r0: 0.3, r1: R, fill: true });
    const ev = evo("sk_holy");
    for (const u of S.units) heal(u, u.maxHp * (0.12 + 0.04 * lv) * (ev ? 1.3 : 1), false, { key: "sk_holy" });
    if (ev) for (let i = 0; i < 6; i++) addFx({ kind: "pillar", x: CRYSTAL.x + Math.cos(i * 1.047) * 2.4, y: CRYSTAL.y + Math.sin(i * 1.047) * 2.4, color: "#ffe080", life: 0.7 });
    for (const e of S.enemies) if (hittable(e) && toCrystal(e) <= R) {
      const undead = ["skeleton", "ghost", "necro", "imp"].includes(e.type);
      if (undead || ev) hurt(e, calc(dmg * (undead ? (ev ? 3 : 1.5) : 1), "magic", eDef(e), eRes(e)), "magic", false, { key: "sk_holy" });
    }
  }
}
