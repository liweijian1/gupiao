function safeFilePart(value) {
  return String(value ?? "report")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function formatSigned(value, suffix = "%") {
  const number = Number(value ?? 0);
  return `${number > 0 ? "+" : ""}${number}${suffix}`;
}

export function buildMarkdownReport({
  lang,
  t,
  selectedStock,
  filteredStocks,
  macroScores,
  cycle,
  macroSeries,
  stockSource,
  macroSource,
  realtimeMeta,
  providerDiag,
}) {
  const isZh = lang === "zh";
  const generatedAt = new Date().toLocaleString(isZh ? "zh-CN" : "en-US", { hour12: false });
  const topStocks = filteredStocks.slice(0, 10);
  const topMacro = macroSeries.slice(0, 13);

  return [
    `# ${isZh ? "QuantDesk 投资报告" : "QuantDesk Report"}`,
    "",
    `- ${isZh ? "生成时间" : "Generated at"}: ${generatedAt}`,
    `- ${isZh ? "股票数据源" : "Stock source"}: ${stockSource}`,
    `- ${isZh ? "宏观数据源" : "Macro source"}: ${macroSource}`,
    realtimeMeta?.warning ? `- ${isZh ? "提示" : "Notice"}: ${realtimeMeta.warning}` : null,
    realtimeMeta?.notice ? `- ${isZh ? "提示" : "Notice"}: ${realtimeMeta.notice}` : null,
    "",
    `## ${isZh ? "选中股票" : "Selected equity"}`,
    "",
    `| ${isZh ? "字段" : "Field"} | ${isZh ? "值" : "Value"} |`,
    "|---|---|",
    `| ${isZh ? "代码" : "Ticker"} | ${selectedStock.ticker} |`,
    `| ${isZh ? "名称" : "Name"} | ${selectedStock.name} |`,
    `| ${isZh ? "交易所" : "Exchange"} | ${selectedStock.exchange} |`,
    `| ${isZh ? "行业" : "Sector"} | ${t.sectors[selectedStock.sector] ?? selectedStock.sector} |`,
    `| ${isZh ? "价格" : "Price"} | ${selectedStock.currency}${Number(selectedStock.price ?? 0).toFixed(2)} |`,
    `| ${isZh ? "涨跌" : "Change"} | ${formatSigned(selectedStock.chg)} |`,
    `| ${isZh ? "评分" : "Score"} | ${selectedStock.score} |`,
    `| P/E | ${selectedStock.pe} |`,
    `| ${isZh ? "增长" : "Growth"} | ${formatSigned(selectedStock.growth)} |`,
    `| RSI | ${selectedStock.rsi} |`,
    "",
    `## ${isZh ? "宏观周期" : "Macro regime"}`,
    "",
    `| ${isZh ? "指标" : "Metric"} | ${isZh ? "评分" : "Score"} |`,
    "|---|---:|",
    `| ${t.scores.growth[0]} | ${macroScores.growth} |`,
    `| ${t.scores.liquidity[0]} | ${macroScores.liquidity} |`,
    `| ${t.scores.inflation[0]} | ${macroScores.inflation} |`,
    `| ${t.scores.external[0]} | ${macroScores.external} |`,
    `| ${isZh ? "周期" : "Cycle"} | ${t.cycles[cycle] ?? cycle} |`,
    "",
    `## ${isZh ? "股票排名 Top 10" : "Ranked equities Top 10"}`,
    "",
    `| ${isZh ? "代码" : "Ticker"} | ${isZh ? "名称" : "Name"} | ${isZh ? "行业" : "Sector"} | ${isZh ? "价格" : "Price"} | ${isZh ? "涨跌" : "Change"} | ${isZh ? "评分" : "Score"} |`,
    "|---|---|---|---:|---:|---:|",
    ...topStocks.map((stock) => (
      `| ${stock.ticker} | ${stock.name} | ${t.sectors[stock.sector] ?? stock.sector} | ${stock.currency}${Number(stock.price ?? 0).toFixed(2)} | ${formatSigned(stock.chg)} | ${stock.score} |`
    )),
    "",
    `## ${isZh ? "宏观指标" : "Macro inputs"}`,
    "",
    `| ${isZh ? "指标" : "Indicator"} | ${isZh ? "分组" : "Group"} | ${isZh ? "数值" : "Value"} | Score | API |`,
    "|---|---|---:|---:|---|",
    ...topMacro.map((item) => (
      `| ${t.macro[item.key] ?? item.key} | ${t.groups[item.group] ?? item.group} | ${item.value}${item.unit ?? ""} | ${item.score ?? ""} | \`${item.api}\` |`
    )),
    providerDiag?.length ? "" : null,
    providerDiag?.length ? `## ${isZh ? "数据源链路" : "Provider chain"}` : null,
    providerDiag?.length ? "" : null,
    ...(providerDiag?.length ? [
      `| ${isZh ? "数据源" : "Provider"} | ${isZh ? "结果" : "Result"} | ${isZh ? "耗时" : "Duration"} | ${isZh ? "错误" : "Error"} |`,
      "|---|---|---:|---|",
      ...providerDiag.map((entry) => `| ${entry.provider} | ${entry.result} | ${entry.duration_ms}ms | ${entry.error ?? ""} |`),
    ] : []),
    "",
  ].filter((line) => line !== null).join("\n");
}

export function downloadMarkdownReport(markdown, selectedStock) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `quantdesk-${safeFilePart(selectedStock?.ticker)}-${date}.md`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
