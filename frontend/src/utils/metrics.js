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
