import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "../config.js";

const A_SHARE_EXCHANGES = new Set(["SSE", "SZSE", "BSE", "A-share"]);

export function useStockHistory({ stock, range, adjust }) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState("idle");
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);
  const ticker = stock?.ticker ?? "";
  const supported = A_SHARE_EXCHANGES.has(stock?.exchange) && /^\d{6}$/.test(ticker);

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      setPayload(null);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ symbol: ticker, range, adjust });
    setState("loading");
    setPayload(null);
    setError(null);

    fetch(`${API_BASE_URL}/api/stocks/history?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.detail?.message || body?.detail || `History API returned ${response.status}`);
        }
        return body;
      })
      .then((nextPayload) => {
        setPayload(nextPayload);
        setState("ready");
      })
      .catch((nextError) => {
        if (nextError.name !== "AbortError") {
          setError(nextError.message);
          setState("error");
        }
      });

    return () => controller.abort();
  }, [adjust, range, requestVersion, supported, ticker]);

  return { state, payload, error, retry };
}
