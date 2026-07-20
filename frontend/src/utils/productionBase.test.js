import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("allows the production asset base to follow the deployment prefix", async () => {
  const config = await readFile(new URL("../../vite.config.mjs", import.meta.url), "utf8");

  assert.match(config, /base:\s*process\.env\.VITE_DEPLOY_BASE\s*\?\?\s*"\/"/);
});
