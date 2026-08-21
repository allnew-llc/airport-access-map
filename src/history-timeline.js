import { validateSampleHistoryForBrowser } from "./sample-history.js";

export function createHistoryTimeline(bundles) {
  if (!Array.isArray(bundles) || bundles.length === 0) throw new Error("Sample history timeline is empty");
  const entries = bundles.flatMap(({ format, document }) => {
    if (format !== "sample-history/1") throw new Error("Only fictional sample history is supported");
    return validateSampleHistoryForBrowser(document).snapshots.map((snapshot, snapshotIndex) => ({
      kind: "sample",
      document,
      snapshotIndex,
      observed_at: snapshot.observed_at,
      snapshot
    }));
  }).sort((left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at));

  const unique = [];
  const ids = new Set();
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.snapshot.id}`;
    if (ids.has(key)) continue;
    ids.add(key);
    unique.push(entry);
  }
  if (unique.length === 0) throw new Error("Sample history timeline is empty");
  return {
    type: "HistoryTimeline",
    entries: unique,
    snapshots: unique.map((entry) => entry.snapshot)
  };
}

export function buildHistoryCollection(timeline, index) {
  const entry = timeline?.entries?.[index];
  if (!entry || entry.kind !== "sample") throw new Error(`Sample history timeline entry ${index} does not exist`);
  const collection = structuredClone(entry.snapshot.collection);
  collection.metadata = {
    ...collection.metadata,
    generated_at: entry.snapshot.observed_at,
    observed_at: entry.snapshot.observed_at,
    status: "normal",
    mode: "historical_replay",
    replay_index: index,
    replay_total: timeline.entries.length,
    replay_snapshot: entry.snapshot,
    transport_status: "synthetic_sample",
    transport_inference: "not_applicable",
    sample_data: true,
    fictional: true,
    not_for_travel_decisions: true,
    source_observations: []
  };
  collection.features = collection.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      data_mode: "synthetic_sample",
      source_scope: "synthetic_sample",
      evidence_class: "synthetic_sample",
      sample_data: true,
      fictional: true,
      content_language: feature.properties?.content_language ?? "ja"
    }
  }));
  return collection;
}
