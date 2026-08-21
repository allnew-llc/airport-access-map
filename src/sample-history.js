const SAMPLE_CATEGORIES = new Set(["railway", "bus", "road", "facility", "weather"]);
const SAMPLE_STATUSES = new Set(["normal", "warning", "suspended"]);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function validateSampleHistoryForBrowser(document) {
  if (document?.schema_version !== "sample-history/1" || document?.type !== "SampleHistory") {
    throw new Error("Sample history data is invalid");
  }
  const periodStart = Date.parse(document.metadata?.period_start);
  const periodEnd = Date.parse(document.metadata?.period_end);
  if (document.metadata?.sample_data !== true
    || document.metadata?.fictional !== true
    || document.metadata?.time_zone !== "Asia/Tokyo"
    || periodEnd - periodStart !== WEEK_MS) {
    throw new Error("Sample history policy is invalid");
  }
  if (!Array.isArray(document.snapshots) || document.snapshots.length < 29) {
    throw new Error("Sample history is incomplete");
  }

  let previous = -Infinity;
  for (const snapshot of document.snapshots) {
    const observedAt = Date.parse(snapshot.observed_at);
    const collection = snapshot.collection;
    if (!Number.isFinite(observedAt)
      || observedAt <= previous
      || snapshot.evidence_class !== "synthetic_sample"
      || snapshot.event_kind !== "traffic"
      || collection?.type !== "FeatureCollection"
      || collection.metadata?.sample_data !== true
      || !Array.isArray(collection.features)
      || collection.features.length === 0) {
      throw new Error("Sample history snapshot is invalid");
    }
    for (const feature of collection.features) {
      if (feature?.properties?.sample_data !== true
        || feature.properties.source_scope !== "synthetic_sample"
        || !SAMPLE_CATEGORIES.has(feature.properties.category)
        || !SAMPLE_STATUSES.has(feature.properties.status)) {
        throw new Error("Sample history feature is invalid");
      }
    }
    previous = observedAt;
  }
  return document;
}

export function sampleSnapshotText(snapshot, field, locale) {
  if (locale === "ja") return snapshot?.[field] ?? "";
  return snapshot?.translations?.[locale]?.[field] ?? snapshot?.[field] ?? "";
}
