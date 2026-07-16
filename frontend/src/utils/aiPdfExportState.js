export const initialAiPdfExportState = Object.freeze({ status: "idle", error: false });


export function canExportAiPdf({ hasAnalysis, analysisStatus, exportStatus }) {
  return Boolean(hasAnalysis) && analysisStatus !== "loading" && exportStatus !== "exporting";
}

export function reduceAiPdfExportState(state, event) {
  switch (event.type) {
    case "start":
      return { status: "exporting", error: false };
    case "failure":
      return { status: "error", error: true };
    case "success":
    case "ticker_changed":
      return initialAiPdfExportState;
    default:
      return state;
  }
}
