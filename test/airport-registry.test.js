import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AIRPORTS,
  AIRPORT_IDS,
  DIRECT_RAIL_AIRPORT_IDS,
  airportText,
  airportUrl,
  regionalCurrentData,
  resolveAirport
} from "../src/airport-registry.js";
import { NATIONAL_AIRPORT_CATALOG } from "../src/national-airport-catalog.js";

test("regional international airports are available through one registry", () => {
  assert.equal(AIRPORT_IDS.length, 33);
  assert.deepEqual(AIRPORT_IDS.slice(0, 4), ["nrt", "tak", "ibr", "akj"]);
  assert.equal(resolveAirport("?airport=tak").code, "TAK");
  assert.equal(resolveAirport("?airport=ibr").code, "IBR");
  assert.equal(resolveAirport("?airport=akj").code, "AKJ");
  assert.equal(resolveAirport("?airport=not-configured").code, "NRT");
});

test("each regional airport provides transport, disaster and multilingual official links", () => {
  for (const id of AIRPORT_IDS.filter((airportId) => airportId !== "nrt")) {
    const airport = AIRPORTS[id];
    assert.equal(airport.rights.mode, "official_link_only");
    assert.equal(airport.rights.clearance, "no_republication");
    assert.ok(airport.directFlights.source.startsWith("https://"));
    assert.equal(airport.directFlights.checkedAt, "2026-08-17");
    for (const linkKey of ["arrivals", "departures", "alerts", "access", "bus", "taxi", "disaster", "municipality", "multilingual", "weather"]) {
      assert.ok(airport.links[linkKey].startsWith("https://"), `${id}.${linkKey}`);
    }
    const categories = new Set(airport.services.map((service) => service.category));
    assert.equal(categories.has("railway"), airport.railAccess === "direct", `${id}.railway`);
    assert.ok(categories.has("bus"));
    assert.ok(categories.has("road"));
    assert.ok(categories.has("facility"));
    assert.ok(airport.network.features.some((feature) => feature.properties.category === "bus"));
  }
});

test("all airports classify on-airport rail explicitly and never model bus connections as rail", () => {
  const directIds = ["nrt", "cts", "hnd", "kix", "ngo", "fuk", "sdj", "oka", "kmi", "ygj"];
  assert.deepEqual([...DIRECT_RAIL_AIRPORT_IDS].sort(), [...directIds].sort());
  for (const id of directIds) {
    assert.equal(AIRPORTS[id].railAccess, "direct", id);
    assert.ok(AIRPORTS[id].services?.some((service) => service.category === "railway") || id === "nrt", `${id}.railway service`);
  }
  for (const id of AIRPORT_IDS.filter((airportId) => !directIds.includes(airportId))) {
    assert.equal(AIRPORTS[id].railAccess, "none", id);
    assert.equal(AIRPORTS[id].services.some((service) => service.category === "railway"), false, `${id}.railway service`);
    assert.equal(AIRPORTS[id].statusGroups.some((group) => group.id === "rail"), false, `${id}.rail status group`);
    assert.equal(AIRPORTS[id].overview.some((item) => item.id === "rail"), false, `${id}.rail overview`);
  }
  for (const airport of Object.values(AIRPORTS)) {
    assert.equal(airport.railAccessEvidence.checkedAt, "2026-08-21", `${airport.id}.rail evidence date`);
    assert.ok(airport.railAccessEvidence.source.startsWith("https://"), `${airport.id}.rail evidence source`);
  }
});

test("regional pages publish links and reference geometry without inventing transport status", () => {
  for (const id of AIRPORT_IDS.filter((airportId) => airportId !== "nrt")) {
    const data = regionalCurrentData(AIRPORTS[id], new Date("2026-08-17T12:00:00Z"));
    assert.equal(data.metadata.mode, "official_links");
    assert.equal(data.metadata.status, "source_only");
    assert.equal(data.metadata.source_policy, "official_link_only");
    assert.ok(data.features.length > 0);
    assert.ok(data.features.every((feature) => feature.properties.status === "unknown"));
    assert.ok(data.features.every((feature) => feature.properties.source_scope === "network_reference_only"));
  }
});

test("the 2026 MLIT direct-international schedule is completely represented", () => {
  const mlitCodes = [
    "OBO", "CTS", "HKD", "AOJ", "HNA", "SDJ", "IBR", "NRT", "HND", "KIJ", "TOY", "KMQ", "FSZ", "NGO", "KIX",
    "OKJ", "HIJ", "YGJ", "TAK", "TKS", "MYJ", "KKJ", "FUK", "HSG", "NGS", "OIT", "KMJ", "KMI", "KOJ", "OKA", "SHI", "ISG"
  ];
  assert.equal(NATIONAL_AIRPORT_CATALOG.length, 29);
  assert.deepEqual(new Set(mlitCodes), new Set(Object.values(AIRPORTS).map((item) => item.code).filter((code) => code !== "AKJ")));
});

test("every generated national access route is static, attributed and routable", () => {
  for (const item of NATIONAL_AIRPORT_CATALOG) {
    const airport = AIRPORTS[item.id];
    const route = airport.network.features.find((feature) => feature.properties.kind === "route");
    assert.ok(route.geometry.coordinates.length >= 2, item.code);
    assert.equal(route.properties.source_scope, "network_reference_only");
    assert.match(airport.network.metadata.source, /OpenStreetMap/);
    assert.match(airport.network.metadata.status_meaning, /does not indicate operation/);
  }
});

test("every national airport official host is allowlisted", async () => {
  const registry = JSON.parse(await readFile(new URL("../scripts/config/official-sources.json", import.meta.url), "utf8"));
  const allowed = new Set(registry.allowed_hosts);
  for (const item of NATIONAL_AIRPORT_CATALOG) {
    for (const url of [item.home, item.flight, item.access, item.localSupport.disaster, item.localSupport.shelter, item.localSupport.multilingual]) {
      assert.ok(allowed.has(new URL(url).hostname), `${item.code}: ${url}`);
    }
  }
});

test("national airport names do not fall back to English in Chinese or Korean", () => {
  for (const item of NATIONAL_AIRPORT_CATALOG) {
    for (const locale of ["zh-CN", "zh-TW", "ko"]) {
      assert.notEqual(item.name[locale], item.name.en, `${item.code}.${locale}`);
      assert.ok(item.name[locale].trim().length > 0, `${item.code}.${locale}`);
    }
  }
});

test("every national airport uses airport-municipality disaster and shelter links", () => {
  for (const item of NATIONAL_AIRPORT_CATALOG) {
    assert.ok(item.localSupport.municipality.ja.length > 0, item.code);
    assert.equal(item.localSupport.sourcePolicy, "official_link_only");
    assert.equal(item.localSupport.checkedAt, "2026-08-17");
    assert.ok(item.localSupport.disaster.startsWith("https://"), `${item.code}.disaster`);
    assert.ok(item.localSupport.shelter.startsWith("https://"), `${item.code}.shelter`);

    const airport = AIRPORTS[item.id];
    assert.equal(airport.links.disaster, item.localSupport.disaster);
    assert.equal(airport.links.municipality, item.localSupport.shelter);
    assert.equal(airport.support.find((entry) => entry.id === "local-disaster")?.linkKey, "disaster");
    assert.equal(airport.support.find((entry) => entry.id === "local-shelter")?.linkKey, "municipality");
  }
});

test("airport and locale selection preserve the static site route", () => {
  assert.equal(airportText(AIRPORTS.tak.name, "en"), "Takamatsu Airport");
  assert.equal(airportText(AIRPORTS.ibr.name, "ko"), "이바라키공항");
  const next = new URL(airportUrl("akj", "https://example.test/app/?view=history&start=x#map"));
  assert.equal(next.searchParams.get("airport"), "akj");
  assert.equal(next.searchParams.has("view"), false);
  assert.equal(next.hash, "");
});
