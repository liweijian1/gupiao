import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = (name) => new URL(`../components/${name}`, import.meta.url);
const stylesUrl = new URL("../styles.css", import.meta.url);

test("renders the selected decision-cockpit anatomy instead of card-based placeholders", async () => {
  const [shell, discovery, workspace, ai, macro] = await Promise.all([
    readFile(component("AppShell.jsx"), "utf8"),
    readFile(component("EquityDiscoveryPanel.jsx"), "utf8"),
    readFile(component("StockDecisionWorkspace.jsx"), "utf8"),
    readFile(component("AiResearchPanel.jsx"), "utf8"),
    readFile(component("MacroEvidenceBand.jsx"), "utf8"),
  ]);

  assert.match(shell, /decision-command-bar/);
  assert.match(shell, /"总览", "股票", "宏观", "图表", "报告"/);
  assert.match(discovery, /ranked-equity-table/);
  assert.match(workspace, /candlestick-chart/);
  assert.match(workspace, /factor-strip/);
  assert.match(ai, /ai-decision-summary/);
  assert.match(ai, /ai-insight-block/);
  assert.match(macro, /macro-regime-summary/);
});

test("uses the reference typography and controls for macro, market tabs, and icon rail", async () => {
  const styles = await readFile(stylesUrl, "utf8");

  assert.match(styles, /\.ranking-tabs button\s*\{[^}]*background:\s*transparent[^}]*color:\s*#90a0aa/);
  assert.match(styles, /\.ranking-tabs button\.selected\s*\{[^}]*color:\s*var\(--cockpit-teal\)/);
  assert.match(styles, /\.macro-evidence-band\s*\{[^}]*font-size:\s*12px/);
  assert.match(styles, /\.decision-rail nav button\s*\{[^}]*font-size:\s*11px/);
  assert.match(styles, /\.decision-rail nav button\s*\{[^}]*justify-items:\s*center/);
  assert.match(styles, /\.decision-rail nav button span\s*\{[^}]*width:\s*100%[^}]*text-align:\s*center/);
  assert.match(styles, /\.macro-evidence-overview\s*\{[^}]*grid-template-rows:\s*auto auto 72px minmax\(148px,\s*1fr\)/);
  assert.match(styles, /\.macro-data-map\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);
});
