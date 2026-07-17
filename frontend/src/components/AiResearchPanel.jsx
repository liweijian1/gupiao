import { useEffect, useReducer, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCcw, Settings2, Sparkles } from "lucide-react";

import { getVisibleAiResult } from "../utils/aiAnalysis.js";
import { canExportAiPdf, initialAiPdfExportState, reduceAiPdfExportState } from "../utils/aiPdfExportState.js";

export function AiResearchPanel({ t, lang, ticker, score, status, result, error, needsPassword, onAnalyze, onRefresh, onExport, onSubmitPassword, onOpenSettings }) {
  const [password, setPassword] = useState("");
  const [exportState, dispatchExport] = useReducer(reduceAiPdfExportState, initialAiPdfExportState);
  const activeRequestKeyRef = useRef(`${ticker}:${lang}`);
  useEffect(() => { if (!needsPassword) setPassword(""); return () => setPassword(""); }, [lang, needsPassword, ticker]);
  useEffect(() => { activeRequestKeyRef.current = `${ticker}:${lang}`; dispatchExport({ type: "ticker_changed" }); }, [lang, ticker]);
  const visibleResult = getVisibleAiResult(result, ticker, lang);
  const analysis = visibleResult?.analysis;
  const errorText = error ? (t.ai.errors[error.code] ?? t.ai.errors.generic) : "";
  const canExport = canExportAiPdf({ hasAnalysis: Boolean(analysis), analysisStatus: status, exportStatus: exportState.status });
  const handleExport = async () => {
    if (!canExport) return;
    const requestKey = `${ticker}:${lang}`;
    dispatchExport({ type: "start" });
    try { await onExport(); if (activeRequestKeyRef.current === requestKey) dispatchExport({ type: "success" }); }
    catch { if (activeRequestKeyRef.current === requestKey) dispatchExport({ type: "failure" }); }
  };
  return (
    <section className="panel ai-research-panel" aria-labelledby="ai-research-title" aria-busy={status === "loading" || exportState.status === "exporting"}>
      <header className="region-heading ai-research-heading"><div><small>{t.ai.researchAssistant}</small><h2 id="ai-research-title"><Sparkles size={17} aria-hidden="true" /> {t.ai.analysis}</h2></div><button type="button" className="ghost" data-ai-settings-trigger onClick={onOpenSettings}><Settings2 size={14} aria-hidden="true" /> {t.ai.settings}</button></header>
      {needsPassword && <div className="ai-password-block"><form className="ai-password-form" onSubmit={(event) => { event.preventDefault(); if (password) onSubmitPassword(password); }}><label htmlFor={`ai-analysis-password-${ticker}`}>{t.ai.analysisPassword}</label><div><input id={`ai-analysis-password-${ticker}`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus /><button type="submit" className="primary" disabled={!password}>{t.ai.continue}</button></div></form>{errorText && <p className="ai-inline-error" role="alert">{errorText}</p>}</div>}
      {errorText && !needsPassword && <div className="ai-message error" role="alert"><span>{errorText}</span>{error.code === "ai_not_configured" && <button type="button" className="ghost" onClick={onOpenSettings}>{t.ai.openSettings}</button>}</div>}
      {status === "loading" && analysis && <p className="ai-refresh-status" role="status"><LoaderCircle className="spin" size={15} aria-hidden="true" /> {t.ai.refreshing}</p>}
      {!analysis && !needsPassword && <button type="button" className="ai-run-button" onClick={onAnalyze} disabled={status === "loading"}>{status === "loading" ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}{status === "loading" ? t.ai.analyzing : t.ai.analyze}</button>}
      {analysis && <div className="ai-analysis-content"><p className="sr-only" role="status" aria-live="polite">{t.ai.analysis}: {ticker}, {t.ai[analysis.rating]}</p><div className="ai-analysis-summary"><div><small>{t.ai.rating}</small><strong className={`ai-rating ${analysis.rating}`}>{t.ai[analysis.rating]}</strong></div><div><small>{t.ai.factorScore}</small><strong>{score}/100</strong></div><div><small>{t.ai.position}</small><strong>{analysis.position_range.min}%–{analysis.position_range.max}%</strong></div><p>{analysis.summary}</p></div><div className="ai-analysis-grid"><article><h3>{t.ai.opportunities}</h3><ul>{analysis.opportunities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>{t.ai.risks}</h3><ul>{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul></article></div><article className="ai-watchlist"><h3>{t.ai.watchlist}</h3><div>{analysis.watchlist.map((item) => <span key={`${item.name}-${item.value}`}><b>{item.name}</b><em>{item.value}</em><small>{item.reason}</small></span>)}</div></article><div className="ai-analysis-meta"><span>{visibleResult.cached ? t.ai.cached : t.ai.generated} · {new Date(visibleResult.generated_at).toLocaleString()}</span><div className="ai-analysis-actions"><button type="button" className="ghost" onClick={handleExport} disabled={!canExport} aria-busy={exportState.status === "exporting"}>{exportState.status === "exporting" ? <LoaderCircle className="spin" size={14} /> : <Download size={14} />}{exportState.status === "exporting" ? t.ai.exportingPdf : t.ai.exportPdf}</button><button type="button" className="ghost" onClick={onRefresh} disabled={status === "loading" || exportState.status === "exporting"}><RefreshCcw className={status === "loading" ? "spin" : ""} size={14} /> {t.ai.refresh}</button></div></div>{exportState.error && <p className="ai-inline-error" role="alert">{t.ai.exportPdfFailed}</p>}</div>}
      <p className="ai-disclaimer">{t.ai.disclaimer}</p>
    </section>
  );
}
