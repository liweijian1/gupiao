import { searchableText } from "./metrics.js";

export const EQUITY_MARKETS = Object.freeze(["CN", "HK", "US"]);
export const EQUITY_SCOPES = Object.freeze([...EQUITY_MARKETS, "WATCHLIST"]);

const EXCHANGE_MARKETS = Object.freeze({
  SSE: "CN",
  SZSE: "CN",
  BSE: "CN",
  "A-SHARE": "CN",
  HKEX: "HK",
  NASDAQ: "US",
  NYSE: "US",
  AMEX: "US",
});

export function marketForExchange(exchange) {
  return EXCHANGE_MARKETS[String(exchange ?? "").trim().toUpperCase()] ?? null;
}

export function filterEquitiesByMarket(items, market = "All") {
  const equities = Array.isArray(items) ? items : [];
  if (market === "All") return [...equities];
  return equities.filter((item) => marketForExchange(item.exchange) === market);
}

export function orderWatchlistEquities(items, tickers) {
  const byTicker = new Map(
    (Array.isArray(items) ? items : []).map((item) => [String(item.ticker ?? "").toUpperCase(), item]),
  );
  const seen = new Set();
  return (Array.isArray(tickers) ? tickers : []).flatMap((ticker) => {
    const normalizedTicker = String(ticker ?? "").toUpperCase();
    if (seen.has(normalizedTicker)) return [];
    seen.add(normalizedTicker);
    const equity = byTicker.get(normalizedTicker);
    return equity ? [equity] : [];
  });
}

export function mergeEquityUniverses(...universes) {
  const byTicker = new Map();
  universes.flatMap((items) => (Array.isArray(items) ? items : [])).forEach((item) => {
    if (item?.ticker) byTicker.set(item.ticker, item);
  });
  return [...byTicker.values()];
}

export function applyRealtimeQuote(items, quote) {
  const equities = Array.isArray(items) ? items : [];
  if (!quote?.ticker) return [...equities];
  return equities.map((item) => (
    item.ticker === quote.ticker
      ? { ...item, ...quote, ticker: item.ticker, name: quote.name ?? item.name }
      : item
  ));
}

export function applyRealtimeQuotes(items, quotes) {
  return (Array.isArray(quotes) ? quotes : []).reduce(
    (equities, quote) => applyRealtimeQuote(equities, quote),
    Array.isArray(items) ? items : [],
  );
}

export function resolveSelectedEquity(items, ticker, fallback) {
  const equities = Array.isArray(items) ? items : [];
  return equities.find((item) => item.ticker === ticker) ?? equities[0] ?? fallback;
}

export function filterAndSortEquities(
  items,
  { query = "", factors, sortKey = "score", sectorLabels = {} },
) {
  const normalizedQuery = query.trim().toLowerCase();
  const activeFactors = factors ?? {
    momentum: 0,
    quality: 0,
    valuation: 0,
    liquidity: 0,
    volatility: 0,
  };

  return (Array.isArray(items) ? items : [])
    .filter((stock) => {
      const matchesQuery = normalizedQuery.length === 0 || searchableText(
        stock.ticker,
        stock.name,
        stock.aliases?.join(" "),
        stock.exchange,
        stock.sector,
        sectorLabels[stock.sector],
        stock.price,
        stock.score,
        stock.growth,
        stock.rsi,
      ).includes(normalizedQuery);
      const factorGate =
        stock.trend >= activeFactors.momentum - 25 &&
        stock.score >= activeFactors.quality - 10 &&
        stock.pe <= 65 - activeFactors.valuation * 0.35 &&
        stock.liquidity >= activeFactors.liquidity - 20 &&
        stock.beta <= 2.2 - activeFactors.volatility * 0.012;
      return matchesQuery && (normalizedQuery.length > 0 || factorGate);
    })
    .sort((left, right) => Number(right[sortKey] ?? 0) - Number(left[sortKey] ?? 0));
}
