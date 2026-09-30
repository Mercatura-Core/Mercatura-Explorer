import Link from "next/link";

import {
  DEFAULT_EXPLORER_NETWORK,
  parseExplorerNetwork,
  type ExplorerNetwork,
} from "../../lib/explorer-network";
import { TransactionsPerDayChart } from "../../components/transactions-per-day-chart";
import { fetchExplorerApi } from "../../lib/explorer-server-api";

type IntegerLike = string | bigint | null | undefined;

type StatisticsRange = "30d" | "90d" | "180d" | "365d" | "1095d" | "all";

const STATISTICS_RANGE_OPTIONS: Array<{
  value: StatisticsRange;
  label: string;
}> = [
  { value: "30d", label: "1M" },
  { value: "90d", label: "3M" },
  { value: "180d", label: "6M" },
  { value: "365d", label: "1Y" },
  { value: "1095d", label: "3Y" },
  { value: "all", label: "All" },
];

interface OutputTypeRow {
  scriptType: string;
  outputCount: string;
  addressedOutputCount: string;
  totalValueBaseUnits: string;
}

interface StatisticsResponse {
  chain: {
    indexedHeight: number | null;
    indexedTip: string | null;
    activeBlocks: string;
    transactions: string;
  };

  blocks: {
    totalBytes: string;
    totalWeight: string;
    averageBytes: string | null;
    averageWeight: string | null;
  };

  transactions: {
    total: string;
    nonCoinbase: string;
    averageNonCoinbaseSize: string | null;
    averageNonCoinbaseWeight: string | null;
    feesBaseUnits: string;
  };

  emission: {
    consensusSubsidyBaseUnits: string;
  };

  addresses: {
    count: string;
    zeroBalanceCount: string;
  };

  utxos: {
    count: string;
    valueBaseUnits: string;
  };

  pq: {
    scriptType: string;
    outputCount: string;
    addressedOutputCount: string;
    outputValueBaseUnits: string;
    authorizationInputCount: string;
    spendingTransactionCount: string;
    activeUtxoCount: string;
    activeUtxoValueBaseUnits: string;
  };

  activity: {
    range: StatisticsRange;
    dailyTransactions: Array<{
      date: string;
      nonCoinbaseTransactions: string;
    }>;
  };

  outputTypes: OutputTypeRow[];
}

function singleParameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatisticsRange(value: string | undefined): StatisticsRange {
  switch (value) {
    case "90d":
    case "180d":
    case "365d":
    case "1095d":
    case "all":
      return value;

    default:
      return "30d";
  }
}

function parseBigIntValue(value: IntegerLike): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return typeof value === "bigint" ? value : BigInt(value);
  } catch {
    return null;
  }
}

function formatInteger(value: IntegerLike): string {
  const parsed = parseBigIntValue(value);

  return parsed === null ? "Unavailable" : parsed.toLocaleString("en-US");
}

function formatMca(value: IntegerLike): string {
  const amount = parseBigIntValue(value);

  if (amount === null) {
    return "Unavailable";
  }

  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");

  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function formatBytes(value: IntegerLike): string {
  const amount = parseBigIntValue(value);

  if (amount === null) {
    return "Unavailable";
  }

  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;

  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

  let unitIndex = 0;
  let divisor = BigInt(1);

  while (unitIndex < units.length - 1 && absolute >= divisor * BigInt(1024)) {
    divisor *= BigInt(1024);
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${negative ? "-" : ""}${absolute.toLocaleString("en-US")} B`;
  }

  const hundredths = (absolute * BigInt(100)) / divisor;
  const whole = hundredths / BigInt(100);
  const fraction = (hundredths % BigInt(100)).toString().padStart(2, "0");

  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${fraction} ${units[unitIndex]}`;
}

function formatDecimal(value: string | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "Unavailable";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(parsed)}${suffix}`;
}

function formatAverageBytes(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "Unavailable";
  }

  const units = ["B", "KiB", "MiB", "GiB"];
  let scaled = parsed;
  let unitIndex = 0;

  while (Math.abs(scaled) >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(scaled)} ${units[unitIndex]}`;
}

function formatPercentage(numeratorValue: IntegerLike, denominatorValue: IntegerLike): string {
  const numerator = parseBigIntValue(numeratorValue);
  const denominator = parseBigIntValue(denominatorValue);

  if (numerator === null || denominator === null || denominator <= BigInt(0)) {
    return "Unavailable";
  }

  const hundredths = (numerator * BigInt(10000)) / denominator;

  return `${(Number(hundredths) / 100).toFixed(2)}%`;
}

function percentageNumber(numeratorValue: IntegerLike, denominatorValue: IntegerLike): number {
  const numerator = parseBigIntValue(numeratorValue);
  const denominator = parseBigIntValue(denominatorValue);

  if (numerator === null || denominator === null || denominator <= BigInt(0)) {
    return 0;
  }

  const hundredths = (numerator * BigInt(10000)) / denominator;

  return Math.min(100, Math.max(0, Number(hundredths) / 100));
}

function shortenHash(hash: string): string {
  return hash.length <= 24 ? hash : `${hash.slice(0, 12)}…${hash.slice(-10)}`;
}

function networkLabel(network: ExplorerNetwork): string {
  return network === "mainnet" ? "Mainnet" : "Testnet";
}

function networkHref(network: ExplorerNetwork, path: string): string {
  return `${path}?network=${network}`;
}

function statisticsHref(network: ExplorerNetwork, range: StatisticsRange): string {
  const parameters = new URLSearchParams({
    network,
    range,
  });

  return `/statistics?${parameters.toString()}`;
}

function formatUtcDate(date: string | undefined): string {
  if (date === undefined) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatAverageCount(total: bigint, days: number): string {
  if (days <= 0) {
    return "Unavailable";
  }

  const tenths = (total * BigInt(10)) / BigInt(days);

  const whole = tenths / BigInt(10);
  const fraction = tenths % BigInt(10);

  return `${whole.toLocaleString("en-US")}.${fraction}`;
}

function formatScriptType(scriptType: string): string {
  if (scriptType === "witness_v2_mercatura_pq") {
    return "Mercatura PQ · Witness v2";
  }

  return scriptType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="gold-panel rounded-[10px] px-5 py-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8e8a]">
        {label}
      </div>

      <div className="mt-3 break-words text-[22px] font-semibold tracking-[-0.02em] text-[#f0f0ec]">
        {value}
      </div>

      <div className="mt-2 text-xs leading-5 text-[#858681]">{note}</div>
    </article>
  );
}

function StatRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#24231d] py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <div className="text-sm text-[#b9bab6]">{label}</div>
        {note ? <div className="mt-1 text-[11px] leading-4 text-[#686a67]">{note}</div> : null}
      </div>

      <div className="shrink-0 text-sm font-medium tabular-nums text-[#ecece8]">{value}</div>
    </div>
  );
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
    range?: string | string[];
  }>;
}) {
  const parameters = await searchParams;

  const requestedNetwork = singleParameter(parameters.network);

  const network = parseExplorerNetwork(requestedNetwork ?? DEFAULT_EXPLORER_NETWORK);

  const requestedRange = parseStatisticsRange(singleParameter(parameters.range));

  const statistics = await fetchExplorerApi<StatisticsResponse>(
    network,
    `statistics?range=${requestedRange}`
  );

  const activityRange = statistics?.activity?.range ?? requestedRange;

  const dailyTransactions = statistics?.activity?.dailyTransactions ?? [];

  const activityTotal = dailyTransactions.reduce(
    (total, row) => total + (parseBigIntValue(row.nonCoinbaseTransactions) ?? BigInt(0)),
    BigInt(0)
  );

  const latestActivity =
    dailyTransactions.length === 0 ? undefined : dailyTransactions[dailyTransactions.length - 1];

  const outputTypes = statistics?.outputTypes ?? [];

  const totalOutputCount = outputTypes.reduce(
    (total, row) => total + (parseBigIntValue(row.outputCount) ?? BigInt(0)),
    BigInt(0)
  );

  const indexedHeight = statistics?.chain.indexedHeight ?? null;
  const indexedTip = statistics?.chain.indexedTip ?? null;

  const nonCoinbaseShare = formatPercentage(
    statistics?.transactions.nonCoinbase,
    statistics?.transactions.total
  );

  const zeroBalanceShare = formatPercentage(
    statistics?.addresses.zeroBalanceCount,
    statistics?.addresses.count
  );

  const pqOutputShare = formatPercentage(statistics?.pq.outputCount, totalOutputCount);

  const pqUtxoShare = formatPercentage(statistics?.pq.activeUtxoCount, statistics?.utxos.count);

  return (
    <main className="min-h-screen pb-16">
      <section className="border-b border-[#1d1b15] bg-[#090a09]">
        <div className="mx-auto max-w-[1540px] px-5 py-9 sm:px-8 lg:py-11">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={networkHref(network, "/")}
              className="inline-flex items-center gap-2 text-xs font-medium text-[#d9a640] transition hover:text-[#f0c15d]"
            >
              <span aria-hidden="true">←</span>
              Back Explorer
            </Link>

            <div className="rounded-full border border-[#59421d] bg-[#15120c] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d6a13b]">
              {networkLabel(network)}
            </div>
          </div>

          <div className="mt-7 max-w-4xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a77c2d]">
              Indexed chain analytics
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#f1f1ed] sm:text-4xl">
              Statistics
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#969792]">
              Aggregate statistics from the currently active indexed Mercatura chain. Values are
              derived from Explorer database state and update as the selected network advances or
              reorganizes.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1540px] space-y-6 px-5 pt-7 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Indexed Height"
            value={indexedHeight === null ? "Unavailable" : indexedHeight.toLocaleString("en-US")}
            note="Current indexed active-chain tip"
          />

          <MetricCard
            label="Active Blocks"
            value={formatInteger(statistics?.chain.activeBlocks)}
            note="Blocks currently marked active in the index"
          />

          <MetricCard
            label="Transactions"
            value={formatInteger(statistics?.transactions.total)}
            note="Coinbase and non-coinbase transactions"
          />

          <MetricCard
            label="UTXO Set"
            value={formatInteger(statistics?.utxos.count)}
            note="Currently unspent indexed outputs"
          />
        </section>

        <section className="gold-panel-soft overflow-hidden rounded-[10px]">
          <div className="border-b border-[#29271f] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#99732b]">
                  Network activity
                </div>

                <h2 className="mt-1 text-lg font-semibold text-[#efefec]">Transactions per Day</h2>

                <p className="mt-2 max-w-3xl text-xs leading-5 text-[#777975]">
                  Confirmed non-coinbase transactions grouped by UTC calendar day. Coinbase
                  transactions are excluded so the series reflects real network activity rather than
                  block creation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#30291b] bg-[#0a0b0a] p-1">
                {STATISTICS_RANGE_OPTIONS.map((option) => (
                  <Link
                    key={option.value}
                    href={statisticsHref(network, option.value)}
                    className={[
                      "rounded-md px-3 py-1.5 text-[11px] font-medium transition",
                      activityRange === option.value
                        ? "bg-[#3a2b12] text-[#e1ad45]"
                        : "text-[#777975] hover:bg-[#17150f] hover:text-[#c8c8c4]",
                    ].join(" ")}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#25241e] bg-[#0b0c0b] px-4 py-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#777975]">
                  Range Total
                </div>

                <div className="mt-1.5 text-lg font-semibold text-[#ecece8]">
                  {formatInteger(activityTotal)}
                </div>
              </div>

              <div className="rounded-lg border border-[#25241e] bg-[#0b0c0b] px-4 py-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#777975]">
                  Daily Average
                </div>

                <div className="mt-1.5 text-lg font-semibold text-[#ecece8]">
                  {formatAverageCount(activityTotal, dailyTransactions.length)}
                </div>
              </div>

              <div className="rounded-lg border border-[#25241e] bg-[#0b0c0b] px-4 py-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#777975]">
                  Latest Day
                </div>

                <div className="mt-1.5 text-lg font-semibold text-[#ecece8]">
                  {formatInteger(latestActivity?.nonCoinbaseTransactions)}
                </div>

                <div className="mt-0.5 text-[10px] text-[#6f706c]">
                  {formatUtcDate(latestActivity?.date)}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-5">
            <TransactionsPerDayChart rows={dailyTransactions} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="gold-panel-soft rounded-[10px]">
            <div className="border-b border-[#29271f] px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#99732b]">
                Chain
              </div>

              <h2 className="mt-1 text-lg font-semibold text-[#efefec]">Block Profile</h2>
            </div>

            <div className="px-5 py-1">
              <StatRow
                label="Indexed tip"
                value={
                  indexedHeight === null
                    ? "Unavailable"
                    : `Block ${indexedHeight.toLocaleString("en-US")}`
                }
              />

              <StatRow
                label="Tip hash"
                value={indexedTip ? shortenHash(indexedTip) : "Unavailable"}
              />

              <StatRow
                label="Total indexed block data"
                value={formatBytes(statistics?.blocks.totalBytes)}
              />

              <StatRow
                label="Total indexed block weight"
                value={`${formatInteger(statistics?.blocks.totalWeight)} WU`}
              />

              <StatRow
                label="Average block size"
                value={formatAverageBytes(statistics?.blocks.averageBytes)}
              />

              <StatRow
                label="Average block weight"
                value={formatDecimal(statistics?.blocks.averageWeight, " WU")}
              />
            </div>

            {indexedHeight !== null ? (
              <div className="border-t border-[#29271f] px-5 py-4">
                <Link
                  href={networkHref(network, `/block/${indexedHeight}`)}
                  className="text-xs font-medium text-[#d7a33c] transition hover:text-[#f0bf58]"
                >
                  Open indexed tip →
                </Link>
              </div>
            ) : null}
          </article>

          <article className="gold-panel-soft rounded-[10px]">
            <div className="border-b border-[#29271f] px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#99732b]">
                Activity
              </div>

              <h2 className="mt-1 text-lg font-semibold text-[#efefec]">Transactions & Fees</h2>
            </div>

            <div className="px-5 py-1">
              <StatRow
                label="Total transactions"
                value={formatInteger(statistics?.transactions.total)}
              />

              <StatRow
                label="Non-coinbase transactions"
                value={formatInteger(statistics?.transactions.nonCoinbase)}
              />

              <StatRow label="Non-coinbase share" value={nonCoinbaseShare} />

              <StatRow
                label="Average non-coinbase size"
                value={formatAverageBytes(statistics?.transactions.averageNonCoinbaseSize)}
              />

              <StatRow
                label="Average non-coinbase weight"
                value={formatDecimal(statistics?.transactions.averageNonCoinbaseWeight, " WU")}
              />

              <StatRow
                label="Cumulative transaction fees"
                value={formatMca(statistics?.transactions.feesBaseUnits)}
              />

              <StatRow
                label="Consensus subsidy"
                value={formatMca(statistics?.emission.consensusSubsidyBaseUnits)}
                note="Aggregate subsidy across the active indexed chain"
              />
            </div>

            <div className="border-t border-[#29271f] px-5 py-4">
              <Link
                href={networkHref(network, "/emission")}
                className="text-xs font-medium text-[#d7a33c] transition hover:text-[#f0bf58]"
              >
                View emission analytics →
              </Link>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="gold-panel-soft rounded-[10px]">
            <div className="border-b border-[#29271f] px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#99732b]">
                Ledger
              </div>

              <h2 className="mt-1 text-lg font-semibold text-[#efefec]">Address & UTXO State</h2>
            </div>

            <div className="px-5 py-1">
              <StatRow
                label="Tracked addresses"
                value={formatInteger(statistics?.addresses.count)}
              />

              <StatRow
                label="Zero-balance addresses"
                value={formatInteger(statistics?.addresses.zeroBalanceCount)}
              />

              <StatRow label="Zero-balance share" value={zeroBalanceShare} />

              <StatRow label="Active UTXOs" value={formatInteger(statistics?.utxos.count)} />

              <StatRow
                label="Active UTXO value"
                value={formatMca(statistics?.utxos.valueBaseUnits)}
              />
            </div>
          </article>

          <article className="gold-panel-soft rounded-[10px]">
            <div className="border-b border-[#29271f] px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#99732b]">
                Post-quantum
              </div>

              <h2 className="mt-1 text-lg font-semibold text-[#efefec]">PQ Footprint</h2>
            </div>

            <div className="px-5 py-1">
              <StatRow label="PQ outputs" value={formatInteger(statistics?.pq.outputCount)} />

              <StatRow
                label="PQ output share"
                value={pqOutputShare}
                note="Share of all active-chain indexed outputs"
              />

              <StatRow
                label="Addressed PQ outputs"
                value={formatInteger(statistics?.pq.addressedOutputCount)}
              />

              <StatRow
                label="PQ authorization inputs"
                value={formatInteger(statistics?.pq.authorizationInputCount)}
              />

              <StatRow
                label="PQ spending transactions"
                value={formatInteger(statistics?.pq.spendingTransactionCount)}
              />

              <StatRow
                label="Active PQ UTXOs"
                value={formatInteger(statistics?.pq.activeUtxoCount)}
              />

              <StatRow label="PQ UTXO share" value={pqUtxoShare} />

              <StatRow
                label="Active PQ UTXO value"
                value={formatMca(statistics?.pq.activeUtxoValueBaseUnits)}
              />
            </div>

            <div className="border-t border-[#29271f] px-5 py-4">
              <Link
                href={networkHref(network, "/pq")}
                className="text-xs font-medium text-[#d7a33c] transition hover:text-[#f0bf58]"
              >
                View PQ analytics →
              </Link>
            </div>
          </article>
        </section>

        <section className="gold-panel-soft overflow-hidden rounded-[10px]">
          <div className="border-b border-[#29271f] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#99732b]">
              Distribution
            </div>

            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#efefec]">Output Types</h2>

                <p className="mt-1 text-xs leading-5 text-[#777975]">
                  All outputs belonging to blocks currently marked active by the Explorer index.
                </p>
              </div>

              <div className="text-xs text-[#7f807c]">
                Total outputs: {formatInteger(totalOutputCount)}
              </div>
            </div>
          </div>

          {outputTypes.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#777975]">
              Output distribution is unavailable.
            </div>
          ) : (
            <div className="table-shell overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#29271f] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#777975]">
                    <th className="px-5 py-3">Script Type</th>
                    <th className="px-5 py-3 text-right">Outputs</th>
                    <th className="px-5 py-3 text-right">Addressed</th>
                    <th className="px-5 py-3 text-right">Value</th>
                    <th className="px-5 py-3 text-right">Share</th>
                  </tr>
                </thead>

                <tbody>
                  {outputTypes.map((row) => {
                    const share = formatPercentage(row.outputCount, totalOutputCount);

                    const width = percentageNumber(row.outputCount, totalOutputCount);

                    const isPq = row.scriptType === "witness_v2_mercatura_pq";

                    return (
                      <tr key={row.scriptType} className="border-b border-[#22221d] last:border-0">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[#d8d8d4]">
                              {formatScriptType(row.scriptType)}
                            </span>

                            {isPq ? (
                              <span className="rounded-full border border-[#5a431e] bg-[#17130c] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d7a33c]">
                                PQ
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-[#20201b]">
                            <div
                              className="h-full rounded-full bg-[#b98931]"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right text-xs tabular-nums text-[#bfc0bc]">
                          {formatInteger(row.outputCount)}
                        </td>

                        <td className="px-5 py-4 text-right text-xs tabular-nums text-[#bfc0bc]">
                          {formatInteger(row.addressedOutputCount)}
                        </td>

                        <td className="px-5 py-4 text-right text-xs tabular-nums text-[#bfc0bc]">
                          {formatMca(row.totalValueBaseUnits)}
                        </td>

                        <td className="px-5 py-4 text-right text-xs font-medium tabular-nums text-[#d7a33c]">
                          {share}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[10px] border border-[#29271f] bg-[#0c0d0c] px-5 py-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f6b28]">
            About these statistics
          </div>

          <p className="mt-3 max-w-5xl text-xs leading-6 text-[#777975]">
            These values are aggregate Explorer statistics for the currently active indexed chain.
            They are not historical trend estimates. Reorganizations can change active-chain totals,
            and values may lag the node briefly while the indexer catches up.
          </p>
        </section>
      </div>
    </main>
  );
}
