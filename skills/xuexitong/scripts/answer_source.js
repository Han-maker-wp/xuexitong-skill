// 答案源查询(用户自备,默认关闭)——题面清洗 → 本地缓存 → 用户答案文件 → HTTP 接口 → 一致性校验
// 用法(Node 18+ 侧执行,不是页面上下文):
//   node answer_source.js --questions questions.json [--config answer-source.json]
// questions.json 为 extract_questions.js 的输出({"questions":[...]})或裸数组。
// 配置见 references/answer-sources.md;不配置 config/接口时只用用户答案文件+缓存。
// 输出: answer-source-result.json = {results:[{index, source, answer, note}], coverage:"N/M"}
// 红线:本脚本不内置任何题库地址;只请求用户配置的 endpoint;结果仅供人工审核,不自动提交。

const fs = require("fs");
const path = require("path");

// ---------- 参数 ----------
function parseArgs(argv) {
  const args = { config: "answer-source.json" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--questions") args.questions = argv[++i];
    else if (argv[i] === "--config") args.config = argv[++i];
  }
  if (!args.questions) {
    console.error("用法: node answer_source.js --questions questions.json [--config answer-source.json]");
    process.exit(1);
  }
  return args;
}

// ---------- 题面清洗 ----------
function cleanStem(s) {
  return String(s || "")
    .replace(/^\s*\d{1,3}[.、]\s+(?=\D)/, "")  // 题号前缀("1. "/"12、";不误伤"1.5"小数)
    .replace(/^\s*\d{1,3}\s+(?=[^\d])/, "")    // 裸数字+空格前缀
    .replace(/[（(]\d+(\.\d+)?分[)）]\s*$/, "") // (2.5分) 分值后缀
    .replace(/\s+/g, " ")
    .trim();
}

const TYPE_CODE = { 单选题: 0, 多选题: 1, 填空题: 2, 判断题: 3 };

// ---------- 判断题同义词归一(社区实测集) ----------
const TRUE_WORDS = ["对", "正确", "√", "是", "true", "t", "1", "yes", "y"];
const FALSE_WORDS = ["错", "错误", "×", "x", "否", "不正确", "不对", "false", "f", "0", "no", "n"];
function normJudgement(text) {
  const v = String(text || "").trim().toLowerCase();
  if (TRUE_WORDS.includes(v)) return "对";
  if (FALSE_WORDS.includes(v)) return "错";
  return null;
}

// ---------- 题型-答案一致性校验 ----------
function validateAnswer(raw, typeName) {
  let answer = String(raw == null ? "" : raw).trim();
  if (!answer) return { ok: false, answer: "" };
  const t = typeName || "";
  if (t === "判断题") {
    const j = normJudgement(answer);
    return j ? { ok: true, answer: j } : { ok: false, answer };
  }
  if (t === "单选题") {
    // 强分隔符(多段答案)或判断题字面 → 多半是错源,弃用
    const strong = ["\n", "|", "#", "\t", "、"];
    if (strong.some((sep) => answer.split(sep).filter((x) => x.trim()).length > 1)) {
      // 顿号连接的纯字母序列(A、B)按多选拼写错误处理:提取字母
      const letters = answer.toUpperCase().match(/[A-G]/g);
      if (letters && letters.length === answer.replace(/[^A-G]/gi, "").length) {
        return { ok: true, answer: [...new Set(letters)].join("") };
      }
      return { ok: false, answer };
    }
    if (normJudgement(answer)) return { ok: false, answer };
    return { ok: true, answer };
  }
  if (t === "多选题") {
    const letters = [...new Set((answer.toUpperCase().match(/[A-G]/g) || []))];
    return letters.length >= 2 ? { ok: true, answer: letters.join("") } : { ok: false, answer };
  }
  // 填空/简答/其它:非空即可,质量靠人工审核
  return { ok: true, answer };
}

// ---------- 缓存 ----------
function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// ---------- 用户答案文件(题干子串 → 答案) ----------
function lookupUserFile(answers, stem) {
  if (!answers) return null;
  for (const [key, val] of Object.entries(answers)) {
    if (key && stem.includes(key.trim())) {
      return { key, val };
    }
  }
  return null;
}

// ---------- HTTP 接口 ----------
async function askEndpoint(endpoint, token, timeoutMs, q) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: ctrl.signal,
      body: JSON.stringify({
        question: q.stem,
        options: (q.options || []).map((o) => o.text.replace(/^[A-Ga-g][.、、]?\s*/, "")),
        type: TYPE_CODE[q.typeName] != null ? TYPE_CODE[q.typeName] : 4,
      }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      if (j && j.answer && Array.isArray(j.answer.bestAnswer)) return j.answer.bestAnswer.join("\n");
      if (j && typeof j.answer === "string") return j.answer;
      if (Array.isArray(j.bestAnswer)) return j.bestAnswer.join("\n");
      if (typeof j.answer !== "undefined") return String(j.answer);
    } catch (e) { /* 纯文本响应 */ }
    return text.trim() || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 主流程 ----------
(async () => {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const cfgPath = path.isAbsolute(args.config) ? args.config : path.join(cwd, args.config);
  const cfg = fs.existsSync(cfgPath) ? loadJson(cfgPath, {}) : {};
  const cacheFile = cfg.cacheFile ? path.join(cwd, cfg.cacheFile) : path.join(cwd, "answer-cache.json");

  const qraw = loadJson(path.isAbsolute(args.questions) ? args.questions : path.join(cwd, args.questions), null);
  if (!qraw) { console.error("读取 questions 文件失败"); process.exit(1); }
  const questions = Array.isArray(qraw) ? qraw : qraw.questions || [];
  // 用户答案文件默认找 my-answers.json(存在即用,无需配置)
  const defaultAnswers = path.join(cwd, "my-answers.json");
  const answersFile = cfg.answersFile ? path.join(cwd, cfg.answersFile)
    : (fs.existsSync(defaultAnswers) ? defaultAnswers : null);
  const userAnswers = answersFile ? loadJson(answersFile, null) : null;
  const cache = loadJson(cacheFile, {});

  const results = [];
  let hits = 0;
  for (const q of questions) {
    const stem = cleanStem(q.stem);
    let out = { index: q.index, source: "none", answer: "", note: "" };

    // 1) 缓存
    if (cache[stem]) {
      const v = validateAnswer(cache[stem], q.typeName);
      if (v.ok) { out = { index: q.index, source: "缓存", answer: v.answer, note: "本地缓存命中" }; }
    }
    // 2) 用户答案文件
    if (out.source === "none" && userAnswers) {
      const hit = lookupUserFile(userAnswers, stem);
      if (hit) {
        const v = validateAnswer(hit.val, q.typeName);
        if (v.ok) out = { index: q.index, source: "用户答案", answer: v.answer, note: `匹配自用户文件关键词"${hit.key}"` };
        else out.note = `用户文件命中"${hit.key}"但答案与题型不符,已弃用`;
      }
    }
    // 3) HTTP 接口
    if (out.source === "none" && cfg.endpoint) {
      const raw = await askEndpoint(cfg.endpoint, cfg.token, cfg.timeoutMs, { stem, options: q.options, typeName: q.typeName });
      if (raw) {
        const v = validateAnswer(raw, q.typeName);
        if (v.ok) out = { index: q.index, source: "接口命中", answer: v.answer, note: "来自用户配置接口" };
        else out.note = "接口返回与题型不符,已弃用";
      } else {
        out.note = "接口未命中或请求失败";
      }
    }
    if (out.source !== "none") {
      hits++;
      cache[stem] = out.answer; // 命中结果进缓存
    }
    results.push(out);
    if (cfg.endpoint) await new Promise((r) => setTimeout(r, 1000)); // 限速:每次查询间隔≥1s
  }

  saveJson(cacheFile, cache);
  const result = { coverage: `${hits}/${questions.length}`, results };
  const outFile = path.join(cwd, "answer-source-result.json");
  saveJson(outFile, result);
  console.log(`答案源命中 ${result.coverage},已写入 ${outFile}`);
  for (const r of results) {
    console.log(`  #${r.index} [${r.source}] ${String(r.answer).slice(0, 40)}${r.note ? "  // " + r.note : ""}`);
  }
})();
