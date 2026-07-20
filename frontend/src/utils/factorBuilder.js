export const FACTOR_KEYS = Object.freeze([
  "momentum",
  "quality",
  "valuation",
  "liquidity",
  "volatility",
]);

export function copyFactorDraft(factors = {}) {
  return Object.fromEntries(FACTOR_KEYS.map((key) => [key, Number(factors[key] ?? 0)]));
}

export function setDraftFactor(draft, key, value) {
  if (!FACTOR_KEYS.includes(key)) return copyFactorDraft(draft);
  return { ...copyFactorDraft(draft), [key]: Number(value) };
}
