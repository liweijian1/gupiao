const FONT_FAMILY = "NotoSansSC";
const MISSING_VALUE = "--";


function isMissing(value) {
  return value === null || value === undefined || value === "";
}

function display(value) {
  return isMissing(value) ? MISSING_VALUE : String(value);
}

function formatNumber(value, decimals) {
  if (isMissing(value)) return MISSING_VALUE;
  const number = Number(value);
  if (!Number.isFinite(number)) return display(value);
  return decimals === undefined ? String(number) : number.toFixed(decimals);
}

function formatPercent(value, { signed = false } = {}) {
  if (isMissing(value)) return MISSING_VALUE;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value}%`;
  const sign = signed && number > 0 ? "+" : "";
  return `${sign}${number}%`;
}

function formatPrice(currency, value) {
  if (isMissing(value)) return MISSING_VALUE;
  return `${display(currency === undefined ? "" : currency)}${formatNumber(value, 2)}`;
}

function formatDate(value, lang) {
  if (isMissing(value)) return MISSING_VALUE;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING_VALUE;
  return date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function safeFilePart(value) {
  return String(value ?? "report")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "report";
}

function section(text) {
  return { text, style: "sectionHeading", headlineLevel: 1, margin: [0, 18, 0, 7] };
}

function labelValueRows(rows) {
  return rows.map(([label, value]) => [
    { text: label, style: "tableLabel" },
    { text: display(value), style: "tableValue" },
  ]);
}

function replacePageTokens(template, current, total) {
  return display(template)
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

export function buildAiPdfFilename({ lang, ticker, date = new Date() }) {
  const day = (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);
  const safeTicker = safeFilePart(ticker);
  return lang === "zh"
    ? `${safeTicker}-AI分析报告-${day}.pdf`
    : `${safeTicker}-ai-analysis-${day}.pdf`;
}

export function buildAiPdfDocument({
  lang,
  t,
  selectedStock,
  result,
  exportedAt = new Date(),
}) {
  const pdf = t.ai.pdf;
  const analysis = result.analysis;
  const ticker = display(selectedStock.ticker);
  const stockName = display(selectedStock.name);
  const rating = t.ai[analysis.rating] ?? display(analysis.rating);
  const position = `${formatPercent(analysis.position_range.min)}–${formatPercent(analysis.position_range.max)}`;
  const sector = t.sectors[selectedStock.sector] ?? display(selectedStock.sector);
  const status = result.cached ? t.ai.cached : t.ai.generated;

  const metadata = [
    [pdf.exportedAt, formatDate(exportedAt, lang)],
    [pdf.analysisAt, formatDate(result.generated_at, lang)],
    [pdf.dataAsOf, formatDate(result.data_as_of, lang)],
    [pdf.model, display(result.model)],
    [pdf.status, status],
  ];
  const stockMetrics = [
    [pdf.ticker, ticker],
    [pdf.name, stockName],
    [pdf.exchange, display(selectedStock.exchange)],
    [pdf.sector, sector],
    [pdf.price, formatPrice(selectedStock.currency, selectedStock.price)],
    [pdf.change, formatPercent(selectedStock.chg, { signed: true })],
    [pdf.score, display(selectedStock.score)],
    ["P/E", display(selectedStock.pe)],
    [pdf.growth, formatPercent(selectedStock.growth)],
    ["RSI", display(selectedStock.rsi)],
    ["Beta", display(selectedStock.beta)],
    [pdf.trend, display(selectedStock.trend)],
    [pdf.liquidity, display(selectedStock.liquidity)],
  ];

  return {
    pageSize: "A4",
    pageMargins: [42, 48, 42, 46],
    defaultStyle: { font: FONT_FAMILY, fontSize: 9.5, color: "#1f2933", lineHeight: 1.25 },
    info: {
      title: `${pdf.reportTitle} - ${ticker}`,
      subject: `${ticker} ${stockName}`,
      author: "QuantDesk",
    },
    footer(currentPage, pageCount) {
      return {
        columns: [
          { text: `QuantDesk · ${ticker}`, alignment: "left" },
          { text: replacePageTokens(pdf.page, currentPage, pageCount), alignment: "right" },
        ],
        margin: [42, 12, 42, 0],
        color: "#6b7280",
        fontSize: 8,
      };
    },
    pageBreakBefore(currentNode) {
      return currentNode?.headlineLevel === 1 && currentNode?.pageNumbers?.length > 1;
    },
    content: [
      { text: pdf.reportTitle, style: "title" },
      { text: `${ticker} · ${stockName}`, style: "subtitle" },
      {
        table: { widths: [105, "*"], body: labelValueRows(metadata) },
        layout: "lightHorizontalLines",
        margin: [0, 14, 0, 0],
      },
      section(pdf.stockSnapshot),
      {
        table: { widths: [95, "*"], body: labelValueRows(stockMetrics) },
        layout: "lightHorizontalLines",
      },
      section(pdf.conclusion),
      {
        columns: [
          { width: "50%", stack: [{ text: pdf.rating, style: "tableLabel" }, { text: rating, style: "rating" }] },
          { width: "50%", stack: [{ text: pdf.position, style: "tableLabel" }, { text: position, style: "position" }] },
        ],
        columnGap: 16,
      },
      { text: pdf.summary, style: "minorHeading", margin: [0, 14, 0, 5] },
      { text: display(analysis.summary), style: "body" },
      section(pdf.opportunities),
      { ul: analysis.opportunities.map((item) => display(item)), style: "list" },
      section(pdf.risks),
      { ul: analysis.risks.map((item) => display(item)), style: "list" },
      section(pdf.watchlist),
      {
        table: {
          headerRows: 1,
          widths: [90, 78, "*"],
          body: [
            [pdf.indicator, pdf.value, pdf.reason].map((text) => ({ text, style: "watchHeader" })),
            ...analysis.watchlist.map((item) => [display(item.name), display(item.value), display(item.reason)]),
          ],
        },
        layout: "lightHorizontalLines",
      },
      { text: pdf.disclaimer, style: "minorHeading", margin: [0, 20, 0, 5] },
      { text: t.ai.disclaimer, style: "disclaimer" },
    ],
    styles: {
      title: { fontSize: 22, bold: true, color: "#0f766e" },
      subtitle: { fontSize: 13, bold: true, color: "#334155", margin: [0, 4, 0, 0] },
      sectionHeading: { fontSize: 13, bold: true, color: "#0f766e" },
      minorHeading: { fontSize: 10, bold: true, color: "#334155" },
      tableLabel: { bold: true, color: "#64748b" },
      tableValue: { color: "#1f2933" },
      rating: { fontSize: 16, bold: true, color: "#0f766e", margin: [0, 3, 0, 0] },
      position: { fontSize: 16, bold: true, color: "#1f2933", margin: [0, 3, 0, 0] },
      body: { fontSize: 10, lineHeight: 1.35 },
      list: { fontSize: 10, lineHeight: 1.3 },
      watchHeader: { bold: true, color: "#0f766e", fillColor: "#ecfdf5" },
      disclaimer: { fontSize: 8.5, color: "#64748b", italics: true },
    },
  };
}
