import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const appPath = path.join(dist, "app.html");
const introPath = path.join(dist, "demo-intro.html");
const indexPath = path.join(dist, "index.html");

await rename(indexPath, appPath);
await rename(introPath, indexPath);

const appHtml = await readFile(appPath, "utf8");
const assetBase = appHtml.match(/(?:src|href)="([^\"]*\/assets\/)/)?.[1]?.replace(/assets\/$/, "");
if (!assetBase) throw new Error("Unable to resolve the demo public base");
const guardedHtml = appHtml.replace("  </head>", "    <script src=\"./demo-app-guard-v3.js\"></script>\n  </head>");
if (guardedHtml === appHtml) throw new Error("Unable to add the demo consent guard");
await writeFile(appPath, guardedHtml, "utf8");

const introHtml = await readFile(indexPath, "utf8");
const basedIntroHtml = introHtml.replace("<head>", `<head>\n    <base href="${assetBase}" />`);
if (basedIntroHtml === introHtml) throw new Error("Unable to add the demo public base");
await writeFile(indexPath, basedIntroHtml, "utf8");

console.log(`Demo entry: index.html (introduction) -> app.html (consented demo), base=${assetBase}`);
