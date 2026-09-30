import Link from "next/link";

import { parseExplorerNetwork } from "../../lib/explorer-network";
import { fetchExplorerApi } from "../../lib/explorer-server-api";
import {
  formatNetworkEndpoint,
  formatNetworkName,
  formatPeerSoftware,
} from "../../lib/network-presentation";

type PublicPeer = {
  address: string;
  port: number | null;
  network: string;
  services: string[];
  version: number;
  subversion: string;
  inbound: boolean;
  connectionType: string;
  transportProtocol: string;
  connectedSince: number;
  lastSend: number;
  lastReceive: number;
  lastTransaction: number;
  lastBlock: number;
  bytesSent: number;
  bytesReceived: number;
  pingSeconds: number | null;
  minimumPingSeconds: number | null;
  syncedHeaders: number;
  syncedBlocks: number;
  mappedAs: number | null;
  geolocationEligible: boolean;
  location: null;
};

type DiscoveredNode = {
  address: string;
  port: number;
  network: string;
  lastSeen: number;
  services: number;
  geolocationEligible: boolean;
  location: null;
};

type NetworkResponse = {
  node: {
    networkActive: boolean;
    version: number;
    subversion: string;
    protocolVersion: number;
    connections: number;
    connectionsIn: number;
    connectionsOut: number;
  };
  peers: {
    reportedCount: number;
    publicCount: number;
    items: PublicPeer[];
  };
  discovered: {
    reportedCount: number;
    publicCount: number;
    items: DiscoveredNode[];
  };
  addrman: Record<
    string,
    {
      new: number;
      tried: number;
      total: number;
    }
  >;
  distributions: {
    peerVersions: Array<{
      subversion: string;
      count: number;
    }>;
    discoveredNetworks: Array<{
      network: string;
      count: number;
    }>;
  };
  geolocation: {
    providerConfigured: boolean;
    eligibleAddressCount: number;
  };
};

function formatInteger(value: number): string {
  return value.toLocaleString("en-US");
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "Unavailable";
  }

  if (value < 1024) {
    return `${value.toLocaleString("en-US")} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

function formatPing(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "Unavailable";
  }

  return `${(seconds * 1000).toFixed(seconds < 0.1 ? 1 : 0)} ms`;
}

function formatRelativeUnixTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "Unavailable";
  }

  const elapsed = Math.max(0, Math.floor(Date.now() / 1000 - value));

  if (elapsed < 60) {
    return `${elapsed}s ago`;
  }

  const minutes = Math.floor(elapsed / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function NetworkMapPlaceholder({
  providerConfigured,
  eligibleAddressCount,
}: {
  providerConfigured: boolean;
  eligibleAddressCount: number;
}) {
  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-[8px] border border-[#292a24] bg-[#090b0a]">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#20231f_1px,transparent_1px),linear-gradient(90deg,#20231f_1px,transparent_1px)] [background-size:42px_42px]" />

      <svg
        viewBox="0 0 1000 430"
        aria-label="Network geolocation map"
        className="absolute inset-0 h-full w-full"
      >
        <g fill="#252825" opacity="0.9">
          <path d="M95 133 157 92l83 10 54 39-13 45-54 19-39 51-50-14-34-47Z" />
          <path d="m235 253 43 22 28 77-25 59-31-18-16-69-26-37Z" />
          <path d="m411 118 58-29 77 12 47 29-10 37-51 18-22 47-46-1-31-34-46-18Z" />
          <path d="m481 229 50 8 38 59-18 92-42 34-36-50 9-67-25-50Z" />
          <path d="m594 102 98-25 94 16 112 63-19 50-86-6-45 31-73-16-32-44-62 5-34-35Z" />
          <path d="m820 300 56 7 31 40-30 41-54-14-19-39Z" />
        </g>

        <g fill="none" stroke="#6d5225" strokeWidth="1.5" opacity="0.5">
          <path d="M165 167 Q370 20 650 152" />
          <path d="M165 167 Q429 373 820 330" />
          <path d="M470 160 Q665 24 864 171" />
          <path d="M270 302 Q520 151 755 205" />
        </g>
      </svg>

      <div className="absolute inset-x-5 bottom-5 rounded-lg border border-[#3b3423] bg-[#0b0d0c]/95 px-4 py-4">
        <p className="text-sm font-medium text-[#e2b04a]">
          {providerConfigured
            ? "Geolocation provider configured"
            : "Geolocation provider not configured"}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#8d8f8a]">
          {eligibleAddressCount.toLocaleString("en-US")} public IPv4/IPv6 observations are eligible
          for geographic enrichment.
          {!providerConfigured &&
            " Country distribution and map pins are intentionally withheld until a geolocation provider is configured."}
        </p>
      </div>
    </div>
  );
}

function DistributionBars({
  rows,
  total,
  emptyText,
}: {
  rows: Array<{
    label: string;
    count: number;
  }>;
  total: number;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <div className="px-5 py-10 text-center text-xs text-[#777975]">{emptyText}</div>;
  }

  return (
    <div className="divide-y divide-[#24251f]">
      {rows.map((row) => {
        const percentage = total === 0 ? 0 : (row.count * 100) / total;

        return (
          <div key={row.label} className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <span className="min-w-0 truncate text-xs text-[#c8c9c5]">{row.label}</span>

              <span className="shrink-0 text-xs font-medium text-[#e2ad42]">
                {row.count.toLocaleString("en-US")} · {percentage.toFixed(1)}%
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#242620]">
              <div
                className="h-full rounded-full bg-[#d8a33a]"
                style={{
                  width: `${Math.max(0, Math.min(100, percentage))}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const requestedNetwork = Array.isArray(query.network) ? query.network[0] : query.network;

  const networkName = parseExplorerNetwork(requestedNetwork);

  const network = await fetchExplorerApi<NetworkResponse>(networkName, "network");

  const visiblePeers = network?.peers.items.slice(0, 50) ?? [];

  const visibleDiscovered =
    network === null
      ? []
      : [...network.discovered.items]
          .sort((left, right) => right.lastSeen - left.lastSeen)
          .slice(0, 50);

  const versionTotal =
    network?.distributions.peerVersions.reduce((total, row) => total + row.count, 0) ?? 0;

  const discoveredNetworkTotal =
    network?.distributions.discoveredNetworks.reduce((total, row) => total + row.count, 0) ?? 0;

  const addrmanRows =
    network === null
      ? []
      : Object.entries(network.addrman).sort(([left], [right]) => {
          if (left === "all_networks") {
            return -1;
          }

          if (right === "all_networks") {
            return 1;
          }

          return left.localeCompare(right);
        });

  return (
    <main className="mx-auto max-w-[1540px] px-5 py-8 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/?network=${networkName}`}
          className="text-sm font-medium text-[#d8a33a] hover:text-[#edbe5b]"
        >
          ← Back to Explorer
        </Link>

        <span className="rounded-full border border-[#55401d] bg-[#0d0e0c] px-3 py-1.5 text-xs font-medium text-[#dfb04a]">
          {networkName === "mainnet" ? "Mainnet" : "Testnet"}
        </span>
      </div>

      <section className="gold-panel overflow-hidden rounded-[10px]">
        <div className="border-b border-[#292820] px-5 py-7 sm:px-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#d8a33a]">
            Peer-to-Peer Network
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-[#f1f1ee] sm:text-3xl">
            Mercatura Network
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#969894]">
            Live node connectivity, peer software, address-manager discovery, and public network
            observations from the selected Mercatura explorer node.
          </p>

          <p className="mt-2 max-w-4xl text-xs leading-5 text-[#777975]">
            Public counts are observations from this explorer node, not an estimate of the total
            worldwide Mercatura node population. Private and local addresses are filtered before the
            API response is exposed.
          </p>
        </div>

        {network === null ? (
          <div className="px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-white">Network data is unavailable</h2>

            <p className="mt-3 text-sm text-[#8f918d]">
              The selected {networkName === "mainnet" ? "Mainnet" : "Testnet"} explorer backend is
              not currently available.
            </p>
          </div>
        ) : (
          <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              {
                label: "Public Peers",
                value: formatInteger(network.peers.publicCount),
                note: `${formatInteger(network.peers.reportedCount)} Core-reported`,
              },
              {
                label: "Public Discovered",
                value: formatInteger(network.discovered.publicCount),
                note: `${formatInteger(network.discovered.reportedCount)} Core-reported`,
              },
              {
                label: "Connections",
                value: formatInteger(network.node.connections),
                note: "Current node total",
              },
              {
                label: "Inbound",
                value: formatInteger(network.node.connectionsIn),
                note: "Current connections",
              },
              {
                label: "Outbound",
                value: formatInteger(network.node.connectionsOut),
                note: "Current connections",
              },
              {
                label: "Geo Eligible",
                value: formatInteger(network.geolocation.eligibleAddressCount),
                note: network.geolocation.providerConfigured
                  ? "Provider configured"
                  : "Provider pending",
              },
            ].map((metric) => (
              <div key={metric.label} className="bg-[#0b0c0b] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                  {metric.label}
                </p>

                <p className="mt-2 text-lg font-semibold text-[#e3ae43]">{metric.value}</p>

                <p className="mt-1 text-xs text-[#8c8d89]">{metric.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {network !== null && (
        <>
          <section className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <article className="gold-panel overflow-hidden rounded-[10px]">
              <div className="border-b border-[#292820] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[#efefec]">Explorer Node</h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Software and P2P state reported by Mercatura Core
                </p>
              </div>

              <dl className="divide-y divide-[#24251f]">
                {[
                  ["Network Active", network.node.networkActive ? "Yes" : "No"],
                  ["Software", formatPeerSoftware(network.node.subversion)],
                  ["Core Version", network.node.version.toLocaleString("en-US")],
                  ["Protocol Version", network.node.protocolVersion.toLocaleString("en-US")],
                  ["Connections", network.node.connections.toLocaleString("en-US")],
                  [
                    "Inbound / Outbound",
                    `${network.node.connectionsIn.toLocaleString(
                      "en-US"
                    )} / ${network.node.connectionsOut.toLocaleString("en-US")}`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[150px_1fr]">
                    <dt className="text-xs text-[#858783]">{label}</dt>
                    <dd className="break-all font-mono text-xs text-[#c7c8c4]">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="gold-panel overflow-hidden rounded-[10px]">
              <div className="border-b border-[#292820] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[#efefec]">
                  Geographic Distribution
                </h2>
                <p className="mt-1 text-xs text-[#777975]">Public IPv4/IPv6 observations only</p>
              </div>

              <div className="p-4">
                <NetworkMapPlaceholder
                  providerConfigured={network.geolocation.providerConfigured}
                  eligibleAddressCount={network.geolocation.eligibleAddressCount}
                />
              </div>
            </article>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="gold-panel overflow-hidden rounded-[10px]">
              <div className="border-b border-[#292820] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[#efefec]">Peer Software</h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Public connected peers grouped by reported subversion
                </p>
              </div>

              <DistributionBars
                rows={network.distributions.peerVersions.map((row) => ({
                  label: formatPeerSoftware(row.subversion),
                  count: row.count,
                }))}
                total={versionTotal}
                emptyText="No public peer software observations are available."
              />
            </article>

            <article className="gold-panel overflow-hidden rounded-[10px]">
              <div className="border-b border-[#292820] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[#efefec]">
                  Discovered Network Types
                </h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Public AddrMan observations grouped by transport network
                </p>
              </div>

              <DistributionBars
                rows={network.distributions.discoveredNetworks.map((row) => ({
                  label: formatNetworkName(row.network),
                  count: row.count,
                }))}
                total={discoveredNetworkTotal}
                emptyText="No public discovered-address observations are available."
              />
            </article>
          </section>

          <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#efefec]">Public Connected Peers</h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Local and private endpoints have already been removed
                </p>
              </div>

              <span className="text-xs text-[#858783]">
                Showing {visiblePeers.length.toLocaleString("en-US")} of{" "}
                {network.peers.publicCount.toLocaleString("en-US")}
              </span>
            </div>

            {visiblePeers.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#777975]">
                No public connected peers are currently observable.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left">
                  <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Endpoint</th>
                      <th className="px-5 py-3 font-medium">Network</th>
                      <th className="px-5 py-3 font-medium">Software</th>
                      <th className="px-5 py-3 font-medium">Direction</th>
                      <th className="px-5 py-3 font-medium">Connection</th>
                      <th className="px-5 py-3 font-medium">Transport</th>
                      <th className="px-5 py-3 font-medium">Ping</th>
                      <th className="px-5 py-3 font-medium">Synced</th>
                      <th className="px-5 py-3 font-medium">Traffic</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visiblePeers.map((peer) => (
                      <tr
                        key={`${peer.network}:${peer.address}:${peer.port ?? "none"}`}
                        className="border-t border-[#24251f]"
                      >
                        <td
                          className="px-5 py-3 font-mono text-xs text-[#d8a33a]"
                          title={formatNetworkEndpoint(peer.address, peer.port)}
                        >
                          {formatNetworkEndpoint(peer.address, peer.port)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                          {formatNetworkName(peer.network)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#c5c6c1]" title={peer.subversion}>
                          {formatPeerSoftware(peer.subversion)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          {peer.inbound ? "Inbound" : "Outbound"}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">{peer.connectionType}</td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          {peer.transportProtocol}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          {formatPing(peer.pingSeconds)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          {peer.syncedBlocks.toLocaleString("en-US")} blocks
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          ↑ {formatBytes(peer.bytesSent)}
                          <br />↓ {formatBytes(peer.bytesReceived)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#efefec]">
                  Public Discovered Nodes
                </h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Most recently seen public addresses returned by this node
                </p>
              </div>

              <span className="text-xs text-[#858783]">
                Showing {visibleDiscovered.length.toLocaleString("en-US")} of{" "}
                {network.discovered.publicCount.toLocaleString("en-US")}
              </span>
            </div>

            {visibleDiscovered.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#777975]">
                No public discovered nodes are currently observable.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Endpoint</th>
                      <th className="px-5 py-3 font-medium">Network</th>
                      <th className="px-5 py-3 font-medium">Last Seen</th>
                      <th className="px-5 py-3 font-medium">Services</th>
                      <th className="px-5 py-3 font-medium">Geolocation</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleDiscovered.map((node) => (
                      <tr
                        key={`${node.network}:${node.address}:${node.port}`}
                        className="border-t border-[#24251f]"
                      >
                        <td
                          className="px-5 py-3 font-mono text-xs text-[#d8a33a]"
                          title={formatNetworkEndpoint(node.address, node.port)}
                        >
                          {formatNetworkEndpoint(node.address, node.port)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                          {formatNetworkName(node.network)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          {formatRelativeUnixTime(node.lastSeen)}
                        </td>

                        <td className="px-5 py-3 font-mono text-xs text-[#9b9d98]">
                          {node.services.toLocaleString("en-US")}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#9b9d98]">
                          {node.geolocationEligible
                            ? network.geolocation.providerConfigured
                              ? "Eligible"
                              : "Eligible · provider pending"
                            : "Not IP-geolocatable"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
            <div className="border-b border-[#292820] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#efefec]">Address Manager</h2>
              <p className="mt-1 text-xs text-[#777975]">
                Mercatura Core AddrMan new/tried address buckets
              </p>
            </div>

            {addrmanRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#777975]">
                Address-manager statistics are unavailable.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Network</th>
                      <th className="px-5 py-3 font-medium">New</th>
                      <th className="px-5 py-3 font-medium">Tried</th>
                      <th className="px-5 py-3 font-medium">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {addrmanRows.map(([name, values]) => (
                      <tr key={name} className="border-t border-[#24251f]">
                        <td className="px-5 py-3 text-xs text-[#d8a33a]">
                          {name === "all_networks" ? "All networks" : formatNetworkName(name)}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                          {values.new.toLocaleString("en-US")}
                        </td>

                        <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                          {values.tried.toLocaleString("en-US")}
                        </td>

                        <td className="px-5 py-3 text-xs font-medium text-[#e3ae43]">
                          {values.total.toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-[10px] border border-[#302e25] bg-[#0b0c0b] px-5 py-4">
            <p className="text-xs leading-5 text-[#777975]">
              Network observations are point-in-time views from the explorer node. A discovered
              address is not necessarily reachable at the moment it appears here, and a public
              endpoint does not establish the real-world identity or physical location of its
              operator.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
