export function ScoreGauge({ label, value, caption }) {
  return (
    <section className="score-gauge">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="gauge-track">
        <span style={{ width: `${value}%` }} />
      </div>
      <p>{caption}</p>
    </section>
  );
}
