# 更新日志

## 1.2.0 (2026-09-12)

吸收 2026 年仍活跃的社区项目实测经验(Samueli924/chaoxing、LangHY/chaoxing-exam、ocsjs):

- 题目提取兼容**考试页容器** `div.singleQuesId` 与题型标签 `.newZy_TItle`(此前只认作业页 questionLi)
- 回填点击改为**选项行原生点击**(span.parentElement.click(),LangHY 40/40 实测最稳),并加已选中防 toggle 保护
- 作答策略引入**"看想分离"读题法**(视觉只转录、推理单独做,实测显著降错率)
- 新增"提交与复盘"节:用户授权提交后读取标准答案生成错题复盘,重做需再次授权(人在回路版满分机制)
- 挂机遇关闭任务点:默认跳过汇报,重试≤3 次(借鉴 Samueli924 notopen 策略)
- 踩坑表扩至 29 条:新增 #popok jQuery 绑定、frame 懒加载 JS 就绪验证、填空格式敏感、重做后 frame 重定位、2025 滑块验证码交人工等

## 1.1.0 (2026-09-12)

签到模块 v2(吸收 [cxOrz/chaoxing-signin](https://github.com/cxOrz/chaoxing-signin) 的功能设计):

- 新增跨课程签到**监控模式**:轮询全部课程活动页,2 小时窗口、多活动取最新的启发式
- 签到代操作细化为逐类型流程:手势签(九宫格真实滑动)、拍照签(用户本人照片+云盘 0.jpg 机制)、位置签(用户自取坐标+地址)、二维码(enc 转述与旋转码限制说明)
- 红线措辞精化:**agent 永不自行伪造证据**(不自选照片/坐标/不猜码),用户本人提供证据+当场指令才代操作
- README 风险分级表相应调整,致谢补充

## 1.0.0 (2026-09-12)

首发版本。

- 作业仪表盘:全课程扫描,未完成+截止时间汇总
- 作业辅助作答:题目提取(单选/多选/判断/填空/简答/计算,支持公式图片与加密字体兜底)→ AI 作答 → 回填 → 只暂存 → 答案审核单
- 课件资料下载(downloadData 直链,真机验证)
- 通知/成绩/章节进度/考试时间只读查询
- 灰色模块(默认关闭):视频任务点挂机、签到检测提醒
- 真机校准:2026-09 泛亚新版课程模板(interaction 入口、frameLocator 跨域读写、work/list、dowork 新 DOM、22 条踩坑)
- 多客户端兼容:Claude Code / ZCode / Codex / Trae / CodeBuddy / Hermes,frontmatter 仅用 Agent Skills 标准字段
- 双插件市场清单(.claude-plugin / .zcode-plugin)
