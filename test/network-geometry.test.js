import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const networkUrl = new URL("../public/data/access-network.geojson", import.meta.url);

test("Narita railway geometry is limited to named airport access corridors", async () => {
  const collection = JSON.parse(await readFile(networkUrl, "utf8"));
  const expectedLabels = {
    "jr-sobu": "JR総武線（東京―佐倉）",
    "jr-narita": "JR成田線（佐倉―空港）",
    "keisei-main": "京成本線",
    hokuso: "北総線区間",
    "sky-access": "成田スカイアクセス"
  };

  for (const [routeId, label] of Object.entries(expectedLabels)) {
    const lines = collection.features.filter((feature) =>
      feature.geometry?.type === "LineString" && feature.properties?.route_id === routeId
    );
    assert.ok(lines.length > 0, `${routeId} geometry`);
    assert.ok(lines.every((feature) => feature.properties.access_scope === "airport_access_corridor"));
    assert.equal(
      collection.features.find((feature) => feature.properties?.kind === "label" && feature.properties?.route_id === routeId)?.properties?.route_label,
      label
    );
  }

  const coordinates = (routeId) => collection.features
    .filter((feature) => feature.geometry?.type === "LineString" && feature.properties?.route_id === routeId)
    .flatMap((feature) => feature.geometry.coordinates);
  const sobu = coordinates("jr-sobu");
  const narita = coordinates("jr-narita");

  assert.ok(Math.min(...sobu.map(([longitude]) => longitude)) < 139.77, "JR corridor reaches Tokyo");
  assert.ok(Math.max(...sobu.map(([longitude]) => longitude)) < 140.24, "JR Sobu corridor stops around Sakura");
  assert.ok(Math.min(...narita.map(([longitude]) => longitude)) > 140.22, "JR Narita corridor starts around Sakura");
  assert.ok(Math.max(...narita.map(([longitude]) => longitude)) > 140.38, "JR Narita corridor reaches the airport");
  assert.ok(Math.max(...narita.map(([, latitude]) => latitude)) < 35.79, "Abiko branch is excluded");
});
