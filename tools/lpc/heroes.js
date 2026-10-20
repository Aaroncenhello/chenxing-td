// 20 名角色的 LPC 图层搭配：每条是生成器（Universal LPC Spritesheet Character Generator）页面 # 后面的参数，
// 键 = 部件类型，值 = 名称_颜色（空格换成下划线）。运行 tools/lpc/build.js 会开本地生成器把它们渲染成精灵表。
const F = "sex=female&";
module.exports = {
  knight: F + "body=Body_Color_light&head=Human_Female_light&hair=High_ponytail_blonde&armour=Plate_steel&legs=Armour_steel&shoes=Armour_steel&gloves=Gloves_steel&hat=Tiara_tiara_gold&cape=Solid_blue&weapon=Arming_Sword_brass&shield=Kite_kite_blue_blue",
  sword: F + "body=Body_Color_light&head=Human_Female_light&hair=High_ponytail_red&armour=Leather_brown&legs=Pants_black&shoes=Revised_Boots_black&bandana=Bandana_red&weapon=Saber_saber",
  assassin: F + "body=Body_Color_light&head=Human_Female_light&hat=Hood_black&facial_mask=Plain_Mask_black&clothes=Longsleeve_black&legs=Leggings_black&shoes=Revised_Boots_black&weapon=Dagger_dagger",
  lancer: F + "body=Body_Color_light&head=Human_Female_light&hair=Long_navy&armour=Legion_steel&legs=Armour_steel&shoes=Armour_steel&hat=Legion_steel&weapon=Spear_medium",
  archer: F + "body=Body_Color_light&head=Human_Female_light&ears=Elven_ears_light&hair=Long_platinum&clothes=Sleeveless_forest&legs=Shorts_brown&shoes=Revised_Boots_brown&quiver=Quiver_quiver&weapon=Recurve_medium",
  mage: F + "body=Body_Color_light&head=Human_Female_light&hair=Long_violet&hat=Celestial_Wizard_Hat_blue&clothes=Robe_blue&legs=Pants_black&shoes=Revised_Boots_black&weapon=Gnarled_staff_medium",
  gunner: F + "body=Body_Color_light&head=Human_Female_light&hair=Pigtails_carrot&clothes=Sleeveless_brown&legs=Shorts_black&shoes=Revised_Boots_brown&belt=Leather_Belt_brown&weapon=Crossbow_crossbow",
  priest: F + "body=Body_Color_brown&head=Human_Female_brown&hat=Hood_white&clothes=Robe_white&shoes=Revised_Shoes_white&weapon=Simple_staff_simple",
  frost: F + "body=Body_Color_lavender&head=Human_Female_lavender&ears=Elven_ears_lavender&hair=Long_white&dress=Sash_dress_sky&shoes=Revised_Boots_white&weapon=Wand_wand",
  alchemist: F + "body=Body_Color_light&head=Human_Female_light&hair=Pigtails_pink&clothes=Longsleeve_brown&apron=Apron_full_white&legs=Pants_brown&shoes=Revised_Boots_brown&backpack=Backpack_blue&weapon=Wand_wand",
  bard: F + "body=Body_Color_light&head=Human_Female_light&hair=Bob_chestnut&hat=Tricorne_blue&clothes=Tunic_blue&legs=Pants_white&shoes=Revised_Boots_brown&weapon=Rapier_rapier",
  summoner: F + "body=Body_Color_light&head=Human_Female_light&hat=Hood_brown&clothes=Robe_brown&shoes=Revised_Shoes_brown&weapon=Loop_staff_medium",
  mech: F + "body=Body_Color_light&head=Human_Female_light&hair=Bob_gold&armour=Plate_steel&legs=Armour_steel&shoes=Armour_steel&hat=Barbuta_steel&backpack=Jetpack_steel&gloves=Gloves_steel&weapon=Halberd_halberd",
  star: F + "body=Body_Color_light&head=Human_Female_light&ears=Elven_ears_light&hair=Long_ash&hat=Celestial_Wizard_Moon_Hat_blue&clothes=Robe_black&shoes=Revised_Boots_black&weapon=Diamond_staff_medium",
  chrono: F + "body=Body_Color_light&head=Human_Female_light&ears=Elven_ears_light&hair=Bob_green&clothes=Robe_brown&belt=Robe_Belt_teal&shoes=Revised_Boots_brown&weapon=Loop_staff_medium",
  marshal: F + "body=Body_Color_light&head=Human_Female_light&hair=Ponytail_blonde&armour=Legion_steel&legs=Legion_skirt_red&shoes=Armour_steel&hat=Legion_steel&accessory=Legion_Plumage_red&cape=Solid_red&weapon=Spear_medium",
  counter: F + "body=Body_Color_brown&head=Human_Female_brown&hair=Bob_dark_brown&armour=Leather_leather&legs=Pants_teal&shoes=Revised_Boots_leather&shield=Round_Shield_gold&weapon=Arming_Sword_bronze",
  hunter: F + "body=Body_Color_light&head=Human_Female_light&hat=Hood_purple&clothes=Longsleeve_black&legs=Leggings_black&shoes=Revised_Boots_black&quiver=Quiver_quiver&weapon=Recurve_medium",
  songstress: F + "body=Body_Color_light&head=Human_Female_light&hair=Long_blue&dress=Kimono_blue&shoes=Revised_Shoes_white&weapon=Wand_wand",
  breaker: F + "body=Body_Color_light&head=Human_Female_light&hair=Bob_white&clothes=Longsleeve_black&legs=Pants_black&shoes=Revised_Boots_black&weapon=Dagger_dagger",
};

// 每名角色的出手动画（用哪一段）：std = 标准 64 像素动画（slash/thrust/shoot/spellcast），其余是自定义大尺寸动画（名字见 out/meta.json）
module.exports.ATK = {
  knight: "slash_128", sword: "slash_oversize", assassin: "slash", lancer: "thrust", archer: "shoot", mage: "thrust_oversize", gunner: "thrust", priest: "cast", frost: "slash",
  alchemist: "slash", bard: "slash_oversize", summoner: "thrust_oversize", mech: "thrust_oversize", star: "thrust_oversize", chrono: "thrust_oversize", marshal: "thrust",
  counter: "slash_128", hunter: "shoot", songstress: "slash", breaker: "slash",
};
