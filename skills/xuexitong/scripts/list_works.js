// 作业/测验列表提取
// 用法:在作业列表页(子 iframe 已 goto 成主文档)执行。
// 返回: {count, works:[{title, url, doneGuess, raw}]}
// 状态判断以 raw 原文为准(各校模板措辞不同),doneGuess 只是提示。

() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const works = [];
  const seen = new Set();

  // 教师作业:li[onclick*="goTask"],data 属性是作答页 URL
  // 兼容:有些模板用 a[href*="work/"] 直接放链接
  const nodes = [
    ...document.querySelectorAll('li[data]'),
    ...document.querySelectorAll('a[href*="work/"]'),
  ];

  nodes.forEach((el) => {
    let url = el.getAttribute('data') || el.href || '';
    if (!url && el.getAttribute('onclick')) {
      const m = el.getAttribute('onclick').match(/['"]([^'"]*work[^'"]*)['"]/);
      if (m) url = m[1];
    }
    if (!/work|exam|task/i.test(url)) return;

    const text = clean(el.innerText || el.textContent);
    if (!text) return;
    if (seen.has(url + text)) return;
    seen.add(url + text);

    // 相对地址补全
    if (url.startsWith('/')) url = 'https://mooc1-1.chaoxing.com' + url;
    else if (url.startsWith('mooc1')) url = 'https://mooc1-1.chaoxing.com/' + url;

    works.push({
      title: text.slice(0, 100),
      url,
      doneGuess: /已批阅|已完成|已交|已完成且已批阅/.test(text),
      raw: text.slice(0, 200),
    });
  });

  return { count: works.length, works };
}
