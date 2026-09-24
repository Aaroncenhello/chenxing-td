
// ================= 11.0：天赋星盘 / 深渊层数 / 每周挑战 =================

// ---------- 天赋星盘：四条线，每个节点能升多级；最后一个「星辉」没有上限 ----------
// cost(lv) = base + step * lv（lv 从 0 开始，买第 1 级花 base）
const DISK_LINES = [
  { id: "atk", name: "攻击", color: "#ff7a6a" },
  { id: "def", name: "守护", color: "#62b4ff" },
  { id: "eco", name: "经济", color: "#ffd860" },
  { id: "arc", name: "奥术", color: "#c890ff" },
];
const DISK = [
  { id: "atk", line: "atk", name: "锋芒", max: 10, base: 2, step: 1, desc: lv => `全队攻击 +${3 * lv}%`, per: "每级攻击 +3%" },
  { id: "aspd", line: "atk", name: "迅捷", max: 8, base: 2, step: 1, desc: lv => `全队攻击速度 +${2 * lv}%`, per: "每级攻速 +2%" },
  { id: "crit", line: "atk", name: "会心", max: 5, base: 3, step: 1, desc: lv => `全队暴击几率 +${2 * lv}%（暴击造成 2 倍伤害）`, per: "每级暴击 +2%" },
  { id: "boss", line: "atk", name: "屠龙", max: 6, base: 3, step: 1, desc: lv => `全队对精英怪和首领造成的伤害 +${5 * lv}%`, per: "每级 +5%" },
  { id: "walls", line: "def", name: "碑座", max: 10, base: 2, step: 1, desc: lv => `晨星碑（中间要守的石碑）生命上限 +${6 * lv}%`, per: "每级 +6%" },
  { id: "hp", line: "def", name: "体魄", max: 10, base: 2, step: 1, desc: lv => `全队生命上限 +${4 * lv}%`, per: "每级 +4%" },
  { id: "armor", line: "def", name: "铁壁", max: 6, base: 2, step: 1, desc: lv => `全队防御 +${5 * lv}%（受到的物理伤害更少）`, per: "每级 +5%" },
  { id: "rally", line: "def", name: "急救", max: 6, base: 2, step: 1, desc: lv => `角色倒下后重新站起来的时间 −${6 * lv}%`, per: "每级 −6%" },
  { id: "merchant", line: "eco", name: "商路", max: 5, base: 2, step: 1, desc: lv => `开局多带 ${10 * lv} 星尘，波间商店价格 −${4 * lv}%`, per: "每级 +10 星尘、−4% 价格" },
  { id: "bounty", line: "eco", name: "求知", max: 6, base: 3, step: 1, desc: lv => `局内打怪获得的经验 +${4 * lv}%（升级更快、翻牌更多）`, per: "每级 +4%" },
  { id: "reroll", line: "eco", name: "运筹", max: 4, base: 3, step: 2, desc: lv => `翻牌时的重抽次数每局 +${lv}`, per: "每级 +1 次" },
  { id: "lucky", line: "eco", name: "时运", max: 5, base: 3, step: 1, desc: lv => `翻牌时稀有卡、传说卡出现的几率 +${8 * lv}%`, per: "每级 +8%" },
  { id: "mentor", line: "eco", name: "名师", max: 5, base: 2, step: 1, desc: lv => `一局结束时角色得到的养成经验 +${15 * lv}%`, per: "每级 +15%" },
  { id: "arcane", line: "arc", name: "法术精通", max: 6, base: 2, step: 1, desc: lv => `手动法术（陨星术、圣愈之光）冷却时间 −${5 * lv}%`, per: "每级 −5%" },
  { id: "ult", line: "arc", name: "星能", max: 5, base: 3, step: 1, desc: lv => `晨星之力（全屏大招）充能速度 +${6 * lv}%`, per: "每级 +6%" },
  { id: "supply", line: "arc", name: "开局补给", max: 2, base: 5, step: 4, desc: lv => `开局直接白送 ${lv} 张随机升级卡`, per: "每级 +1 张" },
  { id: "prep", line: "arc", name: "有备而来", max: 2, base: 5, step: 4, desc: lv => `开局多翻 ${lv} 次牌（自己挑）`, per: "每级 +1 次" },
  { id: "relic", line: "arc", name: "寻宝", max: 4, base: 3, step: 2, desc: lv => `击败精英、首领时掉落遗物的几率 +${10 * lv}%`, per: "每级 +10%" },
  // 核心天赋：每条线的终点。本线投入够 KEY_NEED 级才能点，整个星盘最多点亮 KEY_MAX 个（重置星盘可以换）
  { id: "ks_atk", line: "atk", key: true, name: "连锁星芒", max: 1, base: 40, step: 0, desc: () => "暴击时，再对附近另一个敌人造成这一击 50% 的伤害" },
  { id: "ks_def", line: "def", key: true, name: "不灭之碑", max: 1, base: 40, step: 0, desc: () => "晨星碑第一次被打碎时以 40% 生命复活（每局一次，可以和凤凰羽叠加）" },
  { id: "ks_eco", line: "eco", key: true, name: "点金", max: 1, base: 40, step: 0, desc: () => "每打完 5 波，额外翻一次牌并获得 30 星尘" },
  { id: "ks_arc", line: "arc", key: true, name: "星辰共鸣", max: 1, base: 40, step: 0, desc: () => "放出晨星爆发后 10 秒内，全队技力回复 ×2，自动技能冷却加快 50%" },
  { id: "star", line: "all", name: "星辉", max: 9999, base: 6, step: 1, desc: lv => `全队攻击、生命 +${lv}%（没有上限）`, per: "每级攻击、生命 +1%" },
];
const DISK_BY = Object.fromEntries(DISK.map(n => [n.id, n]));
const KEY_NEED = 12, KEY_MAX = 2;
const diskLineLv = (disk, line) => DISK.filter(n => n.line === line && !n.key).reduce((a, n) => a + ((disk || {})[n.id] || 0), 0);
const diskKeys = disk => DISK.filter(n => n.key && (disk || {})[n.id]).length;
// 能不能再升一级：满级 / 星星不够 / 核心天赋的前置条件
function diskCanBuy(disk, id, left) {
  const n = DISK_BY[id], lv = (disk || {})[id] || 0;
  if (!n || lv >= n.max || left < diskCost(id, lv)) return false;
  if (n.key && (diskLineLv(disk, n.line) < KEY_NEED || diskKeys(disk) >= KEY_MAX)) return false;
  return true;
}
const diskCost = (id, lv) => { const n = DISK_BY[id]; return n.base + n.step * lv; };
const diskSpent = disk => Object.entries(disk || {}).reduce((s, [id, lv]) => { if (!DISK_BY[id]) return s; for (let i = 0; i < lv; i++) s += diskCost(id, i); return s; }, 0);
// 局内读取：本局带进来的星盘等级
const dk = id => (S && S.disk && S.disk[id]) || 0;

// ---------- 深渊层数：逐层叠加，打到第 N 层就同时生效 1..N 层的所有规则 ----------
const ABYSS = [
  { name: "锐化", desc: "敌人生命 +12%" },
  { name: "精锐", desc: "更多敌人变成精英" },
  { name: "凶暴", desc: "敌人攻击 +12%" },
  { name: "首领之怒", desc: "首领多带一条词缀" },
  { name: "赤手", desc: "开局少翻一次牌" },
  { name: "急行", desc: "敌人移动速度 +10%" },
  { name: "高价", desc: "商店价格 +25%" },
  { name: "坚甲", desc: "敌人生命再 +15%" },
  { name: "双重词缀", desc: "精英必定带 2 条词缀" },
  { name: "碎碑", desc: "晨星碑生命 −20%" },
  { name: "迟钝", desc: "升级所需经验 +15%" },
  { name: "拮据", desc: "重抽次数 −2" },
  { name: "暴怒", desc: "敌人攻击再 +15%" },
  { name: "增援", desc: "每波额外多来 2 只精英" },
  { name: "重伤", desc: "角色复活时间 +50%" },
  { name: "巨像", desc: "敌人生命再 +20%" },
  { name: "失语", desc: "陨星术、圣愈之光冷却 +30%" },
  { name: "王者", desc: "首领生命 +30%" },
  { name: "钢铁", desc: "敌人防御、法抗 +20%" },
  { name: "末日", desc: "晨星碑受到的伤害 +30%" },
];
const ABYSS_MAX = ABYSS.length;
const ab = n => !!(S && S.abyss >= n);
// 汇总成 diffK 的乘数
function abyssK(layer) {
  const k = { hp: 1, atk: 1, elite: 0 };
  if (layer >= 1) k.hp *= 1.12;
  if (layer >= 2) k.elite += 0.06;
  if (layer >= 3) k.atk *= 1.12;
  if (layer >= 8) k.hp *= 1.15;
  if (layer >= 13) k.atk *= 1.15;
  if (layer >= 16) k.hp *= 1.2;
  return k;
}
// 每一层首次通关给的星星：越深越多
const abyssStars = layer => 1 + Math.floor(layer / 5);

// ---------- 每周挑战：按周固定关卡、英雄池和 3 条规则 ----------
const WEEK_RULES = [
  { id: "glass", name: "玻璃大炮", desc: "全队攻击 ×2，生命 ×0.5" },
  { id: "rush", name: "急行军", desc: "敌人移动速度 +30%，经验 +30%" },
  { id: "poor", name: "穷困", desc: "星尘获取 −50%" },
  { id: "noshop", name: "荒野", desc: "没有商店，每 4 波改成白送一次翻牌" },
  { id: "relics", name: "寻宝者", desc: "开局就带 3 件随机遗物" },
  { id: "cursed", name: "诅咒之日", desc: "开局就背着 2 道随机诅咒" },
  { id: "giants", name: "巨人国", desc: "敌人数量 −30%，但生命 +70%" },
  { id: "magic", name: "奥术学院", desc: "只有法术伤害的角色和治疗能上场" },
  { id: "melee", name: "肉搏", desc: "只有前排角色能上场" },
  { id: "elite", name: "精英日", desc: "敌人有 25% 几率变成精英" },
  { id: "swarm", name: "虫群", desc: "敌人数量 +60%，生命 −35%" },
  { id: "nospell", name: "静默", desc: "不能使用陨星术和圣愈之光" },
];
const WEEK_BY = Object.fromEntries(WEEK_RULES.map(r => [r.id, r]));
const WEEK_STARS = 5;
const wk = id => !!(S && S.week && S.week.rules.includes(id));
function weekInfo() {
  const now = new Date(), t0 = Date.UTC(2026, 0, 5);   // 2026-01-05 是周一
  const n = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - t0) / (7 * 864e5));
  const R = seeded(90001 + n * 7919);
  const bag = WEEK_RULES.slice(), rules = [];
  while (rules.length < 3 && bag.length) {
    const r = bag.splice(Math.floor(R() * bag.length), 1)[0];
    if ((r.id === "magic" && rules.includes("melee")) || (r.id === "melee" && rules.includes("magic"))) continue;
    if ((r.id === "giants" && rules.includes("swarm")) || (r.id === "swarm" && rules.includes("giants"))) continue;
    rules.push(r.id);
  }
  const stage = 4 + Math.floor(R() * (STAGES.length - 4));
  return { n, key: "W" + n, seed: 5000 + n * 131, stage, rules, diff: 1 };
}
// 规则限制的英雄池
const weekAllows = (D, rules) => !(rules.includes("magic") && !(D.dmg === "magic" || D.dmg === "heal")) && !(rules.includes("melee") && D.place !== "ground");
