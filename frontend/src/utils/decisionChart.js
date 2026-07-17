const STOCK_WINDOWS = Object.freeze({ "1M": 4, "3M": 6, "12M": 9, "3Y": 12 });
const TIMEFRAME_MONTHS = Object.freeze({ "1M": 1, "3M": 3, "12M": 12, "3Y": 36 });

function finiteValues(values) {
  return (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
}

function datedMacroValues(points, timeframe) {
  const dated = (Array.isArray(points) ? points : [])
    .map((point) => ({ date: new Date(point?.date), value: Number(point?.value) }))
    .filter((point) => !Number.isNaN(point.date.valueOf()) && Number.isFinite(point.value))
    .sort((left, right) => left.date - right.date);
  if (dated.length < 2) return null;
  const latest = dated.at(-1).date;
  const cutoff = new Date(latest);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - (TIMEFRAME_MONTHS[timeframe] ?? 12));
  const values = dated.filter((point) => point.date >= cutoff).map((point) => point.value);
  return values.length >= 2 ? values : null;
}

export function selectDecisionChartSeries({ baseValues, timeframe = "12M", indicator = "Composite", indicatorOptions }) {
  const stockWindow = STOCK_WINDOWS[timeframe] ?? STOCK_WINDOWS["12M"];
  const stockContextValues = finiteValues(baseValues).slice(-stockWindow);
  if (indicator === "Composite") return { stockContextValues, comparisonValues: null };
  const selected = (Array.isArray(indicatorOptions) ? indicatorOptions : []).find((item) => item.key === indicator);
  return { stockContextValues, comparisonValues: datedMacroValues(selected?.points, timeframe) };
}
