const PADDING = 24;

function finiteBar(bar) {
  const values = [bar?.open, bar?.high, bar?.low, bar?.close, bar?.volume, bar?.amount].map(Number);
  const [open, high, low, close, volume, amount] = values;
  return Number.isFinite(open)
    && Number.isFinite(high)
    && Number.isFinite(low)
    && Number.isFinite(close)
    && Number.isFinite(volume)
    && Number.isFinite(amount)
    && open > 0
    && high >= Math.max(open, close, low)
    && low <= Math.min(open, close, high)
    && volume >= 0
    && amount >= 0;
}

function validBars(bars) {
  return (Array.isArray(bars) ? bars : [])
    .filter(finiteBar)
    .map((bar) => ({
      date: String(bar.date),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume),
      amount: Number(bar.amount),
    }));
}

function scale(value, minimum, maximum, top, height) {
  const range = maximum - minimum || 1;
  return top + height - ((value - minimum) / range) * height;
}

function xFor(index, length, width) {
  if (length <= 1) return width / 2;
  return PADDING + (index / (length - 1)) * (width - PADDING * 2);
}

function priceDomain(bars) {
  const minimum = Math.min(...bars.map((bar) => bar.low));
  const maximum = Math.max(...bars.map((bar) => bar.high));
  const padding = Math.max((maximum - minimum) * 0.05, maximum * 0.002, 0.01);
  return { minimum: minimum - padding, maximum: maximum + padding };
}

function columnsFor(bars, metric, width, top, height) {
  const values = bars.map((bar) => bar[metric]);
  const maximum = Math.max(...values, 1);
  const step = Math.max(1, (width - PADDING * 2) / Math.max(1, bars.length));
  const columnWidth = Math.max(2, Math.min(28, step * 0.64));
  return bars.map((bar, index) => {
    const value = bar[metric];
    const columnHeight = Math.max(value > 0 ? 1 : 0, (value / maximum) * height);
    return {
      x: xFor(index, bars.length, width) - columnWidth / 2,
      y: top + height - columnHeight,
      width: columnWidth,
      height: columnHeight,
      value,
      date: bar.date,
      rising: bar.close >= bar.open,
    };
  });
}

function lineModel(bars, width, height) {
  const { minimum, maximum } = priceDomain(bars);
  const drawableHeight = height - PADDING * 2;
  const points = bars.map((bar, index) => ({
    x: xFor(index, bars.length, width),
    y: scale(bar.close, minimum, maximum, PADDING, drawableHeight),
    value: bar.close,
    date: bar.date,
  }));
  return { mode: "line", points, polyline: points.map((point) => `${point.x},${point.y}`).join(" ") };
}

function barModel(bars, metric, width, height) {
  return { mode: "bar", metric, columns: columnsFor(bars, metric, width, PADDING, height - PADDING * 2) };
}

function candleModel(bars, width, height) {
  const priceTop = PADDING;
  const volumeHeight = Math.max(34, Math.round(height * 0.19));
  const priceHeight = height - PADDING * 3 - volumeHeight;
  const volumeTop = priceTop + priceHeight + PADDING;
  const { minimum, maximum } = priceDomain(bars);
  const step = Math.max(1, (width - PADDING * 2) / Math.max(1, bars.length));
  const candleWidth = Math.max(2, Math.min(24, step * 0.62));
  const candles = bars.map((bar, index) => {
    const x = xFor(index, bars.length, width);
    const openY = scale(bar.open, minimum, maximum, priceTop, priceHeight);
    const closeY = scale(bar.close, minimum, maximum, priceTop, priceHeight);
    return {
      ...bar,
      x,
      width: candleWidth,
      openY,
      closeY,
      highY: scale(bar.high, minimum, maximum, priceTop, priceHeight),
      lowY: scale(bar.low, minimum, maximum, priceTop, priceHeight),
      rising: bar.close >= bar.open,
    };
  });
  return {
    mode: "candle",
    candles,
    volumeColumns: columnsFor(bars, "volume", width, volumeTop, volumeHeight),
    priceTop,
    priceHeight,
    volumeTop,
    volumeHeight,
  };
}

export function buildHistoricalChartModel({ bars, mode = "line", metric = "volume", width = 720, height = 280 }) {
  const clean = validBars(bars);
  if (!clean.length) return { mode, empty: true, points: [], columns: [], candles: [], volumeColumns: [] };
  if (mode === "bar") return barModel(clean, metric === "amount" ? "amount" : "volume", width, height);
  if (mode === "candle") return candleModel(clean, width, height);
  return lineModel(clean, width, height);
}
