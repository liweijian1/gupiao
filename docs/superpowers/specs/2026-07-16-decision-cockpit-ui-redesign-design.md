# Decision Cockpit UI Redesign

**Status:** Approved

**Date:** 2026-07-16

**Selected visual:** [Decision Cockpit mock](assets/2026-07-16-decision-cockpit-ui.png)

## Summary

Redesign the existing stock-and-macro dashboard as a decision cockpit whose primary workflow is:

1. discover and select an equity;
2. understand price action and factor context;
3. generate or read the AI research conclusion;
4. validate the conclusion against macro conditions.

The implementation must retain all existing product capabilities and data behavior. This is an information-hierarchy and component-anatomy redesign, not a new product or data model.

## Goals

- Make the selected-stock decision workflow understandable from the first screen.
- Give the price chart and AI conclusion clear visual priority.
- Keep macro data visible as evidence without competing with the stock decision task.
- Preserve the terminal's compact, professional, data-dense character.
- Keep equity search and macro-series search completely independent.
- Preserve live/cached/degraded data status, bilingual UI, AI settings, report export, and AI PDF export.
- Provide defined desktop, medium-width, and mobile layouts without removing core capabilities.

## Non-goals

- No backend, API, scoring, AI prompt, authentication, or deployment change.
- No new routes or separate pages.
- No target-price generation, news ingestion, or portfolio-management feature.
- No new charting or visualization library unless the implementation plan proves the existing chart cannot satisfy the approved visual.
- No unrelated refactor outside files directly needed by the redesign.

## Approved Visual Direction

The selected mock is the source of truth for layout hierarchy, density, spacing, color, typography, visible content, and component anatomy. When the mock and this document appear to conflict, preserve the product constraints and state rules in this document, then match the mock as closely as possible within those constraints.

### Visual language

- Base surfaces: graphite black and charcoal, building on the existing `#07090d` and `#0d1015` family.
- Dividers: thin, low-contrast lines in the existing `#252a31` / `#262d33` family.
- Primary positive and interactive accent: restrained mint/teal, based on `#3fe1c0`.
- Macro emphasis: lime, based on `#d6f35b`, used sparingly.
- Negative and risk states: muted red, based on `#ff7d87`.
- Text: high-contrast cool white for primary content and muted blue-gray for secondary labels.
- Typography: retain the existing Inter/system sans stack. Body text is at least 14px; key numeric values use tabular alignment where possible.
- Surfaces and dividers establish grouping before borders or shadows. Avoid cards inside cards, decorative gradients, glassmorphism, neon effects, heavy shadows, and excessive pill controls.
- Use the existing Lucide icon set. Do not create approximate custom icons.

## Information Architecture

### Application shell

- Use a 72px desktop icon rail with the existing primary destinations.
- Use a slim top command bar for equity search, market/data-source status, language, AI settings, alerts, and report export.
- The top search remains equity-only and is labeled “搜索股票、公司或代码” in Chinese.
- The main desktop work area uses three upper zones and one lower evidence band.

### Left: equity discovery

Target width: 280px on wide desktop.

Responsibilities:

- A-share / Hong Kong / US market switching where data is available.
- Stock ranking and selected-row state.
- Compact factor filtering and saved factor presets.
- Provider and refresh status that remains visible but secondary.

The panel selects an equity; it never filters macro-series data.

### Center: selected-stock decision workspace

Use the largest flexible width, with a practical minimum around 560px on wide desktop.

Responsibilities:

- Stock identity, exchange, real-time price, change, and essential market metadata.
- One dominant price chart with timeframe and comparison-indicator controls.
- Key factor scores and concise valuation/liquidity context.
- Clear visual continuity when the selected equity changes.

The chart is the primary visual object. Secondary metrics must not reduce it to a small card.

### Right: AI research assistant

Target width: 340px on wide desktop.

Responsibilities:

- Recommendation, confidence/score, and suggested position.
- Concise research thesis.
- Opportunities, risks, and watch metrics.
- Primary “AI 分析” action.
- Secondary “导出 PDF” action, available only when a valid analysis is visible.
- Inline settings access and analysis state.

The panel remains structurally stable across empty, loading, cached, success, refresh, and failure states.

### Bottom: macro-validation evidence band

Responsibilities:

- Economic climate, liquidity, inflation, and external-pressure scores.
- Cycle-regime visualization and current macro conclusion.
- Macro Data Map with its own search and group filters.
- A compact view of the relevant macro series and their direction.

The macro search appears only inside this band and is labeled “搜索宏观指标”. It combines only with the macro group filter.

## Component Boundaries

The implementation should decompose the current large application component into focused UI units while preserving existing hooks and domain logic:

- `AppShell`: rail, command bar, workspace regions, and global language/settings actions.
- `EquityDiscoveryPanel`: equity search results, factor filters, presets, ranking, and source status.
- `StockDecisionWorkspace`: identity, quote, timeframe, chart, comparison indicator, and factor summary.
- `AiResearchPanel`: access state, cached analysis, refresh, result sections, PDF export, and failures.
- `MacroEvidenceBand`: score overview, cycle view, macro conclusion, and composition of the data map.
- `MacroDataMap`: independent macro query, group filter, empty state, and macro-series rows.

Each unit owns presentation state that only it needs. Shared state is limited to values that genuinely coordinate regions.

## State Ownership And Data Flow

### Equity domain

- `stockQuery` belongs to the equity discovery flow.
- Equity search and factor filters determine the displayed equity universe.
- `selectedTicker` is the equity domain's shared primary state.
- Changing `selectedTicker` updates the central quote/chart and the right AI panel.
- Timeframe and chart comparison controls remain local to the stock decision workspace.
- A stock query with no matches shows an equity-specific empty state and does not clear macro state.

### AI domain

- AI analysis is keyed by selected ticker and language and continues to use the existing password/cache behavior.
- Refresh keeps the last valid analysis visible while progress is shown.
- Unauthorized state clears only the in-memory analysis access flag.
- Failure is recoverable in place and does not clear the last valid analysis.
- PDF export appears only for a valid visible analysis, disables while generating, and reports sanitized failures without clearing the analysis.

### Macro domain

- `macroQuery` and `activeGroup` belong only to the Macro Data Map.
- Group and query filters combine with each other and do not consume `stockQuery`.
- A macro query with no matches shows a macro-specific empty state and does not change the selected stock or AI result.
- Clicking a macro-series row may update the chart's comparison indicator. This is the only intended macro-to-stock visual linkage and must not change equity selection or equity-search state.

## Loading, Error, And Data-source States

- Preserve the last valid stock, macro, and AI content during refresh whenever possible.
- Show loading, failure, retry, and degraded-source messages inside the affected region.
- Avoid a blocking global modal or toast for persistent data errors.
- Distinguish real-time, cached, stale, mock, and degraded data with text plus color or icon; color alone is insufficient.
- Empty states remain scoped to the domain that produced them.
- Layout dimensions should remain stable as panels transition between states.

## Responsive Behavior

Retain the existing 1180px and 760px breakpoint model.

### Wide desktop: 1181px and above

- 72px icon rail.
- 280px equity discovery panel.
- Flexible stock decision workspace.
- 340px AI research assistant.
- Macro evidence band spans the full content width below the three upper zones.
- Target reference viewport: 1440×1024.

### Medium: 761–1180px

- 74px icon rail with labels hidden.
- Two-column upper workspace: 240px equity discovery plus a flexible stock decision column.
- AI research content moves below the chart and uses a two-column internal arrangement when space permits.
- Macro evidence and Macro Data Map span the full content width below.
- Market status may scroll horizontally rather than compress unreadably.

### Mobile: 760px and below

- Navigation becomes the existing sticky horizontal top rail.
- Use one task-ordered column: equity search, selected-stock identity, chart, AI conclusion, collapsible equity ranking/factors, macro scores/conclusion, then Macro Data Map.
- Macro search remains inside the Macro Data Map; it never moves into the top equity-search position.
- Primary controls have a minimum 44px touch target.
- AI and export actions become full-width where needed.
- Lists and market strips may scroll within their own containers; the page must not have horizontal overflow.

## Accessibility

- Navigation, equity rows, filters, chart timeframes, AI actions, and export actions are keyboard reachable.
- Focus-visible treatment is high contrast and not removed.
- Interactive table rows must expose button-like keyboard behavior or use actual interactive controls.
- Use `aria-live` for scoped loading, empty, success, and failure messages where appropriate.
- Do not communicate change, recommendation, or provider state with color alone.
- Respect reduced-motion preference for smooth scrolling, loading animation, and chart transitions.
- Keep body text at least 14px and essential status text readable at supported widths.

## Acceptance Criteria

### Visual

- The coded result is compared against the selected visual at 1440×1024.
- No visible clipping, unintended overflow, broken borders, nested-card clutter, or inconsistent radii.
- The chart and AI result clearly outrank factor and macro supporting content.
- The UI remains coherent at 1180×900, 760×900, and 390×844.

### Behavior

- Equity and macro search remain independent in all states and breakpoints.
- Equity selection updates quote/chart and AI context without modifying macro filters.
- Macro filtering combines query and group without modifying equity state.
- Macro-row selection changes only the intended chart reference indicator.
- AI loading, cached refresh, unauthorized, failure, retry, and success states remain recoverable.
- PDF export visibility, busy state, sanitized failure, and successful download remain correct.
- Chinese/English switching preserves the selected ticker, macro filter, and current view.
- Existing report export, AI settings, provider diagnostics, and data-source fallbacks remain available.

### Verification

- Run existing unit tests and add focused tests for any extracted state or responsive behavior that can be tested without layout snapshots.
- Verify the four reference viewport sizes in the in-app browser.
- Compare the selected visual and coded desktop screenshot side by side, fix visible mismatches, and repeat the comparison.
- Confirm no new console errors or accessibility regressions in the primary workflow.

## Rollout

- Implement the redesign in small component-level steps while keeping the application runnable.
- Preserve existing hooks and API boundaries unless a UI extraction requires a narrow, tested interface adjustment.
- Do not deploy until the selected desktop visual and all responsive acceptance states pass verification.
