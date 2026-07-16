import { useCallback, useEffect, useReducer, useRef } from "react";

import { getCachedAiAnalysis, requestAiAnalysis } from "../api/ai.js";
import { aiAnalysisReducer, initialAiAnalysisState } from "../utils/aiAnalysis.js";


export function useAiAnalysis({ ticker, lang, analysisPassword }) {
  const [state, dispatch] = useReducer(aiAnalysisReducer, initialAiAnalysisState);
  const controllerRef = useRef(null);

  const run = useCallback(async ({ force = false } = {}) => {
    if (!analysisPassword) {
      dispatch({ type: "password-required" });
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: "loading" });
    try {
      const result = force
        ? await requestAiAnalysis(ticker, lang, true, analysisPassword, controller.signal)
        : await getCachedAiAnalysis(ticker, lang, analysisPassword, controller.signal).catch((error) => {
            if (error.status === 404) {
              return requestAiAnalysis(ticker, lang, false, analysisPassword, controller.signal);
            }
            throw error;
          });
      dispatch({ type: "success", result });
    } catch (error) {
      if (error.name !== "AbortError") dispatch({ type: "error", error });
    }
  }, [analysisPassword, lang, ticker]);

  useEffect(() => {
    controllerRef.current?.abort();
    dispatch({ type: "reset" });
  }, [ticker, lang]);

  useEffect(() => () => controllerRef.current?.abort(), []);
  return { ...state, run };
}
