import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourceRoot = path.resolve("dist");
const targetRoot = path.resolve(process.argv[2] ?? "");
if (path.basename(targetRoot) !== "airport-access" || path.basename(path.dirname(targetRoot)) !== "demo") {
  throw new Error("The corporate demo target must end with /demo/airport-access");
}

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

for (const file of [
  "index.html",
  "app.html",
  "demo-app-guard-v3.js",
  "demo-intro-v4.css",
  "demo-intro-v6.js",
  "demo-map-narita-v1.webp",
  "favicon.svg",
  "legal.css",
  "legal.js",
  "privacy.html",
  "robots.txt",
  "terms.html"
]) {
  await cp(path.join(sourceRoot, file), path.join(targetRoot, file));
}

await mkdir(path.join(targetRoot, "assets"), { recursive: true });
for (const file of await readdir(path.join(sourceRoot, "assets"))) {
  if (file.endsWith(".map")) continue;
  await cp(path.join(sourceRoot, "assets", file), path.join(targetRoot, "assets", file));
}

await mkdir(path.join(targetRoot, "data"), { recursive: true });
await cp(
  path.join(sourceRoot, "data", "access-network.geojson"),
  path.join(targetRoot, "data", "access-network.geojson")
);
await cp(
  path.join(sourceRoot, "data", "sample"),
  path.join(targetRoot, "data", "sample"),
  { recursive: true }
);

await cp(
  path.join(sourceRoot, "licenses"),
  path.join(targetRoot, "licenses"),
  { recursive: true }
);

console.log(`Corporate demo staged at ${targetRoot}`);
