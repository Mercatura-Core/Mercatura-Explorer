#!/usr/bin/env node
// Read-only check of the API actually feeding the local explorer.
const baseInput = process.argv[2] ?? "http://127.0.0.1:8787/api/v1/";
let base;
try {
  base = new URL(baseInput.endsWith("/") ? baseInput : `${baseInput}/`);
  if (!["http:", "https:"].includes(base.protocol)) throw new Error("HTTP(S) required");
} catch (error) {
  console.error(`Invalid API base: ${error.message}`);
  process.exit(2);
}

async function read(path) {
  try {
    const response = await fetch(new URL(path, base), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    let value;
    try { value = await response.json(); } catch { value = null; }
    return { status: response.status, value };
  } catch (error) {
    return { status: "connection failed", error: error.message };
  }
}

function show(label, message) {
  console.log(`${label.padEnd(23)} ${message}`);
}

const [summary, network, core, shortWindow, longWindow, statistics] = await Promise.all([
  read("summary"), read("network"), read("core/status"),
  read("mining?window=1d"), read("mining?window=30d"),
  read("statistics?range=30d"),
]);

show("API base", base.toString());
show("Summary", `HTTP ${summary.status}; indexed tip ${summary.value?.chain?.indexedHeight ?? "unknown"}`);
show("Core mining", `HTTP ${core.status}; latest hash estimate ${core.value?.mining?.networkHashPerSecond ?? "not supplied"} H/s`);
const geo = network.value?.geolocation;
show("Network", `HTTP ${network.status}; public peers ${network.value?.peers?.publicCount ?? "unknown"}`);
show("Node locations", network.status !== 200
  ? "unknown: network API unavailable"
  : geo?.providerConfigured
    ? `${geo.locatedAddressCount ?? 0} mapped endpoint(s)`
    : "NO GEOIP PROVIDER: maps cannot show real node markers");
show("Mining 1D", `HTTP ${shortWindow.status}; ${shortWindow.value?.window?.actualBlocks ?? "no"} blocks`);
show("Mining 1M", `HTTP ${longWindow.status}; ${longWindow.value?.window?.actualBlocks ?? "no"} blocks`);
if (shortWindow.status !== 200 || longWindow.status !== 200) {
  show("Mining/Emission", "requires updated API backed by current-chain indexed data");
}
show("Statistics", `HTTP ${statistics.status}; witness breakdown ${statistics.status !== 200 ? "unknown" : Array.isArray(statistics.value?.witnessBreakdown) ? "available" : "not exposed by this backend"}`);
if (statistics.status === 200 && !Array.isArray(statistics.value?.witnessBreakdown)) {
  show("Witness spends/UTXOs", "requires updated API; unavailable is NOT zero");
}
