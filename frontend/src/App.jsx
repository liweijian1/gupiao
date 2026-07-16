import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronDown,
  Database,
  Download,
  Filter,
  LineChart,
  RefreshCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { MiniBars } from "./components/MiniBars.jsx";
import { ScoreGauge } from "./components/ScoreGauge.jsx";
import { AiAnalysisPanel } from "./components/AiAnalysisPanel.jsx";
import { AiSettingsDialog } from "./components/AiSettingsDialog.jsx";
import { factorDefaults, macroInputs, macroTrend, spark, stocks } from "./data/mockData.js";
import {
  useMacroSnapshot,
  useProviderHealth,
  useRealtimeQuote,
  useStockSearch,
  useStockSnapshot,
} from "./hooks/useMarketData.js";
import { useAiAnalysis } from "./hooks/useAiAnalysis.js";
import { copy } from "./i18n/copy.js";
import { filterMacroSeries, searchableText, weightedScore, zScore } from "./utils/metrics.js";
import { buildMarkdownReport, downloadMarkdownReport } from "./utils/reportExport.js";

export function App() {
  const [lang, setLang] = useState("zh");
  const [stockQuery, setStockQuery] = useState("");
  const [macroQuery, setMacroQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("NVDA");
  const [activeGroup, setActiveGroup] = useState("All");
  const [timeframe, setTimeframe] = useState("12M");
  const [indicator, setIndicator] = useState("Composite");
  const [factors, setFactors] = useState(factorDefaults);
  const [sortKey, setSortKey] = useState("score");
  const [showProviderDiag, setShowProviderDiag] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showAnalysisPassword, setShowAnalysisPassword] = useState(false);
  const [analysisPassword, setAnalysisPassword] = useState("");
  const [pendingAnalysisForce, setPendingAnalysisForce] = useState(null);
  const [activeNav, setActiveNav] = useState(0);
  const macroSnapshot = useMacroSnapshot();
  const stockSnapshot = useStockSnapshot();
  const { searchSnapshot, searchState } = useStockSearch(stockQuery);
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

  const stockUniverse = useMemo(() => {
    if (stockSnapshot?.stocks?.length) {
      return stockSnapshot.stocks;
    }
    return stocks;
  }, [stockSnapshot]);

  const activeStockUniverse = stockQuery.trim() && searchSnapshot ? searchSnapshot.stocks ?? [] : stockUniverse;
  const baseDetailStockUniverse = useMemo(() => {
    const combined = [...stockUniverse, ...activeStockUniverse];
    return [...new Map(combined.map((stock) => [stock.ticker, stock])).values()];
  }, [activeStockUniverse, stockUniverse]);
  const selectedStockBase = baseDetailStockUniverse.find((stock) => stock.ticker === selectedTicker) ?? baseDetailStockUniverse[0] ?? stocks[0];
  const { realtimeQuote, realtimeMeta, realtimeState } = useRealtimeQuote(selectedStockBase);
  const providerHealth = useProviderHealth(realtimeMeta?.updated_at);

  const displayedStockUniverse = useMemo(() => (
    activeStockUniverse.map((stock) => (
      realtimeQuote?.ticker === stock.ticker
        ? { ...stock, price: realtimeQuote.price, chg: realtimeQuote.chg, source: realtimeQuote.source }
        : stock
    ))
  ), [activeStockUniverse, realtimeQuote]);
  const detailStockUniverse = useMemo(() => {
    const combined = [...stockUniverse, ...displayedStockUniverse];
    return [...new Map(combined.map((stock) => [stock.ticker, stock])).values()];
  }, [displayedStockUniverse, stockUniverse]);

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
    }));
  }, [macroSnapshot]);

  const selectedStock = detailStockUniverse.find((stock) => stock.ticker === selectedTicker) ?? detailStockUniverse[0] ?? stocks[0];
  const aiAnalysis = useAiAnalysis({ ticker: selectedStock.ticker, lang, analysisPassword });
  const growthScore = macroSnapshot?.scores?.economic_climate ?? weightedScore(macroSeries.filter((item) => item.group === "Growth" || item.group === "Property"));
  const liquidityScore = macroSnapshot?.scores?.liquidity ?? weightedScore(macroSeries.filter((item) => item.group === "Liquidity" || item.group === "Rates"));
  const inflationScore = macroSnapshot?.scores?.inflation ?? weightedScore(macroSeries.filter((item) => item.group === "Inflation"));
  const externalScore = macroSnapshot?.scores?.external_pressure ?? weightedScore(macroSeries.filter((item) => item.group === "External"));
  const cycle = macroSnapshot?.scores?.cycle ?? (growthScore > 58 && inflationScore < 55 ? "Recovery" : growthScore > 60 && inflationScore >= 55 ? "Overheat" : growthScore < 48 && inflationScore > 55 ? "Stagflation" : "Slowdown");

  const filteredStocks = useMemo(() => {
    const normalizedQuery = stockQuery.trim().toLowerCase();
    return displayedStockUniverse
      .filter((stock) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          searchableText(
            stock.ticker,
            stock.name,
            stock.aliases?.join(" "),
            stock.exchange,
            stock.sector,
            t.sectors[stock.sector],
            stock.price,
            stock.score,
            stock.growth,
            stock.rsi,
          ).includes(normalizedQuery);
        const factorGate =
          stock.trend >= factors.momentum - 25 &&
          stock.score >= factors.quality - 10 &&
          stock.pe <= 65 - factors.valuation * 0.35 &&
          stock.liquidity >= factors.liquidity - 20 &&
          stock.beta <= 2.2 - factors.volatility * 0.012;
        return matchesQuery && (normalizedQuery.length > 0 || factorGate);
      })
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [stockQuery, factors, sortKey, displayedStockUniverse, t.sectors]);

  useEffect(() => {
    if (stockQuery.trim().length > 0 && filteredStocks.length > 0) {
      setSelectedTicker(filteredStocks[0].ticker);
    }
  }, [filteredStocks, stockQuery]);

  const macroGroups = ["All", "Growth", "Liquidity", "Inflation", "Property", "Rates", "External"];
  const visibleMacro = useMemo(() => filterMacroSeries(macroSeries, {
    group: activeGroup,
    query: macroQuery,
    macroLabels: t.macro,
    groupLabels: t.groups,
  }), [activeGroup, macroQuery, macroSeries, t.groups, t.macro]);
  const macroSource = macroSnapshot?.source ?? "mock";
  const activeProvider = realtimeQuote?.provider ?? realtimeMeta?.quote?.provider;
  const marketStatusLabel = {
    before_open: lang === "zh" ? "盘前" : "before open",
    pre_market: lang === "zh" ? "集合竞价" : "pre-market",
    open: lang === "zh" ? "交易中" : "open",
    lunch_break: lang === "zh" ? "午休" : "lunch",
    after_close: lang === "zh" ? "收盘后" : "after close",
    weekend: lang === "zh" ? "周末" : "weekend",
  }[realtimeMeta?.market_status] ?? (realtimeMeta?.market_open ? (lang === "zh" ? "交易中" : "open") : (lang === "zh" ? "休市" : "closed"));

  const stockSource = realtimeState === "live"
    ? `${activeProvider ?? "realtime"} · realtime${realtimeQuote?.market_time ? ` · ${realtimeQuote.market_time}` : ""}`
    : realtimeState === "cached"
      ? `${activeProvider ?? "cache"} · ${marketStatusLabel}${realtimeQuote?.market_date ? ` · ${realtimeQuote.market_date}` : ""}`
      : realtimeState === "stale"
        ? `${activeProvider ?? "cache"} · ${lang === "zh" ? "缓存重试中" : "cache retry"}`
        : (stockQuery.trim() && searchSnapshot?.source) || stockSnapshot?.source || "mock";

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

  return (
    <main className="terminal">
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
          <section className="panel factor-panel nav-target" ref={screenerRef}>
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
          </section>

          <section className="panel table-panel">
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
                    onClick={() => setShowProviderDiag((value) => !value)}
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
            {showProviderDiag && providerDiag.length > 0 && (
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
          </section>

          <section className="panel detail-panel nav-target" ref={chartRef}>
            <div className="panel-title compact">
              <div>
                <small>{t.selectedEquity}</small>
                <h2>{selectedStock.ticker} · {selectedStock.name}</h2>
              </div>
              <div className="detail-title-actions">
                <button type="button" className="ghost" onClick={() => requestAnalysis(false)}>
                  <Sparkles size={14} /> {t.ai.analysis}
                </button>
                <Target size={18} />
              </div>
            </div>
            <div className="price-line">
              <strong>{selectedStock.currency}{selectedStock.price.toFixed(2)}</strong>
              <span className={selectedStock.chg > 0 ? "up" : "down"}>{selectedStock.chg > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{selectedStock.chg}%</span>
            </div>
            <div className="chart-toolbar">
              {["1M", "3M", "12M", "3Y"].map((item) => (
                <button className={timeframe === item ? "selected" : ""} onClick={() => setTimeframe(item)} key={item}>{item}</button>
              ))}
              <button>{t.macro[indicator] ?? (indicator === "Composite" ? t.composite : indicator)} <ChevronDown size={14} /></button>
            </div>
            <div className="price-chart">
              {spark.map((value, index) => (
                <i key={index} style={{ height: `${value}%`, transform: `translateY(${index % 2 === 0 ? 8 : -2}px)` }} />
              ))}
            </div>
            <div className="metric-grid">
              <span>{lang === "zh" ? "因子评分" : "Factor score"} <b>{selectedStock.score}</b></span>
              <span>Beta <b>{selectedStock.beta}</b></span>
              <span>{t.factors.liquidity} <b>{selectedStock.liquidity}</b></span>
              <span>{t.factors.momentum} <b>{selectedStock.trend}</b></span>
            </div>
            <AiAnalysisPanel
              t={t}
              ticker={selectedStock.ticker}
              status={aiAnalysis.status}
              result={aiAnalysis.result}
              error={aiAnalysis.error}
              needsPassword={showAnalysisPassword || aiAnalysis.needsPassword}
              onAnalyze={() => requestAnalysis(false)}
              onRefresh={() => requestAnalysis(true)}
              onSubmitPassword={(password) => {
                setAnalysisPassword(password);
                setShowAnalysisPassword(false);
                if (pendingAnalysisForce === null) setPendingAnalysisForce(false);
              }}
              onOpenSettings={() => setShowAiSettings(true)}
            />
          </section>

          <section className="panel macro-panel nav-target" ref={macroRef}>
            <div className="panel-title">
              <div>
                <small>{t.macroModel}</small>
                <h2>{t.macroDashboard}</h2>
              </div>
              <button className="ghost"><Filter size={15} /> {t.modelInputs}</button>
            </div>
            <div className="macro-score-grid">
              <ScoreGauge label={t.scores.growth[0]} value={growthScore} caption={t.scores.growth[1]} />
              <ScoreGauge label={t.scores.liquidity[0]} value={liquidityScore} caption={t.scores.liquidity[1]} />
              <ScoreGauge label={t.scores.inflation[0]} value={inflationScore} caption={t.scores.inflation[1]} />
              <ScoreGauge label={t.scores.external[0]} value={externalScore} caption={t.scores.external[1]} />
            </div>
            <div className="regime-row">
              <div className="cycle-map">
                <span className="axis-x">{t.axes.growth}</span>
                <span className="axis-y">{t.axes.inflation}</span>
                <button className="cycle-dot" style={{ left: `${growthScore}%`, bottom: `${inflationScore}%` }}>{t.cycles[cycle]}</button>
                <small className="q1">{t.cycles.Recovery}</small>
                <small className="q2">{t.cycles.Overheat}</small>
                <small className="q3">{t.cycles.Slowdown}</small>
                <small className="q4">{t.cycles.Stagflation}</small>
              </div>
              <div className="macro-trend">
                <div>
                  <small>{t.compositeScore}</small>
                  <strong>{Math.round((growthScore + liquidityScore + (100 - inflationScore)) / 3)}</strong>
                </div>
                <MiniBars values={macroTrend} tone="green" />
                <p>{t.currentRead}</p>
              </div>
            </div>
          </section>

          <section className="panel macro-table nav-target" ref={dataRef}>
            <div className="panel-title compact">
              <div>
                <small>{t.macroSeries}</small>
                <h2>{t.macroMap}</h2>
              </div>
              <div className="macro-table-tools">
                <label className="macro-search">
                  <Search size={15} />
                  <input
                    value={macroQuery}
                    onChange={(event) => setMacroQuery(event.target.value)}
                    placeholder={t.macroSearch}
                    aria-label={t.macroSearch}
                  />
                </label>
                <div className="segmented scroll">
                  {macroGroups.map((group) => (
                    <button className={activeGroup === group ? "selected" : ""} onClick={() => setActiveGroup(group)} key={group}>{t.groups[group]}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="macro-list">
              {visibleMacro.length === 0 && (
                <p className="macro-empty" aria-live="polite">{t.noMacroMatches}</p>
              )}
              {visibleMacro.map((item) => (
                <button className="macro-row" onClick={() => setIndicator(item.key)} key={item.key}>
                  <span>
                    <strong>{t.macro[item.key]}</strong>
                    <small>{item.api}</small>
                  </span>
                  <b>{item.value}{item.unit}</b>
                  <em>{item.score ?? zScore(item.z, item.direction)}</em>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
      <AiSettingsDialog
        open={showAiSettings}
        onClose={() => setShowAiSettings(false)}
        onSaved={() => setShowAiSettings(false)}
        t={t}
      />
    </main>
  );
}
