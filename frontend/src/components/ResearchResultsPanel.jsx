function percent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric >= 0 ? "+" : ""}${(numeric * 100).toFixed(2)}%` : "—";
}

export function ResearchResultsPanel({ lang, dataset, backtest, status, error, onRefresh, onBacktest }) {
  const zh = lang === "zh";
  const result = backtest?.metrics ? backtest : null;
  const datasetVersion = dataset?.fingerprint?.slice(0, 12);

  return <section className="research-results-panel" aria-label={zh ? "量化研究结果" : "Quant research results"}>
    <header>
      <div>
        <small>{zh ? "Qlib · 只读研究" : "Qlib · read-only research"}</small>
        <h3>{zh ? "因子研究与回测" : "Factor research and backtest"}</h3>
      </div>
      {datasetVersion && <span>{zh ? "数据版本" : "Dataset version"} · {datasetVersion}</span>}
    </header>
    {!dataset && <div className="research-empty"><p>{zh ? "尚无可用研究数据。" : "No research dataset is available."}</p><button type="button" className="ghost" onClick={onRefresh} disabled={status === "refreshing"}>{status === "refreshing" ? (zh ? "正在刷新…" : "Refreshing…") : (zh ? "刷新研究数据" : "Refresh research data")}</button></div>}
    {dataset && <div className="research-controls"><small>{zh ? `截至 ${dataset.end_date ?? "—"} · ${dataset.symbols?.length ?? "—"} 只股票` : `As of ${dataset.end_date ?? "—"} · ${dataset.symbols?.length ?? "—"} symbols`}</small><button type="button" className="ghost" onClick={onBacktest} disabled={status === "backtesting" || status === "refreshing"}>{status === "backtesting" ? (zh ? "回测运行中…" : "Backtest running…") : (zh ? "运行回测" : "Run backtest")}</button></div>}
    {result && <div className="research-metrics"><span><small>{zh ? "组合收益" : "Portfolio return"}</small><b className={result.metrics.cumulative_return >= 0 ? "up" : "down"}>{percent(result.metrics.cumulative_return)}</b></span><span><small>{zh ? "基准收益" : "Benchmark return"}</small><b>{percent(result.metrics.benchmark_cumulative_return)}</b></span><span><small>Sharpe</small><b>{Number(result.metrics.sharpe).toFixed(2)}</b></span><span><small>{zh ? "最大回撤" : "Max drawdown"}</small><b className="down">{percent(result.metrics.max_drawdown)}</b></span></div>}
    {error && <p className="research-error">{error.message ?? (zh ? "研究请求暂不可用。" : "Research request is unavailable.")}</p>}
  </section>;
}
