import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUITY_MARKETS,
  EQUITY_SCOPES,
  applyRealtimeQuote,
  filterAndSortEquities,
  filterEquitiesByMarket,
  marketForExchange,
  mergeEquityUniverses,
  orderWatchlistEquities,
  resolveSelectedEquity,
} from "./equityDiscovery.js";

const factors = {
  momentum: 68,
  quality: 52,
  valuation: 35,
  liquidity: 70,
  volatility: 45,
};

const equities = [
  { ticker: "NVDA", name: "NVIDIA", aliases: ["英伟达"], exchange: "NASDAQ", sector: "Semis", price: 178, score: 92, growth: 31, trend: 88, pe: 38, liquidity: 96, beta: 1.5 },
  { ticker: "600519", name: "Kweichow Moutai", aliases: ["贵州茅台"], exchange: "SSE", sector: "Consumer", price: 1468, score: 83, growth: 15, trend: 73, pe: 23, liquidity: 88, beta: 0.6 },
  { ticker: "0700.HK", name: "Tencent", aliases: ["腾讯控股"], exchange: "HKEX", sector: "Internet", price: 418, score: 25, growth: 5, trend: 20, pe: 19, liquidity: 40, beta: 1.1 },
];

test("classifies supported exchanges into stable market scopes", () => {
  assert.deepEqual(EQUITY_MARKETS, ["CN", "HK", "US"]);
  assert.deepEqual(EQUITY_SCOPES, ["CN", "HK", "US", "WATCHLIST"]);
  assert.equal(marketForExchange("SSE"), "CN");
  assert.equal(marketForExchange("szse"), "CN");
  assert.equal(marketForExchange("BSE"), "CN");
  assert.equal(marketForExchange("HKEX"), "HK");
  assert.equal(marketForExchange("NASDAQ"), "US");
  assert.equal(marketForExchange("NYSE"), "US");
  assert.equal(marketForExchange("unknown"), null);
});

test("orders a watchlist by its saved ticker sequence without factor filtering", () => {
  const ordered = orderWatchlistEquities(equities, ["0700.hk", "600519", "missing", "0700.HK"]);
  assert.deepEqual(ordered.map((item) => item.ticker), ["0700.HK", "600519"]);
  assert.deepEqual(equities.map((item) => item.ticker), ["NVDA", "600519", "0700.HK"]);
});

test("filters a copy of the equity list by market", () => {
  assert.deepEqual(filterEquitiesByMarket(equities, "All"), equities);
  assert.deepEqual(filterEquitiesByMarket(equities, "CN"), [equities[1]]);
  assert.deepEqual(filterEquitiesByMarket(equities, "HK"), [equities[2]]);
  assert.deepEqual(filterEquitiesByMarket(equities, "US"), [equities[0]]);
  assert.notEqual(filterEquitiesByMarket(equities, "All"), equities);
});

test("merges universes by ticker while letting later detail replace snapshots", () => {
  const newerNvda = { ...equities[0], price: 999 };
  assert.deepEqual(
    mergeEquityUniverses([equities[0], equities[1]], [newerNvda, equities[2]]),
    [newerNvda, equities[1], equities[2]],
  );
});

test("overlays a realtime quote and its essential market metadata only on the matching equity", () => {
  const result = applyRealtimeQuote(equities, {
    ticker: "600519",
    price: 1500,
    chg: 1.2,
    high: 1512,
    low: 1488,
    volume: 123456,
    source: "eastmoney",
  });
  assert.equal(result[0], equities[0]);
  assert.deepEqual(result[1], {
    ...equities[1],
    price: 1500,
    chg: 1.2,
    high: 1512,
    low: 1488,
    volume: 123456,
    source: "eastmoney",
  });
  const detailUniverse = mergeEquityUniverses(equities, result);
  assert.equal(resolveSelectedEquity(detailUniverse, "600519", equities[0]).price, 1500);
  assert.equal(equities[1].price, 1468);
});

test("resolves the selected equity and falls back without clearing the universe", () => {
  assert.equal(resolveSelectedEquity(equities, "600519", equities[0]), equities[1]);
  assert.equal(resolveSelectedEquity([], "missing", equities[0]), equities[0]);
  assert.equal(resolveSelectedEquity(equities, "missing", equities[0]), equities[0]);
});

test("empty query applies the existing factor gate and sort order", () => {
  const input = structuredClone(equities);
  const result = filterAndSortEquities(input, {
    query: "",
    factors,
    sortKey: "score",
    sectorLabels: { Semis: "半导体", Consumer: "消费", Internet: "互联网" },
  });
  assert.deepEqual(result.map((item) => item.ticker), ["NVDA", "600519"]);
  assert.deepEqual(input, equities);
});

test("text query matches aliases and localized sectors while bypassing factors", () => {
  assert.deepEqual(
    filterAndSortEquities(equities, {
      query: "腾讯",
      factors,
      sortKey: "score",
      sectorLabels: { Internet: "互联网" },
    }).map((item) => item.ticker),
    ["0700.HK"],
  );
  assert.deepEqual(
    filterAndSortEquities(equities, {
      query: "半导体",
      factors,
      sortKey: "score",
      sectorLabels: { Semis: "半导体" },
    }).map((item) => item.ticker),
    ["NVDA"],
  );
});

test("sorts numeric discovery fields descending without mutating input order", () => {
  const originalOrder = equities.map((item) => item.ticker);
  const result = filterAndSortEquities(equities, {
    query: "a",
    factors,
    sortKey: "growth",
    sectorLabels: {},
  });
  assert.deepEqual(result.map((item) => item.ticker), ["NVDA", "600519"]);
  assert.deepEqual(equities.map((item) => item.ticker), originalOrder);
});
