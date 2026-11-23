import { NextResponse } from "next/server";

import { isExplorerNetwork } from "../../../lib/explorer-network";
import { fetchExplorerApi } from "../../../lib/explorer-server-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const network = new URL(request.url).searchParams.get("network");
  if (!isExplorerNetwork(network)) {
    return NextResponse.json({ error: "invalid_network" }, { status: 400 });
  }

  // Only forward the two configured network names. Never accept arbitrary backend URLs.
  const response = await fetchExplorerApi<{
    mining: { networkHashPerSecond: number; difficulty: number };
  }>(network, "core/status");

  if (response === null) {
    return NextResponse.json({ error: "backend_unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json({
    hashrate: response.mining.networkHashPerSecond,
    difficulty: response.mining.difficulty,
    updatedAt: Date.now(),
  }, { headers: { "Cache-Control": "no-store" } });
}
