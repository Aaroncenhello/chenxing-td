# 晨星守望 11.0

像素风塔防 Roguelite，一个网页文件就能玩。

## 马上就玩
直接用浏览器打开 `dist/chenxing.html`。

## 在 Claude Code 里继续开发
1. 把整个 `chenxing-td` 文件夹放到你电脑上，比如 `~/chenxing-td`。
2. 在这个文件夹里打开 Claude Code（终端里 `cd ~/chenxing-td` 然后运行 `claude`）。
3. Claude Code 会自动读 `CLAUDE.md`，里面写了项目结构、每个文件管什么、怎么构建和测试、以前踩过的坑、你的偏好。
4. 第一次先让它装测试工具：`npm install`，再 `npx playwright install chromium`。
5. 之后直接用中文跟它说要改什么就行，比如「第 14 关太难了，敌人生命降 10%，改完跑一下模拟」。

## 常用命令
| 命令 | 作用 |
|---|---|
| `bash build.sh` | 把 `src/` 拼成 `dist/chenxing.html` |
| `npm run check` | 构建 + 语法检查 |
| `npm test` | 构建 + 全部功能测试 |
| `npm run test:mobile` | 手机横屏截图检查 |
| `npm run sim` | 平衡模拟（参数见 CLAUDE.md） |

改源码只改 `src/` 里的文件，别直接改 `dist/chenxing.html`（下次构建会被覆盖）。
