# Macro Tools Vertical Layout Design

## Goal

Improve the Macro Data Map header at medium and desktop widths by preventing the search field and macro group selector from competing for the same horizontal row.

## Layout

- Keep the Macro Data Map title block on the left side of the panel header.
- Stack the right-side tools vertically.
- Place the macro search field on the first row.
- Place the macro group selector on the second row.
- Right-align both rows at desktop widths.
- Preserve the existing narrow-screen behavior, where the title block and tools become full-width and left-aligned.

## Scope

This is a CSS-only layout change. It does not change search state, filtering behavior, translations, data loading, or macro row rendering.

## Responsive Behavior

- Desktop and medium widths: title on the left, vertically stacked tools on the right.
- Narrow widths: title above tools; search and group selector remain full-width where existing responsive rules apply.
- The group selector may continue scrolling horizontally when its contents exceed the available width.

## Verification

- Confirm the search field appears above the group selector.
- Confirm the title remains on the left at desktop width.
- Confirm the group selector still scrolls horizontally when needed.
- Confirm the layout stays within the Macro Data Map panel at a narrow viewport.
- Run the existing frontend tests and production build.
