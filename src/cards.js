
// ================= 升级卡牌 =================
// kind: stat 属性 / skill 自动技能 / special 特殊 / ally 伙伴
const KIND_NAME = { stat: "属性", skill: "技能", special: "特殊", ally: "伙伴", curse: "诅咒", evo: "进化" };
const evo = id => cl("ev_" + id.slice(3));   // evo("sk_meteor")：这张技能卡进化了没有
const KIND_COLOR = { stat: "#6ab4ff", skill: "#b18ae8", special: "#a8d848", ally: "#e3b75c", curse: "#e0486a" };
const CARDS = [
  { id: "atk", rare: 0, kind: "stat", name: "锋利", max: 6, w: 10, desc: lv => `全队攻击 +12%（当前 +${12 * lv}%）` },
  { id: "aspd", rare: 0, kind: "stat", name: "疾风", max: 6, w: 10, desc: lv => `全队攻击速度 +9%（当前 +${9 * lv}%）` },
  { id: "crit", rare: 0, kind: "stat", name: "精准", max: 5, w: 8, desc: lv => `全队攻击 +8% 几率暴击，2 倍伤害（当前 ${8 * lv}%）` },
  { id: "hp", rare: 1, kind: "stat", name: "坚韧", max: 5, w: 8, desc: lv => `全队生命上限 +20% 并立即回满（当前 +${20 * lv}%）` },
  { id: "range", rare: 0, kind: "stat", name: "远视", max: 4, w: 7, desc: lv => `全队攻击范围 +0.5（当前 +${(0.5 * lv).toFixed(1)}）` },
  { id: "armor", rare: 0, kind: "stat", name: "铁甲", max: 4, w: 7, desc: lv => `全队防御 +30%、法抗 +8（当前 +${30 * lv}% / +${8 * lv}）` },
  { id: "sp", rare: 0, kind: "stat", name: "冥想", max: 4, w: 7, desc: lv => `技力回复速度 +30%（当前 +${30 * lv}%）` },
  { id: "xp", rare: 0, kind: "stat", name: "学者", max: 4, w: 7, desc: lv => `获得的经验 +20%（当前 +${20 * lv}%）` },
  { id: "shield", rare: 1, kind: "stat", name: "碑之守护", max: 4, w: 8, desc: lv => `晨星碑生命上限 +20% 并立即回复 20%（当前 +${20 * lv}%）` },
  { id: "regen", rare: 1, kind: "stat", name: "战地医疗", max: 4, w: 8, desc: lv => `全队每秒回复 1.2% 生命（当前 ${(1.2 * lv).toFixed(1)}%）` },
  { id: "critdmg", rare: 1, kind: "stat", name: "会心强化", max: 4, w: 7, need: () => cl("crit") > 0 || dk("crit") > 0 || cu("cu_moon") > 0, desc: lv => `暴击伤害倍数 +${15 * lv}%（当前 2 → ${(2 + 0.15 * lv).toFixed(2)} 倍）` },
  { id: "res", rare: 1, kind: "stat", name: "奥术护壁", max: 4, w: 7, desc: lv => `全队法抗额外 +${10 * lv}（不叠加铁甲的法抗）` },
  { id: "loot", rare: 0, kind: "stat", name: "掠夺", max: 4, w: 7, desc: lv => `击杀获得的星尘 +${15 * lv}%` },

  { id: "sk_meteor", rare: 1, kind: "skill", name: "陨星雨", max: 5, w: 7, desc: lv => `每 ${(9 - lv * 0.8).toFixed(1)} 秒在敌人最多的地方砸下陨星` },
  { id: "sk_chain", rare: 1, kind: "skill", name: "闪电链", max: 5, w: 7, desc: lv => `每 ${(6 - lv * 0.5).toFixed(1)} 秒放出闪电，在 ${2 + lv} 个敌人之间跳跃` },
  { id: "sk_nova", rare: 1, kind: "skill", name: "冰霜新星", max: 5, w: 7, desc: lv => `每 ${(7 - lv * 0.5).toFixed(1)} 秒以晨星碑为中心冻结一圈敌人 1 秒` },
  { id: "sk_blade", rare: 0, kind: "skill", name: "飞刃", max: 5, w: 7, desc: lv => `${1 + lv} 把飞刃绕着晨星碑旋转，碰到敌人就造成伤害` },
  { id: "sk_fire", rare: 1, kind: "skill", name: "烈焰环", max: 5, w: 7, desc: lv => `每 ${(8 - lv * 0.6).toFixed(1)} 秒喷出火环，烧伤范围内的敌人` },
  { id: "sk_spike", rare: 0, kind: "skill", name: "地刺阵", max: 4, w: 6, desc: lv => `晨星碑周围一圈地刺，站在上面的地面敌人每秒受伤` },
  { id: "sk_holy", rare: 1, kind: "skill", name: "圣光", max: 4, w: 6, desc: lv => `每 ${12 - lv} 秒全队回血，并对亡灵造成伤害` },
  { id: "sk_spear", rare: 1, kind: "skill", name: "落雷之枪", max: 5, w: 6, desc: lv => `每 ${(7 - lv * 0.5).toFixed(1)} 秒对离晨星碑最近的敌人猛击一枪，并眩晕 ${(0.8 + lv * 0.15).toFixed(2)} 秒` },
  { id: "sk_toxic", rare: 1, kind: "skill", name: "剧毒喷雾", max: 5, w: 6, desc: lv => `每 ${(8 - lv * 0.5).toFixed(1)} 秒在晨星碑周围喷出毒雾，中毒的敌人持续掉血、防御下降` },
  { id: "sk_gale", rare: 0, kind: "skill", name: "追猎箭雨", max: 5, w: 6, desc: lv => `每 ${(5.5 - lv * 0.3).toFixed(1)} 秒对 ${2 + Math.floor(lv / 2)} 个随机敌人各射一箭` },

  { id: "vamp", rare: 1, kind: "special", name: "吸血", max: 4, w: 7, desc: lv => `攻击时回复造成伤害 ${6 * lv}% 的生命` },
  { id: "thorn", rare: 0, kind: "special", name: "荆棘", max: 4, w: 6, desc: lv => `被近战攻击时反弹 ${25 * lv}% 的伤害` },
  { id: "boom", rare: 1, kind: "special", name: "殉爆", max: 4, w: 7, desc: lv => `击杀敌人时 ${18 * lv}% 几率引发爆炸` },
  { id: "slow", rare: 0, kind: "special", name: "迟缓光环", max: 4, w: 7, desc: lv => `晨星碑 3.5 范围内的敌人速度 −${12 * lv}%` },
  { id: "hunter", rare: 1, kind: "special", name: "猎王者", max: 3, w: 6, desc: lv => `对精英和首领的伤害 +${25 * lv}%` },
  { id: "resonance", rare: 1, kind: "special", name: "晨星共鸣", max: 3, w: 6, desc: lv => `晨星之力充能速度 +${40 * lv}%` },
  { id: "revive", rare: 0, kind: "special", name: "不屈", max: 3, w: 6, desc: lv => `角色倒下后的复活时间 −${25 * lv}%` },
  { id: "freeze", rare: 1, kind: "special", name: "寒霜之心", max: 3, w: 6, desc: lv => `攻击有 ${6 * lv}% 几率冻结敌人 0.8 秒` },
  { id: "pierce", rare: 1, kind: "special", name: "破甲", max: 3, w: 6, desc: lv => `攻击无视敌人 ${15 * lv}% 的防御` },
  { id: "dodge", rare: 1, kind: "special", name: "闪避步", max: 3, w: 6, desc: lv => `每次受到攻击有 ${7 * lv}% 几率完全闪避` },
  { id: "cdr", rare: 1, kind: "special", name: "疾风节拍", max: 3, w: 6, need: () => CARDS.some(k => k.kind === "skill" && !k.evo && cl(k.id) > 0), desc: lv => `自动技能冷却额外 −${8 * lv}%` },
  { id: "wardmind", rare: 1, kind: "special", name: "心灵屏障", max: 3, w: 6, desc: lv => `受到的法术伤害 −${8 * lv}%` },
  // ---- 传说卡（每局最多见到几张，效果很强）----
  { id: "lg_twin", rare: 2, kind: "skill", name: "双生奥义", max: 1, w: 5, desc: () => "所有自动技能冷却 −40%、威力 +35%" },
  { id: "lg_time", rare: 2, kind: "skill", name: "时间停滞", max: 2, w: 5, desc: lv => `每 ${22 - lv * 4} 秒把全场敌人定住 ${(1.6 + lv * 0.4).toFixed(1)} 秒` },
  { id: "lg_judge", rare: 2, kind: "skill", name: "天罚", max: 2, w: 5, desc: lv => `击杀敌人时 ${20 * lv}% 几率召下审判之光，重创附近的敌人` },
  { id: "lg_phoenix", rare: 2, kind: "special", name: "不死鸟", max: 1, w: 5, desc: () => "角色倒下 3 秒就复活，站起时回满生命并震开周围敌人" },
  { id: "lg_avatar", rare: 2, kind: "special", name: "晨星化身", max: 1, w: 5, desc: () => "英雄攻击 +100%、生命 +60%、攻击范围 +0.8" },
  { id: "lg_army", rare: 2, kind: "ally", name: "万军之阵", max: 1, w: 5, desc: () => "伙伴上限 +2，场上所有伙伴立刻升 1 阶" },
  { id: "lg_aegis", rare: 2, kind: "stat", name: "永恒壁垒", max: 2, w: 5, desc: lv => `晨星碑生命上限 +${40 * lv}%，每波结束回复 ${8 * lv}%` },
  { id: "lg_greed", rare: 2, kind: "stat", name: "星尘洪流", max: 1, w: 5, desc: () => "经验和星尘获得翻倍" },
  { id: "lg_bond", rare: 2, kind: "stat", name: "誓约之环", max: 1, w: 5, need: () => S.mod !== "solo", desc: () => "全队攻击和生命上限随伙伴数量提升：每有一名伙伴在场 +8%，没有上限" },
  { id: "lg_ward", rare: 2, kind: "stat", name: "圣域壁垒", max: 1, w: 5, desc: () => "晨星碑受到的伤害 −20%" },
  { id: "lg_focus", rare: 2, kind: "special", name: "焚天之力", max: 1, w: 5, desc: () => "对集火目标的伤害额外 +25%" },
  // ---- 进化卡：自动技能升到满级后才会进牌堆，拿了技能形态大变（按传说卡的样子显示，但不算「传说卡」）----
  { id: "ev_meteor", evo: "sk_meteor", rare: 2, kind: "evo", name: "天罚陨星", max: 1, w: 8, desc: () => "陨星雨进化：每次同时砸下 3 颗陨星（落在不同的敌群），爆炸范围 +30%，被砸中的敌人会灼烧 3 秒" },
  { id: "ev_chain", evo: "sk_chain", rare: 2, kind: "evo", name: "雷霆风暴", max: 1, w: 8, desc: () => "闪电链进化：跳跃次数翻倍、伤害不再衰减，被击中的敌人麻痹 0.4 秒" },
  { id: "ev_nova", evo: "sk_nova", rare: 2, kind: "evo", name: "绝对零度", max: 1, w: 8, desc: () => "冰霜新星进化：范围扩大到 5 格，冻结 2 秒，伤害 +30%" },
  { id: "ev_blade", evo: "sk_blade", rare: 2, kind: "evo", name: "剑刃风暴", max: 1, w: 8, desc: () => "飞刃进化：多 2 把飞刃，轨道忽远忽近扫过更大范围，伤害 +30%，出手更快" },
  { id: "ev_fire", evo: "sk_fire", rare: 2, kind: "evo", name: "炼狱火环", max: 1, w: 8, desc: () => "烈焰环进化：范围扩大到 5 格，灼烧伤害 +60%、持续 5 秒" },
  { id: "ev_spike", evo: "sk_spike", rare: 2, kind: "evo", name: "荆棘王座", max: 1, w: 8, desc: () => "地刺阵进化：地刺范围扩大一圈，伤害 +40%，被刺中的敌人减速 40%" },
  { id: "ev_holy", evo: "sk_holy", rare: 2, kind: "evo", name: "神圣审判", max: 1, w: 8, desc: () => "圣光进化：回血量 +30%，对范围内所有敌人造成伤害（亡灵受到双倍）" },
  // ---- 补充卡：牌堆快抽空时才出现，可以无限叠加 ----
  { id: "fl_atk", rare: 0, kind: "stat", name: "淬炼", max: 999, w: 10, filler: true, desc: lv => `全队攻击 +6%、生命 +6%（可以无限叠加，当前 +${6 * lv}%）` },
  { id: "fl_crystal", rare: 0, kind: "stat", name: "碑石修补", max: 999, w: 6, filler: true, desc: () => "晨星碑立即回复 20% 生命" },
  { id: "fl_dust", rare: 0, kind: "stat", name: "战利品", max: 999, w: 6, filler: true, desc: () => "立即获得 60 星尘，重抽次数 +1" },
];
const CARD_BY = Object.fromEntries(CARDS.map(c => [c.id, c]));
const ANY_CARD = id => CARD_BY[id] || (typeof SIG_BY !== "undefined" && SIG_BY[id]) || (typeof CURSE_BY !== "undefined" && CURSE_BY[id]);
// 自动技能的冷却和威力（威力会跟着关卡强度一起涨）
const SKILL_CD = { sk_meteor: lv => 9 - lv * 0.8, sk_chain: lv => 6 - lv * 0.5, sk_nova: lv => 7 - lv * 0.5, sk_fire: lv => 8 - lv * 0.6, sk_holy: lv => 12 - lv, sk_spear: lv => 7 - lv * 0.5, sk_toxic: lv => 8 - lv * 0.5, sk_gale: lv => 5.5 - lv * 0.3, lg_time: lv => 22 - lv * 4 };
const SKILL_DMG = { sk_meteor: 1200, sk_chain: 700, sk_nova: 500, sk_fire: 610, sk_holy: 560, sk_blade: 350, sk_spike: 200, sk_spear: 1050, sk_toxic: 420, sk_gale: 380, lg_judge: 3400 };

// 卡牌小图标（16×16）
function drawCardIcon(cvs, id, size) {
  const S2 = size || 48, k = S2 / 16;
  cvs.width = S2; cvs.height = S2;
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false;
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * k, y * k, w * k, h * k); };
  const dsc = (cx, cy, r, c) => { g.fillStyle = c; for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); g.fillRect((cx - hw) * k, (cy + y) * k, (hw * 2 + 1) * k, k); } };
  g.fillStyle = "#12141f"; g.fillRect(0, 0, S2, S2);
  if (id.startsWith("ev_")) {   // 进化卡：原技能图标 + 金框 + 右上角的星
    drawCardIcon(cvs, "sk_" + id.slice(3), S2);
    g.fillStyle = "#ffd860"; g.fillRect(0, 0, S2, k); g.fillRect(0, S2 - k, S2, k); g.fillRect(0, 0, k, S2); g.fillRect(S2 - k, 0, k, S2);
    px(12, 1, 3, 1, "#fff6c0"); px(13, 0, 1, 3, "#fff6c0"); px(11, 3, 2, 1, "#ffd860");
    return;
  }
  switch (id) {
    case "atk": px(3, 11, 2, 3, "#8a5a30"); px(4, 4, 3, 8, "#dfe6f2"); px(4, 4, 1, 8, "#ffffff"); px(3, 10, 5, 1, "#f0c040"); px(9, 5, 4, 2, "#e0676a"); px(10, 7, 3, 2, "#e0676a"); break;
    case "aspd": for (let i = 0; i < 3; i++) px(3 + i, 4 + i * 3, 9 - i * 2, 2, "#8fe0f0"); px(11, 2, 2, 12, "#ffffff"); break;
    case "crit": px(7, 2, 2, 12, "#ffe040"); px(2, 7, 12, 2, "#ffe040"); px(4, 4, 2, 2, "#fff6c0"); px(10, 10, 2, 2, "#fff6c0"); break;
    case "hp": dsc(5, 6, 3, "#e0676a"); dsc(10, 6, 3, "#e0676a"); px(3, 7, 10, 3, "#e0676a"); px(4, 10, 8, 2, "#e0676a"); px(6, 12, 4, 2, "#e0676a"); px(5, 5, 2, 2, "#ff9a9a"); break;
    case "range": g.strokeStyle = "#6fcf8e"; dsc(8, 8, 6, "#2a4a34"); dsc(8, 8, 4, "#12141f"); px(7, 7, 3, 3, "#6fcf8e"); px(1, 7, 3, 2, "#6fcf8e"); px(12, 7, 3, 2, "#6fcf8e"); break;
    case "armor": px(4, 3, 8, 7, "#8fb3e0"); px(4, 3, 8, 2, "#c8dcf4"); px(5, 10, 6, 2, "#6a8ab0"); px(7, 12, 2, 2, "#6a8ab0"); px(7, 5, 2, 4, "#f0c040"); break;
    case "sp": dsc(8, 8, 5, "#2a3a6a"); dsc(8, 8, 3, "#6ab4ff"); px(7, 3, 2, 3, "#8fd0ff"); px(7, 11, 2, 3, "#8fd0ff"); break;
    case "xp": px(3, 3, 10, 10, "#c8a870"); px(4, 4, 8, 8, "#f0e0c0"); px(5, 6, 6, 1, "#8a6a40"); px(5, 8, 6, 1, "#8a6a40"); px(3, 3, 2, 10, "#8a5a30"); break;
    case "shield": px(4, 3, 8, 6, "#62b4ff"); px(5, 9, 6, 3, "#62b4ff"); px(7, 12, 2, 2, "#62b4ff"); px(6, 5, 4, 3, "#e8f8ff"); break;
    case "regen": px(7, 4, 2, 8, "#7ee89c"); px(4, 7, 8, 2, "#7ee89c"); dsc(8, 8, 6, "rgba(126,232,156,.22)"); break;
    case "critdmg": px(7, 1, 2, 14, "#ffe040"); px(2, 7, 12, 2, "#ffe040"); px(3, 3, 3, 3, "#fff6c0"); px(10, 10, 3, 3, "#fff6c0"); px(4, 4, 1, 1, "#ffffff"); px(11, 11, 1, 1, "#ffffff"); break;
    case "res": dsc(8, 8, 6, "#3a2a6a"); dsc(8, 8, 4, "#12141f"); px(7, 4, 2, 3, "#c090ff"); px(7, 9, 2, 3, "#c090ff"); px(4, 7, 3, 2, "#c090ff"); px(9, 7, 3, 2, "#c090ff"); break;
    case "loot": px(3, 7, 10, 7, "#8a5a30"); px(4, 8, 8, 1, "#b07840"); px(6, 4, 4, 3, "#8a5a30"); px(6, 9, 1, 3, "#ffd860"); px(9, 9, 1, 3, "#ffd860"); px(6, 12, 4, 1, "#fff6c0"); break;
    case "sk_meteor": px(10, 2, 3, 3, "#ffb040"); px(8, 5, 3, 3, "#ff8a3a"); dsc(6, 10, 4, "#ff6a2a"); dsc(5, 10, 2, "#ffd060"); break;
    case "sk_chain": px(9, 2, 3, 5, "#b8e0ff"); px(6, 6, 4, 3, "#ffffff"); px(4, 8, 3, 6, "#b8e0ff"); px(8, 8, 2, 3, "#8fd0ff"); break;
    case "sk_nova": for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [4, -4], [-4, 4], [4, 4], [-4, -4]]) px(8 + dx - 1, 8 + dy - 1, 2, 2, "#8fe0f0"); dsc(8, 8, 3, "#dff8ff"); break;
    case "sk_blade": dsc(8, 8, 6, "rgba(200,220,240,.18)"); px(2, 7, 4, 2, "#dfe6f2"); px(10, 7, 4, 2, "#dfe6f2"); px(7, 2, 2, 4, "#dfe6f2"); px(7, 10, 2, 4, "#dfe6f2"); break;
    case "sk_fire": dsc(8, 9, 5, "#ff5a2a"); dsc(8, 10, 3, "#ffb040"); px(7, 2, 2, 4, "#ff8a3a"); px(5, 4, 2, 2, "#ff6a2a"); px(10, 4, 2, 2, "#ff6a2a"); break;
    case "sk_spike": px(2, 11, 12, 3, "#4a4a56"); for (const x of [3, 6, 9, 12]) { px(x, 6, 2, 5, "#c8ccd4"); px(x, 5, 1, 1, "#ffffff"); } break;
    case "sk_holy": dsc(8, 8, 5, "rgba(255,224,128,.3)"); px(7, 3, 2, 10, "#ffe080"); px(4, 6, 8, 2, "#ffe080"); px(7, 5, 2, 2, "#fff6c0"); break;
    case "sk_spear": px(7, 1, 2, 9, "#ffe860"); px(5, 3, 6, 2, "#fff6c0"); px(3, 9, 4, 4, "#8fd0ff"); px(9, 9, 4, 4, "#8fd0ff"); px(6, 11, 4, 2, "#ffffff"); break;
    case "sk_toxic": dsc(8, 9, 5, "rgba(168,216,72,.28)"); px(6, 3, 2, 5, "#a8d848"); px(9, 5, 2, 4, "#7ea838"); px(4, 6, 2, 4, "#a8d848"); dsc(8, 10, 2, "#3a5a2a"); break;
    case "sk_gale": for (const [x, y] of [[3, 3], [9, 2], [3, 10], [10, 9]]) px(x, y, 4, 1, "#c8f0a0"); px(2, 3, 1, 1, "#7ea838"); px(8, 2, 1, 1, "#7ea838"); px(2, 10, 1, 1, "#7ea838"); px(9, 9, 1, 1, "#7ea838"); break;
    case "vamp": dsc(6, 6, 3, "#d83848"); px(5, 9, 3, 4, "#d83848"); px(9, 4, 3, 6, "#ffffff"); px(9, 10, 3, 2, "#d83848"); break;
    case "thorn": for (const [x, y] of [[7, 1], [1, 7], [13, 7], [7, 13]]) px(x, y, 2, 2, "#a8d848"); dsc(8, 8, 4, "#3a5a2a"); dsc(8, 8, 2, "#a8d848"); break;
    case "boom": dsc(8, 8, 5, "#ff8a3a"); dsc(8, 8, 3, "#ffe040"); for (const [dx, dy] of [[0, -7], [0, 7], [-7, 0], [7, 0]]) px(8 + dx - 1, 8 + dy - 1, 2, 2, "#ff5a2a"); break;
    case "slow": dsc(8, 8, 6, "rgba(143,224,240,.25)"); px(7, 4, 2, 5, "#8fe0f0"); px(8, 8, 3, 2, "#8fe0f0"); dsc(8, 8, 6, "rgba(0,0,0,0)"); break;
    case "hunter": px(3, 4, 10, 2, "#ffd040"); px(4, 6, 2, 3, "#ffd040"); px(11, 6, 2, 3, "#ffd040"); px(7, 6, 2, 3, "#ffd040"); px(3, 10, 10, 3, "#c8903a"); break;
    case "resonance": px(7, 1, 2, 5, "#fff0a0"); px(1, 7, 5, 2, "#fff0a0"); px(10, 7, 5, 2, "#fff0a0"); px(7, 10, 2, 5, "#fff0a0"); dsc(8, 8, 3, "#ffd860"); break;
    case "revive": dsc(8, 9, 5, "#7ee89c"); px(7, 3, 2, 6, "#7ee89c"); px(5, 5, 6, 2, "#7ee89c"); break;
    case "freeze": px(7, 2, 2, 12, "#8fe0f0"); px(2, 7, 12, 2, "#8fe0f0"); px(4, 4, 2, 2, "#dff8ff"); px(10, 10, 2, 2, "#dff8ff"); px(4, 10, 2, 2, "#dff8ff"); px(10, 4, 2, 2, "#dff8ff"); break;
    case "pierce": px(2, 12, 3, 2, "#8a5a30"); px(4, 3, 9, 9, "#dfe6f2"); px(5, 4, 7, 7, "#12141f"); px(6, 6, 5, 5, "#e0676a"); break;
    case "dodge": dsc(6, 8, 5, "rgba(168,216,72,.2)"); px(5, 3, 2, 6, "#a8d848"); px(2, 9, 6, 2, "#a8d848"); px(9, 5, 2, 6, "#c8ccd4"); px(9, 4, 2, 1, "#ffffff"); break;
    case "cdr": dsc(8, 8, 6, "#2a3a6a"); dsc(8, 8, 5, "#12141f"); px(7, 4, 2, 5, "#8fd0ff"); px(8, 8, 4, 2, "#8fd0ff"); px(2, 2, 3, 1, "#ffe040"); px(11, 2, 3, 1, "#ffe040"); break;
    case "wardmind": dsc(8, 8, 6, "rgba(184,224,255,.22)"); px(6, 3, 4, 4, "#b8e0ff"); px(5, 7, 6, 5, "#8fb3e0"); px(7, 4, 2, 2, "#ffffff"); break;
    case "lg_twin": dsc(5, 8, 4, "#b070ff"); dsc(11, 8, 4, "#ffb340"); px(4, 7, 2, 2, "#e0c0ff"); px(10, 7, 2, 2, "#ffe0a0"); px(7, 2, 2, 3, "#ffffff"); break;
    case "lg_time": dsc(8, 8, 6, "#3a4a7a"); dsc(8, 8, 5, "#c8d8ff"); px(7, 4, 2, 5, "#2a3050"); px(8, 8, 4, 2, "#2a3050"); px(7, 7, 2, 2, "#e04a4a"); break;
    case "lg_judge": px(6, 1, 4, 9, "#fff6c0"); px(3, 9, 10, 2, "#ffd860"); dsc(8, 12, 4, "rgba(255,216,96,.4)"); px(7, 4, 2, 4, "#ffffff"); break;
    case "lg_phoenix": dsc(8, 9, 5, "#ff6a2a"); px(3, 5, 4, 3, "#ffb040"); px(9, 5, 4, 3, "#ffb040"); px(7, 3, 2, 3, "#fff6c0"); px(7, 8, 2, 4, "#ffe040"); break;
    case "lg_avatar": px(7, 1, 2, 4, "#fff6c0"); dsc(8, 8, 5, "#ffd860"); dsc(8, 8, 3, "#fff6c0"); px(2, 7, 3, 2, "#ffd860"); px(11, 7, 3, 2, "#ffd860"); break;
    case "lg_army": for (const x of [2, 6, 10]) { px(x, 6, 3, 6, "#8fb3e0"); px(x, 4, 3, 2, "#e3b75c"); } px(2, 12, 12, 2, "#3a4460"); break;
    case "lg_aegis": px(3, 2, 10, 7, "#62b4ff"); px(4, 9, 8, 3, "#62b4ff"); px(7, 12, 2, 2, "#62b4ff"); px(5, 4, 6, 4, "#e8f8ff"); px(7, 5, 2, 6, "#ffd860"); break;
    case "lg_greed": for (const [x, y] of [[3, 3], [11, 4], [6, 11], [12, 11], [8, 7]]) px(x, y, 2, 2, "#ffe040"); dsc(8, 8, 5, "rgba(255,224,64,.25)"); px(7, 6, 2, 4, "#fff6c0"); break;
    case "lg_bond": dsc(5, 8, 3, "#8fb3e0"); dsc(11, 8, 3, "#e3b75c"); px(7, 7, 2, 2, "#fff6c0"); px(4, 3, 8, 1, "#ffd860"); px(4, 3, 1, 3, "#ffd860"); px(11, 3, 1, 3, "#ffd860"); break;
    case "lg_ward": px(4, 2, 8, 7, "#ffd860"); px(5, 9, 6, 3, "#ffd860"); px(7, 12, 2, 2, "#ffd860"); px(6, 4, 4, 5, "#fff6c0"); px(7, 6, 2, 2, "#12141f"); break;
    case "lg_focus": dsc(8, 8, 6, "rgba(255,90,42,.22)"); px(7, 1, 2, 14, "#ff5a2a"); px(1, 7, 14, 2, "#ff5a2a"); dsc(8, 8, 3, "#ffe040"); break;
    case "fl_atk": px(3, 10, 10, 3, "#5a5f70"); px(5, 8, 6, 2, "#8a8fa0"); px(7, 2, 2, 6, "#ff9a40"); px(6, 4, 4, 2, "#ffd060"); break;
    case "fl_crystal": px(6, 2, 4, 2, "#a8e0ff"); px(5, 4, 6, 6, "#62b4ff"); px(6, 10, 4, 2, "#3a78c0"); px(6, 5, 1, 4, "#e0f4ff"); px(11, 11, 3, 1, "#6fcf8e"); px(12, 10, 1, 3, "#6fcf8e"); break;
    case "fl_dust": px(4, 6, 8, 7, "#8a5a30"); px(5, 5, 6, 1, "#b07840"); px(6, 3, 4, 2, "#8a5a30"); px(6, 8, 4, 3, "#ffd860"); px(7, 9, 2, 1, "#fff6c0"); break;
    default: px(4, 4, 8, 8, "#8a8a9c");
  }
}
