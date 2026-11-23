"use client";

import { useEffect, useState } from "react";

import type { ExplorerNetwork } from "../lib/explorer-network";

type Metric = "hashrate" | "difficulty";

function formatMetric(kind: Metric, value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "Unavailable";
  if (kind === "difficulty") return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 7 }).format(value);
  const units = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"];
  let scaled = value;
  let index = 0;
  while (scaled >= 1000 && index < units.length - 1) {
    scaled /= 1000;
    index++;
  }
  return `${new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 }).format(scaled)} ${units[index]}`;
}

export function CoreLiveMetric({
  network,
  kind,
  initialValue,
}: {
  network: ExplorerNetwork;
  kind: Metric;
  initialValue: number | null;
}) {
  const [value, setValue] = useState(initialValue);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    setValue(initialValue);
    setLastUpdated(null);
    const controller = new AbortController();
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/live-core?network=${network}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json() as {
          hashrate?: number;
          difficulty?: number;
          updatedAt?: number;
        };
        const next = kind === "hashrate" ? result.hashrate : result.difficulty;
        if (mounted && typeof next === "number" && Number.isFinite(next)) {
          setValue(next);
          setLastUpdated(result.updatedAt ?? Date.now());
        }
      } catch {
        // Keep the previous reading visible if the API temporarily becomes unavailable.
      }
    };

    void refresh();
    const interval = setInterval(() => { void refresh(); }, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
      controller.abort();
    };
  }, [network, kind, initialValue]);

  return (
    <span title={lastUpdated === null
      ? "Initial Core estimate; awaiting refresh"
      : `Latest Core reading: ${new Date(lastUpdated).toLocaleString()}`}>
      {formatMetric(kind, value)}
    </span>
  );
}
