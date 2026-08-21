import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildNetworkFeatureCollection, validateNetworkFeatureCollection } from "./lib/network-geometry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const queryPath = resolve(root, "scripts/config/access-network.overpassql");
const outputPath = resolve(root, "public/data/access-network.geojson");
const endpoints = process.env.OVERPASS_ENDPOINT
  ? [process.env.OVERPASS_ENDPOINT]
  : ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const validateOnly = process.argv.includes("--validate-only");

async function validateExisting() {
  const existing = JSON.parse(await readFile(outputPath, "utf8"));
  const result = validateNetworkFeatureCollection(existing);
  console.log(`Network geometry gate: PASS (${result.lineCount} line features, ${result.routeCount} routes)`);
}

async function fetchAndBuild() {
  const query = await readFile(queryPath, "utf8");
  let payload;
  const failures = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "NARITA-ACCESS-NOW/0.1 (static open-source route geometry build)"
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(180_000)
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 160).replace(/\s+/g, " ");
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }
      payload = await response.json();
      break;
    } catch (error) {
      failures.push(`${endpoint} (${error.message})`);
    }
  }
  if (!payload) throw new Error(`All Overpass endpoints failed: ${failures.join("; ")}`);
  const collection = buildNetworkFeatureCollection(payload, {
    generatedAt: new Date().toISOString(),
    querySha256: createHash("sha256").update(query).digest("hex")
  });
  const result = validateNetworkFeatureCollection(collection);
  await mkdir(dirname(outputPath), { recursive: true });
  const candidatePath = `${outputPath}.candidate`;
  await writeFile(candidatePath, `${JSON.stringify(collection)}\n`, "utf8");
  JSON.parse(await readFile(candidatePath, "utf8"));
  await rename(candidatePath, outputPath);
  console.log(`Network geometry updated: ${result.lineCount} line features, ${result.routeCount} routes`);
}

try {
  if (validateOnly) await validateExisting();
  else await fetchAndBuild();
} catch (error) {
  console.error(`Network geometry Andon: BLOCKED (${error.message})`);
  process.exitCode = 1;
}
