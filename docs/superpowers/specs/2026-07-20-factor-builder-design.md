# Factor Builder Design

## Goal

Make the existing factor filters usable without changing the stock-search or macro-search state model.

## Interaction

- The `因子构建器` toolbar button expands an editor inside the left equity-discovery panel.
- The editor contains five labeled range controls: momentum, quality, valuation, liquidity, and volatility.
- Opening the editor copies the currently applied factors into a local draft.
- Chips update only the draft. They do not update the ranked list until the user selects `应用筛选`.
- `应用筛选` commits the draft through `onFactorsChange`, refreshes the ranked list, and closes the editor.
- A visible `取消` action discards the draft and closes the editor without changing the active list.

## State boundaries

- `App` continues to own the applied `factors` state used by `filterAndSortEquities`.
- `EquityDiscoveryPanel` owns only `isFactorBuilderOpen` and `draftFactors`.
- The global equity search still bypasses factor gating when text is present, as it does today.
- Macro search state is unaffected.

## Layout and accessibility

- The editor appears between the ranking toolbar and the status/list content, preserving the left-panel workflow.
- Each slider has an associated label, current numeric value, and an accessible name.
- The toolbar button exposes `aria-expanded`; cancel and apply are keyboard-accessible buttons.

## Validation

- Opening does not mutate applied factors.
- Draft changes do not mutate applied factors.
- Applying commits the draft and affects filtering.
- Cancelling leaves applied factors unchanged.
- Existing preset chips remain available, but operate on draft state.
