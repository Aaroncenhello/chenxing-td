
// ================= 10.0：精英词缀 =================
// 精英和首领会随机带 1–2 条词缀，让每次遭遇都不太一样
const AFFIX = [
  { id: "regen", name: "再生", desc: "每秒回复 2% 生命", color: "#7ee89c" },
  { id: "warded", name: "护符", desc: "法抗 +35", color: "#c890ff" },
  { id: "thorns", name: "尖刺", desc: "近战打它会被反弹 18% 伤害", color: "#a8d848" },
  { id: "frenzy", name: "狂怒", desc: "血越少出手越快（最多快一倍）", color: "#ff6a5a" },
  { id: "warcry", name: "战号", desc: "周围的敌人攻击 +25%、移速 +15%", color: "#ffb040" },
  { id: "vampiric", name: "汲血", desc: "造成伤害的 40% 回复自己", color: "#e0486a" },
  { id: "volatile", name: "爆裂", desc: "死的时候会炸一下", color: "#ff8a3a" },
  { id: "swift", name: "疾行", desc: "移速 +35%，不怕减速", color: "#8fe0f0" },
  { id: "bulwark", name: "护壁", desc: "自带护盾，破了还会再生一层", color: "#8ac8ff" },
  { id: "splitting", name: "分裂", desc: "死的时候裂成两只小怪", color: "#58b84a" },
];
const AFFIX_BY = Object.fromEntries(AFFIX.map(a => [a.id, a]));
const hasAfx = (e, id) => !!(e.afx && e.afx.includes(id));
// 首领和越后面的波次更容易带 2 条
function rollAffix(e) {
  if (!e.elite && !isBoss(e)) return;
  if (S.mod === "solo") return;
  const n = isBoss(e) ? (ab(4) ? 3 : 2) : ab(9) ? 2 : (S.wave >= 8 || S.vigil || S.endless) && roll("afx") < 0.45 ? 2 : 1;
  const bag = AFFIX.slice();
  e.afx = [];
  for (let i = 0; i < n && bag.length; i++) {
    const a = bag.splice(Math.floor(roll("afx") * bag.length), 1)[0];
    if (a.id === "splitting" && (isBoss(e) || e.d.split)) continue;
    if (a.id === "swift" && e.d.unstoppable) continue;
    e.afx.push(a.id);
  }
  if (hasAfx(e, "bulwark")) { e.shield += Math.round(e.maxHp * 0.25); e.maxShield = Math.max(e.maxShield, e.shield); e.afxWard = 1; }
  for (const id of e.afx) if (!S.afxSeen.includes(id)) S.afxSeen.push(id);
  if (e.afx.length) addFx({ kind: "text", x: e.x, y: e.y - 1.1, text: e.afx.map(id => AFFIX_BY[id].name).join(" · "), color: AFFIX_BY[e.afx[0]].color, life: 1.6, big: true });
}
const afxNames = e => (e.afx || []).map(id => AFFIX_BY[id].name).join(" · ");
// 战号光环：每帧算一次，别在取值函数里做 O(n²)
function afxAuras() {
  let any = false;
  for (const e of S.enemies) { if (e.warcry) e.warcry = 0; if (hasAfx(e, "warcry") && !e.dead) any = true; }
  if (!any) return;
  for (const a of S.enemies) {
    if (!hasAfx(a, "warcry") || a.dead) continue;
    for (const e of S.enemies) if (!e.dead && dist(a, e) <= 3) e.warcry = 1;
  }
}
// 敌人出手间隔：狂怒会越打越快
const eInt = e => e.d.interval * (hasAfx(e, "frenzy") ? Math.max(0.5, 0.5 + 0.5 * (e.hp / e.maxHp)) : 1);
const eRes = e => e.d.res * (ab(19) ? 1.2 : 1) + (hasAfx(e, "warded") ? 35 : 0);
// 每帧的词缀维护（再生、护壁再生）
function afxStep(e, dt) {
  if (!e.afx) return;
  if (hasAfx(e, "regen") && e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
  if (hasAfx(e, "bulwark") && e.afxWard > 0 && e.shield <= 0) {
    e.afxWard--; e.shield = Math.round(e.maxHp * 0.25); e.maxShield = Math.max(e.maxShield, e.shield);
    addFx({ kind: "ring", x: e.x, y: e.y, color: "#8ac8ff", life: 0.6, r0: 0.2, r1: 1.2 });
    addFx({ kind: "text", x: e.x, y: e.y - 0.9, text: "护壁重生", color: "#8ac8ff", life: 1.1 });
  }
}
// 死亡时：爆裂 / 分裂
function afxDeath(e) {
  if (!e.afx) return;
  if (hasAfx(e, "volatile")) {
    const dmg = eAtk(e) * 1.6;
    addFx({ kind: "boom", x: e.x, y: e.y, r: 1.5, color: "#ff8a3a", life: 0.5 });
    burst(e.x, e.y, "#ffb040", 24, 3.2, 0.7, 0.08);
    for (const u of [...S.units]) if (alive(u) && dist(u, e) <= 1.5) hurtUnit(u, calc(dmg, "magic", uDef(u), uRes(u)), "magic", null);
    S.shake = Math.max(S.shake, 0.25);
  }
  if (hasAfx(e, "splitting")) {
    const small = ENEMIES[e.type] && !isBoss(e) ? e.type : "slime";
    for (let i = 0; i < 2; i++) {
      const s = spawnNear(small, e, false, true);
      s.maxHp = s.hp = Math.max(1, Math.round(e.maxHp * 0.25)); s.afx = null; s.stop = 0.2; s.hitT = 0.1;
    }
  }
}
// 画在敌人头顶的小圆点
function drawAfxPips(e, fx, top) {
  if (!e.afx || !e.afx.length) return;
  const n = e.afx.length, x0 = fx - (n * 4 - 1) / 2;
  for (let i = 0; i < n; i++) {
    const c = AFFIX_BY[e.afx[i]].color;
    rect(ctx, x0 + i * 4 - 1, top - 16, 4, 4, OUT);
    rect(ctx, x0 + i * 4, top - 15, 2, 2, c);
  }
}
