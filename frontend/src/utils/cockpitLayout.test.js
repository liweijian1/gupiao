import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stylesUrl = new URL("../styles.css", import.meta.url);
const discoveryPanelUrl = new URL("../components/EquityDiscoveryPanel.jsx", import.meta.url);

test("caps the desktop cockpit row and keeps discovery scrolling inside its panel", async () => {
  const styles = await readFile(stylesUrl, "utf8");

  assert.match(
    styles,
    /grid-template-rows:\s*clamp\(620px,\s*calc\(100vh - 112px\),\s*720px\)\s*minmax\(500px,\s*auto\)/,
  );
  assert.match(styles, /\.equity-discovery-panel\s*\{[^}]*height:\s*100%[^}]*overflow:\s*hidden/);
  assert.match(styles, /\.equity-discovery-panel \.discovery-ranking\s*\{[^}]*min-height:\s*0/);
  assert.match(styles, /\.equity-discovery-panel\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\) auto/);
  assert.match(styles, /\.ai-research-panel\s*\{[^}]*align-self:\s*start[^}]*min-height:\s*0/);
});

test("keeps quick factor controls outside the ranked equity scroll region", async () => {
  const component = await readFile(discoveryPanelUrl, "utf8");

  assert.match(component, /className="equity-list ranking-list"/);
  assert.match(component, /className="quick-filters"/);
});
