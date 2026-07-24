import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("history chart keeps provider details out of unavailable and retry states", async () => {
  const source = await readFile(new URL("./HistoricalStockChart.jsx", import.meta.url), "utf8");

  assert.match(source, /state === "unavailable"/);
  assert.match(source, /历史数据源暂时不可用/);
  assert.match(source, /历史图表加载失败/);
  assert.doesNotMatch(source, /\{error\}/);
});
