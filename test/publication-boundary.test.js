import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public clone starts the fictional demo without excluded live-data files", async () => {
  const [readme, packageText] = await Promise.all([read("README.md"), read("package.json")]);
  const packageJson = JSON.parse(packageText);

  assert.match(readme, /VITE_SAMPLE_DEMO=true VITE_PUBLIC_BASE=\/ npm run dev/);
  assert.doesNotMatch(readme, /\nnpm run dev\n/);
  assert.equal(packageJson.scripts["history:update"], undefined);
  await assert.rejects(access(new URL("../scripts/config/historical-secondary-sources.json", import.meta.url)));
});

test("consent navigation respects the deployment base path", async () => {
  const script = await read("public/demo-intro-v6.js");
  assert.match(script, /new URL\(destination, document\.baseURI\)/);
  assert.match(script, /airport-access-demo-terms-v4/);
  assert.doesNotMatch(script, /new URL\(destination, globalThis\.location\.href\)/);
});

test("all legal locales disclose GitHub Pages and the MapLibre licence", async () => {
  const [privacy, terms, mapLibreLicence] = await Promise.all([
    read("public/privacy.html"),
    read("public/terms.html"),
    read("public/licenses/MapLibre-GL-JS-LICENSE.txt"),
  ]);

  assert.equal((privacy.match(/GitHub Pages/g) ?? []).length, 5);
  assert.equal((terms.match(/GitHub Pages/g) ?? []).length, 5);
  assert.equal((terms.match(/MapLibre-GL-JS-LICENSE\.txt/g) ?? []).length, 5);
  assert.match(mapLibreLicence, /Copyright \(c\) 2023, MapLibre contributors/);
  assert.match(mapLibreLicence, /Redistribution and use in source and binary forms/);
});

test("public-facing documents describe the current product instead of development defects", async () => {
  const documents = await Promise.all([
    read("README.md"),
    read("docs/project-overview.md"),
    read("docs/traveler-needs.md"),
    read("docs/map-first-information-design.md"),
    read("docs/mobile-first-screen-390x844.md"),
    read("docs/usability-10-second-task-test-2026-08-17.md"),
    read("docs/ux-research-dads-tokyo-2026-08-17.md"),
    read("docs/ux-ui-guideline-application-2026-08-15.md"),
  ]);
  const publicCopy = documents.join("\n");

  assert.doesNotMatch(publicCopy, /空港直結鉄道がない空港を鉄道路線のように描かない/);
  assert.doesNotMatch(publicCopy, /発見・是正した問題/);
  assert.doesNotMatch(publicCopy, /ドラッグハンドル風の装飾/);
  assert.doesNotMatch(publicCopy, /内部Factory設定|内部監査証跡/);
  assert.doesNotMatch(publicCopy, /# D案/);
  assert.doesNotMatch(publicCopy, /自動検証は32件/);
  assert.doesNotMatch(publicCopy, /移動不能|移動できないとき/);
});

test("GitHub Actions use immutable action revisions and separate PR verification from Pages deployment", async () => {
  const [pagesWorkflow, testWorkflow] = await Promise.all([
    read(".github/workflows/pages.yml"),
    read(".github/workflows/test.yml"),
  ]);

  assert.doesNotMatch(pagesWorkflow, /^\s*pull_request:/m);
  assert.match(testWorkflow, /^\s*pull_request:/m);
  for (const workflow of [pagesWorkflow, testWorkflow]) {
    assert.doesNotMatch(workflow, /uses:\s*[^\s]+@v\d+/);
    for (const action of workflow.matchAll(/uses:\s*[^@\s]+@([a-f0-9]{40})/g)) {
      assert.equal(action[1].length, 40);
    }
  }
});
