// 作答页题目提取(2026-09 实测校准版,适用 mooc2/work/dowork 新模板,兼容旧模板)
// 用法:在作业/测验作答页(dowork / doHomeWorkNew)主文档上下文执行,返回 JSON。
// 数学公式多为图片:options[].imgs / stemImgs 里有图片 URL,看不清的题用截图视觉读题。
// hasSecretFont=true 时题面是加密字体密文,同样走截图视觉读题。
// 数量与页面"共N题"不符时:先滚动页面到底触发懒加载,再重跑。

() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const TYPE_RE = /^[(（]?(单选题|多选题|判断题|填空题|简答题|名词解释题?|论述题|计算题|其它|连线题|排序题)[)）]?/;

  // 题根:新模板 div.questionLi;旧模板 div.TiMu。排除嵌套在内层的重复根。
  let roots = [...document.querySelectorAll('div.questionLi, div.TiMu')]
    .filter((el, i, arr) => arr.indexOf(el) === i && !el.querySelector('div.questionLi, div.TiMu'));
  // 新模板整页容器类名可能是 "fanyaMarking TiMu",其内含 questionLi,已被上面过滤;
  // 再兜底:只留含题干标记(mark_name/Zy_TItle/qtContent)的根
  roots = roots.filter((q) => q.querySelector('h3.mark_name, .Zy_TItle, .qtContent, .mark_name'));

  const questions = roots.map((q, i) => {
    // 题型:typename 属性 > 题干前缀 "(单选题)" > 根类名(singleQues/judgeQues/multiQues/shortAnswer)
    const rootCls = q.className || '';
    let typeName = q.getAttribute('typename') || '';
    const stemEl = q.querySelector('h3.mark_name, .Zy_TItle, .Cy_TItle, .qtContent');
    let stemRaw = clean(stemEl ? stemEl.innerText : '');
    if (!typeName) {
      const m = stemRaw.match(TYPE_RE);
      if (m) typeName = m[1];
      else if (/singleQues/.test(rootCls)) typeName = '单选题';
      else if (/multiQues|MultiQues/.test(rootCls)) typeName = '多选题';
      else if (/judgeQues/.test(rootCls)) typeName = '判断题';
      else if (/shortAnswer|shortQues/.test(rootCls)) typeName = '简答题';
      else typeName = '未知';
    }
    const stem = stemRaw.replace(TYPE_RE, '').slice(0, 800);
    const stemImgs = stemEl ? [...stemEl.querySelectorAll('img')].map((im) => im.src.slice(0, 200)) : [];

    // 选项:新模板 .stem_answer 下的行(字母在 .num_option,内容在 .answer_p);旧模板 ul.Cy_ul li
    let options = [...q.querySelectorAll('.stem_answer .clearfix')].map((row) => {
      const num = row.querySelector('.num_option, [class*="num_option"]');
      const content = row.querySelector('.answer_p') || row;
      const cls = [...(num || row).classList].join(' ');
      const choice = clean(num ? num.innerText : '') || (clean(content.innerText).match(/^([A-G])[.、\s]/) || [])[1] || '';
      return {
        choice,
        text: clean(content.innerText).slice(0, 300),
        imgs: [...content.querySelectorAll('img')].map((im) => im.src.slice(0, 200)),
        selectedNow: /check_answ|check_answer|cur|active/.test(cls), // 已选标记(重做/回显时)
      };
    }).filter((o) => o.choice || o.text);
    if (!options.length) {
      options = [...q.querySelectorAll('ul.Cy_ul li, ul li')].map((li) => {
        const t = clean(li.innerText);
        if (!t || t.length > 300) return null;
        return {
          choice: (t.match(/^([A-G])[.、\s]/) || [])[1] || '',
          text: t.replace(/^[A-G][.、\s]*/, '').slice(0, 300),
          imgs: [...li.querySelectorAll('img')].map((im) => im.src.slice(0, 200)),
          selectedNow: /check|cur|active/.test(li.className),
        };
      }).filter(Boolean);
    }

    // 填空:可见输入框;简答/计算:UEditor 实例(记录 iframe id 与关联 textarea id)
    const blanks = [...q.querySelectorAll('textarea, input[type="text"]')]
      .filter((el) => el.offsetParent !== null || el.tagName === 'TEXTAREA')
      .map((el) => ({ tag: el.tagName.toLowerCase(), id: el.id || '', name: el.name || '' }));
    const richEditors = [...q.querySelectorAll('iframe')]
      .map((f) => f.id || '')
      .filter(Boolean);

    return {
      index: i + 1,
      typeName,
      stem,
      stemImgs,
      hasSecretFont: /[\uE000-\uF8FF]/.test(stemRaw),
      options,
      blanks,
      richEditors,
    };
  });

  return { count: questions.length, questions };
}
