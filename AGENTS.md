# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Product Decisions

- Stock search and macro-series search must use independent state. The global top-bar search is for equities only; macro-series text filtering belongs inside the Macro Data Map panel and combines only with the macro group filter.
- The approved dashboard redesign is the “Decision Cockpit” direction. Its desktop hierarchy is: equity discovery on the left, selected-stock decision workspace in the center, persistent AI research assistant on the right, and a macro-validation evidence band across the bottom.
- The selected visual source of truth is `docs/superpowers/specs/assets/2026-07-16-decision-cockpit-ui.png`. Preserve its compact financial-terminal density, dark graphite surfaces, restrained teal/lime accents, thin dividers, aligned numeric typography, and stock-first/macro-validation hierarchy during implementation.
- Responsive behavior keeps the existing 1180px and 760px breakpoints. Medium layouts become a two-column research workspace; mobile becomes a single task-ordered column without removing stock search, AI analysis, macro search, or export functions.
- The approved visual source of truth supersedes the earlier Cockpit screenshot: `codex-clipboard-24bbfb42-e3ac-48fd-8f7b-802156e6ce89.png`. Match its narrow icon rail, compact ranking table, K-line-centered stock workspace, fully populated AI research rail, and dense bottom macro evidence strip rather than the prior card-based composition.
