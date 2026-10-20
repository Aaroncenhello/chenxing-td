// ================= 角色外观（皮肤）=================
// 每名角色 2 套外观：第 1 套是原装，第 2 套要解锁。每套外观按阶数一件件穿上（1 阶裸体 → 4 阶全套），素材见 tools/lpc/skins.js。
// 第 2 套的解锁方式三选一：星星兑换（stars）、该角色通关胜场（win）、该角色觉醒等级（awk）。
// 存档：skin = { 角色: 当前穿的外观 0/1 }，skinBuy = ["角色:1", …] 是用星星兑换过的（总花费算进 starBank 的支出）。
const SKIN_DEF = {
  knight: { names: ["誓约骑装", "白羽轻铠"], rule: { win: 10 } },
  sword: { names: ["红鬃剑装", "烈焰短装"], rule: { stars: 20 } },
  assassin: { names: ["夜行衣", "暗影缚带"], rule: { win: 10 } },
  lancer: { names: ["军团铠", "蓝裙战装"], rule: { stars: 20 } },
  archer: { names: ["林地猎装", "绿叶短装"], rule: { win: 10 } },
  mage: { names: ["星幕法袍", "紫夜长裙"], rule: { stars: 30 } },
  gunner: { names: ["机械师工装", "皮带短装"], rule: { stars: 20 } },
  priest: { names: ["祷言白袍", "圣泉长裙"], rule: { win: 10 } },
  frost: { names: ["霜纱长裙", "冰晶薄纱"], rule: { stars: 30 } },
  alchemist: { names: ["药房围裙", "实验短装"], rule: { stars: 20 } },
  bard: { names: ["游吟束腰", "舞台短装"], rule: { win: 10 } },
  summoner: { names: ["石纹兜帽袍", "祭礼短袍"], rule: { stars: 30 } },
  mech: { names: ["重装机甲", "合金战装"], rule: { awk: 1 } },
  star: { names: ["月幕法袍", "夜空长裙"], rule: { stars: 40 } },
  chrono: { names: ["沙漏长袍", "时砂薄裙"], rule: { win: 25 } },
  marshal: { names: ["红缨军铠", "赤裙战装"], rule: { awk: 3 } },
  counter: { names: ["青铜轻甲", "蓝青战装"], rule: { stars: 30 } },
  hunter: { names: ["夜猎装", "紫罗短装"], rule: { win: 10 } },
  songstress: { names: ["潮歌和服", "海风短裙"], rule: { stars: 40 } },
  breaker: { names: ["截音黑衣", "裂音短装"], rule: { stars: 40 } },
};
const skinRule = id => (SKIN_DEF[id] && SKIN_DEF[id].rule) || {};
const skinBought = (d, id) => d.skinBuy.includes(id + ":1");
// 第 2 套外观有没有解锁：兑换过，或者满足条件（胜场 / 觉醒）
function skinOwned(d, id, idx) {
  if (!idx) return true; const r = skinRule(id);
  if (skinBought(d, id)) return true;
  if (r.win) return ((d.use[id] || {}).win || 0) >= r.win;
  if (r.awk) return awkOf(charExp(d, id)) >= r.awk;
  return false;
}
const skinRuleText = id => { const r = skinRule(id); return r.stars ? `兑换 ${r.stars}★` : r.win ? `该角色通关 ${r.win} 局` : r.awk ? `觉醒 ${r.awk} 级` : ""; };
const skinSpent = d => d.skinBuy.reduce((n, k) => n + (skinRule(k.split(":")[0]).stars || 0), 0);
// 当前穿的外观同步到画面（SKIN_EQ 在 px-lpc.js）
function syncSkins(d) {
  d = d || loadSave(); for (const u of UNITS) SKIN_EQ[u.id] = skinOwned(d, u.id, d.skin[u.id] | 0) ? d.skin[u.id] | 0 : 0;
  HERO_PIC.clear(); for (const u of UNITS) lpcWantHero(u.id, false);
}
function wearSkin(id, idx) {
  const d = loadSave(); if (!skinOwned(d, id, idx)) return false;
  editSave(s => { s.skin[id] = idx; }); syncSkins(); lpcWantHero(id, true); return true;
}
// 用星星兑换第 2 套外观；成功返回 null，失败返回原因
function buySkin(id) {
  const d = loadSave(), r = skinRule(id);
  if (!r.stars) return "这套外观不能用星星兑换。"; if (skinBought(d, id)) return "已经兑换过了。";
  if (starBank().left < r.stars) return `星星不够（要 ${r.stars}★，还有 ${starBank().left}★）。`;
  editSave(s => { s.skinBuy.push(id + ":1"); s.skin[id] = 1; }); syncSkins(); lpcWantHero(id, true); return null;
}
