import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceRegistry, validateSourceRegistry } from "../scripts/lib/source-policy.js";
import {
  CURRENT_STATUS_GROUPS,
  JOURNEY_MODES,
  MUNICIPAL_SUPPORT,
  OFFICIAL_LINKS,
  REGIONS,
  TRANSPORT_OPTIONS,
  travelerMessages,
  routeStatusKey,
  userFacingTransportStatus,
  worstStatus
} from "../src/journey-guidance.js";
import { SUPPORTED_LOCALES } from "../src/i18n.js";

test("arrival and departure journeys have distinct official first actions", () => {
  assert.deepEqual(Object.keys(JOURNEY_MODES).sort(), ["arrival", "departure"]);
  assert.ok(JOURNEY_MODES.arrival.actionKeys.some(([, link]) => link === "arrivals"));
  assert.ok(JOURNEY_MODES.departure.actionKeys.some(([, link]) => link === "departures"));
  assert.ok(JOURNEY_MODES.departure.actionKeys.some(([, link]) => link === "airlines"));
  assert.equal(JOURNEY_MODES.arrival.checklistKeys.length, 3);
  assert.equal(JOURNEY_MODES.departure.checklistKeys.length, 3);
});

test("every traveler-facing official link is HTTPS and allowlisted", async () => {
  const registry = validateSourceRegistry(await loadSourceRegistry());
  for (const [key, value] of Object.entries(OFFICIAL_LINKS)) {
    const url = new URL(value);
    assert.equal(url.protocol, "https:", key);
    assert.ok(registry.allowed_hosts.includes(url.hostname), `${key} host is not allowlisted`);
  }
});

test("traveler guidance has parity across all five languages", () => {
  const japaneseKeys = Object.keys(travelerMessages.ja).sort();
  assert.ok(japaneseKeys.length >= 60);
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(travelerMessages[locale]).sort(), japaneseKeys, `${locale} traveler catalog drift`);
  }
  assert.equal(REGIONS.length, 5);
  assert.equal(TRANSPORT_OPTIONS.length, 3);
});

test("airport stay choice is expressed as an intention in all five languages", () => {
  const expected = {
    ja: "空港に滞在",
    en: "Stay at airport",
    "zh-CN": "留在机场",
    "zh-TW": "留在機場",
    ko: "공항에 머물기"
  };
  assert.deepEqual(
    Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, travelerMessages[locale].quickSupportAction])),
    expected
  );
  assert.deepEqual(
    Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, travelerMessages[locale].mapJourneyStranded])),
    expected
  );
  assert.ok(SUPPORTED_LOCALES.every((locale) => !/\bhelp\b/i.test(travelerMessages[locale].quickSupportAction)));
});

test("transport summary reports worst recorded event without claiming unknown services operate", () => {
  const features = [
    { properties: { category: "railway", status: "normal" } },
    { properties: { category: "railway", status: "suspended" } },
    { properties: { category: "road", status: "warning", source_scope: "source_reachability_only" } }
  ];
  assert.equal(worstStatus(features, "railway"), "suspended");
  assert.equal(worstStatus(features, "road"), "unknown");
  assert.equal(worstStatus(features, null), "unknown");
  assert.equal(worstStatus(features, "weather"), "unknown");
});

test("traveler-facing transport status is limited to three operational states", () => {
  assert.equal(userFacingTransportStatus("normal"), "normal");
  assert.equal(userFacingTransportStatus("warning"), "warning");
  assert.equal(userFacingTransportStatus("suspended"), "suspended");
  for (const internalState of ["unknown", "unconfirmed", "demo", undefined]) {
    assert.equal(userFacingTransportStatus(internalState), null);
    assert.equal(routeStatusKey(internalState), null);
  }
  assert.equal(routeStatusKey("normal"), "routeStatusNormal");
  assert.equal(routeStatusKey("warning"), "routeStatusWarning");
  assert.equal(routeStatusKey("suspended"), "routeStatusSuspended");
});

test("a source-only feature never turns a partially verified category green", () => {
  const features = [
    { properties: { category: "railway", status: "normal", source_scope: "official_page_keyword_classification" } },
    { properties: { category: "railway", status: "warning", source_scope: "source_reachability_only" } }
  ];
  assert.equal(worstStatus(features, "railway"), "unknown");
});

test("current-conditions board covers rail, bus, expressway, general roads and airport alerts", () => {
  const items = CURRENT_STATUS_GROUPS.flatMap((group) => group.items);
  assert.deepEqual(CURRENT_STATUS_GROUPS.map((group) => group.id), ["rail", "bus", "road", "airport"]);
  for (const id of ["jr-narita", "keisei", "hokuso", "airport-bus", "limousine-bus", "keisei-bus", "expressway", "general-roads", "airport-alerts"]) {
    assert.ok(items.some((item) => item.id === id), `${id} is missing from current conditions`);
  }
  assert.equal(items.find((item) => item.id === "jr-narita").evidence, "reported");
  assert.ok(items.filter((item) => item.id !== "jr-narita").every((item) => item.evidence === "source_only"));
  assert.ok(items.every((item) => item.observationId?.startsWith("observe-")), "every service needs an observation binding");
});

test("stranded support links airport, prefecture and surrounding municipalities", () => {
  assert.deepEqual(MUNICIPAL_SUPPORT.map((resource) => resource.id), ["airport", "chiba", "narita", "shibayama", "tomisato", "foreign"]);
});
