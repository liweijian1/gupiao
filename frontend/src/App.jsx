import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  Database,
  Download,
  LineChart,
  RefreshCcw,
  Search,
  Settings2,
} from "lucide-react";

import { MiniBars } from "./components/MiniBars.jsx";
import { EquityDiscoveryPanel } from "./components/EquityDiscoveryPanel.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { MacroEvidenceBand } from "./components/MacroEvidenceBand.jsx";
import { StockDecisionWorkspace } from "./components/StockDecisionWorkspace.jsx";
import { AiResearchPanel } from "./components/AiResearchPanel.jsx";
import { AiSettingsDialog } from "./components/AiSettingsDialog.jsx";
import { AuthDialog } from "./components/AuthDialog.jsx";
import { factorDefaults, macroInputs, macroTrend, spark, stocks } from "./data/mockData.js";
import {
  useMacroSnapshot,
  useProviderHealth,
  useRealtimeQuote,
  useStockSearch,
  useStockSnapshot,
} from "./hooks/useMarketData.js";
import { useAiAnalysis } from "./hooks/useAiAnalysis.js";
import { useAuth } from "./hooks/useAuth.js";
import { useWatchlist } from "./hooks/useWatchlist.js";
import { copy } from "./i18n/copy.js";
import { downloadAiAnalysisPdf } from "./utils/aiPdfReport.js";
import {
  deriveMacroSourceStatus,
  deriveStockSourceStatus,
} from "./utils/dataSourceStatus.js";
import {
  applyRealtimeQuote,
  filterAndSortEquities,
  mergeEquityUniverses,
  resolveSelectedEquity,
} from "./utils/equityDiscovery.js";
import { weightedScore } from "./utils/metrics.js";
import { buildMarkdownReport, downloadMarkdownReport } from "./utils/reportExport.js";

export function App() {
  const [lang, setLang] = useState("zh");
  const [stockQuery, setStockQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("600519");
  const [indicator, setIndicator] = useState("Composite");
  const [factors, setFactors] = useState(factorDefaults);
  const [sortKey, setSortKey] = useState("score");
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showAnalysisPassword, setShowAnalysisPassword] = useState(false);
  const [analysisPassword, setAnalysisPassword] = useState("");
  const [pendingAnalysisForce, setPendingAnalysisForce] = useState(null);
  const [activeNav, setActiveNav] = useState(0);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState("login");
  const auth = useAuth();
  const watchlist = useWatchlist({ user: auth.user, authStatus: auth.status });
  const {
    snapshot: macroSnapshot,
    status: macroSnapshotStatus,
    error: macroSnapshotError,
    retry: retryMacroSnapshot,
  } = useMacroSnapshot();
  const {
    snapshot: stockSnapshot,
    status: stockSnapshotStatus,
    error: stockSnapshotError,
    retry: retryStockSnapshot,
  } = useStockSnapshot();
  const { searchSnapshot, searchState, retrySearch } = useStockSearch(stockQuery);
  const screenerRef = useRef(null);
  const macroRef = useRef(null);
  const chartRef = useRef(null);
  const reportRef = useRef(null);
  const dataRef = useRef(null);
  const navigationLockRef = useRef(false);
  const navigationUnlockTimerRef = useRef(null);
  const t = copy[lang];

  const handleNavigation = (index) => {
    navigationLockRef.current = true;
    window.clearTimeout(navigationUnlockTimerRef.current);
    setActiveNav(index);
    const target = [screenerRef, macroRef, chartRef, reportRef, dataRef][index]?.current;
    target?.scrollIntoView({ behavior: "smooth", block: index === 3 ? "center" : "start" });
    if (index === 3) {
      window.setTimeout(() => target?.focus({ preventScroll: true }), 350);
    }
    navigationUnlockTimerRef.current = window.setTimeout(() => {
      navigationLockRef.current = false;
    }, 900);
  };

  useEffect(() => {
    const targets = [
      [screenerRef.current, 0],
      [macroRef.current, 1],
      [chartRef.current, 2],
      [dataRef.current, 4],
    ].filter(([element]) => element);
    const visibility = new Map();
    const observer = new IntersectionObserver((entries) => {
      if (navigationLockRef.current) {
        return;
      }
      entries.forEach((entry) => visibility.set(entry.target, entry.intersectionRatio));
      const visibleTarget = targets
        .map(([element, index]) => ({ index, ratio: visibility.get(element) ?? 0 }))
        .sort((a, b) => b.ratio - a.ratio)[0];
      if (visibleTarget?.ratio > 0.2) {
        setActiveNav(visibleTarget.index);
      }
    }, { threshold: [0.2, 0.45, 0.7], rootMargin: "-72px 0px -18% 0px" });
    targets.forEach(([element]) => observer.observe(element));
    return () => {
      observer.disconnect();
      window.clearTimeout(navigationUnlockTimerRef.current);
    };
  }, []);

  const stockUniverse = useMemo(() => mergeEquityUniverses(
    stocks.map((stock) => ({ ...stock, source: stock.source ?? "prototype" })),
    stockSnapshot?.stocks ?? [],
  ), [stockSnapshot]);

  const activeStockUniverse = stockQuery.trim() && searchSnapshot ? searchSnapshot.stocks ?? [] : stockUniverse;
  const baseDetailStockUniverse = useMemo(
    () => mergeEquityUniverses(stockUniverse, activeStockUniverse, watchlist.stocks),
    [activeStockUniverse, stockUniverse, watchlist.stocks],
  );
  const selectedStockBase = resolveSelectedEquity(baseDetailStockUniverse, selectedTicker, stocks[0]);
  const { realtimeQuote, realtimeMeta, realtimeState } = useRealtimeQuote(selectedStockBase);
  const providerHealth = useProviderHealth(realtimeMeta?.updated_at);

  const displayedStockUniverse = useMemo(
    () => applyRealtimeQuote(activeStockUniverse, realtimeQuote),
    [activeStockUniverse, realtimeQuote],
  );
  const detailStockUniverse = useMemo(
    () => mergeEquityUniverses(stockUniverse, displayedStockUniverse, watchlist.stocks),
    [displayedStockUniverse, stockUniverse, watchlist.stocks],
  );

  const macroSeries = useMemo(() => {
    if (!macroSnapshot?.series) {
      return macroInputs;
    }
    return macroSnapshot.series.map((item) => ({
      key: item.key,
      group: item.group,
      api: item.api,
      value: item.latest_value,
      unit: item.unit,
      direction: item.direction,
      z: item.z_score,
      weight: item.weight,
      score: item.score,
      source: item.source,
      points: item.points,
      latestDate: item.latest_date,
      updatedAt: item.updated_at,
      error: item.error,
    }));
  }, [macroSnapshot]);

  const selectedStock = resolveSelectedEquity(detailStockUniverse, selectedTicker, stocks[0]);

  useEffect(() => {
    const selectedStillExists = detailStockUniverse.some(
      (stock) => stock.ticker === selectedTicker,
    );
    if (!selectedStillExists && selectedStock.ticker !== selectedTicker) {
      setSelectedTicker(selectedStock.ticker);
    }
  }, [detailStockUniverse, selectedStock.ticker, selectedTicker]);
  const aiAnalysis = useAiAnalysis({ ticker: selectedStock.ticker, lang, analysisPassword });
  const growthScore = macroSnapshot?.scores?.economic_climate ?? weightedScore(macroSeries.filter((item) => item.group === "Growth" || item.group === "Property"));
  const liquidityScore = macroSnapshot?.scores?.liquidity ?? weightedScore(macroSeries.filter((item) => item.group === "Liquidity" || item.group === "Rates"));
  const inflationScore = macroSnapshot?.scores?.inflation ?? weightedScore(macroSeries.filter((item) => item.group === "Inflation"));
  const externalScore = macroSnapshot?.scores?.external_pressure ?? weightedScore(macroSeries.filter((item) => item.group === "External"));
  const cycle = macroSnapshot?.scores?.cycle ?? (growthScore > 58 && inflationScore < 55 ? "Recovery" : growthScore > 60 && inflationScore >= 55 ? "Overheat" : growthScore < 48 && inflationScore > 55 ? "Stagflation" : "Slowdown");

  const filteredStocks = useMemo(() => filterAndSortEquities(displayedStockUniverse, {
    query: stockQuery,
    factors,
    sortKey,
    sectorLabels: t.sectors,
  }), [displayedStockUniverse, factors, sortKey, stockQuery, t.sectors]);
  const watchlistStocks = useMemo(() => {
    if (!stockQuery.trim()) return watchlist.stocks;
    return filterAndSortEquities(watchlist.stocks, { query: stockQuery, factors, sortKey, sectorLabels: t.sectors });
  }, [factors, sortKey, stockQuery, t.sectors, watchlist.stocks]);

  useEffect(() => {
    const selectedIsVisible = filteredStocks.some(
      (stock) => stock.ticker === selectedTicker,
    );
    if (stockQuery.trim().length > 0 && filteredStocks.length > 0 && !selectedIsVisible) {
      setSelectedTicker(filteredStocks[0].ticker);
    }
  }, [filteredStocks, selectedTicker, stockQuery]);

  const stockSourceStatus = deriveStockSourceStatus({
    realtimeState,
    realtimeQuote,
    realtimeMeta,
    lang,
    stockQuery,
    searchSnapshot,
    searchState,
    stockSnapshot,
    stockSnapshotStatus,
    stockSnapshotError,
  });
  const stockSource = stockSourceStatus.label;
  const macroSourceStatus = deriveMacroSourceStatus({
    requestStatus: macroSnapshotStatus,
    snapshot: macroSnapshot,
    error: macroSnapshotError,
    lang,
  });
  const macroSource = macroSnapshot?.source ?? "mock";
  const activeProvider = realtimeQuote?.provider ?? realtimeMeta?.quote?.provider;

  const providerDiag = realtimeMeta?.source_chain ?? [];
  const activeProviderHealth = providerHealth?.providers?.find((item) => item.name === activeProvider);
  const requestAnalysis = (force = false) => {
    if (!analysisPassword) {
      setPendingAnalysisForce(force);
      setShowAnalysisPassword(true);
      return;
    }
    aiAnalysis.run({ force });
  };

  useEffect(() => {
    if (pendingAnalysisForce === null || !analysisPassword) return;
    const force = pendingAnalysisForce;
    setPendingAnalysisForce(null);
    aiAnalysis.run({ force });
  }, [analysisPassword, pendingAnalysisForce, aiAnalysis.run]);

  useEffect(() => {
    if (aiAnalysis.error?.status === 401 && aiAnalysis.error?.code === "invalid_analysis_password") {
      setAnalysisPassword("");
      setPendingAnalysisForce(false);
      setShowAnalysisPassword(true);
    }
    if (aiAnalysis.error?.code === "ai_not_configured") {
      setShowAiSettings(true);
    }
  }, [aiAnalysis.error]);

  const handleExportReport = () => {
    const markdown = buildMarkdownReport({
      lang,
      t,
      selectedStock,
      filteredStocks,
      macroScores: {
        growth: growthScore,
        liquidity: liquidityScore,
        inflation: inflationScore,
        external: externalScore,
      },
      cycle,
      macroSeries,
      stockSource,
      macroSource,
      realtimeMeta,
      providerDiag,
    });
    downloadMarkdownReport(markdown, selectedStock);
  };

  const handleExportAiAnalysis = async () => {
    if (!aiAnalysis.result) return;
    await downloadAiAnalysisPdf({
      lang,
      t,
      selectedStock,
      result: aiAnalysis.result,
    });
  };

  const openAuth = (mode = "login") => {
    setAuthDialogMode(mode);
    setShowAuthDialog(true);
  };
  const handleWatchlistToggle = async () => {
    if (!auth.user) {
      openAuth();
      return;
    }
    if (watchlist.tickers.includes(selectedStock.ticker)) {
      await watchlist.remove(selectedStock.ticker);
    } else {
      await watchlist.add(selectedStock.ticker);
    }
  };

  return (
    <>
    <AppShell t={t} lang={lang} stockQuery={stockQuery} activeNav={activeNav} stockSourceStatus={stockSourceStatus} macroSourceStatus={macroSourceStatus} reportButtonRef={reportRef} authUser={auth.user} onOpenAuth={() => openAuth()} onLogout={auth.logout} onStockQueryChange={setStockQuery} onLanguageChange={setLang} onNavigate={handleNavigation} onOpenAiSettings={() => setShowAiSettings(true)} onExportReport={handleExportReport}>
      {false && <main className="terminal">
      <aside className="rail">
        <div className="brand">
          <span>Q</span>
          <div>
            <strong>QuantDesk</strong>
            <small>{t.lab}</small>
          </div>
        </div>
        <nav>
          {[
            [BarChart3, 0],
            [Activity, 1],
            [LineChart, 2],
            [BookOpenCheck, 3],
            [Database, 4],
          ].map(([Icon, index]) => (
            <button
              className={activeNav === index ? "active" : ""}
              aria-current={activeNav === index ? "page" : undefined}
              aria-label={t.nav[index]}
              data-tooltip={t.nav[index]}
              onClick={() => handleNavigation(index)}
              key={t.nav[index]}
            >
              <Icon size={17} /> <span>{t.nav[index]}</span>
            </button>
          ))}
        </nav>
        <div className="rail-card">
          <small>{t.pipeline}</small>
          <strong>{t.cache}</strong>
          <span>{t.refresh} · {macroSource}</span>
          <button><RefreshCcw size={14} /> {t.sync}</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="searchbox">
            <Search size={18} />
            <input value={stockQuery} onChange={(event) => setStockQuery(event.target.value)} placeholder={t.search} />
          </div>
          <div className="market-strip">
            <span>CSI 300 <b className="up">+0.42%</b></span>
            <span>HSI <b className="down">-0.18%</b></span>
            <span>CN10Y <b>1.72%</b></span>
            <span>USD/CNY <b>7.18</b></span>
          </div>
          <button type="button" className="icon-button ai-settings-button" aria-label={t.ai.settings} onClick={() => setShowAiSettings(true)}>
            <Settings2 size={16} />
          </button>
          <div className="segmented language-toggle" aria-label="Language selector">
            <button className={lang === "zh" ? "selected" : ""} onClick={() => setLang("zh")}>中</button>
            <button className={lang === "en" ? "selected" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
          <button className="icon-button" aria-label="Alerts"><Bell size={18} /></button>
          <button className="primary" ref={reportRef} onClick={handleExportReport}><Download size={16} /> {t.export}</button>
        </header>

        <div className="content-grid">
          <EquityDiscoveryPanel
            t={t}
            stocks={filteredStocks}
            watchlistStocks={watchlistStocks}
            watchlistDetailsStatus={watchlist.detailsStatus}
            watchlistUnavailableTickers={watchlist.unavailableTickers}
            selectedTicker={selectedTicker}
            factors={factors}
            sortKey={sortKey}
            searchState={searchState}
            stockSourceStatus={stockSourceStatus}
            realtimeMeta={realtimeMeta}
            activeProvider={activeProvider}
            activeProviderHealth={activeProviderHealth}
            providerDiag={providerDiag}
            sectionRef={screenerRef}
            onRetryStockSnapshot={retryStockSnapshot}
            onRefreshWatchlistStocks={watchlist.refreshStocks}
            onRetrySearch={retrySearch}
            onSelectTicker={setSelectedTicker}
            onFactorsChange={setFactors}
            onSortChange={setSortKey}
          />
          {/* Legacy factor/table panels removed; discovery owns those controls. */}
          {false && <section className="panel factor-panel nav-target" ref={screenerRef}>
            <div className="panel-title">
              <div>
                <small>{t.factorBuilder}</small>
                <h2>{t.quantScreen}</h2>
              </div>
              <SlidersHorizontal size={18} />
            </div>
            {Object.entries(factors).map(([key, value]) => (
              <label className="slider-row" key={key}>
                <span>{t.factors[key]}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(event) => setFactors({ ...factors, [key]: Number(event.target.value) })}
                />
                <b>{value}</b>
              </label>
            ))}
            <div className="filter-chips">
              {t.chips.map((chip) => (
                <button key={chip}>{chip}</button>
              ))}
            </div>
            <div className="backtest-box">
              <small>{t.backtest}</small>
              <MiniBars values={[22, 34, 30, 42, 55, 49, 66, 72, 80, 76, 88, 92]} />
              <div><span>{t.alpha}</span><b className="up">+8.6%</b></div>
            </div>
          </section>}

          {false && <section className="panel table-panel">
            <div className="panel-title compact">
              <div>
                <small>{filteredStocks.length} {t.matches} · {stockSource}</small>
                <h2>{t.ranked}</h2>
                {(realtimeMeta?.warning || realtimeMeta?.notice) && (
                  <p className="source-notice">{realtimeMeta.warning || realtimeMeta.notice}</p>
                )}
              </div>
              <div className="table-actions">
                {activeProvider && (
                  <button
                    type="button"
                    className="ghost provider-status"
                    onClick={() => {}}
                  >
                    {lang === "zh" ? "数据源" : "Provider"}: {activeProvider} {activeProviderHealth?.status === "cooldown" ? "⏸" : "✓"}
                  </button>
                )}
                <div className="segmented">
                  {["score", "growth", "trend"].map((key) => (
                    <button className={sortKey === key ? "selected" : ""} onClick={() => setSortKey(key)} key={key}>{t.sort[key]}</button>
                  ))}
                </div>
              </div>
            </div>
            {false && providerDiag.length > 0 && (
              <div className="provider-diag" aria-live="polite">
                {providerDiag.map((entry) => (
                  <span key={`${entry.provider}-${entry.result}`}>
                    {entry.provider} {entry.result} {entry.duration_ms}ms{entry.error ? ` · ${entry.error}` : ""}
                  </span>
                ))}
              </div>
            )}
            <table>
              <thead>
                <tr>
                  {t.table.map((head) => <th key={head}>{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredStocks.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan={9} aria-live="polite">
                      {searchState === "loading"
                        ? (lang === "zh" ? "正在查询 A 股实时数据…" : "Searching live A-share data…")
                        : searchState === "error"
                          ? (lang === "zh" ? "实时行情源暂时不可用，请稍后重试" : "Live market source is temporarily unavailable")
                          : (lang === "zh" ? "没有找到匹配的股票" : "No matching equities")}
                    </td>
                  </tr>
                )}
                {filteredStocks.map((stock) => (
                  <tr className={selectedTicker === stock.ticker ? "active-row" : ""} onClick={() => setSelectedTicker(stock.ticker)} key={stock.ticker}>
                    <td><strong>{stock.ticker}</strong><span>{stock.name} · {stock.exchange}</span></td>
                    <td>{t.sectors[stock.sector] ?? stock.sector}</td>
                    <td>{stock.currency}{stock.price.toFixed(2)}</td>
                    <td className={stock.chg > 0 ? "up" : "down"}>{stock.chg > 0 ? "+" : ""}{stock.chg}%</td>
                    <td><span className="score-pill">{stock.score}</span></td>
                    <td>{stock.pe}</td>
                    <td>{stock.growth}%</td>
                    <td>{stock.rsi}</td>
                    <td><MiniBars values={spark.map((v) => Math.max(18, v - (90 - stock.trend) / 2))} tone={stock.chg > 0 ? "cyan" : "red"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>}

          <StockDecisionWorkspace
            t={t}
            lang={lang}
            stock={selectedStock}
            indicator={indicator}
            indicatorOptions={macroSeries}
            realtimeMeta={realtimeMeta}
            sectionRef={chartRef}
            isWatchlisted={watchlist.tickers.includes(selectedStock.ticker)}
            onToggleWatchlist={handleWatchlistToggle}
            onIndicatorChange={setIndicator}
          />
          <AiResearchPanel
            t={t}
            lang={lang}
            ticker={selectedStock.ticker}
            score={selectedStock.score}
            status={aiAnalysis.status}
            result={aiAnalysis.result}
            error={aiAnalysis.error}
            needsPassword={showAnalysisPassword || aiAnalysis.needsPassword}
            onAnalyze={() => requestAnalysis(false)}
            onRefresh={() => requestAnalysis(true)}
            onExport={handleExportAiAnalysis}
            onSubmitPassword={(password) => {
              setAnalysisPassword(password);
              setShowAnalysisPassword(false);
              if (pendingAnalysisForce === null) setPendingAnalysisForce(false);
            }}
            onOpenSettings={() => setShowAiSettings(true)}
          />

          <MacroEvidenceBand
            t={t}
            scores={{ growth: growthScore, liquidity: liquidityScore, inflation: inflationScore, external: externalScore }}
            cycle={cycle}
            trendValues={macroTrend}
            macroSeries={macroSeries}
            sourceStatus={macroSourceStatus}
            selectedIndicator={indicator}
            overviewRef={macroRef}
            dataMapRef={dataRef}
            onRetry={retryMacroSnapshot}
            onSelectIndicator={setIndicator}
          />
        </div>
      </section></main>}
      <div className="content-grid">
        <StockDecisionWorkspace t={t} lang={lang} stock={selectedStock} indicator={indicator} indicatorOptions={macroSeries} realtimeMeta={realtimeMeta} sectionRef={chartRef} isWatchlisted={watchlist.tickers.includes(selectedStock.ticker)} onToggleWatchlist={handleWatchlistToggle} onIndicatorChange={setIndicator} />
        <AiResearchPanel t={t} lang={lang} ticker={selectedStock.ticker} score={selectedStock.score} status={aiAnalysis.status} result={aiAnalysis.result} error={aiAnalysis.error} needsPassword={showAnalysisPassword || aiAnalysis.needsPassword} onAnalyze={() => requestAnalysis(false)} onRefresh={() => requestAnalysis(true)} onExport={handleExportAiAnalysis} onSubmitPassword={(password) => { setAnalysisPassword(password); setShowAnalysisPassword(false); if (pendingAnalysisForce === null) setPendingAnalysisForce(false); }} onOpenSettings={() => setShowAiSettings(true)} />
        <EquityDiscoveryPanel t={t} stocks={filteredStocks} watchlistStocks={watchlistStocks} watchlistDetailsStatus={watchlist.detailsStatus} watchlistUnavailableTickers={watchlist.unavailableTickers} selectedTicker={selectedTicker} factors={factors} sortKey={sortKey} searchState={searchState} stockSourceStatus={stockSourceStatus} realtimeMeta={realtimeMeta} activeProvider={activeProvider} activeProviderHealth={activeProviderHealth} providerDiag={providerDiag} sectionRef={screenerRef} onRetryStockSnapshot={retryStockSnapshot} onRefreshWatchlistStocks={watchlist.refreshStocks} onRetrySearch={retrySearch} onSelectTicker={setSelectedTicker} onFactorsChange={setFactors} onSortChange={setSortKey} />
        <MacroEvidenceBand t={t} scores={{ growth: growthScore, liquidity: liquidityScore, inflation: inflationScore, external: externalScore }} cycle={cycle} trendValues={macroTrend} macroSeries={macroSeries} sourceStatus={macroSourceStatus} selectedIndicator={indicator} overviewRef={macroRef} dataMapRef={dataRef} onRetry={retryMacroSnapshot} onSelectIndicator={setIndicator} />
      </div>
    </AppShell>
      <AiSettingsDialog
        open={showAiSettings}
        onClose={() => setShowAiSettings(false)}
        onSaved={() => setShowAiSettings(false)}
        t={t}
      />
      <AuthDialog
        open={showAuthDialog}
        mode={authDialogMode}
        t={t}
        onClose={() => setShowAuthDialog(false)}
        onModeChange={setAuthDialogMode}
        onSubmit={authDialogMode === "register" ? auth.register : auth.login}
      />
    </>
  );
}
