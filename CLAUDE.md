# 晨星守望（Morning Star Watch）— 给 Claude Code 的项目说明

像素风「固定阵地 + 自动战斗 + 升级翻牌」的塔防 Roguelite，最终产物是**一个单文件网页** `dist/chenxing.html`（纯 HTML + Canvas + JS，无框架、无打包工具、无外部依赖，只从 Google Fonts 拉字体）。当前版本 **12.1**。

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
`head.html config.js config-meta.js skins.js cards.js meta.js relic.js sig.js traits.js story.js arena.js haz.js boss.js event.js affix.js fight.js step.js px-core.js px-hero.js lpc-data.js lpc-foe-data.js lpc-credits.js px-lpc.js px-foe.js px-fx.js px-skill.js save.js ui-bar.js ui-panels.js ui-roster.js ui-menu.js settle.js exped.js main.js`
`head.html` 里是 CSS 和整个页面的 HTML 结构，最后以 `<script>` 开头；`main.js` 结尾是 `</script>`。

## 各文件负责什么
| 文件 | 内容 |
|---|---|
| head.html | 全部 CSS、页面结构（顶栏、战场、翻牌/商店/事件面板、HUD、底部面板、说明文字） |
| config.js | `RULES`、20 个关卡 `STAGES`（地图字符画、敌人池、首领、机关）、20 名角色 `UNITS`、敌人 `ENEMIES`、`ELITE`、`SPELLS` |
| config-meta.js | 难度 `DIFFS`、每日规则、商店 `SHOP`、稀有度 `RARE_W`、成就、天赋树、阵型 `FORMS`、角色传记等 |
| cards.js | 升级卡 `CARDS`（含传说卡、`fl_*` 无限补充卡）、自动技能数值、卡牌像素图标 |
| meta.js | **11.0** 天赋星盘 `DISK`/`dk()`、深渊层数 `ABYSS`/`ab()`/`abyssK()`、每周挑战 `WEEK_RULES`/`weekInfo()`/`wk()` |
| relic.js | **11.0** 遗物 `RELICS`/`rl()`、掉落 `relicDrop`、每帧效果 `relicStep`、图标 |
| sig.js | 英雄专属卡 `SIG`（本局英雄才会出现） |
| traits.js | **12.1** 角色羁绊：`TAGS`（每名英雄 3 个标签）、`TRAITS`（17 个，阵营 6 / 职业 5 / 特质 6，每档效果 own + team）、`PAIRS`（10 组搭档）、`updateTraits()`（由 `updateSyn` 每 0.5 秒调用，算出 `S.tr/S.trN/S.trPairs/S.trTeam` 和每名队员的 `u.tf`）、`tf(u,k)/tfTeam(k)`（读加成）、`traitStep`（回血 / 自动炮击）、`traitHint/traitBias`（选牌提示 / 招募偏向）、`tagHtml` |
| story.js | 剧情对话、章节 |
| arena.js | 核心状态 `S`、`newRun()` 开局、单位属性公式 `uAtk/uMaxHp/uDef/...`、敌人属性 `eAtk/eDef/eSpeed`、牌池 `cardPool/randomCards/pickCard`、波次生成 `genWaves/genWave/startWave`、`callWaveEarly`、站位 `arrange/setSlot`、商店 |
| haz.js | 地图机关（喷发口、光束、地刺、力场、开合传送门）。**天气和昼夜遮罩在 12.2 去掉了**（Jenny 嫌暗、闪），别再加回来 |
| boss.js | 首领入场演出、读条大招 `ULT_DEF`、打断/破防、**首领专属特性 `BOSS_MECH/mechStep`** |
| event.js | 局内事件（每 5 波三选一） |
| affix.js | 精英词缀 `AFFIX`、`eRes`、`eInt` |
| fight.js | 伤害结算 `hurt/hurtUnit/hurtCrystal`、`killEnemy`、弹道、主动法术、晨星爆发 |
| step.js | **整个模拟的一步** `step(dt)`（固定 30Hz）：波次推进、商店/事件触发、单位 AI、敌人 AI |
| px-*.js | 渲染：地图（像素块）、敌人（像素图）、特效、HUD 上的文字（640×360 逻辑分辨率，`T=40` 每格，16×9 格）；**角色是 px-lpc.js 的 LPC 像素精灵**（见阶段 10） |
| save.js | 存档 `loadSave/writeSave/editSave`、导出导入 `exportSave/importSave`、星星账本 `starBank`、角色等级 `levelOf/charLevels` |
| ui-bar.js | 顶栏、队伍栏、卡牌栏、提示 `toast`、成就解锁 `unlockAchv`、法术按钮 |
| ui-panels.js | 角色信息面板、翻牌面板、商店、事件面板、场地拖动站位、快捷键、**沉浸全屏 `setImm` 和手机 HUD** |
| ui-roster.js | 剧情播放、选英雄、角色养成页、天赋树、结算经验、战绩入档 |
| ui-menu.js | 选关页、星盘页、深渊/每周 UI、图鉴、成就、存档页、进关流程 `beginStage/startRun`、新手引导、结算页 `checkOver/showResult(R)`（只画界面） |
| settle.js | **结算** `settleRun()`：一局结束时写存档（战绩 `recordRun`、经验 `awardExp`、成就、星级、通关奖励 `runReward`、守望/每日/无尽/每周记录），返回结果对象给结算页 |
| exped.js | **远征模式**：路线图、战斗之间的快照 `expSnap/expRestore`、结算 `expSettle`、休整、选关页卡片 |
| main.js | 主循环 `frame()`、开机、`window.__td` 测试接口 |

## 关键机制速查
- **固定步长**：`step(dt)` 是全部游戏逻辑，`frame()` 只负责按 30Hz 调它并渲染。测试直接调 `__td.step(1/30)`。
- **暂停条件**：`S.offer`（翻牌）/`S.shop`/`S.event`/`S.cine`（首领演出）任一存在时，`step` 不推进战斗。
- **敌人强度**：`spawnAt` 里 `hp = d.hp × stageHp() × S.waveHp × S.diffK.hp × …`。`S.diffK` = 难度 × 深渊 × 每周规则，在 `newRun` 里合成。
- **经验曲线**（12.1）：`xpNeedOf(lv) = 22 × BAL.xpR^(lv-1) × S.xpK`（`BAL.xpR = 1.5`，深渊 11 层起 ×1.15；无尽 / 守望用 1.15、系数 1）。`STAGES[i].xpK` 在 config.js 末尾按「这一关出怪总量」算，让每关选牌次数差不多（约 9–12 次，含开局、箱子、事件）。**平衡旋钮集中在 arena.js 的 `BAL`**（`levelBonus` 每级全队攻击 / 生命 +20%、`act` 三幕加成 `[1, 1.12, 1.3]`），sim 用 `PATCH='BAL.levelBonus=0.2'` 就能试。
- **随机数**：影响对局的随机一律用 `roll("用途")`（arena.js 里的 `RNG_KEYS`：card/ev/relic/afx/spawn/fight/shop），波次生成用 `S.rng`。每日/每周挑战时它们都带种子，同样的操作打两次结果完全一样（`tests/seeded.js` 会检查）；**只有纯画面效果**（粒子、飘字、抖屏、走路动画）才直接用 `Math.random`。新加随机逻辑时别直接写 `Math.random()`。
- **结算**：`settleRun()`（settle.js）把一局的存档结算一次做完，同一局重复调用返回同一个结果；`checkOver` 先结算、再播通关剧情、再出结算页，所以剧情中途关页面也不丢奖励。主线成就和关卡通关剧情只在主线关卡发/播（守望之战、每周、每日、无尽都不算）；「通关某关」的成就配在 `STAGES[i].clearAchv` 里。每周记录按周累积在 `save.week[key]` 里，每周首通各算 5★。
- **牌池**：`cardPool()`；牌快抽空时自动补进 `fl_*` 补充卡（可无限叠加）。
- **无尽模式**：`startWave` 里按需 `genWave()`，不会出现空波。
- **商店/事件**会「欠着」：叠波跳过了第 4/5 波也会在之后补开。
- **存档**：localStorage 键 `chenxing-td-v2`，都在 `save.js`。`loadSave()` 是**白名单 + 类型清洗**，新加存档字段必须在 `loadSave` 里声明（写清类型和范围），否则下次写存档就被丢掉。导出码前缀 `CX9-`。
  - **版本**：存档带 `ver`（当前 `SAVE_VER = 14`）。改存档结构时 `SAVE_VER` +1，并在 `SAVE_MIGRATE` 末尾加一步升级函数；旧存档读入时按顺序补跑，升级前自动备份。
  - **备份**：`chenxing-td-v2-backup` 只存一份（导入前、升级前各自动存一次），存档页有「恢复这份备份」按钮，恢复是互换的，可以再换回来。更新版本的存档拒绝导入。
- **星星账本**：`starBank()` = 关卡星级 + 困难/噩梦首通 + 无尽每 10 波 + 成就 + 深渊每层首通 + 每周首通 + `bonusStars` − 星盘花费 `diskSpent`。`bonusStars` 来自：每次通关 `runReward()`（1★ + 难度 `DIFF_BONUS`=[0,2,3] + 深渊每 5 层 1★）、每日挑战 `DAILY_STARS`（通关 5★、过半波数 2★，按当天最好一次补差价，记在 `save.daily[date].got`）、每周挑战通关。
- **沉浸全屏**：`body.imm` 类，战场 fixed 铺满窗口，`resize()` 按窗口等比缩放；手机（横屏高 ≤ 520px、竖屏宽 ≤ 520px）开局自动进入。横屏按钮浮在战场两边；**竖屏**（CSS `orientation:portrait`）是顶栏 + 撑满宽度的战场 + 下面的大按钮区，`.hud` 变成 `display:contents` 排进竖向布局，一屏看全不滚动。全屏时有翻牌/商店/菜单/剧情打开，`body.panel` 会把提示藏起来。浏览器原生全屏只是顺带尝试：嵌在 iframe 里通常不给，iPhone 上网页根本没有全屏接口，所以 Claude 页面的顶栏去不掉。
- **爽感/画面（阶段 4）**：
  - 画质档位 `GFX`（fight.js，低/中/高/自动，存档字段 `gfx`）控制粒子数量、特效上限、抖屏和环境粒子；新特效一律用 `addFx()`，粒子和小飘字超上限会被丢掉，横幅等关键反馈不受影响。
  - 伤害数字按目标合并（`addNum` 的 key），一下打掉 3 成血以上显示最大号；精英/首领击杀有顿帧 `S.hitStop`（只在 `frame()` 里生效，不影响 `step` 逻辑和模拟）。
  - 波前 3 秒出怪预告（传送门光圈 + 敌人图标）和大波预警横幅（`nextWaveInfo()`、`S.warnWave`）。
  - **竖屏信息区** `#pinfo`（战场和按钮之间）：波次、大号连杀、队员血条/技力（点一下选中、技力满再点放技能）、下一波、本局卡牌和遗物，由 `updatePInfo()` 刷新。
  - **羁绊看板**：`updateSynBar()` 同时刷新电脑底栏 `#syns`、竖屏信息区 `#pi-syn`、横屏全屏左下角 `#h-syn`（宽度靠 `--fw` 算左边黑边）；点看板或「?」打开 `showSynGuide()`（羁绊一览，暂停战斗）。凑法说明在 config-meta.js 的 `SYN_HOW`，图鉴也有羁绊页。
  - **队员属性**：`unitStats(u)` / `unitCardHtml(u)`（ui-panels.js）。竖屏信息区队员格显示「Lv角色等级 · 阶数」，下面的 `#pi-sel` 显示选中队员（没选就是英雄）的主要属性和技能；横屏全屏选中队员时战场左上角弹 `#h-unit` 属性卡。由 `updateUnitCards()` 每 0.25 秒刷新。
  - **晨星碑血条** `.cbar`：电脑在经验条上方（`.cbar.desk`），全屏时在顶栏第一行；`updateCrystalBars()` 每帧刷新，掉血有残影、<60% 变黄、<30% 变红闪、挨打（`crystal.hitT`）红框。
  - 天赋星盘节点显示「当前：…」和「下一级 / 点亮后：…」，都来自 `DISK[i].desc(lv)`，所以 desc 要写清楚加的是什么属性。
  - 羁绊 `SYNERGY[i].prog()` 返回 `[已有, 需要]`，`on()` 由它派生；选牌时 `synHint(p)` 假装拿了这张牌算进度，卡面显示「羁绊 x/y」或「凑齐羁绊」。
  - 结算页 `animResult()`：数字从 0 滚动、星星逐个落下、MVP 聚光；按钮栏在结算页固定在底部。测试读结算数字要等动画（约 1.3 秒）跑完。
  - 图鉴有卡牌/遗物页，存档字段 `cardSeen`（结算时由 `recordRun` 写入，遗物也在这里补记）；集齐有成就 `cards` / `relics`。
  - 这些都在 `tests/juice.js` 里有回归测试。
- **阶段 5**（`tests/phase5.js`）：
  - **进化卡**：cards.js 里 `ev_*`（`evo: "sk_xxx"`、kind `evo`），基础技能卡满级后才进牌堆（权重固定 8，不随稀有度打折）；效果在 `autoCast`/`autoSkills` 里用 `evo("sk_xxx")` 判断。按金色显示但**不算传说卡**（不计 `S.legends`、不触发双传说），也不算「博览群牌」成就（`CODEX_CARDS` 排除，图鉴单列 `EVO_CARDS`）。
  - **集火**：点战场上的敌人 `setFocus(e)`（再点取消），`S.focus` 存对象，`focusFoe()` 会在它死后清掉；`pickTargets` 把它排第一，`hurt` 对它 ×`FOCUS_BONUS`(1.15)。机器人不会用，所以不影响平衡模拟。
  - **首领演出**：`bossFanfare(e, "phase"|"death")`：上下黑边 `letterbox`、闪光、冲击环；击破时用 `queueFx` 排队放连环爆炸 → 光柱 → 「首领击破」横幅（`fxQueueStep` 在 step 里推进）。狂暴时画面四周暗红呼吸 `drawBossMood`。首领血条加宽、有残影和百分比，横屏全屏时自动挪到顶栏下面。
  - **技能特写**：`useSkill` 结束时加一条 `skillcut` 特效（头像 + 技能名的斜横幅，同一时间只留最新一条），英雄放技能再闪一下。
- **阶段 6**（`tests/phase6.js`）：
  - **核心天赋**：meta.js 的 `DISK` 里 `key: true` 的 4 个节点（`ks_atk/ks_def/ks_eco/ks_arc`），本线非核心节点投入 `KEY_NEED`(12) 级才能点，最多 `KEY_MAX`(2) 个；能不能买统一走 `diskCanBuy(disk, id, left)`（星盘页和 sim 都用它）。效果：`hurt` 里暴击弹射、`hurtCrystal` 复活、`startWave` 每 5 波多翻牌、`castUlt` 后 `S.resoT`。
  - **觉醒**：不加存档字段，直接从角色经验算：10 级后每 `AWK.need`(600) 经验一级，最多 5 级（`awkOf(exp)`、`charAwks()`）。开局经 `startRun` 传 `charAwk`，`clvK` 里乘 `1 + AWK.perLv × 觉醒`；3 级脚下金色光环，5 级 `awkSp` 技力 +20%。**sim 必须传 `charAwk: {}`**，否则同一进程里前几局攒的经验会让后几局的角色觉醒，结果失真。
  - **每日悬赏**：settle.js 的 `BOUNTY_TYPES`，`todayBounties()` 用日期种子抽 3 条，`checkBounties(R)` 在每次结算时判定，每条 +3★、全完成再 +3★，记在存档 `bounty: { date, done }`。靠 `S.eliteKills / S.focusKills / S.rerollsUsed` 等计数。**测星星数的测试要先把今天的悬赏标成已完成**，否则会顺带多出星星。
  - **远征**：exped.js。6 层，每层普通战 / 精英战二选一或三选一，第 2、4 场后休整（五选一），最后一层首领。战斗用原关卡地图、波数 ×0.6（首领 ×0.75），敌人血量每层 +38%、攻击 +12%（`EXPED.hpStep/atkStep`），精英战再 ×1.3 并必掉遗物。进行中的进度存在单独的 localStorage 键 `chenxing-td-exp`（不进主存档），主存档只记 `exped: { best, clears, runs }`。结算模式 `R.mode === "exped"`。机器人（每层都挑普通战）完成率：四章进度约 17%，满级 + 400★ 约 50%。
  - 远程敌人 8 秒没挨打就不再站桩放风筝（`e.hurtAt`），修了全队近战时打不到虚无术士、整局卡住的问题。
  - `tests/balance.js` 开跑前会删掉上次的 `bal-*.json`，某一格没跑出来会直接报错，不会悄悄读旧数据；sim 在旧构建（没有 `diskCanBuy`）上会退回老的买法。
- **阶段 7**（玩法/画质扩充，测试：`ct6 c3 bossmech` 等）：
  - **自选契约** `CONTRACTS`（config-meta.js）：选关页可勾的 6 种加难条件，点数越多通关额外星星越多（`contractStars`，进 `runReward`）；`S.contracts`，用 `ct(id)` 判断。
  - **连败辅助**：存档字段 `lose`（主线每关连续失败次数，`SAVE_VER` 13），2 次起晨星碑生命 +8%、4 次起 +16%（`ASSIST`/`assistOf`，在 `startRun` 里加；**sim 要传 `assist: 0`**，否则同进程里连败会让后面的局变简单）。结算页输了会提示差一点的羁绊。
  - **角色精通**：按该角色的通关胜场（`use[id].win`）3/10/25 局分「熟练/精通/宗师」（`MASTERY`、`masteryOf`），只换外观（角色页称号、战场脚下小菱形 `S.mast`），不加数值，不进存档。
  - **首领专属特性**：boss.js 的 `BOSS_MECH`，每位首领一条（号角召狼、分裂、汲魔回血、护佑光环、饕餮、震地、俯冲、岩肤、冰甲、自动维修、嚎叫、余烬、碑文反噬、落雷、抹除），入场演出里会显示；带「预警」的先在目标脚下画一圈、1 秒后结算。只对 `isBoss(e) || e.lead` 生效。
  - （天气 / 昼夜遮罩已在 12.2 删除，包括雷暴闪电。）
  - **图鉴总完成度**（save.js `codexProgress`）：敌人 + 卡牌 + 遗物 + 词缀 + 事件的收集率，25/50/75/100% 给称号和星星（共 +20★，直接按进度算进 `starBank`，不额外存档）。
  - **本局规则页**（`rulesHtml`，点羁绊看板打开）、12.0 更新说明（`showNews`，localStorage `chenxing-td-news`）、一次性提示 `once(key, html)`（`chenxing-td-hints`）。
  - sim 机器人会在首领读条时集火并用陨星术打断（`NOFOCUS=1` 可关）；实测对胜率影响很小（多在噪声内），说明中后期的瓶颈不在打断。
  - **第五章 · 无声之海**（第 17–20 关：潮汐海岸、沉没钟楼、镜面回廊、无声之海）：新主题 `tide/sunken/mirror/silent`（**新主题要同时加到 px-core.js `THEMES`、ui-menu.js `THUMB`、arena.js `THEME_NAME`，缺一个选关页就白屏**），7 种新敌人（皮肤复用 + `pal` 换色）、最终首领静默者（`BOSS_TYPES`）。`tests/ch5.js` 对**全部关卡**做数据体检（主题/敌人/地图可达/首领称号大招特性、剧情与关卡一一对应），以后加关卡先跑它。毕业档模拟胜率约 第17关 100% / 18 关 75% / 19 关 42% / 20 关 38%。`balance.js` 加了「五章」档，默认跑 20 关。
  - **新角色（第 17–20 关解锁）**：凯伦（反击者 `counter`）、薇拉（猎魔人 `hunter`）、莉亚（潮汐歌者 `songstress`）、澈（断音者 `breaker`），各有技能、2 个转职、天赋、专属卡（`sg_co1/hu1/so1/br1`）、像素图。机制散在 fight.js（`hurtUnit` 反弹、`landShot` 的 hunter/songstress、`useSkill`、`autoWant`）。`joinExp` 起步经验按「第 13 关加入」封顶，否则后加入的角色一加入就满觉醒。
  - **新卡 8 张**：潮汐涌动 `sk_tide`、钟鸣 `sk_bell`、回声 `echo`、静默领域 `silence`、打捞 `salvage`、镜面护甲 `mirrorarmor`、传说 潮汐回复 `lg_tide` / 猎杀连击 `lg_hunt`；羁绊 潮与钟 `tidebell`、静默与回声 `silentecho`（都带二档）。测试 `cards5`、`heroes5`。
  - 平衡矩阵（SEED=2026，RUNS=24，20 关 6 档）：毕业档第 1–11 关 88–100%，12 关 58%，13–15 关 63–100%，16 关 8%；第五章毕业档 92 / 75 / ~30 / 58%。24 局一格的误差约 ±10 个百分点，**差异小于 15 个百分点别当真**；定位问题先用固定英雄（`HERO=`）排除英雄轮换带来的噪声。
- **阶段 8（展示提升，测试：`feel grow soak-long`）**：
  - **提示角标**：`toast()` 在战斗中缩成一行「角标」（标题 + 点开展开，4.5 秒消失），菜单里仍是完整卡片；写提示文案时用 `<b>标题</b>正文` 的格式。
  - **站位错开**：`ringSlots` 三人以上隔一个往外 0.32 格；复活倒计时圆环（`u.downMax`）；血条随血量变色，<30% 红闪。
  - **选关页**：每章主题色 `CH_COL`、「下一关」金边标签、困难/噩梦/深渊徽章、章节星级进度条。
  - **打击感**：分级顿帧（暴击精英 0.035s、冷却 0.35s；首领换形态 0.12s；英雄放技能 0.06s，`OPT.calm` 下全关）、暴击击退 0.18 格、挨打压扁（`drawEnemy`）、暴击数字深橙描边、治疗数字带 `+`、`burstlines` 技能冲击线。**crit 反馈要放在 `hurt()` 吃护盾之前**，否则带护盾的敌人（含精英词缀「壁垒」）会吞掉反馈。
  - **升级层次**：选牌飞向受益者 `flyCardTo`（`cardfly` 特效 + 落地 `queueFx`）、升阶分级特效（2/3/4 阶越来越大）、卡牌栏星级点与满级金边、HUD「战力 ×N」（`teamGrowth`）、经验条里的「目标：凑齐某羁绊」（`nextGoal`）。
  - **细节**：地面小细节 `drawGroundDecals`（画进静态地图）、墙上火把 `TORCH`、晨星碑裂纹/受击闪白、精英/首领脚下光环、4 阶转职外观（A 光翼 / B 肩火）、角色移动抖步。
  - **流畅度**：预测式降画质（怪 >36 或特效 >60% 上限时 50 帧就降）、菜单「显示帧率」（`OPT.fps`，左上角显示帧率/画质/敌人数）、`tests/soak-long.js`（无尽 20 分钟压力：数组有界、无 NaN）。
- **阶段 9：竖屏大画面**（`tests/big.js`）：手机竖屏时把战场**在显示层转 90°**（9×16 格，战场面积约为横版的 2 倍），**游戏逻辑、平衡、存档完全不动**，横屏和电脑原样。
  - 状态：`ROT`（px-core.js，由 `resize()` 里 `setRot()` 决定：竖屏沉浸 + `OPT.big` + 转过来比不转至少大 12% 才开，否则退回横版布局）。`LW/LH` 是地图本身的 640×360，`PW/PHt` 是**画布（视图）**尺寸，转了以后宽高对调。
  - **坐标**：所有角色、敌人、特效、文字都经过 `tpx/unitFeet/foeFeet`，它们里面的 `vpt(lx,ly)` 把横版像素换成视图像素；方向向量用 `vdir`（弹道、机关光束、出怪箭头）；朝向用 `vFace`（竖屏下按屏幕横向算）。**新写画面代码：位置一律用 `tpx`，别自己写 `x * T + 20`；要从逻辑方向算屏幕方向，过一遍 `vdir`；需要铺满画面的叠加层用 `PW/PHt`（视图），按地图尺寸画的用 `LW/LH`。**
  - **世界层**：`render()` 里 `WP = true` 期间整体套旋转矩阵 `(0,1,-1,0,LH,0)`，画底图、地面痕迹、`drawAmbient` 里按格子画的水/熔岩/传送门/晨星碑/火把；晨星碑、传送门、火把要在里面用 `upright(cx, cy, fn)` 转回直立；屏幕空间的粒子（雪、雨、萤火）在 `drawAmbientParticles` 里，不跟着转。底图里的树/石头/墓碑在 `drawMap` 烘焙时先反转一次（`mapKey` 带 `:r`，竖屏和横版是两份底图）。
  - **输入**：`posFromEvent` 里按 `ROT` 反向换算（点选、集火、拖站位、陨星落点都测过）。
  - **布局**：`body.big` 类；`bigUsed()` 量出战场以外所有排版元素的高度，剩下的都给战场；`fitCheck()` 每 0.4 秒看一眼，队员数变了就重排。**为省高度**：顶栏压成一行；信息条只留一行羁绊 + 一行队员（图标 + 血条/技力条，不写名字）；法术 3 个和控制键 5 个（出击/自动/倍速/暂停/更多）合成**一排**（`.hud-btns`），阵型/选关/退出收进「更多」弹层（`#hud-more`，横屏/电脑里 `display:contents` 原样平铺）。iPhone Safari 可视区约 390×750 时战场约占宽度 85%；战场两侧的空位铺一层放大压暗的地图当背景（`updateBgFill()`，写在 `.stage` 的 backgroundImage，`drawMap` 末尾刷新）。选中队员的属性卡浮在战场左上角。菜单有「竖屏大画面 · 开/关」。
  - **防黑屏**（真机反馈过）：① `frame()` 外面包了 try/catch，一帧报错也照样排下一帧（错误用 `setTimeout` 再抛，前 3 次，测试里仍会被当成 pageerror）；② 静态底图 `mapCv` 是离屏画布，iOS 可能回收，`mapGuard()` 每 2 秒抽一个像素，发现空了就重画；切后台回来（`pageshow`/`visibilitychange`）也重画；③ `resize()` 只在尺寸真变时才给 `tx` 赋宽高（赋值会清空并重新分配画布）、尾部马上补画一帧；`window.resize` 走 `resizeSoon()` 每帧最多一次；④ 开/关竖屏大画面有滞回：关→开要比横版大 12%，已开着只要不比横版小就不关，边缘上不来回跳。回归在 `tests/big.js`。
- **阶段 10：发热/耗电与「朴素克制」**（测试 `heat`）：
  - **发热是首要底线**（Jenny 反馈过手机玩一会就严重发热）。`frameGap()`（main.js）决定每帧间隔：触屏设备默认省电 30 帧（`OPT.eco`，`TOUCH` 判断触屏，存档里 `ecoV !== 2` 的旧值按新默认重来），电脑 60 帧封顶（120Hz 屏也只画 60）；有面板/菜单/结算盖住战场时 8 帧，暂停 15 帧。逻辑本来是固定 30Hz，画 30 帧不会有卡顿感。界面刷新（`updateStats` 等一批）每 100ms 一次，`updateTut/updateDlg/animRoster` 仍每帧。文字层画布 `tx` 的 `DPR` 省电下封顶 1.5。`adaptGfx(dt, target)` 按目标帧率归一化（30 帧封顶不会被误判为卡），触屏自动画质最高「中」。**新加每帧逻辑/动画前先想一下耗电**：别加常驻发光、每帧建渐变、`setInterval`；CSS 里也别加无限循环的动画。
  - **朴素克制的风格约定**（Jenny 觉得整体「AI 味」太重）：界面不要扫光、旋转光芒、脉冲发光、大片光晕（head.html 末尾那段「朴素克制」覆盖规则），稀有度靠边框颜色；画面上不加常驻光环（精英/首领/觉醒/连杀边缘光都去掉了，只剩首领狂暴红光）；文案短而直白，**不用感叹号和口号**，名字直白（例如「持续回血」「死亡爆炸」「大招充能」「前排阵」，进化卡叫「陨星雨·进化」），不写「XX之力/XX之心/永恒/神圣/万军」这类大词；不用「粗体标题 + 长解释 + 省略号列举」的排版。新加卡牌/遗物/羁绊/成就的名字照这个来。
  - **清晰度（Jenny 嫌「颗粒感重、粗糙」）**：战场画布 `cv` 不再是 640×360 的小画布硬拉伸，而是按设备分辨率渲染：`RS`（px-core.js `resize()` 里算，整数，低档 1 / 中档最多 2 / 高档最多 3，由 `GFX.rs` 封顶），`cv.width = PW × RS`，`render()` 里所有 `setTransform` 都要乘 `RS`（新加的整屏变换同理）；CSS `image-rendering` 在 RS>1 时用 `auto`，让浏览器平滑缩小。底图/地面痕迹 `imageSmoothingEnabled=false` 保持像素块，角色/怪物/光斑/影子打开平滑。发光是叠加混合、填充面积随 RS² 增长，所以 `addGlow` 有每帧预算 `GFX.glow`。头像/半身像画布也是平滑缩放。**别再把角色改成大肩甲写实风**（试过魔兽风格，Jenny 说难看，已撤回）。
  - **角色用现成的免费像素素材（px-lpc.js）**：Jenny 先后嫌代码画的像素角色、魔兽风格、矢量 Q 版都「像小学生画的」，所以改用 **Liberated Pixel Cup（LPC）社区的专业像素素材**（Universal LPC Spritesheet Character Generator）。20 名角色的搭配写在 `tools/lpc/heroes.js`（每条是生成器页面 # 后面的参数，键=部件类型，值=名称_颜色；`ATK` 表指定每人出手用哪段动画）；流水线：`tools/lpc/build.js`（需要本地跑着生成器：克隆 `LiberatedPixelCup/universal-lpc-spritesheet-character-generator`，`npm install`，`npx vite --port 5199`；会渲染整张精灵表并下载署名 CSV，输出在 `tools/lpc/out/`，已 gitignore）→ `pack.js`（裁成每人一张紧凑精灵表，只留面朝右的 walk/hurt/front/cast/atk，存 `tools/lpc/pack/`，已提交）→ `embed.js`（base64 内嵌进 `src/lpc-data.js`）→ `credits.js`（生成 `src/lpc-credits.js` 和根目录 `CREDITS-LPC.md`）。运行时 `drawLpc/drawHeroFig(g, D, o, x, y, ks)` 按状态选动画帧（站立=walk 第 0 帧 + 轻微起伏，走路=walk，出手=atk 按 `u.atkT` 取帧，施法=cast，受击/倒地=hurt），面朝左就水平翻转，转职/受击用 source-atop 叠色；`heroPic(D,{face,lv,branch})` 给头像/半身像/技能特写（正面站姿 4 倍放大成 256×256）；`LPC_K=1.5` 是战场放大倍数（RS=2 时每个素材像素正好 3 个设备像素）。**加载是异步的**（`lpcLoad()`，加载完 `lpcDone()` 会重画头像）。换搭配：改 heroes.js → 起生成器 → build → pack → embed → credits → `npm run check`。**许可证**：素材是 CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 等，必须署名且衍生美术同样分享；游戏菜单有「素材署名」页，别删。石像守卫（召唤物）仍是旧像素图（px-hero.js）。
  - **角色外观分层 + 皮肤（阶段 11）**：角色不再是一张整图，而是**身体层 + 武器层**叠绘（大尺寸武器的出手动画里衣服层只有 64 像素版本，整图渲染会让出手帧衣服消失，所以分开）。每名角色 `LPC_PACK[id].parts`：`nude`（裸体：身体 + 脸 + 头发）、`s0t2…s1t4`（两套外观各自的 2/3/4 阶，累加穿上）、`weapon`（武器 / 盾 / 箭袋，行走和出手用 128/192 大尺寸动画）。**阶数 = 穿几阶的衣服**（`u.lv` 1..4，1 阶完全裸体，Jenny 要求的）；放招也用 atk 行，所以没有 cast 行。搭配写在 `tools/lpc/skins.js`（每套只写新增的几件，名称变体经 `catalog.js` 查验，写错会抛错；`spec(id, part)` 给出生成器参数）。**第 2 套外观改成每人一个明显主题**（翅膀 / 尾巴 / 角 / 帽子，衣服仍是泳装 / 内衣级别，名字见 `src/skins.js`）。**装备不挡脸和胸**（Jenny 要求）：不再给骑士、反击者配盾；头盔换成露脸款（诺曼盔 / 尖盔）；兜帽换成头巾 / 头巾帽；法杖换成立在身侧的款式（简易法杖 / 手杖 / 魔杖，法师、召唤师、时间法师出手改用 `cast` 动画）；弓手和猎人行走 / 站立 / 受击时弓收起来，只留背上的箭袋（`skins.js` 里 `stow: true`，渲染额外的 `quiver` 部件，`skinpack.js` 用它做 weapon 的 walk / hurt / front 行，出手行仍是完整的弓）。新加装备前先看放大图确认没盖住脸和胸。 **第 2 套外观偏性感**（Jenny 要求「市面普通游戏尺度」，泳装 / 内衣级别，非露骨）：生成器里没有泳装，所以用 `X(类型, 名称, 变体, 保留比例)` 把背心 / 束腰 / 短裤 / 短裙**裁短**成抹胸、紧身胸衣、比基尼裤、超短裙（只保留这件衣服自己高度的上 N%），这些裁短图层单独渲染（`s1x<i>`），`skin` 部件是只有身体和脸的遮罩，`skinpack.js` 把它们叠在「身体 + 其余衣服」上、只画在露出皮肤的像素（和遮罩同色）上，衣服遮住的地方不动；渲染这批用 `node tools/lpc/skinbuild.js all bikini`。**胸 / 臀加大试过，已撤掉**：对身体图做整行水平拉伸（`CURVE`，skins.js 里留着但注释掉了）会把挥动的手臂拉成尖角、整个人看着变形（Jenny：「都拉变形了」）。要做必须只改躯干轮廓、手臂不动，并且**先出对比图给 Jenny 看再接入**。英雄和怪物在战场上一样大（`HERO_KS = 1`，Jenny 说 1.5 倍够了，只放大没用）；角色页预览放大到 `ks 2.8`，流水线：`node tools/lpc/skinbuild.js [ids] [parts]`（要先起生成器 vite，3 页并行，约 40 分钟全量）→ `node tools/lpc/skinpack.js`（裁成 pack-skins/）→ `python3 -W ignore tools/lpc/shrink.py tools/lpc/pack-skins tools/lpc/pack-foes`（转调色板 PNG，**无损**，体积缩到 1/4，需要 `pip install pillow`）→ `SET=skins node tools/lpc/embed.js`（→ lpc-data.js）→ `node tools/lpc/credits.js`。运行时 px-lpc.js：`heroLayers(id, tier)` 选图层（没加载好就退到低一阶）、`lpcWant/lpcWantHero` 按需加载部件图（头像只要裸体 + 4 阶 + 武器，上场的角色在 `drawUnit` 里再要全套）、`SKIN_EQ[id]` 当前穿的外观、`heroPic(D,{lv})`（lv 不写 = 4 阶全套，菜单头像都这样；战场里的头像传 `u.lv`）。外观数据在 `src/skins.js`：`SKIN_DEF`（名字 + 第 2 套的解锁条件：`stars` 星星兑换 / `win` 该角色通关胜场 / `awk` 觉醒等级）、`skinOwned/wearSkin/buySkin/syncSkins`；存档 `skin`（穿着）、`skinBuy`（星星兑换过的，花费算进 `starBank` 的支出），`SAVE_VER` 14。角色页（ui-roster.js `skinHtml`）有外观缩略图、预览阶数按钮、穿上 / 兑换按钮。**别给晚加入的角色（joinExp 起步经验高）配 `awk` 条件**，她们一开始就满足。测试 `tests/skins.js`、`tests/lpc.js`。
  - **技能画面效果（阶段 11）**：px-skill.js。瞬发技能放招时 `skillFx(u,D,R)` 加一次性范围特效（冰封领域=暴风雪、陨星=砸向每个敌人、龙枪=枪光、停滞=钟面、退潮=水墙、截断=交叉斩、石像=符文阵、强酸瓶=抛物线、圣盾=罩子撑开），持续型技能每帧 `drawSkillAuras` 按英雄画各自的光环（盖在所有单位上面）+ 头顶剩余时间条（`u.skillMax`）；`addFxLater(f, delay)` 做延迟出现的特效。放招动作：`u.castT`，用角色自己的 atk 动画慢放一遍，**不停顿**。
  - **黑屏的一个原因（已修）**：自动画质升降会改战场画布的渲染倍数，等于销毁重建画布，一降一升就「黑一下、恢复、过几秒又黑」。现在自动档的渲染倍数 `rsCap()` 一局内固定，降过档就不再升回去（`gfxDropped`）；菜单有「诊断信息」页（`DIAG` 记录画质 / 画布 / 出错 / 卡住）。
  - **怪物也用 LPC（阶段 10 续）**：`tools/lpc/foes.js`（搭配 + `ATK` 出手动画表，键 = 敌人类型）；同一条流水线加环境变量 `SET=foes`：`SET=foes node tools/lpc/build.js [id,..]` → `SET=foes node tools/lpc/pack.js`（只留 walk + atk，另量出站姿占位 `box`，存 `tools/lpc/pack-foes/`）→ `SET=foes node tools/lpc/embed.js`（→ `src/lpc-foe-data.js`，`LPC_FOE_PACK`）→ `node tools/lpc/credits.js`（作者合并两套）。覆盖 42 种怪物和全部首领；**史莱姆、大史莱姆、宝箱怪、沙虫、蝎子、礁蟹、机械蜘蛛、无人机没有合适素材，仍用 px-foe.js 的旧像素图**（`foeLpc(type)` 为空就走旧路径）。运行时在 px-foe.js 末尾：`FOE_KS` 战场放大系数（相对角色，取 2/3 的倍数：哥布林/小恶魔 2/3，首领 4/3，三个最终首领 5/3），`foeBox(type)` 占位（血条/冰冻框/碎裂用），`foeFly`，`drawFoeFig(g,type,o,x,y)`（战场里直接画，不缓存；o 有 `phase` 行走相位、`atkT`、`tint`、`sx/sy` 压扁），`renderFoe` 对 LPC 类型返回 2× 分辨率的静态图，画布带 `.S`（逻辑边长）`.fx/.fy`（脚底）——**所有用 renderFoe 的地方都要按 `.S/.fx/.fy` 算，不能再写死 120 / 60 / 112**；图标截取用 `foeCrop`，对话立绘用 `foeBust`。精英 = 金色 `ELITE_TINT` + 脚下圈，不再有描边。怪物图在 `lpcLoad` 里和角色一起加载（共约 1MB base64，解码后每张 0.3MB 左右）。**放招动作**：英雄 `useSkill` 里设 `u.castT = CAST_POSE`（0.6 秒，step 里递减），`drawUnit` 传 `cast` 进度（0→1），`drawLpc` 里 `o.cast >= 0` 优先于出手动作，播 cast 行一遍并微微抬起；怪物放读条大招（`e.cast`，停在抬手帧）和 AOE/治疗/召唤时设 `e.skT = 0.7`，同样播 cast 行（怪物包里有 walk + cast + atk 三行）。测试 `tests/foes-lpc.js`。
  - **防黑屏（第二轮）**：放大后的怪物帧缓存画布满了要回收复用（`BIG_POOL`），不要一直新建画布（iOS 画布内存不及时释放，打几分钟就整屏黑）；主循环有看门狗（`loopId`/`lastFrameAt`），帧里出错会在左下角显示红色小提示（截图能看到原因）。
- **viewport**：`head.html` 里的 `<meta name="viewport">` 不能删——没有它手机会按 980px 宽的电脑网页排版再整体缩小。

## 踩过的坑
- 所有源码在同一个全局作用域：**顶层重名会让整页白屏**，每次改完跑 `node tests/syntax.js`。
- 用 sed 批量改名时曾把 `next.res` 改成了 `nexeRes(t)`，只在特定专属卡触发时才崩。批量替换后要全局 grep 检查奇怪的标识符。
- 无头测试里如果只调 `step()`，结算不会自动执行（`checkOver` 在 `frame()` 里）；要么设好 `S.over` 后直接调 `__td.settle()`，要么等浏览器跑几帧（结算页也会出来）。
- 翻牌面板开着时，场地拖动和 HUD 按钮都会被挡住，这是故意的。

## 12.1 要点（阶段 12：节奏 + 角色羁绊）
- **每关拉长到 21–28 波**：config.js 末尾 `s.waves = round(22 + (baseWaves − 12) × 0.6)`，`s.wk = waves / baseWaves`；出怪强度（预算、敌人池解锁、`S.waveHp`）按「原来的波数 = w / wk」算，所以只是拉长。远征用 `baseWaves`（`exped.js`），无尽 / 守望不分幕、不缩放（`K = 1`）。商店每 6 波（`SHOP.everyWaves`）、事件每 7 波（`EVENT_EVERY`）。
- **三幕**（`actOf(w)`、`S.act`）：前 34% 起步、到 68% 成型、之后最后一段；进入新幕时 `startWave` 弹横幅 + `actFlash`（全屏金闪 + 晨星碑光圈）；`levelK()` = `(1 + levelBonus × (Lv−1)) × act 加成`，乘进 `uAtk/uMaxHp`（召唤物不算）。升级时 `refreshMaxHp()` 刷新生命上限。结算页曲线多一条橙色「战力」线（`S.log[].p`）。
- **角色羁绊**见 traits.js：效果键、上限 `TRAIT_CAP`、各处接入点（`uAtk/uMaxHp/uDef/uInterval/uRange/hurt/hurtUnit/hurtCrystal/heal/pickTargets/useSkill/eSpeed/reviveT/killEnemy 星尘/startWave 重抽/step.js 技力`）。**新加效果键要同时加进 `TRAIT_CAP` 和对应的公式**。看板 `traitChips()`（横屏全屏只放前 4 个）、指南页 `traitGuideHtml(live)`、选牌提示（伙伴卡显示「近卫 2→3 ▲」）、角色页 / 属性卡标签。成就 `trait4 / trait5 / pair3`，每日悬赏 `trait`。测试 `tests/traits.js`。
- 头像 / 半身像用 `lpcScale2x`（Scale2x 像素平滑放大，px-lpc.js）。注意 px-core.js 里已有同名思路的 `scale2x`，**别重名**。
- 击败数里程碑（`KILL_MARKS`）在晨星碑上方弹字。
- **12.1 平衡基准**（`SEED=2026 RUNS=12 node ../balance.js`，每格 12 局，误差约 ±15 个百分点）：新手档 第 1–4 关 100/92/58/58%，二章档 第 5–8 关 75/58/67/0%，三章档 第 9–12 关 17/17/25/0%，四章档 第 13–16 关 8/17/17/0%，毕业档 第 1–11 关 83–100%，第 12 关 44%（`EASE` 下调 10% 敌人生命后），第 13–15 关 83/92/83%，第 16 关 13%，第五章 69/69/25/44%。config.js 末尾的 `EASE` 表是拉长后针对第 12 关和第五章做的敌人生命校准。

## 12.2 要点（站位、寻路、去天气、打击特效）
- **寻路**（arena.js `buildFlow/FLOW/lineBlocked/flowWaypoint`，step.js `moveToward`）：`loadStage` 时从晨星碑做一遍 BFS；地面敌人和目标之间被墙 / 水挡住（每 0.25 秒判断一次），就顺着 FLOW 一格一格绕。卡住 3 秒会进入 1.2 秒的「穿墙」兜底（`e.ghostT`）。角落的出怪口被墙围着，`flowWaypoint` 会找 2 格内最近的空地。力场关（`haz` 里有 `field`）敌人在力场外等是设计。测试 `tests/nav.js`。
- **站位不重叠**：`arrange()` 末尾 `spreadSlots()` 把所有人的站位点推开到至少 `UNIT_GAP`(1.15) 格（手动拖过的站位不动）；战斗中 `separateUnits(dt)` 把靠得 < 0.9 格的队员挤开。
- **打击特效**：`slash` / `thrust` 带 `sx/sy`（攻击者位置）按方向画月牙刀光 / 直线枪光 + 命中火花；远程出手有枪口闪光 `muz`，命中有小星爆 `hit`（都算 cheap 特效，超上限会被丢）；所有技能放出时有共同起手（光环 + 光柱 + 碎光，px-skill.js `skillFx` 开头）。

- **羁绊可见性**（12.2）：点看板芯片（`data-pop="t:近卫" / "p:搭档id" / "s:技能羁绊id"`）弹 `#trpop` 小卡（`showPop/hidePop`，不暂停，7 秒或点别处收起），写当前档加成、各档所需人数、成员头像（在队 / 可招募 / 未解锁）。伙伴卡显示 3 个标签、每个羁绊的 `a→b ▲ 具体加成`、搭档生效提示，升档最多的一张打「推荐」（`joinScore`）。羁绊升档 / 搭档生效时弹提示（`announceTraits`，每局每档只弹一次，`S.trSeen`）。经验条目标优先提示「再来 1 名某阵营成员」（`traitGoal`）。队员栏头像带 3 个标签彩点（`tagDots/updateDots`），角色页写搭档，选英雄页带标签。

## 版本脉络
7.0 固定阵地 + 自动战斗 + 翻牌 → 8.0 机关地图、稀有度、羁绊、商店、守望之战 → 9.0 专属卡、诅咒卡、首领演出与打断、第四章、天赋树、战报、存档导出、手机优化 → 10.0 局内事件、精英词缀、阵型与拖动站位、图鉴战绩 → 10.1 修无尽空波、牌堆见底、手动开波/叠波、难度上调 → **11.0 天赋星盘、深渊 20 层、遗物、每周挑战、手机横屏沉浸全屏、基础难度再上调** → 阶段 4 爽感：画质档位、打击感、出怪预告、竖屏信息区、翻牌仪式感、羁绊提示、结算动画、图鉴卡牌/遗物页 → 阶段 5：技能卡进化、集火、首领演出、技能特写 → 阶段 6：远征、星盘核心天赋、每日悬赏、角色觉醒 → 阶段 7–11：契约、首领特性、天气、第五章、LPC 角色与怪物、皮肤 → **12.1：每关拉长三幕、经验越升越贵、17 个角色羁绊 + 10 组搭档**。

## 发布
产物就是 `dist/chenxing.html`，浏览器直接打开即可。
**网页版**：`.github/workflows/pages.yml` 在 main 分支更新时把它发布成 GitHub Pages 首页 https://aaroncenhello.github.io/chenxing-td/ （需要仓库公开、Settings → Pages → Source 选「GitHub Actions」）。
Google 字体是后台加载的（`media=print` + `onload`）：别改回普通的 `<link rel=stylesheet>`，否则连不上 Google 的网络下整页会白屏。之前在 claude.ai 上以 Artifact 形式发布过（带 `downloads` 能力用于下载存档文件，代码里 `saveFile()` 在没有这个能力时会退回普通下载）。
