// ================= 技能的画面效果 =================
// 每个英雄的技能都有自己看得出来的画面：
//   持续型（圣盾、狂风斩、箭雨……）身上和脚下有一直在的光环 drawSkillAura，按英雄分开画；
//   瞬发型（冰封领域、陨星、龙枪突刺……）放招那一下有一次性的范围特效 skillFx → drawSkFx。
// 都只是画面，不碰判定；全部用小方块和点画，不建渐变（发热）。
const ring2 = (g, x, y, rx, ry, c, d) => { ring(g, x, y, rx, ry, c, d); ring(g, x, y, rx - 1, ry - 1, c, d); ring(g, x, y, rx - 2, ry - 2, c, true); };   // 三层圈，比单像素圈醒目
// 半透明的椭圆底色（范围、护罩）：按行画，不建渐变
function fillEll(g, x, y, rx, ry, c, a) {
  g.globalAlpha = a; g.fillStyle = c;
  for (let yy = -ry; yy <= ry; yy += 2) { const hw = Math.floor(rx * Math.sqrt(1 - (yy / ry) ** 2)); g.fillRect(R0(x - hw), R0(y + yy), hw * 2, 2); }
  g.globalAlpha = 1;
}
const SK_NOTE = (x, y, c) => { rect(ctx, x, y, 3, 2, c); rect(ctx, x + 2, y - 6, 1, 7, c); rect(ctx, x + 3, y - 6, 2, 1, c); };

// ---- 持续型：每帧画在角色身上（技能持续期间）----
function drawSkillAura(u, fx, fy, t) {
  const D = u.def, id = D.id, R = uRange(u) * T, face = u.face || 1;
  skillBar(u, fx, fy);
  if (id === "knight") {          // 圣盾：蓝色护罩 + 边上闪光
    fillEll(ctx, fx, fy - 16, 17, 22, D.color, 0.22);
    ring2(ctx, fx, fy - 16, 16, 20, D.color, false); ring2(ctx, fx, fy - 16, 15, 19, "#cfe4ff", (t * 6 | 0) % 2);
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; dot(ctx, fx + Math.cos(a) * 16, fy - 16 + Math.sin(a) * 20, "#ffffff"); }
  } else if (id === "sword") {    // 狂风斩：身边转圈的刀光 + 脚下一圈攻击范围
    fillEll(ctx, fx, fy + 2, R, R * 0.8, D.color, 0.14); ring2(ctx, fx, fy + 2, R, R * 0.8, D.color, true);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) { const a = t * 9 + i * 2.094 + j * 0.13; rect(ctx, fx + Math.cos(a) * 26, fy - 14 + Math.sin(a) * 15, 3, 3, j > 3 ? "#ffffff" : j > 1 ? "#f0a0a0" : D.color); }
  } else if (id === "assassin") { // 影袭：暗色残影点围着转，眼睛一闪一闪
    for (let i = 0; i < 6; i++) { const a = t * 5 + i * 1.047; rect(ctx, fx + Math.cos(a) * 14, fy - 14 + Math.sin(a) * 9, 2, 3, i % 2 ? "#4fc0b0" : "#20303a"); }
    if ((t * 8 | 0) % 2) { dot(ctx, fx + face * 3, fy - 31, "#ff4060"); dot(ctx, fx + face * 6, fy - 31, "#ff4060"); }
  } else if (id === "archer") {   // 箭雨：范围内的敌人头顶一直有箭落下来
    fillEll(ctx, fx, fy + 2, R, R * 0.8, D.color, 0.1); ring2(ctx, fx, fy + 2, R, R * 0.8, D.color, true);
    let n = 0;
    for (const e of S.enemies) {
      if (n >= 6) break; if (!hittable(e) || dist(u, e) > uRange(u)) continue; n++;
      const [ex, ey] = tpx(e.x, e.y), ph = (t * 2.6 + e.id * 0.41) % 1;
      if (ph < 0.8) { const yy = ey - 6 - 64 * (1 - ph / 0.8); rect(ctx, ex, yy - 12, 2, 12, "#e0c090"); rect(ctx, ex - 1, yy, 4, 3, "#ffffff"); }
      else { const s = (ph - 0.8) / 0.2; dot(ctx, ex - 3 - s * 4, ey - 6 - s * 3, "#ffe8a0"); dot(ctx, ex + 3 + s * 4, ey - 6 - s * 3, "#ffe8a0"); }
    }
  } else if (id === "gunner") {   // 连环炮：枪口一直在闪，弹壳往下掉
    fillEll(ctx, fx, fy + 2, R * 0.5, R * 0.4, D.color, 0.14); ring2(ctx, fx, fy + 2, R * 0.5, R * 0.4, D.color, true);
    if ((t * 20 | 0) % 2) { rect(ctx, fx + face * 12, fy - 20, 5, 3, "#ffb040"); rect(ctx, fx + face * 15, fy - 20, 3, 3, "#ffffff"); }
    for (let i = 0; i < 3; i++) { const k = (t * 3 + i / 3) % 1; dot(ctx, fx + face * (4 - k * 6), fy - 22 + k * 18, "#e0b040"); }
  } else if (id === "mech") {     // 熔炉过载：身上冒火
    fillEll(ctx, fx, fy + 2, 20, 8, "#ff8a3a", 0.25); ring2(ctx, fx, fy + 2, 18, 7, "#ff8a3a", (t * 8 | 0) % 2);
    for (let i = 0; i < 9; i++) { const k = (t * 1.7 + i / 9) % 1; rect(ctx, fx + Math.sin(i * 2.3 + t * 4) * 11, fy - 4 - k * 38, 3 - (k > 0.6 ? 1 : 0), 3, k < 0.35 ? "#ffe060" : k < 0.7 ? "#ff8a3a" : "#c02a20"); }
  } else if (id === "bard") {     // 英雄赞歌：音符往上飘；受加成的队友脚下一圈粉色
    fillEll(ctx, fx, fy + 2, R, R * 0.8, D.color, 0.1); ring2(ctx, fx, fy + 2, R, R * 0.8, D.color, true);
    for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; SK_NOTE(R0(fx + Math.sin(t * 3 + i * 2) * 10 + (i - 1) * 9), R0(fy - 22 - k * 38), k < 0.7 ? D.color : "#ffd0e0"); }
    for (const a of S.units) if (a !== u && !a.dead && a.down <= 0 && dist(u, a) <= uRange(u)) { const [ax, ay] = unitFeet(a); ring2(ctx, ax, ay, 11, 4, D.color, true); }
  } else if (id === "marshal") {  // 不退之令：金色光环 + 往上飘的光点
    fillEll(ctx, fx, fy, 20, 8, D.color, 0.25); ring2(ctx, fx, fy, 18, 7, D.color, (t * 8 | 0) % 2); ring2(ctx, fx, fy, 13, 4, "#ffffff", true);
    for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i / 6) % 1; rect(ctx, fx - 14 + i * 5, fy - k * 50, 3, 3, k < 0.7 ? D.color : "#ffffff"); }
  } else if (id === "counter") {  // 共鸣震击：青色六角护罩，转着的小方块
    fillEll(ctx, fx, fy - 14, 18, 23, D.color, 0.2); ring2(ctx, fx, fy - 14, 17, 21, D.color, (t * 7 | 0) % 2);
    for (let i = 0; i < 6; i++) { const a = t * 2.4 + i * 1.047; rect(ctx, fx + Math.cos(a) * 17, fy - 14 + Math.sin(a) * 21, 3, 3, i % 2 ? "#ffffff" : D.color); }
  } else {                        // 没有专属画面的：通用光环
    ring2(ctx, fx, fy, 17, 6, D.color, (t * 10 | 0) % 2); ring2(ctx, fx, fy, 13, 4, "#ffffff", true);
    for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i / 6) % 1; rect(ctx, fx - 14 + i * 5, fy - k * 50, 3, 3, k < 0.7 ? D.color : "#ffffff"); }
  }
}
// 头顶一条技能剩余时间的小条（颜色同技能），一眼看出还有多久
function skillBar(u, fx, fy) {
  if (!u.skillMax) return; const w = 22, k = Math.max(0, Math.min(1, u.skillT / u.skillMax)), y = fy - 78;
  rect(ctx, fx - w / 2 - 1, y - 1, w + 2, 4, "#10141c"); rect(ctx, fx - w / 2, y, Math.round(w * k), 2, u.def.color);
}
// 被不退之令加成的队友：头顶两个金色小箭头
function drawBless(fx, fy, t) {
  const b = Math.floor(t * 4) % 2;
  for (const dy of [0, 4]) { line(ctx, fx - 4, fy - 74 - dy + b, fx, fy - 78 - dy + b, "#ffe060"); line(ctx, fx + 4, fy - 74 - dy + b, fx, fy - 78 - dy + b, "#ffe060"); }
}
// 被猎杀标记盯上的敌人：红色准星（脚下一圈 + 四个角）
function drawHuntMark(fx, fy, top, t) {
  const cy = (fy + top) / 2, r = Math.max(12, (fy - top) / 2 + 3), a = t * 2;
  ring(ctx, fx, cy, r, r, "#e04a4a", false);
  for (let i = 0; i < 4; i++) { const an = a + i * 1.571; line(ctx, fx + Math.cos(an) * (r - 4), cy + Math.sin(an) * (r - 4), fx + Math.cos(an) * (r + 5), cy + Math.sin(an) * (r + 5), "#ff8a8a"); }
}

// ---- 瞬发型：放招时加一次性的范围特效 ----
function addFxLater(f, delay) { addFx(f); f.t = -delay; }   // f.t < 0 时 drawFx 先不画，到点再出现
function skillFx(u, D, R) {
  const id = D.id;
  if (id === "frost") addFx({ kind: "skfx", id: "frost", x: u.x, y: u.y, r: R, life: 1.7 });
  else if (id === "mage") {
    let n = 0; for (const e of S.enemies) { if (n >= 7) break; if (!hittable(e) || dist(u, e) > R) continue; n++;
      addFxLater({ kind: "meteor", x: e.x, y: e.y, life: 0.5, color: D.color }, n * 0.07);
      addFxLater({ kind: "boom", x: e.x, y: e.y, r: 0.9, color: D.color, life: 0.5 }, 0.5 + n * 0.07); }
  } else if (id === "lancer") addFx({ kind: "skfx", id: "lance", x: u.x, y: u.y, face: u.face, r: R, color: D.color, life: 0.35 });
  else if (id === "priest") { for (const a of S.units) if (alive(a) && dist(u, a) <= R) addFx({ kind: "pillar", x: a.x, y: a.y, color: "#f2d27a", life: 0.9 }); }
  else if (id === "chrono") addFx({ kind: "skfx", id: "clock", x: u.x, y: u.y, r: R * (br(u, "chrono", "B") ? 2 : 1), life: 1.3 });
  else if (id === "songstress") addFx({ kind: "skfx", id: "tide", x: u.x, y: u.y, life: 1.3 });
  else if (id === "breaker") {
    addFx({ kind: "skfx", id: "cross", x: u.x, y: u.y, r: 1, life: 0.3 });
    let n = 0; for (const e of S.enemies) { if (n >= 6) break; if (!hittable(e) || e.d.flying || dist(u, e) > 2.2) continue; n++; addFx({ kind: "skfx", id: "cross", x: e.x, y: e.y, r: 0.6, life: 0.3 }); }
  } else if (id === "summoner") addFx({ kind: "skfx", id: "rune", x: u.x, y: u.y, r: 1.3, life: 1.2 });
  else if (id === "alchemist") { const at = densest(u, R); if (at) addFx({ kind: "skfx", id: "bottle", x: u.x, y: u.y, tx: at[0], ty: at[1], life: 0.45 }); }
  else if (id === "knight") addFx({ kind: "skfx", id: "dome", x: u.x, y: u.y, life: 0.6 });
}
function drawSkFx(f, k, t) {
  const [x, y] = tpx(f.x, f.y), a = Math.min(1, (1 - k) * 2.2);
  if (f.id === "frost") {         // 冰封领域：范围里下一场暴风雪，冰晶一根根长出来
    const Rp = f.r * T;
    fillEll(ctx, x, y + 8, Rp, Rp * 0.8, "#bfeaff", 0.28 * a); ctx.globalAlpha = a;
    ring2(ctx, x, y + 8, Rp, Rp * 0.8, "#e8fbff", false);
    for (let i = 0; i < 40; i++) {
      const ang = i * 2.4 + t * 3.5 * (1 + (i % 3) * 0.3), rr = ((i * 53) % 100) / 100 * Rp * 0.95, fall = (t * 70 + i * 17) % 44;
      rect(ctx, x + Math.cos(ang) * rr, y + 8 + Math.sin(ang) * rr * 0.8 - 22 + fall, 3, 3, i % 3 ? "#ffffff" : "#bfeaff");
    }
    for (let i = 0; i < 8; i++) {
      const ang = i * 0.79 + 0.3, rr = Rp * (0.3 + ((i * 37) % 55) / 100), cx = x + Math.cos(ang) * rr, cy = y + 8 + Math.sin(ang) * rr * 0.8, h = Math.min(1, k * 4) * (10 + (i % 3) * 5);
      rect(ctx, cx - 1, cy - h, 3, h, "#cfefff"); rect(ctx, cx + 1, cy - h + 3, 1, Math.max(0, h - 3), "#7ac0e8"); rect(ctx, cx, cy - h - 2, 1, 2, "#ffffff");
    }
    ctx.globalAlpha = 1;
  } else if (f.id === "lance") {  // 龙枪突刺：朝面向的方向一道长长的枪光
    const [dx, dy] = vdir(f.face || 1, 0), L = f.r * T * Math.min(1, k * 5 + 0.2), x0 = x, y0 = y - 14;
    ctx.globalAlpha = a; line(ctx, x0, y0, x0 + dx * L, y0 + dy * L, f.color, 5); line(ctx, x0, y0, x0 + dx * L, y0 + dy * L, "#ffffff", 2);
    const [px, py] = [-dy, dx]; for (const s of [-1, 1]) line(ctx, x0 + dx * L, y0 + dy * L, x0 + dx * (L - 9) + px * 6 * s, y0 + dy * (L - 9) + py * 6 * s, "#ffffff", 2);
    ctx.globalAlpha = 1;
  } else if (f.id === "clock") {  // 停滞领域：范围里浮出一个钟面，指针飞转
    const Rp = f.r * T; ctx.globalAlpha = a;
    fillEll(ctx, x, y + 8, Rp, Rp * 0.8, "#7ae0d0", 0.2 * a); ring2(ctx, x, y + 8, Rp, Rp * 0.8, "#7ae0d0", false);
    for (let i = 0; i < 12; i++) { const an = i * 0.5236; rect(ctx, x + Math.cos(an) * Rp * 0.9, y + 8 + Math.sin(an) * Rp * 0.72, 3, 3, i % 3 ? "#bff8ee" : "#ffffff"); }
    const h1 = k * 25, h2 = k * 2.1; line(ctx, x, y + 8, x + Math.cos(h1) * Rp * 0.75, y + 8 + Math.sin(h1) * Rp * 0.6, "#ffffff", 2); line(ctx, x, y + 8, x + Math.cos(h2) * Rp * 0.5, y + 8 + Math.sin(h2) * Rp * 0.4, "#7ae0d0", 2);
    ctx.globalAlpha = 1;
  } else if (f.id === "tide") {   // 退潮：一道水墙从左扫到右，后面留一层水花
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    for (let r = 0; r < 3; r++) for (let yy = 0; yy <= 9; yy += 0.32) {
      const xx = k * 18 - 1.5 - r * 0.5 + Math.sin(yy * 2.1 + t * 9 + r) * 0.22, [px, py] = tpx(xx, yy);
      rect(ctx, px, py, 4 - r, 4 - r, r === 0 ? "#e8fbff" : r === 1 ? "#58b8e8" : "#2a78b0");
    }
    ctx.globalAlpha = 1;
  } else if (f.id === "cross") {  // 截断：交叉的两道斩光
    const s = Math.min(1, k * 4 + 0.3) * f.r * T * 0.55; ctx.globalAlpha = a;
    line(ctx, x - s, y - s - 6, x + s, y + s - 6, "#ffffff", 3); line(ctx, x + s, y - s - 6, x - s, y + s - 6, "#8a96e0", 3);
    ctx.globalAlpha = 1;
  } else if (f.id === "rune") {   // 石像守卫：地上浮出一个符文阵
    const Rp = f.r * T; ctx.globalAlpha = a;
    ring(ctx, x, y + 8, Rp, Rp * 0.8, "#e8c070", false); ring(ctx, x, y + 8, Rp * 0.65, Rp * 0.52, "#b8845a", true);
    for (let i = 0; i < 8; i++) { const an = t * 1.5 + i * 0.785; rect(ctx, x + Math.cos(an) * Rp * 0.82, y + 8 + Math.sin(an) * Rp * 0.66, 3, 3, i % 2 ? "#ffe8a0" : "#b8845a"); }
    for (let i = 0; i < 3; i++) { const an = -t * 2 + i * 2.094; line(ctx, x + Math.cos(an) * Rp * 0.65, y + 8 + Math.sin(an) * Rp * 0.52, x + Math.cos(an + 2.094) * Rp * 0.65, y + 8 + Math.sin(an + 2.094) * Rp * 0.52, "#e8c070"); }
    ctx.globalAlpha = 1;
  } else if (f.id === "bottle") { // 强酸瓶：绿色瓶子抛过去
    const [tx, ty] = tpx(f.tx, f.ty), px = x + (tx - x) * k, py = y - 14 + (ty - y + 14) * k - Math.sin(k * Math.PI) * 38;
    rect(ctx, px - 2, py - 3, 5, 6, "#60e080"); rect(ctx, px - 1, py - 5, 3, 2, "#ffffff"); dot(ctx, px - 1, py - 1, "#d8ffe0");
    for (let i = 1; i < 4; i++) dot(ctx, px - (tx - x) * 0.03 * i, py + 2 * i, "rgba(160,240,120,.6)");
  } else if (f.id === "dome") {   // 圣盾誓约：罩子从身上撑开
    const r = 10 + k * 22; ctx.globalAlpha = a;
    ring(ctx, x, y - 4, r, r * 1.2, "#cfe4ff", false); ring(ctx, x, y - 4, r - 2, r * 1.2 - 2, "#8fb3e0", true);
    ctx.globalAlpha = 1;
  }
}

// 所有技能光环统一在角色和敌人都画完之后画（盖在最上面，不被前排的怪挡住）
function drawSkillAuras(now) {
  const t = now / 1000;
  for (const u of S.units) {
    if (u.dead || u.down > 0 || u.summon) continue;
    const [fx, fy] = unitFeet(u);
    if (u.skillT > 0) drawSkillAura(u, fx, fy, t);
    if (u.blessT > 0) drawBless(fx, fy, t);
  }
}
