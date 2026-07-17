import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { spark } from "../data/mockData.js";
import { selectDecisionChartSeries } from "../utils/decisionChart.js";

const TIMEFRAMES = ["1M", "3M", "12M", "3Y"];

function buildChartPoints(values, width = 720, height = 280, padding = 24) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  return values.map((value, index) => ({
    x: padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2),
    y: height - padding - ((value - minimum) / range) * (height - padding * 2),
  }));
}

export function StockDecisionWorkspace({ t, lang, stock, indicator, indicatorOptions, realtimeMeta, sectionRef, onIndicatorChange }) {
  const [timeframe, setTimeframe] = useState("12M");
  const chartSeries = useMemo(() => selectDecisionChartSeries({ baseValues: spark, timeframe, indicator, indicatorOptions }), [indicator, indicatorOptions, timeframe]);
  const points = useMemo(() => buildChartPoints(chartSeries.stockContextValues), [chartSeries.stockContextValues]);
  const comparisonPoints = useMemo(() => chartSeries.comparisonValues ? buildChartPoints(chartSeries.comparisonValues) : [], [chartSeries.comparisonValues]);
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const comparisonPolyline = comparisonPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const change = Number(stock.chg ?? 0);
  const positive = change >= 0;
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const formatNumber = (value, { currency = false, compact = false } = {}) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    return `${currency ? stock.currency ?? "" : ""}${new Intl.NumberFormat(locale, { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 2 }).format(numeric)}`;
  };

  return (
    <section className="panel stock-decision-workspace nav-target" ref={sectionRef} aria-labelledby="stock-workspace-title">
      <header className="stock-identity">
        <div>
          <small>{t.selectedEquity} · {stock.exchange}</small>
          <h2 id="stock-workspace-title">{stock.ticker} <span>{stock.name}</span></h2>
          {realtimeMeta?.updated_at && <p>{t.marketUpdated}: {new Date(realtimeMeta.updated_at).toLocaleString(locale)}</p>}
        </div>
        <div className="stock-price-block">
          <strong>{stock.currency}{Number(stock.price ?? 0).toFixed(2)}</strong>
          <span className={positive ? "up" : "down"}>{positive ? <TrendingUp size={16} aria-hidden="true" /> : <TrendingDown size={16} aria-hidden="true" />}{positive ? "+" : ""}{change}%</span>
        </div>
      </header>
      <div className="market-metadata-grid" aria-label={t.marketMetadata}>
        <span>{t.marketOpen}<b>{formatNumber(stock.open, { currency: true })}</b></span>
        <span>{t.marketHigh}<b>{formatNumber(stock.high, { currency: true })}</b></span>
        <span>{t.marketLow}<b>{formatNumber(stock.low, { currency: true })}</b></span>
        <span>{t.previousClose}<b>{formatNumber(stock.previous_close, { currency: true })}</b></span>
        <span>{t.volume}<b>{formatNumber(stock.volume, { compact: true })}</b></span>
        <span>{t.amount}<b>{formatNumber(stock.amount, { compact: true })}</b></span>
        <span>{t.turnover}<b>{Number.isFinite(Number(stock.turnover)) ? `${formatNumber(stock.turnover)}%` : "--"}</b></span>
      </div>
      <div className="chart-toolbar">
        <div className="timeframe-control" role="group" aria-label={t.timeframe}>
          {TIMEFRAMES.map((item) => <button type="button" className={timeframe === item ? "selected" : ""} aria-pressed={timeframe === item} onClick={() => setTimeframe(item)} key={item}>{item}</button>)}
        </div>
        <label className="indicator-control"><span>{t.comparison}</span><select value={indicator} onChange={(event) => onIndicatorChange(event.target.value)}><option value="Composite">{t.composite}</option>{indicatorOptions.map((item) => <option value={item.key} key={item.key}>{t.macro[item.key] ?? item.key}</option>)}</select></label>
      </div>
      <div className="price-chart" role="img" aria-label={`${t.priceChart}: ${stock.ticker}, ${timeframe}`}>
        <svg viewBox="0 0 720 280" preserveAspectRatio="none" aria-hidden="true">
          {[64, 118, 172, 226].map((y) => <line className="chart-grid-line" x1="24" x2="696" y1={y} y2={y} key={y} />)}
          {comparisonPolyline && <polyline className="chart-comparison-line" points={comparisonPolyline} />}
          <polyline className="chart-line" points={polyline} />
          <circle className="chart-endpoint" cx={points.at(-1).x} cy={points.at(-1).y} r="4" />
        </svg>
        <span className="chart-comparison-label">{t.macro[indicator] ?? (indicator === "Composite" ? t.composite : indicator)}</span>
      </div>
      <p className="chart-context-note">{t.chartContextNote}</p>
      <div className="metric-grid">
        <span>{lang === "zh" ? "因子评分" : "Factor score"}<b>{stock.score}</b></span><span>P/E<b>{stock.pe}</b></span><span>{lang === "zh" ? "增长" : "Growth"}<b>{stock.growth}%</b></span><span>RSI<b>{stock.rsi}</b></span><span>Beta<b>{stock.beta}</b></span><span>{t.factors.liquidity}<b>{stock.liquidity}</b></span><span>{t.factors.momentum}<b>{stock.trend}</b></span>
      </div>
    </section>
  );
}
