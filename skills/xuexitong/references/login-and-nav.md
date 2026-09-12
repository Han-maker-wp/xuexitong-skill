# 登录与导航(2026-09 真机校准)

## 登录检测与登录

1. 主页面 goto `https://i.chaoxing.com/`。
2. 判断登录态:
   - **已登录**:URL 停在 `i.chaoxing.com/base?...`,标题"个人空间",页面有 `#frame_content` iframe。
   - **未登录**:被重定向到 `passport2.chaoxing.com/login?...&refer=...`,标题"用户登录"。
3. 未登录时的两条路:
   - **引导用户手动登录**(扫码/账密),agent 每 10 秒复查一次,最多等 3 分钟;
   - 或用用户本机已保存的账号走**真实表单**:填 `textbox "手机号/超星号"`、`textbox "学习通密码"`,勾选协议(样式化勾选,页面内 JS 点 `p#passportAgreement`),再点按钮 `button#loginBtn`(它被装饰层遮挡,role 点击会超时,用 JS `.click()`)。账密登录通常**无验证码**;若弹验证码/滑块,立即转人工。**不要**实现加密协议登录。
4. 高级(换浏览器/无头环境):会话可用 `_d`、`UID`、`vc3` 三个 cookie 复用。仅当用户主动提供时从其本地配置读取,绝不硬编码。

## 课程列表与进入课程

- 空间页课程列表在跨域 `#frame_content` iframe 里(新版 src 形如 `https://<xxx>.mh.chaoxing.com/?s=<s参数>&space_token=...`)。iframe **内部**读不到,但 **src 属性**读得到,从中取 `s=` 参数。
- 可靠路径(实测有效):
  1. 主页面 goto `https://mooc1-1.chaoxing.com/visit/interaction?s=<s参数>`(标题"课程");
  2. 跑 `scripts/list_courses.js` 拿课程清单(42 门课实测成功);
  3. **在页面内** `location.href = 课程链接` 跳转(直接 goto 会因缺 referer 弹回)。
- 课程链接(新版):`https://mooc1-1.chaoxing.com/mooc-ans/visit/stucoursemiddle?courseid=<id>&clazzid=<id>&vc=1&cpi=<id>&ismooc2=1&v=2`
  ——**参数全小写** `courseid/clazzid`(旧版是驼峰 courseId/classId,脚本必须 /i 匹配)。
- 跳转后落到 `mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?...&enc=<完整enc>`。**立即记下完整 URL**:enc 截断或手拼会让页面降级(加载出来但无内容/无 iframe)。
- s 参数会过期:interaction 打开异常时,回 goto `https://i.chaoxing.com/` 重新取 `#frame_content` 的 src。

## 课程页内部结构(新版泛亚模板,实测)

- 顶部导航是 `span.nav_content`(外层 `span.tag_new`):任务 / 章节 / 讨论 / **作业** / 考试 / 资料 / 错题集 / 学习记录 / 课程图谱。点击方式:页面内 JS 找文本匹配的 `.nav_content` 并 `.click()`。
- 各标签内容在子 iframe(点击后动态生成):
  - `#frame_content-hd` 活动/签到(mobilelearn stuActiveList)
  - `#frame_content-zy` 作业(mooc2/work/list)
  - `#frame_content-zl` 资料(mooc2-ans/coursedata/stu-datalist)
  - `#frame_content-zj` 章节(mooc2-ans/mycourse/studentcourse)
- 读子 iframe 内容**优先用 frameLocator**(Playwright 面),不要 goto 其 src:
  - **goto `work/list` 等新接口会报"无权限的操作!"**(校验 referer/上下文);
  - frameLocator 跨域可读可点,实测全流程可用。

## URL 参数速查

| 参数 | 含义 | 注意 |
|---|---|---|
| courseid / clazzid | 课程 / 教学班 | 大小写不定,匹配用 /i |
| cpi | 课程上下文标识 | 下载接口要 |
| ut | 用户类型 | 固定 `ut=s` |
| enc / stuenc / standardEnc | 页面态签名 | **不能手拼、不能截断**。必须从正常导航获得;从地址栏复制要完整 |
| t | 时间戳 | 缓存破坏参数 |

## 环境异常处理

- **ERR_ABORTED(-3)**:渲染进程网络假死(导航全挂,连外部网站都打不开)。**开新标签页**即可恢复,登录态不丢(实测)。
- 截图前确保浏览器面板可见(visibility capability 设 true),否则截图失败。

## 退出与收尾

不需要"退出登录"。任务结束时停在该状态即可;如果用户要求,goto `https://passport2.chaoxing.com/logout` 退出。
