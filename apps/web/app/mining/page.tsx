import Link from "next/link";

import { fetchExplorerApi } from "../../lib/explorer-server-api";
import { parseExplorerNetwork } from "../../lib/explorer-network";
import { MINING_WINDOWS, parseMiningWindow, type MiningWindow } from "../../lib/mining-window";

type MiningResponse = {
  chain: {
    indexedHeight: number | null;
    indexedTip: string | null;
  };
  window: {
    requestedBlocks: number;
    actualBlocks: number;
  };
  summary: {
    averageDifficulty: number | null;
    minimumDifficulty: number | null;
    maximumDifficulty: number | null;
    averageBlockIntervalSeconds: number | null;
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

function parseUnixSeconds(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const seconds = Number(value);

  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

function formatRelativeTime(value: string): string {
  const timestamp = parseUnixSeconds(value);

  if (timestamp === null) {
    return "Unavailable";
  }

  const elapsed = Math.max(0, Math.floor((Date.now() - timestamp * 1000) / 1000));

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

function shortHash(value: string): string {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 13)}…${value.slice(-11)}`;
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
  const sampled = sampleHistory(history);

  if (sampled.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-[#777975]">
        Not enough indexed blocks for a difficulty history chart.
      </div>
    );
  }

  const difficulties = sampled.map((block) => block.difficulty);
  const minimum = Math.min(...difficulties);
  const maximum = Math.max(...difficulties);
  const range = maximum - minimum || 1;

  const points = sampled
    .map((block, index) => {
      const x = (index / (sampled.length - 1)) * 1000;
      const normalized = (block.difficulty - minimum) / range;
      const y = 210 - normalized * 180;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div>
      <svg
        viewBox="0 0 1000 240"
        role="img"
        aria-label="Difficulty history"
        className="h-56 w-full"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="210" x2="1000" y2="210" stroke="#33342f" strokeWidth="2" />
        <line x1="0" y1="120" x2="1000" y2="120" stroke="#242620" strokeWidth="1" />
        <line x1="0" y1="30" x2="1000" y2="30" stroke="#242620" strokeWidth="1" />
        <polyline
          points={points}
          fill="none"
          stroke="#e3ae43"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="flex flex-wrap justify-between gap-3 border-t border-[#24251f] pt-3 text-[10px] text-[#747672]">
        <span>Min {formatDifficulty(minimum)}</span>
        <span>{sampled.length.toLocaleString("en-US")} plotted samples</span>
        <span>Max {formatDifficulty(maximum)}</span>
      </div>
    </div>
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
  const largestShare =
    payoutGroups.length === 0 ? 0 : Math.max(...payoutGroups.map((group) => group.sharePercent));

  const historyRows = mining?.history.slice(0, 30) ?? [];

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
            MercaHash proof of work with DGWv3 difficulty adjustment. Mining attribution is based
            only on observable coinbase payout data and does not infer real-world miner identity.
          </p>
        </div>

        <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Proof of Work</p>
            <p className="mt-2 text-sm font-medium text-[#e3ae43]">MercaHash</p>
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
            Distribution and historical statistics use the selected active-chain window.
          </p>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-[#4c3a1b] bg-[#0b0c0b]">
          {MINING_WINDOWS.map((candidate) => (
            <Link
              key={candidate}
              href={miningHref(network, candidate)}
              className={[
                "px-4 py-2 text-xs font-medium transition",
                window === candidate
                  ? "bg-[#dca63c] text-[#161006]"
                  : "text-[#aaa] hover:bg-[#161710] hover:text-white",
              ].join(" ")}
            >
              {candidate.toLocaleString("en-US")}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ["Network Hashrate", formatHashrate(coreStatus?.mining.networkHashPerSecond)],
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

      {mining === null ? (
        <section className="gold-panel mt-4 rounded-[10px] px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-white">Mining analytics are unavailable</h2>

          <p className="mt-3 text-sm text-[#8f918d]">
            The selected {network === "mainnet" ? "Mainnet" : "Testnet"} explorer backend is not
            currently available.
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
                  {payoutGroups.map((group, index) => {
                    const label =
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
                              {group.attribution === "pseudonymous"
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
                Pseudonymous groups are based on an observable unique coinbase payout address. They
                are not asserted to be pools, companies, people, or persistent real-world
                identities.
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

          <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#efefec]">
                  Recent Block Production
                </h2>
                <p className="mt-1 text-xs text-[#777975]">
                  Latest 30 blocks from the selected observation window
                </p>
              </div>

              <span className="text-xs text-[#858783]">
                Indexed tip{" "}
                {mining.chain.indexedHeight === null
                  ? "Unavailable"
                  : `#${mining.chain.indexedHeight.toLocaleString("en-US")}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Block</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Difficulty</th>
                    <th className="px-5 py-3 font-medium">TXs</th>
                    <th className="px-5 py-3 font-medium">Size</th>
                    <th className="px-5 py-3 font-medium">Subsidy</th>
                    <th className="px-5 py-3 font-medium">Fees</th>
                  </tr>
                </thead>

                <tbody>
                  {historyRows.map((block) => (
                    <tr key={block.hash} className="border-t border-[#24251f]">
                      <td className="px-5 py-3">
                        <Link
                          href={`/block/${block.hash}?network=${network}`}
                          title={block.hash}
                          className="font-mono text-xs text-[#d8a33a] hover:text-[#edbe5b]"
                        >
                          #{block.height.toLocaleString("en-US")} · {shortHash(block.hash)}
                        </Link>
                      </td>

                      <td className="px-5 py-3 text-xs text-[#8f918d]">
                        {formatRelativeTime(block.time)}
                      </td>

                      <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                        {formatDifficulty(block.difficulty)}
                      </td>

                      <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                        {block.transactionCount.toLocaleString("en-US")}
                      </td>

                      <td className="px-5 py-3 text-xs text-[#9b9d98]">
                        {formatBytes(block.size)}
                      </td>

                      <td className="px-5 py-3 text-xs text-[#e3ae43]">
                        {formatMca(block.subsidyBaseUnits)}
                      </td>

                      <td className="px-5 py-3 text-xs text-[#c5c6c1]">
                        {formatMca(block.feesBaseUnits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
