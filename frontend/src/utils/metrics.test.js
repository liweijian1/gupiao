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
