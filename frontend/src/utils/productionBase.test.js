import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("allows the production asset base to follow the deployment prefix", async () => {
  const config = await readFile(new URL("../../vite.config.mjs", import.meta.url), "utf8");

  assert.match(config, /base:\s*process\.env\.VITE_DEPLOY_BASE\s*\?\?\s*"\/"/);
});

test("uses an unblocked same-origin development API proxy", async () => {
  const [viteConfig, apiConfig] = await Promise.all([
    readFile(new URL("../../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../config.js", import.meta.url), "utf8"),
  ]);

  assert.match(apiConfig, /VITE_API_BASE_URL\s*\?\?\s*"\/quantdesk-api"/);
  assert.match(viteConfig, /proxy:\s*\{[\s\S]*"\/quantdesk-api"\s*:\s*\{/);
  assert.match(viteConfig, /rewrite:\s*\(path\)\s*=>\s*path\.replace\("\/quantdesk-api",\s*""\)/);
});
