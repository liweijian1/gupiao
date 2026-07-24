import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const source = (relativePath) => fs.readFileSync(path.join(directory, "..", relativePath), "utf8");

test("composes authenticated watchlist controls without blocking anonymous research", () => {
  const app = source("App.jsx");
  const shell = source("components/AppShell.jsx");
  const workspace = source("components/StockDecisionWorkspace.jsx");
  const discovery = source("components/EquityDiscoveryPanel.jsx");

  assert.match(app, /useAuth/);
  assert.match(app, /useWatchlist/);
  assert.match(app, /AuthDialog/);
  assert.match(app, /watchlist\.stocks/);
  assert.match(shell, /authUser/);
  assert.match(workspace, /isWatchlisted/);
  assert.match(discovery, /WATCHLIST/);
});

test("loads saved stock records from the watchlist details endpoint", () => {
  const api = source("api/watchlist.js");
  const hook = source("hooks/useWatchlist.js");
  const app = source("App.jsx");
  const discovery = source("components/EquityDiscoveryPanel.jsx");

  assert.match(api, /getWatchlistStocks/);
  assert.match(hook, /refreshStocks/);
  assert.match(hook, /authStatus === "authenticated"\) refreshStocks\(\)/);
  assert.match(app, /watchlist\.stocks/);
  assert.match(discovery, /onRefreshWatchlistStocks/);
  assert.match(discovery, /watchlistDetailsStatus/);
});
