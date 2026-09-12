// 答案回填(2026-09 实测校准版)
// 用法:在作答页主文档上下文,把整个函数体作为 evaluate 回调,实参传 answers:
// {"answers":[
//   {"index":1, "type":"单选题", "value":"B"}                  // 字母或选项文本均可
//   {"index":2, "type":"判断题", "value":"对"}
//   {"index":3, "type":"多选题", "value":["A","C"]}
//   {"index":4, "type":"填空题", "value":["第一空","第二空"]}
//   {"index":5, "type":"简答题", "value":"<p>html内容</p>"}
// ]}
// 内部已带 1.6s 点击间隔(AJAX 频率限制)。返回逐题日志,ok=false 的题人工排查补填。
// 纪律:本脚本只写答案,绝不点击"提交";保存只允许点"暂时保存"(由调用方执行)。

async (answers) => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (x) => clean(String(x)).replace(/正确/g, '对').replace(/错误/g, '错');
  const log = [];

  let roots = [...document.querySelectorAll('div.questionLi, div.TiMu')]
    .filter((el, i, arr) => arr.indexOf(el) === i && !el.querySelector('div.questionLi, div.TiMu'))
    .filter((q) => q.querySelector('h3.mark_name, .Zy_TItle, .qtContent, .mark_name'));

  // 在题根内找选项行:新模板 .stem_answer .clearfix,旧模板 ul li
  const optionRows = (q) => {
    let rows = [...q.querySelectorAll('.stem_answer .clearfix')];
    if (!rows.length) rows = [...q.querySelectorAll('ul.Cy_ul li, ul li')];
    return rows;
  };
  const rowChoice = (row) => {
    const num = row.querySelector('.num_option, [class*="num_option"]');
    return clean(num ? num.innerText : '') || (clean(row.innerText).match(/^([A-G])[.、\s]/) || [])[1] || '';
  };
  const rowText = (row) => {
    const content = row.querySelector('.answer_p') || row;
    return clean(content.innerText).replace(/^[A-G][.、\s]*/, '');
  };

  const clickChoice = async (q, target) => {
    const t = norm(target);
    const rows = optionRows(q);
    let hit = null;
    for (const row of rows) {
      const c = rowChoice(row);
      const txt = norm(rowText(row));
      if ((c && c.toUpperCase() === t.toUpperCase()) || (txt && (txt === t || txt.includes(t) || t.includes(txt)))) { hit = row; break; }
    }
    if (!hit) throw new Error('选项未匹配: ' + t);
    // 防重复点(已选中再点会 toggle 取消)
    const numEl0 = hit.querySelector('.num_option, [class*="num_option"]');
    const cls0 = [...(numEl0 || hit).classList].join(' ') + ' ' + (hit.className || '');
    if (/check_answ|check_answer|cur|active/.test(cls0)) {
      return { clicked: rowChoice(hit) || t, verified: true, note: '本来就是选中态,跳过' };
    }
    // 点击目标:选项**行**(LangHY 40/40 实测 span.parentElement.click() 走原生事件链最稳;
    // 点 span 本身/eval onclick/纯改 class 都可能 AJAX 不触发)
    const rowEl = hit.closest('.clearfix') || hit;
    rowEl.click();
    await wait(1600);
    // 校验:选中标记出现
    const numEl = hit.querySelector('.num_option, [class*="num_option"]');
    const afterCls = [...(numEl || hit).classList].join(' ') + ' ' + (hit.className || '');
    const ok = /check_answ|check_answer|cur|active|on/.test(afterCls);
    return { clicked: rowChoice(hit) || t, verified: ok };
  };

  // 找题根内的 UEditor 实例(不依赖 id 命名规则,按容器包含关系定位)
  const findEditor = (q) => {
    if (!window.UE) return null;
    try {
      const insts = UE.instants || {};
      for (const k of Object.keys(insts)) {
        const ed = insts[k];
        const box = ed.container || ed.iframe || null;
        if (box && (q === box || q.contains(box))) return ed;
      }
    } catch (e) {}
    // 兜底:按 iframe id 找
    const fid = (q.querySelector('iframe[id^="ueditor"]') || {}).id || '';
    if (fid && UE.getEditor) { try { return UE.getEditor(fid); } catch (e) {} }
    return null;
  };

  for (const a of answers.answers) {
    const q = roots[a.index - 1];
    if (!q) { log.push({ index: a.index, ok: false, msg: '题根未找到' }); continue; }
    try {
      if (a.type === '单选题' || a.type === '判断题') {
        const r = await clickChoice(q, a.value);
        log.push({ index: a.index, ok: true, msg: `已点 ${r.clicked}${r.verified ? '(已确认选中)' : '(未确认,需复查)'}` });
      } else if (a.type === '多选题') {
        const got = [];
        for (const v of a.value) { const r = await clickChoice(q, v); got.push(r.clicked); }
        log.push({ index: a.index, ok: true, msg: '已点: ' + got.join('/') });
      } else if (a.type === '填空题') {
        const els = [...q.querySelectorAll('textarea, input[type="text"]')]
          .filter((el) => el.offsetParent !== null || el.tagName === 'TEXTAREA');
        const vals = Array.isArray(a.value) ? a.value : [a.value];
        if (!els.length) throw new Error('未找到填空输入框');
        els.forEach((el, i) => {
          el.value = vals[i] || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        log.push({ index: a.index, ok: true, msg: `已填 ${els.length} 空` });
      } else if (['简答题', '名词解释', '论述题', '计算题', '其它'].includes(a.type)) {
        const ue = findEditor(q);
        if (ue && ue.setContent) {
          ue.setContent(String(a.value));
          if (ue.sync) ue.sync();
          log.push({ index: a.index, ok: true, msg: 'UEditor 已写入并 sync' });
        } else {
          const ta = q.querySelector('textarea');
          if (!ta) throw new Error('无 UEditor 也无 textarea');
          ta.value = String(a.value);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          log.push({ index: a.index, ok: true, msg: 'textarea 已写入' });
        }
      } else {
        log.push({ index: a.index, ok: false, msg: '未知题型: ' + a.type });
      }
    } catch (e) {
      log.push({ index: a.index, ok: false, msg: String(e.message || e) });
    }
  }
  return { total: answers.answers.length, failed: log.filter((l) => !l.ok).length, log };
}
