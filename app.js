"use strict";

/* TokenScope - 大模型 Token 成本计算与对比
 * 价格均为参考价（根据公开资料整理，非实时官方报价），可在界面表格中直接编辑。
 * 单价单位：美元 / 100 万 tokens。
 */
var DEFAULT_MODELS = [
  { id: "gpt-5",          name: "GPT-5",              vendor: "OpenAI",    input: 1.25, output: 10.00 },
  { id: "gpt-5-mini",     name: "GPT-5 mini",         vendor: "OpenAI",    input: 0.25, output: 2.00 },
  { id: "claude-sonnet",  name: "Claude Sonnet 4.5",  vendor: "Anthropic", input: 3.00, output: 15.00 },
  { id: "claude-haiku",   name: "Claude Haiku 4.5",   vendor: "Anthropic", input: 1.00, output: 5.00 },
  { id: "gemini-pro",     name: "Gemini 2.5 Pro",     vendor: "Google",    input: 1.25, output: 10.00 },
  { id: "gemini-flash",   name: "Gemini 2.5 Flash",   vendor: "Google",    input: 0.30, output: 2.50 },
  { id: "deepseek-chat",  name: "DeepSeek V3",        vendor: "DeepSeek",  input: 0.27, output: 1.10 },
  { id: "deepseek-r1",    name: "DeepSeek R1",        vendor: "DeepSeek",  input: 0.55, output: 2.19 },
  { id: "qwen-max",       name: "Qwen Max（通义千问）", vendor: "阿里云",   input: 0.32, output: 1.28 },
  { id: "qwen-turbo",     name: "Qwen Turbo（通义千问）", vendor: "阿里云", input: 0.05, output: 0.20 },
  { id: "minimax",        name: "MiniMax M2",         vendor: "MiniMax",   input: 0.30, output: 1.20 }
];

var PRESETS = {
  support: { input: 1200, output: 300,  daily: 5000, desc: "客服对话：一问一答较短，但全天请求量大。" },
  code:    { input: 6000, output: 1500, daily: 800,  desc: "代码助手：要带上上下文代码，输入长、输出中长，请求量中等。" },
  summary: { input: 50000, output: 1200, daily: 200, desc: "长文档摘要：单次输入非常长，输出是浓缩摘要，请求量小。" },
  chat:    { input: 2000, output: 800,  daily: 1000, desc: "通用聊天机器人：多轮对话，中等长度、稳定的日请求量。" }
};

var models = DEFAULT_MODELS.map(function (m) { return Object.assign({}, m); });

function $(id) { return document.getElementById(id); }
function num(v, fallback) { var n = parseFloat(v); return isNaN(n) || n < 0 ? (fallback || 0) : n; }
function fmtUSD(v) { return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtCNY(v) { return "¥" + v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtCost(usd, rate) { return fmtUSD(usd) + "（约 " + fmtCNY(usd * rate) + "）"; }

function getParams() {
  return {
    input: num($("input-tokens-num").value),
    output: num($("output-tokens-num").value),
    daily: num($("daily-requests").value),
    rate: num($("exchange-rate").value, 7.2) || 7.2,
    modelId: $("model-select").value
  };
}

function costOnce(model, input, output) {
  return (input / 1e6) * model.input + (output / 1e6) * model.output;
}
function monthCost(model, params) {
  return costOnce(model, params.input, params.output) * params.daily * 30;
}
function findModel(id) {
  for (var i = 0; i < models.length; i++) { if (models[i].id === id) return models[i]; }
  return models[0];
}
function cheapestModelId(params) {
  var best = null, bestCost = Infinity;
  models.forEach(function (m) {
    var c = monthCost(m, params);
    if (c < bestCost) { bestCost = c; best = m.id; }
  });
  return best;
}

/* ---------- 计算器 ---------- */
function renderCalculator() {
  var p = getParams();
  var model = findModel(p.modelId);
  var once = costOnce(model, p.input, p.output);
  $("result-model-name").textContent = model.name + "（" + model.vendor + "）";
  $("cost-once").textContent = fmtCost(once, p.rate);
  $("cost-day").textContent = fmtCost(once * p.daily, p.rate);
  $("cost-month").textContent = fmtCost(once * p.daily * 30, p.rate);
  $("cost-detail").textContent =
    "单价：输入 $" + model.input + " / 输出 $" + model.output + "（每 1M tokens） · " +
    "每日 " + p.daily.toLocaleString() + " 次请求 · 汇率 1 美元 = " + p.rate + " 元";
}

/* ---------- 模型表格 ---------- */
function renderTable() {
  var p = getParams();
  var cheapId = cheapestModelId(p);
  var tbody = $("model-tbody");
  tbody.innerHTML = "";
  models.forEach(function (m) {
    var tr = document.createElement("tr");
    if (m.id === cheapId) tr.className = "cheapest";

    var tdName = document.createElement("td");
    tdName.textContent = m.name + (m.id === cheapId ? " · 最省" : "");
    var tdVendor = document.createElement("td");
    tdVendor.textContent = m.vendor;

    var tdIn = document.createElement("td");
    var inInput = document.createElement("input");
    inInput.type = "number"; inInput.min = "0"; inInput.step = "0.01"; inInput.value = m.input;
    inInput.setAttribute("aria-label", m.name + " 输入单价");
    inInput.addEventListener("input", function () { m.input = num(inInput.value); refreshAll(false); });
    tdIn.appendChild(inInput);

    var tdOut = document.createElement("td");
    var outInput = document.createElement("input");
    outInput.type = "number"; outInput.min = "0"; outInput.step = "0.01"; outInput.value = m.output;
    outInput.setAttribute("aria-label", m.name + " 输出单价");
    outInput.addEventListener("input", function () { m.output = num(outInput.value); refreshAll(false); });
    tdOut.appendChild(outInput);

    var tdMonth = document.createElement("td");
    tdMonth.textContent = fmtCost(monthCost(m, p), p.rate);

    tr.appendChild(tdName); tr.appendChild(tdVendor); tr.appendChild(tdIn); tr.appendChild(tdOut); tr.appendChild(tdMonth);
    tbody.appendChild(tr);
  });
}

/* ---------- 条形图 ---------- */
function renderChart() {
  var p = getParams();
  var cheapId = cheapestModelId(p);
  var sorted = models.slice().sort(function (a, b) { return monthCost(a, p) - monthCost(b, p); });
  var max = Math.max.apply(null, sorted.map(function (m) { return monthCost(m, p); }).concat([0.000001]));

  var chart = $("bar-chart");
  chart.innerHTML = "";
  sorted.forEach(function (m) {
    var c = monthCost(m, p);
    var row = document.createElement("div");
    row.className = "bar-row" + (m.id === cheapId ? " cheapest" : "");
    var name = document.createElement("span"); name.className = "bar-name"; name.textContent = m.name;
    var track = document.createElement("div"); track.className = "bar-track";
    var fill = document.createElement("div"); fill.className = "bar-fill";
    fill.style.width = Math.max(1, (c / max) * 100) + "%";
    track.appendChild(fill);
    var val = document.createElement("span"); val.className = "bar-value"; val.textContent = fmtUSD(c) + "/月";
    row.appendChild(name); row.appendChild(track); row.appendChild(val);
    chart.appendChild(row);
  });

  var cheapest = findModel(cheapId);
  var mostExp = sorted[sorted.length - 1];
  var diff = monthCost(mostExp, p) - monthCost(cheapest, p);
  $("saving-text").textContent =
    "最省方案：" + cheapest.name + "，月成本 " + fmtCost(monthCost(cheapest, p), p.rate) +
    "；最贵方案：" + mostExp.name + "，月成本 " + fmtCost(monthCost(mostExp, p), p.rate) +
    "。两者每月相差 " + fmtCost(diff, p.rate) + "，一年相差 " + fmtCost(diff * 12, p.rate) + "。";
}

/* ---------- Token 估算器 ---------- */
/* 近似算法：中文字符约 1 token/字（常见 tokenizer 中约 0.6~1）；英文按单词约 1.3 token/词 + 剩余字符/4。 */
function estimateTokens(text) {
  if (!text) return 0;
  var cjk = 0, rest = "";
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0x3000 && code <= 0x30FF) || (code >= 0xFF00 && code <= 0xFFEF)) {
      cjk++;
    } else { rest += text[i]; }
  }
  var words = rest.split(/\s+/).filter(function (w) { return w.length > 0; });
  var wordTokens = 0;
  words.forEach(function (w) { wordTokens += Math.max(1, Math.ceil(w.length / 4)); });
  var punct = (rest.match(/[^\w\s]/g) || []).length;
  return Math.round(cjk * 0.9 + wordTokens + punct * 0.5 + words.length * 0.3);
}

function renderEstimator() {
  var text = $("est-text").value;
  var tokens = estimateTokens(text);
  var p = getParams();
  $("est-chars").textContent = text.length.toLocaleString();
  $("est-tokens").textContent = tokens.toLocaleString();
  var tbody = $("est-tbody");
  tbody.innerHTML = "";
  models.forEach(function (m) {
    var tr = document.createElement("tr");
    var tdName = document.createElement("td"); tdName.textContent = m.name;
    var tdCost = document.createElement("td");
    tdCost.textContent = fmtUSD((tokens / 1e6) * m.input) + "（约 " + fmtCNY((tokens / 1e6) * m.input * p.rate) + "）";
    tr.appendChild(tdName); tr.appendChild(tdCost);
    tbody.appendChild(tr);
  });
}

/* ---------- 联动与初始化 ---------- */
function refreshAll(rebuildTable) {
  renderCalculator();
  if (rebuildTable) renderTable(); else updateTableMonthCells();
  renderChart();
  renderEstimator();
}
function updateTableMonthCells() {
  var p = getParams();
  var cheapId = cheapestModelId(p);
  var rows = $("model-tbody").rows;
  for (var i = 0; i < rows.length && i < models.length; i++) {
    rows[i].className = models[i].id === cheapId ? "cheapest" : "";
    rows[i].cells[0].textContent = models[i].name + (models[i].id === cheapId ? " · 最省" : "");
    rows[i].cells[4].textContent = fmtCost(monthCost(models[i], p), p.rate);
  }
}

function bindPair(rangeId, numId, labelId) {
  var range = $(rangeId), numBox = $(numId);
  range.addEventListener("input", function () {
    numBox.value = range.value;
    $(labelId).textContent = Number(range.value).toLocaleString();
    refreshAll(false);
  });
  numBox.addEventListener("input", function () {
    if (num(numBox.value) <= Number(range.max)) range.value = numBox.value;
    $(labelId).textContent = num(numBox.value).toLocaleString();
    refreshAll(false);
  });
}

function applyPreset(key) {
  var preset = PRESETS[key];
  if (!preset) return;
  $("input-tokens").value = Math.min(preset.input, Number($("input-tokens").max));
  $("input-tokens-num").value = preset.input;
  $("input-tokens-val").textContent = preset.input.toLocaleString();
  $("output-tokens").value = Math.min(preset.output, Number($("output-tokens").max));
  $("output-tokens-num").value = preset.output;
  $("output-tokens-val").textContent = preset.output.toLocaleString();
  $("daily-requests").value = preset.daily;
  $("preset-desc").textContent = preset.desc;
  var btns = document.querySelectorAll(".preset-btn");
  btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-preset") === key); });
  refreshAll(false);
}

function init() {
  var select = $("model-select");
  models.forEach(function (m) {
    var opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.name + "（" + m.vendor + "）";
    select.appendChild(opt);
  });
  select.value = "gpt-5";
  select.addEventListener("change", function () { refreshAll(false); });

  bindPair("input-tokens", "input-tokens-num", "input-tokens-val");
  bindPair("output-tokens", "output-tokens-num", "output-tokens-val");
  $("daily-requests").addEventListener("input", function () { refreshAll(false); });
  $("exchange-rate").addEventListener("input", function () { refreshAll(false); });

  $("reset-prices").addEventListener("click", function () {
    models = DEFAULT_MODELS.map(function (m) { return Object.assign({}, m); });
    refreshAll(true);
  });

  var btns = document.querySelectorAll(".preset-btn");
  btns.forEach(function (b) {
    b.addEventListener("click", function () { applyPreset(b.getAttribute("data-preset")); });
  });

  $("est-text").addEventListener("input", renderEstimator);
  $("est-sample").addEventListener("click", function () {
    $("est-text").value = "你是一名资深客服助手。请根据下面的用户问题给出礼貌、简洁的回复，并附上订单查询链接。\n\nUser question: \"Where is my package? It was supposed to arrive yesterday, tracking number SF123456789.\" Please reply in English and keep it under 100 words.";
    renderEstimator();
  });
  $("est-clear").addEventListener("click", function () { $("est-text").value = ""; renderEstimator(); });

  refreshAll(true);
}

document.addEventListener("DOMContentLoaded", init);
