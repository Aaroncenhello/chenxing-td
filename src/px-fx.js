
// ---------- 像素数字（3×5，放大 2 倍画） ----------
const GLYPH = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111", "+": "000010111010000" };
function pixNum(g, str, x, y, col, k) {
  k = k || 2; const w = str.length * 4 * k - k; x = R0(x - w / 2); y = R0(y);
  for (const [dx, dy, c] of [[-1, 0, OUT], [1, 0, OUT], [0, -1, OUT], [0, 1, OUT], [1, 1, OUT], [0, 0, col]]) {
    g.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const bits = GLYPH[str[i]]; if (!bits) continue;
      for (let p = 0; p < 15; p++) if (bits[p] === "1") g.fillRect(x + (i * 4 + (p % 3)) * k + dx, y + Math.floor(p / 3) * k + dy, k, k);
    }
  }
}
const unitFeet = u => [R0(u.x * T + 20), R0(u.y * T + 30)];
const foeFeet = e => [R0(e.x * T + 20), R0(e.y * T + 30)];
const tpx = (x, y) => [R0(x * T + 20), R0(y * T + 18)];
// 10.0：固定站位的小旗子 + 拖动时的落点预览
function drawStations(t) {
  for (const u of S.units) {
    if (!u.slot || u.dead || u.summon || (S.drag && S.drag.u === u && S.drag.moved)) continue;
    const [x, y] = tpx(u.tx, u.ty);
    rect(ctx, x - 1, y + 9, 1, 5, OUT);
    rect(ctx, x, y + 9, 4, 3, u.def.color);
    rect(ctx, x - 1, y + 14, 3, 1, OUT);
  }
  const d = S.drag;
  if (!d || !d.moved) return;
  const dx = d.x - CRYSTAL.x, dy = d.y - CRYSTAL.y;
  const r = Math.max(1.1, Math.min(4.3, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const gx = CRYSTAL.x + Math.cos(a) * r, gy = CRYSTAL.y + Math.sin(a) * r;
  const [cx, cy] = tpx(CRYSTAL.x, CRYSTAL.y), [x, y] = tpx(gx, gy);
  ctx.globalAlpha = 0.4; ring(ctx, cx, cy + 10, r * T, r * T, "#e9dcc0", 1); ctx.globalAlpha = 1;
  const ok = !solid(gx, gy), col = ok ? d.u.def.color : "#ff5a5a";
  ctx.globalAlpha = 0.3; disc(ctx, x, y + 11, 9, col); ctx.globalAlpha = 1;
  ring(ctx, x, y + 11, 10, 7, col, (t * 8 | 0) % 2);
  line(ctx, x - 6, y + 11, x + 6, y + 11, "#f4ecd8");
  line(ctx, x, y + 6, x, y + 16, "#f4ecd8");
}
function shadow(x, y, w) { ctx.fillStyle = "rgba(0,0,0,.33)"; ctx.fillRect(R0(x - w / 2), R0(y - 1), R0(w), 2); ctx.fillRect(R0(x - w / 2 + 2), R0(y + 1), R0(w - 4), 1); }
function bar(x, y, w, frac, col, sub, subCol, gold) {
  rect(ctx, x - w / 2 - 1, y - 1, w + 2, sub == null ? 4 : 6, gold ? "#ffc830" : OUT);
  rect(ctx, x - w / 2, y, w, 2, "#3a2a2a"); rect(ctx, x - w / 2, y, Math.max(0, R0(w * frac)), 2, col);
  rect(ctx, x - w / 2, y, Math.max(0, R0(w * frac)), 1, "rgba(255,255,255,.35)");
  if (sub != null) { rect(ctx, x - w / 2, y + 2, w, 2, "#1c2a3a"); rect(ctx, x - w / 2, y + 2, Math.max(0, R0(w * sub)), 2, subCol); }
}

// ---------- 角色 ----------
function drawUnit(u, now) {
  const D = u.def, [fx, fy] = unitFeet(u), t = now / 1000, pop = Math.min(1, u.age / 0.25);
  if (u.down > 0) { // 倒下：躺在地上，显示复活倒计时
    const big = renderHero(D, { phase: "idle", face: u.face, lv: u.lv, branch: u.branch, t: 0 });
    ctx.globalAlpha = 0.5;
    ctx.save(); ctx.translate(fx, fy - 2); ctx.rotate(-(u.face || 1) * Math.PI / 2); ctx.drawImage(big, -HOX * 2, -80); ctx.restore();
    ctx.globalAlpha = 1;
    pixNum(ctx, String(Math.ceil(u.down)), fx, fy - 14, "#e2645a", 2);
    return;
  }
  shadow(fx, fy, 22);
  if (u.skillT > 0) {
    ring(ctx, fx, fy, 17, 6, D.color, (t * 10 | 0) % 2); ring(ctx, fx, fy, 13, 4, "#ffffff", true);
    for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i / 6) % 1; rect(ctx, fx - 14 + i * 5, fy - k * 50, 2, 2, k < 0.7 ? D.color : "#ffffff"); }
  }
  if (u.summon) {
    const ph = u.atkT < 0.13 ? "wind" : u.atkT < 0.3 ? "strike" : "idle", blink = u.life < 3 && (t * 6 | 0) % 2;
    const big = renderHero(D, { phase: ph, bob: ph === "idle" ? Math.floor(now / 500 + u.id) % 2 : 0, flash: u.hitT > 0.05, face: u.face, t });
    if (blink) ctx.globalAlpha = 0.5;
    ctx.drawImage(big, fx - HOX * 2 - R0(u.kb * 2) * u.face, fy - 80); ctx.globalAlpha = 1;
    bar(fx, fy + 4, 26, u.hp / u.maxHp, "#6ee07a", u.life / u.maxLife, "#b8845a");
    return;
  }
  if (D.dmg !== "heal" && auraOn(u) && (t * 3 | 0) % 2) { dot(ctx, fx - 10, fy - 30, "#ffd860"); dot(ctx, fx + 10, fy - 36, "#ffd860"); }
  if (u.lv >= 4) { const c = u.branch === "A" ? "#8ac8ff" : "#ff8a7a"; for (let i = 0; i < 4; i++) { const k = (t * 0.9 + i / 4) % 1; rect(ctx, fx - 14 + i * 9 + Math.sin(t * 3 + i) * 2, fy - 4 - k * 48, 2, 2, k < 0.6 ? c : "#ffffff"); } }
  else if (u.lv >= 3) for (let i = 0; i < 3; i++) { const k = (t * 0.7 + i / 3) % 1; dot(ctx, fx - 12 + i * 12 + Math.sin(t * 3 + i) * 2, fy - 6 - k * 40, k < 0.6 ? "#ffd860" : "#fff6c0"); }
  let ph = heroPhase(D, u.atkT); if (ph === "idle" && u.hitT > 0.05) ph = "hurt";
  const bob = ph === "idle" ? Math.floor(now / 420 + u.id * 0.5) % 2 : ph === "hurt" ? 1 : 0;
  const big = renderHero(D, { phase: ph, bob, flash: u.hitT > 0.05, face: u.face, skill: u.skillT > 0, lv: u.lv, branch: u.branch, t });
  const kb = -R0(u.kb * 2) * u.face, drop = R0((1 - pop) * 30);
  ctx.drawImage(big, fx - HOX * 2 + kb, fy - 80 - drop);
  if (u.frozenT > 0) {
    ctx.fillStyle = "rgba(170,230,255,.45)"; ctx.fillRect(fx - 12, fy - 40, 24, 41);
    rect(ctx, fx - 12, fy - 40, 24, 1, "#e8fbff"); rect(ctx, fx - 12, fy - 40, 1, 41, "#e8fbff");
  }
  const sp = u.skillT > 0 ? u.skillT / (D.skill.dur || 1) : u.sp / D.sp, ready = u.skillT <= 0 && u.sp >= D.sp;
  bar(fx, fy + 4, 26, u.hp / u.maxHp, "#6ee07a", sp, u.skillT > 0 ? D.color : ready ? "#ffd860" : "#58a8ff", u.hero);
  if (u.hero) { rect(ctx, fx - 3, fy + 10, 7, 5, OUT); rect(ctx, fx - 2, fy + 11, 5, 3, "#ffd860"); dot(ctx, fx - 2, fy + 10, "#ffd860"); dot(ctx, fx, fy + 10, "#ffd860"); dot(ctx, fx + 2, fy + 10, "#ffd860"); }
  if (u.lv >= 4) { const x = fx - 21, y = fy + 1, c = u.branch === "A" ? "#8ac8ff" : "#ff8a7a"; rect(ctx, x - 3, y, 7, 6, OUT); rect(ctx, x - 2, y + 2, 5, 3, c); dot(ctx, x - 2, y + 1, c); dot(ctx, x, y + 1, c); dot(ctx, x + 2, y + 1, c); }
  else for (let i = 1; i < u.lv; i++) { const x = fx - 20, y = fy + 9 - i * 4; rect(ctx, x - 2, y, 5, 3, OUT); line(ctx, x - 1, y + 2, x, y + 1, "#ffd860"); line(ctx, x, y + 1, x + 1, y + 2, "#ffd860"); }
  if (u.poison && u.poison.t > 0) for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; rect(ctx, fx - 8 + i * 7, fy - 34 - k * 18, 2, 2, k < 0.6 ? "#9cf07a" : "#d8ffc0"); }
  if (ready && (t * 3 | 0) % 2) {
    const iy = fy - (D.id === "mage" ? 70 : 60);
    rect(ctx, fx - 2, iy - 6, 5, 14, OUT); rect(ctx, fx - 1, iy - 5, 3, 7, "#ffd860"); rect(ctx, fx - 1, iy + 4, 3, 3, "#ffd860");
  }
}

// ---------- 敌人 ----------
function drawMound(e, fx, fy, t) {
  const w = 22, sh = R0(Math.sin(t * 12 + e.id) * 1);
  rect(ctx, fx - w / 2, fy - 3, w, 4, "#8a6a3a"); rect(ctx, fx - w / 2 + 3, fy - 6 + sh, w - 6, 4, "#b89050"); rect(ctx, fx - 5, fy - 8 + sh, 10, 3, "#d8b070");
  rect(ctx, fx - 4, fy - 8 + sh, 3, 1, "#f0d494"); dot(ctx, fx + 3, fy - 7 + sh, "#8a6a3a");
  for (let i = 0; i < 4; i++) { const k = (t * 2 + i / 4 + e.id * 0.3) % 1; dot(ctx, fx - e.face * (6 + k * 14), fy - 4 - Math.sin(k * 3.14) * 6, i % 2 ? "#e0c080" : "#b89050"); }
}
function drawEnemy(e, now) {
  const F = foeOf(e.type), [fx, fy] = foeFeet(e), t = now / 1000, w = F.frames[0][0].length * 2, hh = F.h * 2;
  if (e.under) { drawMound(e, fx, fy, t); return; }
  const lift = F.fly ? 22 + R0(Math.sin(t * 4 + e.id) * 2) : 0;
  shadow(fx, fy, F.fly ? 16 : Math.min(w, 40));
  const frozen = e.freezeT > 0, moving = !e.target && !frozen && !e.stop;
  const ph = frozen ? "" : e.atkT < 0.16 ? "wind" : e.atkT < 0.3 ? "hit" : "";
  const big = renderFoe(e.type, { step: moving ? Math.floor(e.walk * 7) % 2 : 0, ph, flash: e.hitT > 0.06, face: e.face, elite: e.elite, fuse: e.fuse > 0, broken: e.maxShield > 0 && e.shield <= 0, t: frozen ? 0 : t });
  const kb = -R0(e.kb * (isBoss(e) ? 1 : 3)) * e.face, lunge = e.target && ph === "hit" ? 4 * e.face : 0;
  if (e.type === "ghost") ctx.globalAlpha = 0.62 + Math.sin(t * 6 + e.id) * 0.12;
  if (e.d.stealth && !e.revealed) ctx.globalAlpha = 0.22 + ((t * 8 + e.id) % 2 < 0.4 ? 0.12 : 0);
  ctx.drawImage(big, fx - FOE_FOOT[0] + kb + lunge, fy - FOE_FOOT[1] - lift);
  ctx.globalAlpha = 1;
  const top = fy - hh - lift;
  if (e.stunT > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; rect(ctx, fx + Math.cos(a) * 9, top - 4 + Math.sin(a) * 3, 2, 2, "#ffe060"); }
  if (e.corrode && e.corrode.t > 0) for (let i = 0; i < 2; i++) { const k = (t * 1.2 + i * 0.5 + e.id * 0.17) % 1; rect(ctx, fx - 7 + i * 12, top + 4 + k * 14, 2, 2, k < 0.7 ? "#a8d848" : "#e0ff9a"); }
  if (e.burn > 0) for (let i = 0; i < 3; i++) { const k = (t * 2.2 + i / 3 + e.id * 0.11) % 1; rect(ctx, fx - 7 + i * 6, top + 8 - k * 16, 2, 2, k < 0.5 ? "#ff8a3a" : "#ffe060"); }
  if (e.mark > 0) { const a = t * 3; for (let i = 0; i < 4; i++) { const b = a + i * 1.57; dot(ctx, fx + Math.cos(b) * 8, top - 2 + Math.sin(b) * 4, "#c890ff"); } }
  if (e.poison && e.poison.t > 0 && (t * 4 | 0) % 2) { rect(ctx, fx - 6, top + 6, 2, 2, "#9cf07a"); rect(ctx, fx + 5, top + 10, 2, 2, "#6ad050"); }
  if (frozen) {
    ctx.fillStyle = "rgba(170,230,255,.5)"; ctx.fillRect(fx - w / 2 - 2, top - 2, w + 4, hh + 3);
    rect(ctx, fx - w / 2 - 2, top - 2, w + 4, 1, "#e8fbff"); rect(ctx, fx - w / 2 - 2, top - 2, 1, hh + 3, "#e8fbff");
  } else if (e.slowT > 0 && (t * 6 | 0) % 2) for (let i = -2; i <= 2; i++) rect(ctx, fx + i * 5, fy + 1, 2, 1, "#8fe0f0");
  if (e.brokenT > 0) { ctx.globalAlpha = 0.5 + Math.sin(t * 14) * 0.2; ring(ctx, fx, fy, 16, 9, "#ffe38a", (t * 10 | 0) % 2); ctx.globalAlpha = 1; }
  if (e.d.stealth && !e.revealed) return;
  if (e.cast) { drawCastAura(e, fx, fy - lift, t); drawCastBar(e, fx, top); }
  drawAfxPips(e, fx, top);
  bar(fx, top - 8, isBoss(e) ? 50 : e.type === "golem" ? 34 : 26, e.hp / e.maxHp, isBoss(e) ? "#ff5040" : "#ff6a5a", null, null, e.elite);
  if (e.maxShield > 0 && e.shield > 0) { rect(ctx, fx - 13, top - 12, 26, 3, OUT); rect(ctx, fx - 12, top - 11, R0(24 * e.shield / e.maxShield), 1, "#8ac8ff"); }
}

// ---------- 飞行物 ----------
const SHOT_COL = { archer: "#f0e0b8", mage: "#b070ff", frost: "#80e0ff", priest: "#6ee07a", enemy: "#9a50e0", gunner: "#ff9a3a", alchemist: "#a8d848", bard: "#f07aa8", summoner: "#7af0e0", fire: "#ff8a3a", dark: "#b070ff", chrono: "#7ae0d0", marshal: "#ffe060" };
function drawShot(s) {
  const [x, y] = tpx(s.x, s.y), k = s.kind, col = SHOT_COL[k] || "#ffffff";
  s.trail.forEach((p, i) => { const [a, b] = tpx(p[0], p[1]); if (k === "gunner") { if (i % 2) rect(ctx, a - 1, b - 1, 3, 3, "rgba(160,150,140,.6)"); } else if (i % 2 === 0) rect(ctx, a, b, 2, 2, i > 3 ? col : "rgba(255,255,255,.45)"); });
  if (k === "archer") {
    const dx = s.target.x - s.x, dy = s.target.y - 0.1 - s.y, d = Math.hypot(dx, dy) || 1;
    line(ctx, x - dx / d * 12, y - dy / d * 12, x, y, "#c8a070", 2); rect(ctx, x - 1, y - 1, 3, 3, "#ffffff");
  } else if (k === "priest") {
    rect(ctx, x - 4, y - 1, 9, 3, col); rect(ctx, x - 1, y - 4, 3, 9, col); rect(ctx, x - 1, y - 1, 3, 3, "#ffffff");
  } else if (k === "frost") {
    rect(ctx, x - 1, y - 5, 2, 2, "#ffffff"); rect(ctx, x - 3, y - 3, 6, 4, col); rect(ctx, x - 1, y + 1, 2, 2, "#4f98c8");
  } else if (k === "alchemist") {
    rect(ctx, x - 3, y - 2, 6, 6, OUT); rect(ctx, x - 2, y - 1, 4, 4, "#60e080"); dot(ctx, x - 2, y - 1, "#d8ffe0");
  } else if (k === "bard") {
    rect(ctx, x - 2, y, 4, 3, col); rect(ctx, x + 1, y - 6, 1, 7, col); rect(ctx, x + 2, y - 6, 2, 1, col); dot(ctx, x - 1, y, "#ffffff");
  } else if (k === "summoner") {
    rect(ctx, x - 1, y - 4, 3, 8, "#1a6060"); rect(ctx, x - 2, y - 2, 5, 4, "#1a6060"); rect(ctx, x, y - 3, 1, 6, col); dot(ctx, x, y - 2, "#ffffff");
  } else if (k === "fire") {
    ctx.globalAlpha = 0.45; disc(ctx, x, y, 6, "#ff5a2a"); ctx.globalAlpha = 1; disc(ctx, x, y, 3, "#ffb040"); rect(ctx, x - 1, y - 1, 2, 2, "#fff0a0");
  } else if (k === "dark") {
    ctx.globalAlpha = 0.45; disc(ctx, x, y, 7, "#7a3ac8"); ctx.globalAlpha = 1; disc(ctx, x, y, 4, "#2a1040"); ring(ctx, x, y, 4, 4, "#c890ff"); dot(ctx, x, y, "#ff5a9a");
  } else if (k === "gunner") {
    rect(ctx, x - 3, y - 3, 7, 7, OUT); rect(ctx, x - 2, y - 2, 5, 5, "#3a3a48"); rect(ctx, x - 1, y - 2, 2, 1, "#9a9aaa");
  } else {
    ctx.globalAlpha = 0.4; disc(ctx, x, y, 6, col); ctx.globalAlpha = 1;
    rect(ctx, x - 3, y - 3, 6, 6, col); rect(ctx, x - 1, y - 1, 2, 2, "#ffffff");
  }
}

// ---------- 特效 ----------
const overlayTexts = [];
function drawFx(f, now) {
  const k = f.t / f.life, t = now / 1000;
  if (f.kind === "text") {
    if (/^\+?\d+$/.test(f.text)) {
      const [x, y] = tpx(f.x, f.y), pop = f.t < 0.08 ? -4 : 0;
      const sz = f.sz || (f.crit ? 3 : 2), pop2 = sz === 4 && f.t < 0.12 ? -6 : pop;   // 最大号刚出现时往上弹一下
      if (k < 0.85 || (t * 20 | 0) % 2) pixNum(ctx, f.text, x, y - 10 - R0(k * 18) + pop2, sz === 4 ? "#ffe040" : f.color, sz);
    } else overlayTexts.push(f);
    return;
  }
  if (f.kind === "banner" || f.kind === "cutin" || f.kind === "combo" || f.kind === "skillcut") { overlayTexts.push(f); return; }
  if (f.kind === "flash" || f.kind === "letterbox") return;
  if (f.kind === "ring") {
    const r = (f.r0 + (f.r1 - f.r0) * (1 - (1 - k) ** 3)) * T, [x, y] = tpx(f.x, f.y);
    if (f.fill) { ctx.globalAlpha = 0.18 * (1 - k); disc(ctx, x, y + 8, r, f.color); ctx.globalAlpha = 1; }
    ring(ctx, x, y + 8, r, r * 0.8, f.color, k > 0.5); ring(ctx, x, y + 8, r - 1, r * 0.8 - 1, f.color, true);
  } else if (f.kind === "slash") {
    const [x, y] = tpx(f.x, f.y), fc = f.face || 1, fr = Math.min(2, Math.floor(k * 3)), R = f.big ? 18 : 14;
    const a0 = -110 + fr * 20, a1 = 40 - (fr === 2 ? 30 : 0);
    for (let a = a0; a <= a1; a += 3) {
      const r = a * Math.PI / 180;
      rect(ctx, x + fc * Math.cos(r) * R, y - 4 + Math.sin(r) * R, 2, 2, "#ffffff");
      if (fr < 2) rect(ctx, x + fc * Math.cos(r) * (R - 2), y - 4 + Math.sin(r) * (R - 2), 2, 2, f.color);
    }
    if (fr === 0) { const s = f.big ? 7 : 5; line(ctx, x - s, y - 4 - s, x + s, y - 4 + s, "#ffffff", 2); line(ctx, x - s, y - 4 + s, x + s, y - 4 - s, "#ffffff", 2); rect(ctx, x - 2, y - 6, 4, 4, "#fff6a0"); }
  } else if (f.kind === "thrust") {
    const [x, y] = tpx(f.x, f.y), fc = f.face || 1, len = R0(26 * (1 - k)) + 8;
    line(ctx, x - fc * len, y - 4, x + fc * 6, y - 4, "#ffffff", 2); line(ctx, x - fc * len, y - 1, x + fc * 2, y - 1, f.color);
    if (k < 0.4) { rect(ctx, x + fc * 6 - 2, y - 7, 5, 5, "#fff6a0"); dot(ctx, x + fc * 10, y - 5, "#ffffff"); }
  } else if (f.kind === "wave") {
    ctx.globalAlpha = Math.max(0, 1 - k);
    const [x, y] = tpx(f.x, f.y), r = 10 + k * f.r * T;
    for (let i = 0; i < 3; i++) { const rr = r - i * 10; if (rr > 4) ring(ctx, x, y + 8, rr, rr * 0.8, i ? f.color : "#ffffff", i === 2); }
    ctx.globalAlpha = 1;
  } else if (f.kind === "parts") {
    for (const p of f.parts) {
      if (k > 0.7 && (t * 20 | 0) % 2) continue;
      const x = (f.x + p.vx * f.t) * T + 20, y = (f.y + p.vy * f.t + 2.2 * f.t * f.t) * T + 16, sz = p.s > 0.065 && k < 0.5 ? 3 : 2;
      rect(ctx, x, y, sz, sz, f.color);
    }
  } else if (f.kind === "pillar") {
    const [x, y] = tpx(f.x, f.y), w = Math.max(2, R0(12 * (1 - k)));
    ctx.globalAlpha = 0.55 * (1 - k); rect(ctx, x - (w >> 1), y - 80, w, 100, f.color); ctx.globalAlpha = 1;
    rect(ctx, x - 1, y - 80 + R0(k * 40), 2, 100 - R0(k * 40), "#ffffff");
  } else if (f.kind === "cast") {
    const [x, y] = tpx(f.x, f.y), r = 8 + k * 28;
    ring(ctx, x, y + 14, r, r * 0.45, f.color, (t * 12 | 0) % 2); ring(ctx, x, y + 14, r * 0.6, r * 0.27, "#ffffff", true);
  } else if (f.kind === "boom") {
    const [x, y] = tpx(f.x, f.y), R = f.r * T;
    if (k < 0.2) disc(ctx, x, y + 6, R * 0.45 * (0.5 + k * 2.5), "#fff6d0");
    else {
      ctx.globalAlpha = Math.max(0, 0.35 * (1 - k)); disc(ctx, x, y + 6, R * (0.6 + k * 0.4), f.color); ctx.globalAlpha = 1;
      ring(ctx, x, y + 6, R * (0.6 + k * 0.4), R * (0.6 + k * 0.4) * 0.8, f.color, k > 0.6);
    }
  } else if (f.kind === "bolt") {
    const [x1, y1] = tpx(f.x, f.y), [x2, y2] = tpx(f.x2, f.y2);
    let px_ = x1, py_ = y1 - 6; const n = 6;
    for (let i = 1; i <= n; i++) {
      const nx = x1 + (x2 - x1) * i / n + (i < n ? (Math.random() - 0.5) * 8 : 0), ny = y1 - 6 + (y2 - y1) * i / n + (i < n ? (Math.random() - 0.5) * 8 : 0);
      line(ctx, px_, py_, nx, ny, f.color || "#b8e0ff", f.color ? 3 : 2); line(ctx, px_, py_, nx, ny, "#ffffff"); px_ = nx; py_ = ny;
    }
  } else if (f.kind === "meteor") {
    const [x, y] = tpx(f.x, f.y), sx = x + 120 * (1 - k), sy = y - 200 * (1 - k);
    const mc = f.color || "#ff6a2a";
    if ((t * 10 | 0) % 2) ring(ctx, x, y + 8, 1.4 * T, 1.4 * T * 0.8, "#ff8a3a", true);
    for (let i = 1; i < 6; i++) rect(ctx, sx + i * 8 - 2, sy - i * 13 - 2, 5 - (i >> 1), 5 - (i >> 1), i < 3 ? "#ffb040" : "#ff6a2a");
    disc(ctx, sx, sy, 7, "#ff6a2a"); disc(ctx, sx - 1, sy + 1, 4, "#ffd060"); rect(ctx, sx - 2, sy, 3, 3, "#ffffff");
  } else if (f.kind === "corpse") {
    const F = foeOf(f.type), [fx, fy] = foeFeet(f), flash = k < 0.3 && (f.t * 24 | 0) % 2 === 0;
    const big = renderFoe(f.type, { step: 0, ph: "", flash, face: f.face, elite: f.elite, t: 0 });
    const sy = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7 * 0.8, lift = F.fly ? R0(22 * (1 - Math.min(1, k * 2))) : 0;
    ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
    ctx.drawImage(big, 0, 0, 120, 120, fx - FOE_FOOT[0], fy - lift - R0(FOE_FOOT[1] * sy), 120, R0(120 * sy));
    ctx.globalAlpha = 1;
  } else if (f.kind === "shatter") {
    const [fx, fy] = foeFeet(f), img = renderFoe(f.type, { step: 0, ph: "", flash: k < 0.15, face: f.face, elite: f.elite, t: 0 });
    const ox = fx - FOE_FOOT[0], oy = fy - FOE_FOOT[1] - (f.fly ? 22 : 0), tt = f.t;
    ctx.globalAlpha = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
    for (const b of f.blocks) {
      const x = R0(ox + b.sx + b.vx * tt), y = R0(oy + b.sy + b.vy * tt + 260 * tt * tt), s = b.spin && k > 0.3 ? 6 : 8;
      ctx.drawImage(img, b.sx, b.sy, 8, 8, x, y, s, s);
    }
    ctx.globalAlpha = 1;
  } else if (f.kind === "ucorpse") {
    const [fx, fy] = unitFeet(f), flash = k < 0.35 && (f.t * 24 | 0) % 2 === 0;
    const big = renderHero(f.def, { phase: "idle", flash, face: f.face, lv: f.lv, branch: f.branch, t: 0 });
    ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) * 2.5;
    if (k < 0.3) ctx.drawImage(big, fx - HOX * 2, fy - 80);
    else { ctx.save(); ctx.translate(fx, fy - 2); ctx.rotate(-(f.face || 1) * Math.PI / 2 * Math.min(1, (k - 0.3) * 5)); ctx.drawImage(big, -HOX * 2, -80); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
}
function drawPool(p, t) {
  const [x, y] = tpx(p.x, p.y), R = p.r * T, fade = Math.min(1, p.t / 1.5);
  ctx.globalAlpha = 0.28 * fade; disc(ctx, x, y + 8, R * 0.95, "#6ab030"); ctx.globalAlpha = 0.5 * fade; ring(ctx, x, y + 8, R, R * 0.8, "#a8d848", (t * 6 | 0) % 2);
  for (let i = 0; i < 7; i++) { const a = i * 2.4 + p.x, rr = R * (0.2 + (i * 0.37 % 0.7)), k = (t * 1.3 + i * 0.29) % 1; if (k < 0.7) { const bx = x + Math.cos(a) * rr, by = y + 8 + Math.sin(a) * rr * 0.7 - k * 6; rect(ctx, bx, by, k < 0.5 ? 2 : 3, k < 0.5 ? 2 : 3, "#c8f070"); } }
  ctx.globalAlpha = 1;
}
function drawSpikes(t) {
  const lv = cl("sk_spike"); if (!lv) return;
  const fire = (S.spikeFire || 0) > 0, ev = evo("sk_spike");
  for (const [R, n] of ev ? [[RULES.ringFront + 0.2, 28], [RULES.ringFront + 1.2, 36]] : [[RULES.ringFront + 0.2, 28]])   // 进化：外面再多一圈
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + Math.sin(t * 0.3) * 0.05, x = CRYSTAL.x + Math.cos(a) * R, y = CRYSTAL.y + Math.sin(a) * R;
    if (solid(x, y)) continue;
    const [px_, py_] = tpx(x, y), h = fire ? (ev ? 10 : 8) : 4;
    rect(ctx, px_ - 1, py_ + 10 - h, 2, h, fire ? "#e8ecf4" : ev ? "#b0a07a" : "#9aa0ac");
    dot(ctx, px_ - 1, py_ + 9 - h, ev ? "#ffe080" : "#ffffff");
  }
}
// 集火标记：红色准星四角 + 头顶小箭头，一直跟着目标
function drawFocus(t) {
  const e = focusFoe(); if (!e) return;
  const [x, y0] = tpx(e.x, e.y), y = y0 + (e.d.flying ? -4 : 4), r = 11 + Math.sin(t * 8) * 1.5, c = "#ff4a4a", L = 5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = x + sx * r, cy = y + sy * r;
    line(ctx, cx, cy, cx - sx * L, cy, c, 2); line(ctx, cx, cy, cx, cy - sy * L, c, 2);
  }
  const ay = y - r - 10 + Math.sin(t * 6) * 2;
  rect(ctx, x - 3, ay, 7, 2, c); rect(ctx, x - 2, ay + 2, 5, 2, c); rect(ctx, x - 1, ay + 4, 3, 2, c);
}
function drawBlades(t) {
  if (!cl("sk_blade")) return;
  const ev = evo("sk_blade");
  for (const b of S.blades) {
    if (b.x == null) continue;
    const [x, y] = tpx(b.x, b.y), a = t * 16;
    for (let i = 0; i < 4; i++) {
      const ang = a + i * 1.57, ex = x + Math.cos(ang) * 9, ey = y + 8 + Math.sin(ang) * 9;
      line(ctx, x, y + 8, ex, ey, i % 2 ? (ev ? "#ffe080" : "#dfe6f2") : "#ffffff", 2);
    }
    disc(ctx, x, y + 8, 3, ev ? "#ffd860" : "#c8d0e0"); dot(ctx, x, y + 8, "#ffffff");
  }
}

// ---------- 地图机关 ----------
function drawHazGround(t) {
  if (!S.haz) return;
  for (const h of S.haz) {
    const [x, y] = tpx(h.x, h.y);
    if (h.type === "vent") {
      const k = Math.min(1, h.t / h.every), R = h.r * T;
      // 作用范围
      ctx.globalAlpha = 0.07 + k * 0.13; disc(ctx, x, y + 8, R * 0.9, h.color); ctx.globalAlpha = 1;
      ring(ctx, x, y + 8, R, R * 0.6, h.color, true);
      // 喷口本体：石圈 + 里面发光的核
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; rect(ctx, x + Math.cos(a) * 11 - 1, y + 8 + Math.sin(a) * 7 - 1, 3, 3, i % 2 ? "#4a4450" : "#2e2a34"); }
      disc(ctx, x, y + 8, 7, "#1a1620");
      const glow = 0.35 + k * 0.65;
      ctx.globalAlpha = glow; disc(ctx, x, y + 8, 5, h.color); ctx.globalAlpha = 1;
      disc(ctx, x, y + 8, R0(2 + k * 3), h.color); if (k > 0.5) dot(ctx, x, y + 8, "#ffffff");
      // 蓄力进度：一圈点按比例亮起
      for (let i = 0; i < 12; i++) { const a = -1.57 + i / 12 * 6.283; const on = i / 12 <= k; rect(ctx, x + Math.cos(a) * 14 - 1, y + 8 + Math.sin(a) * 9 - 1, 2, 2, on ? "#ffffff" : "#3a3440"); }
      if (k > 0.82) { const b = (t * 14 | 0) % 2; if (b) { ctx.globalAlpha = 0.5; disc(ctx, x, y + 6, 12, h.color); ctx.globalAlpha = 1; } }
      if (h.fire > 0) {
        ctx.globalAlpha = Math.min(1, h.fire * 2); disc(ctx, x, y + 4, R * 0.7, h.color); ctx.globalAlpha = 1;
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, d = 6 + (1 - h.fire) * R * 0.8; rect(ctx, x + Math.cos(a) * d, y + 8 + Math.sin(a) * d * 0.6, 3, 3, i % 2 ? "#ffffff" : h.color); }
      }
    } else if (h.type === "field") {
      const R = h.r * T;
      ctx.globalAlpha = 0.06 + Math.sin(t * 2) * 0.02; disc(ctx, x, y + 8, R, h.color); ctx.globalAlpha = 1;
      ring(ctx, x, y + 8, R, R * 0.62, h.color, true);
      for (let i = 0; i < 10; i++) { const a = t * 0.4 + i / 10 * 6.283; dot(ctx, x + Math.cos(a) * R, y + 8 + Math.sin(a) * R * 0.62, h.color); }
    } else if (h.type === "spikes") {
      const R = h.r * T, up = h.fire > 0;
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * 6.283 + 0.1, sx = x + Math.cos(a) * R, sy = y + 8 + Math.sin(a) * R * 0.62;
        const hh = up ? 7 : 2;
        rect(ctx, sx, sy - hh, 2, hh, up ? "#e8ecf4" : "#6a6a78"); if (up) dot(ctx, sx, sy - hh, "#ffffff");
      }
    }
  }
}
function drawHazAir(t) {
  if (!S.haz) return;
  for (const h of S.haz) {
    if (h.type !== "beam") continue;
    const [x, y] = tpx(h.x, h.y), L = (h.len || 5) * T;
    for (let i = 0; i < (h.n || 2); i++) {
      const a = h.ang + i / (h.n || 2) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a) * 0.72;
      ctx.globalAlpha = 0.45;
      for (let d = 12; d < L; d += 3) { const px_ = x + ux * d, py_ = y + 8 + uy * d; rect(ctx, px_ - 1, py_ - 1, 3, 3, h.color); }
      ctx.globalAlpha = 1;
      for (let d = 12; d < L; d += 6) { const px_ = x + ux * d, py_ = y + 8 + uy * d; dot(ctx, px_, py_, "#ffffff"); }
      const ex = x + ux * L, ey = y + 8 + uy * L;
      disc(ctx, ex, ey, 3, h.color); dot(ctx, ex, ey, "#ffffff");
    }
    ctx.globalAlpha = 0.3; disc(ctx, x, y + 8, 7, h.color); ctx.globalAlpha = 1;
  }
}
// 开合传送门：关着的门画暗一点
function drawGates(t) {
  if (!S.gate) return;
  PORTALS.forEach((p, i) => {
    const [x, y] = tpx(p.x, p.y);
    if (portalOpen(i)) { ring(ctx, x, y + 6, 13, 9, "#ff5a9a", (t * 6 | 0) % 2); return; }
    ctx.globalAlpha = 0.75; disc(ctx, x, y + 4, 13, "#12040e"); ctx.globalAlpha = 1;
    for (let k = -12; k <= 12; k += 4) rect(ctx, x - 12, y + 4 + k * 0.6, 25, 2, "#3a2430");
    ring(ctx, x, y + 6, 13, 9, "#5a3a4a");
  });
}
function drawCrystalHp() {
  const [x, y] = tpx(CRYSTAL.x, CRYSTAL.y), f = S.crystal.hp / S.crystal.maxHp;
  const w = 44, col = f > 0.5 ? "#62b4ff" : f > 0.25 ? "#ffd860" : "#ff6a5a";
  bar(x, y + 24, w, f, col);
  if (S.crystal.hitT > 0) { ctx.globalAlpha = S.crystal.hitT; ring(ctx, x, y + 10, 30, 22, "#ff6a5a"); ctx.globalAlpha = 1; }
}

// 中文文字画在上层高清画布
function drawOverlay() {
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tx.width, tx.height);
  const s = tx.width / PW;
  // 手机上画布本身就小，字按比例会看不清：窄屏时整体放大
  const tk = Math.min(1.9, Math.max(1, 0.9 / (s / (DPR || 1)))), nk = 1 + (tk - 1) * 0.55;
  tctx.textAlign = "center"; tctx.textBaseline = "middle";
  const txt = (str, x, y, size, col) => {
    tctx.font = `900 ${size}px 'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif`;
    tctx.fillStyle = OUT; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) tctx.fillText(str, x + dx * s, y + dy * s);
    tctx.fillStyle = col; tctx.fillText(str, x, y);
  };
  let bannerN = 0;
  for (const f of overlayTexts) {
    const k = f.t / f.life;
    if (f.kind === "cutin") { drawCutin(f, k, s, txt); continue; }
    if (f.kind === "skillcut") { drawSkillCut(f, k, s, txt); continue; }
    if (f.kind === "combo") {
      const a = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1, sc = 1 + Math.max(0, 0.3 - k) * 1.5;
      tctx.globalAlpha = a; txt(`连杀 ${f.n}！经验 +${f.dp}`, tx.width / 2, (72 - k * 16) * s, 17 * s * sc * tk, "#ffd860"); tctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === "banner") {
      const a = Math.min(1, f.t * 5, (f.life - f.t) * 3), y = (PHt / 2 + (bannerN++) * 50 * tk) * s;
      tctx.globalAlpha = a; tctx.fillStyle = "rgba(10,8,20,.8)"; tctx.fillRect(0, y - 22 * s * tk, tx.width, 44 * s * tk);
      tctx.fillStyle = "#f0c040"; tctx.fillRect(0, y - 22 * s * tk, tx.width, 2 * s); tctx.fillRect(0, y + 20 * s * tk, tx.width, 2 * s);
      txt(f.text, tx.width / 2 + (1 - Math.min(1, f.t * 4)) * 80 * s, y, 20 * s * tk, f.danger ? "#ff6a5a" : "#ffe38a");
      tctx.globalAlpha = 1;
    } else {
      const [x, y] = tpx(f.x, f.y);
      tctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
      txt(f.text, x * s, (y - 20 - k * 16) * s, (f.big ? 13 : 11) * s * nk, f.color);
      tctx.globalAlpha = 1;
    }
  }
  if (S.boss && !S.boss.dead) {
    // 横屏全屏时顶栏浮在战场上面，血条要挪到顶栏下方
    let top = 10 * s;
    const ht = document.body.classList.contains("imm") && document.querySelector(".hud-top");
    if (ht) { const r = ht.getBoundingClientRect(), c = tx.getBoundingClientRect(); if (r.bottom > c.top && r.top < c.top + c.height * 0.3) top = Math.max(top, (r.bottom - c.top) * (tx.height / c.height) + 6 * s); }
    const b = S.boss, w = tx.width * 0.62, x = (tx.width - w) / 2, y = top, h = 10 * s, f = Math.max(0, b.hp / b.maxHp);
    b.trail = b.trail == null || b.trail < f ? f : Math.max(f, b.trail - 0.004);   // 掉血残影：白色部分慢慢缩回
    const shk = b.hitT > 0 ? (Math.random() - 0.5) * 2 * s : 0;
    tctx.fillStyle = b.enraged && Math.sin(performance.now() / 120) > 0 ? "#ff3a2a" : "rgba(10,6,10,.9)"; tctx.fillRect(x - 2 * s + shk, y - 2 * s, w + 4 * s, h + 4 * s);
    tctx.fillStyle = "#3a1014"; tctx.fillRect(x + shk, y, w, h);
    tctx.fillStyle = "#f4e8d0"; tctx.fillRect(x + shk, y, w * b.trail, h);
    tctx.fillStyle = b.enraged ? "#ff3a2a" : "#d83838"; tctx.fillRect(x + shk, y, w * f, h);
    tctx.fillStyle = "rgba(255,255,255,.3)"; tctx.fillRect(x + shk, y, w * f, h * 0.3);
    txt(Math.ceil(f * 100) + "%", x + w - 14 * s, y + h * 0.5 + 3 * s * tk, 7 * s * tk, "#ffffff");
    tctx.fillStyle = "#ffe38a"; for (const kk of b.d.phases || [0.5]) tctx.fillRect(x + w * kk - s / 2, y, s, h);
    if (b.shield > 0) { tctx.fillStyle = "#8ac8ff"; tctx.fillRect(x, y + h - 2 * s, w * Math.min(1, b.shield / (b.maxShield || 1)), 2 * s); }
    txt(b.d.name + (b.afx && b.afx.length ? "（" + afxNames(b) + "）" : "") + (b.enraged ? " · 狂暴" : "") + (b.brokenT > 0 ? " · 破防" : ""), tx.width / 2, y + h + 9 * s * tk, 8 * s * tk, b.brokenT > 0 ? "#ffe38a" : b.enraged ? "#ff8a7a" : "#ffe38a");
    if (b.cast) {
      const c = b.cast, cy = y + h + 20 * s * tk, ch = 6 * s * tk, bk = Math.min(1, c.got / c.need);
      tctx.fillStyle = "rgba(10,6,10,.85)"; tctx.fillRect(x - 2 * s, cy - 2 * s, w + 4 * s, ch + 4 * s);
      tctx.fillStyle = "#2a1830"; tctx.fillRect(x, cy, w, ch);
      tctx.fillStyle = c.u.color; tctx.fillRect(x, cy, w * Math.min(1, c.t / c.dur), ch);
      tctx.fillStyle = "#ffe38a"; tctx.fillRect(x, cy + ch - 2 * s, w * bk, 2 * s);
      txt(`${c.u.name} · 打断进度 ${Math.round(bk * 100)}%（${c.u.tip}）`, tx.width / 2, cy + ch + 9 * s * tk, 8 * s * tk, "#ffe38a");
    }
  }
  drawWaveLabels(s, txt, tk);
  if (S.combo >= 3 && S.comboT > 0 && !$("pinfo").offsetHeight) {   // 竖屏信息区有大号连杀，战场里就不重复画
    const tier = S.combo >= 50 ? "#ff6a5a" : S.combo >= 20 ? "#ffb040" : S.combo >= 10 ? "#ffd860" : "#ffffff";
    tctx.textAlign = "left"; txt(`连杀 ×${S.combo}`, 12 * s, 16 * s * tk, (10 + Math.min(6, S.combo / 8)) * s * tk, tier);
    tctx.fillStyle = "rgba(10,8,20,.7)"; tctx.fillRect(12 * s, 25 * s, 56 * s, 3 * s); tctx.fillStyle = tier; tctx.fillRect(12 * s, 25 * s, 56 * s * Math.max(0, S.comboT / COMBO.window), 3 * s);
    tctx.textAlign = "center";
  }
  if (S.paused && !S.over && !S.offer) txt("暂停中", tx.width / 2, tx.height / 2, 26 * s, "#ffffff");
  if (S.cine) drawCineText(s, txt, tk);
  overlayTexts.length = 0;
}
// 晨星爆发：斜着的横幅 + 角色立绘依次滑入
// 角色技能特写：从左边斜着滑进来的一条（头像 + 名字 + 技能名），停一下再滑出去
function drawSkillCut(f, k, s, txt) {
  const W = tx.width, H = tx.height, bh = H * 0.2, cy = H * 0.3, bw = W * 0.56, sk = 10 * s;
  const inK = Math.min(1, k * 7), outK = k > 0.75 ? (k - 0.75) / 0.25 : 0, x0 = -bw * (1 - inK) * (1 - inK) - bw * outK * outK * 1.2;
  tctx.save(); tctx.globalAlpha = 1 - outK * 0.6;
  tctx.fillStyle = "rgba(10,12,22,.88)";
  tctx.beginPath(); tctx.moveTo(x0, cy - bh / 2); tctx.lineTo(x0 + bw + sk, cy - bh / 2); tctx.lineTo(x0 + bw - sk, cy + bh / 2); tctx.lineTo(x0, cy + bh / 2); tctx.closePath(); tctx.fill();
  tctx.fillStyle = f.color;
  tctx.fillRect(x0, cy - bh / 2, bw + sk, 2.5 * s); tctx.fillRect(x0, cy + bh / 2 - 2.5 * s, bw - sk, 2.5 * s);
  tctx.globalAlpha *= 0.5; for (let i = 0; i < 6; i++) { const y = cy - bh / 2 + (i + 0.5) / 6 * bh, len = (30 + (i * 37) % 50) * s, x = x0 + ((f.t * 700 * s + i * 97 * s) % (bw + len)) - len; tctx.fillRect(x, y, len, 1.2 * s); }
  tctx.globalAlpha = 1 - outK * 0.6;
  tctx.imageSmoothingEnabled = false;
  const D = UNITS.find(u => u.id === f.id), size = bh * 1.25;
  if (D) tctx.drawImage(renderHero(D, { phase: "idle", face: 1, lv: f.lv, branch: f.branch }), HOX * 2 - 32, 22, 64, 64, x0 + 6 * s, cy - size * 0.62, size, size);
  tctx.textAlign = "left";
  txt(f.skill, x0 + size + 10 * s, cy + bh * 0.08, Math.min(18 * s, bh * 0.42), f.color);
  txt(f.name + (f.hero ? " · 英雄" : ""), x0 + size + 10 * s, cy - bh * 0.3, Math.min(9 * s, bh * 0.22), "#e8e0c8");
  tctx.textAlign = "center";
  tctx.restore();
}
function drawCutin(f, k, s, txt) {
  const W = tx.width, H = tx.height, cy = H * 0.48, bh = H * 0.36, sk = 26 * s;
  const a = Math.min(1, k * 7, k > 0.78 ? (1 - k) / 0.22 : 1);
  tctx.save(); tctx.globalAlpha = a;
  tctx.fillStyle = "rgba(12,8,28,.9)";
  tctx.beginPath(); tctx.moveTo(0, cy - bh / 2 + sk); tctx.lineTo(W, cy - bh / 2 - sk); tctx.lineTo(W, cy + bh / 2 - sk); tctx.lineTo(0, cy + bh / 2 + sk); tctx.closePath(); tctx.fill();
  tctx.fillStyle = "#f0c040";
  tctx.beginPath(); tctx.moveTo(0, cy - bh / 2 + sk); tctx.lineTo(W, cy - bh / 2 - sk); tctx.lineTo(W, cy - bh / 2 - sk + 3 * s); tctx.lineTo(0, cy - bh / 2 + sk + 3 * s); tctx.closePath(); tctx.fill();
  tctx.beginPath(); tctx.moveTo(0, cy + bh / 2 + sk); tctx.lineTo(W, cy + bh / 2 - sk); tctx.lineTo(W, cy + bh / 2 - sk - 3 * s); tctx.lineTo(0, cy + bh / 2 + sk - 3 * s); tctx.closePath(); tctx.fill();
  tctx.fillStyle = "rgba(255,255,255,.5)";
  for (let i = 0; i < 14; i++) { const y = cy - bh / 2 + ((i * 37) % 100) / 100 * bh, len = (40 + (i * 53) % 90) * s, x = W - ((f.t * 900 * s + i * 131 * s) % (W + len)); tctx.fillRect(x, y, len, 1.5 * s); }
  tctx.imageSmoothingEnabled = false;
  const size = bh * 1.05, n = f.ids.length;
  f.ids.forEach((id, i) => {
    const D = UNITS.find(u => u.id === id); if (!D) return;
    const slide = Math.max(0, 1 - Math.max(0, k * 6 - i * 0.35)), x = W * 0.5 - (n * size * 0.72) / 2 + i * size * 0.72 + slide * slide * W * 0.8, y = cy - size / 2 - (i - (n - 1) / 2) * sk * 0.35;
    tctx.fillStyle = D.color; tctx.globalAlpha = a * 0.35; tctx.fillRect(x + size * 0.12, y + size * 0.1, size * 0.76, size * 0.8); tctx.globalAlpha = a;
    tctx.drawImage(renderHero(D, { phase: "idle", face: -1, lv: 4, branch: "A" }), HOX * 2 - 32, 22, 64, 64, x, y, size, size);
  });
  const tk = Math.min(1, Math.max(0, k * 5 - 0.6));
  txt("晨星爆发！", W / 2 + (1 - tk) * 200 * s, cy + bh / 2 - sk * 0.2 - 12 * s, 26 * s, "#fff0a0");
  tctx.restore();
}

// ---------- 出怪方向预告 + 大波预警 ----------
const WAVE_COL = { boss: "#ff4a4a", elite: "#ff6a5a", tide: "#ffb040", "": "#ff8ac0" };
const wavePreviewOn = () => !S.over && !S.cine && !S.spawnQueue.length && S.wave < totalWaves() && S.genWaves[S.wave];
function drawWavePreview(t) {
  if (!wavePreviewOn()) return;
  const info = nextWaveInfo(); if (!info) return;
  const col = WAVE_COL[info.kind], soon = S.autoWave !== false && S.nextWaveIn <= 3, pulse = 0.5 + Math.sin(t * (soon ? 12 : 5)) * 0.5;
  for (const [pi] of info.ports) {
    const p = PORTALS[pi]; if (!p) continue;
    const [x, y] = tpx(p.x, p.y), dx = CRYSTAL.x - p.x, dy = CRYSTAL.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    // 传送门外圈脉动
    ctx.globalAlpha = 0.35 + pulse * 0.45; ring(ctx, x, y + 6, 15 + pulse * 3, 10 + pulse * 2, col); ctx.globalAlpha = 1;
    // 往晨星碑方向走的三道箭头
    for (let i = 0; i < 3; i++) {
      const k = ((t * 1.6 + i / 3) % 1), cx = x + ux * (14 + k * 34), cy = y + 6 + uy * (14 + k * 34) * 0.8;
      ctx.globalAlpha = (1 - k) * 0.9;
      const nx = -uy, ny = ux;
      line(ctx, cx - ux * 5 + nx * 5, cy - uy * 5 + ny * 5, cx, cy, col, 2); line(ctx, cx - ux * 5 - nx * 5, cy - uy * 5 - ny * 5, cx, cy, col, 2);
    }
    ctx.globalAlpha = 1;
  }
  // 最后 3 秒：潮汐 / 首领 / 精英波，屏幕边缘泛红脉动
  if (soon && info.kind) {
    const a = (0.12 + pulse * 0.18) * (info.kind === "tide" ? 0.8 : 1), w = 10;
    ctx.fillStyle = info.kind === "tide" ? `rgba(255,160,40,${a.toFixed(3)})` : `rgba(255,50,50,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, PW, w); ctx.fillRect(0, PHt - w, PW, w); ctx.fillRect(0, 0, w, PHt); ctx.fillRect(PW - w, 0, w, PHt);
  }
}
// 传送门旁边的怪物小图标 + 数量（画在高清文字层上，手机上也看得清）
function drawWaveLabels(s, txt, tk) {
  if (!wavePreviewOn()) return;
  const info = nextWaveInfo(); if (!info) return;
  const col = WAVE_COL[info.kind], sz = Math.round(20 * s * tk);
  tctx.imageSmoothingEnabled = false;
  for (const [pi, m] of info.ports) {
    const p = PORTALS[pi]; if (!p) continue;
    const dx = CRYSTAL.x - p.x, dy = CRYSTAL.y - p.y, d = Math.hypot(dx, dy) || 1;
    const [px, py] = tpx(p.x + dx / d * 1.05, p.y + dy / d * 0.95), list = [...m].sort((a, b) => b[1] - a[1]).slice(0, 2);
    list.forEach(([type, n], i) => {
      const F = foeOf(type), big = renderFoe(type, { face: 1, t: 0 }), sq = Math.max(F.h * 2 + 8, F.frames[0][0].length * 2 + 4, 36);
      const x = px * s + (i - (list.length - 1) / 2) * sz * 1.5, y = py * s;
      tctx.fillStyle = "rgba(10,8,20,.7)"; tctx.fillRect(x - sz * 0.62, y - sz * 0.62, sz * 1.24, sz * 1.24);
      tctx.fillStyle = col; tctx.fillRect(x - sz * 0.62, y + sz * 0.52, sz * 1.24, Math.max(1, s));
      tctx.drawImage(big, 60 - sq / 2, 115 - sq, sq, sq, x - sz / 2, y - sz / 2 - sz * 0.08, sz, sz);
      txt("×" + n, x + sz * 0.42, y + sz * 0.5, 8 * s * tk, "#ffffff");
    });
  }
}
// 连杀边框光：10 连起屏幕四边发光，25 / 50 / 80 连颜色逐级变热、光带变宽
// 首领狂暴时画面四周一圈暗红在呼吸；换形态 / 击破时上下黑边滑进来（电影感）
function drawBossMood(t) {
  const b = S.boss;
  if (b && !b.dead && b.enraged && !S.over) {
    const a = 0.16 + Math.sin(t * 4) * 0.08, w = 10;
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = `rgba(200,20,20,${(a * (1 - i / w)).toFixed(3)})`;
      ctx.fillRect(i, i, PW - i * 2, 1); ctx.fillRect(i, PHt - 1 - i, PW - i * 2, 1); ctx.fillRect(i, i, 1, PHt - i * 2); ctx.fillRect(PW - 1 - i, i, 1, PHt - i * 2);
    }
  }
  for (const f of S.fx) if (f.kind === "letterbox") {
    const k = f.t / f.life, h = 34 * Math.min(1, k * 6, (1 - k) * 5);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, PW, h); ctx.fillRect(0, PHt - h, PW, h);
  }
}
function drawComboGlow(t) {
  if (S.combo < 10 || S.comboT <= 0 || S.over) return;
  const tier = S.combo >= 80 ? 3 : S.combo >= 50 ? 2 : S.combo >= 25 ? 1 : 0;
  const rgb = ["255,216,96", "255,176,64", "255,106,90", "255,58,138"][tier], w = 4 + tier * 3;
  const a = (0.18 + tier * 0.07) * (0.7 + Math.sin(t * (6 + tier * 3)) * 0.3) * Math.min(1, S.comboT / 0.8);
  for (let i = 0; i < w; i++) {
    ctx.fillStyle = `rgba(${rgb},${(a * (1 - i / w)).toFixed(3)})`;
    ctx.fillRect(i, i, PW - i * 2, 1); ctx.fillRect(i, PHt - 1 - i, PW - i * 2, 1); ctx.fillRect(i, i, 1, PHt - i * 2); ctx.fillRect(PW - 1 - i, i, 1, PHt - i * 2);
  }
}

// ---------- 每帧绘制 ----------
const renderSortBuf = [];
function render(now) {
  now = now || performance.now();
  const t = now / 1000;
  if (mapFor !== mapKey()) { drawMap(); mapFor = mapKey(); }
  ctx.imageSmoothingEnabled = false;
  const amp = S.shake > 0 ? Math.min(6, 2 + S.shake * 10) * GFX.shake : 0;
  const ox = amp ? R0((Math.random() - 0.5) * amp) : 0, oy = amp ? R0((Math.random() - 0.5) * amp) : 0;
  const zoom = 1 + (S.zoomK || 0);   // 大招 / 击破首领：短促地往里顿一下镜头，加重打击感
  ctx.setTransform(1, 0, 0, 1, 0, 0); rect(ctx, 0, 0, PW, PHt, TH().bg);
  ctx.setTransform(zoom, 0, 0, zoom, PW / 2 * (1 - zoom) + ox, PHt / 2 * (1 - zoom) + oy);
  ctx.drawImage(mapCv, 0, 0);
  drawAmbient(now);
  drawHazGround(t);
  drawGates(t);
  for (const p of S.pools) drawPool(p, t);
  drawSpikes(t);
  if (S.spellMode === "meteor" && S.hover) {
    const [x, y] = tpx(S.hover.x, S.hover.y), R = SPELLS[0].radius * T;
    ctx.globalAlpha = 0.18; disc(ctx, x, y + 6, R, "#ff8a3a"); ctx.globalAlpha = 1;
    ring(ctx, x, y + 6, R, R * 0.8, "#ff8a3a", (t * 8 | 0) % 2); line(ctx, x - 8, y + 6, x + 8, y + 6, "#ffffff"); line(ctx, x, y - 2, x, y + 14, "#ffffff");
  }
  if (S.selUnit && !S.selUnit.dead) {
    const u = S.selUnit, [x, y] = tpx(u.x, u.y), R = uRange(u) * T;
    ctx.globalAlpha = 0.5; ring(ctx, x, y + 12, R, R * 0.8, u.def.color, (t * 8 | 0) % 2); ctx.globalAlpha = 1;
  }
  // 觉醒 3 级以上的角色脚下一圈金色光环
  for (const u of S.units) if (!u.dead && !u.summon && u.down <= 0 && awk(u.def.id) >= AWK.auraLv) {
    const [x, y] = tpx(u.x, u.y), r = 11 + Math.sin(t * 3 + u.id) * 1.5;
    ctx.globalAlpha = 0.22; disc(ctx, x, y + 12, r, "#ffd860"); ctx.globalAlpha = 0.7; ring(ctx, x, y + 12, r, r * 0.45, "#ffe8a0", (t * 4 | 0) % 2); ctx.globalAlpha = 1;
  }
  drawStations(t);
  drawWavePreview(t);
  drawCrystalHp();
  // 复用同一个数组装「按脚下 y 排序画」的列表，别每帧都 filter+map+spread 出一堆临时数组
  renderSortBuf.length = 0;
  for (const u of S.units) if (!u.dead) renderSortBuf.push({ y: unitFeet(u)[1], u, e: null });
  for (const e of S.enemies) if (!e.d.flying) renderSortBuf.push({ y: foeFeet(e)[1], u: null, e });
  renderSortBuf.sort((a, b) => a.y - b.y);
  for (const it of renderSortBuf) it.u ? drawUnit(it.u, now) : drawEnemy(it.e, now);
  for (const f of S.fx) if (f.kind === "corpse" || f.kind === "ucorpse" || f.kind === "shatter") drawFx(f, now);
  for (const e of S.enemies) if (e.d.flying) drawEnemy(e, now);
  drawBlades(t);
  drawFocus(t);
  drawHazAir(t);
  for (const s of S.shots) drawShot(s);
  for (const f of S.fx) if (f.kind !== "corpse" && f.kind !== "ucorpse" && f.kind !== "shatter") drawFx(f, now);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (S.hitFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${(S.hitFlash * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, PW, 6); ctx.fillRect(0, PHt - 6, PW, 6); ctx.fillRect(0, 0, 6, PHt); ctx.fillRect(PW - 6, 0, 6, PHt); }
  if (S.slowmo > 0) { ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(0, 0, PW, PHt); }
  for (const f of S.fx) if (f.kind === "flash") { ctx.globalAlpha = 0.75 * (1 - f.t / f.life); ctx.fillStyle = f.color || "#fff8d2"; ctx.fillRect(0, 0, PW, PHt); ctx.globalAlpha = 1; }   // 以前忽略 color，诅咒的红闪也是米白
  if (S.star >= ULT.max && !S.over) { const a = 0.25 + Math.sin(t * 5) * 0.15; ctx.fillStyle = `rgba(255,224,128,${a.toFixed(3)})`; ctx.fillRect(0, 0, PW, 3); ctx.fillRect(0, PHt - 3, PW, 3); }
  if ((S.paused || S.offer) && !S.over) { ctx.fillStyle = "rgba(8,10,16,.45)"; ctx.fillRect(0, 0, PW, PHt); }
  drawComboGlow(t);
  drawBossMood(t);
  drawCine();
  drawOverlay();
}
