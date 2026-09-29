import { NextRequest, NextResponse } from "next/server";

import { isExplorerNetwork, type ExplorerNetwork } from "../../../../../lib/explorer-network";

export const dynamic = "force-dynamic";

const API_ENVIRONMENT_VARIABLES: Record<ExplorerNetwork, string> = {
  mainnet: "MERCATURA_EXPLORER_MAINNET_API_URL",
  testnet: "MERCATURA_EXPLORER_TESTNET_API_URL",
};

function getBackendBaseUrl(network: ExplorerNetwork): string | null {
  const environmentVariable = API_ENVIRONMENT_VARIABLES[network];
  const configuredValue = process.env[environmentVariable]?.trim();

  if (!configuredValue) {
    return null;
  }

  const url = new URL(configuredValue);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${environmentVariable} must use http or https`);
  }

  return url.origin;
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      network: string;
      path: string[];
    }>;
  }
) {
  const { network, path } = await context.params;

  if (!isExplorerNetwork(network)) {
    return NextResponse.json(
      {
        error: "invalid_network",
        message: "Network must be mainnet or testnet",
      },
      { status: 400 }
    );
  }

  let baseUrl: string | null;

  try {
    baseUrl = getBackendBaseUrl(network);
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_network_configuration",
        message: error instanceof Error ? error.message : "Invalid explorer API configuration",
      },
      { status: 500 }
    );
  }

  if (baseUrl === null) {
    return NextResponse.json(
      {
        error: "network_unavailable",
        message: `${network} explorer API is not configured`,
      },
      { status: 503 }
    );
  }

  const encodedPath = path.map(encodeURIComponent).join("/");
  const backendUrl = new URL(`/api/v1/${encodedPath}`, baseUrl);

  backendUrl.search = request.nextUrl.search;

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const body = await backendResponse.arrayBuffer();
    const contentType = backendResponse.headers.get("content-type") ?? "application/octet-stream";

    return new NextResponse(body, {
      status: backendResponse.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "backend_unavailable",
        message: `${network} explorer API could not be reached`,
      },
      { status: 502 }
    );
  }
}
