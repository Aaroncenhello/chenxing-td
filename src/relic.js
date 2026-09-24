
// ================= 11.0：遗物 =================
// 精英、首领、宝箱怪有几率掉落；一局最多带 6 件；效果比卡牌更"怪"，会改变打法
const RELIC_MAX = 6;
const RELICS = [
  { id: "rl_berserk", name: "狂战徽记", color: "#ff5a4a", desc: "每个角色每打出第 8 下必定暴击，伤害 ×3" },
  { id: "rl_shard", name: "寒冰碎片", color: "#8fe0f0", desc: "被冻住或减速的敌人受到的伤害 +35%" },
  { id: "rl_fang", name: "吸血獠牙", color: "#e0486a", desc: "角色每击杀一个敌人，回复自己 8% 生命" },
  { id: "rl_compass", name: "金色罗盘", color: "#ffd860", desc: "星尘获取 +35%" },
  { id: "rl_hourglass", name: "时之沙漏", color: "#e8c070", desc: "全队技力回复 +30%" },
  { id: "rl_heart", name: "碑之心", color: "#62b4ff", desc: "晨星碑每秒回复 0.4% 生命" },
  { id: "rl_horn", name: "雷鸣号角", color: "#a0d8ff", desc: "每 7 秒召下雷击，打随机 3 个敌人" },
  { id: "rl_crown", name: "荆棘王冠", color: "#a8d848", desc: "敌人打到晨星碑时，受到 6 倍的反伤" },
  { id: "rl_badge", name: "猎人徽章", color: "#ffb040", desc: "对精英和首领的伤害 +30%" },
  { id: "rl_blade", name: "破碎之刃", color: "#c8c8d8", desc: "全队攻击 +25%，但生命 −12%" },
  { id: "rl_phoenix", name: "凤凰羽", color: "#ff8a3a", desc: "晨星碑第一次被打空时，回到 35% 生命（一局一次）" },
  { id: "rl_ring", name: "贪婪之戒", color: "#f0c040", desc: "经验 +25%，但敌人生命 +8%" },
  { id: "rl_boots", name: "疾风之靴", color: "#7ee89c", desc: "全队攻击速度 +15%" },
  { id: "rl_lodestone", name: "引力石", color: "#b070ff", desc: "陨星术、陨星雨、晨星爆发伤害 +50%" },
  { id: "rl_beads", name: "苦修念珠", color: "#d8b080", desc: "每波开始全队回复 25% 生命，倒下的人立刻站起来" },
  { id: "rl_glasses", name: "学者眼镜", color: "#8ac8ff", desc: "每次升级多给 1 次重抽" },
  { id: "rl_twin", name: "双子星", color: "#fff0a0", desc: "晨星之力充能 +40%" },
  { id: "rl_key", name: "裂隙钥匙", color: "#c890ff", desc: "提前出击的星尘奖励翻倍，叠波时额外获得经验" },
  { id: "rl_banner", name: "战旗", color: "#e3b75c", desc: "场上每有 1 名伙伴，全队攻击 +4%" },
  { id: "rl_mirror", name: "镜之盾", color: "#cfe6ff", desc: "角色受到的伤害 −15%" },
];
const RELIC_BY = Object.fromEntries(RELICS.map(r => [r.id, r]));
const rl = id => !!(S && S.relics && S.relics.includes(id));

// 掉落几率
function relicChance(e) {
  if (S.endless && S.relics.length >= RELIC_MAX) return 0;
  const k = 1 + 0.1 * dk("relic");
  if (isBoss(e)) return 1;
  if (e.type === "treasure") return 0.5 * k;
  if (e.lead) return 0.6 * k;
  if (e.elite) return 0.08 * k;
  return 0;
}
function gainRelic(id, quiet) {
  if (S.relics.length >= RELIC_MAX) { S.dust += 50; if (!quiet) addFx({ kind: "banner", text: "遗物满了 · 换成 50 星尘", life: 1.6 }); return null; }
  const pool = RELICS.filter(r => !S.relics.includes(r.id));
  if (!id) { if (!pool.length) return null; id = pool[Math.floor(roll("relic") * pool.length)].id; }
  if (S.relics.includes(id)) return null;
  S.relics.push(id);
  const R = RELIC_BY[id];
  if (id === "rl_blade") for (const u of S.units) { const f = u.hp / u.maxHp; u.maxHp = uMaxHp(u); u.hp = Math.max(1, Math.round(u.maxHp * f)); }
  if (!quiet) {
    addFx({ kind: "banner", text: "遗物 · " + R.name, life: 2 });
    addFx({ kind: "pillar", x: CRYSTAL.x, y: CRYSTAL.y, color: R.color, life: 0.9 });
    S.events.push({ type: "relic", id });
  }
  return id;
}
function relicDrop(e) {
  if (e.summoned || S.relics.length >= RELIC_MAX) return;
  if (roll("relic") < relicChance(e)) {
    const id = gainRelic();
    if (id) addFx({ kind: "text", x: e.x, y: e.y - 1, text: "掉落遗物！", color: RELIC_BY[id].color, life: 1.5, big: true });
  }
}
// 每帧：碑之心、雷鸣号角
function relicStep(dt) {
  if (rl("rl_heart")) S.crystal.hp = Math.min(S.crystal.maxHp, S.crystal.hp + S.crystal.maxHp * 0.004 * dt);
  if (rl("rl_horn")) {
    S.hornT = (S.hornT == null ? 7 : S.hornT) - dt;
    if (S.hornT <= 0) {
      S.hornT = 7;
      const list = S.enemies.filter(hittable);
      for (let i = 0; i < 3 && list.length; i++) {
        const e = list.splice(Math.floor(roll("relic") * list.length), 1)[0];
        addFx({ kind: "bolt", x: e.x, y: e.y - 3, x2: e.x, y2: e.y, life: 0.3 });
        addFx({ kind: "boom", x: e.x, y: e.y, r: 0.8, color: "#a0d8ff", life: 0.35 });
        hurt(e, calc(900 * powerK(), "magic", eDef(e), eRes(e)), "magic", false, { key: "rl_horn" });
      }
    }
  }
}
// 遗物小图标：一颗带颜色的宝石 + 底座
function drawRelicIcon(cvs, id, size) {
  const S2 = size || 30, k = S2 / 16, R = RELIC_BY[id] || { color: "#888" };
  cvs.width = S2; cvs.height = S2;
  const g = cvs.getContext("2d"); g.imageSmoothingEnabled = false;
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * k, y * k, w * k, h * k); };
  g.fillStyle = "#171a26"; g.fillRect(0, 0, S2, S2);
  px(3, 12, 10, 2, "#5a4a30"); px(4, 11, 8, 1, "#8a7040");
  px(6, 2, 4, 1, R.color); px(5, 3, 6, 2, R.color); px(4, 5, 8, 3, R.color); px(5, 8, 6, 2, R.color); px(6, 10, 4, 1, R.color);
  px(6, 4, 2, 2, "#ffffff"); px(5, 6, 1, 1, "rgba(255,255,255,.6)");
  px(10, 7, 1, 2, "rgba(0,0,0,.35)"); px(8, 9, 2, 1, "rgba(0,0,0,.35)");
}
