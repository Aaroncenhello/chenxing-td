# 晨星守望（Morning Star Watch）— 给 Claude Code 的项目说明

像素风「固定阵地 + 自动战斗 + 升级翻牌」的塔防 Roguelite，最终产物是**一个单文件网页** `dist/chenxing.html`（纯 HTML + Canvas + JS，无框架、无打包工具、无外部依赖，只从 Google Fonts 拉字体）。当前版本 **11.0**。

## 和用户协作的约定（重要）
- 用户叫 Jenny，**用中文交流**，游戏里所有文字也必须是中文。
- **不要做音乐和音效**（用户不开声音）。
- 用户主要在**手机横屏**上玩，也会在电脑上玩；改界面时两边都要验证。
- 用户偏好：难度要有挑战，别让玩家「翻几张牌就躺赢」；喜欢有长期追求（星盘、深渊层数）。
- 每次改完：构建 → 语法检查 → 功能测试 → 平衡模拟 → 截图自查，再交付。

## 目录
```
src/            源码片段，按固定顺序拼接成一个 <script>（全部共享同一个全局作用域）
build.sh        拼接脚本：src/* → dist/chenxing.html
dist/           构建产物（直接用浏览器打开就能玩）
tests/          Playwright 无头测试 + 平衡模拟（在 tests/out/ 目录里运行，截图也存在那）
```

## 构建与测试
```bash
npm install            # 只装 playwright（首次还要 npx playwright install chromium）
npm run check          # 构建 + 语法检查 + 顶层重名检查
npm test               # 构建 + 语法检查 + 全部功能测试（tests/run-all.js，任何一项失败都会以非零状态退出）
node tests/run-all.js meta rewards   # 只跑指定的几个测试
npm run test:mobile    # 手机横屏 844×390 截图 + 检查每个浮动按钮都能点到
npm run sim            # 平衡模拟，见下
```
测试约定：每个测试文件用 `tests/lib.js` 的 `check(条件, 说明, 细节)` 断言、`noErrors(errs)` 检查页面报错、最后 `report(名字)` 汇总；新测试要加进 `tests/run-all.js` 的列表。截图用相对路径，会存在 `tests/out/`（已被 git 忽略）。Playwright 版本锁定为 1.56.1，和 `npx playwright install chromium` 装的浏览器对应。推送到 GitHub 后 `.github/workflows/test.yml` 会自动跑一遍，并检查 `dist/chenxing.html` 是否已重新构建。
写断言时注意：战斗有随机性，别断言「一定会出现某件事」（例如事件选项不足 2 个时会被跳过、只有骑士时打不到飞行怪），要断言机制本身。

平衡模拟 `tests/sim.js` 用环境变量控制：
`ST0`=起始关（0 开始）`ST`=结束关（不含）`RUNS`=每关局数 `CLV`=角色等级 `DIFF`=0/1/2 `ABY`=深渊层数 `DISK='{"atk":5,...}'`=天赋星盘等级 `HERO`=指定英雄。
例：`cd tests/out && ST=16 RUNS=3 CLV=8 DISK='{"atk":5,"hp":4,"walls":4}' node ../sim.js`
机器人不会调站位、选牌粗糙，**真人胜率明显高于模拟**。11.0 的参考结果：CLV4 无星盘约 25%；CLV8 + 少量星盘约 37%（第一章大多能过，三四章很难）；满级 + 400★ 星盘时第 9–13 关大多能赢，14–16 关很难。

**拼接顺序（build.sh 里固定，改顺序可能出错）：**
`head.html config.js config2.js cards.js meta.js relic.js sig.js story.js arena.js haz.js boss.js event.js affix.js fight.js step.js px-core.js px-hero.js px-foe.js px-fx.js ui-a.js ui-b.js ui-d.js ui-c.js`
`head.html` 里是 CSS 和整个页面的 HTML 结构，最后以 `<script>` 开头；`ui-c.js` 结尾是 `</script>`。

## 各文件负责什么
| 文件 | 内容 |
|---|---|
| head.html | 全部 CSS、页面结构（顶栏、战场、翻牌/商店/事件面板、HUD、底部面板、说明文字） |
| config.js | `RULES`、16 个关卡 `STAGES`（地图字符画、敌人池、首领、机关）、16 名角色 `UNITS`、敌人 `ENEMIES`、`ELITE`、`SPELLS` |
| config2.js | 难度 `DIFFS`、每日规则、商店 `SHOP`、稀有度 `RARE_W`、成就、天赋树、阵型 `FORMS`、角色传记等 |
| cards.js | 升级卡 `CARDS`（含传说卡、`fl_*` 无限补充卡）、自动技能数值、卡牌像素图标 |
| meta.js | **11.0** 天赋星盘 `DISK`/`dk()`、深渊层数 `ABYSS`/`ab()`/`abyssK()`、每周挑战 `WEEK_RULES`/`weekInfo()`/`wk()` |
| relic.js | **11.0** 遗物 `RELICS`/`rl()`、掉落 `relicDrop`、每帧效果 `relicStep`、图标 |
| sig.js | 英雄专属卡 `SIG`（本局英雄才会出现） |
| story.js | 剧情对话、章节 |
| arena.js | 核心状态 `S`、`newRun()` 开局、单位属性公式 `uAtk/uMaxHp/uDef/...`、敌人属性 `eAtk/eDef/eSpeed`、牌池 `cardPool/randomCards/pickCard`、波次生成 `genWaves/genWave/startWave`、`callWaveEarly`、站位 `arrange/setSlot`、商店 |
| haz.js | 地图机关（喷发口、光束、地刺、力场、开合传送门） |
| boss.js | 首领入场演出、读条大招 `ULT_DEF`、打断/破防 |
| event.js | 局内事件（每 5 波三选一） |
| affix.js | 精英词缀 `AFFIX`、`eRes`、`eInt` |
| fight.js | 伤害结算 `hurt/hurtUnit/hurtCrystal`、`killEnemy`、弹道、主动法术、晨星爆发 |
| step.js | **整个模拟的一步** `step(dt)`（固定 30Hz）：波次推进、商店/事件触发、单位 AI、敌人 AI |
| px-*.js | 像素渲染：地图、英雄、敌人、特效、HUD 上的文字（640×360 原生分辨率，`T=40` 每格，16×9 格） |
| ui-a.js | 存档 `loadSave/writeSave/editSave`、星星账本 `starBank`、顶栏、卡牌栏、法术按钮 |
| ui-b.js | 角色信息面板、翻牌面板、商店、事件面板、场地拖动站位、快捷键、**沉浸全屏 `setImm` 和手机 HUD** |
| ui-d.js | 剧情播放、选英雄、角色养成页、天赋树、结算经验、战绩入档 |
| ui-c.js | 选关页、星盘页、深渊/每周 UI、图鉴、成就、存档导入导出、结算页、主循环 `frame()`、`window.__td` 测试接口 |

## 关键机制速查
- **固定步长**：`step(dt)` 是全部游戏逻辑，`frame()` 只负责按 30Hz 调它并渲染。测试直接调 `__td.step(1/30)`。
- **暂停条件**：`S.offer`（翻牌）/`S.shop`/`S.event`/`S.cine`（首领演出）任一存在时，`step` 不推进战斗。
- **敌人强度**：`spawnAt` 里 `hp = d.hp × stageHp() × S.waveHp × S.diffK.hp × …`。`S.diffK` = 难度 × 深渊 × 每周规则，在 `newRun` 里合成。
- **经验曲线**：`xpNeedOf(lv) = (12 + 4lv + 0.25lv²)`（深渊 11 层起 ×1.15）。这是控制「一局翻几次牌」的主旋钮。
- **牌池**：`cardPool()`；牌快抽空时自动补进 `fl_*` 补充卡（可无限叠加）。
- **无尽模式**：`startWave` 里按需 `genWave()`，不会出现空波。
- **商店/事件**会「欠着」：叠波跳过了第 4/5 波也会在之后补开。
- **存档**：localStorage 键 `chenxing-td-v2`。`loadSave()` 是**白名单**，新加存档字段必须在 `loadSave` 里声明，否则下次写存档就被丢掉。导出码前缀 `CX9-`。
- **星星账本**：`starBank()` = 关卡星级 + 困难/噩梦首通 + 无尽每 10 波 + 成就 + 深渊每层首通 + 每周首通 + `bonusStars`（每次通关给）− 星盘花费 `diskSpent`。
- **沉浸全屏**：`body.imm` 类，战场 fixed 铺满窗口，`resize()` 按窗口等比缩放；手机横屏（高 ≤ 520px）开局自动进入。浏览器原生全屏只是顺带尝试，嵌在 iframe 里通常不给。

## 踩过的坑
- 所有源码在同一个全局作用域：**顶层重名会让整页白屏**，每次改完跑 `node tests/syntax.js`。
- 用 sed 批量改名时曾把 `next.res` 改成了 `nexeRes(t)`，只在特定专属卡触发时才崩。批量替换后要全局 grep 检查奇怪的标识符。
- 无头测试里如果只调 `step()`，结算（`checkOver` → 发星星、记战绩）不会执行，因为它在 `frame()` 里；需要等浏览器跑几帧。
- 翻牌面板开着时，场地拖动和 HUD 按钮都会被挡住，这是故意的。

## 版本脉络
7.0 固定阵地 + 自动战斗 + 翻牌 → 8.0 机关地图、稀有度、羁绊、商店、守望之战 → 9.0 专属卡、诅咒卡、首领演出与打断、第四章、天赋树、战报、存档导出、手机优化 → 10.0 局内事件、精英词缀、阵型与拖动站位、图鉴战绩 → 10.1 修无尽空波、牌堆见底、手动开波/叠波、难度上调 → **11.0 天赋星盘、深渊 20 层、遗物、每周挑战、手机横屏沉浸全屏、基础难度再上调**。

## 发布
产物就是 `dist/chenxing.html`，浏览器直接打开即可。之前在 claude.ai 上以 Artifact 形式发布过（带 `downloads` 能力用于下载存档文件，代码里 `saveFile()` 在没有这个能力时会退回普通下载）。
