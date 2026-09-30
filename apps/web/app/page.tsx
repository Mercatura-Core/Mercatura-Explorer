import Image from "next/image";
import Link from "next/link";

import { fetchExplorerApi } from "../lib/explorer-server-api";
import { parseExplorerNetwork } from "../lib/explorer-network";

type MetricIconName = "block" | "hashrate" | "difficulty" | "supply" | "reward";

const metricDefinitions: {
  label: string;
  icon: MetricIconName;
  note: string;
}[] = [
  {
    label: "Latest Block",
    icon: "block",
    note: "Indexed chain tip",
  },
  {
    label: "Network Hashrate",
    icon: "hashrate",
    note: "Estimated from chain",
  },
  {
    label: "Difficulty",
    icon: "difficulty",
    note: "DGWv3 current target",
  },
  {
    label: "Circulating Supply",
    icon: "supply",
    note: "Consensus issuance",
  },
  {
    label: "Current Reward",
    icon: "reward",
    note: "Per block subsidy",
  },
];

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function MetricIcon({ name }: { name: MetricIconName }) {
  const common = "h-8 w-8 fill-none stroke-current text-[#e6b54b]";

  if (name === "block") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={common} fill="none" strokeWidth="1.7">
        <path d="m16 4 10 5.8v12.4L16 28 6 22.2V9.8L16 4Z" />
        <path d="m6 9.8 10 5.9 10-5.9M16 15.7V28" />
      </svg>
    );
  }

  if (name === "hashrate") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={common} fill="none" strokeWidth="1.8">
        <circle cx="16" cy="7" r="3" />
        <circle cx="7" cy="23" r="3" />
        <circle cx="25" cy="23" r="3" />
        <path d="m14.5 9.6-6 10.7M17.5 9.6l6 10.7M10 23h12" />
      </svg>
    );
  }

  if (name === "difficulty") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={common} fill="none" strokeWidth="1.7">
        <circle cx="16" cy="16" r="5" />
        <path d="M16 3v5M16 24v5M3 16h5M24 16h5M6.8 6.8l3.5 3.5M21.7 21.7l3.5 3.5M25.2 6.8l-3.5 3.5M10.3 21.7l-3.5 3.5" />
      </svg>
    );
  }

  if (name === "supply") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={common} fill="none" strokeWidth="1.6">
        <ellipse cx="13" cy="9" rx="7" ry="3.5" />
        <path d="M6 9v5c0 2 3.1 3.5 7 3.5s7-1.5 7-3.5V9" />
        <path d="M6 14v5c0 2 3.1 3.5 7 3.5 1.5 0 2.9-.2 4-.6" />
        <ellipse cx="22" cy="22" rx="6" ry="3" />
        <path d="M16 22v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={common} fill="none" strokeWidth="1.8">
      <path d="m8 8 8-3 8 3-4 4-4-2-4 2-4-4Z" />
      <path d="m17 11-2 5 4 2-8 9 3-8-4-2 7-6Z" />
    </svg>
  );
}

function PanelTitleIcon({ type }: { type: "blocks" | "transactions" }) {
  if (type === "blocks") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 text-[#dca63c]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="m12 2 7 4v8l-7 4-7-4V6l7-4Z" />
        <path d="m5 6 7 4 7-4M12 10v8" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#dca63c]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  );
}

function NetworkSketch() {
  return (
    <svg viewBox="0 0 680 250" aria-label="Network map placeholder" className="h-full w-full">
      <g fill="#272a28" opacity="0.95">
        <path d="M75 80 116 58l53 8 27 22-10 27-34 6-29 31-31-7-19-32Z" />
        <path d="m157 145 26 13 18 43-14 34-20-10-9-36-15-20Z" />
        <path d="m287 74 38-18 47 8 23 17-7 20-31 8-11 25-29-1-17-20-28-10Z" />
        <path d="m331 128 30 4 22 33-10 52-25 20-21-27 5-37-14-28Z" />
        <path d="m390 67 63-16 59 11 66 36-11 28-52-3-27 18-44-9-19-25-38 2-20-19Z" />
        <path d="m532 171 37 4 18 23-19 25-34-9-12-22Z" />
      </g>

      <g fill="none" stroke="#8f6726" strokeWidth="1.2" opacity="0.55">
        <path d="M118 97 Q255 5 430 92" />
        <path d="M118 97 Q318 213 530 194" />
        <path d="M331 94 Q439 4 558 101" />
        <path d="M181 173 Q344 98 492 117" />
        <path d="M373 162 Q463 101 564 195" />
      </g>

      <g fill="#e6b54b">
        <circle cx="118" cy="97" r="4" />
        <circle cx="181" cy="173" r="3.5" />
        <circle cx="331" cy="94" r="4" />
        <circle cx="373" cy="162" r="3.5" />
        <circle cx="430" cy="92" r="4" />
        <circle cx="492" cy="117" r="3.5" />
        <circle cx="558" cy="101" r="4" />
        <circle cx="530" cy="194" r="3.5" />
      </g>

      <g fill="#e6b54b" opacity="0.18">
        <circle cx="118" cy="97" r="12" />
        <circle cx="331" cy="94" r="13" />
        <circle cx="430" cy="92" r="12" />
        <circle cx="558" cy="101" r="13" />
      </g>
    </svg>
  );
}

function formatMca(baseUnits: string | null | undefined): string {
  if (baseUnits === null || baseUnits === undefined) {
    return "Unavailable";
  }

  const value = BigInt(baseUnits);
  const baseUnitsPerMca = BigInt(100);
  const whole = value / baseUnitsPerMca;
  const fraction = (value % baseUnitsPerMca).toString().padStart(2, "0");

  return `${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function formatHashrate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  const units = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"];
  let scaled = value;
  let unitIndex = 0;

  while (Math.abs(scaled) >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 4,
  }).format(scaled)} ${units[unitIndex]}`;
}

function formatDifficulty(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 5,
  }).format(value);
}

function formatBlockTime(value: string): string {
  if (!/^\d+$/.test(value)) {
    return "Unavailable";
  }

  const unixSeconds = Number(value);

  if (!Number.isSafeInteger(unixSeconds) || unixSeconds < 0) {
    return "Unavailable";
  }

  const timestamp = unixSeconds * 1000;
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function formatBlockSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unavailable";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function shortenAddress(address: string): string {
  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 9)}…${address.slice(-7)}`;
}

function formatTransactionParty(addresses: string[], coinbase = false): string {
  if (coinbase) {
    return "Coinbase";
  }

  if (addresses.length === 0) {
    return "Unresolved";
  }

  if (addresses.length === 1) {
    return shortenAddress(addresses[0]!);
  }

  return `${addresses.length} addresses`;
}

type SearchMatch =
  | {
      type: "block";
      hash: string;
      height: number;
    }
  | {
      type: "transaction";
      txid: string;
      blockHash: string;
      blockHeight: number;
    }
  | {
      type: "address";
      address: string;
      transactionCount: string;
      balanceBaseUnits: string;
      utxoCount: string;
    };

type SearchResponse = {
  query: string;
  matches: SearchMatch[];
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
    q?: string | string[];
  }>;
}) {
  const parameters = await searchParams;
  const requestedNetwork = Array.isArray(parameters.network)
    ? parameters.network[0]
    : parameters.network;
  const network = parseExplorerNetwork(requestedNetwork);

  const requestedSearch = Array.isArray(parameters.q) ? parameters.q[0] : parameters.q;
  const searchQuery = requestedSearch?.trim() ?? "";
  const searchQueryTooLong = searchQuery.length > 128;

  const [summary, coreStatus, emission, networkOverview, miningOverview, searchResult] =
    await Promise.all([
      fetchExplorerApi<{
        chain: {
          indexedHeight: number | null;
        };
        recentBlocks: Array<{
          hash: string;
          height: number;
          time: string;
          tx_count: number;
          size: number;
          weight: number;
          difficulty: number;
        }>;
        recentTransactions: Array<{
          txid: string;
          block_height: number;
          block_time: string;
          block_index: number;
          coinbase: boolean;
          inputAddresses: string[];
          outputAddresses: string[];
          totalOutputBaseUnits: string;
        }>;
      }>(network, "summary"),

      fetchExplorerApi<{
        mining: {
          difficulty: number;
          networkHashPerSecond: number;
        };
      }>(network, "core/status"),

      fetchExplorerApi<{
        totals: {
          actualIssuedExcludingGenesisBaseUnits: string;
        };
        current: {
          subsidyBaseUnits: string;
        } | null;
        history: Array<{
          height: number;
          hash: string;
          time: string;
          subsidy_base_units: string;
        }>;
      }>(network, "emission?limit=10"),

      fetchExplorerApi<{
        peers: {
          reportedCount: number;
          publicCount: number;
        };
        discovered: {
          reportedCount: number;
          publicCount: number;
        };
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
      }>(network, "network"),

      fetchExplorerApi<{
        window: {
          requestedBlocks: number;
          actualBlocks: number;
        };
        summary: {
          averageDifficulty: number | null;
          averageBlockIntervalSeconds: number | null;
          totalFeesBaseUnits: string;
          totalSubsidyBaseUnits: string;
          totalTransactions: number;
        };
        payoutGroups: Array<{
          attribution: "pseudonymous" | "unidentified";
          payoutAddress: string | null;
          blocks: number;
          sharePercent: number;
        }>;
      }>(network, "mining?window=144"),

      searchQuery.length > 0 && !searchQueryTooLong
        ? fetchExplorerApi<SearchResponse>(network, `search?q=${encodeURIComponent(searchQuery)}`)
        : Promise.resolve(null),
    ]);

  const metricValues = [
    summary?.chain.indexedHeight === null || summary?.chain.indexedHeight === undefined
      ? "Unavailable"
      : summary.chain.indexedHeight.toLocaleString("en-US"),
    formatHashrate(coreStatus?.mining.networkHashPerSecond),
    formatDifficulty(coreStatus?.mining.difficulty),
    formatMca(emission?.totals.actualIssuedExcludingGenesisBaseUnits),
    formatMca(emission?.current?.subsidyBaseUnits),
  ];

  const latestBlocks = summary?.recentBlocks.slice(0, 5) ?? [];
  const recentTransactions = summary?.recentTransactions.slice(0, 5) ?? [];

  const miningPalette = ["#e5b24c", "#b78a34", "#777a77", "#4e514f"];
  const rawMiningGroups = miningOverview?.payoutGroups ?? [];

  const miningGroups = rawMiningGroups.slice(0, 3).map((group, index) => ({
    key: group.payoutAddress ?? "unidentified",
    label:
      group.attribution === "unidentified" || group.payoutAddress === null
        ? "Unidentified miner"
        : shortenAddress(group.payoutAddress),
    title: group.payoutAddress ?? "Unidentified miner",
    blocks: group.blocks,
    sharePercent: group.sharePercent,
    color: miningPalette[index]!,
  }));

  if (rawMiningGroups.length > 3) {
    const remaining = rawMiningGroups.slice(3);

    miningGroups.push({
      key: "other-observed-miners",
      label: "Other observed miners",
      title: "Other observed miners",
      blocks: remaining.reduce((total, group) => total + group.blocks, 0),
      sharePercent: remaining.reduce((total, group) => total + group.sharePercent, 0),
      color: miningPalette[3]!,
    });
  }

  let miningCursor = 0;

  const miningSegments = miningGroups.map((group) => {
    const start = miningCursor;
    const end = start + (group.sharePercent / 100) * 360;

    miningCursor = end;

    return `${group.color} ${start}deg ${end}deg`;
  });

  const miningDonutBackground =
    miningSegments.length === 0
      ? "conic-gradient(#2b2d2b 0deg 360deg)"
      : `conic-gradient(${miningSegments.join(", ")})`;

  const subsidyByBlockHash = new Map(
    (emission?.history ?? []).map((row) => [row.hash, row.subsidy_base_units])
  );

  return (
    <main className="pb-12">
      <section className="hero-stage border-b border-[#191812]">
        <div className="hero-mesh" />

        <div className="hero-coin">
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/mercatura-logo.webp"
              alt=""
              width={235}
              height={235}
              className="opacity-[0.22]"
            />
          </div>
        </div>

        <div className="mx-auto max-w-[1540px] px-5 pb-8 pt-9 sm:px-8 sm:pb-10 sm:pt-11">
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <h1 className="text-3xl font-semibold tracking-[-0.025em] text-[#f2f2ef] sm:text-4xl lg:text-[42px]">
              Explore the <span className="text-[#e3ae43]">Mercatura</span> Blockchain
            </h1>

            <p className="mt-2 text-sm tracking-[0.01em] text-[#aaa9a6] sm:text-base">
              Transparent. Decentralized. Built for a Fairer Economy.
            </p>

            <form
              action="/"
              method="get"
              className="mx-auto mt-7 flex max-w-[800px] items-center overflow-hidden rounded-[18px] border border-[#8e6726] bg-[#0d0f0f]/95 shadow-[0_14px_55px_rgba(0,0,0,0.42)] focus-within:border-[#d2a03c]"
            >
              <input type="hidden" name="network" value={network} />

              <div className="pl-5 text-[#a5a5a2]">
                <SearchIcon />
              </div>

              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                aria-label="Search Mercatura Explorer"
                placeholder="Search block, transaction, address or hash"
                className="min-w-0 flex-1 bg-transparent px-4 py-[17px] text-sm text-white outline-none placeholder:text-[#858582] sm:text-[15px]"
              />

              <button
                type="submit"
                aria-label="Search"
                className="flex self-stretch min-w-[72px] items-center justify-center border-l border-[#8c6423] bg-[linear-gradient(135deg,#f2c45d,#d99b32)] text-[#171006] transition hover:brightness-110"
              >
                <SearchIcon />
              </button>
            </form>

            {searchQuery.length > 0 ? (
              <div className="mx-auto mt-3 max-w-[800px] text-left">
                {searchQueryTooLong ? (
                  <div className="rounded-lg border border-[#5c4520] bg-[#11120f]/95 px-4 py-3 text-xs text-[#c9a35b]">
                    Search query must be 128 characters or fewer.
                  </div>
                ) : searchResult === null ? (
                  <div className="rounded-lg border border-[#34352f] bg-[#101211]/95 px-4 py-3 text-xs text-[#92938f]">
                    {network === "mainnet" ? "Mainnet" : "Testnet"} search is unavailable.
                  </div>
                ) : searchResult.matches.length === 0 ? (
                  <div className="rounded-lg border border-[#34352f] bg-[#101211]/95 px-4 py-3 text-xs text-[#92938f]">
                    No results found for{" "}
                    <span className="font-mono text-[#c5a45e]">{searchResult.query}</span>.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-[#654a20] bg-[#0d0f0f]/95 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
                    {searchResult.matches.map((match) => {
                      if (match.type === "block") {
                        return (
                          <Link
                            key={`block:${match.hash}`}
                            href={`/block/${match.hash}?network=${network}`}
                            className="flex items-center gap-4 border-b border-[#292923] px-4 py-3 transition hover:bg-[#151611] last:border-0"
                          >
                            <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-[#d8a33a]">
                              Block
                            </span>

                            <span className="text-xs font-medium text-white">
                              #{match.height.toLocaleString("en-US")}
                            </span>

                            <span className="min-w-0 truncate font-mono text-xs text-[#8f918d]">
                              {match.hash}
                            </span>
                          </Link>
                        );
                      }

                      if (match.type === "transaction") {
                        return (
                          <Link
                            key={`transaction:${match.txid}`}
                            href={`/tx/${match.txid}?network=${network}`}
                            className="flex items-center gap-4 border-b border-[#292923] px-4 py-3 transition hover:bg-[#151611] last:border-0"
                          >
                            <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-[#d8a33a]">
                              Transaction
                            </span>

                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#c5a45e]">
                              {match.txid}
                            </span>

                            <span className="shrink-0 text-xs text-[#858783]">
                              Block #{match.blockHeight.toLocaleString("en-US")}
                            </span>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          key={`address:${match.address}`}
                          href={`/address/${encodeURIComponent(match.address)}?network=${network}`}
                          className="grid gap-2 border-b border-[#292923] px-4 py-3 transition hover:bg-[#151611] last:border-0 sm:grid-cols-[80px_1fr_auto]"
                        >
                          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#d8a33a]">
                            Address
                          </span>

                          <span className="min-w-0 truncate font-mono text-xs text-[#c5a45e]">
                            {match.address}
                          </span>

                          <span className="text-xs text-[#858783]">
                            {formatMca(match.balanceBaseUnits)} ·{" "}
                            {Number(match.utxoCount).toLocaleString("en-US")} UTXOs
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {metricDefinitions.map((metric, index) => (
              <article
                key={metric.label}
                className="gold-panel flex min-h-[102px] items-center gap-4 rounded-[10px] px-4 py-4"
              >
                <div className="metric-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                  <MetricIcon name={metric.icon} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#9a9a96]">
                    {metric.label}
                  </p>

                  <div className="mt-2 truncate text-[17px] font-semibold text-[#e5b348]">
                    {metricValues[index] ?? "Unavailable"}
                  </div>

                  <p className="mt-2 truncate text-[11px] text-[#777875]">{metric.note}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1540px] px-5 pt-4 sm:px-8">
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className="gold-panel overflow-hidden rounded-[10px]">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <PanelTitleIcon type="blocks" />
                <h2 className="text-[15px] font-semibold text-[#efefec]">Latest Blocks</h2>
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-medium text-[#d7a33c]"
              >
                View All
                <ArrowIcon />
              </Link>
            </div>

            <div className="overflow-x-auto px-4 pb-4">
              <table className="table-shell w-full min-w-[650px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#151717] text-[11px] font-normal text-[#90918f]">
                    <th className="rounded-l-md px-3 py-2 font-normal">#</th>
                    <th className="px-3 py-2 font-normal">Height</th>
                    <th className="px-3 py-2 font-normal">Mined At</th>
                    <th className="px-3 py-2 font-normal">Transactions</th>
                    <th className="px-3 py-2 font-normal">Reward</th>
                    <th className="rounded-r-md px-3 py-2 font-normal">Size</th>
                  </tr>
                </thead>

                <tbody>
                  {latestBlocks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-xs text-[#777975]">
                        {network === "mainnet" ? "Mainnet" : "Testnet"} block data is unavailable.
                      </td>
                    </tr>
                  ) : (
                    latestBlocks.map((block) => (
                      <tr key={block.hash}>
                        <td className="border-b border-[#242625] px-3 py-3">
                          <Link
                            href={`/block/${block.hash}?network=${network}`}
                            title={block.hash}
                            className="flex items-center gap-2"
                          >
                            <span className="text-[#d8a33a]">◇</span>
                            <span className="font-mono text-xs text-[#d8a33a] hover:text-[#edbe5b]">
                              {block.hash.slice(0, 8)}…
                            </span>
                          </Link>
                        </td>

                        <td className="border-b border-[#242625] px-3 py-3 text-xs font-medium">
                          <Link
                            href={`/block/${block.height}?network=${network}`}
                            className="text-[#d8a33a] hover:text-[#edbe5b]"
                          >
                            {block.height.toLocaleString("en-US")}
                          </Link>
                        </td>

                        <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#a2a3a0]">
                          {formatBlockTime(block.time)}
                        </td>

                        <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#c2c3bf]">
                          {block.tx_count.toLocaleString("en-US")}
                        </td>

                        <td className="border-b border-[#242625] px-3 py-3 text-xs font-medium text-[#d8a33a]">
                          {formatMca(subsidyByBlockHash.get(block.hash))}
                        </td>

                        <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#a2a3a0]">
                          {formatBlockSize(block.size)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="gold-panel overflow-hidden rounded-[10px]">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <PanelTitleIcon type="transactions" />
                <h2 className="text-[15px] font-semibold text-[#efefec]">Recent Transactions</h2>
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-medium text-[#d7a33c]"
              >
                View All
                <ArrowIcon />
              </Link>
            </div>

            <div className="overflow-x-auto px-4 pb-4">
              <table className="table-shell w-full min-w-[650px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#151717] text-[11px] font-normal text-[#90918f]">
                    <th className="rounded-l-md px-3 py-2 font-normal">Hash</th>
                    <th className="px-3 py-2 font-normal">From</th>
                    <th className="px-3 py-2 font-normal">To</th>
                    <th className="px-3 py-2 font-normal">Amount</th>
                    <th className="rounded-r-md px-3 py-2 font-normal">Time</th>
                  </tr>
                </thead>

                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-xs text-[#777975]">
                        {network === "mainnet" ? "Mainnet" : "Testnet"} transaction data is
                        unavailable.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <tr key={transaction.txid}>
                        <td className="border-b border-[#242625] px-3 py-3">
                          <Link
                            href={`/tx/${transaction.txid}?network=${network}`}
                            title={transaction.txid}
                            className="flex items-center gap-2"
                          >
                            <span className="text-[#d8a33a]">⇄</span>
                            <span className="font-mono text-xs text-[#d8a33a] hover:text-[#edbe5b]">
                              {transaction.txid.slice(0, 10)}…
                            </span>
                          </Link>
                        </td>

                        <td
                          className="border-b border-[#242625] px-3 py-3 font-mono text-xs text-[#c3a45f]"
                          title={
                            transaction.coinbase
                              ? "Coinbase transaction"
                              : transaction.inputAddresses.join(", ")
                          }
                        >
                          {!transaction.coinbase && transaction.inputAddresses.length === 1 ? (
                            <Link
                              href={`/address/${encodeURIComponent(transaction.inputAddresses[0]!)}?network=${network}`}
                              className="hover:text-[#edbe5b]"
                            >
                              {shortenAddress(transaction.inputAddresses[0]!)}
                            </Link>
                          ) : (
                            formatTransactionParty(transaction.inputAddresses, transaction.coinbase)
                          )}
                        </td>

                        <td
                          className="border-b border-[#242625] px-3 py-3 font-mono text-xs text-[#c3a45f]"
                          title={transaction.outputAddresses.join(", ")}
                        >
                          {transaction.outputAddresses.length === 1 ? (
                            <Link
                              href={`/address/${encodeURIComponent(transaction.outputAddresses[0]!)}?network=${network}`}
                              className="hover:text-[#edbe5b]"
                            >
                              {shortenAddress(transaction.outputAddresses[0]!)}
                            </Link>
                          ) : (
                            formatTransactionParty(transaction.outputAddresses)
                          )}
                        </td>

                        <td
                          className="border-b border-[#242625] px-3 py-3 text-xs font-medium text-[#d8a33a]"
                          title="Total value of all transaction outputs"
                        >
                          {formatMca(transaction.totalOutputBaseUnits)}
                        </td>

                        <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#a2a3a0]">
                          {formatBlockTime(transaction.block_time)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <article
            id="network"
            className="gold-panel-soft scroll-mt-24 overflow-hidden rounded-[10px]"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg text-[#dca63c]">◎</span>
                <h2 className="text-[15px] font-semibold text-[#efefec]">Network Overview</h2>
              </div>

              <Link
                href="/#network"
                className="flex items-center gap-1.5 text-xs font-medium text-[#d7a33c]"
              >
                View Network
                <ArrowIcon />
              </Link>
            </div>

            <div className="grid min-h-[215px] md:grid-cols-[180px_1fr]">
              <div className="space-y-3 border-t border-[#27261f] px-5 py-4 md:border-r md:border-t-0">
                <div>
                  <p className="text-[11px] text-[#898a87]">Public Peers</p>
                  <p className="mt-1 text-lg font-medium text-white">
                    {networkOverview === null
                      ? "Unavailable"
                      : networkOverview.peers.publicCount.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="border-t border-[#222421] pt-3">
                  <p className="text-[11px] text-[#898a87]">Discovered Nodes</p>
                  <p className="mt-1 text-lg font-medium text-white">
                    {networkOverview === null
                      ? "Unavailable"
                      : networkOverview.discovered.publicCount.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="border-t border-[#222421] pt-3">
                  <p className="text-[11px] text-[#898a87]">Peer Versions</p>
                  <p className="mt-1 text-lg font-medium text-white">
                    {networkOverview === null
                      ? "Unavailable"
                      : networkOverview.distributions.peerVersions.length.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              <div className="network-sketch relative min-h-[215px] overflow-hidden">
                <div className="absolute inset-3">
                  <NetworkSketch />
                </div>

                <p className="absolute bottom-3 right-4 text-[10px] text-[#626460]">
                  {networkOverview?.geolocation.providerConfigured
                    ? `${networkOverview.geolocation.eligibleAddressCount.toLocaleString(
                        "en-US"
                      )} geolocation-eligible addresses`
                    : "Geographic map awaits geolocation provider"}
                </p>
              </div>
            </div>
          </article>

          <article
            id="mining"
            className="gold-panel-soft scroll-mt-24 overflow-hidden rounded-[10px]"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg text-[#dca63c]">⚒</span>
                <h2 className="text-[15px] font-semibold text-[#efefec]">Mining Distribution</h2>
              </div>

              <Link
                href="/#mining"
                className="flex items-center gap-1.5 text-xs font-medium text-[#d7a33c]"
              >
                View Mining
                <ArrowIcon />
              </Link>
            </div>

            <div className="grid min-h-[215px] items-center gap-5 border-t border-[#25251f] px-5 py-5 sm:grid-cols-[190px_1fr]">
              <div className="mx-auto text-center">
                <div
                  className="relative h-36 w-36 rounded-full"
                  style={{ background: miningDonutBackground }}
                >
                  <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-[#0a0b0b]">
                    <span className="max-w-[90px] text-sm font-medium leading-tight text-white">
                      {formatHashrate(coreStatus?.mining.networkHashPerSecond)}
                    </span>
                    <span className="mt-1 text-[10px] text-[#777975]">Est. Hashrate</span>
                  </div>
                </div>

                <p className="mt-3 text-[10px] text-[#686a67]">
                  {miningOverview === null
                    ? "Mining data unavailable"
                    : `Observed block production · ${miningOverview.window.actualBlocks.toLocaleString(
                        "en-US"
                      )} blocks`}
                </p>
              </div>

              <div className="space-y-3">
                {miningGroups.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#777975]">
                    {network === "mainnet" ? "Mainnet" : "Testnet"} mining data is unavailable.
                  </p>
                ) : (
                  miningGroups.map((group) => (
                    <div
                      key={group.key}
                      className="flex items-center border-b border-[#202220] pb-2.5 last:border-0"
                    >
                      <span
                        className="mr-3 h-3 w-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />

                      <span
                        className="min-w-0 flex-1 truncate text-xs text-[#c0c0bd]"
                        title={group.title}
                      >
                        {group.label}
                      </span>

                      <span className="ml-3 text-xs text-[#d8a33a]">
                        {new Intl.NumberFormat("en-US", {
                          maximumFractionDigits: 1,
                        }).format(group.sharePercent)}
                        %
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>
        </section>

        <div className="sr-only">
          <span id="emission">Emission</span>
          <span id="statistics">Statistics</span>
        </div>
      </div>
    </main>
  );
}
