import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw, Settings2, Sparkles } from "lucide-react";


export function AiAnalysisPanel({
  t,
  ticker,
  status,
  result,
  error,
  needsPassword,
  onAnalyze,
  onRefresh,
  onSubmitPassword,
  onOpenSettings,
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!needsPassword) setPassword("");
    return () => setPassword("");
  }, [needsPassword, ticker]);

  const analysis = result?.analysis;
  const errorText = error ? (t.ai.errors[error.code] ?? t.ai.errors.generic) : "";

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
            <button type="button" className="ghost" onClick={onRefresh} disabled={status === "loading"}>
              <RefreshCcw className={status === "loading" ? "spin" : ""} size={14} /> {t.ai.refresh}
            </button>
          </div>
        </div>
      )}
      <p className="ai-disclaimer">{t.ai.disclaimer}</p>
    </section>
  );
}
