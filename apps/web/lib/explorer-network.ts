export const EXPLORER_NETWORKS = ["mainnet", "testnet"] as const;

export type ExplorerNetwork = (typeof EXPLORER_NETWORKS)[number];

export const DEFAULT_EXPLORER_NETWORK: ExplorerNetwork = "mainnet";

export function isExplorerNetwork(value: string | null | undefined): value is ExplorerNetwork {
  return value === "mainnet" || value === "testnet";
}

export function parseExplorerNetwork(value: string | null | undefined): ExplorerNetwork {
  return isExplorerNetwork(value) ? value : DEFAULT_EXPLORER_NETWORK;
}
