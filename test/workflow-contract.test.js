import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public Pages workflow builds fictional data without live collection", async () => {
  const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(workflow, /npm run verify:oss/);
  assert.match(workflow, /actions\/upload-pages-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[a-f0-9]{40}/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.doesNotMatch(workflow, /TRAFFIC_MODE:\s*live/);
  assert.doesNotMatch(workflow, /WEATHER_MODE:\s*live/);
  assert.doesNotMatch(workflow, /npm run (data:update|history:update)/);
});
