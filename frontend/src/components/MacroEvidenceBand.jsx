import { MiniBars } from "./MiniBars.jsx";
import { ScoreGauge } from "./ScoreGauge.jsx";
import { MacroDataMap } from "./MacroDataMap.jsx";

export function MacroEvidenceBand({
  t, scores, cycle, trendValues, macroSeries, sourceStatus, selectedIndicator,
  overviewRef, dataMapRef, onRetry, onSelectIndicator,
}) {
  const { growth, liquidity, inflation, external } = scores;
  const composite = Math.round((growth + liquidity + (100 - inflation)) / 3);
  const cycleX = Math.min(96, Math.max(4, growth));
  const cycleY = Math.min(96, Math.max(4, inflation));

  return (
    <section className="panel macro-evidence-band nav-target" ref={overviewRef} aria-labelledby="macro-evidence-title">
      <div className="macro-evidence-overview">
        <header className="region-heading">
          <div>
            <small>{t.macroModel} · {sourceStatus.label}</small>
            <h2 id="macro-evidence-title">{t.macroEvidence}</h2>
          </div>
          <span className="source-badge" data-source-kind={sourceStatus.kind}>{sourceStatus.label}</span>
        </header>
        {sourceStatus.message && (
          <div className="region-status-message" role={sourceStatus.kind === "loading" ? "status" : "alert"}>
            <span>{sourceStatus.message}</span>
            {sourceStatus.kind === "degraded" && <button type="button" className="ghost" onClick={onRetry}>{t.retry}</button>}
          </div>
        )}
        <div className="macro-score-grid">
          <ScoreGauge label={t.scores.growth[0]} value={growth} caption={t.scores.growth[1]} />
          <ScoreGauge label={t.scores.liquidity[0]} value={liquidity} caption={t.scores.liquidity[1]} />
          <ScoreGauge label={t.scores.inflation[0]} value={inflation} caption={t.scores.inflation[1]} />
          <ScoreGauge label={t.scores.external[0]} value={external} caption={t.scores.external[1]} />
        </div>
        <div className="regime-row">
          <div className="cycle-map" role="img" aria-label={`${t.macroDashboard}: ${t.cycles[cycle] ?? cycle}`}>
            <span className="axis-x">{t.axes.growth}</span>
            <span className="axis-y">{t.axes.inflation}</span>
            <span className="cycle-dot" style={{ left: `${cycleX}%`, bottom: `${cycleY}%` }}>{t.cycles[cycle] ?? cycle}</span>
            <small className="q1">{t.cycles.Recovery}</small><small className="q2">{t.cycles.Overheat}</small>
            <small className="q3">{t.cycles.Slowdown}</small><small className="q4">{t.cycles.Stagflation}</small>
          </div>
          <div className="macro-conclusion">
            <div><small>{t.compositeScore}</small><strong>{composite}</strong></div>
            <MiniBars values={trendValues} tone="green" />
            <h3>{t.macroConclusion}</h3>
            <p>{t.currentRead}</p>
          </div>
        </div>
      </div>
      <MacroDataMap t={t} series={macroSeries} selectedIndicator={selectedIndicator} sectionRef={dataMapRef} onSelectIndicator={onSelectIndicator} />
    </section>
  );
}
