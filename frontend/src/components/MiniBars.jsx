export function MiniBars({ values, tone = "cyan" }) {
  return (
    <div className={`mini-bars ${tone}`}>
      {values.map((value, index) => (
        <span key={index} style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}
