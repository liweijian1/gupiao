import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("watchlist realtime hook polls eligible A-share symbols without clearing prior quotes", async () => {
  const source = await readFile(new URL("./useWatchlistRealtime.js", import.meta.url), "utf8");

  assert.match(source, /\/api\/stocks\/realtime/);
  assert.match(source, /15000/);
  assert.match(source, /AbortController/);
  assert.match(source, /applyRealtimeQuotes/);
  assert.match(source, /setQuotes\(\(previous\)/);
  assert.match(source, /SSE/, "A-share exchanges must be eligible");
  assert.match(source, /SZSE/, "A-share exchanges must be eligible");
});
