# AI Analysis PDF Export Design

## Summary

Add a direct-download PDF export for the currently displayed AI stock analysis. The browser generates a structured, searchable PDF from trusted application state; no new backend endpoint is required. The export includes the current stock snapshot, the complete validated AI analysis, generation metadata, and an investment-risk disclaimer, while excluding all credentials and model reasoning.

## Goals

- Let the user download the displayed AI analysis as a PDF with one click.
- Preserve Chinese and English text as searchable text rather than a screenshot.
- Produce a readable multi-page report with automatic page breaks.
- Include enough stock context for the analysis to remain meaningful outside the application.
- Keep AI API keys, administrator passwords, analysis passwords, authorization headers, and model reasoning out of the PDF and export pipeline.
- Avoid increasing the initial application bundle with a large Chinese font payload.

## Non-Goals

- Exporting the entire dashboard, macro mapping table, or ranked stock list.
- Server-side PDF storage, history, sharing, emailing, or scheduled exports.
- Editing the report before download.
- Pixel-perfect reproduction of the dark application interface.
- Generating new AI content during export.

## User Experience

- When a valid AI analysis is displayed, an **Export PDF** button appears in the analysis metadata/action row beside **Regenerate**.
- Selecting the button starts PDF generation in the browser and downloads the completed file directly.
- While the document and font are loading, the button shows a busy state and cannot be selected again.
- The button is not rendered when there is no analysis result. It is also disabled while analysis is being refreshed or a PDF export is already running.
- Export does not trigger an AI request and always captures the analysis currently visible when the user starts the export.
- A generation failure leaves the current analysis untouched and shows a localized, non-secret error message in the panel.
- The filename is `股票代码-AI分析报告-YYYY-MM-DD.pdf` in Chinese and `ticker-ai-analysis-YYYY-MM-DD.pdf` in English. Invalid filename characters are replaced safely.

## Report Content

The report uses a light print-oriented layout independent of the application's dark theme.

Content order:

1. Report title and stock identity.
2. Report metadata: generation time, analysis generation time, data timestamp when available, model name, and cached/fresh status.
3. Current stock snapshot: ticker, name, exchange, sector, price, percentage change, factor score, P/E, growth, RSI, beta, trend, and liquidity. Missing values render as `--` rather than fabricated values.
4. AI conclusion: localized rating, suggested position range, and summary.
5. Opportunities.
6. Risks.
7. Watch indicators, with name, value, and reason.
8. The trusted localized investment-risk disclaimer displayed by the application.

The export does not include API configuration, API keys, either password, request headers, raw provider responses, hidden prompt text, or `<think>`/reasoning content.

## Architecture

### Data flow

`App` already owns both `selectedStock` and the normalized AI result. It passes the selected stock and an export callback into `AiAnalysisPanel`. The panel owns only the transient exporting/error UI state. When invoked, the callback creates an immutable export snapshot from:

- the current language and localized copy;
- the current selected stock;
- the current validated AI result and trusted response metadata.

The snapshot is converted into a pdfmake document definition, rendered in the browser, and downloaded. No credential state is accepted by the document builder.

### Export module

Create a focused frontend utility with three separable responsibilities:

1. `buildAiPdfDocument(...)` is a pure function that converts the export snapshot into a pdfmake document definition.
2. Filename and display-value helpers normalize missing values, percentages, currency, dates, and unsafe filename characters.
3. `downloadAiAnalysisPdf(...)` dynamically imports pdfmake, loads/registers the Chinese-capable font, creates the PDF, and starts the download.

Keeping the document builder pure allows unit tests to verify content, ordering, localization, and secret exclusion without parsing PDF bytes.

### PDF engine and font

- Use client-side pdfmake for structured text, tables, lists, headers/footers, and automatic pagination.
- Bundle an open-licensed Chinese-capable font asset with its license notice.
- Load pdfmake and the font only when export is requested, so the initial dashboard JavaScript and font download remain unchanged.
- Use the bundled font for all report text to guarantee mixed Chinese, Latin, number, and punctuation rendering.

The exact compatible pdfmake release and font file are pinned in the implementation plan after validating the current Vite toolchain. The implementation must not fetch the font from a third-party CDN at runtime.

## Visual Structure

- A restrained white-page report with dark body text and teal accents matching the product identity.
- A compact title block, followed by metadata and stock metrics in two-column/table structures.
- Rating is presented as text plus a color accent; color is never the only carrier of meaning.
- Opportunities, risks, and watch indicators use explicit section headings and lists/tables.
- A footer shows the ticker and page number.
- The disclaimer is visually separated at the end and may continue naturally across pages.
- Layout must remain legible on A4 pages without clipped rows or orphaned section headings.

## Localization and Accessibility

- Button label, loading/error text, section names, rating labels, metadata labels, filename, and disclaimer follow the active UI language.
- Dates use the active locale with 24-hour time.
- PDF text remains selectable and searchable.
- Rating and gains/losses include written labels/signs and do not rely on color alone.
- The export button has an accessible name and exposes its busy state.

## Error Handling

- Dynamic import failure, font loading failure, PDF creation failure, and download failure map to one localized export error in the AI panel.
- Errors are caught at the UI boundary; they do not remove the analysis or change AI request state.
- The browser console must not receive secret-bearing objects. The export utility receives only the explicit safe snapshot.
- A repeated click during generation is ignored through disabled/busy state.

## Testing

### Unit tests

- The document definition contains the selected stock identity, stock metrics, full analysis summary, every opportunity, every risk, every watch indicator, timestamps, model metadata, and disclaimer.
- Chinese and English labels/filenames follow the active language.
- Missing values render as `--` and numeric zero remains `0`.
- Unsafe filename characters are removed.
- The document definition does not contain representative API keys, passwords, authorization fields, raw prompts, or reasoning fields even if unrelated input objects contain them.
- The export action is unavailable without an analysis, disables during export, and reports a failed export without clearing analysis content.

### Build and manual verification

- Frontend unit tests and production build pass.
- Export a Chinese report and verify glyph rendering, searchable text, section ordering, automatic multi-page layout, footer page numbers, and filename.
- Export an English report and verify localization and filename.
- Verify the initial page load does not request the PDF engine or font asset.
- Inspect the resulting PDF and browser network activity to confirm no API key or password is included or transmitted.

## Dependencies and Deployment

- Add the pinned pdfmake frontend dependency.
- Add the selected font file and its license to version control under a dedicated frontend asset directory.
- The production build emits the PDF engine and font as lazy assets under the existing `/stock-macro/` base path.
- Deployment uses the existing static frontend release process and requires no Nginx or backend service-route changes.

## Acceptance Criteria

- A user with a visible AI analysis can directly download a valid PDF from the analysis panel.
- The PDF contains the current stock information and all visible AI analysis sections in the active language.
- Chinese glyphs render correctly, text is searchable, and long reports paginate without clipping.
- The export has a safe, localized filename and includes timestamps plus the investment disclaimer.
- No API key, password, model reasoning, or hidden request data appears in the PDF or export request path.
- Export failures are recoverable and do not disturb the displayed analysis.
- Existing AI analysis, refresh, authentication, Markdown report export, and application routing continue to work.
