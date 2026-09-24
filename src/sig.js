
// ================= 9.0：英雄专属卡 + 诅咒卡 =================
// 专属卡：只有把这名角色选成「本局英雄」时，她的专属卡才会进牌堆
const SIG = [
  // 伊莎贝拉 · 骑士
  { id: "sg_kn1", hero: "knight", rare: 1, kind: "special", name: "圣域壁垒", max: 3, w: 9, desc: lv => `英雄阻挡 +${lv}，受到的伤害 −${12 * lv}%` },
  { id: "sg_kn2", hero: "knight", rare: 2, kind: "skill", name: "誓约之光", max: 1, w: 7, desc: () => "英雄生命低于 50% 时展开护盾，吸收 30% 生命上限的伤害，每 15 秒一次" },
  // 赛拉 · 剑士
  { id: "sg_sw1", hero: "sword", rare: 1, kind: "stat", name: "剑风", max: 3, w: 9, desc: lv => `英雄攻速 +${15 * lv}%，攻击横扫范围 +${(0.2 * lv).toFixed(1)}` },
  { id: "sg_sw2", hero: "sword", rare: 2, kind: "special", name: "一骑当千", max: 1, w: 7, desc: () => "英雄身边每有 1 个敌人，攻击 +8%（最多 +80%）" },
  // 夜莺 · 刺客
  { id: "sg_as1", hero: "assassin", rare: 1, kind: "stat", name: "影刃", max: 3, w: 9, desc: lv => `英雄暴击率 +${15 * lv}%，暴击伤害 +${20 * lv}%` },
  { id: "sg_as2", hero: "assassin", rare: 2, kind: "special", name: "处决", max: 1, w: 7, desc: () => "英雄攻击生命低于 25% 的敌人时直接击杀（首领除外）" },
  // 蕾娜 · 枪骑士
  { id: "sg_la1", hero: "lancer", rare: 1, kind: "stat", name: "长驱", max: 3, w: 9, desc: lv => `英雄射程 +${(0.35 * lv).toFixed(2)}，攻击必定击退` },
  { id: "sg_la2", hero: "lancer", rare: 2, kind: "skill", name: "龙威", max: 1, w: 7, desc: () => "英雄每次攻击都刺穿一条直线上的所有敌人，伤害 +40%" },
  // 菲奥娜 · 弓手
  { id: "sg_ar1", hero: "archer", rare: 1, kind: "stat", name: "疾矢", max: 3, w: 9, desc: lv => `英雄多射 ${lv} 个目标，攻速 +${10 * lv}%` },
  { id: "sg_ar2", hero: "archer", rare: 2, kind: "special", name: "猎空", max: 1, w: 7, desc: () => "英雄对飞行敌人伤害翻倍，并且射程 +1.5" },
  // 薇薇安 · 法师
  { id: "sg_mg1", hero: "mage", rare: 1, kind: "stat", name: "奥术过载", max: 3, w: 9, desc: lv => `英雄法术爆炸范围 +${(0.35 * lv).toFixed(2)}，攻击 +${12 * lv}%` },
  { id: "sg_mg2", hero: "mage", rare: 2, kind: "skill", name: "连锁奥义", max: 1, w: 7, desc: () => "英雄每次攻击额外触发一次闪电链，在 4 个敌人之间跳跃" },
  // 格蕾塔 · 炮手
  { id: "sg_gu1", hero: "gunner", rare: 1, kind: "stat", name: "重装填", max: 3, w: 9, desc: lv => `英雄攻击 +${20 * lv}%，攻击间隔 −${8 * lv}%` },
  { id: "sg_gu2", hero: "gunner", rare: 2, kind: "special", name: "攻城模式", max: 1, w: 7, desc: () => "英雄炮击范围翻倍，命中的敌人眩晕 0.6 秒" },
  // 玛丽安 · 牧师
  { id: "sg_pr1", hero: "priest", rare: 1, kind: "stat", name: "圣恩", max: 3, w: 9, desc: lv => `治疗量 +${25 * lv}%，同时治疗目标 +${lv}` },
  { id: "sg_pr2", hero: "priest", rare: 2, kind: "special", name: "守护之愿", max: 1, w: 7, desc: () => "被英雄治疗过的队友 6 秒内受到的伤害 −25%" },
  // 诺艾尔 · 霜语者
  { id: "sg_fr1", hero: "frost", rare: 1, kind: "stat", name: "极寒之息", max: 3, w: 9, desc: lv => `冻结几率 +${12 * lv}%，对冻结的敌人伤害 +${20 * lv}%` },
  { id: "sg_fr2", hero: "frost", rare: 2, kind: "skill", name: "永冬", max: 1, w: 7, desc: () => "英雄攻击变成范围冰爆，被冻结的敌人碎裂时对周围造成伤害" },
  // 罗莎 · 炼金术士
  { id: "sg_al1", hero: "alchemist", rare: 1, kind: "stat", name: "浓缩药剂", max: 3, w: 9, desc: lv => `腐蚀效果 +${10 * lv}%，爆炸范围 +${(0.25 * lv).toFixed(2)}` },
  { id: "sg_al2", hero: "alchemist", rare: 2, kind: "special", name: "连锁爆炸", max: 1, w: 7, desc: () => "被腐蚀的敌人死亡时爆炸，并把腐蚀传染给周围的敌人" },
  // 艾莉亚 · 吟游诗人
  { id: "sg_bd1", hero: "bard", rare: 1, kind: "stat", name: "战歌回响", max: 3, w: 9, desc: lv => `光环攻速加成 +${10 * lv}%，范围 +${(0.4 * lv).toFixed(1)}` },
  { id: "sg_bd2", hero: "bard", rare: 2, kind: "special", name: "众人之歌", max: 1, w: 7, desc: () => "光环里每有 1 名队友，全队攻击 +6%，并共享 10% 吸血" },
  // 米拉 · 召唤师
  { id: "sg_su1", hero: "summoner", rare: 1, kind: "stat", name: "石之契约", max: 3, w: 9, desc: lv => `守卫生命 +${30 * lv}%、攻击 +${25 * lv}%` },
  { id: "sg_su2", hero: "summoner", rare: 2, kind: "skill", name: "巨像军团", max: 1, w: 7, desc: () => "同时可以有 3 个守卫，守卫不会消失" },
  // 艾达 · 机甲师
  { id: "sg_me1", hero: "mech", rare: 1, kind: "stat", name: "过载核心", max: 3, w: 9, desc: lv => `英雄反弹伤害 +${25 * lv}%，防御 +${20 * lv}%` },
  { id: "sg_me2", hero: "mech", rare: 2, kind: "skill", name: "熔炉喷发", max: 1, w: 7, desc: () => "英雄每次攻击喷出火焰，点燃打到的所有敌人" },
  // 露娜 · 星语者
  { id: "sg_st1", hero: "star", rare: 1, kind: "stat", name: "星辰共振", max: 3, w: 9, desc: lv => `英雄爆炸范围 +${(0.3 * lv).toFixed(1)}，攻击 +${15 * lv}%` },
  { id: "sg_st2", hero: "star", rare: 2, kind: "skill", name: "星海降临", max: 1, w: 7, desc: () => "每 14 秒自动降下一轮群星，砸向敌人最多的三个位置" },
  // 希尔薇 · 时术师
  { id: "sg_ch1", hero: "chrono", rare: 1, kind: "stat", name: "慢下来", max: 3, w: 9, desc: lv => `减速效果 +${10 * lv}%，对减速中的敌人伤害 +${18 * lv}%` },
  { id: "sg_ch2", hero: "chrono", rare: 2, kind: "skill", name: "时之回廊", max: 1, w: 7, desc: () => "每 16 秒自动把全场敌人定住 1.5 秒" },
  // 维罗妮卡 · 军团长
  { id: "sg_ma1", hero: "marshal", rare: 1, kind: "special", name: "列阵", max: 3, w: 9, desc: lv => `英雄阻挡 +${lv}，全队受到的伤害 −${8 * lv}%` },
  { id: "sg_ma2", hero: "marshal", rare: 2, kind: "skill", name: "永不倒下", max: 1, w: 7, desc: () => "队友倒下时立刻站起来一次，每人每局一次" },
];
const SIG_BY = Object.fromEntries(SIG.map(c => [c.id, c]));

// 诅咒卡：很强，但有代价。从 Lv5 起有几率顶替一张普通卡
const CURSES = [
  { id: "cu_blood", name: "嗜血契约", good: "全队攻击 +45%", bad: "受到的伤害 +20%，且不再自动回血", max: 2, w: 8 },
  { id: "cu_whisper", name: "深渊低语", good: "获得的经验 +60%", bad: "敌人移动速度 +18%", max: 2, w: 8 },
  { id: "cu_brittle", name: "脆弱碑石", good: "全队攻速 +35%", bad: "晨星碑生命上限 −25%", max: 2, w: 8 },
  { id: "cu_frenzy", name: "狂热", good: "全队攻击 +60%", bad: "全队生命上限 −30%", max: 1, w: 7 },
  { id: "cu_greed", name: "贪婪之手", good: "星尘获得翻倍，商店价格 −30%", bad: "敌人生命 +12%", max: 2, w: 8 },
  { id: "cu_sand", name: "破碎时沙", good: "自动技能冷却 −35%", bad: "每波多刷 3 只敌人", max: 2, w: 8 },
  { id: "cu_moon", name: "血色月光", good: "全队暴击率 +25%", bad: "每次暴击自己损失 1% 生命", max: 2, w: 8 },
  { id: "cu_pact", name: "献祭契约", good: "立刻获得 2 张稀有卡和 120 星尘", bad: "随机一名伙伴永久离场", max: 1, w: 6 },
  { id: "cu_haste", name: "疾风诅咒", good: "全队攻击速度 +40%", bad: "全队防御 −30%", max: 2, w: 8 },
];
const CURSE_BY = Object.fromEntries(CURSES.map(c => [c.id, c]));
const CURSE_COLOR = "#e0486a";
// 诅咒出现的几率：等级越高越容易碰上
const curseChance = () => Math.min(0.32, 0.06 + S.level * 0.012);

// ---------- 数值钩子 ----------
const cu = id => (S.curses && S.curses[id]) || 0;
const sg = id => (S.cards && S.cards[id]) || 0;
const isHero = u => !!u.hero;

function drawCurseIcon(cvs, id, size) {
  const S2 = size || 48, k = S2 / 16;
  cvs.width = S2; cvs.height = S2;
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false;
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * k, y * k, w * k, h * k); };
  const dsc = (cx, cy, r, c) => { g.fillStyle = c; for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); g.fillRect((cx - hw) * k, (cy + y) * k, (hw * 2 + 1) * k, k); } };
  g.fillStyle = "#1a0c14"; g.fillRect(0, 0, S2, S2);
  switch (id) {
    case "cu_blood": dsc(8, 6, 4, "#e0486a"); px(6, 9, 5, 5, "#a01838"); px(7, 4, 2, 2, "#ff9ab0"); break;
    case "cu_whisper": dsc(8, 8, 6, "#3a1030"); dsc(8, 8, 4, "#12060e"); px(5, 7, 2, 2, "#e0486a"); px(9, 7, 2, 2, "#e0486a"); break;
    case "cu_brittle": px(4, 3, 8, 7, "#62b4ff"); px(5, 10, 6, 3, "#62b4ff"); px(7, 2, 1, 12, "#1a0c14"); px(9, 5, 1, 8, "#1a0c14"); break;
    case "cu_frenzy": px(7, 1, 2, 6, "#ff6a3a"); dsc(8, 10, 4, "#ff3a2a"); px(3, 4, 2, 3, "#ff6a3a"); px(11, 4, 2, 3, "#ff6a3a"); break;
    case "cu_greed": for (const [x, y] of [[3, 4], [11, 5], [6, 11], [12, 11]]) px(x, y, 2, 2, "#ffe040"); dsc(8, 8, 4, "#a01838"); break;
    case "cu_sand": px(4, 2, 8, 2, "#c8b090"); px(4, 12, 8, 2, "#c8b090"); px(6, 4, 4, 4, "#e0486a"); px(7, 8, 2, 4, "#e0486a"); break;
    case "cu_moon": dsc(8, 8, 6, "#e0486a"); dsc(11, 6, 5, "#1a0c14"); break;
    case "cu_pact": px(3, 5, 10, 8, "#3a1020"); px(4, 6, 8, 6, "#e0486a"); px(7, 2, 2, 4, "#a01838"); px(5, 8, 2, 2, "#1a0c14"); px(9, 8, 2, 2, "#1a0c14"); break;
    case "cu_haste": for (let i = 0; i < 3; i++) px(2 + i, 3 + i * 4, 10 - i * 2, 2, "#e0486a"); px(12, 2, 2, 12, "#a01838"); break;
    default: px(4, 4, 8, 8, "#a01838");
  }
}
