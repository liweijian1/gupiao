import test from "node:test";
import assert from "node:assert/strict";

import { buildHistoricalChartModel } from "./historicalChart.js";

const BARS = [
  { date: "2026-07-21", open: 10, high: 12, low: 9, close: 11, volume: 100, amount: 1100 },
  { date: "2026-07-22", open: 11, high: 13, low: 10, close: 12, volume: 200, amount: 2400 },
];

test("builds a close-price line from valid historical bars", () => {
  const model = buildHistoricalChartModel({ bars: BARS, mode: "line", metric: "volume", width: 720, height: 280 });

  assert.equal(model.mode, "line");
  assert.equal(model.points.length, 2);
  assert.match(model.polyline, /^24,/);
  assert.equal(model.points.at(-1).value, 12);
});

test("builds column values from the selected volume or amount metric", () => {
  const volume = buildHistoricalChartModel({ bars: BARS, mode: "bar", metric: "volume", width: 720, height: 280 });
  const amount = buildHistoricalChartModel({ bars: BARS, mode: "bar", metric: "amount", width: 720, height: 280 });

  assert.deepEqual(volume.columns.map((column) => column.value), [100, 200]);
  assert.deepEqual(amount.columns.map((column) => column.value), [1100, 2400]);
  assert.ok(amount.columns.at(-1).height > amount.columns[0].height);
});

test("builds OHLC candles and a lower volume panel from real bars", () => {
  const model = buildHistoricalChartModel({ bars: BARS, mode: "candle", metric: "volume", width: 720, height: 280 });

  assert.equal(model.mode, "candle");
  assert.deepEqual(model.candles.map((candle) => ({ open: candle.open, high: candle.high, low: candle.low, close: candle.close })), BARS.map(({ open, high, low, close }) => ({ open, high, low, close })));
  assert.equal(model.volumeColumns.length, BARS.length);
  assert.ok(model.candles[0].highY < model.candles[0].lowY);
});

test("drops invalid bars instead of inventing a series", () => {
  const model = buildHistoricalChartModel({
    bars: [...BARS, { date: "bad", open: 0, high: 0, low: 0, close: 0, volume: 0, amount: 0 }],
    mode: "line",
    metric: "volume",
    width: 720,
    height: 280,
  });

  assert.equal(model.points.length, BARS.length);
});
