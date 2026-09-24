
// ================= 难度、养成、成就、图鉴 =================
const DIFFS = [
  { id: "normal", name: "普通", hp: 1.25, atk: 1.15, elite: 0.03, desc: "标准难度" },
  { id: "hard", name: "困难", hp: 2.6, atk: 1.45, elite: 0.1, desc: "敌人血量 ×2.1，攻击 ×1.25（相对普通），更多敌人变成精英" },
  { id: "nightmare", name: "噩梦", hp: 4.2, atk: 1.8, elite: 0.2, desc: "敌人血量 ×3.4，攻击 ×1.55（相对普通），大量精英" },
];
// 每日挑战：按日期固定关卡和一条规则
const DAILY = { diff: 0 };
// 每日挑战奖励：每天只结算一次，通关给 win 颗，没通关但撑过一半波数给 half 颗（取最好的一次，不重复发）
const DAILY_STARS = { win: 5, half: 2 };
// 通关奖励里难度的额外星星（普通 / 困难 / 噩梦）
const DIFF_BONUS = [0, 2, 3];
const DAILY_MODS = [
  { id: "fast", name: "疾行", desc: "敌人移动速度 +30%" },
  { id: "tough", name: "铜墙铁壁", desc: "所有敌人防御 +150" },
  { id: "elite", name: "精锐部队", desc: "10% 的敌人变成精英" },
  { id: "solo", name: "孤军奋战", desc: "翻不到伙伴卡，只能靠英雄和技能" },
  { id: "noSpell", name: "禁魔", desc: "不能使用主动法术" },
  { id: "rich", name: "天赋异禀", desc: "经验获得 +50%，但晨星碑生命减半" },
];

// 晨星之力：击杀充能，满 100 放全屏大招
const ULT = { max: 100, kill: 2, elite: 6, boss: 20, bossHit: 0.08, stun: 2 };
// 连杀：2.5 秒内接着杀就算连杀
const COMBO = { window: 2.5, marks: [10, 25, 50, 80, 120, 200], xp: [10, 20, 35, 60, 90, 140] };

// 角色等级 1–10：每级生命、攻击 +4%；5 级解锁天赋
const PROG = { max: 10, perLv: 0.04, talentLv: 5, startLv: 3, reviveLv: 7, spLv: 10 };
const expNeed = n => 60 * n;

// ================= 9.0：角色天赋树（Lv3 / Lv6 / Lv9 各三选一，随时可以改） =================
const TREE_TIERS = [
  { lv: 3, name: "基石" },
  { lv: 6, name: "精进" },
  { lv: 9, name: "极意" },
];
const TREE_NODE = {
  t_hp: { name: "坚韧", desc: "生命上限 +12%", icon: "hp" },
  t_atk: { name: "锋锐", desc: "攻击 +12%", icon: "atk" },
  t_spd: { name: "迅捷", desc: "攻击间隔 −10%", icon: "spd" },
  t_def: { name: "壁垒", desc: "防御 +30%", icon: "def" },
  t_thorn: { name: "荆棘", desc: "受到近战伤害时反弹 20%", icon: "thorn" },
  t_block: { name: "镇守", desc: "能同时缠住的敌人 +1", icon: "block" },
  t_range: { name: "远视", desc: "攻击范围 +0.5", icon: "range" },
  t_sp: { name: "涌流", desc: "技力回复 +30%", icon: "sp" },
  t_pierce: { name: "破甲", desc: "命中的敌人防御 −25%，持续 4 秒", icon: "pierce" },
  t_last: { name: "绝境", desc: "生命低于 35% 时攻击 +40%、受到的伤害 −25%", icon: "last" },
  t_focus: { name: "专注", desc: "技能持续时间 +30%，出场自带 30% 技力", icon: "focus" },
  t_spark: { name: "星火", desc: "每击杀一个敌人回复 3% 生命并 +2 技力", icon: "spark" },
};
// 二阶按站位分流：前排走防守，后排走输出
const TREE_T2 = { ground: ["t_def", "t_thorn", "t_block"], high: ["t_range", "t_sp", "t_pierce"] };
function treeOptions(D, tier) {
  if (tier === 0) return ["t_hp", "t_atk", "t_spd"];
  if (tier === 1) return TREE_T2[D.place === "ground" ? "ground" : "high"];
  return ["t_last", "t_focus", "t_spark"];
}
// 10.0：阵型预设
const FORMS = [
  { id: "tight", name: "紧凑", front: 1.8, back: 1.15, desc: "贴着晨星碑站，火力集中、不容易被绕后，但拦得晚" },
  { id: "std", name: "标准", front: 2.4, back: 1.6, desc: "默认阵型，攻守平衡" },
  { id: "wide", name: "散开", front: 3.15, back: 2.0, desc: "拦得更靠外，给后排更多输出时间，但前排容易被分割" },
];
const MILESTONES = [[3, "出场生命 +10%／天赋树 1"], [5, "解锁天赋"], [6, "天赋树 2"], [7, "复活时间 −25%"], [9, "天赋树 3"], [10, "出场自带 50% 技力"]];
const TALENTS = {
  knight: { name: "不屈之盾", desc: "生命低于 40% 时防御 +80%" },
  sword: { name: "连斩", desc: "每击杀一个敌人回复 4 点技力" },
  assassin: { name: "暗影步", desc: "出场后 8 秒内攻击 +60%" },
  archer: { name: "鹰眼", desc: "对飞行敌人伤害 +50%" },
  mage: { name: "奥术回响", desc: "释放陨星后立即返还 40% 技力" },
  gunner: { name: "穿甲弹", desc: "攻击无视敌人 40% 的防御" },
  priest: { name: "慈爱", desc: "对生命低于 40% 的队友治疗量 +60%" },
  frost: { name: "极寒", desc: "对冻结或减速中的敌人伤害 +50%" },
  lancer: { name: "龙鳞", desc: "受到的法术伤害 −40%" },
  alchemist: { name: "连锁反应", desc: "被腐蚀的敌人死亡时爆炸" },
  bard: { name: "安可", desc: "英雄赞歌结束时，范围里的队友各回复 8 点技力" },
  summoner: { name: "大地震颤", desc: "守卫出场时眩晕周围的敌人 2 秒" },
  mech: { name: "超载核心", desc: "生命低于 50% 时攻速 +50%" },
  star: { name: "星辰指引", desc: "对生命全满的敌人伤害 +40%" },
  chrono: { name: "长考", desc: "停滞领域的定身时间延长到 4.2 秒" },
  marshal: { name: "不退之旗", desc: "不退之令的效果延长到 12 秒" },
};
const BIO = {
  knight: "晨星骑士团团长。沉稳可靠，总是站在队伍最前面。",
  sword: "骑士团的剑士，性子急、好胜心强，最喜欢和人比谁打倒的敌人多。",
  assassin: "身份成谜的刺客，话很少，但每次出手都很准。",
  archer: "森林精灵弓手，眼力极好，性格开朗，是骑士团的开心果。",
  mage: "皇家学院出身的天才法师，有点骄傲，是研究深渊魔法的专家。",
  gunner: "矮人工匠家族的炮手，嗓门很大，信条是「没有一炮解决不了的问题」。",
  priest: "温柔的牧师，总担心同伴受伤，关键时刻却比谁都坚强。",
  frost: "守护霜雪隘口的精灵，安静寡言，据说能听懂风雪的声音。",
  lancer: "沙之部族的龙骑士，非常看重荣誉，长枪从不离身。",
  alchemist: "四处流浪的炼金术士，好奇心旺盛，口袋里永远装着奇怪的药瓶。",
  bard: "天空城的吟游诗人，记得许多失传的古歌，说话像在念诗。",
  summoner: "在水晶矿洞长大的小召唤师，和石像守卫「咚咚」是最好的朋友。",
  mech: "冰封王座下古代兵工厂的继承人，说话像在念说明书，最爱的就是她那台蒸汽重甲。",
  star: "从星海另一边来的观测者，记得所有星星的名字，也记得它们熄灭的那一天。",
  chrono: "万碑之墓最后一任守碑人，守了九百年。说话很慢，因为她习惯了等。",
  marshal: "带过三百二十一支队伍的军团长，铠甲上全是缺口。她记得每一个倒下的人的名字。",
};

const ACHV = [
  { id: "first", name: "初次防守", desc: "通关第 1 关" },
  { id: "perfect", name: "滴水不漏", desc: "晨星碑一滴血不掉通关任意关卡" },
  { id: "lv20", name: "一路高歌", desc: "一局内升到 20 级" },
  { id: "allies", name: "全员集结", desc: "一局内召集满 6 名伙伴" },
  { id: "branch3", name: "转职大师", desc: "一局内让 3 名角色转职" },
  { id: "solo", name: "独行者", desc: "不带任何伙伴通关任意关卡" },
  { id: "boss", name: "屠魔者", desc: "击败深渊领主" },
  { id: "chapter1", name: "第一章完结", desc: "通关第 4 关" },
  { id: "final", name: "封印深渊", desc: "通关第 8 关，击败深渊君主" },
  { id: "hard", name: "迎难而上", desc: "困难难度通关任意关卡" },
  { id: "nightmare", name: "噩梦行者", desc: "噩梦难度通关任意关卡" },
  { id: "endless20", name: "持久战", desc: "无尽模式撑过 20 波" },
  { id: "daily", name: "每日一战", desc: "完成一次每日挑战" },
  { id: "ult", name: "晨星闪耀", desc: "一次晨星爆发击败 10 个敌人" },
  { id: "combo50", name: "势不可挡", desc: "连杀达到 50" },
  { id: "allchars", name: "十四人", desc: "解锁前三章全部 14 名角色" },
  { id: "lv10", name: "登峰造极", desc: "任意一名角色升到 10 级" },
  { id: "trapworm", name: "地下伏击", desc: "打到钻在地下的沙虫" },
  { id: "chapter2", name: "第二章完结", desc: "通关第 8 关" },
  { id: "devourer", name: "星海终焉", desc: "通关第 12 关，击败星界吞噬者" },
  { id: "legend", name: "传说降临", desc: "一局内翻到 3 张传说卡" },
  { id: "synergy", name: "羁绊大师", desc: "一局内同时激活 4 个羁绊" },
  { id: "treasure", name: "开箱能手", desc: "累计打爆 10 只宝箱怪" },
  { id: "vigil", name: "长夜守望", desc: "在守望之战里撑过 20 波" },
  { id: "shop", name: "有钱能使", desc: "一局内在商店买满 5 次" },
  { id: "interrupt", name: "打断大师", desc: "打断一次首领的大招读条" },
  { id: "interrupt5", name: "一句话也别想念完", desc: "一局内打断 5 次首领读条" },
  { id: "chapter3", name: "第三章完结", desc: "通关第 12 关" },
  { id: "nameless", name: "叫出它的名字", desc: "通关第 16 关，击败无名者" },
  { id: "allchars16", name: "十六人", desc: "解锁全部 16 名角色" },
  { id: "relics", name: "遗物收藏家", desc: "图鉴里集齐全部遗物" },
  { id: "cards", name: "博览群牌", desc: "图鉴里集齐全部通用升级卡（不含专属卡、诅咒卡和补充卡）" },
];

const ENEMY_DESC = {
  ashwalker: "灰里走出来的旧兵，忘了自己叫什么，血厚、走得稳。",
  emberling: "还没烧完的一点火，跑得极快，数量很多。",
  monolith: "醒过来的旧晨星碑，物理伤害对它效果很差，要用法术。",
  stormhound: "雷云里养出来的兽，速度是全场最快的，法抗也高。",
  nullmage: "会给周围的敌人回血，先打掉它。",
  voidknight: "把名字交出去换来的护盾，护盾破掉之后就只是个骑士。",
  stormlord: "雷云里的那个声音。会读条放「绝对零度」，读条时集火可以打断。",
  nameless: "没有名字，也不肯有。四个形态，会放「星海坍缩」——一定要打断。",
  slime: "最基础的敌人。", bigslime: "血厚，死后分裂成两只史莱姆。", goblin: "数量多，速度中等。",
  wolf: "跑得很快，容易冲到晨星碑。", orc: "防御 300，物理攻击打不太动，用法术更好。",
  garg: "会飞，不会被近战拦住，直接飞向晨星碑。只有能打飞行的角色和技能能打到。",
  dmage: "会停在远处放法术打角色。", shaman: "每 4 秒给身边的敌人回血，要优先击杀。", bomber: "靠近角色后自爆，炸伤一片。",
  skeleton: "死灵法师召唤出来的小兵。", ghost: "物理伤害只受 30%，用法术对付。", necro: "每 7 秒召唤两只骷髅。",
  shield: "带 1600 点护盾，护盾打掉之前不掉血。法术对护盾效果更好。", stalker: "平时隐身，靠近角色才会暴露。自动技能也能打到隐身的它。",
  sandworm: "每隔几秒钻进地下：钻地时跑得更快，也不会被角色攻击到。钻出来的时候要抓紧打。",
  scorpion: "防御高，攻击会让角色中毒，4 秒内持续掉血。", harpy: "飞得很快的飞行敌人，直冲晨星碑。",
  wyvern: "血厚的飞行敌人，会停在远处喷火。", golem: "防御 320，不怕冰冻、眩晕、减速和击退。用法术或腐蚀对付它。",
  imp: "跑得很快，法抗 50。",
  boss: "每 9 秒范围攻击；血量低于一半后狂暴，速度和攻击提高，并召唤两名精英兽人。打到晨星碑的伤害是 3 倍。",
  sovereign: "深渊君主。会发射暗影弹、范围攻击；生命降到 66% 和 33% 时展开护盾、召唤援军，最后会狂暴。不怕控制，打晨星碑的伤害是 5 倍。",
  frostgiant: "冰霜巨魔。每 7 秒砸地震伤一片，身边的角色攻速会被寒气拖慢。",
  icewraith: "会飞的寒冰妖灵，停在远处扔冰锥，物理伤害只受 40%。",
  mechspider: "成群出现的机械蜘蛛，跑得快、有点甲，靠数量压过来。",
  drone: "会飞的自爆无人机，冲到角色或晨星碑旁边就炸，范围很大。",
  warmech: "重装机兵。装甲 290，不怕控制，还会在远处开火。用法术和腐蚀对付它。",
  bloodwolf: "血月狼王，速度极快，每 8 秒召唤两只魔狼。",
  voidling: "虚空爬行者，跑得很快，法抗 65，物理攻击更有效。",
  starguard: "星界守卫，带 3400 点护盾，法术对护盾更有效。",
  devourer: "星界吞噬者。生命每降 25% 就变一次形态、召唤援军并展开护盾；不怕控制，打晨星碑的伤害是 6 倍。",
  treasure: "宝箱怪。不攻击，只会往传送门逃；打爆它额外送一次翻牌。",
};

// ================= 8.0：守望之战、商店、羁绊、稀有度 =================
// 守望之战：超长局，随机地图，25 波，中途多个首领与补给
const VIGIL = { waves: 25, unlockAt: 3, bossAt: [8, 16, 25], supplyAt: [6, 12, 18, 23], hpStep: 0.27, budget: 1.32, crystalHp: 2400 };
// 星尘：击杀掉落，波间商店用
const SHOP = { everyWaves: 4, dustPerKill: 1, dustElite: 4, dustBoss: 25, start: 20,
  items: [
    { id: "card", name: "翻一张牌", desc: "立刻从三张卡里选一张", cost: 45 },
    { id: "rare", name: "稀有货架", desc: "只出稀有及以上的卡", cost: 80 },
    { id: "heal", name: "碑石修复", desc: "晨星碑回复 30% 生命", cost: 40 },
    { id: "revive", name: "全员急救", desc: "倒下的角色立刻站起，全队回满生命", cost: 35 },
    { id: "reroll", name: "占卜罗盘", desc: "重抽次数 +2", cost: 30 },
    { id: "ult", name: "晨星充能", desc: "晨星之力立刻充满", cost: 55 },
  ] };
// 卡牌稀有度
const RARITY = [
  { id: 0, name: "普通", color: "#9fb0c8", glow: "rgba(159,176,200,.35)" },
  { id: 1, name: "稀有", color: "#62b4ff", glow: "rgba(98,180,255,.55)" },
  { id: 2, name: "传说", color: "#ffb340", glow: "rgba(255,179,64,.65)" },
];
// 抽到各稀有度的基础权重，随等级提高
const RARE_W = lv => [100, 26 + lv * 2.4, 3 + lv * 1.5];
const REROLLS = 3;

// 羁绊：满足条件就一直生效。prog() 返回 [已有, 需要]，选牌时用它提示「再拿这张就凑齐」
const synCount = f => S.units.filter(u => !u.dead && !u.summon && f(u)).length;
const SYNERGY = [
  { id: "wall", name: "钢铁防线", need: "3 名前排伙伴", desc: "全队防御 +35%，晨星碑受到的伤害 −15%", color: "#8fb3e0",
    prog: () => [synCount(u => u.def.place === "ground"), 3] },
  { id: "arcane", name: "奥术回响", need: "3 名法术角色", desc: "法术伤害 +25%，技力回复 +25%", color: "#b18ae8",
    prog: () => [S.units.filter(u => !u.dead && u.def.dmg === "magic").length, 3] },
  { id: "volley", name: "齐射阵线", need: "3 名远程伙伴", desc: "远程角色攻速 +25%、射程 +0.4", color: "#6fcf8e",
    prog: () => [S.units.filter(u => !u.dead && u.def.place === "high" && u.def.dmg !== "heal").length, 3] },
  { id: "inferno", name: "烈焰环绕", need: "烈焰环 + 陨星雨", desc: "火焰技能伤害 +50%，被烧的敌人防御 −20%", color: "#ff8a3a",
    prog: () => [(cl("sk_fire") > 0) + (cl("sk_meteor") > 0), 2] },
  { id: "frostbite", name: "极寒领域", need: "冰霜新星 + 寒霜之心", desc: "冻结时间 +50%，对冻结的敌人伤害 +40%", color: "#8fe0f0",
    prog: () => [(cl("sk_nova") > 0) + (cl("freeze") > 0), 2] },
  { id: "bloodlust", name: "嗜血", need: "吸血 + 殉爆", desc: "吸血翻倍，殉爆范围和伤害 +50%", color: "#e0676a",
    prog: () => [(cl("vamp") > 0) + (cl("boom") > 0), 2] },
  { id: "scholar", name: "群星学派", need: "5 张属性卡", desc: "全队攻击 +15%、生命 +15%", color: "#ffd860",
    prog: () => [CARDS.filter(c => c.kind === "stat" && cl(c.id) > 0).length, 5] },
  { id: "legendary", name: "传说之证", need: "2 张传说卡", desc: "全队攻击 +20%，晨星之力充能 +30%", color: "#ffb340",
    prog: () => [CARDS.filter(c => c.rare === 2 && cl(c.id) > 0).length, 2] },
];
for (const g of SYNERGY) g.on = () => { const [a, b] = g.prog(); return a >= b; };
// 羁绊说明页用：怎么凑（角色名、卡名都从配置里现取，改了配置这里跟着变）
const synNames = f => UNITS.filter(f).map(u => u.name).join("、");
const synCards = (...ids) => ids.map(id => "「" + CARD_BY[id].name + "」").join(" + ");
const SYN_HOW = {
  wall: () => `场上同时有 3 名站前排（地面）的角色，英雄也算，召唤物不算。前排角色：${synNames(u => u.place === "ground")}`,
  arcane: () => `场上同时有 3 名打法术伤害的角色。法术角色：${synNames(u => u.dmg === "magic")}`,
  volley: () => `场上同时有 3 名站后排（高台）的输出角色，治疗不算。后排输出：${synNames(u => u.place === "high" && u.dmg !== "heal")}`,
  inferno: () => `同一局拿到技能卡 ${synCards("sk_fire", "sk_meteor")}`,
  frostbite: () => `同一局拿到 ${synCards("sk_nova", "freeze")}`,
  bloodlust: () => `同一局拿到 ${synCards("vamp", "boom")}`,
  scholar: () => `同一局拿到 5 种不同的属性卡（同一张升级多次只算 1 种），例如 ${CARDS.filter(c => c.kind === "stat" && !c.filler && !c.rare).slice(0, 4).map(c => "「" + c.name + "」").join("")}`,
  legendary: () => "同一局拿到 2 种传说卡（金色边框的卡）",
};
