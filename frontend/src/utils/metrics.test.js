import test from "node:test";
import assert from "node:assert/strict";

import { filterMacroSeries } from "./metrics.js";

const items = [
  { key: "PMI", group: "Growth", api: "macro_china_pmi()", value: 50.4, score: 58, source: "akshare" },
  { key: "M1", group: "Liquidity", api: "macro_china_supply_of_money()", value: 5.8, score: 47, source: "akshare" },
  { key: "M2", group: "Liquidity", api: "macro_china_supply_of_money()", value: 7.0, score: 52, source: "akshare" },
];

const options = {
  group: "All",
  query: "",
  macroLabels: { PMI: "采购经理指数", M1: "M1", M2: "M2" },
  groupLabels: { Growth: "增长", Liquidity: "流动性" },
};

test("empty macro query returns every row in the selected group", () => {
  assert.deepEqual(filterMacroSeries(items, options), items);
  assert.deepEqual(
    filterMacroSeries(items, { ...options, group: "Liquidity" }),
    items.slice(1),
  );
});

test("stock-specific text does not create false macro matches", () => {
  assert.deepEqual(filterMacroSeries(items, { ...options, query: "600519" }), []);
});

test("macro text matches localized labels and keys", () => {
  assert.deepEqual(filterMacroSeries(items, { ...options, query: "采购经理" }), [items[0]]);
  assert.deepEqual(filterMacroSeries(items, { ...options, query: "pmi" }), [items[0]]);
});

test("group and macro text filters combine", () => {
  assert.deepEqual(
    filterMacroSeries(items, { ...options, group: "Liquidity", query: "m2" }),
    [items[2]],
  );
});

test("macro filtering searches zero values, source, and API without mutating input", () => {
  const extended = [
    ...items,
    { key: "Zero", group: "External", api: "zero_api()", value: 0, score: 0, source: "fallback-cache" },
  ];
  const before = structuredClone(extended);
  const extendedOptions = {
    ...options,
    macroLabels: { ...options.macroLabels, Zero: "零值指标" },
    groupLabels: { ...options.groupLabels, External: "外部" },
  };
  assert.deepEqual(filterMacroSeries(extended, { ...extendedOptions, query: "zero_api" }), [extended[3]]);
  assert.deepEqual(filterMacroSeries(extended, { ...extendedOptions, query: "fallback-cache" }), [extended[3]]);
  assert.deepEqual(filterMacroSeries(extended, { ...extendedOptions, group: "External", query: "0" }), [extended[3]]);
  assert.deepEqual(extended, before);
});
