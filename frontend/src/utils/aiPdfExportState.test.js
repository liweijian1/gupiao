import test from "node:test";
import assert from "node:assert/strict";

import {
  initialAiPdfExportState,
  canExportAiPdf,
  reduceAiPdfExportState,
} from "./aiPdfExportState.js";


test("allows export only for a visible analysis in idle states", () => {
  assert.equal(canExportAiPdf({ hasAnalysis: true, analysisStatus: "success", exportStatus: "idle" }), true);
  assert.equal(canExportAiPdf({ hasAnalysis: false, analysisStatus: "success", exportStatus: "idle" }), false);
  assert.equal(canExportAiPdf({ hasAnalysis: true, analysisStatus: "loading", exportStatus: "idle" }), false);
  assert.equal(canExportAiPdf({ hasAnalysis: true, analysisStatus: "success", exportStatus: "exporting" }), false);
  assert.equal(canExportAiPdf({ hasAnalysis: true, analysisStatus: "success", exportStatus: "error" }), true);
});

test("tracks busy, failure, retry, success, and ticker reset states", () => {
  const exporting = reduceAiPdfExportState(initialAiPdfExportState, { type: "start" });
  assert.deepEqual(exporting, { status: "exporting", error: false });

  const failed = reduceAiPdfExportState(exporting, { type: "failure" });
  assert.deepEqual(failed, { status: "error", error: true });

  const retried = reduceAiPdfExportState(failed, { type: "start" });
  assert.deepEqual(retried, { status: "exporting", error: false });

  const completed = reduceAiPdfExportState(retried, { type: "success" });
  assert.deepEqual(completed, initialAiPdfExportState);

  const reset = reduceAiPdfExportState(failed, { type: "ticker_changed" });
  assert.deepEqual(reset, initialAiPdfExportState);
});
