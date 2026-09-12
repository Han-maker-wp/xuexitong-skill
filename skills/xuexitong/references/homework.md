# 作业与章节测验(2026-09 真机校准)

适用于"作业"标签里的教师作业与章节测验。**全程遵守 SKILL.md 红线:只暂存不提交,每步验证。**

## 0. 技术要点(先读,实测结论)

- **读写子 iframe 用 frameLocator**,例:`tab.playwright.frameLocator('#frame_content-zy')`。frame 内的 `locator.evaluate()` 在部分运行时**静默返回空对象**——frame 里只用 locator API(`innerText()` / `getAttribute()` / `allTextContents()` / `click()`),不要用 evaluate。主文档的 evaluate 正常。
- **不要 goto 子 iframe 的 src**:新版 `work/list` 直接报"无权限的操作!"(校验上下文)。
- 作业列表条目仍是 `li[data="作答页URL"]` + `onclick="goTask(this)"`,实测新版不变。

## 1. 作业仪表盘(检测,真机验证通过)

对每门课(进入见 login-and-nav.md):

1. 课程页点"作业"标签 → 等 `#frame_content-zy` 出现 → frameLocator 读取。
2. 快速判断:列表页文本含"暂无作业"即跳过;否则读计数器 `N/M`(如 `2/10`)。
3. 条目提取:对每个 `li[data]` 读 `innerText`(含状态)与 `getAttribute('data')`(作答页 URL)。
   状态关键词(实测):**未交**(answerId=0 或有草稿)、**待批阅**(已交)、**已完成**、**剩余X小时Y分钟**(截止倒计时)。
4. 汇总输出 markdown:`课程 | 作业 | 截止时间 | 状态`,按剩余时间升序,24h 内标 ⚠️。
   实测样例:`运筹学 | 第1章化标准型、图解法 | 剩余28小时10分钟 | 待批阅`。

注意:列表顺序不按截止时间,须自行解析"剩余…"字段排序;过期未交的作业点进去只会看到 preview(只读),仪表盘里标注"已过期"。

## 2. 进作答页

- goto 条目 data 里的 URL:`mooc-ans/mooc2/work/task?courseId=..&classId=..&cpi=..&workId=..&answerId=..&enc=..`
  (新版入口是 `work/task`,服务端会重定向到真正的作答页 `work/dowork?...&standardEnc=..`)。**记下重定向后的完整 URL**,暂存后回来验证用。
- 首次打开的作业 `answerId=0`,服务端会分配答题记录。
- **过期作业**会重定向到 `work/preview`(只读,标题"查看详情"):只能看题不能作答,如实告知用户。
- 已交作业(待批阅/已完成)重新打开时:报告型跳 `work/prompt`(只显示作业信息);测验型会打开 `work/dowork` 回显已答内容(选项带 `check_answ` 高亮)——**这是只读复查机会,别碰上面的"提交"按钮**。

## 3. 提取题目(scripts/extract_questions.js,真机 10/10 题验证通过)

在作答页主文档执行,返回 `{count, questions:[{index, typeName, stem, stemImgs, hasSecretFont, options, blanks, richEditors}]}`。

新模板实测结构:

- 题根:`div.questionLi`(整页容器类名可能也带 TiMu,脚本已排重);题干在 `h3.mark_name`,前缀"(单选题)"即题型。
- 选项行:`.stem_answer .clearfix`,字母在 `span.num_option`,内容在 `.answer_p`;**已选项的 num_option 带 `check_answ` 类**(回显/复查用)。
- **数学公式是图片**:`stemImgs`/`options[].imgs` 记录了图片 URL。题面读不懂时:截图用视觉读题,或把 img URL 给多模态识别。不要把残缺文本硬答。
- `hasSecretFont: true`(题面含私有区字符)= `font-cxsecret` 加密字体反爬:DOM 文本是密文,**必须截图视觉读题**。
- 填空题:可见 `textarea/input[type=text]`(id 形如 `answer<数字>`)。
- 简答/计算:UEditor(iframe id 形如 `ueditor_0`,同题还有配套 textarea)。
- 题数与"题量: N"不符:滚动到底触发懒加载后重跑(最多 3 次)。

## 4. 作答策略

- 先看课程资料(见 references/download.md)能否提供依据,能引用就引用。
- 每题产出:**答案 + 一句话理由 + 置信度(高/中/低)**;多选宁少勿滥;计算题写关键公式与代入过程;简答分点、150~400 字。
- 整套答案先写进答案审核单(第 7 节),再回填。

## 5. 回填(scripts/fill_answers.js,匹配逻辑真机干跑 5/5 验证)

- 单选/判断:按**选项字母或显示文本**匹配 `.stem_answer .clearfix` 行,点击其 `span.num_option`(或行)。**不要依赖 data 属性**(重做后会被平台随机化)。点击后 1.6 秒检查选中标记(`check_answ` 等)是否出现,未出现要补点。
- 多选:逐个点击,每次间隔 ≥1.5 秒(AJAX 频率限制)。
- 填空:写 `textarea/input` 值后派发 `input`+`change` 事件。
- 简答/论述/计算(UEditor):**必须** `setContent()` 后调用 `sync()`——直接改 iframe body 或普通粘贴不会写入答案数据。编辑器实例优先用 `UE.instants` 按"容器在题根内"定位(不依赖 id 命名)。
- 脚本返回逐题日志,`ok:false` 的题截图排查补填;回填完整页截图与答案单核对。

## 6. 暂存与验证(红线!)

1. 只点文本为**"暂时保存"**的链接/按钮。**绝不碰"提交"。**
2. 保存可能弹确认框:确认按钮通常在 `#popok` 弹层,点它的确定。
3. 保存后**必须验证**:重新 goto 第 2 步记下的作答页 URL,确认答案还在(单选高亮/`check_answ`、简答文字、附件块)。
4. 附件上传(UEditor):点附件按钮开对话框,file input 在同源子 iframe;大文件走**分块 base64 注入**——evaluate 传参上限约 1MB:`window.__parts=[]` → 循环 push(每块~80 万字符)→ 页面内 `atob(join)` 组装 File → DataTransfer → `input.files` → 派发 `change`。成功标志:`<div module="insertAttach" objectid="..">` 出现;然后点对话框**"取消"**(点"确定"会插两份)。

## 7. 答案审核单

每份作业生成 `homework_<workId>_answers.md` 存工作目录:

```markdown
# 作业审核单:<作业标题>
- 课程:<课程名>   workId:<id>   状态:已暂存未提交
| 题号 | 题型 | 我的答案 | 理由 | 置信度 |
|---|---|---|---|---|
| 1 | 单选 | B | ... | 高 |
...
## 简答/计算题全文
### 第 9 题
(完整作答内容)
```

最后明确告诉用户:**草稿已暂存、未提交**,请自行进学习通审核提交;或者说"提交"让我代点(此时才允许点提交,并截图留证)。
