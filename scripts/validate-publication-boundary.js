import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /^\.factory\//,
  /^artifacts\//,
  /^data\/history\//,
  /^docs\/evidence\//,
  /^docs\/(?:capa-log|document-control|history-storage|quality-plan|risk-register)\.md$/,
  /^docs\/legal\//,
  /^docs\/.*audit.*$/,
  /^factory-control\//,
  /^factory-blueprint\.json$/,
  /^public\/data\/latest-disaster\.json$/,
  /^public\/data\/history-(?!sample)/,
  /^public\/data\/history-index\.json$/,
  /^scripts\/merge-keisei-history-facts\.js$/,
  /^scripts\/(?:archive-history|fetch-traffic|fetch-weather|parse-and-build|validate-data|validate-history(?:-index|-store)?)\.js$/,
  /^scripts\/config\/historical-secondary-sources\.json$/,
  /^scripts\/fixtures\//,
  /^scripts\/lib\/(?:history-replay-gate|history-store|rolling-history-gate)\.js$/,
  /^scripts\/private\//,
];

const forbiddenContent = [
  /publication_clearance\s*:\s*["']required_before_public_release["']/,
  /history-keisei-2026081[34]-/,
  /(?:KAB|熊本朝日放送)/,
  /keisei\.co\.jp\/traininfo\/history\.php/,
  /(?:verified_official_historical_archive|verified_official_archive|corroborated_secondary(?:_report)?)/,
  /(?:京成.*(?:履歴|记录|紀錄)|Keisei.*history|게이세이.*이력)/i,
  /(?:二次報道|二次报道|二次報導|2차 보도|secondary report(?:ing)?|contemporary reports)/i,
  /(?:公式アーカイブ|official (?:weather )?archive|官方.*档案|官方.*檔案|공식.*아카이브)/i,
];

const violations = [];
for (const file of trackedFiles) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    violations.push(`forbidden tracked path: ${file}`);
    continue;
  }

  if (file === "scripts/validate-publication-boundary.js") continue;

  const buffer = await readFile(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const pattern of forbiddenContent) {
    if (pattern.test(text)) violations.push(`forbidden publication marker in ${file}: ${pattern}`);
  }
}

if (violations.length > 0) {
  throw new Error(`Publication boundary gate failed:\n${violations.join("\n")}`);
}

console.log(`Publication boundary gate: PASS (${trackedFiles.length} tracked files)`);
