// 20 名角色 × 2 套外观（皮肤）的 LPC 搭配。每套外观分 4 个阶段，随角色阶数一件件穿上：
//   1 阶 = 完全裸体（只有身体、脸、头发、耳朵）；2 阶 = 鞋 / 下装；3 阶 = + 上身主件；4 阶 = + 帽子 / 披风 / 肩甲 / 手套这些配件。
// 武器（和盾、箭袋）单独成一层，任何阶段都拿在手上；它们单独渲染，是因为大尺寸武器的出手动画里，衣服层只有 64 像素版本，
// 一起渲染的话出手那几帧衣服会消失（以前的「掉衣服」）。
// t2 / t3 / t4 只写「新增」的那几件，生成时自动累加。名称和变体都经 catalog.js 查验，写错会直接报错。
const { item: T } = require('./catalog');
// 第 2 套外观偏性感：生成器里没有泳装 / 内衣，所以用「裁短」做出来——把背心、束腰裁成只剩胸口那一截（抹胸 / 紧身胸衣），
// 把短裤、短裙裁成只剩腰胯那一截（比基尼裤 / 超短裙）。X(类型, 名称, 变体, 保留比例) 就是「只保留这件衣服自己高度的上 N%」。
// 这些裁短的图层单独渲染（s1x0…），打包时叠在裸体身体上、其余衣服的下面（skinpack.js）。
const X = (type, name, v, keep) => ({ tok: T(type, name, v), keep });
const F = 'sex=female';
const H = (hairName, hairV, ears) => ({ hair: T('hair', hairName, hairV), ears: ears });
const sk = (t2, t3, t4) => ({ t2, t3, t4 });
const boots = c => T('shoes', 'Revised Boots', c), shoes = c => T('shoes', 'Revised Shoes', c), hose = c => T('socks', 'High Socks', c);
const shorts = c => T('legs', 'Short Shorts', c), pants = c => T('legs', 'Pants', c), leggings = c => T('legs', 'Leggings', c), mini = c => T('legs', 'Belle skirt', c), slit = c => T('legs', 'Slit skirt', c), plain = c => T('legs', 'Plain skirt', c);
const corset = c => T('vest', 'Corset', c), bodice = c => T('vest', 'Bodice', c), tank = c => T('clothes', 'Tanktop', c), sleeveless = c => T('clothes', 'Sleeveless', c), long = c => T('clothes', 'Longsleeve', c);
const slitDress = c => T('dress', 'Slit dress', c), sashDress = c => T('dress', 'Sash dress', c), kimono = c => T('dress', 'Kimono', c);

module.exports = {
  knight: { color: 'light', ...H('High ponytail', 'blonde'), weapon: [T('weapon', 'Arming Sword', 'brass'), T('shield', 'Kite', 'kite blue blue')], names: ['誓约骑装', '白羽轻铠'], s: [
    sk([T('legs', 'Armour', 'steel'), T('shoes', 'Armour', 'steel')], [T('armour', 'Plate', 'steel'), T('gloves', 'Gloves', 'steel')], [T('hat', 'Tiara', 'tiara_gold'), T('cape', 'Solid', 'blue')]),
    sk([boots('white'), hose('white'), plain('white')], [corset('blue'), T('shoulders', 'Pauldrons', 'silver')], [T('hat', 'Tiara', 'tiara_silver'), T('cape', 'Solid', 'blue')])] },
  sword: { color: 'light', ...H('High ponytail', 'red'), weapon: [T('weapon', 'Saber', 'saber')], names: ['红鬃剑装', '烈焰短装'], s: [
    sk([pants('black'), boots('black')], [T('armour', 'Leather', 'brown')], [T('bandana', 'Bandana', 'red')]),
    sk([shorts('black'), boots('black'), hose('black')], [corset('red')], [T('bandana', 'Bandana', 'red'), T('cape', 'Tattered', 'maroon')])] },
  assassin: { color: 'light', ...H('Bob', 'black'), weapon: [T('weapon', 'Dagger', 'dagger')], names: ['夜行衣', '暗影缚带'], s: [
    sk([leggings('black'), boots('black')], [long('black')], [T('hat', 'Hood', 'black'), T('facial_mask', 'Plain Mask', 'black')]),
    sk([shorts('black'), hose('black'), boots('black')], [corset('black'), T('gloves', 'Gloves', 'cloth.black')], [T('hat', 'Hood', 'black'), T('facial_mask', 'Plain Mask', 'black')])] },
  lancer: { color: 'light', ...H('Long', 'navy'), weapon: [T('weapon', 'Spear', 'medium')], names: ['军团铠', '蓝裙战装'], s: [
    sk([T('legs', 'Armour', 'steel'), T('shoes', 'Armour', 'steel')], [T('armour', 'Legion', 'steel')], [T('hat', 'Legion', 'steel')]),
    sk([plain('navy'), hose('white'), boots('navy')], [corset('navy'), T('shoulders', 'Pauldrons', 'steel')], [T('hat', 'Legion', 'steel'), T('cape', 'Solid', 'navy')])] },
  archer: { color: 'light', ...H('Long', 'platinum', T('ears', 'Elven ears', 'light')), weapon: [T('weapon', 'Recurve', 'medium'), T('quiver', 'Quiver', 'quiver')], names: ['林地猎装', '绿叶短装'], s: [
    sk([shorts('brown'), boots('brown')], [sleeveless('forest')], [T('hat', 'Leather Cap', 'brown')]),
    sk([shorts('forest'), hose('green'), boots('brown')], [tank('forest'), T('gloves', 'Gloves', 'cloth.brown')], [T('neck', 'Scarf', 'green')])] },
  mage: { color: 'light', ...H('Long', 'violet'), weapon: [T('weapon', 'Gnarled staff', 'medium')], names: ['星幕法袍', '紫夜长裙'], s: [
    sk([pants('black'), boots('black')], [T('clothes', 'Robe', 'blue')], [T('hat', 'Celestial Wizard Hat', 'blue')]),
    sk([hose('black'), boots('black')], [slitDress('purple')], [T('hat', 'Celestial Wizard Hat', 'blue')])] },
  gunner: { color: 'light', ...H('Pigtails', 'carrot'), weapon: [T('weapon', 'Crossbow', 'crossbow')], names: ['机械师工装', '皮带短装'], s: [
    sk([shorts('black'), boots('brown')], [sleeveless('brown')], [T('belt', 'Leather Belt', 'brown')]),
    sk([shorts('brown'), hose('black'), boots('brown')], [corset('orange')], [T('belt', 'Leather Belt', 'brown'), T('gloves', 'Gloves', 'cloth.brown')])] },
  priest: { color: 'brown', ...H('Long', 'white'), weapon: [T('weapon', 'Simple staff', 'simple')], names: ['祷言白袍', '圣泉长裙'], s: [
    sk([shoes('white')], [T('clothes', 'Robe', 'white')], [T('hat', 'Hood', 'white')]),
    sk([shoes('white'), hose('white')], [slitDress('white')], [T('hat', 'Hood', 'white'), T('neck', 'Scarf', 'sky')])] },
  frost: { color: 'lavender', ...H('Long', 'white', T('ears', 'Elven ears', 'lavender')), weapon: [T('weapon', 'Wand', 'wand')], names: ['霜纱长裙', '冰晶薄纱'], s: [
    sk([boots('white')], [sashDress('sky')], []),
    sk([boots('white'), hose('white')], [slitDress('sky')], [T('neck', 'Scarf', 'white')])] },
  alchemist: { color: 'light', ...H('Pigtails', 'pink'), weapon: [T('weapon', 'Wand', 'wand')], names: ['药房围裙', '实验短装'], s: [
    sk([pants('brown'), boots('brown')], [long('brown'), T('apron', 'Apron full', 'white')], [T('backpack', 'Backpack', 'blue')]),
    sk([shorts('brown'), hose('white'), boots('brown')], [corset('lavender')], [T('apron', 'Apron full', 'white'), T('backpack', 'Backpack', 'blue')])] },
  bard: { color: 'light', ...H('Bob', 'chestnut'), weapon: [T('weapon', 'Rapier', 'rapier')], names: ['游吟束腰', '舞台短装'], s: [
    sk([pants('white'), boots('brown')], [T('clothes', 'Tunic', 'blue')], [T('hat', 'Tricorne', 'blue')]),
    sk([shorts('blue'), hose('white'), boots('brown')], [tank('blue')], [T('hat', 'Tricorne', 'blue'), T('cape', 'Solid', 'pink')])] },
  summoner: { color: 'light', ...H('Long', 'chestnut'), weapon: [T('weapon', 'Loop staff', 'medium')], names: ['石纹兜帽袍', '祭礼短袍'], s: [
    sk([shoes('brown')], [T('clothes', 'Robe', 'brown')], [T('hat', 'Hood', 'brown')]),
    sk([boots('brown'), hose('black')], [slitDress('brown')], [T('hat', 'Hood', 'brown'), T('neck', 'Scarf', 'orange')])] },
  mech: { color: 'light', ...H('Bob', 'gold'), weapon: [T('weapon', 'Halberd', 'halberd')], names: ['重装机甲', '合金战装'], s: [
    sk([T('legs', 'Armour', 'steel'), T('shoes', 'Armour', 'steel')], [T('armour', 'Plate', 'steel'), T('gloves', 'Gloves', 'steel')], [T('hat', 'Barbuta', 'steel'), T('backpack', 'Jetpack', 'steel')]),
    sk([shorts('black'), T('shoes', 'Armour', 'steel')], [corset('gray'), T('gloves', 'Gloves', 'steel')], [T('shoulders', 'Pauldrons', 'steel'), T('hat', 'Barbuta', 'steel'), T('backpack', 'Jetpack', 'steel')])] },
  star: { color: 'light', ...H('Long', 'ash', T('ears', 'Elven ears', 'light')), weapon: [T('weapon', 'Diamond staff', 'medium')], names: ['月幕法袍', '夜空长裙'], s: [
    sk([boots('black')], [T('clothes', 'Robe', 'black')], [T('hat', 'Celestial Wizard Moon Hat', 'blue')]),
    sk([boots('black'), hose('black')], [slitDress('black')], [T('hat', 'Celestial Wizard Moon Hat', 'blue')])] },
  chrono: { color: 'light', ...H('Bob', 'green', T('ears', 'Elven ears', 'light')), weapon: [T('weapon', 'Loop staff', 'medium')], names: ['沙漏长袍', '时砂薄裙'], s: [
    sk([boots('brown')], [T('clothes', 'Robe', 'brown')], [T('belt', 'Robe Belt', 'teal')]),
    sk([boots('brown'), hose('white')], [slitDress('green')], [T('belt', 'Robe Belt', 'teal')])] },
  marshal: { color: 'light', ...H('Ponytail', 'blonde'), weapon: [T('weapon', 'Spear', 'medium')], names: ['红缨军铠', '赤裙战装'], s: [
    sk([T('legs', 'Legion skirt', 'red'), T('shoes', 'Armour', 'steel')], [T('armour', 'Legion', 'steel')], [T('hat', 'Legion', 'steel'), T('accessory', 'Legion Plumage', 'red'), T('cape', 'Solid', 'red')]),
    sk([T('legs', 'Legion skirt', 'red'), T('shoes', 'Armour', 'steel'), hose('red')], [corset('red'), T('shoulders', 'Legion', 'steel')], [T('hat', 'Legion', 'steel'), T('accessory', 'Legion Plumage', 'red'), T('cape', 'Solid', 'red')])] },
  counter: { color: 'brown', ...H('Bob', 'dark brown'), weapon: [T('weapon', 'Arming Sword', 'bronze'), T('shield', 'Round Shield', 'gold')], names: ['青铜轻甲', '蓝青战装'], s: [
    sk([pants('teal'), boots('leather')], [T('armour', 'Leather', 'leather')], []),
    sk([shorts('teal'), hose('black'), boots('leather')], [corset('leather')], [T('gloves', 'Gloves', 'cloth.leather')])] },
  hunter: { color: 'light', ...H('Long', 'black'), weapon: [T('weapon', 'Recurve', 'medium'), T('quiver', 'Quiver', 'quiver')], names: ['夜猎装', '紫罗短装'], s: [
    sk([leggings('black'), boots('black')], [long('black')], [T('hat', 'Hood', 'purple')]),
    sk([shorts('black'), hose('black'), boots('black')], [corset('purple')], [T('hat', 'Hood', 'purple')])] },
  songstress: { color: 'light', ...H('Long', 'blue'), weapon: [T('weapon', 'Wand', 'wand')], names: ['潮歌和服', '海风短裙'], s: [
    sk([shoes('white')], [kimono('blue')], []),
    sk([shoes('white'), hose('white')], [slitDress('sky')], [T('neck', 'Scarf', 'blue')])] },
  breaker: { color: 'light', ...H('Bob', 'white'), weapon: [T('weapon', 'Dagger', 'dagger')], names: ['截音黑衣', '裂音短装'], s: [
    sk([pants('black'), boots('black')], [long('black')], []),
    sk([shorts('black'), hose('black'), boots('black')], [corset('black')], [T('gloves', 'Gloves', 'cloth.black')])] },
};
// 每名角色的胸 / 臀加大幅度 [胸, 臀]（0 = 不变，0.7 = 侧面看胸前和臀后各多出一两个像素）：用 skinpack.js 对所有身体图做像素变形，
// 衣服和身体一起变形，所以穿什么都贴合。数值按各人身材设定（刺客、破音者偏运动型，牧师、歌者偏丰满）。
const CURVE = { knight: [0.6, 0.5], sword: [0.6, 0.55], assassin: [0.45, 0.45], lancer: [0.6, 0.5], archer: [0.5, 0.5], mage: [0.7, 0.55], gunner: [0.7, 0.6], priest: [0.8, 0.65], frost: [0.6, 0.5], alchemist: [0.75, 0.6],
  bard: [0.65, 0.55], summoner: [0.6, 0.55], mech: [0.5, 0.5], star: [0.75, 0.6], chrono: [0.65, 0.55], marshal: [0.65, 0.55], counter: [0.55, 0.55], hunter: [0.6, 0.5], songstress: [0.8, 0.65], breaker: [0.45, 0.45] };
for (const id of Object.keys(CURVE)) module.exports[id].curve = CURVE[id];
// 第 2 套外观（偏性感）的搭配：抹胸 / 紧身胸衣 + 比基尼裤 / 超短裙 + 过膝袜 + 靴子，再按各自职业配披风、头盔、肩甲、手套
const BIKINI = {
  knight: sk([boots('white'), hose('white'), X('legs', 'Plain skirt', 'navy', 0.38)], [X('clothes', 'Tanktop', 'blue', 0.38), T('shoulders', 'Pauldrons', 'silver')], [T('hat', 'Tiara', 'tiara_silver'), T('cape', 'Solid', 'blue'), T('gloves', 'Gloves', 'silver')]),
  sword: sk([boots('black'), hose('black'), X('legs', 'Short Shorts', 'black', 0.44)], [X('clothes', 'Tanktop', 'red', 0.38)], [T('bandana', 'Bandana', 'red'), T('cape', 'Tattered', 'maroon'), T('gloves', 'Gloves', 'cloth.black')]),
  assassin: sk([boots('black'), hose('black'), X('legs', 'Short Shorts', 'black', 0.44)], [X('vest', 'Corset', 'black', 0.5)], [T('hat', 'Hood', 'black'), T('gloves', 'Gloves', 'cloth.black')]),
  lancer: sk([T('shoes', 'Armour', 'steel'), hose('white'), X('legs', 'Plain skirt', 'navy', 0.38)], [X('clothes', 'Tanktop', 'blue', 0.38), T('shoulders', 'Pauldrons', 'steel')], [T('hat', 'Legion', 'steel'), T('cape', 'Solid', 'navy')]),
  archer: sk([boots('brown'), hose('green'), X('legs', 'Short Shorts', 'brown', 0.44)], [X('clothes', 'Tanktop', 'forest', 0.38)], [T('gloves', 'Gloves', 'cloth.brown'), T('neck', 'Scarf', 'green')]),
  mage: sk([boots('black'), hose('black'), X('legs', 'Plain skirt', 'purple', 0.38)], [X('vest', 'Corset', 'purple', 0.5)], [T('hat', 'Celestial Wizard Hat', 'blue'), T('gloves', 'Gloves', 'cloth.purple')]),
  gunner: sk([boots('brown'), hose('black'), X('legs', 'Short Shorts', 'brown', 0.44)], [X('vest', 'Corset', 'orange', 0.5)], [T('belt', 'Leather Belt', 'brown'), T('gloves', 'Gloves', 'cloth.brown')]),
  priest: sk([shoes('white'), hose('white'), X('legs', 'Plain skirt', 'white', 0.38)], [X('clothes', 'Tanktop', 'white', 0.38)], [T('hat', 'Hood', 'white'), T('neck', 'Scarf', 'sky')]),
  frost: sk([boots('white'), hose('white'), X('legs', 'Slit skirt', 'navy', 0.44)], [X('clothes', 'Tanktop', 'navy', 0.38)], [T('neck', 'Scarf', 'white'), T('gloves', 'Gloves', 'cloth.white')]),
  alchemist: sk([boots('brown'), hose('white'), X('legs', 'Short Shorts', 'black', 0.44)], [X('vest', 'Corset', 'red', 0.5)], [T('apron', 'Apron full', 'white'), T('backpack', 'Backpack', 'blue')]),
  bard: sk([boots('brown'), hose('white'), X('legs', 'Short Shorts', 'blue', 0.44)], [X('clothes', 'Tanktop', 'blue', 0.38)], [T('hat', 'Tricorne', 'blue'), T('cape', 'Solid', 'pink')]),
  summoner: sk([boots('brown'), hose('black'), X('legs', 'Plain skirt', 'black', 0.38)], [X('vest', 'Corset', 'black', 0.5)], [T('hat', 'Hood', 'brown'), T('neck', 'Scarf', 'orange')]),
  mech: sk([T('shoes', 'Armour', 'steel'), X('legs', 'Short Shorts', 'black', 0.44)], [X('vest', 'Corset', 'red', 0.5), T('gloves', 'Gloves', 'steel')], [T('shoulders', 'Pauldrons', 'steel'), T('hat', 'Barbuta', 'steel'), T('backpack', 'Jetpack', 'steel')]),
  star: sk([boots('black'), hose('black'), X('legs', 'Slit skirt', 'black', 0.44)], [X('vest', 'Corset', 'black', 0.5)], [T('hat', 'Celestial Wizard Moon Hat', 'blue'), T('gloves', 'Gloves', 'cloth.black')]),
  chrono: sk([boots('brown'), hose('white'), X('legs', 'Plain skirt', 'green', 0.38)], [X('clothes', 'Tanktop', 'green', 0.38)], [T('belt', 'Robe Belt', 'teal'), T('gloves', 'Gloves', 'cloth.white')]),
  marshal: sk([T('shoes', 'Armour', 'steel'), hose('red'), T('legs', 'Legion skirt', 'red')], [X('vest', 'Corset', 'red', 0.5), T('shoulders', 'Legion', 'steel')], [T('hat', 'Legion', 'steel'), T('accessory', 'Legion Plumage', 'red'), T('cape', 'Solid', 'red')]),
  counter: sk([boots('leather'), hose('black'), X('legs', 'Short Shorts', 'teal', 0.44)], [X('vest', 'Corset', 'white', 0.5)], [T('gloves', 'Gloves', 'cloth.leather')]),
  hunter: sk([boots('black'), hose('black'), X('legs', 'Short Shorts', 'black', 0.44)], [X('vest', 'Corset', 'purple', 0.5)], [T('hat', 'Hood', 'purple'), T('gloves', 'Gloves', 'cloth.black')]),
  songstress: sk([shoes('white'), hose('white'), X('legs', 'Slit skirt', 'sky', 0.44)], [X('clothes', 'Tanktop', 'blue', 0.38)], [T('neck', 'Scarf', 'blue'), T('gloves', 'Gloves', 'cloth.white')]),
  breaker: sk([boots('black'), hose('black'), X('legs', 'Short Shorts', 'black', 0.44)], [X('vest', 'Corset', 'black', 0.5)], [T('gloves', 'Gloves', 'cloth.black')]),
};
for (const id of Object.keys(BIKINI)) module.exports[id].s[1] = BIKINI[id];

// 这套外观里裁短的图层：[{ i, tier, tok, keep }]，i 是它在这套外观里的序号（对应渲染部件 s1x<i>）
module.exports.trims = id => { const out = []; ['t2', 't3', 't4'].forEach((k, ti) => { for (const g of module.exports[id].s[1][k]) if (g && g.tok) out.push({ i: out.length, tier: ti + 2, tok: g.tok, keep: g.keep }); }); return out; };
// 渲染用的完整参数：part = 'nude'（裸体）| 'skin'（只有身体和脸，没有头发，打包时用来判断哪些像素是皮肤）| 'weapon' | 's0t2'…'s1t4'（身体 + 衣服）| 's1x<i>'（裁短图层单独渲染）
module.exports.spec = (id, part) => {
  const H = module.exports[id], base = [F, 'body=Body_Color_' + H.color, 'head=Human_Female_' + H.color, ...(H.ears ? [H.ears] : []), H.hair];
  if (part === 'nude') return base.join('&');
  if (part === 'skin') return [F, 'body=Body_Color_' + H.color, 'head=Human_Female_' + H.color].join('&');
  if (part === 'weapon') return [F, ...H.weapon].join('&');
  const x = /^s1x(\d+)$/.exec(part); if (x) return [F, module.exports.trims(id)[+x[1]].tok].join('&');
  const m = /^s(\d)t(\d)$/.exec(part), s = H.s[+m[1]], tier = +m[2]; let gear = [];
  for (let t = 2; t <= tier; t++) gear = gear.concat(s['t' + t].filter(g => typeof g === 'string'));   // 裁短的图层不在这里渲染
  return base.concat(gear).join('&');
};
module.exports.PARTS = ['nude', 'skin', 's0t2', 's0t3', 's0t4', 's1t2', 's1t3', 's1t4', 'weapon'];
module.exports.partsOf = id => module.exports.PARTS.concat(module.exports.trims(id).map(t => 's1x' + t.i));
