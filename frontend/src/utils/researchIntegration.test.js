import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("connects explicit factor actions to versioned research APIs without execution controls", async () => {
  const [api, hook, app, discovery, results] = await Promise.all([
    source("api/research.js"),
    source("hooks/useResearch.js"),
    source("App.jsx"),
    source("components/EquityDiscoveryPanel.jsx"),
    source("components/ResearchResultsPanel.jsx"),
  ]);

  assert.match(api, /\/api\/research\/ranking/);
  assert.match(api, /\/api\/research\/backtests/);
  assert.match(hook, /runRanking/);
  assert.match(hook, /runBacktest/);
  assert.match(app, /useResearch/);
  assert.match(discovery, /onRunResearch/);
  assert.match(results, /数据版本|Dataset version/);
  assert.doesNotMatch(results, /broker|order|buy|sell/i);
});
