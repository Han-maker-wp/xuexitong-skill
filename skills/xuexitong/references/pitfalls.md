# 经验速查(踩坑汇总,2026-09 真机校准)

按现象查。改版后"解决"列的思路不变、类名可能变,现场探测。

| # | 现象 | 原因 | 解决 |
|---|---|---|---|
| 1 | 导航全部 ERR_ABORTED(-3),连外部网站都打不开 | 渲染进程网络假死 | **开新标签页**即恢复,登录态不丢 |
| 2 | 课程链接参数匹配不到 | 新版全小写 `courseid/clazzid`,旧版驼峰 | 一律 `/i` 匹配(list_courses.js 已内置) |
| 3 | goto `work/list` 等子页报"无权限的操作！" | 新接口校验 referer/上下文 | **不 goto 子 iframe src**,用 frameLocator 直接读写 |
| 4 | frameLocator 里 locator.evaluate() 返回空对象 | 部分运行时 frame 内 evaluate 不可用 | frame 里只用 locator API(innerText/getAttribute/click) |
| 5 | 重放课程 URL 后页面加载了但空白无 iframe | enc 从地址栏复制时**截断**了 | enc 必须完整;重新从 interaction 正常导航进入 |
| 6 | 过期作业打不开作答页 | 平台只给 preview(只读) | 作答时间窗口外的作业如实标注"已过期",不改 |
| 7 | 题干/选项提取成 "A B C D" 或混入选项 | `[class*="stem"]` 误匹配 `stem_answer` | 用 `h3.mark_name` 取题干(extract_questions.js 已校准) |
| 8 | 数学题题面/选项提取是空的 | 公式是**图片**渲染 | `stemImgs`/`options[].imgs` 有 URL;截图视觉读题 |
| 9 | 选项点击无效 / 重做后答案错乱 | 选项 data 属性被平台随机化 | 按**字母或显示文本**匹配 `.stem_answer .clearfix`,点 `span.num_option` |
| 10 | 简答框写了字,保存后是空 | UEditor 数据没同步 | `setContent()` 后必须 `.sync()`;实例用 `UE.instants` 按容器定位 |
| 11 | 题面全是 □/方块字 | `font-cxsecret` 加密字体反爬 | 截图视觉读题,不用 DOM 文本 |
| 12 | evaluate 传大文件报 broker mismatch | 传参上限 ~1MB | 分块:`window.__parts=[]` 循环 push → `atob(join)` 组装 |
| 13 | 连续点选项后面的没反应 | AJAX 频率限制 | 每次点击间隔 ≥1.5 秒 |
| 14 | 保存时弹确认框卡住 | 平台二次确认 | 确认按钮在 `#popok` 弹层,点它 |
| 15 | 下载触发后"页面跳走" | 导航即下载(302 到 cldisk CDN) | 正常现象;IAB 类环境不落盘,直链给用户浏览器 |
| 16 | 换浏览器/环境后 cookie 失效 | 会话绑定环境 | `_d + UID + vc3` 三 cookie 复用(用户主动提供才用) |
| 17 | 登录态误判 | 空间页偶发半加载 | 轮询 2~3 次再判定;以是否重定向到 passport2 为准 |
| 18 | 登录按钮/协议勾选点不动 | 装饰层遮挡 + 样式化控件 | JS 点 `button#loginBtn`;协议点 `p#passportAgreement` |
| 19 | 附件上传后出现两份 | 对话框"确定"会再插一次 | `div[module=insertAttach]` 出现后点对话框**"取消"** |
| 20 | UEditor 附件按钮找不到 | 工具栏折叠 | 先点"更多"展开;file input 在同源子 iframe `input[name=file]` |
| 21 | 截图报 capture failed | 浏览器面板在后台 | visibility capability 设 true 再截 |
| 22 | bash 沙盒内没网,下载失败 | 环境网络隔离 | 用 PowerShell `Invoke-WebRequest`,或直接浏览器下载 |
| 23 | 考试/章节测验页按作业页选择器提不到题 | 容器不同:`div.singleQuesId[data]`,题型标签 `.newZy_TItle` | extract_questions.js 已兼容两种容器(LangHY 2026-06) |
| 24 | 点了选项但 AJAX 没提交,页面看着对了保存却是空 | 点 span 本身/eval onclick/纯改 class 不走原生事件链 | 点**选项行** `span.parentElement.click()`,间隔≥1.5s(LangHY 40/40 实测) |
| 25 | 提交确认框点了没反应 | `#popok` 是 jQuery `.on('click')` 绑定,无 onclick 属性 | 必须真实点击(locator/force click);`dispatchEvent` 在 iframe 里静默失败 |
| 26 | 考试 frame 里 JS 函数不存在,提交报错 | frame 懒加载,JS 未就绪 | 滚动触发加载后验证 `typeof btnBlueSubmit === 'function'` 再操作 |
| 27 | 填空题明明对却判错 | 系统严格比对格式("50"≠"50 m/s") | 按题面口径与单位作答;不确定时两版答案都写进审核单让用户选 |
| 28 | 重做后提交又失败 | 重做后 frame URL 变化、JS 可能未重新加载 | 重做后**重新定位 frame**,验证 JS 就绪再填(LangHY 已知问题) |
| 29 | 登录/签到时弹滑块验证码 | 2025 年起平台风控升级 | **交人工滑动**,不尝试自动过滑块;过一次后通常一段时间内不再弹 |
