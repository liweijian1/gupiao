import { useCallback, useEffect, useRef, useState } from "react";

import {
  getResearchBacktestJob,
  getResearchDataset,
  getResearchRanking,
  refreshResearchDataset,
  startResearchBacktest,
} from "../api/research.js";

const POLL_INTERVAL_MS = 900;

export function useResearch() {
  const [dataset, setDataset] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const controllerRef = useRef(null);

  const loadDataset = useCallback(async () => {
    try {
      const manifest = await getResearchDataset();
      setDataset(manifest);
      setStatus("ready");
      setError(null);
      return manifest;
    } catch (requestError) {
      setStatus(requestError.status === 409 ? "unavailable" : "error");
      setError(requestError);
      return null;
    }
  }, []);

  const pollJob = useCallback(async (jobId, onComplete) => {
    window.clearTimeout(timerRef.current);
    try {
      const job = await getResearchBacktestJob(jobId);
      if (job.status === "succeeded") {
        setStatus("ready");
        setError(null);
        onComplete(job);
        return;
      }
      if (job.status === "failed") {
        setStatus("error");
        setError({ code: "research_job_failed", message: job.error });
        return;
      }
      timerRef.current = window.setTimeout(() => pollJob(jobId, onComplete), POLL_INTERVAL_MS);
    } catch (requestError) {
      setStatus("error");
      setError(requestError);
    }
  }, []);

  const refreshDataset = useCallback(async (payload) => {
    setStatus("refreshing");
    setError(null);
    try {
      const job = await refreshResearchDataset(payload);
      await pollJob(job.id, (completed) => {
        setDataset(completed.result?.manifest ?? null);
        setRanking(null);
        setBacktest(null);
      });
    } catch (requestError) {
      setStatus("error");
      setError(requestError);
    }
  }, [pollJob]);

  const runRanking = useCallback(async (weights) => {
    setStatus("ranking");
    setError(null);
    try {
      const result = await getResearchRanking(weights);
      setRanking(result);
      setDataset((current) => current ?? {
        dataset_id: result.dataset_id,
        fingerprint: result.dataset_fingerprint,
        end_date: result.as_of,
      });
      setStatus("ready");
      return result;
    } catch (requestError) {
      setStatus(requestError.status === 409 ? "unavailable" : "error");
      setError(requestError);
      return null;
    }
  }, []);

  const runBacktest = useCallback(async (payload) => {
    setStatus("backtesting");
    setError(null);
    try {
      const job = await startResearchBacktest(payload);
      await pollJob(job.id, (completed) => setBacktest(completed.result ?? null));
    } catch (requestError) {
      setStatus("error");
      setError(requestError);
    }
  }, [pollJob]);

  useEffect(() => {
    loadDataset();
    return () => {
      window.clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    };
  }, [loadDataset]);

  return {
    dataset,
    ranking,
    backtest,
    status,
    error,
    loadDataset,
    refreshDataset,
    runRanking,
    runBacktest,
  };
}
