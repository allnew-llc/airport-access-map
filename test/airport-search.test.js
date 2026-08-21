import assert from "node:assert/strict";
import test from "node:test";
import { AIRPORTS } from "../src/airport-registry.js";
import { filterAirports } from "../src/airport-search.js";

const airports = Object.values(AIRPORTS);

test("airport search finds airports by IATA code and multilingual names", () => {
  assert.deepEqual(filterAirports(airports, "HND").map(({ id }) => id), ["hnd"]);
  assert.deepEqual(filterAirports(airports, "羽田").map(({ id }) => id), ["hnd"]);
  assert.deepEqual(filterAirports(airports, "하네다").map(({ id }) => id), ["hnd"]);
  assert.deepEqual(filterAirports(airports, "宮崎").map(({ id }) => id), ["kmi"]);
});

test("airport search supports normalization, all-results and empty-results states", () => {
  assert.deepEqual(filterAirports(airports, "ｈｎｄ").map(({ id }) => id), ["hnd"]);
  assert.equal(filterAirports(airports, "").length, airports.length);
  assert.deepEqual(filterAirports(airports, "no-such-airport"), []);
});
