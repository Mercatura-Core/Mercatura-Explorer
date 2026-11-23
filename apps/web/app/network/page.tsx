import Link from "next/link";

import { DiscoveredNodesTable, type DiscoveredNode } from "../../components/discovered-nodes-table";
import { PublicConnectedPeersTable, type PublicPeer } from "../../components/public-connected-peers-table";
import { parseExplorerNetwork } from "../../lib/explorer-network";
import { fetchExplorerApi } from "../../lib/explorer-server-api";
import {
  formatNetworkName,
  formatPeerSoftware,
} from "../../lib/network-presentation";


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
    sampleLimit: number;
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
};

function formatCoreBuild(version: number): string {
  if (!Number.isSafeInteger(version) || version < 0) return "Unavailable";
  const major = Math.floor(version / 10000);
  const minor = Math.floor((version % 10000) / 100);
  const patch = version % 100;
  return `${major}.${minor}.${patch} (build ${version})`;
}

function formatInteger(value: number): string {
  return value.toLocaleString("en-US");
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

  const visibleDiscovered =
    network === null ? [] : [...network.discovered.items].sort((left, right) => right.lastSeen - left.lastSeen);

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
          <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-5">
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
          <section className="mt-4">
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
                  ["Core build (reported)", formatCoreBuild(network.node.version)],
                  ["P2P protocol (reported)", network.node.protocolVersion.toLocaleString("en-US")],
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
              <p className="border-t border-[#24251f] px-5 py-3 text-[11px] leading-5 text-[#777975]">
                Core build and P2P protocol are compatibility identifiers reported by the node;
                neither is the Mercatura public release version.
              </p>
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

          <PublicConnectedPeersTable
            peers={network.peers.items}
            publicCount={network.peers.publicCount}
          />

          <DiscoveredNodesTable
            nodes={visibleDiscovered}
            publicCount={network.discovered.publicCount}
          />

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
