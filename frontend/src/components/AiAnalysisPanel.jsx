import { useEffect, useReducer, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCcw, Settings2, Sparkles } from "lucide-react";

import {
  canExportAiPdf,
  initialAiPdfExportState,
  reduceAiPdfExportState,
} from "../utils/aiPdfExportState.js";


export function AiAnalysisPanel({
  t,
  ticker,
  status,
  result,
  error,
  needsPassword,
  onAnalyze,
  onRefresh,
  onExport,
  onSubmitPassword,
  onOpenSettings,
}) {
  const [password, setPassword] = useState("");
  const [exportState, dispatchExport] = useReducer(reduceAiPdfExportState, initialAiPdfExportState);
  const activeTickerRef = useRef(ticker);

  useEffect(() => {
    if (!needsPassword) setPassword("");
    return () => setPassword("");
  }, [needsPassword, ticker]);

  useEffect(() => {
    activeTickerRef.current = ticker;
    dispatchExport({ type: "ticker_changed" });
  }, [ticker]);

  const analysis = result?.analysis;
  const errorText = error ? (t.ai.errors[error.code] ?? t.ai.errors.generic) : "";
  const canExport = canExportAiPdf({
    hasAnalysis: Boolean(analysis),
    analysisStatus: status,
    exportStatus: exportState.status,
  });

  const handleExport = async () => {
    if (!canExport) return;
    const startedTicker = ticker;
    dispatchExport({ type: "start" });
    try {
      await onExport();
      if (activeTickerRef.current === startedTicker) dispatchExport({ type: "success" });
    } catch {
      if (activeTickerRef.current === startedTicker) dispatchExport({ type: "failure" });
    }
  };

  return (
    <section className="ai-analysis-panel" aria-live="polite">
      <div className="ai-analysis-heading">
        <div>
          <small>{t.ai.researchAssistant}</small>
          <h3><Sparkles size={16} /> {t.ai.analysis}</h3>
        </div>
        <button type="button" className="ghost" onClick={onOpenSettings}>
          <Settings2 size={14} /> {t.ai.settings}
        </button>
      </div>

      {needsPassword && (
        <div className="ai-password-block">
          <form
            className="ai-password-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (password) onSubmitPassword(password);
            }}
          >
            <label htmlFor={`ai-analysis-password-${ticker}`}>{t.ai.analysisPassword}</label>
            <div>
              <input
                id={`ai-analysis-password-${ticker}`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <button type="submit" className="primary" disabled={!password}>{t.ai.continue}</button>
            </div>
          </form>
          {errorText && <p className="ai-inline-error" role="alert">{errorText}</p>}
        </div>
      )}

      {errorText && !needsPassword && (
        <div className="ai-message error" role="alert">
          <span>{errorText}</span>
          {error.code === "ai_not_configured" && <button type="button" className="ghost" onClick={onOpenSettings}>{t.ai.openSettings}</button>}
        </div>
      )}

      {!analysis && !needsPassword && (
        <button type="button" className="ai-run-button" onClick={onAnalyze} disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
          {status === "loading" ? t.ai.analyzing : t.ai.analyze}
        </button>
      )}

      {analysis && (
        <div className="ai-analysis-content">
          <div className="ai-analysis-summary">
            <div>
              <small>{t.ai.rating}</small>
              <strong className={`ai-rating ${analysis.rating}`}>{t.ai[analysis.rating]}</strong>
            </div>
            <div>
              <small>{t.ai.position}</small>
              <strong>{analysis.position_range.min}%–{analysis.position_range.max}%</strong>
            </div>
            <p>{analysis.summary}</p>
          </div>
          <div className="ai-analysis-grid">
            <article>
              <h4>{t.ai.opportunities}</h4>
              <ul>{analysis.opportunities.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h4>{t.ai.risks}</h4>
              <ul>{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>
          <article className="ai-watchlist">
            <h4>{t.ai.watchlist}</h4>
            <div>
              {analysis.watchlist.map((item) => (
                <span key={`${item.name}-${item.value}`}>
                  <b>{item.name}</b><em>{item.value}</em><small>{item.reason}</small>
                </span>
              ))}
            </div>
          </article>
          <div className="ai-analysis-meta">
            <span>{result.cached ? t.ai.cached : t.ai.generated} · {new Date(result.generated_at).toLocaleString()}</span>
            <div className="ai-analysis-actions">
              <button
                type="button"
                className="ghost"
                onClick={handleExport}
                disabled={!canExport}
                aria-busy={exportState.status === "exporting"}
              >
                {exportState.status === "exporting"
                  ? <LoaderCircle className="spin" size={14} />
                  : <Download size={14} />}
                {exportState.status === "exporting" ? t.ai.exportingPdf : t.ai.exportPdf}
              </button>
              <button type="button" className="ghost" onClick={onRefresh} disabled={status === "loading" || exportState.status === "exporting"}>
                <RefreshCcw className={status === "loading" ? "spin" : ""} size={14} /> {t.ai.refresh}
              </button>
            </div>
          </div>
          {exportState.error && <p className="ai-inline-error" role="alert">{t.ai.exportPdfFailed}</p>}
        </div>
      )}
      <p className="ai-disclaimer">{t.ai.disclaimer}</p>
    </section>
  );
}
