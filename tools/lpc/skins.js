// 20 名角色 × 2 套外观（皮肤）的 LPC 搭配。每套外观分 4 个阶段，随角色阶数一件件穿上：
//   1 阶 = 完全裸体（只有身体、脸、头发、耳朵）；2 阶 = 鞋 / 下装；3 阶 = + 上身主件；4 阶 = + 帽子 / 披风 / 肩甲 / 手套这些配件。
// 武器（和盾、箭袋）单独成一层，任何阶段都拿在手上；它们单独渲染，是因为大尺寸武器的出手动画里，衣服层只有 64 像素版本，
// 一起渲染的话出手那几帧衣服会消失（以前的「掉衣服」）。
// t2 / t3 / t4 只写「新增」的那几件，生成时自动累加。名称和变体都经 catalog.js 查验，写错会直接报错。
const { item: T } = require('./catalog');
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
// 渲染用的完整参数：part = 'nude' | 'weapon' | 's0t2' … 's1t4'
module.exports.spec = (id, part) => {
  const H = module.exports[id], base = [F, 'body=Body_Color_' + H.color, 'head=Human_Female_' + H.color, ...(H.ears ? [H.ears] : []), H.hair];
  if (part === 'nude') return base.join('&');
  if (part === 'weapon') return [F, ...H.weapon].join('&');
  const m = /^s(\d)t(\d)$/.exec(part), s = H.s[+m[1]], tier = +m[2]; let gear = [];
  for (let t = 2; t <= tier; t++) gear = gear.concat(s['t' + t]);
  return base.concat(gear).join('&');
};
module.exports.PARTS = ['nude', 's0t2', 's0t3', 's0t4', 's1t2', 's1t3', 's1t4', 'weapon'];
