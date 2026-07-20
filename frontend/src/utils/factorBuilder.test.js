import test from "node:test";
import assert from "node:assert/strict";

import { copyFactorDraft, setDraftFactor } from "./factorBuilder.js";

const applied = {
  momentum: 68,
  quality: 52,
  valuation: 35,
  liquidity: 70,
  volatility: 45,
};

test("copies applied factors into an independent editor draft", () => {
  const draft = copyFactorDraft(applied);
  draft.momentum = 85;

  assert.equal(applied.momentum, 68);
  assert.equal(draft.momentum, 85);
});

test("updates one draft threshold without mutating its input", () => {
  const next = setDraftFactor(applied, "quality", "84");

  assert.deepEqual(next, { ...applied, quality: 84 });
  assert.equal(applied.quality, 52);
});
