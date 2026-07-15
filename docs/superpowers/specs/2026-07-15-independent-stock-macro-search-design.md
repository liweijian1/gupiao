# Independent Stock and Macro Search Design

**Date:** 2026-07-15

## Goal

Prevent equity searches from hiding rows in the Macro Data Map while preserving dedicated text filtering for both domains.

## Current Problem

`App.jsx` stores the top-bar query in one `query` state. That state drives the stock search API, stock-table filtering, selected-stock behavior, and `visibleMacro`. A stock-specific term such as `600519` therefore produces zero macro matches. The macro panel renders no empty state, so valid API data appears to be missing.

## Approved Interaction

- The top-bar search remains the equity search. It filters the equity universe and continues to drive `useStockSearch`.
- The Macro Data Map panel receives a compact, dedicated search input in its header.
- Macro text search combines with the existing macro group selection. For example, selecting `Liquidity` and entering `M2` returns only M2 within Liquidity.
- Clearing the equity search does not change the macro search, and clearing the macro search does not change the selected equity or equity results.
- When no macro series matches, the macro list shows a localized empty-state message rather than a blank panel.

## State and Data Flow

`App` owns two explicit state values:

- `stockQuery`: consumed by `useStockSearch`, stock filtering, and stock-selection synchronization.
- `macroQuery`: consumed only by the macro-series filter.

The macro filter receives `macroSeries`, `activeGroup`, `macroQuery`, and localized labels. It does not read `stockQuery` or stock-search state.

To make the regression behavior independently testable, macro filtering is implemented as a small pure helper in `frontend/src/utils/metrics.js`. The helper returns all group-matching rows when `macroQuery` is empty and text-matching rows when it is populated.

## UI Details

The macro search input sits in the Macro Data Map header alongside the existing group control. It uses the existing terminal visual language and a localized placeholder. This is a localized component addition, not a broader visual redesign.

The empty state uses the same subdued panel treatment as the stock-table empty state and spans the macro list width.

## Localization

Add Chinese and English copy for:

- Macro-search placeholder.
- No matching macro-series message.

## Testing

Add a Node built-in test suite for the pure macro filter and a `test` package script. Required regression cases:

1. An empty macro query returns all rows in the selected group.
2. A stock-specific string such as `600519` returns zero macro rows without affecting the separate equity-query value.
3. A macro term such as `PMI` returns the matching macro row.
4. Group and macro text filters combine correctly.

Run the focused test first and observe it fail before adding the helper. After implementation, run the full test command and production build.

## Deployment

Build the frontend with `VITE_API_BASE_URL=/stock-macro` and Vite base `/stock-macro/`. Deploy only the new frontend assets to the existing release, leaving the isolated FastAPI, systemd, and Nginx topology unchanged. Verify both the new public route and the original site's routes after deployment.

## Out of Scope

- Changing backend search APIs.
- Redesigning the overall header or navigation.
- Adding persisted search history or URL query parameters.
- Refactoring unrelated portions of the 506-line `App.jsx`.
