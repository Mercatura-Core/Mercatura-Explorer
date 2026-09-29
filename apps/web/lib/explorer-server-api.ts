import "server-only";

import type { ExplorerNetwork } from "./explorer-network";

const API_ENVIRONMENT_VARIABLES: Record<ExplorerNetwork, string> = {
  mainnet: "MERCATURA_EXPLORER_MAINNET_API_URL",
  testnet: "MERCATURA_EXPLORER_TESTNET_API_URL",
};

function getBackendBaseUrl(network: ExplorerNetwork): URL | null {
  const environmentVariable = API_ENVIRONMENT_VARIABLES[network];
  const configuredValue = process.env[environmentVariable]?.trim();

  if (!configuredValue) {
    return null;
  }

  const url = new URL(configuredValue);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${environmentVariable} must use http or https`);
  }

  return new URL(url.origin);
}

export async function fetchExplorerApi<T>(
  network: ExplorerNetwork,
  path: string
): Promise<T | null> {
  let baseUrl: URL | null;

  try {
    baseUrl = getBackendBaseUrl(network);
  } catch {
    return null;
  }

  if (baseUrl === null) {
    return null;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`/api/v1/${normalizedPath}`, baseUrl);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}
