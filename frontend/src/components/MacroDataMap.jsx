import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { filterMacroSeries, zScore } from "../utils/metrics.js";

const MACRO_GROUPS = ["All", "Growth", "Liquidity", "Inflation", "Property", "Rates", "External"];

function macroDirection(points) {
  const values = (points ?? []).map((point) => Number(point?.value)).filter(Number.isFinite);
  if (values.length < 2) return "flat";
  const first = values[0];
  const last = values.at(-1);
  const tolerance = Math.max(0.000001, Math.abs(first) * 0.001);
  if (Math.abs(last - first) <= tolerance) return "flat";
  return last > first ? "up" : "down";
}

export function MacroDataMap({ t, series, selectedIndicator, sectionRef, onSelectIndicator }) {
  const [macroQuery, setMacroQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const visibleSeries = useMemo(() => filterMacroSeries(series, {
    group: activeGroup,
    query: macroQuery,
    macroLabels: t.macro,
    groupLabels: t.groups,
  }), [activeGroup, macroQuery, series, t.groups, t.macro]);

  return (
    <section className="macro-data-map nav-target" ref={sectionRef} aria-labelledby="macro-data-map-title">
      <header className="region-heading macro-data-map-heading">
        <div>
          <small>{t.macroSeries}</small>
          <h3 id="macro-data-map-title">{t.macroMap}</h3>
        </div>
        <label className="macro-search">
          <Search size={15} aria-hidden="true" />
          <input value={macroQuery} onChange={(event) => setMacroQuery(event.target.value)} placeholder={t.macroSearch} aria-label={t.macroSearch} />
        </label>
      </header>
      <div className="segmented macro-groups" role="group" aria-label={t.macroGroupFilter}>
        {MACRO_GROUPS.map((group) => (
          <button type="button" className={activeGroup === group ? "selected" : ""} aria-pressed={activeGroup === group} onClick={() => setActiveGroup(group)} key={group}>
            {t.groups[group]}
          </button>
        ))}
      </div>
      <div className="macro-list">
        {visibleSeries.length === 0 && <p className="macro-empty" role="status">{t.noMacroMatches}</p>}
        {visibleSeries.map((item) => {
          const selected = selectedIndicator === item.key;
          const score = item.score ?? zScore(item.z, item.direction);
          const direction = macroDirection(item.points);
          const valueLabel = `${item.value ?? "--"}${item.unit ?? ""}`;
          return (
            <button
              type="button"
              className={`macro-row${selected ? " selected" : ""}`}
              aria-pressed={selected}
              aria-label={`${t.compareMacro}: ${t.macro[item.key] ?? item.key}, ${valueLabel}, ${t.macroSupportScore} ${score}, ${t.macroDirection[direction]}`}
              onClick={() => onSelectIndicator(item.key)}
              key={item.key}
            >
              <span className="macro-row-identity">
                <strong>{t.macro[item.key] ?? item.key}</strong>
                <small>{item.api}{item.source ? ` · ${item.source}` : ""}{item.latestDate ? ` · ${item.latestDate}` : ""}{item.error ? ` · ${item.error}` : ""}</small>
              </span>
              <b>{valueLabel}</b>
              <em title={t.macroSupportScore}>{score} · {t.macroDirection[direction]}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
