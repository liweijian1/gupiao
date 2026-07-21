import { useEffect, useMemo, useState } from "react";
import { Filter, RefreshCcw } from "lucide-react";

import { EQUITY_SCOPES, filterEquitiesByMarket } from "../utils/equityDiscovery.js";
import { copyFactorDraft, FACTOR_KEYS, setDraftFactor } from "../utils/factorBuilder.js";

const FACTOR_PRESETS = [
  { momentum: 85, quality: 52, valuation: 35, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 85, valuation: 35, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 85, liquidity: 70, volatility: 45 },
];

export function EquityDiscoveryPanel({ t, stocks, watchlistStocks, watchlistDetailsStatus, watchlistUnavailableTickers, selectedTicker, factors, sortKey, searchState, stockSourceStatus, realtimeMeta, sectionRef, onRetryStockSnapshot, onRefreshWatchlistStocks, onRetrySearch, onSelectTicker, onFactorsChange, onSortChange }) {
  const [activeMarket, setActiveMarket] = useState("CN");
  const [isFactorBuilderOpen, setFactorBuilderOpen] = useState(false);
  const [draftFactors, setDraftFactors] = useState(() => copyFactorDraft(factors));
  const savedStocks = Array.isArray(watchlistStocks) ? watchlistStocks : [];
  const unavailableTickers = Array.isArray(watchlistUnavailableTickers) ? watchlistUnavailableTickers : [];
  const marketStocks = useMemo(() => activeMarket === "WATCHLIST" ? savedStocks : filterEquitiesByMarket(stocks, activeMarket), [activeMarket, savedStocks, stocks]);
  const selectMarket = (market) => { setActiveMarket(market); const rows = market === "WATCHLIST" ? savedStocks : filterEquitiesByMarket(stocks, market); if (rows.length && !rows.some((item) => item.ticker === selectedTicker)) onSelectTicker(rows[0].ticker); };
  const openFactorBuilder = () => { setDraftFactors(copyFactorDraft(factors)); setFactorBuilderOpen(true); };
  const cancelFactorBuilder = () => setFactorBuilderOpen(false);
  const applyFactorBuilder = () => { onFactorsChange(copyFactorDraft(draftFactors)); setFactorBuilderOpen(false); };
  useEffect(() => {
    if (activeMarket === "WATCHLIST") onRefreshWatchlistStocks?.().catch(() => {});
  }, [activeMarket, onRefreshWatchlistStocks]);
  const watchlistMessage = watchlistDetailsStatus === "loading"
    ? t.watchlist.loading
    : watchlistDetailsStatus === "error"
      ? t.watchlist.loadError
      : unavailableTickers.length
        ? t.watchlist.unavailable(unavailableTickers)
        : "";
  const message = activeMarket === "WATCHLIST"
    ? watchlistMessage
    : searchState === "loading" ? t.searchingEquities : searchState === "error" ? t.equitySearchError : stockSourceStatus.message;
  return <section className="panel equity-discovery-panel ranked-equity-table nav-target" ref={sectionRef} aria-labelledby="equity-discovery-title">
    <header className="ranking-heading"><h2 id="equity-discovery-title">{t.ranked}</h2><small>{marketStocks.length} {t.matches}</small></header>
    <div className="market-tabs ranking-tabs" role="group" aria-label={t.marketScope}>{EQUITY_SCOPES.map((market) => <button type="button" className={activeMarket === market ? "selected" : ""} aria-pressed={activeMarket === market} onClick={() => selectMarket(market)} key={market}>{t.markets[market]}</button>)}</div>
    <div className="ranking-toolbar"><select value={sortKey} onChange={(event) => onSortChange(event.target.value)} aria-label={t.ranked}>{["score", "growth", "trend"].map((key) => <option value={key} key={key}>{t.sort[key]}</option>)}</select><button type="button" className="ghost factor-builder-trigger" onClick={openFactorBuilder} aria-expanded={isFactorBuilderOpen} aria-controls="factor-builder-editor"><Filter size={15} /> {t.factorBuilder}</button></div>
    {isFactorBuilderOpen && <section className="factor-builder-editor" id="factor-builder-editor" aria-label={t.factorBuilder}>
      {FACTOR_KEYS.map((key) => <label className="factor-builder-row" key={key}><span>{t.factors[key]}</span><b>{draftFactors[key]}</b><input type="range" min="0" max="100" value={draftFactors[key]} onChange={(event) => setDraftFactors((draft) => setDraftFactor(draft, key, event.target.value))} aria-label={t.factors[key]} /></label>)}
      <div className="factor-builder-presets">{FACTOR_PRESETS.map((preset, index) => <button type="button" key={t.chips[index]} onClick={() => setDraftFactors(copyFactorDraft(preset))}>{t.chips[index]}</button>)}</div>
      <div className="factor-builder-actions"><button type="button" className="ghost" onClick={cancelFactorBuilder}>{t.cancel}</button><button type="button" className="primary" onClick={applyFactorBuilder}>{t.apply}</button></div>
    </section>}
    {message && <div className="ranking-status" role="status">{message}{(searchState === "error" || stockSourceStatus.retryTarget === "snapshot") && <button type="button" onClick={searchState === "error" ? onRetrySearch : onRetryStockSnapshot}><RefreshCcw size={13} /> {t.retry}</button>}</div>}
    <div className="ranking-columns"><span>{langLabel(t)}</span><span>{t.sort.score}</span><span>{t.growth}</span></div>
    <div className="equity-list ranking-list">{marketStocks.length ? marketStocks.map((stock, index) => { const positive = Number(stock.chg ?? 0) >= 0; const selected = selectedTicker === stock.ticker; return <button type="button" className={`ranking-row${selected ? " selected" : ""}`} aria-current={selected ? "true" : undefined} onClick={() => onSelectTicker(stock.ticker)} key={stock.ticker}><span className="ranking-index">{index + 1}</span><span className="ranking-name"><strong>{stock.ticker} {stock.name}</strong><small>{t.sectors[stock.sector] ?? stock.sector}</small></span><b>{stock.score}</b><em className={positive ? "up" : "down"}>{positive ? "+" : ""}{stock.chg}%</em></button>; }) : <p className="ranking-empty">{activeMarket === "WATCHLIST" && watchlistDetailsStatus === "loading" ? t.watchlist.loading : activeMarket === "WATCHLIST" ? t.watchlist.empty : t.noEquityMatches}</p>}</div>
    <div className="ranking-footer"><small>{realtimeMeta?.updated_at ? `${t.marketUpdated}: ${new Date(realtimeMeta.updated_at).toLocaleTimeString()}` : stockSourceStatus.label}</small><button type="button" className="ghost" onClick={onRetryStockSnapshot}><RefreshCcw size={14} /> {t.refresh}</button></div>
    <div className="quick-filters"><small>{t.factorFilters}</small><span>{FACTOR_KEYS.map((key) => `${t.factors[key]} ${factors[key]}`).join(" · ")}</span></div>
  </section>;
}

function langLabel(t) { return t.selectedEquity; }
