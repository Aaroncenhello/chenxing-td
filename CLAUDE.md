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
npm run test:mobile    # 手机横屏 844×390 + 竖屏（390×844 / 375×667 / 390×600）截图，检查每个按钮都在屏幕内、能点到
npm run sim            # 平衡模拟，见下
```
测试约定：每个测试文件用 `tests/lib.js` 的 `check(条件, 说明, 细节)` 断言、`noErrors(errs)` 检查页面报错、最后 `report(名字)` 汇总；新测试要加进 `tests/run-all.js` 的列表。截图用相对路径，会存在 `tests/out/`（已被 git 忽略）。Playwright 版本锁定为 1.56.1，和 `npx playwright install chromium` 装的浏览器对应。推送到 GitHub 后 `.github/workflows/test.yml` 会自动跑一遍，并检查 `dist/chenxing.html` 是否已重新构建。
写断言时注意：战斗有随机性，别断言「一定会出现某件事」（例如事件选项不足 2 个时会被跳过、只有骑士时打不到飞行怪），要断言机制本身。

平衡模拟 `tests/sim.js` 用环境变量控制：
`ST0`=起始关（0 开始）`ST`=结束关（不含）`RUNS`=每关局数 `CLV`=角色等级 `DIFF`=0/1/2 `ABY`=深渊层数 `DISK='{"atk":5,...}'`=天赋星盘等级 `HERO`=指定英雄。
例：`cd tests/out && ST=16 RUNS=3 CLV=8 DISK='{"atk":5,"hp":4,"walls":4}' node ../sim.js`
新参数：`STARS=45` 按「便宜优先」把这么多星星花进星盘（代替手写 DISK）；`SEED=数字` 每局固定随机种子，**前后对比时必须用同一个 SEED**，否则每格 16 局的随机波动就有 ±15%；`HTML=路径` 用别的构建跑（改前改后对比）；`PATCH='STAGES[11].hp=2.5'` 先在页面里改数值再跑，用来快速试调法；`ALLCHARS=1` 让未解锁的角色也能出场（默认只用到这一关已解锁的）；`OUT=文件` 写出每局 JSON。
**平衡矩阵** `tests/balance.js`：按 5 档玩家进度（新手 CLV3/0★、二章 CLV5/20★、三章 CLV7/45★、四章 CLV9/90★、毕业 CLV10/400★）把每关跑 RUNS 局，4 进程并行，输出胜率表并写 `tests/out/balance.json`。例：`cd tests/out && SEED=2026 RUNS=24 node ../balance.js`；只看部分：`PROFILES=三章,四章 ST0=8 ST=12`。
调数值的做法：先用旧构建（`git show HEAD:dist/chenxing.html > before.html`）和新构建各跑一遍同 SEED 的矩阵再比较；没改的关卡两边数字应该完全一样。
机器人不会调站位、选牌粗糙，**真人胜率明显高于模拟**。**基准（阶段 3 调整后，`SEED=2026 RUNS=24 node ../balance.js`）**，每档对应章节的机器人胜率：
第一章·新手 50/46/0/21%；第二章·二章 13/21/21/4%；第三章·三章 17/13/29/0%；第四章·四章 25/0/0/4%。
毕业档（CLV10 + 400★）：第 1–11 关 83–100%，第 12 关 46%，第 13–15 关 63–67%，第 16 关 8%。
每章最后一关（第 4/8/12/16 关，首领战）都是本章最难的；第 12 关输掉时平均只打到全程 27–38%。

**拼接顺序（build.sh 里固定，改顺序可能出错）：**
`head.html config.js config-meta.js cards.js meta.js relic.js sig.js story.js arena.js haz.js boss.js event.js affix.js fight.js step.js px-core.js px-hero.js px-foe.js px-fx.js save.js ui-bar.js ui-panels.js ui-roster.js ui-menu.js settle.js main.js`
`head.html` 里是 CSS 和整个页面的 HTML 结构，最后以 `<script>` 开头；`main.js` 结尾是 `</script>`。

## 各文件负责什么
| 文件 | 内容 |
|---|---|
| head.html | 全部 CSS、页面结构（顶栏、战场、翻牌/商店/事件面板、HUD、底部面板、说明文字） |
| config.js | `RULES`、16 个关卡 `STAGES`（地图字符画、敌人池、首领、机关）、16 名角色 `UNITS`、敌人 `ENEMIES`、`ELITE`、`SPELLS` |
| config-meta.js | 难度 `DIFFS`、每日规则、商店 `SHOP`、稀有度 `RARE_W`、成就、天赋树、阵型 `FORMS`、角色传记等 |
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
| save.js | 存档 `loadSave/writeSave/editSave`、导出导入 `exportSave/importSave`、星星账本 `starBank`、角色等级 `levelOf/charLevels` |
| ui-bar.js | 顶栏、队伍栏、卡牌栏、提示 `toast`、成就解锁 `unlockAchv`、法术按钮 |
| ui-panels.js | 角色信息面板、翻牌面板、商店、事件面板、场地拖动站位、快捷键、**沉浸全屏 `setImm` 和手机 HUD** |
| ui-roster.js | 剧情播放、选英雄、角色养成页、天赋树、结算经验、战绩入档 |
| ui-menu.js | 选关页、星盘页、深渊/每周 UI、图鉴、成就、存档页、进关流程 `beginStage/startRun`、新手引导、结算页 `checkOver/showResult(R)`（只画界面） |
| settle.js | **结算** `settleRun()`：一局结束时写存档（战绩 `recordRun`、经验 `awardExp`、成就、星级、通关奖励 `runReward`、守望/每日/无尽/每周记录），返回结果对象给结算页 |
| main.js | 主循环 `frame()`、开机、`window.__td` 测试接口 |

## 关键机制速查
- **固定步长**：`step(dt)` 是全部游戏逻辑，`frame()` 只负责按 30Hz 调它并渲染。测试直接调 `__td.step(1/30)`。
- **暂停条件**：`S.offer`（翻牌）/`S.shop`/`S.event`/`S.cine`（首领演出）任一存在时，`step` 不推进战斗。
- **敌人强度**：`spawnAt` 里 `hp = d.hp × stageHp() × S.waveHp × S.diffK.hp × …`。`S.diffK` = 难度 × 深渊 × 每周规则，在 `newRun` 里合成。
- **经验曲线**：`xpNeedOf(lv) = (12 + 4lv + 0.25lv²)`（深渊 11 层起 ×1.15）。这是控制「一局翻几次牌」的主旋钮。
- **随机数**：影响对局的随机一律用 `roll("用途")`（arena.js 里的 `RNG_KEYS`：card/ev/relic/afx/spawn/fight/shop），波次生成用 `S.rng`。每日/每周挑战时它们都带种子，同样的操作打两次结果完全一样（`tests/seeded.js` 会检查）；**只有纯画面效果**（粒子、飘字、抖屏、走路动画）才直接用 `Math.random`。新加随机逻辑时别直接写 `Math.random()`。
- **结算**：`settleRun()`（settle.js）把一局的存档结算一次做完，同一局重复调用返回同一个结果；`checkOver` 先结算、再播通关剧情、再出结算页，所以剧情中途关页面也不丢奖励。主线成就和关卡通关剧情只在主线关卡发/播（守望之战、每周、每日、无尽都不算）；「通关某关」的成就配在 `STAGES[i].clearAchv` 里。每周记录按周累积在 `save.week[key]` 里，每周首通各算 5★。
- **牌池**：`cardPool()`；牌快抽空时自动补进 `fl_*` 补充卡（可无限叠加）。
- **无尽模式**：`startWave` 里按需 `genWave()`，不会出现空波。
- **商店/事件**会「欠着」：叠波跳过了第 4/5 波也会在之后补开。
- **存档**：localStorage 键 `chenxing-td-v2`，都在 `save.js`。`loadSave()` 是**白名单 + 类型清洗**，新加存档字段必须在 `loadSave` 里声明（写清类型和范围），否则下次写存档就被丢掉。导出码前缀 `CX9-`。
  - **版本**：存档带 `ver`（当前 `SAVE_VER = 12`）。改存档结构时 `SAVE_VER` +1，并在 `SAVE_MIGRATE` 末尾加一步升级函数；旧存档读入时按顺序补跑，升级前自动备份。
  - **备份**：`chenxing-td-v2-backup` 只存一份（导入前、升级前各自动存一次），存档页有「恢复这份备份」按钮，恢复是互换的，可以再换回来。更新版本的存档拒绝导入。
- **星星账本**：`starBank()` = 关卡星级 + 困难/噩梦首通 + 无尽每 10 波 + 成就 + 深渊每层首通 + 每周首通 + `bonusStars`（每次通关给）− 星盘花费 `diskSpent`。
- **沉浸全屏**：`body.imm` 类，战场 fixed 铺满窗口，`resize()` 按窗口等比缩放；手机（横屏高 ≤ 520px、竖屏宽 ≤ 520px）开局自动进入。横屏按钮浮在战场两边；**竖屏**（CSS `orientation:portrait`）是顶栏 + 撑满宽度的战场 + 下面的大按钮区，`.hud` 变成 `display:contents` 排进竖向布局，一屏看全不滚动。全屏时有翻牌/商店/菜单/剧情打开，`body.panel` 会把提示藏起来。浏览器原生全屏只是顺带尝试：嵌在 iframe 里通常不给，iPhone 上网页根本没有全屏接口，所以 Claude 页面的顶栏去不掉。
- **爽感/画面（阶段 4）**：
  - 画质档位 `GFX`（fight.js，低/中/高/自动，存档字段 `gfx`）控制粒子数量、特效上限、抖屏和环境粒子；新特效一律用 `addFx()`，粒子和小飘字超上限会被丢掉，横幅等关键反馈不受影响。
  - 伤害数字按目标合并（`addNum` 的 key），一下打掉 3 成血以上显示最大号；精英/首领击杀有顿帧 `S.hitStop`（只在 `frame()` 里生效，不影响 `step` 逻辑和模拟）。
  - 波前 3 秒出怪预告（传送门光圈 + 敌人图标）和大波预警横幅（`nextWaveInfo()`、`S.warnWave`）。
  - **竖屏信息区** `#pinfo`（战场和按钮之间）：波次、大号连杀、队员血条/技力（点一下选中、技力满再点放技能）、下一波、本局卡牌和遗物，由 `updatePInfo()` 刷新。
  - 羁绊 `SYNERGY[i].prog()` 返回 `[已有, 需要]`，`on()` 由它派生；选牌时 `synHint(p)` 假装拿了这张牌算进度，卡面显示「羁绊 x/y」或「凑齐羁绊」。
  - 结算页 `animResult()`：数字从 0 滚动、星星逐个落下、MVP 聚光；按钮栏在结算页固定在底部。测试读结算数字要等动画（约 1.3 秒）跑完。
  - 图鉴有卡牌/遗物页，存档字段 `cardSeen`（结算时由 `recordRun` 写入，遗物也在这里补记）；集齐有成就 `cards` / `relics`。
  - 这些都在 `tests/juice.js` 里有回归测试。
- **viewport**：`head.html` 里的 `<meta name="viewport">` 不能删——没有它手机会按 980px 宽的电脑网页排版再整体缩小。

## 踩过的坑
- 所有源码在同一个全局作用域：**顶层重名会让整页白屏**，每次改完跑 `node tests/syntax.js`。
- 用 sed 批量改名时曾把 `next.res` 改成了 `nexeRes(t)`，只在特定专属卡触发时才崩。批量替换后要全局 grep 检查奇怪的标识符。
- 无头测试里如果只调 `step()`，结算不会自动执行（`checkOver` 在 `frame()` 里）；要么设好 `S.over` 后直接调 `__td.settle()`，要么等浏览器跑几帧（结算页也会出来）。
- 翻牌面板开着时，场地拖动和 HUD 按钮都会被挡住，这是故意的。

## 版本脉络
7.0 固定阵地 + 自动战斗 + 翻牌 → 8.0 机关地图、稀有度、羁绊、商店、守望之战 → 9.0 专属卡、诅咒卡、首领演出与打断、第四章、天赋树、战报、存档导出、手机优化 → 10.0 局内事件、精英词缀、阵型与拖动站位、图鉴战绩 → 10.1 修无尽空波、牌堆见底、手动开波/叠波、难度上调 → **11.0 天赋星盘、深渊 20 层、遗物、每周挑战、手机横屏沉浸全屏、基础难度再上调** → 阶段 4 爽感：画质档位、打击感、出怪预告、竖屏信息区、翻牌仪式感、羁绊提示、结算动画、图鉴卡牌/遗物页。

## 发布
产物就是 `dist/chenxing.html`，浏览器直接打开即可。
**网页版**：`.github/workflows/pages.yml` 在 main 分支更新时把它发布成 GitHub Pages 首页 https://aaroncenhello.github.io/chenxing-td/ （需要仓库公开、Settings → Pages → Source 选「GitHub Actions」）。
Google 字体是后台加载的（`media=print` + `onload`）：别改回普通的 `<link rel=stylesheet>`，否则连不上 Google 的网络下整页会白屏。之前在 claude.ai 上以 Artifact 形式发布过（带 `downloads` 能力用于下载存档文件，代码里 `saveFile()` 在没有这个能力时会退回普通下载）。
