import Link from "next/link";

import { fetchExplorerApi } from "../../lib/explorer-server-api";
import { parseExplorerNetwork } from "../../lib/explorer-network";
import { MINING_WINDOW_OPTIONS, parseMiningWindow, type MiningWindow } from "../../lib/mining-window";
import { AxisLineChart } from "../../components/axis-line-chart";
import { RecentBlockProductionTable } from "../../components/recent-block-production-table";

type MiningResponse = {
  chain: {
    indexedHeight: number | null;
    indexedTip: string | null;
  };
  window: {
    requestedBlocks: number | null;
    actualBlocks: number;
  };
  summary: {
    averageDifficulty: number | null;
    minimumDifficulty: number | null;
    maximumDifficulty: number | null;
    averageBlockIntervalSeconds: number | null;
    averageHashrateHps: number | null;
    totalFeesBaseUnits: string;
    totalSubsidyBaseUnits: string;
    totalTransactions: number;
    totalBlockBytes: number;
    totalBlockWeight: number;
    averageBlockSizeBytes: number | null;
    averageBlockWeight: number | null;
  };
  payoutGroups: Array<{
    attribution: "pseudonymous" | "unidentified";
    payoutAddress: string | null;
    blocks: number;
    sharePercent: number;
  }>;
  recentPagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
  recentBlocks?: Array<{
    height: number;
    hash: string;
    time: string;
    bits: string;
    target: string;
    difficulty: number;
    transactionCount: number;
    size: number;
    weight: number;
    subsidyBaseUnits: string;
    feesBaseUnits: string;
  }>;
  history: Array<{
    height: number;
    hash: string;
    time: string;
    bits: string;
    target: string;
    difficulty: number;
    transactionCount: number;
    size: number;
    weight: number;
    subsidyBaseUnits: string;
    feesBaseUnits: string;
  }>;
};

type CoreStatusResponse = {
  mining: {
    difficulty: number;
    networkHashPerSecond: number;
    next?: {
      difficulty?: number;
    };
  };
};

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
    maximumSignificantDigits: 7,
  }).format(value);
}

function formatSeconds(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)} s`;
}

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return "Unavailable";
  }

  if (value < 1024) {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
    }).format(value)} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatMca(baseUnits: string): string {
  if (!/^\d+$/.test(baseUnits)) {
    return "Unavailable";
  }

  const value = BigInt(baseUnits);
  const whole = value / BigInt(100);
  const fraction = (value % BigInt(100)).toString().padStart(2, "0");

  return `${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function shortAddress(value: string): string {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 13)}…${value.slice(-10)}`;
}

function miningHref(network: "mainnet" | "testnet", window: MiningWindow): string {
  return `/mining?network=${network}&window=${window}`;
}

function sampleHistory(
  history: MiningResponse["history"],
  maximumPoints = 120
): MiningResponse["history"] {
  const ascending = [...history].reverse();

  if (ascending.length <= maximumPoints) {
    return ascending;
  }

  const sampled: MiningResponse["history"] = [];
  const step = (ascending.length - 1) / (maximumPoints - 1);

  for (let index = 0; index < maximumPoints; index++) {
    sampled.push(ascending[Math.round(index * step)]!);
  }

  return sampled;
}

function DifficultyChart({ history }: { history: MiningResponse["history"] }) {
  return (
    <AxisLineChart
      points={sampleHistory(history).map((block) => ({
        x: block.height,
        y: block.difficulty,
        title: `Block ${block.height.toLocaleString("en-US")}: difficulty ${formatDifficulty(block.difficulty)}`,
      }))}
      yLabel="Difficulty (relative)"
      formatY={formatDifficulty}
    />
  );
}

export default async function MiningPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
    window?: string | string[];
  }>;
}) {
  const query = await searchParams;

  const requestedNetwork = Array.isArray(query.network) ? query.network[0] : query.network;

  const network = parseExplorerNetwork(requestedNetwork);
  const window = parseMiningWindow(query.window);

  const [mining, coreStatus] = await Promise.all([
    fetchExplorerApi<MiningResponse>(network, `mining?window=${window}`),
    fetchExplorerApi<CoreStatusResponse>(network, "core/status"),
  ]);

  const payoutGroups = mining?.payoutGroups ?? [];
  const sortedAddressGroups = payoutGroups
    .filter((group) => group.payoutAddress !== null && group.attribution === "pseudonymous")
    .sort((left, right) => right.blocks - left.blocks || left.payoutAddress!.localeCompare(right.payoutAddress!));
  const topPayoutGroups = sortedAddressGroups.slice(0, 10);
  const topBlocks = topPayoutGroups.reduce((sum, group) => sum + group.blocks, 0);
  const totalAttributedBlocks = payoutGroups.reduce((sum, group) => sum + group.blocks, 0);
  const otherBlocks = Math.max(0, totalAttributedBlocks - topBlocks);
  const totalBlocks = mining?.window.actualBlocks ?? totalAttributedBlocks;
  const visiblePayoutGroups = otherBlocks > 0
    ? [...topPayoutGroups, {
        attribution: "unidentified" as const,
        payoutAddress: null,
        blocks: otherBlocks,
        sharePercent: totalBlocks > 0 ? otherBlocks * 100 / totalBlocks : 0,
      }]
    : topPayoutGroups;
  const largestShare =
    visiblePayoutGroups.length === 0 ? 0 : Math.max(...visiblePayoutGroups.map((group) => group.sharePercent));

  return (
    <main className="mx-auto max-w-[1540px] px-5 py-8 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/?network=${network}`}
          className="text-sm font-medium text-[#d8a33a] hover:text-[#edbe5b]"
        >
          ← Back to Explorer
        </Link>

        <span className="rounded-full border border-[#55401d] bg-[#0d0e0c] px-3 py-1.5 text-xs font-medium text-[#dfb04a]">
          {network === "mainnet" ? "Mainnet" : "Testnet"}
        </span>
      </div>

      <section className="gold-panel overflow-hidden rounded-[10px]">
        <div className="border-b border-[#292820] px-5 py-7 sm:px-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#d8a33a]">
            Proof of Work
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-[#f1f1ee] sm:text-3xl">
            Mercatura Mining
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#969894]">
            MercaHash v2 proof of work with DGWv3 difficulty adjustment. Mining attribution is based
            only on observable coinbase payout data and does not infer real-world miner identity.
          </p>
        </div>

        <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Proof of Work</p>
            <p className="mt-2 text-sm font-medium text-[#e3ae43]">MercaHash v2</p>
            <p className="mt-1 text-xs text-[#8c8d89]">Memory-hard Mercatura PoW</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Difficulty</p>
            <p className="mt-2 text-sm font-medium text-white">DGWv3</p>
            <p className="mt-1 text-xs text-[#8c8d89]">Retarget every block · 24-block window</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">
              Target Interval
            </p>
            <p className="mt-2 text-sm font-medium text-white">150 seconds</p>
            <p className="mt-1 text-xs text-[#8c8d89]">2.5-minute blocks</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Miner Reward</p>
            <p className="mt-2 text-sm font-medium text-white">100%</p>
            <p className="mt-1 text-xs text-[#8c8d89]">Subsidy + transaction fees</p>
          </div>
        </div>
      </section>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#efefec]">Observation Window</h2>
          <p className="mt-1 text-xs text-[#777975]">
            Each selection spans elapsed time counted back from the indexed tip (4 hours through 1 year, or all indexed blocks).
          </p>
        </div>

        <div className="flex flex-wrap overflow-hidden rounded-lg border border-[#4c3a1b] bg-[#0b0c0b]">
          {MINING_WINDOW_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={miningHref(network, option.value)}
              className={[
                "px-4 py-2 text-xs font-medium transition",
                window === option.value
                  ? "bg-[#dca63c] text-[#161006]"
                  : "text-[#aaa] hover:bg-[#161710] hover:text-white",
              ].join(" ")}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {[
          ["Current Hashrate Estimate", formatHashrate(coreStatus?.mining.networkHashPerSecond)],
          ["Window Avg. Hashrate", formatHashrate(mining?.summary.averageHashrateHps)],
          ["Current Difficulty", formatDifficulty(coreStatus?.mining.difficulty)],
          ["Window Avg. Difficulty", formatDifficulty(mining?.summary.averageDifficulty)],
          [
            "Avg. Block Interval",
            mining === null
              ? "Unavailable"
              : formatSeconds(mining.summary.averageBlockIntervalSeconds),
          ],
          [
            "Observed Blocks",
            mining === null
              ? "Unavailable"
              : mining.window.requestedBlocks === null
                ? mining.window.actualBlocks.toLocaleString("en-US")
                : `${mining.window.actualBlocks.toLocaleString("en-US")} / ${mining.window.requestedBlocks.toLocaleString("en-US")}`,
          ],
          [
            "Window Transactions",
            mining === null
              ? "Unavailable"
              : mining.summary.totalTransactions.toLocaleString("en-US"),
          ],
        ].map(([label, value]) => (
          <article key={label} className="gold-panel rounded-[10px] px-4 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#898b87]">
              {label}
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[#e5b348]">{value}</p>
          </article>
        ))}
      </section>

      <p className="mt-2 text-[11px] text-[#777975]">
        Hashrates are estimates: the latest Core estimate is not a directly measured instantaneous rate; the window average derives from indexed chainwork over elapsed block time. Date ranges are anchored to the indexed tip.
      </p>

      {mining === null ? (
        <section className="gold-panel mt-4 rounded-[10px] px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-white">Mining analytics are unavailable</h2>

          <p className="mt-3 text-sm text-[#8f918d]">
            The selected API did not return Mining data for {window.toUpperCase()}. The deployed
            testnet API may still accept only block-count windows (144, 1000, 4032). To use
            4H–ALL, connect this frontend to the updated API and a populated, current-chain index.
            We will not relabel a short block sample as a month or year.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="gold-panel overflow-hidden rounded-[10px]">
              <div className="border-b border-[#292820] px-5 py-4">
                <h2 className="text-[15px] font-semibold text-[#efefec]">Mining Distribution</h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Observed block production over{" "}
                  {mining.window.actualBlocks.toLocaleString("en-US")} blocks
                </p>
              </div>

              {payoutGroups.length === 0 ? (
                <div className="px-5 py-12 text-center text-xs text-[#777975]">
                  No payout attribution is available for this window.
                </div>
              ) : (
                <div className="divide-y divide-[#24251f]">
                  {visiblePayoutGroups.map((group, index) => {
                    const isOther = otherBlocks > 0 && index === visiblePayoutGroups.length - 1;
                    const label = isOther ? "Other" :
                      group.attribution === "pseudonymous" && group.payoutAddress !== null
                        ? shortAddress(group.payoutAddress)
                        : "Unidentified miner";

                    return (
                      <div
                        key={group.payoutAddress ?? `unidentified:${index}`}
                        className="px-5 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#d4d5d0]">
                              {group.payoutAddress === null ? (
                                label
                              ) : (
                                <Link
                                  href={`/address/${encodeURIComponent(group.payoutAddress)}?network=${network}`}
                                  title={group.payoutAddress}
                                  className="text-[#d8a33a] hover:text-[#edbe5b]"
                                >
                                  {label}
                                </Link>
                              )}
                            </p>

                            <p className="mt-1 text-[10px] uppercase tracking-[0.06em] text-[#777975]">
                              {isOther ? "Remaining payout groups" : group.attribution === "pseudonymous"
                                ? "Pseudonymous payout grouping"
                                : "No unique payout address observed"}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-[#e3ae43]">
                              {formatPercent(group.sharePercent)}
                            </p>
                            <p className="mt-1 text-[10px] text-[#777975]">
                              {group.blocks.toLocaleString("en-US")} blocks
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#242620]">
                          <div
                            className="h-full rounded-full bg-[#d8a33a]"
                            style={{
                              width: `${Math.max(0, Math.min(100, group.sharePercent))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-[#292820] px-5 py-4 text-xs leading-5 text-[#777975]">
                Top 10 identified payout addresses by observed block count; Other combines remaining
                addresses and blocks with unidentified payout addresses. These are observed block-production
                shares, not measured individual miner hashrates. Payout addresses do not establish miner identities.
              </div>
            </article>

            <article className="gold-panel overflow-hidden rounded-[10px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#efefec]">Difficulty History</h2>
                  <p className="mt-1 text-xs text-[#777975]">
                    DGWv3 difficulty across the selected block window
                  </p>
                </div>

                <span className="text-xs text-[#858783]">
                  Largest observed share {formatPercent(largestShare)}
                </span>
              </div>

              <div className="px-5 py-5">
                <DifficultyChart history={mining.history} />
              </div>
            </article>
          </section>

          <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
            <div className="border-b border-[#292820] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#efefec]">Window Statistics</h2>
            </div>

            <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Minimum Difficulty", formatDifficulty(mining.summary.minimumDifficulty)],
                ["Maximum Difficulty", formatDifficulty(mining.summary.maximumDifficulty)],
                ["Total Subsidy", formatMca(mining.summary.totalSubsidyBaseUnits)],
                ["Total Fees", formatMca(mining.summary.totalFeesBaseUnits)],
                ["Total Block Data", formatBytes(mining.summary.totalBlockBytes)],
                ["Average Block Size", formatBytes(mining.summary.averageBlockSizeBytes)],
                ["Total Block Weight", mining.summary.totalBlockWeight.toLocaleString("en-US")],
                [
                  "Average Block Weight",
                  mining.summary.averageBlockWeight === null
                    ? "Unavailable"
                    : new Intl.NumberFormat("en-US", {
                        maximumFractionDigits: 1,
                      }).format(mining.summary.averageBlockWeight),
                ],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#0b0c0b] px-5 py-4">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">{label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <RecentBlockProductionTable
            key={`${network}:${window}`}
            network={network}
            window={window}
            initialRows={mining.recentBlocks ?? []}
            initialPagination={mining.recentPagination ?? {
              currentPage: 1,
              totalPages: 1,
              totalItems: mining.recentBlocks?.length ?? 0,
              pageSize: 20,
            }}
            indexedHeight={mining.chain.indexedHeight}
          />
        </>
      )}
    </main>
  );
}
