const MARKET_STATUS = Object.freeze({
  zh: {
    before_open: "盘前",
    pre_market: "集合竞价",
    open: "交易中",
    lunch_break: "午休",
    after_close: "收盘后",
    weekend: "周末",
    closed: "休市",
  },
  en: {
    before_open: "before open",
    pre_market: "pre-market",
    open: "open",
    lunch_break: "lunch",
    after_close: "after close",
    weekend: "weekend",
    closed: "closed",
  },
});

function marketStatusLabel(meta, lang) {
  const labels = MARKET_STATUS[lang] ?? MARKET_STATUS.en;
  if (meta?.market_status && labels[meta.market_status]) return labels[meta.market_status];
  return meta?.market_open ? labels.open : labels.closed;
}

export function deriveStockSourceStatus({
  realtimeState,
  realtimeQuote,
  realtimeMeta,
  lang = "en",
  stockQuery = "",
  searchSnapshot,
  searchState = "idle",
  stockSnapshot,
  stockSnapshotStatus = "ready",
  stockSnapshotError,
}) {
  const provider = realtimeQuote?.provider ?? realtimeMeta?.quote?.provider ?? null;
  const source = (stockQuery.trim() && searchSnapshot?.source) || stockSnapshot?.source || "mock";
  const searchWarning = searchState === "error" ? searchSnapshot?.warning : null;
  const snapshotFailed = stockSnapshotStatus === "error";
  const warning = searchWarning || (snapshotFailed ? stockSnapshotError?.message : null) || stockSnapshot?.warning || realtimeMeta?.warning || null;

  let message = null;
  let retryTarget = null;
  if (searchWarning) {
    message = String(searchWarning);
    retryTarget = "search";
  } else if (snapshotFailed) {
    message = lang === "zh" ? "股票数据刷新失败；已保留可用内容。" : "Equity data refresh failed; available content remains visible.";
    retryTarget = "snapshot";
  } else if (stockSnapshotStatus === "loading") {
    message = lang === "zh" ? "正在刷新股票数据；已保留可用内容。" : "Refreshing equity data; available content remains visible.";
  } else if (stockSnapshot?.warning) {
    message = String(stockSnapshot.warning);
    retryTarget = "snapshot";
  } else if (realtimeMeta?.warning) {
    message = String(realtimeMeta.warning);
    retryTarget = "realtime-auto";
  } else if (realtimeState === "loading") {
    message = lang === "zh" ? "正在刷新选中股票行情；股票列表保持可用。" : "Refreshing the selected quote; equity rows remain available.";
  }

  const attachFeedback = (status) => message
    ? { ...status, message, ...(retryTarget ? { retryTarget } : {}) }
    : status;
  const degradedSuffix = warning ? ` · ${lang === "zh" ? "降级" : "degraded"}` : "";

  if (realtimeState === "loading") {
    return attachFeedback({ kind: "loading", label: `${provider ?? source} · ${lang === "zh" ? "刷新中" : "refreshing"}`, provider });
  }
  if (realtimeState === "live") {
    return attachFeedback({
      kind: warning ? "degraded" : "live",
      label: `${provider ?? "realtime"} · ${lang === "zh" ? "实时" : "realtime"}${realtimeQuote?.market_time ? ` · ${realtimeQuote.market_time}` : ""}${degradedSuffix}`,
      provider,
    });
  }
  if (realtimeState === "cached") {
    return attachFeedback({
      kind: warning ? "degraded" : "cached",
      label: `${provider ?? "cache"} · ${marketStatusLabel(realtimeMeta, lang)}${realtimeQuote?.market_date ? ` · ${realtimeQuote.market_date}` : ""}${degradedSuffix}`,
      provider,
    });
  }
  if (realtimeState === "stale") {
    return attachFeedback({
      kind: warning ? "degraded" : "stale",
      label: `${provider ?? "cache"} · ${lang === "zh" ? "缓存重试中" : "cache retry"}${degradedSuffix}`,
      provider,
    });
  }
  if (stockSnapshotStatus === "loading") {
    return attachFeedback({ kind: "loading", label: `${source} · ${lang === "zh" ? "刷新中" : "refreshing"}`, provider });
  }
  if (warning) {
    return attachFeedback({ kind: "degraded", label: `${source} · ${lang === "zh" ? "降级" : "degraded"}`, provider });
  }

  const isMock = ["mock", "fallback"].includes(String(source).toLowerCase());
  return {
    kind: isMock ? "mock" : "cached",
    label: source === "mock" ? "mock" : `${source} · ${isMock ? (lang === "zh" ? "模拟" : "mock") : (lang === "zh" ? "缓存" : "cached")}`,
    provider,
  };
}

export function classifyStockSearchSnapshot(snapshot) {
  const stocks = Array.isArray(snapshot?.stocks) ? snapshot.stocks : [];
  if (stocks.length > 0) return "ready";
  const warning = String(snapshot?.warning ?? "").toLowerCase();
  if (!warning || warning.includes("not found")) return "empty";
  return "error";
}

export function retainStockSearchSnapshot(previous, next, outcome) {
  if (outcome !== "error") return next;
  const sameQuery = String(previous?.query ?? "") === String(next?.query ?? "");
  if (sameQuery && previous?.stocks?.length > 0) {
    return { ...previous, warning: next?.warning ?? previous.warning };
  }
  return next;
}

export function deriveMacroSourceStatus({ requestStatus = "loading", snapshot, error, lang = "en" }) {
  const source = snapshot?.source ?? "mock";
  if (requestStatus === "loading") {
    return {
      kind: "loading",
      label: `${source} · ${lang === "zh" ? "刷新中" : "refreshing"}`,
      message: lang === "zh" ? "正在刷新宏观数据；已保留可用内容。" : "Refreshing macro data; fallback remains visible…",
    };
  }
  if (requestStatus === "error" || error) {
    return {
      kind: "degraded",
      label: `${source} · ${lang === "zh" ? "降级" : "degraded"}`,
      message: lang === "zh" ? "宏观数据刷新失败；已保留可用内容。" : "Macro data refresh failed; fallback remains visible.",
    };
  }
  const degradedSeries = snapshot?.series?.find((item) => item?.error || String(item?.source ?? "").toLowerCase() === "mock");
  if (snapshot?.warning || degradedSeries) {
    return {
      kind: "degraded",
      label: `${source} · ${lang === "zh" ? "降级" : "degraded"}`,
      message: String(snapshot.warning || degradedSeries.error || (lang === "zh" ? "部分宏观指标正在使用模拟数据。" : "Some macro series are using fallback data.")),
    };
  }
  const isMock = ["mock", "fallback"].includes(String(source).toLowerCase());
  return {
    kind: isMock ? "mock" : "cached",
    label: source === "mock" ? "mock" : `${source} · ${isMock ? (lang === "zh" ? "模拟" : "mock") : (lang === "zh" ? "缓存" : "cached")}`,
    message: "",
  };
}
