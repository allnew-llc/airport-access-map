import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateFeatureCollection, writeAndonProtectedJson } from "../scripts/lib/andon-gate.js";

const hosts = ["data.jma.go.jp"];

function validCollection() {
  return {
    type: "FeatureCollection",
    metadata: { generated_at: "2026-08-14T21:00:00+09:00", status: "normal", mode: "demo" },
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: [140.3863, 35.7720] },
      properties: {
        id: "evt-001",
        category: "weather",
        status: "warning",
        title: "テスト警報",
        source: "気象庁",
        source_url: "https://data.jma.go.jp/developer/",
        updated_at: "2026-08-14T20:50:00+09:00"
      }
    }]
  };
}

test("valid FeatureCollection passes", () => {
  assert.equal(validateFeatureCollection(validCollection(), hosts).features.length, 1);
});

test("empty candidates fail closed", () => {
  const candidate = validCollection();
  candidate.features = [];
  assert.throws(() => validateFeatureCollection(candidate, hosts), /must not be empty/);
});

test("unofficial source URLs are blocked", () => {
  const candidate = validCollection();
  candidate.features[0].properties.source_url = "https://example.com/unverified";
  assert.throws(() => validateFeatureCollection(candidate, hosts), /official allowlist/);
});

test("demo events without complete multilingual text are blocked", () => {
  const candidate = validCollection();
  candidate.features[0].properties.data_mode = "demo";
  assert.throws(() => validateFeatureCollection(candidate, hosts), /translations is required/);
});

test("source observations require bounded confidence and an official URL", () => {
  const candidate = validCollection();
  candidate.metadata.source_observations = [{
    id: "observe-test",
    source_id: "test",
    source: "気象庁",
    source_url: "https://data.jma.go.jp/developer/",
    observed_at: "2026-08-14T20:50:00+09:00",
    confidence: "low",
    method: "source_reachability_only",
    result: "source_reachable",
    decision_status: "unconfirmed"
  }];
  assert.equal(validateFeatureCollection(candidate, hosts).metadata.source_observations.length, 1);
  candidate.metadata.source_observations[0].confidence = "certain";
  assert.throws(() => validateFeatureCollection(candidate, hosts), /invalid source observation confidence/);
});

test("invalid candidate never replaces the last good file", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "andon-gate-"));
  const output = path.join(directory, "latest.json");
  const original = "{\"last_good\":true}\n";
  await writeFile(output, original, "utf8");
  const candidate = validCollection();
  candidate.features = [];

  await assert.rejects(writeAndonProtectedJson(output, candidate, hosts), /must not be empty/);
  assert.equal(await readFile(output, "utf8"), original);
  await rm(directory, { recursive: true, force: true });
});

test("valid candidate replaces output atomically", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "andon-gate-"));
  const output = path.join(directory, "latest.json");
  await writeFile(output, "{\"last_good\":true}\n", "utf8");
  await writeAndonProtectedJson(output, validCollection(), hosts);
  const parsed = JSON.parse(await readFile(output, "utf8"));
  assert.equal(parsed.features[0].properties.id, "evt-001");
  await rm(directory, { recursive: true, force: true });
});
