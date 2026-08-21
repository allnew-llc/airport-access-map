import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MLIT_DIRECT_FLIGHT_SOURCE, NATIONAL_AIRPORT_CATALOG } from "../src/national-airport-catalog.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(scriptDirectory, "config", "official-sources.json");
const temporaryPath = `${registryPath}.tmp`;
const registry = JSON.parse(await readFile(registryPath, "utf8"));

const requiredHosts = new Set(registry.allowed_hosts);
for (const item of NATIONAL_AIRPORT_CATALOG) {
  for (const url of [item.home, item.flight, item.access, item.localSupport.disaster, item.localSupport.shelter, item.localSupport.multilingual]) {
    requiredHosts.add(new URL(url).hostname);
  }
}
requiredHosts.add(new URL(MLIT_DIRECT_FLIGHT_SOURCE).hostname);
requiredHosts.add("disaportal.gsi.go.jp");
registry.allowed_hosts = [...requiredHosts];

const managedIds = new Set([
  "mlit-2026-summer-direct-international",
  "gsi-disaster-risk-portal",
  ...NATIONAL_AIRPORT_CATALOG.flatMap((item) => [`airport-${item.id}-official`, `airport-${item.id}-local-support`])
]);
registry.sources = registry.sources.filter((source) => !managedIds.has(source.id));
registry.sources.push({
  id: "mlit-2026-summer-direct-international",
  owner: "国土交通省 航空局",
  kind: "international_flight_schedule",
  url: MLIT_DIRECT_FLIGHT_SOURCE,
  mode: "source_link_only",
  purpose: "2026年夏ダイヤの国際定期直行便が計画された国内空港を対象空港の母集団として確認する"
});
registry.sources.push({
  id: "gsi-disaster-risk-portal",
  owner: "国土地理院",
  kind: "hazard_map",
  url: "https://disaportal.gsi.go.jp/",
  mode: "source_link_only",
  purpose: "対象空港周辺の洪水・土砂災害・高潮等のハザード情報へ誘導する"
});
for (const item of NATIONAL_AIRPORT_CATALOG) {
  registry.sources.push({
    id: `airport-${item.id}-official`,
    owner: item.name.ja,
    kind: "national_airport_official",
    url: item.home,
    mode: "source_link_only",
    purpose: `${item.name.ja}のフライト・施設・地上アクセスの公式案内へ誘導する`
  });
  registry.sources.push({
    id: `airport-${item.id}-local-support`,
    owner: item.localSupport.municipality.ja,
    kind: "municipal_disaster_support",
    url: item.localSupport.disaster,
    mode: "source_link_only",
    purpose: `${item.name.ja}所在地の防災情報・避難所へ利用者を誘導する`
  });
}

await writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
await rename(temporaryPath, registryPath);
process.stdout.write(`official source registry: ${registry.sources.length} sources, ${registry.allowed_hosts.length} hosts\n`);
