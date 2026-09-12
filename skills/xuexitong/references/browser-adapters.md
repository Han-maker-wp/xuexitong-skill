# 浏览器工具适配(2026-09 真机校准)

references 里的步骤用**语义动作**描述,按下表映射到实际工具。技能不绑定任何一家浏览器工具。

| 语义动作 | browser-use(ZCode / Claude Code 插件) | chrome-devtools MCP | Playwright MCP |
|---|---|---|---|
| `goto(url)` | `js`: `await tab.goto(url)` | `navigate_page` | `browser_navigate` |
| `evalJs(js)`(主文档) | `js`: `await tab.playwright.evaluate(...)` | `evaluate_script` | `browser_evaluate` |
| `frameRead(id)`(读子 iframe) | `js`: `tab.playwright.frameLocator('#'+id)` | snapshot 自带 iframe 内容 | `browser_snapshot` 自带 |
| `frameClick / frameAttr` | frameLocator 的 locator API | — | frameLocator 的 locator API |
| 截图 | `emitImage(await tab.screenshot())` | `take_screenshot` | `browser_take_screenshot` |
| 等待下载 | 下载目录轮询 | 下载事件 | download 事件 |

## 真机踩出来的硬规则(所有工具通用)

1. **子 iframe 读写一律走 frameLocator 类机制**(跨域可读可点可取属性);**不要 goto 子 iframe src**(新版 `work/list` 等会报"无权限的操作!")。
2. **frame 上下文里禁用 evaluate**:部分运行时(frameLocator + locator.evaluate)静默返回空对象。frame 里只用 locator API:`innerText()` / `getAttribute()` / `allTextContents()` / `click()` / `filter({hasText})`。
3. **主文档 evaluate 正常**:scripts/ 下四个脚本都在主文档执行(作答页题目/答案与主文档同域)。
4. 语义动作里"点击元素"优先 locator(`filter({hasText:'文本'})` 定位),locator 可操作性检查超时再降级:页面内 `evalJs` 找元素 `.click()` → 最后才 cua 坐标点击。
5. **ERR_ABORTED(-3) 渲染假死**:导航全挂(连外部站点都失败)时,**开新标签页**即恢复,登录态不丢。
6. 截图前确保浏览器面板可见(visibility 设 true),否则报 capture failed。
7. 长字符串传参上限约 1MB,超出分块(homework.md 第 6 节)。
8. `scripts/*.js` 是"整段粘进 evaluate 的回调函数":读文件内容 → 作为回调执行 → 返回 JSON。
9. **computer-use(纯桌面视觉操作)是最后兜底**:仅在浏览器自动化完全不可用时用;红线纪律不变。
