// 学习通课程列表提取
// 用法:在 visit/interaction?s=... 页面的主文档上下文,把整个函数体作为 evaluate 回调执行。
// 返回: {count, courses:[{name, href, courseId, classId, cpi}]}
// 注意:链接参数大小写不定(旧版 courseId/classId,新版 courseid/clazzid),一律 /i 匹配。
// 页面改版导致结果为空时,现场探测 document.querySelectorAll('a[href]') 的真实结构并调整过滤条件。

() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const pick = (href, key) => (href.match(new RegExp(key + '=(\\d+)', 'i')) || [])[1] || '';
  const seen = new Set();
  const courses = [];

  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.href || '';
    if (!/courseid=\d+/i.test(href)) return;
    if (!/mycourse\/stu|stucoursemiddle|mooc\d(-\d)?\.chaoxing\.com/i.test(href)) return;

    const name =
      clean(a.innerText) ||
      clean(a.title) ||
      clean(a.getAttribute('aria-label')) ||
      // 兜底:课程卡片常是"图片+文字"结构,取父容器文本
      clean(a.parentElement && a.parentElement.innerText);
    if (!name || name.length > 80) return;
    // 过滤辅助链接(已结束课程的角标、入口等),只留真实课程卡
    if (/^(课程已结束|已结束课程|已退课课程|课程未开始)$/.test(name)) return;

    // key 用参数去重,同一课程多种跳转链接算一条
    const key = pick(href, 'courseid') + '|' + pick(href, 'clazzid') + '|' + name;
    if (seen.has(key)) return;
    seen.add(key);

    courses.push({
      name,
      href,
      courseId: pick(href, 'courseid'),
      classId: pick(href, 'clazzid'),
      cpi: pick(href, 'cpi'),
    });
  });

  return { count: courses.length, courses };
}
