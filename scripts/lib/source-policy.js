import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.resolve(moduleDirectory, "../config/official-sources.json");

export async function loadSourceRegistry() {
  return JSON.parse(await readFile(registryPath, "utf8"));
}

export function assertOfficialUrl(value, allowedHosts) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`source_url is not a valid URL: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`source_url must use HTTPS: ${value}`);
  }
  if (!allowedHosts.includes(url.hostname)) {
    throw new Error(`source host is not on the official allowlist: ${url.hostname}`);
  }
  return url;
}

export function validateSourceRegistry(registry) {
  if (registry?.schema_version !== "official-sources/1") {
    throw new Error("official source registry schema_version is invalid");
  }
  if (!Array.isArray(registry.allowed_hosts) || registry.allowed_hosts.length === 0) {
    throw new Error("official source registry has no allowed hosts");
  }
  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    throw new Error("official source registry has no sources");
  }

  const ids = new Set();
  for (const source of registry.sources) {
    if (!source.id || ids.has(source.id)) {
      throw new Error(`official source id is missing or duplicated: ${source.id}`);
    }
    ids.add(source.id);
    assertOfficialUrl(source.url, registry.allowed_hosts);
    if (!source.owner || !source.kind || !source.purpose || !source.mode) {
      throw new Error(`official source is incomplete: ${source.id}`);
    }
  }
  return registry;
}
