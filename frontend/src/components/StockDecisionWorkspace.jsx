import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { HistoricalStockChart } from "./HistoricalStockChart.jsx";

export function StockDecisionWorkspace({ t, lang, stock, realtimeMeta, researchRow, researchStatus, sectionRef, isWatchlisted, onToggleWatchlist }) {
  const change = Number(stock.chg ?? 0);
  const positive = change >= 0;
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const formatNumber = (value, { currency = false, compact = false } = {}) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    return `${currency ? stock.currency ?? "" : ""}${new Intl.NumberFormat(locale, { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 2 }).format(numeric)}`;
  };

  return (
    <section className="panel stock-decision-workspace candlestick-chart nav-target" ref={sectionRef} aria-labelledby="stock-workspace-title">
      <header className="stock-identity">
        <div>
          <small>{t.selectedEquity} · {stock.exchange}</small>
          <p className="stock-breadcrumb">A股　›　食品饮料　›　白酒</p><div className="stock-title-row"><h2 id="stock-workspace-title">{stock.name} <span>{stock.ticker}</span></h2><button type="button" className={`watchlist-toggle${isWatchlisted ? " saved" : ""}`} onClick={onToggleWatchlist} aria-pressed={isWatchlisted} aria-label={isWatchlisted ? t.watchlist.remove : t.watchlist.add} title={isWatchlisted ? t.watchlist.remove : t.watchlist.add}><Star size={17} fill={isWatchlisted ? "currentColor" : "none"} /></button></div>
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
      <HistoricalStockChart stock={stock} t={t} lang={lang} />
      {researchRow && <div className="research-stock-evidence"><span>{lang === "zh" ? "研究排名" : "Research rank"} <b>#{researchRow.rank}</b></span><span>{lang === "zh" ? "研究综合分" : "Research score"} <b>{researchRow.score}</b></span><small>{lang === "zh" ? "与当前数据版本一致" : "Matched to the active dataset"}</small></div>}
      {!researchRow && researchStatus === "unavailable" && <div className="research-stock-evidence muted">{lang === "zh" ? "尚无研究数据；可在下方证据区刷新。" : "No research dataset; refresh it in the evidence band."}</div>}
      <div className="factor-strip">
        {[[t.factors.momentum, stock.trend], [t.factors.quality, stock.score], [t.factors.valuation, 42], [t.factors.liquidity, stock.liquidity], [t.factors.volatility, 39]].map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b><i><em style={{ width: `${value}%` }} /></i></span>)}
      </div>
    </section>
  );
}
