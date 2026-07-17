export const initialAiAnalysisState = {
  status: "idle",
  result: null,
  error: null,
  needsPassword: false,
};

export function normalizeAiError(status, payload = {}) {
  const detail = payload.detail ?? payload;
  return {
    status,
    code: detail.code ?? "generic",
    retryAfter: detail.retry_after ?? null,
  };
}

export function getVisibleAiResult(result, ticker, lang) {
  return result?.ticker === ticker && result?.lang === lang ? result : null;
}

export function aiAnalysisReducer(state, action) {
  switch (action.type) {
    case "reset":
      return initialAiAnalysisState;
    case "password-required":
      return { ...state, status: "idle", needsPassword: true };
    case "loading":
      return { ...state, status: "loading", error: null, needsPassword: false };
    case "success":
      return { status: "ready", result: action.result, error: null, needsPassword: false };
    case "error":
      return {
        ...state,
        status: "error",
        error: action.error,
        needsPassword: action.error.code === "invalid_analysis_password",
      };
    default:
      return state;
  }
}
