export function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

export function zScore(z, direction = 1) {
  return clamp(Math.round(50 + z * direction * 18));
}

export function weightedScore(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  return Math.round(items.reduce((sum, item) => sum + zScore(item.z, item.direction) * item.weight, 0) / total);
}

export function searchableText(...values) {
  return values
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

export function filterMacroSeries(
  items,
  { group = "All", query = "", macroLabels = {}, groupLabels = {} } = {},
) {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesGroup = group === "All" || item.group === group;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      searchableText(
        item.key,
        macroLabels[item.key],
        item.group,
        groupLabels[item.group],
        item.api,
        item.value,
        item.score,
        item.source,
      ).includes(normalizedQuery);

    return matchesGroup && matchesQuery;
  });
}
