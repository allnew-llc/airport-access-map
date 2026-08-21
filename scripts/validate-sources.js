import { loadSourceRegistry, validateSourceRegistry } from "./lib/source-policy.js";

try {
  const registry = validateSourceRegistry(await loadSourceRegistry());
  console.log(`official source gate: PASS (${registry.sources.length} sources, ${registry.allowed_hosts.length} hosts)`);
} catch (error) {
  console.error(`official source gate: BLOCKED — ${error.message}`);
  process.exitCode = 1;
}
