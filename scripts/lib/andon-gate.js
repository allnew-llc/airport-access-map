import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertOfficialUrl } from "./source-policy.js";

export const CATEGORIES = new Set(["railway", "road", "weather", "facility"]);
export const STATUSES = new Set(["normal", "warning", "suspended"]);
export const OBSERVATION_CONFIDENCES = new Set(["low", "medium", "high"]);
export const OBSERVATION_RESULTS = new Set(["source_reachable", "source_unavailable", "classified_normal", "classified_warning", "classified_suspended"]);
export const OBSERVATION_DECISIONS = new Set(["unconfirmed", "normal", "warning", "suspended"]);
export const EVENT_TRANSLATION_LOCALES = Object.freeze(["en", "zh-CN", "zh-TW", "ko"]);
const GEOMETRY_TYPES = new Set(["Point", "LineString", "Polygon"]);
const TRANSLATABLE_FIELDS = Object.freeze(["title", "description", "source"]);

function assertIsoDate(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO-8601 date`);
  }
}

function coordinatePairs(geometry) {
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "LineString") return geometry.coordinates;
  return geometry.coordinates.flat();
}

function validateGeometry(geometry, index) {
  if (!geometry || !GEOMETRY_TYPES.has(geometry.type) || !Array.isArray(geometry.coordinates)) {
    throw new Error(`features[${index}].geometry is invalid`);
  }
  const pairs = coordinatePairs(geometry);
  if (pairs.length === 0) throw new Error(`features[${index}].geometry is empty`);
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2 || !pair.slice(0, 2).every(Number.isFinite)) {
      throw new Error(`features[${index}] contains an invalid coordinate`);
    }
    const [longitude, latitude] = pair;
    if (longitude < 138 || longitude > 142 || latitude < 34 || latitude > 37) {
      throw new Error(`features[${index}] coordinate is outside the Chiba safety bounds`);
    }
  }
  if (geometry.type === "LineString" && pairs.length < 2) {
    throw new Error(`features[${index}].LineString needs at least two points`);
  }
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4 || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) {
      throw new Error(`features[${index}].Polygon must have a closed outer ring`);
    }
  }
}

function validateTranslations(properties, index) {
  const translations = properties.translations;
  if (translations == null) {
    if (properties.data_mode === "demo") {
      throw new Error(`features[${index}].properties.translations is required for demo data`);
    }
    return;
  }
  if (typeof translations !== "object" || Array.isArray(translations)) {
    throw new Error(`features[${index}].properties.translations is invalid`);
  }
  for (const locale of Object.keys(translations)) {
    if (!EVENT_TRANSLATION_LOCALES.includes(locale)) {
      throw new Error(`features[${index}] contains unsupported translation locale: ${locale}`);
    }
  }
  for (const locale of EVENT_TRANSLATION_LOCALES) {
    const translation = translations[locale];
    if (properties.data_mode !== "demo" && translation == null) continue;
    if (!translation || typeof translation !== "object" || Array.isArray(translation)) {
      throw new Error(`features[${index}].properties.translations.${locale} is required`);
    }
    for (const field of TRANSLATABLE_FIELDS) {
      if (typeof translation[field] !== "string" || translation[field].trim() === "") {
        throw new Error(`features[${index}].properties.translations.${locale}.${field} is required`);
      }
    }
  }
}

function validateSourceObservations(metadata, allowedHosts) {
  const observations = metadata.source_observations;
  if (observations == null) return;
  if (!Array.isArray(observations)) throw new Error("metadata.source_observations must be an array");
  const ids = new Set();
  observations.forEach((observation, index) => {
    if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
      throw new Error(`metadata.source_observations[${index}] is invalid`);
    }
    for (const key of ["id", "source_id", "source", "source_url", "observed_at", "confidence", "method", "result", "decision_status"]) {
      if (typeof observation[key] !== "string" || observation[key].trim() === "") {
        throw new Error(`metadata.source_observations[${index}].${key} is required`);
      }
    }
    if (ids.has(observation.id)) throw new Error(`duplicate source observation id: ${observation.id}`);
    ids.add(observation.id);
    if (!OBSERVATION_CONFIDENCES.has(observation.confidence)) {
      throw new Error(`invalid source observation confidence: ${observation.confidence}`);
    }
    if (!OBSERVATION_RESULTS.has(observation.result)) {
      throw new Error(`invalid source observation result: ${observation.result}`);
    }
    if (!OBSERVATION_DECISIONS.has(observation.decision_status)) {
      throw new Error(`invalid source observation decision: ${observation.decision_status}`);
    }
    assertIsoDate(observation.observed_at, `metadata.source_observations[${index}].observed_at`);
    assertOfficialUrl(observation.source_url, allowedHosts);
  });
}

export function validateFeatureCollection(collection, allowedHosts) {
  if (collection?.type !== "FeatureCollection") throw new Error("type must be FeatureCollection");
  if (!collection.metadata || collection.metadata.status !== "normal") {
    throw new Error("metadata.status must report normal pipeline health");
  }
  assertIsoDate(collection.metadata.generated_at, "metadata.generated_at");
  validateSourceObservations(collection.metadata, allowedHosts);
  if (!Array.isArray(collection.features) || collection.features.length === 0) {
    throw new Error("Andon: candidate features must not be empty");
  }

  const ids = new Set();
  collection.features.forEach((feature, index) => {
    if (feature?.type !== "Feature") throw new Error(`features[${index}].type must be Feature`);
    validateGeometry(feature.geometry, index);
    const properties = feature.properties;
    if (!properties || typeof properties !== "object") throw new Error(`features[${index}].properties is invalid`);
    for (const key of ["id", "category", "status", "title", "source", "source_url", "updated_at"]) {
      if (typeof properties[key] !== "string" || properties[key].trim() === "") {
        throw new Error(`features[${index}].properties.${key} is required`);
      }
    }
    if (ids.has(properties.id)) throw new Error(`duplicate feature id: ${properties.id}`);
    ids.add(properties.id);
    if (!CATEGORIES.has(properties.category)) throw new Error(`invalid category: ${properties.category}`);
    if (!STATUSES.has(properties.status)) throw new Error(`invalid status: ${properties.status}`);
    assertIsoDate(properties.updated_at, `features[${index}].properties.updated_at`);
    assertOfficialUrl(properties.source_url, allowedHosts);
    validateTranslations(properties, index);
  });
  return collection;
}

export async function writeAndonProtectedJson(outputPath, candidate, allowedHosts) {
  validateFeatureCollection(candidate, allowedHosts);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.candidate-${process.pid}`;
  const serialized = `${JSON.stringify(candidate, null, 2)}\n`;

  try {
    await writeFile(temporaryPath, serialized, { encoding: "utf8", flag: "wx" });
    const handle = await open(temporaryPath, "r");
    await handle.sync();
    await handle.close();
    JSON.parse(await readFile(temporaryPath, "utf8"));
    await rename(temporaryPath, outputPath);
  } catch (error) {
    const { rm } = await import("node:fs/promises");
    await rm(temporaryPath, { force: true });
    throw error;
  }
}
