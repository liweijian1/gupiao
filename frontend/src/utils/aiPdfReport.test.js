import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAiPdfDocument,
  buildAiPdfFilename,
} from "./aiPdfReport.js";


const copy = {
  zh: {
    sectors: { Banks: "银行" },
    ai: {
      bullish: "看多",
      neutral: "中性",
      bearish: "看空",
      cached: "缓存结果",
      generated: "生成时间",
      disclaimer: "仅供研究参考，不构成投资建议。",
      pdf: {
        reportTitle: "AI 股票分析报告",
        exportedAt: "报告导出时间",
        analysisAt: "分析生成时间",
        dataAsOf: "数据时间",
        model: "分析模型",
        status: "结果状态",
        stockSnapshot: "股票概览",
        conclusion: "AI 结论",
        ticker: "股票代码",
        name: "股票名称",
        exchange: "交易所",
        sector: "行业",
        price: "价格",
        change: "涨跌幅",
        score: "因子评分",
        growth: "增长",
        trend: "趋势",
        liquidity: "流动性",
        rating: "研究评级",
        position: "建议仓位",
        summary: "研究摘要",
        opportunities: "核心机会",
        risks: "主要风险",
        watchlist: "关注指标",
        indicator: "指标",
        value: "当前值",
        reason: "关注原因",
        disclaimer: "风险提示",
        page: "第 {current} / {total} 页",
      },
    },
  },
  en: {
    sectors: { Banks: "Banks" },
    ai: {
      bullish: "Bullish",
      neutral: "Neutral",
      bearish: "Bearish",
      cached: "Cached",
      generated: "Generated",
      disclaimer: "For research reference only; not investment advice.",
      pdf: {
        reportTitle: "AI Equity Analysis Report",
        exportedAt: "Report exported",
        analysisAt: "Analysis generated",
        dataAsOf: "Data as of",
        model: "Model",
        status: "Status",
        stockSnapshot: "Stock snapshot",
        conclusion: "AI conclusion",
        ticker: "Ticker",
        name: "Name",
        exchange: "Exchange",
        sector: "Sector",
        price: "Price",
        change: "Change",
        score: "Factor score",
        growth: "Growth",
        trend: "Trend",
        liquidity: "Liquidity",
        rating: "Research rating",
        position: "Suggested position",
        summary: "Research summary",
        opportunities: "Core opportunities",
        risks: "Primary risks",
        watchlist: "Watch indicators",
        indicator: "Indicator",
        value: "Value",
        reason: "Reason",
        disclaimer: "Risk notice",
        page: "Page {current} / {total}",
      },
    },
  },
};

const selectedStock = {
  ticker: "600000",
  name: "浦发银行",
  exchange: "SSE",
  sector: "Banks",
  currency: "¥",
  price: 12.34,
  chg: 1.25,
  score: 77,
  pe: 6.8,
  growth: 4.2,
  rsi: 55,
  beta: 0.86,
  trend: 68,
  liquidity: 92,
};

const result = {
  ticker: "600000",
  model: "MiniMax-M2.7",
  generated_at: "2026-07-16T03:00:00Z",
  data_as_of: "2026-07-16T02:59:00Z",
  cached: true,
  analysis: {
    rating: "bullish",
    position_range: { min: 10, max: 20 },
    summary: "盈利修复与估值共同支撑当前判断。",
    opportunities: ["净息差企稳", "资产质量改善"],
    risks: ["利率继续下行", "信用成本反弹"],
    watchlist: [
      { name: "不良贷款率", value: "1.35%", reason: "验证资产质量趋势" },
      { name: "净息差", value: "1.42%", reason: "跟踪盈利弹性" },
    ],
    disclaimer: "模型返回的免责声明不应覆盖可信文案",
  },
};

function flattenStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenStrings(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => flattenStrings(item, output));
  return output;
}

test("builds a complete localized Chinese AI report", () => {
  const document = buildAiPdfDocument({
    lang: "zh",
    t: copy.zh,
    selectedStock,
    result,
    exportedAt: new Date("2026-07-16T04:00:00Z"),
  });
  const text = flattenStrings(document).join("\n");

  for (const expected of [
    "AI 股票分析报告",
    "600000",
    "浦发银行",
    "SSE",
    "银行",
    "¥12.34",
    "+1.25%",
    "77",
    "6.8",
    "4.2%",
    "55",
    "0.86",
    "68",
    "92",
    "看多",
    "10%–20%",
    result.analysis.summary,
    ...result.analysis.opportunities,
    ...result.analysis.risks,
    ...result.analysis.watchlist.flatMap((item) => [item.name, item.value, item.reason]),
    "MiniMax-M2.7",
    "缓存结果",
    copy.zh.ai.disclaimer,
  ]) {
    assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.equal(document.pageSize, "A4");
  assert.equal(document.defaultStyle.font, "NotoSansSC");
});

test("builds English labels and safe localized filenames", () => {
  const document = buildAiPdfDocument({
    lang: "en",
    t: copy.en,
    selectedStock,
    result: { ...result, cached: false },
    exportedAt: new Date("2026-07-16T04:00:00Z"),
  });
  const text = flattenStrings(document).join("\n");

  assert.match(text, /AI Equity Analysis Report/);
  assert.match(text, /Bullish/);
  assert.match(text, /Generated/);
  assert.match(text, /For research reference only; not investment advice\./);
  assert.equal(
    buildAiPdfFilename({ lang: "en", ticker: "600/000:*?", date: new Date("2026-07-16T04:00:00Z") }),
    "600-000--ai-analysis-2026-07-16.pdf",
  );
  assert.equal(
    buildAiPdfFilename({ lang: "zh", ticker: "600000", date: new Date("2026-07-16T04:00:00Z") }),
    "600000-AI分析报告-2026-07-16.pdf",
  );
});

test("renders missing values as dashes while preserving numeric zero", () => {
  const document = buildAiPdfDocument({
    lang: "en",
    t: copy.en,
    selectedStock: {
      ...selectedStock,
      price: 0,
      chg: 0,
      score: null,
      pe: undefined,
      growth: 0,
    },
    result,
    exportedAt: new Date("2026-07-16T04:00:00Z"),
  });
  const text = flattenStrings(document).join("\n");

  assert.match(text, /¥0\.00/);
  assert.match(text, /0%/);
  assert.match(text, /--/);
});

test("ignores unrelated secret and reasoning fields", () => {
  const secrets = [
    "sk-secret-value",
    "admin-password-value",
    "analysis-password-value",
    "Bearer hidden-token",
    "hidden-system-prompt",
    "private-model-reasoning",
  ];
  const document = buildAiPdfDocument({
    lang: "zh",
    t: copy.zh,
    selectedStock: {
      ...selectedStock,
      api_key: secrets[0],
      authorization: secrets[3],
    },
    result: {
      ...result,
      admin_password: secrets[1],
      analysis_password: secrets[2],
      prompt: secrets[4],
      reasoning: secrets[5],
      raw_response: `<think>${secrets[5]}</think>`,
    },
    exportedAt: new Date("2026-07-16T04:00:00Z"),
  });
  const serialized = JSON.stringify(document);

  for (const secret of secrets) assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("<think>"), false);
});

test("footer identifies the ticker and page count", () => {
  const document = buildAiPdfDocument({
    lang: "zh",
    t: copy.zh,
    selectedStock,
    result,
    exportedAt: new Date("2026-07-16T04:00:00Z"),
  });
  const footerText = flattenStrings(document.footer(2, 5)).join(" ");

  assert.match(footerText, /600000/);
  assert.match(footerText, /第 2 \/ 5 页/);
});
