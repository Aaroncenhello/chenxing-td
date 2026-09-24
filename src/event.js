
// ================= 10.0：局内事件（每隔几波来一次三选一） =================
// 和商店错开：商店每 4 波，事件每 5 波
const EVENT_EVERY = 5;
const EVENTS = [
  { id: "altar", name: "废弃的祭坛", text: "石台上刻着三行字，风一吹只亮起其中一行。",
    opts: [
      { name: "献上鲜血", desc: "全队攻击 +30%，但生命上限 −15%", on: () => { buffAll({ atk: 1.3, hp: 0.85 }); } },
      { name: "献上时间", desc: "晨星碑回复 25% 生命，但下一波提前 4 秒到来", on: () => { healCrystal(0.25); S.nextWaveIn = Math.max(0.5, S.nextWaveIn - 4); } },
      { name: "献上记忆", desc: "随机忘掉一张已有的卡，换来一张稀有卡", on: () => { forgetCard(); S.forceRare = 1; S.pending++; } },
    ] },
  { id: "caravan", name: "迷路的商队", text: "几辆破车陷在泥里，车夫警惕地看着你们。",
    opts: [
      { name: "买下全部货物", cost: 120, desc: "花 120 星尘，换一张稀有及以上的卡", on: () => { S.dust -= 120; S.forceRare = 1; S.pending++; } },
      { name: "抢过来", desc: "得到 180 星尘，但全队生命 −25%（不会倒下）", on: () => { S.dust += 180; for (const u of S.units) u.hp = Math.max(1, u.hp * 0.75); } },
      { name: "护送他们", desc: "下一波敌人 +40%，事后得到 120 星尘和一次翻牌", on: () => { S.nextWaveK = 1.4; S.dust += 120; S.pending++; } },
    ] },
  { id: "armory", name: "古代武器库", text: "锈死的门后面，三个架子还剩一点东西。",
    opts: [
      { name: "拿走利刃", desc: "全队攻击 +18%，攻速 +8%", on: () => { buffAll({ atk: 1.18, aspd: 1.08 }); } },
      { name: "拿走护甲", desc: "全队防御 +45%、生命上限 +12%", on: () => { buffAll({ def: 1.45, hp: 1.12 }); } },
      { name: "拿走符文", desc: "自动技能冷却 −22%，技力回复 +25%", on: () => { buffAll({ cd: 0.78, sp: 1.25 }); } },
    ] },
  { id: "traveler", name: "倒下的旅人", text: "她还有气，手里攥着一枚旧徽章。",
    opts: [
      { name: "救她", cost: 60, desc: "花 60 星尘，随机一名伙伴加入队伍", need: () => S.allies < maxAllies() && freeAllies().length > 0,
        on: () => { S.dust -= 60; const list = freeAllies(); addUnit(list[Math.floor(roll("ev") * list.length)]); } },
      { name: "取走徽章", desc: "立刻翻一张牌", on: () => { S.pending++; } },
      { name: "埋葬她", desc: "全队回满生命并立刻站起，晨星碑回复 15%", on: () => { for (const u of S.units) { if (u.down > 0) reviveUnit(u); u.hp = u.maxHp; } healCrystal(0.15); } },
    ] },
  { id: "rift", name: "深渊裂缝", text: "地上裂开一道缝，里面有东西在看着你们。",
    opts: [
      { name: "封住它", desc: "接下来 3 波敌人移动速度 −25%", on: () => { S.slowWaves = 3; } },
      { name: "往里看一眼", desc: "立刻翻 1 张牌，但接下来 2 波敌人 +40%", on: () => { S.pending++; S.nextWaveK = 1.4; S.nextWaveK2 = 1.4; } },
      { name: "把它引出来", desc: "马上刷一小队精英，打完得 150 星尘", on: () => { riftRaid(); } },
    ] },
  { id: "observe", name: "星语者的观测台", text: "一台还能转的旧仪器，镜片对准三个方向。",
    opts: [
      { name: "观测敌人", desc: "接下来 4 波敌人移动速度 −20%，且受到的伤害 +10%", on: () => { S.slowWaves = 4; S.weakWaves = 4; } },
      { name: "观测自己", desc: "全队技力回复 +45%，出场立刻攒满一半技力", on: () => { buffAll({ sp: 1.45 }); for (const u of S.units) if (!u.summon) u.sp = Math.max(u.sp, u.def.sp * 0.5); } },
      { name: "观测星辰", desc: "晨星之力立刻充满，之后充能 +30%", on: () => { S.star = ULT.max; S.ultK = (S.ultK || 1) * 1.3; } },
    ] },
  { id: "drill", name: "临时训练场", text: "半个下午的空档，够练一件事。",
    opts: [
      { name: "磨练前排", desc: "阶级最低的 2 名前排角色升 1 阶", need: () => S.units.some(u => !u.summon && u.def.place === "ground" && u.lv < 4), on: () => { levelUpSome(u => u.def.place === "ground", 2); } },
      { name: "磨练后排", desc: "阶级最低的 2 名后排角色升 1 阶", need: () => S.units.some(u => !u.summon && u.def.place === "high" && u.lv < 4), on: () => { levelUpSome(u => u.def.place === "high", 2); } },
      { name: "磨练自己", desc: "英雄升 1 阶并回满生命，全队回复 30% 生命", on: () => { levelUpSome(u => u.hero); for (const u of S.units) heal(u, u.maxHp * 0.3, true, null); } },
    ] },
  { id: "chest", name: "带锁的宝箱", text: "锁眼里还插着半截钥匙。",
    opts: [
      { name: "撬开", cost: 110, desc: "花 110 星尘，翻 1 张牌并回复晨星碑 10%", on: () => { S.dust -= 110; S.pending++; healCrystal(0.1); } },
      { name: "砸开", desc: "晨星碑 −8% 生命，换一张稀有卡和 120 星尘", on: () => { S.crystal.hp = Math.max(1, S.crystal.hp - S.crystal.maxHp * 0.08); S.forceRare = 1; S.pending++; S.dust += 120; } },
      { name: "不碰它", desc: "把它搬回碑下，+60 星尘，晨星碑回 10%", on: () => { S.dust += 60; healCrystal(0.1); } },
    ] },
  { id: "relic", name: "战场遗迹", text: "古代守阵的机关还在，只是坏了一半。",
    opts: [
      { name: "修好机关", desc: "本关机关伤害 +90%", need: () => (S.haz || []).length > 0, on: () => { S.hazK = (S.hazK || 1) * 1.9; } },
      { name: "拆掉机关", desc: "机关全部停下，换全队攻击 +15%", need: () => (S.haz || []).length > 0, on: () => { S.haz = []; S.gate = null; buffAll({ atk: 1.15 }); } },
      { name: "改造机关", desc: "机关命中的敌人额外减速 35%，持续 3 秒", need: () => (S.haz || []).length > 0, on: () => { S.hazSlow = true; } },
    ] },
  { id: "whisper", name: "低语", text: "没有人说话，但每个人都听见了同一句。",
    opts: [
      { name: "听下去", desc: "随机接受一道诅咒，换一张稀有卡和 100 星尘", need: () => cursePool().length > 0, on: () => { const cp = cursePool(); pickCard(cp[Math.floor(roll("ev") * cp.length)].id, true); S.forceRare = 1; S.pending++; S.dust += 100; } },
      { name: "捂住耳朵", desc: "全队回满生命，损失 60 星尘", on: () => { S.dust = Math.max(0, S.dust - 60); for (const u of S.units) { if (u.down > 0) reviveUnit(u); u.hp = u.maxHp; } } },
      { name: "念出自己的名字", desc: "洗掉身上一道诅咒；没有诅咒就 +140 星尘", on: () => { const ids = Object.keys(S.curses || {}); if (ids.length) { const id = ids[Math.floor(roll("ev") * ids.length)]; delete S.curses[id]; for (const u of S.units) { u.maxHp = uMaxHp(u); u.hp = Math.min(u.hp, u.maxHp); } addFx({ kind: "banner", text: "洗掉了 · " + CURSE_BY[id].name, life: 1.8 }); } else S.dust += 140; } },
    ] },
];
const EVENT_BY = Object.fromEntries(EVENTS.map(e => [e.id, e]));

// ---------- 事件用到的小工具 ----------
function buffAll(o) {
  const b = S.buff;
  for (const k in o) b[k] = (b[k] || 1) * o[k];
  for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.max(1, Math.round(u.maxHp * f)); }
}
function healCrystal(k) {
  S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * k);
  addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: "#62b4ff", life: 0.9 });
}
function forgetCard() {
  const ids = Object.keys(S.cards).filter(id => CARD_BY[id]);
  if (!ids.length) return;
  const id = ids[Math.floor(roll("ev") * ids.length)];
  S.cards[id]--; if (S.cards[id] <= 0) delete S.cards[id];
  addFx({ kind: "text", x: CRYSTAL.x, y: CRYSTAL.y - 1.2, text: "忘掉了 · " + CARD_BY[id].name, color: "#9aa0b4", life: 1.6, big: true });
  for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.max(1, Math.round(u.maxHp * f)); }
  updateSyn();
}
const freeAllies = () => UNITS.filter(D => S.charOpen.includes(D.id) && !S.units.some(u => u.def === D));
function levelUpSome(pred, max) {
  let n = 0;
  const list = [...S.units].filter(u => !u.summon && pred(u) && u.lv < 4).sort((a, b) => a.lv - b.lv);
  for (const u of (max ? list.slice(0, max) : list)) {
    if (u.lv >= 4) continue;
    u.lv++; n++;
    const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.round(Math.min(u.maxHp, (f + 0.3) * u.maxHp));
    addFx({ kind: "pillar", x: u.x, y: u.y, color: "#ffd860", life: 0.8 });
    addFx({ kind: "text", x: u.x, y: u.y - 0.7, text: u.lv + " 阶", color: "#ffd860", life: 1.2, big: true });
  }
  if (!n) S.dust += 60;
  arrange();
}
function riftRaid() {
  const pool = ST.pool.filter(p => S.wave >= p[2]).sort((a, b) => b[1] - a[1]);
  const type = (pool[0] || ["orc"])[0];
  for (let i = 0; i < 4; i++) {
    const p = PORTALS[Math.floor(roll("ev") * Math.max(1, PORTALS.length))] || { x: 1, y: 1 };
    spawnAt(type, p.x, p.y, true).hitT = 0.2;
  }
  S.riftDust = 150;
  addFx({ kind: "banner", text: "裂缝里冲出了精英！", life: 2, danger: true });
}

// ---------- 流程 ----------
const eventAt = w => Math.floor(w / EVENT_EVERY) * EVENT_EVERY;
function eventDue(w) {
  const at = eventAt(w);
  return at > 0 && at % SHOP.everyWaves !== 0 && S.eventWave < at && !S.endless;
}
function openEvent() {
  if (S.over || S.event || S.shop) return;
  const pool = EVENTS.filter(e => !S.eventsDone.includes(e.id));
  const src = pool.length ? pool : EVENTS;
  const def = src[Math.floor(roll("ev") * src.length)];
  const opts = def.opts.filter(o => (!o.need || o.need()) && (!o.cost || S.dust >= o.cost));
  if (opts.length < 2) { S.eventWave = eventAt(S.wave); return; }   // 选项不够就跳过
  S.event = { def, opts };
  S.eventWave = eventAt(S.wave);
}
function takeEvent(i) {
  if (!S.event) return false;
  const o = S.event.opts[i]; if (!o) return false;
  if (o.cost && S.dust < o.cost) return false;
  try { o.on(); } catch (e) { }
  S.eventsDone.push(S.event.def.id);
  addFx({ kind: "banner", text: S.event.def.name + " · " + o.name, life: 1.6 });
  S.event = null;
  S.nextWaveIn = Math.min(S.nextWaveIn, 4);
  updateSyn();
  return true;
}
