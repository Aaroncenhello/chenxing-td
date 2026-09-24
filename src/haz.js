
// ================= 8.0：地图机关 =================
// vent 喷发口 / beam 旋转光束 / field 力场 / spikes 地刺圈 / gate 开合传送门
const HAZ_NAME = { vent: "喷发口", beam: "旋转光束", field: "寒气力场", spikes: "地刺阵", gate: "开合传送门" };
function initHaz(list) {
  S.haz = [];
  for (const [type, x, y, o] of (list || [])) S.haz.push({ type, x, y, ...(o || {}), t: 0, fire: 0, ang: Math.random() * 6.283, on: true });
  const g = S.haz.find(h => h.type === "gate");
  S.gate = g ? { period: g.period || 14, open: g.open || 7, t: 0 } : null;
}
// 开合传送门：按编号奇偶轮流开
function portalOpen(i) {
  if (!S.gate || PORTALS.length < 4) return true;
  const half = (S.gate.t % S.gate.period) < S.gate.open;
  return (i % 2 === 0) === half;
}
const hazSlow = e => {
  let k = 1;
  for (const h of S.haz) if (h.type === "field" && distTo(e, h.x, h.y) <= h.r) k *= 1 - h.slow;
  return k;
};
function hazStep(dt) {
  if (!S.haz || !S.haz.length) return;
  if (S.gate) S.gate.t += dt;
  const pk = powerK() * (S.hazK || 1);
  for (const h of S.haz) {
    h.t += dt; h.fire = Math.max(0, h.fire - dt);
    if (h.type === "vent") {
      if (h.t >= h.every) {
        h.t = 0; h.fire = 0.5;
        const dmg = h.dmg * pk;
        const col = h.color || "#ff8a3a";
        addFx({ kind: "boom", x: h.x, y: h.y, r: h.r, color: col, life: 0.55 });
        burst(h.x, h.y, col, 24, 3.2, 0.7, 0.08);
        for (const e of S.enemies) if (hittable(e) && distTo(e, h.x, h.y) <= h.r) {
          hurt(e, calc(dmg, "magic", eDef(e), eRes(e)), "magic", true, { key: "haz" });
          if (S.hazSlow && !e.d.unstoppable) { e.slowT = Math.max(e.slowT, 3); e.slowK = Math.min(e.slowK, 0.65); }
          if (h.kind === "ice" && !e.d.unstoppable) e.freezeT = Math.max(e.freezeT, 0.8);
          if (h.kind === "void" && !e.dead) applyCorrode(e, 0.25, 3, null);
        }
      }
    } else if (h.type === "spikes") {
      if (h.t >= h.every) {
        h.t = 0; h.fire = 0.35;
        const dmg = h.dmg * pk;
        for (const e of S.enemies) if (hittable(e) && !e.d.flying && toCrystal(e) <= h.r) hurt(e, calc(dmg, "phys", eDef(e) * 0.5, eRes(e)), "phys", false, { key: "haz" });
      }
    } else if (h.type === "beam") {
      h.ang += dt * (h.speed || 0.5);
      const dmg = h.dps * pk * dt;
      for (let i = 0; i < (h.n || 2); i++) {
        const a = h.ang + i / (h.n || 2) * Math.PI * 2;
        const ux = Math.cos(a), uy = Math.sin(a);
        for (const e of S.enemies) {
          if (!hittable(e)) continue;
          const dx = e.x - h.x, dy = e.y - h.y, proj = dx * ux + dy * uy;
          if (proj < 0.5 || proj > (h.len || 5)) continue;
          if (Math.abs(dx * -uy + dy * ux) > 0.42) continue;
          hurt(e, calc(dmg, "magic", eDef(e), eRes(e)), "magic", false, { key: "haz" });
          if (S.hazSlow && !e.d.unstoppable) { e.slowT = Math.max(e.slowT, 3); e.slowK = Math.min(e.slowK, 0.65); }
          if (Math.random() < 0.12) burst(e.x, e.y - 0.2, h.color || "#ffb040", 2, 1.4, 0.25, 0.04);
        }
      }
    }
  }
}
// ---------- 随机地图生成 ----------
const GEN_THEMES = ["forest", "snow", "lava", "grave", "desert", "sky", "cave", "abyss", "ice", "mech", "blood", "star", "ash", "ruin", "storm", "dawn"];
function genMap(rnd, theme) {
  const rows = [];
  for (let r = 0; r < ROWS; r++) rows.push(new Array(COLS).fill(r === 0 || r === ROWS - 1 ? "#" : "."));
  for (let r = 0; r < ROWS; r++) { rows[r][0] = "#"; rows[r][COLS - 1] = "#"; }
  const put = (c, r, ch) => { if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1) rows[r][c] = ch; };
  const far = (c, r) => Math.hypot(c - CRYSTAL.x, r - CRYSTAL.y) > 2.7;
  // 对称的障碍团（四向镜像）
  const style = Math.floor(rnd() * 4);
  const blocks = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < blocks; i++) {
    const c = 2 + Math.floor(rnd() * 5), r = 1 + Math.floor(rnd() * 3);
    const w = 1 + Math.floor(rnd() * 2), h = 1 + Math.floor(rnd() * 2);
    const ch = style === 1 && rnd() < 0.5 ? "~" : "#";
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) {
      const pts = [[c + dx, r + dy], [COLS - 1 - c - dx, r + dy], [c + dx, ROWS - 1 - r - dy], [COLS - 1 - c - dx, ROWS - 1 - r - dy]];
      for (const [pc, pr] of pts) if (far(pc, pr)) put(pc, pr, ch);
    }
  }
  // 传送门：上下左右边缘各挑几个
  const n = 4 + Math.floor(rnd() * 5), spots = [];
  for (let c = 2; c < COLS - 2; c++) { spots.push([c, 0]); spots.push([c, ROWS - 1]); }
  for (let r = 2; r < ROWS - 2; r++) { spots.push([0, r]); spots.push([COLS - 1, r]); }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  for (let i = 0; i < Math.min(n, spots.length); i++) { const [c, r] = spots[i]; rows[r][c] = "S"; }
  rows[CRYSTAL.y][CRYSTAL.x] = "B";
  // 随机机关
  const haz = [], hn = 1 + Math.floor(rnd() * 3);
  const HCOL = { ice: "#8fe0f0", fire: "#ff8a3a", void: "#b070ff" };
  for (let i = 0; i < hn; i++) {
    const k = Math.floor(rnd() * 4);
    if (k === 0) {
      const kind = ["ice", "fire", "void"][Math.floor(rnd() * 3)];
      for (const [vx, vy] of [[4, 2], [11, 6]]) haz.push(["vent", vx, vy, { every: 6, r: 1.5, dmg: 700, color: HCOL[kind], kind }]);
    } else if (k === 1) haz.push(["beam", 8, 4, { n: 2, speed: 0.5, len: 5, dps: 240, color: "#ffb040" }]);
    else if (k === 2) haz.push(["field", 8, 4, { r: 3.2, slow: 0.22, color: "#8fe0f0" }]);
    else haz.push(["spikes", 8, 4, { r: 2.8, every: 2.4, dmg: 300, color: "#e05a5a" }]);
  }
  return { map: rows.map(r => r.join("")), theme: theme || GEN_THEMES[Math.floor(rnd() * GEN_THEMES.length)], haz };
}
