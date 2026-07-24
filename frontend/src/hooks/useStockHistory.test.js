import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("history hook targets the API with cancellable range and adjustment requests", async () => {
  const source = await readFile(new URL("./useStockHistory.js", import.meta.url), "utf8");

  assert.match(source, /\/api\/stocks\/history/);
  assert.match(source, /AbortController/);
  assert.match(source, /URLSearchParams/);
  assert.match(source, /range/);
  assert.match(source, /adjust/);
  assert.match(source, /unsupported/);
});
