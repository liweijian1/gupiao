# AI Analysis PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct-download, bilingual PDF report for the currently displayed AI stock analysis.

**Architecture:** React supplies an explicit safe snapshot containing only the selected stock and validated AI result. A pure document builder creates a pdfmake definition, while a separate lazy adapter imports pdfmake 0.3.11 and a locally bundled Noto Sans SC font only after the export button is selected. `AiAnalysisPanel` owns export progress/error UI; no backend or Nginx route changes are required.

**Tech Stack:** React 19, Vite 6, Node 22 test runner, pdfmake 0.3.11, Noto Sans SC (SIL Open Font License)

## Global Constraints

- Export only the analysis currently displayed; never start or refresh AI generation during export.
- Accept only explicit safe fields in the document builder. Do not pass AI configuration, credentials, headers, prompts, raw responses, or model reasoning.
- Keep report text searchable and support mixed Chinese/Latin content.
- Load pdfmake and the CJK font lazily so the initial application bundle and network path do not include them.
- Serve all emitted assets under the existing Vite `/stock-macro/` base path.
- Preserve the existing Markdown export and all AI authentication/refresh behavior.
- Do not change backend APIs, systemd, or Nginx.

---

### Task 1: Pin the PDF dependency and licensed font asset

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/src/assets/fonts/NotoSansSC-Variable.ttf`
- Create: `frontend/src/assets/fonts/OFL.txt`
- Create: `frontend/src/assets/fonts/SOURCE.md`

- [ ] **Step 1: Install the stable PDF engine**

Run:

```bash
cd frontend
npm install pdfmake@0.3.11
```

Expected: dependency and lockfile pin `pdfmake` to `0.3.11`; installation exits `0`.

- [ ] **Step 2: Vendor the Chinese font and license**

Download the official Google Fonts Noto Sans SC variable TrueType file and its `OFL.txt` from `google/fonts/ofl/notosanssc/`. Save them under `frontend/src/assets/fonts/` using the filenames above. Record the upstream repository URL, retrieved commit/blob URL, retrieval date, and SHA-256 checksum in `SOURCE.md`.

Expected: the TTF and license are committed local assets; runtime export does not depend on a CDN.

- [ ] **Step 3: Verify the dependency and asset**

Run:

```bash
cd frontend
npm ls pdfmake
shasum -a 256 src/assets/fonts/NotoSansSC-Variable.ttf
```

Expected: `pdfmake@0.3.11` is installed and the checksum matches `SOURCE.md`.

- [ ] **Step 4: Commit dependency and licensed asset**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/assets/fonts
git commit -m "build: add PDF engine and Chinese font"
```

---

### Task 2: Build the safe PDF document definition with TDD

**Files:**
- Create: `frontend/src/utils/aiPdfReport.js`
- Create: `frontend/src/utils/aiPdfReport.test.js`

**Interfaces:**
- Produces: `buildAiPdfDocument({ lang, t, selectedStock, result, exportedAt })`, `buildAiPdfFilename({ lang, ticker, date })`.
- Consumes only the explicit arguments above; extra fields are ignored by construction.

- [ ] **Step 1: Write failing document-content tests**

Cover these exact cases in `aiPdfReport.test.js`:

- Chinese report contains title, stock name/code, localized sector, all stock metrics, localized rating, position range, full summary, every opportunity, every risk, every watch item, model, timestamps, cache status, and disclaimer.
- English report uses English labels and filename.
- missing values become `--`, while numeric zero remains `0`;
- unsafe ticker filename characters become `-`;
- a recursively flattened document definition does not contain representative `api_key`, administrator password, analysis password, authorization header, prompt, raw provider response, or reasoning values placed on unrelated input properties;
- footer returns the ticker plus current/total page number;
- document page size is A4 and the default font is Noto Sans SC.

- [ ] **Step 2: Run the focused test to verify RED**

```bash
cd frontend
node --test src/utils/aiPdfReport.test.js
```

Expected: test collection fails because `aiPdfReport.js` does not exist.

- [ ] **Step 3: Implement pure formatting and document construction**

Implement:

- safe display helpers that distinguish `0` from missing data;
- locale-aware 24-hour timestamps with an injectable `exportedAt` for deterministic tests;
- signed percentage and currency formatting;
- safe bilingual filename generation;
- A4 margins, print colors, reusable title/section/table styles;
- metadata and stock snapshot tables;
- rating/position/summary block;
- opportunity and risk lists;
- watch-indicator table with repeatable headers;
- localized disclaimer and page footer;
- `pageBreakBefore` or equivalent rules that keep section headings with following content.

Do not spread full application objects into the definition. Read each allowed field explicitly.

- [ ] **Step 4: Run focused tests to verify GREEN**

```bash
cd frontend
node --test src/utils/aiPdfReport.test.js
```

Expected: all document and filename tests pass.

- [ ] **Step 5: Commit the pure report builder**

```bash
git add frontend/src/utils/aiPdfReport.js frontend/src/utils/aiPdfReport.test.js
git commit -m "feat: build AI analysis PDF document"
```

---

### Task 3: Add a lazy, testable browser download adapter

**Files:**
- Modify: `frontend/src/utils/aiPdfReport.js`
- Modify: `frontend/src/utils/aiPdfReport.test.js`

**Interfaces:**
- Produces: `downloadAiAnalysisPdf(snapshot, dependencies?) -> Promise<void>`.
- Default dependencies dynamically import `pdfmake/build/pdfmake.js` and resolve the Vite font asset URL.
- Tests inject a fake pdfmake loader and do not create real browser downloads.

- [ ] **Step 1: Write failing lazy-adapter tests**

Assert that:

- the pdfmake loader is not called when the module is imported;
- invoking export calls the loader once, registers the local font URL, builds the definition, and calls `download(filename)`;
- a second sequential export reuses the loaded engine/font registration;
- loader, font, render, and download rejections propagate as sanitized export failures without including the original snapshot in the error message.

- [ ] **Step 2: Run focused tests to verify RED**

```bash
cd frontend
node --test src/utils/aiPdfReport.test.js
```

Expected: new adapter tests fail because the download function is absent.

- [ ] **Step 3: Implement the adapter**

Use a module-level promise to deduplicate the dynamic import. Register `NotoSansSC-Variable.ttf` for normal, bold, italics, and bold italics, pointing to the Vite-emitted local asset URL. Await pdfmake document creation/download according to the 0.3.11 browser API. Normalize failures to an `AiPdfExportError` without logging or embedding the input snapshot.

- [ ] **Step 4: Run focused tests to verify GREEN**

```bash
cd frontend
node --test src/utils/aiPdfReport.test.js
```

Expected: all document-builder and lazy-adapter tests pass.

- [ ] **Step 5: Commit the download adapter**

```bash
git add frontend/src/utils/aiPdfReport.js frontend/src/utils/aiPdfReport.test.js
git commit -m "feat: download AI analysis PDF lazily"
```

---

### Task 4: Connect export state and localized UI

**Files:**
- Modify: `frontend/src/i18n/copy.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/AiAnalysisPanel.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add bilingual copy**

Under both `copy.en.ai` and `copy.zh.ai`, add labels for:

- export PDF;
- exporting PDF;
- PDF export failure;
- report title and report metadata/stock-field headings needed only by the document builder.

Keep the existing trusted disclaimer as the exported disclaimer.

- [ ] **Step 2: Wire the safe export snapshot in App**

Import `downloadAiAnalysisPdf`. Create an async callback that explicitly passes only `lang`, `t`, `selectedStock`, and `aiAnalysis.result`; do not pass hook state, analysis password, settings state, or API clients. Pass `selectedStock` and the callback to `AiAnalysisPanel`.

- [ ] **Step 3: Add panel progress and failure behavior**

In `AiAnalysisPanel`:

- add local `exportStatus` and `exportError` state;
- render a `Download` action beside Regenerate only when `analysis` exists;
- disable it while AI refresh or PDF export is active;
- expose `aria-busy` while exporting;
- await `onExport`, clear a previous export error on retry, and show the localized export error without altering the analysis result;
- reset transient export state when the ticker changes.

- [ ] **Step 4: Style the action row and error state**

Extend existing AI panel styles so the timestamp, export action, and regenerate action wrap cleanly on narrow screens. Reuse the product's ghost-button and inline-error language rather than creating a new visual system.

- [ ] **Step 5: Run frontend tests and build**

```bash
cd frontend
npm test
npm run build
```

Expected: all tests pass and the Vite production build succeeds. Build output contains separate lazy pdfmake/font assets rather than adding them to the entry chunk.

- [ ] **Step 6: Commit the UI integration**

```bash
git add frontend/src/i18n/copy.js frontend/src/App.jsx frontend/src/components/AiAnalysisPanel.jsx frontend/src/styles.css
git commit -m "feat: add AI analysis PDF export action"
```

---

### Task 5: Verify the real browser workflow

**Files:**
- Modify only if a verified defect is found.

- [ ] **Step 1: Start the local application**

Use the existing backend virtual environment and frontend scripts. Keep backend and frontend processes in reusable sessions.

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm run dev -- --port 5173
```

Expected: both services start successfully.

- [ ] **Step 2: Open the preview in the in-app browser**

Navigate to the local Vite URL. Select a stock with a valid cached AI analysis or generate one using the existing page-session password flow.

- [ ] **Step 3: Verify lazy loading and interaction**

Before clicking Export PDF, confirm browser network activity has not loaded pdfmake or the Noto font. Click Export PDF and confirm:

- the button becomes busy and cannot be double-submitted;
- the PDF and font assets load under the local application origin;
- the browser directly downloads the file;
- Regenerate, settings, and the existing top-level Markdown export continue to work.

- [ ] **Step 4: Inspect Chinese and English PDFs**

Verify both languages for filename, glyphs, selectable/searchable text, stock fields, complete analysis sections, timestamps, cache/model metadata, page footer, multipage wrapping, and disclaimer. Search the PDF bytes/text for representative API-key/password/prompt/reasoning strings and confirm they are absent.

- [ ] **Step 5: Verify recoverable failure**

Temporarily force the injected/asset-loading path to fail in local development, confirm a localized error appears while the analysis remains visible, then restore the normal path and confirm retry succeeds. Do not commit the forced failure.

---

### Task 6: Final regression and completion review

- [ ] **Step 1: Run clean verification**

```bash
cd frontend
npm test
npm run build
```

Expected: all tests pass and production build exits `0`.

- [ ] **Step 2: Inspect changed files and secret safety**

```bash
git diff --check
git status --short
git diff --stat HEAD~3..HEAD
rg -n "api[_-]?key|admin.*password|analysis.*password|authorization|<think>" frontend/src/utils/aiPdfReport.js frontend/src/components/AiAnalysisPanel.jsx frontend/src/App.jsx
```

Expected: no whitespace errors; only intended files are changed; secret-related matches are defensive tests/comments or existing auth code, never exported values. Preserve the three pre-existing untracked plan files.

- [ ] **Step 3: Review acceptance criteria**

Confirm every item in `docs/superpowers/specs/2026-07-16-ai-analysis-pdf-export-design.md` has direct test or browser evidence. Do not push or deploy without a separate user instruction.
