import Link from "next/link";

import {
  DEFAULT_EXPLORER_NETWORK,
  parseExplorerNetwork,
  type ExplorerNetwork,
} from "../../lib/explorer-network";
import { fetchExplorerApi } from "../../lib/explorer-server-api";
import { MINING_WINDOW_OPTIONS, parseMiningWindow } from "../../lib/mining-window";
import { AxisLineChart } from "../../components/axis-line-chart";
import { EmissionHistoryTable } from "../../components/emission-history-table";

const BOOTSTRAP_END_HEIGHT = 311_040;
const ADAPTIVE_START_HEIGHT = 311_041;

const BOOTSTRAP_ISSUANCE_BASE_UNITS = BigInt("2000000000000");
const BOOTSTRAP_BOUNDARY_REWARD_BASE_UNITS = BigInt("2378234");
const PERMANENT_FLOOR_BASE_UNITS = BigInt("23782");

interface EmissionHistoryRow {
  height: number;
  hash: string;
  time: string;
  subsidy_base_units: string;
  total_fee_base_units: string;
  coinbase_payout_base_units: string;
  actual_issuance_base_units: string;
  cumulative_issued_base_units: string;
}

interface EmissionResponse {
  chain: {
    indexedHeight: number | null;
    indexedTip: string | null;
  };

  totals: {
    consensusSubsidyIncludingGenesisBaseUnits: string;
    consensusSubsidyExcludingGenesisBaseUnits: string;
    actualIssuedIncludingGenesisBaseUnits: string;
    actualIssuedExcludingGenesisBaseUnits: string;
    genesisUnspendableBaseUnits: string;
    transactionFeesBaseUnits: string;
    spendableUtxoValueBaseUnits: string;
  };

  current: {
    height: number;
    hash: string;
    subsidyBaseUnits: string;
    feesBaseUnits: string;
  } | null;

  history: EmissionHistoryRow[];

  pagination: {
    limit: number;
    page?: number;
    totalItems?: number;
    totalPages?: number;
    nextBeforeHeight: number | null;
  };
}

function singleParameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseBeforeHeight(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatMca(value: string | bigint | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  try {
    const amount = typeof value === "bigint" ? value : BigInt(value);

    const negative = amount < BigInt(0);
    const absolute = negative ? -amount : amount;

    const whole = absolute / BigInt(100);
    const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");

    return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${fraction} MCA`;
  } catch {
    return "Unavailable";
  }
}

function formatHeight(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unavailable" : value.toLocaleString("en-US");
}

function shortenHash(hash: string): string {
  if (hash.length <= 20) {
    return hash;
  }

  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function emissionPhase(height: number | null | undefined): {
  label: string;
  detail: string;
} {
  if (height === null || height === undefined) {
    return {
      label: "Unavailable",
      detail: "Waiting for indexed chain state",
    };
  }

  if (height === 0) {
    return {
      label: "Genesis",
      detail: "Bootstrap issuance begins at block 1",
    };
  }

  if (height <= BOOTSTRAP_END_HEIGHT) {
    const remaining = BOOTSTRAP_END_HEIGHT - height;

    return {
      label: "Bootstrap",
      detail:
        remaining === 0
          ? "Final bootstrap block"
          : `${remaining.toLocaleString("en-US")} bootstrap blocks remaining`,
    };
  }

  return {
    label: "Adaptive SP-LT",
    detail: `${(height - BOOTSTRAP_END_HEIGHT).toLocaleString("en-US")} adaptive blocks indexed`,
  };
}

function bootstrapProgress(height: number | null | undefined): number {
  if (height === null || height === undefined || height <= 0) {
    return 0;
  }

  if (height >= BOOTSTRAP_END_HEIGHT) {
    return 100;
  }

  return (height / BOOTSTRAP_END_HEIGHT) * 100;
}

function networkLabel(network: ExplorerNetwork): string {
  return network === "mainnet" ? "Mainnet" : "Testnet";
}

function networkHref(network: ExplorerNetwork, path: string): string {
  return `${path}?network=${network}`;
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

function SubsidyChart({ rows }: { rows: Array<{height: number; time: string; subsidyBaseUnits: string}> }) {
  return (
    <AxisLineChart
      points={[...rows].reverse().map((row) => ({
        x: row.height,
        y: Number(row.subsidyBaseUnits) / 100,
        title: `Block ${row.height.toLocaleString("en-US")}: ${formatMca(row.subsidyBaseUnits)}`,
      }))}
      yLabel="Block subsidy (MCA)"
      formatY={(value) => new Intl.NumberFormat("en-US", {maximumFractionDigits: 2}).format(value)}
    />
  );
}

export default async function EmissionPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
    beforeHeight?: string | string[];
    trend?: string | string[];
  }>;
}) {
  const parameters = await searchParams;

  const requestedNetwork = singleParameter(parameters.network);

  const network = parseExplorerNetwork(requestedNetwork ?? DEFAULT_EXPLORER_NETWORK);

  const beforeHeight = parseBeforeHeight(singleParameter(parameters.beforeHeight));
  const trendWindow = parseMiningWindow(parameters.trend);

  const [emission, miningTrend] = await Promise.all([
    fetchExplorerApi<EmissionResponse>(
      network,
      "emission?limit=20"
    ),
    fetchExplorerApi<{
      history: Array<{height: number; time: string; subsidyBaseUnits: string}>;
      window: {actualBlocks: number};
    }>(network, `mining?window=${trendWindow}`),
  ]);

  const indexedHeight = emission?.chain.indexedHeight ?? null;

  const phase = emissionPhase(indexedHeight);

  const progress = bootstrapProgress(indexedHeight);

  const currentSubsidy = emission?.current?.subsidyBaseUnits;

  const currentFees = emission?.current?.feesBaseUnits;

  const history = emission?.history ?? [];
  const trendRows = miningTrend?.history ?? [];



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
              Monetary issuance
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#f3f3ef] sm:text-4xl lg:text-[42px]">
              Emission
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#a7a7a3] sm:text-[15px]">
              Mercatura begins with a deterministic 311,040-block bootstrap that issues exactly 20
              billion MCA, then transitions to adaptive SP-LT issuance. The Explorer displays
              authoritative indexed results from Mercatura Core and does not calculate or predict
              future adaptive rewards in the frontend.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1540px] px-5 pt-7 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Issued Supply"
            value={formatMca(emission?.totals.actualIssuedExcludingGenesisBaseUnits)}
            note="Actual issuance excluding the unspendable genesis coinbase"
          />

          <MetricCard
            label="Current Subsidy"
            value={formatMca(currentSubsidy)}
            note="Authoritative subsidy at the latest indexed block"
          />

          <MetricCard
            label="Indexed Height"
            value={formatHeight(indexedHeight)}
            note={
              emission?.chain.indexedTip
                ? `Tip ${shortenHash(emission.chain.indexedTip)}`
                : "No indexed tip"
            }
          />

          <MetricCard label="Emission Phase" value={phase.label} note={phase.detail} />
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Spendable UTXO Value"
            value={formatMca(emission?.totals.spendableUtxoValueBaseUnits)}
            note="Value represented by the active spendable UTXO set"
          />

          <MetricCard
            label="Cumulative Fees"
            value={formatMca(emission?.totals.transactionFeesBaseUnits)}
            note="Transaction fees across the active indexed chain"
          />

          <MetricCard
            label="Consensus Subsidy"
            value={formatMca(emission?.totals.consensusSubsidyExcludingGenesisBaseUnits)}
            note="Scheduled subsidy total excluding genesis"
          />

          <MetricCard
            label="Genesis Unspendable"
            value={formatMca(emission?.totals.genesisUnspendableBaseUnits)}
            note="Genesis coinbase value excluded from circulating issuance"
          />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
          <article className="gold-panel rounded-[10px] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8e8a]">
                  Bootstrap → Adaptive
                </div>

                <h2 className="mt-2 text-xl font-semibold text-[#eeeeea]">Issuance lifecycle</h2>
              </div>

              <div className="text-right">
                <div className="text-xs text-[#777975]">Current phase</div>

                <div className="mt-1 text-sm font-semibold text-[#d8a33a]">{phase.label}</div>
              </div>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between gap-3 text-[11px] text-[#858681]">
                <span>Bootstrap progress</span>

                <span>{progress.toFixed(2)}%</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1c1d1b]">
                <div
                  className="h-full rounded-full bg-[#d5a13b]"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-[#747570]">
                <span>Block 1</span>

                <span>Block {BOOTSTRAP_END_HEIGHT.toLocaleString("en-US")}</span>

                <span>Adaptive from {ADAPTIVE_START_HEIGHT.toLocaleString("en-US")}</span>
              </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[#2d281c] bg-[#0d0e0d] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#797a76]">
                  Bootstrap issuance
                </div>

                <div className="mt-2 text-base font-semibold text-[#e7e7e2]">
                  {formatMca(BOOTSTRAP_ISSUANCE_BASE_UNITS)}
                </div>
              </div>

              <div className="rounded-lg border border-[#2d281c] bg-[#0d0e0d] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#797a76]">
                  Boundary reward
                </div>

                <div className="mt-2 text-base font-semibold text-[#e7e7e2]">
                  {formatMca(BOOTSTRAP_BOUNDARY_REWARD_BASE_UNITS)}
                </div>
              </div>

              <div className="rounded-lg border border-[#2d281c] bg-[#0d0e0d] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#797a76]">
                  Permanent floor
                </div>

                <div className="mt-2 text-base font-semibold text-[#e7e7e2]">
                  {formatMca(PERMANENT_FLOOR_BASE_UNITS)}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-[#332b1b] bg-[#11100c] p-4 text-xs leading-6 text-[#969792]">
              The adaptive phase has no Bitcoin-style halving schedule and no fixed supply cap.
              SP-LT reward calculation remains consensus logic in Mercatura Core; this page only
              presents indexed authoritative values and fixed protocol boundaries.
            </div>
          </article>

          <article className="gold-panel rounded-[10px] p-5 sm:p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8e8a]">
              Current block
            </div>

            <h2 className="mt-2 text-xl font-semibold text-[#eeeeea]">Reward composition</h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-[#24231d] pb-4">
                <span className="text-sm text-[#969792]">Subsidy</span>

                <span className="text-sm font-semibold text-[#e0aa40]">
                  {formatMca(currentSubsidy)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-[#24231d] pb-4">
                <span className="text-sm text-[#969792]">Transaction fees</span>

                <span className="text-sm font-semibold text-[#e7e7e2]">
                  {formatMca(currentFees)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-[#24231d] pb-4">
                <span className="text-sm text-[#969792]">Miner subsidy share</span>

                <span className="text-sm font-semibold text-[#e7e7e2]">100%</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#969792]">Halvings</span>

                <span className="text-sm font-semibold text-[#e7e7e2]">None</span>
              </div>
            </div>

            {emission?.current ? (
              <Link
                href={`/block/${emission.current.hash}?network=${network}`}
                className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-[#d8a33a] transition hover:text-[#efbd57]"
              >
                View current block
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </article>
        </section>

        <section className="gold-panel mt-7 rounded-[10px] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8e8a]">
                Indexed history
              </div>

              <h2 className="mt-2 text-xl font-semibold text-[#eeeeea]">Recent subsidy trend</h2>

              <p className="mt-2 text-xs leading-5 text-[#81827e]">
                Indexed active-chain subsidy history, sampled across the selected window.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {MINING_WINDOW_OPTIONS.map((option) => (
                <Link key={option.value}
                  href={`/emission?network=${network}&trend=${option.value}${beforeHeight === undefined ? "" : `&beforeHeight=${beforeHeight}`}`}
                  className={`rounded border px-3 py-2 text-[11px] font-medium ${trendWindow === option.value ? "border-[#d8a33a] bg-[#d8a33a] text-[#15120b]" : "border-[#49371b] text-[#d5a13b] hover:text-white"}`}>
                  {option.label}
                </Link>
              ))}
              <span className="text-[11px] text-[#777975]">{miningTrend?.window.actualBlocks.toLocaleString("en-US") ?? "0"} blocks observed</span>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[#26231a] bg-[#0a0b0a] p-4">
            {miningTrend === null ? (
              <p className="py-10 text-center text-xs leading-6 text-[#b8aa8f]">
                The selected API does not provide {trendWindow.toUpperCase()} historical Mining data.
                A local frontend using the deployed API requires the updated backend to be deployed
                or an up-to-date local API with its indexed database.
              </p>
            ) : (
              <SubsidyChart rows={trendRows} />
            )}
          </div>
        </section>

        <EmissionHistoryTable
          network={network}
          initialRows={history}
          totalItems={emission?.pagination.totalItems ?? (indexedHeight === null ? 0 : indexedHeight + 1)}
        />
      </div>
    </main>
  );
}
