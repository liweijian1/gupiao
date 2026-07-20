# Factor Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the left-panel Factor Builder into a draft-and-apply editor that updates the equity ranking only when the user confirms the draft.

**Architecture:** Keep applied factors in `App.jsx`, where they already feed `filterAndSortEquities`. Add a small pure draft helper for immutable factor updates and keep `isFactorBuilderOpen` plus `draftFactors` inside `EquityDiscoveryPanel`. The component opens from the ranking toolbar, writes slider and preset changes only to the draft, and commits the copied draft through the existing `onFactorsChange` callback.

**Tech Stack:** React 19, JavaScript ES modules, Node built-in test runner, existing Vite CSS.

## Global Constraints

- The global top-bar equity search must continue to bypass factor gating for non-empty text queries.
- Macro-series search state and macro filtering must remain independent of factor builder state.
- The editor remains inside the equity-discovery panel; no modal, new dependency, or backend endpoint is added.
- Presets modify draft values only; `应用筛选` is the sole action that commits a new applied factor set.
- Use Chinese and English copy from `frontend/src/i18n/copy.js` for the new Cancel label.

---

### Task 1: Add immutable factor-draft helpers

**Files:**
- Create: `frontend/src/utils/factorBuilder.js`
- Create: `frontend/src/utils/factorBuilder.test.js`

**Interfaces:**
- Consumes: an applied factor object with `momentum`, `quality`, `valuation`, `liquidity`, and `volatility` numeric properties.
- Produces: `FACTOR_KEYS`, `copyFactorDraft(factors)`, and `setDraftFactor(draft, key, value)` for `EquityDiscoveryPanel`.

- [ ] **Step 1: Write failing unit tests for independent drafts and numeric updates**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { copyFactorDraft, setDraftFactor } from "./factorBuilder.js";

const applied = { momentum: 68, quality: 52, valuation: 35, liquidity: 70, volatility: 45 };

test("copies applied factors into an independent editor draft", () => {
  const draft = copyFactorDraft(applied);
  draft.momentum = 85;
  assert.equal(applied.momentum, 68);
  assert.equal(draft.momentum, 85);
});

test("updates one draft threshold without mutating its input", () => {
  const next = setDraftFactor(applied, "quality", "84");
  assert.deepEqual(next, { ...applied, quality: 84 });
  assert.equal(applied.quality, 52);
});
```

- [ ] **Step 2: Run the new test and verify it fails because the helper module is absent**

Run: `node --test src/utils/factorBuilder.test.js`

Expected: `ERR_MODULE_NOT_FOUND` for `factorBuilder.js`.

- [ ] **Step 3: Implement the minimal helper module**

```js
export const FACTOR_KEYS = Object.freeze([
  "momentum", "quality", "valuation", "liquidity", "volatility",
]);

export function copyFactorDraft(factors = {}) {
  return Object.fromEntries(FACTOR_KEYS.map((key) => [key, Number(factors[key] ?? 0)]));
}

export function setDraftFactor(draft, key, value) {
  if (!FACTOR_KEYS.includes(key)) return copyFactorDraft(draft);
  return { ...copyFactorDraft(draft), [key]: Number(value) };
}
```

- [ ] **Step 4: Run the helper test and verify it passes**

Run: `node --test src/utils/factorBuilder.test.js`

Expected: 2 passing tests, 0 failures.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add frontend/src/utils/factorBuilder.js frontend/src/utils/factorBuilder.test.js
git commit -m "feat: add factor builder draft helpers"
```

### Task 2: Implement the draft-and-apply editor in the discovery panel

**Files:**
- Modify: `frontend/src/components/EquityDiscoveryPanel.jsx:1-29`
- Modify: `frontend/src/i18n/copy.js:1-335`
- Modify: `frontend/src/utils/decisionCockpitReference.test.js:27-38`

**Interfaces:**
- Consumes: `factors` and `onFactorsChange(nextFactors)` props from `App.jsx`, plus the helpers from Task 1.
- Produces: an accessible in-panel editor with a toolbar trigger, five range inputs, draft-only presets, Cancel, and Apply actions.

- [ ] **Step 1: Write a failing source-level regression test for the editor contract**

Add these assertions to the existing cockpit reference test after loading `EquityDiscoveryPanel.jsx`:

```js
assert.match(discovery, /const \[isFactorBuilderOpen, setFactorBuilderOpen\] = useState\(false\)/);
assert.match(discovery, /const \[draftFactors, setDraftFactors\] = useState\(\(\) => copyFactorDraft\(factors\)\)/);
assert.match(discovery, /aria-expanded=\{isFactorBuilderOpen\}/);
assert.match(discovery, /onFactorsChange\(copyFactorDraft\(draftFactors\)\)/);
assert.match(discovery, /setFactorBuilderOpen\(false\)/);
```

- [ ] **Step 2: Run the reference test and verify it fails on the absent editor state**

Run: `node --test src/utils/decisionCockpitReference.test.js`

Expected: the factor-builder assertion fails while the existing cockpit assertions remain valid.

- [ ] **Step 3: Add localized Cancel copy**

Add `cancel: "Cancel"` to the English root copy object and `cancel: "取消"` to the Chinese root copy object, adjacent to `apply`.

- [ ] **Step 4: Add local editor state and deterministic handlers**

At the top of `EquityDiscoveryPanel.jsx`, import the Task 1 helpers. After `activeMarket`, define:

```js
const [isFactorBuilderOpen, setFactorBuilderOpen] = useState(false);
const [draftFactors, setDraftFactors] = useState(() => copyFactorDraft(factors));
const openFactorBuilder = () => {
  setDraftFactors(copyFactorDraft(factors));
  setFactorBuilderOpen(true);
};
const cancelFactorBuilder = () => setFactorBuilderOpen(false);
const applyFactorBuilder = () => {
  onFactorsChange(copyFactorDraft(draftFactors));
  setFactorBuilderOpen(false);
};
```

Use `setDraftFactors((draft) => setDraftFactor(draft, key, value))` for slider edits. Use `setDraftFactors(copyFactorDraft(preset))` for presets.

- [ ] **Step 5: Replace the inert toolbar button and quick-filter actions**

Use this toolbar trigger:

```jsx
<button type="button" className="ghost factor-builder-trigger" onClick={openFactorBuilder} aria-expanded={isFactorBuilderOpen} aria-controls="factor-builder-editor">
  <Filter size={15} /> {t.factorBuilder}
</button>
```

Render the editor immediately after the toolbar only when `isFactorBuilderOpen` is true:

```jsx
{isFactorBuilderOpen && <section className="factor-builder-editor" id="factor-builder-editor" aria-label={t.factorBuilder}>
  {FACTOR_KEYS.map((key) => <label className="factor-builder-row" key={key}>
    <span>{t.factors[key]}</span><b>{draftFactors[key]}</b>
    <input type="range" min="0" max="100" value={draftFactors[key]} onChange={(event) => setDraftFactors((draft) => setDraftFactor(draft, key, event.target.value))} aria-label={t.factors[key]} />
  </label>)}
  <div className="factor-builder-presets">{FACTOR_PRESETS.map((preset, index) => <button type="button" key={t.chips[index]} onClick={() => setDraftFactors(copyFactorDraft(preset))}>{t.chips[index]}</button>)}</div>
  <div className="factor-builder-actions"><button type="button" className="ghost" onClick={cancelFactorBuilder}>{t.cancel}</button><button type="button" className="primary" onClick={applyFactorBuilder}>{t.apply}</button></div>
</section>}
```

Replace the old quick-filter area with a compact applied-state summary only; it must not expose preset buttons that bypass Apply:

```jsx
<div className="quick-filters"><small>{t.factorFilters}</small><span>{FACTOR_KEYS.map((key) => `${t.factors[key]} ${factors[key]}`).join(" · ")}</span></div>
```

- [ ] **Step 6: Run the component-reference regression test and verify it passes**

Run: `node --test src/utils/decisionCockpitReference.test.js`

Expected: 2 passing tests, including the editor-state contract.

- [ ] **Step 7: Commit the component, copy, and regression test**

```bash
git add frontend/src/components/EquityDiscoveryPanel.jsx frontend/src/i18n/copy.js frontend/src/utils/decisionCockpitReference.test.js
git commit -m "feat: add draft factor builder controls"
```

### Task 3: Style the in-panel editor at terminal density

**Files:**
- Modify: `frontend/src/styles.css:1300-1315`
- Modify: `frontend/src/utils/decisionCockpitReference.test.js:27-38`

**Interfaces:**
- Consumes: `factor-builder-editor`, `factor-builder-row`, `factor-builder-presets`, and `factor-builder-actions` DOM classes from Task 2.
- Produces: a compact, keyboard-accessible editor that stays inside the left panel and leaves the ranked-list region scrollable.

- [ ] **Step 1: Write a failing CSS contract assertion**

Append these assertions to the reference test:

```js
assert.match(styles, /\.factor-builder-editor\s*\{[^}]*display:\s*grid[^}]*border-top:/);
assert.match(styles, /\.factor-builder-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
assert.match(styles, /\.factor-builder-actions\s*\{[^}]*grid-template-columns:\s*1fr 1fr/);
```

- [ ] **Step 2: Run the reference test and verify it fails on missing factor-builder styles**

Run: `node --test src/utils/decisionCockpitReference.test.js`

Expected: CSS assertion failure for `.factor-builder-editor`.

- [ ] **Step 3: Add the compact editor styles**

Append these scoped rules after the existing `.quick-filters` cockpit rules:

```css
.factor-builder-editor { display:grid; gap:8px; padding:10px 12px 12px; border-top:1px solid var(--cockpit-line); border-bottom:1px solid var(--cockpit-line); background:#0d151b; }
.factor-builder-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 8px; align-items:center; color:#aebac1; font-size:11px; }
.factor-builder-row b { color:var(--cockpit-teal); font-variant-numeric:tabular-nums; }
.factor-builder-row input { grid-column:1/-1; width:100%; accent-color:var(--cockpit-teal); }
.factor-builder-presets { display:flex; flex-wrap:wrap; gap:5px; }
.factor-builder-presets button { border:1px solid #2d3942; border-radius:4px; background:#111a21; color:#b5c0c7; padding:4px 7px; font-size:11px; }
.factor-builder-actions { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
.factor-builder-actions button { min-height:30px; }
.quick-filters { display:grid; gap:5px; }
.quick-filters span { color:#82909a; font-size:10px; line-height:1.35; }
```

- [ ] **Step 4: Run the reference test and verify it passes**

Run: `node --test src/utils/decisionCockpitReference.test.js`

Expected: 2 passing tests, including all factor-builder CSS contracts.

- [ ] **Step 5: Commit the styles and CSS regression test**

```bash
git add frontend/src/styles.css frontend/src/utils/decisionCockpitReference.test.js
git commit -m "style: add compact factor builder editor"
```

### Task 4: Verify the committed factor workflow end to end

**Files:**
- Verify: `frontend/src/utils/factorBuilder.test.js`
- Verify: `frontend/src/utils/equityDiscovery.test.js`
- Verify: `frontend/src/utils/decisionCockpitReference.test.js`
- Verify: `frontend/src/components/EquityDiscoveryPanel.jsx`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: evidence that a draft remains local until Apply and that the production bundle compiles.

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm test`

Expected: 0 failures, including factor-draft immutability, factor gating, and cockpit editor contract tests.

- [ ] **Step 2: Build a production artifact for the isolated server prefix**

Run: `VITE_DEPLOY_BASE=/stock-macro/ VITE_API_BASE_URL=/stock-macro npm run build`

Expected: exit code 0 and `frontend/dist/index.html` contains `/stock-macro/assets/` URLs.

- [ ] **Step 3: Manually verify the draft boundary in the local preview**

Open `http://127.0.0.1:5175/`, click `因子构建器`, move one slider, and confirm the ranking count does not change. Click `取消` and confirm the applied summary is unchanged. Reopen, move the slider, click `应用筛选`, and confirm the summary and ranking update.

- [ ] **Step 4: Commit any verification-only corrections if needed**

If no correction is needed, no commit is created. If a correction is needed, stage only the changed factor-builder files and use:

```bash
git commit -m "fix: preserve factor builder apply boundary"
```
