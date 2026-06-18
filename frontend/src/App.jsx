import { useEffect, useMemo, useState } from "react";
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
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const stocks = [
  { ticker: "NVDA", name: "NVIDIA", aliases: ["英伟达"], exchange: "NASDAQ", currency: "$", sector: "Semis", price: 178.42, chg: 2.8, score: 92, pe: 38.6, growth: 31.2, rsi: 63, beta: 1.7, trend: 88, liquidity: 96 },
  { ticker: "MSFT", name: "Microsoft", aliases: ["微软"], exchange: "NASDAQ", currency: "$", sector: "Software", price: 503.71, chg: 0.9, score: 88, pe: 34.1, growth: 14.5, rsi: 58, beta: 0.9, trend: 81, liquidity: 93 },
  { ticker: "AVGO", name: "Broadcom", aliases: ["博通"], exchange: "NASDAQ", currency: "$", sector: "Semis", price: 291.33, chg: 1.5, score: 86, pe: 32.8, growth: 18.9, rsi: 61, beta: 1.3, trend: 84, liquidity: 89 },
  { ticker: "AAPL", name: "Apple", aliases: ["苹果"], exchange: "NASDAQ", currency: "$", sector: "Hardware", price: 214.15, chg: -0.4, score: 74, pe: 29.3, growth: 4.1, rsi: 47, beta: 1.1, trend: 58, liquidity: 95 },
  { ticker: "JPM", name: "JPMorgan", aliases: ["摩根大通"], exchange: "NYSE", currency: "$", sector: "Banks", price: 266.22, chg: 0.3, score: 71, pe: 13.2, growth: 6.8, rsi: 52, beta: 1.0, trend: 62, liquidity: 87 },
  { ticker: "XOM", name: "Exxon Mobil", aliases: ["埃克森美孚"], exchange: "NYSE", currency: "$", sector: "Energy", price: 109.84, chg: -1.1, score: 62, pe: 15.4, growth: -1.7, rsi: 41, beta: 0.8, trend: 39, liquidity: 78 },
  { ticker: "COST", name: "Costco", aliases: ["开市客"], exchange: "NASDAQ", currency: "$", sector: "Retail", price: 983.44, chg: 0.6, score: 79, pe: 52.7, growth: 8.2, rsi: 55, beta: 0.7, trend: 67, liquidity: 75 },
  { ticker: "AMD", name: "AMD", aliases: ["超威半导体"], exchange: "NASDAQ", currency: "$", sector: "Semis", price: 126.91, chg: -2.2, score: 69, pe: 41.4, growth: 12.4, rsi: 38, beta: 1.9, trend: 44, liquidity: 91 },
  { ticker: "600519", name: "Kweichow Moutai", aliases: ["贵州茅台", "茅台", "600519.SH"], exchange: "SSE", currency: "¥", sector: "Consumer", price: 1468.6, chg: 0.7, score: 83, pe: 23.4, growth: 15.1, rsi: 56, beta: 0.6, trend: 73, liquidity: 88 },
  { ticker: "300750", name: "CATL", aliases: ["宁德时代", "300750.SZ"], exchange: "SZSE", currency: "¥", sector: "NewEnergy", price: 258.2, chg: 1.8, score: 87, pe: 24.9, growth: 21.7, rsi: 62, beta: 1.4, trend: 79, liquidity: 91 },
  { ticker: "002594", name: "BYD", aliases: ["比亚迪", "002594.SZ"], exchange: "SZSE", currency: "¥", sector: "Auto", price: 312.5, chg: 1.2, score: 84, pe: 28.1, growth: 18.4, rsi: 59, beta: 1.2, trend: 77, liquidity: 89 },
  { ticker: "600036", name: "China Merchants Bank", aliases: ["招商银行", "招行", "600036.SH"], exchange: "SSE", currency: "¥", sector: "Banks", price: 41.2, chg: -0.3, score: 72, pe: 7.3, growth: 3.2, rsi: 49, beta: 0.8, trend: 57, liquidity: 92 },
  { ticker: "601318", name: "Ping An Insurance", aliases: ["中国平安", "平安", "601318.SH"], exchange: "SSE", currency: "¥", sector: "Insurance", price: 52.8, chg: 0.5, score: 70, pe: 8.6, growth: 4.9, rsi: 51, beta: 0.9, trend: 61, liquidity: 90 },
  { ticker: "000858", name: "Wuliangye", aliases: ["五粮液", "000858.SZ"], exchange: "SZSE", currency: "¥", sector: "Consumer", price: 128.4, chg: -0.8, score: 68, pe: 18.9, growth: 6.1, rsi: 44, beta: 0.7, trend: 48, liquidity: 84 },
  { ticker: "600276", name: "Hengrui Medicine", aliases: ["恒瑞医药", "600276.SH"], exchange: "SSE", currency: "¥", sector: "Healthcare", price: 47.6, chg: 2.1, score: 76, pe: 39.5, growth: 12.7, rsi: 64, beta: 1.0, trend: 69, liquidity: 82 },
  { ticker: "0700.HK", name: "Tencent", aliases: ["腾讯控股", "腾讯", "00700", "700.HK"], exchange: "HKEX", currency: "HK$", sector: "Internet", price: 418.0, chg: 0.4, score: 82, pe: 19.7, growth: 10.5, rsi: 54, beta: 1.1, trend: 71, liquidity: 94 },
  { ticker: "9988.HK", name: "Alibaba", aliases: ["阿里巴巴", "阿里", "BABA"], exchange: "HKEX", currency: "HK$", sector: "Internet", price: 89.7, chg: -0.6, score: 73, pe: 13.8, growth: 5.8, rsi: 46, beta: 1.2, trend: 55, liquidity: 93 },
];

const macroInputs = [
  { key: "PMI", group: "Growth", api: "macro_china_pmi()", value: 50.4, unit: "", direction: 1, z: 0.42, weight: 0.35 },
  { key: "M1", group: "Liquidity", api: "macro_china_supply_of_money()", value: 5.8, unit: "%", direction: 1, z: -0.18, weight: 0.2 },
  { key: "M2", group: "Liquidity", api: "macro_china_supply_of_money()", value: 7.0, unit: "%", direction: 1, z: 0.12, weight: 0.25 },
  { key: "Social Financing", group: "Liquidity", api: "macro_china_shrzgm()", value: 2.28, unit: "T CNY", direction: 1, z: 0.36, weight: 0.25 },
  { key: "New Loans", group: "Liquidity", api: "macro_rmb_loan()", value: 0.95, unit: "T CNY", direction: 1, z: 0.08, weight: 0.15 },
  { key: "CPI", group: "Inflation", api: "macro_china_cpi()", value: 0.3, unit: "%", direction: 1, z: -0.34, weight: 0.55 },
  { key: "PPI", group: "Inflation", api: "macro_china_ppi()", value: -1.4, unit: "%", direction: 1, z: -0.61, weight: 0.45 },
  { key: "Fixed Asset Inv.", group: "Growth", api: "macro_china_gdzctz()", value: 3.7, unit: "%", direction: 1, z: 0.18, weight: 0.25 },
  { key: "Home Sales Area", group: "Property", api: "macro_china_nbs_nation()", value: -19.1, unit: "%", direction: 1, z: -0.82, weight: 0.2 },
  { key: "Unemployment", group: "Growth", api: "macro_china_urban_unemployment()", value: 5.0, unit: "%", direction: -1, z: 0.2, weight: 0.2 },
  { key: "FX Reserves", group: "External", api: "macro_china_fx_reserves_yearly()", value: 3.23, unit: "T USD", direction: 1, z: 0.09, weight: 0.45 },
  { key: "CN 10Y Yield", group: "Rates", api: "bond_china_yield()", value: 1.72, unit: "%", direction: -1, z: -0.38, weight: 0.15 },
  { key: "USD/CNY", group: "External", api: "currency_history()", value: 7.18, unit: "", direction: -1, z: 0.28, weight: 0.55 },
];

const factorDefaults = {
  momentum: 68,
  quality: 52,
  valuation: 35,
  liquidity: 70,
  volatility: 45,
};

const spark = [38, 44, 41, 52, 48, 61, 58, 66, 72, 69, 78, 84];
const macroTrend = [48, 50, 52, 55, 53, 56, 58, 61, 60, 64, 66, 68];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

const copy = {
  en: {
    lab: "CN Macro Lab",
    nav: ["Screener", "Macro", "Charts", "Reports", "AkShare"],
    pipeline: "Data pipeline",
    cache: "AkShare cache",
    refresh: "Daily refresh · 13 series",
    sync: "Sync",
    search: "Search ticker, sector, factor, macro series",
    export: "Export report",
    factorBuilder: "Factor builder",
    quantScreen: "Quant screen",
    chips: ["AI leaders", "Low beta", "Revision up", "High cash", "CN macro sensitive"],
    backtest: "Backtest preview",
    alpha: "12M alpha",
    matches: "matches",
    ranked: "Ranked equities",
    selectedEquity: "Selected equity",
    macroModel: "AkShare macro model",
    macroDashboard: "China regime dashboard",
    modelInputs: "Model inputs",
    macroSeries: "13 AkShare series",
    macroMap: "Macro data map",
    composite: "Composite",
    compositeScore: "Composite macro score",
    currentRead: "Current read: liquidity is improving while inflation pressure remains muted. Growth is stabilizing, but property remains the drag.",
    axes: { growth: "Growth", inflation: "Inflation" },
    table: ["Ticker", "Sector", "Price", "Chg", "Score", "P/E", "Growth", "RSI", "Trend"],
    scores: {
      growth: ["Economic climate", "PMI, FAI, property, unemployment"],
      liquidity: ["Liquidity", "M1, M2, TSF, loans, CN10Y"],
      inflation: ["Inflation", "CPI and PPI pressure"],
      external: ["External pressure", "USD/CNY and FX reserves"],
    },
    factors: { momentum: "momentum", quality: "quality", valuation: "valuation", liquidity: "liquidity", volatility: "volatility" },
    sort: { score: "score", growth: "growth", trend: "trend" },
    sectors: { Semis: "Semis", Software: "Software", Hardware: "Hardware", Banks: "Banks", Energy: "Energy", Retail: "Retail", Consumer: "Consumer", NewEnergy: "New Energy", Auto: "Auto", Insurance: "Insurance", Healthcare: "Healthcare", Internet: "Internet", Property: "Property" },
    groups: { All: "All", Growth: "Growth", Liquidity: "Liquidity", Inflation: "Inflation", Property: "Property", Rates: "Rates", External: "External" },
    macro: {
      PMI: "PMI",
      M1: "M1",
      M2: "M2",
      "Social Financing": "Social Financing",
      "New Loans": "New Loans",
      CPI: "CPI",
      PPI: "PPI",
      "Fixed Asset Inv.": "Fixed Asset Inv.",
      "Home Sales Area": "Home Sales Area",
      Unemployment: "Unemployment",
      "FX Reserves": "FX Reserves",
      "CN 10Y Yield": "CN 10Y Yield",
      "USD/CNY": "USD/CNY",
    },
    cycles: { Recovery: "Recovery", Overheat: "Overheat", Slowdown: "Slowdown", Stagflation: "Stagflation" },
  },
  zh: {
    lab: "中国宏观实验室",
    nav: ["筛选器", "宏观", "图表", "报告", "AkShare"],
    pipeline: "数据管道",
    cache: "AkShare 缓存",
    refresh: "每日刷新 · 13 组指标",
    sync: "同步",
    search: "搜索股票、行业、因子或宏观指标",
    export: "导出报告",
    factorBuilder: "因子构建器",
    quantScreen: "量化筛选",
    chips: ["AI 龙头", "低波动", "盈利上修", "高现金流", "中国宏观敏感"],
    backtest: "回测预览",
    alpha: "12个月超额",
    matches: "个结果",
    ranked: "股票排名",
    selectedEquity: "选中股票",
    macroModel: "AkShare 宏观模型",
    macroDashboard: "中国周期驾驶舱",
    modelInputs: "模型输入",
    macroSeries: "13 组 AkShare 指标",
    macroMap: "宏观数据映射",
    composite: "综合指标",
    compositeScore: "宏观综合评分",
    currentRead: "当前判断：流动性正在改善，通胀压力仍然温和。增长企稳，但房地产仍是主要拖累项。",
    axes: { growth: "增长", inflation: "通胀" },
    table: ["代码", "行业", "价格", "涨跌", "评分", "市盈率", "增长", "RSI", "趋势"],
    scores: {
      growth: ["经济景气度", "PMI、固投、地产、失业率"],
      liquidity: ["流动性", "M1、M2、社融、贷款、10年国债"],
      inflation: ["通胀水平", "CPI 与 PPI 压力"],
      external: ["外部压力", "USD/CNY 与外汇储备"],
    },
    factors: { momentum: "动量", quality: "质量", valuation: "估值", liquidity: "流动性", volatility: "波动率" },
    sort: { score: "评分", growth: "增长", trend: "趋势" },
    sectors: { Semis: "半导体", Software: "软件", Hardware: "硬件", Banks: "银行", Energy: "能源", Retail: "零售", Consumer: "消费", NewEnergy: "新能源", Auto: "汽车", Insurance: "保险", Healthcare: "医药", Internet: "互联网", Property: "地产" },
    groups: { All: "全部", Growth: "增长", Liquidity: "流动性", Inflation: "通胀", Property: "地产", Rates: "利率", External: "外部" },
    macro: {
      PMI: "PMI",
      M1: "M1",
      M2: "M2",
      "Social Financing": "社会融资规模",
      "New Loans": "新增贷款",
      CPI: "CPI",
      PPI: "PPI",
      "Fixed Asset Inv.": "固定资产投资",
      "Home Sales Area": "房地产销售面积",
      Unemployment: "失业率",
      "FX Reserves": "外汇储备",
      "CN 10Y Yield": "10年期国债收益率",
      "USD/CNY": "USD/CNY 汇率",
    },
    cycles: { Recovery: "复苏", Overheat: "过热", Slowdown: "放缓", Stagflation: "滞胀" },
  },
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function zScore(z, direction = 1) {
  return clamp(Math.round(50 + z * direction * 18));
}

function weightedScore(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  return Math.round(items.reduce((sum, item) => sum + zScore(item.z, item.direction) * item.weight, 0) / total);
}

function searchableText(...values) {
  return values
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

function MiniBars({ values, tone = "cyan" }) {
  return (
    <div className={`mini-bars ${tone}`}>
      {values.map((value, index) => (
        <span key={index} style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}

function ScoreGauge({ label, value, caption }) {
  return (
    <section className="score-gauge">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="gauge-track">
        <span style={{ width: `${value}%` }} />
      </div>
      <p>{caption}</p>
    </section>
  );
}

export function App() {
  const [lang, setLang] = useState("zh");
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("NVDA");
  const [activeGroup, setActiveGroup] = useState("All");
  const [timeframe, setTimeframe] = useState("12M");
  const [indicator, setIndicator] = useState("Composite");
  const [factors, setFactors] = useState(factorDefaults);
  const [sortKey, setSortKey] = useState("score");
  const [macroSnapshot, setMacroSnapshot] = useState(null);
  const [stockSnapshot, setStockSnapshot] = useState(null);
  const t = copy[lang];

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/api/macro/snapshot`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Macro API returned ${response.status}`);
        }
        return response.json();
      })
      .then((snapshot) => {
        if (mounted) {
          setMacroSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (mounted) {
          setMacroSnapshot(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/api/stocks/snapshot`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Stock API returned ${response.status}`);
        }
        return response.json();
      })
      .then((snapshot) => {
        if (mounted) {
          setStockSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (mounted) {
          setStockSnapshot(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stockUniverse = useMemo(() => {
    if (stockSnapshot?.stocks?.length) {
      return stockSnapshot.stocks;
    }
    return stocks;
  }, [stockSnapshot]);

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

  const selectedStock = stockUniverse.find((stock) => stock.ticker === selectedTicker) ?? stockUniverse[0] ?? stocks[0];
  const growthScore = macroSnapshot?.scores?.economic_climate ?? weightedScore(macroSeries.filter((item) => item.group === "Growth" || item.group === "Property"));
  const liquidityScore = macroSnapshot?.scores?.liquidity ?? weightedScore(macroSeries.filter((item) => item.group === "Liquidity" || item.group === "Rates"));
  const inflationScore = macroSnapshot?.scores?.inflation ?? weightedScore(macroSeries.filter((item) => item.group === "Inflation"));
  const externalScore = macroSnapshot?.scores?.external_pressure ?? weightedScore(macroSeries.filter((item) => item.group === "External"));
  const cycle = macroSnapshot?.scores?.cycle ?? (growthScore > 58 && inflationScore < 55 ? "Recovery" : growthScore > 60 && inflationScore >= 55 ? "Overheat" : growthScore < 48 && inflationScore > 55 ? "Stagflation" : "Slowdown");

  const filteredStocks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return stockUniverse
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
  }, [query, factors, sortKey, stockUniverse, t.sectors]);

  useEffect(() => {
    if (query.trim().length > 0 && filteredStocks.length > 0) {
      setSelectedTicker(filteredStocks[0].ticker);
    }
  }, [filteredStocks, query]);

  const macroGroups = ["All", "Growth", "Liquidity", "Inflation", "Property", "Rates", "External"];
  const visibleMacro = macroSeries.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesGroup = activeGroup === "All" || item.group === activeGroup;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      searchableText(
        item.key,
        t.macro[item.key],
        item.group,
        t.groups[item.group],
        item.api,
        item.value,
        item.score,
        item.source,
      ).includes(normalizedQuery);
    return matchesGroup && matchesQuery;
  });
  const macroSource = macroSnapshot?.source ?? "mock";
  const stockSource = stockSnapshot?.source ?? "mock";

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
          <button className="active"><BarChart3 size={17} /> <span>{t.nav[0]}</span></button>
          <button><Activity size={17} /> <span>{t.nav[1]}</span></button>
          <button><LineChart size={17} /> <span>{t.nav[2]}</span></button>
          <button><BookOpenCheck size={17} /> <span>{t.nav[3]}</span></button>
          <button><Database size={17} /> <span>{t.nav[4]}</span></button>
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </div>
          <div className="market-strip">
            <span>CSI 300 <b className="up">+0.42%</b></span>
            <span>HSI <b className="down">-0.18%</b></span>
            <span>CN10Y <b>1.72%</b></span>
            <span>USD/CNY <b>7.18</b></span>
          </div>
          <div className="segmented language-toggle" aria-label="Language selector">
            <Settings2 size={14} />
            <button className={lang === "zh" ? "selected" : ""} onClick={() => setLang("zh")}>中</button>
            <button className={lang === "en" ? "selected" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
          <button className="icon-button" aria-label="Alerts"><Bell size={18} /></button>
          <button className="primary"><Download size={16} /> {t.export}</button>
        </header>

        <div className="content-grid">
          <section className="panel factor-panel">
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
              </div>
              <div className="segmented">
                {["score", "growth", "trend"].map((key) => (
                  <button className={sortKey === key ? "selected" : ""} onClick={() => setSortKey(key)} key={key}>{t.sort[key]}</button>
                ))}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  {t.table.map((head) => <th key={head}>{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredStocks.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan={9}>{lang === "zh" ? "没有找到匹配的股票" : "No matching equities"}</td>
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

          <section className="panel detail-panel">
            <div className="panel-title compact">
              <div>
                <small>{t.selectedEquity}</small>
                <h2>{selectedStock.ticker} · {selectedStock.name}</h2>
              </div>
              <Target size={18} />
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
          </section>

          <section className="panel macro-panel">
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

          <section className="panel macro-table">
            <div className="panel-title compact">
              <div>
                <small>{t.macroSeries}</small>
                <h2>{t.macroMap}</h2>
              </div>
              <div className="segmented scroll">
                {macroGroups.map((group) => (
                  <button className={activeGroup === group ? "selected" : ""} onClick={() => setActiveGroup(group)} key={group}>{t.groups[group]}</button>
                ))}
              </div>
            </div>
            <div className="macro-list">
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
    </main>
  );
}
