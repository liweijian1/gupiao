import { useEffect, useMemo, useState } from "react";
import { Database, SlidersHorizontal } from "lucide-react";

import { MiniBars } from "./MiniBars.jsx";
import { spark } from "../data/mockData.js";
import { EQUITY_MARKETS, filterEquitiesByMarket, marketForExchange } from "../utils/equityDiscovery.js";

const FACTOR_PRESETS = [
  { momentum: 85, quality: 52, valuation: 35, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 85, valuation: 35, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 85, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 35, liquidity: 90, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 35, liquidity: 70, volatility: 90 },
];

export function EquityDiscoveryPanel({ t, stocks, selectedTicker, factors, sortKey, searchState, stockSourceStatus, realtimeMeta, activeProvider, activeProviderHealth, providerDiag, sectionRef, onRetryStockSnapshot, onRetrySearch, onSelectTicker, onFactorsChange, onSortChange }) {
  const [activeMarket, setActiveMarket] = useState("CN");
  const [showProviderDiag, setShowProviderDiag] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const marketStocks = useMemo(() => filterEquitiesByMarket(stocks, activeMarket), [activeMarket, stocks]);
  useEffect(() => {
    const selected = stocks.find((stock) => stock.ticker === selectedTicker);
    if (!selected || marketStocks.some((stock) => stock.ticker === selectedTicker)) return;
    setActiveMarket(marketForExchange(selected.exchange) ?? "CN");
  }, [marketStocks, selectedTicker, stocks]);
  const selectMarket = (market) => {
    setActiveMarket(market);
    const rows = filterEquitiesByMarket(stocks, market);
    if (rows.length && !rows.some((stock) => stock.ticker === selectedTicker)) onSelectTicker(rows[0].ticker);
  };
  const emptyLabel = searchState === "loading" ? t.searchingEquities : searchState === "error" ? t.equitySearchError : t.noEquityMatches;
  const message = searchState === "loading" ? t.searchingEquities : searchState === "error" ? t.equitySearchError : stockSourceStatus.message;
  return <section className="panel equity-discovery-panel nav-target" ref={sectionRef} aria-labelledby="equity-discovery-title">
    <header className="region-heading equity-discovery-heading"><div><small>{marketStocks.length} {t.matches}</small><h2 id="equity-discovery-title">{t.equityDiscovery}</h2></div><SlidersHorizontal size={18} aria-hidden="true" /></header>
    <div className="segmented market-tabs" role="group" aria-label={t.marketScope}>{EQUITY_MARKETS.map((market) => <button type="button" className={activeMarket === market ? "selected" : ""} aria-pressed={activeMarket === market} onClick={() => selectMarket(market)} key={market}>{t.markets[market]}</button>)}</div>
    <details className="discovery-section discovery-ranking" open={rankingOpen} onToggle={(event) => setRankingOpen(event.currentTarget.open)}><summary>{t.rankingList}</summary><div className="discovery-section-content">
      <div className="discovery-list-toolbar"><div className="segmented" role="group" aria-label={t.ranked}>{["score", "growth", "trend"].map((key) => <button type="button" className={sortKey === key ? "selected" : ""} aria-pressed={sortKey === key} onClick={() => onSortChange(key)} key={key}>{t.sort[key]}</button>)}</div><span className="source-badge" data-source-kind={stockSourceStatus.kind}><Database size={13} aria-hidden="true" /> {stockSourceStatus.label}</span></div>
      {message && <div className="region-status-message" role={searchState === "error" || stockSourceStatus.kind === "degraded" ? "alert" : "status"}><span>{message}</span>{(searchState === "error" || stockSourceStatus.retryTarget === "search") && <button type="button" className="ghost" onClick={onRetrySearch}>{t.retry}</button>}{stockSourceStatus.retryTarget === "snapshot" && <button type="button" className="ghost" onClick={onRetryStockSnapshot}>{t.retry}</button>}</div>}
      {realtimeMeta?.notice && <p className="source-notice" role="status">{realtimeMeta.notice}</p>}
      {activeProvider && <button type="button" className="ghost provider-status" aria-expanded={showProviderDiag} onClick={() => setShowProviderDiag((value) => !value)}>{t.provider}: {activeProvider} {activeProviderHealth?.status === "cooldown" ? "⏸" : "✓"}</button>}
      {showProviderDiag && providerDiag.length > 0 && <div className="provider-diag" aria-label={t.providerDetails}>{providerDiag.map((entry) => <span key={`${entry.provider}-${entry.result}`}>{entry.provider} · {entry.result} · {entry.duration_ms}ms{entry.error ? ` · ${entry.error}` : ""}</span>)}</div>}
      <div className="equity-list" aria-label={t.rankingList}>{marketStocks.length === 0 && <p className="equity-empty" role="status">{emptyLabel}</p>}{marketStocks.map((stock) => { const selected = selectedTicker === stock.ticker; const positive = Number(stock.chg ?? 0) >= 0; return <button type="button" className={`equity-row${selected ? " selected" : ""}`} aria-current={selected ? "true" : undefined} onClick={() => onSelectTicker(stock.ticker)} key={stock.ticker}><span className="equity-row-main"><strong>{stock.ticker}</strong><b className="score-pill">{stock.score}</b></span><span className="equity-row-name">{stock.name} · {stock.exchange} · {stock.source ?? "prototype"}</span><span className="equity-row-quote"><b>{stock.currency}{Number(stock.price ?? 0).toFixed(2)}</b><em className={positive ? "up" : "down"}>{positive ? "+" : ""}{stock.chg}%</em></span><span className="equity-row-metrics">P/E {stock.pe} · {t.sort.growth} {stock.growth}% · RSI {stock.rsi}</span><MiniBars values={spark.map((value) => Math.max(18, value - (90 - stock.trend) / 2))} tone={positive ? "cyan" : "red"} /></button>; })}</div>
    </div></details>
    <details className="discovery-section discovery-filters" open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}><summary>{t.factorFilters}</summary><div className="discovery-section-content">{Object.entries(factors).map(([key, value]) => <label className="slider-row" key={key}><span>{t.factors[key]}</span><input type="range" min="0" max="100" value={value} onChange={(event) => onFactorsChange({ ...factors, [key]: Number(event.target.value) })} /><b>{value}</b></label>)}<div className="filter-chips">{t.chips.map((chip, index) => <button type="button" onClick={() => onFactorsChange(FACTOR_PRESETS[index])} key={chip}>{chip}</button>)}</div></div></details>
  </section>;
}
