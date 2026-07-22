import test from "node:test";
import assert from "node:assert/strict";

import { clearPasswordResetPath, getPasswordResetToken } from "./passwordResetUrl.js";

test("reads a reset token only from the reset-password route", () => {
  assert.equal(getPasswordResetToken("/stock-macro/reset-password", "?token=abc123"), "abc123");
  assert.equal(getPasswordResetToken("/reset-password/", "?token=abc123"), "abc123");
  assert.equal(getPasswordResetToken("/stock-macro/", "?token=abc123"), null);
  assert.equal(getPasswordResetToken("/stock-macro/reset-password", ""), null);
});

test("clears only the token route while preserving a deployed base path", () => {
  assert.equal(clearPasswordResetPath("/stock-macro/reset-password"), "/stock-macro/");
  assert.equal(clearPasswordResetPath("/reset-password/"), "/");
});
