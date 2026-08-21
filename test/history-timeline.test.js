import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryCollection, createHistoryTimeline } from "../src/history-timeline.js";

function sampleHistory() {
  const snapshots = Array.from({ length: 29 }, (_, index) => {
    const observedAt = new Date(Date.parse("2026-08-10T00:00:00+09:00") + index * 6 * 60 * 60 * 1000).toISOString();
    return {
      id: `sample-${index}`,
      observed_at: observedAt,
      event_kind: "traffic",
      evidence_class: "synthetic_sample",
      headline: `Sample ${index}`,
      summary: "Fictional sample",
      source_url: "https://allnew.work/demo/airport-access/",
      collection: {
        type: "FeatureCollection",
        metadata: { sample_data: true, fictional: true, generated_at: observedAt },
        features: [{
          type: "Feature",
          geometry: { type: "Point", coordinates: [140.3863, 35.772] },
          properties: {
            id: `sample-feature-${index}`,
            category: "road",
            status: "normal",
            source_scope: "synthetic_sample",
            sample_data: true
          }
        }]
      }
    };
  });
  return {
    schema_version: "sample-history/1",
    type: "SampleHistory",
    metadata: {
      period_start: "2026-08-10T00:00:00+09:00",
      period_end: "2026-08-17T00:00:00+09:00",
      time_zone: "Asia/Tokyo",
      sample_data: true,
      fictional: true
    },
    snapshots
  };
}

test("fictional sample history becomes the only supported replay timeline", () => {
  const document = sampleHistory();
  const timeline = createHistoryTimeline([{ format: "sample-history/1", document }]);
  assert.equal(timeline.snapshots.length, 29);
  const collection = buildHistoryCollection(timeline, 0);
  assert.equal(collection.metadata.mode, "historical_replay");
  assert.equal(collection.metadata.sample_data, true);
  assert.equal(collection.metadata.fictional, true);
  assert.equal(collection.features[0].properties.source_scope, "synthetic_sample");
});

test("non-sample history is rejected at the public boundary", () => {
  assert.throws(
    () => createHistoryTimeline([{ format: "rolling-history/1", document: {} }]),
    /Only fictional sample history/
  );
});
