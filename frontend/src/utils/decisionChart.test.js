import test from "node:test";
import assert from "node:assert/strict";

import { selectDecisionChartSeries } from "./decisionChart.js";

const BASE_VALUES = [38, 44, 41, 52, 48, 61, 58, 66, 72, 69, 78, 84];
const INDICATORS = [
  { key: "PMI", points: [{ date: "2026-03-01", value: 49.4 }, { date: "2026-04-01", value: 50.1 }, { date: "2026-05-01", value: 50.4 }, { date: "2026-06-01", value: 50.7 }] },
  { key: "M2", points: [{ date: "2026-05-01", value: 6.8 }, { date: "2026-06-01", value: 7.0 }] },
];

test("selects windows only from existing prototype and macro values", () => {
  const baseBefore = [...BASE_VALUES];
  const indicatorsBefore = structuredClone(INDICATORS);
  const result = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "1M", indicator: "PMI", indicatorOptions: INDICATORS });
  assert.deepEqual(result.stockContextValues, BASE_VALUES.slice(-4));
  assert.deepEqual(result.comparisonValues, [50.4, 50.7]);
  assert.deepEqual(BASE_VALUES, baseBefore);
  assert.deepEqual(INDICATORS, indicatorsBefore);
});

test("timeframes change the visible window without inventing values", () => {
  const oneMonth = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "1M", indicator: "PMI", indicatorOptions: INDICATORS });
  const threeYears = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "3Y", indicator: "PMI", indicatorOptions: INDICATORS });
  assert.deepEqual(oneMonth.stockContextValues, BASE_VALUES.slice(-4));
  assert.deepEqual(threeYears.stockContextValues, BASE_VALUES);
  assert.deepEqual(threeYears.comparisonValues, [49.4, 50.1, 50.4, 50.7]);
});

test("indicator selection uses actual dated points and Composite has no trace", () => {
  const pmi = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "12M", indicator: "PMI", indicatorOptions: INDICATORS });
  const m2 = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "12M", indicator: "M2", indicatorOptions: INDICATORS });
  const composite = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "12M", indicator: "Composite", indicatorOptions: INDICATORS });
  const fallback = selectDecisionChartSeries({ baseValues: BASE_VALUES, timeframe: "12M", indicator: "PMI", indicatorOptions: [{ key: "PMI", points: [{ date: "fallback", value: 50.4 }] }] });
  assert.deepEqual(pmi.comparisonValues, [49.4, 50.1, 50.4, 50.7]);
  assert.deepEqual(m2.comparisonValues, [6.8, 7.0]);
  assert.equal(composite.comparisonValues, null);
  assert.equal(fallback.comparisonValues, null);
});
