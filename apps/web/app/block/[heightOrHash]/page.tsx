import Link from "next/link";

import { fetchExplorerApi } from "../../../lib/explorer-server-api";
import { parseExplorerNetwork } from "../../../lib/explorer-network";

type BlockDetailResponse = {
  block: {
    hash: string;
    height: number;
    previous_hash: string | null;
    time: string;
    median_time: string;
    bits: string;
    target: string;
    difficulty: number;
    chainwork: string;
    tx_count: number;
    stripped_size: number;
    size: number;
    weight: number;
    active: boolean;
    next_hash: string | null;
  };
  transactions: Array<{
    txid: string;
    wtxid: string;
    block_index: number;
    version: number;
    locktime: string;
    size: number;
    vsize: number;
    weight: number;
    fee_base_units: string | null;
  }>;
};

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

function formatTimestamp(value: string): string {
  const seconds = parseUnixSeconds(value);

  if (seconds === null) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(seconds * 1000));
}

function formatRelativeTime(value: string): string {
  const timestamp = parseUnixSeconds(value);

  if (timestamp === null) {
    return "Unavailable";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp * 1000) / 1000));

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

  return `${Math.floor(hours / 24)}d ago`;
}

function formatBytes(bytes: number): string {
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

function formatDifficulty(value: number): string {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 8,
  }).format(value);
}

function formatMca(baseUnits: string): string {
  const value = BigInt(baseUnits);
  const baseUnitsPerMca = BigInt(100);
  const whole = value / baseUnitsPerMca;
  const fraction = (value % baseUnitsPerMca).toString().padStart(2, "0");

  return `${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function shortHash(value: string): string {
  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}

export default async function BlockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    heightOrHash: string;
  }>;
  searchParams: Promise<{
    network?: string | string[];
  }>;
}) {
  const { heightOrHash } = await params;
  const query = await searchParams;

  const requestedNetwork = Array.isArray(query.network) ? query.network[0] : query.network;

  const network = parseExplorerNetwork(requestedNetwork);

  const detail = await fetchExplorerApi<BlockDetailResponse>(
    network,
    `blocks/${encodeURIComponent(heightOrHash)}`
  );

  if (detail === null) {
    return (
      <main className="mx-auto max-w-[1540px] px-5 py-10 sm:px-8">
        <Link
          href={`/?network=${network}`}
          className="text-sm font-medium text-[#d8a33a] hover:text-[#edbe5b]"
        >
          ← Back to Explorer
        </Link>

        <section className="gold-panel mt-6 rounded-[10px] px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-white">Block could not be loaded</h1>

          <p className="mt-3 text-sm text-[#8f918d]">
            The block was not found or the selected {network === "mainnet" ? "Mainnet" : "Testnet"}{" "}
            explorer backend is unavailable.
          </p>
        </section>
      </main>
    );
  }

  const { block, transactions } = detail;

  const previousHref =
    block.previous_hash === null ? null : `/block/${block.previous_hash}?network=${network}`;

  const nextHref = block.next_hash === null ? null : `/block/${block.next_hash}?network=${network}`;

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
        <div className="border-b border-[#292820] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9a9a96]">
                Mercatura Block
              </p>

              <h1 className="mt-2 text-2xl font-semibold text-[#f1f1ee] sm:text-3xl">
                #{block.height.toLocaleString("en-US")}
              </h1>

              <p className="mt-2 font-mono text-xs text-[#b89246] sm:text-sm">{block.hash}</p>
            </div>

            <span className="rounded-full border border-[#665020] bg-[#17140c] px-3 py-1.5 text-xs font-medium text-[#e3ae43]">
              Active Chain
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Timestamp</p>
            <p className="mt-2 text-sm font-medium text-white">{formatTimestamp(block.time)}</p>
            <p className="mt-1 text-xs text-[#8c8d89]">{formatRelativeTime(block.time)} · UTC</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Difficulty</p>
            <p className="mt-2 text-sm font-medium text-[#e3ae43]">
              {formatDifficulty(block.difficulty)}
            </p>
            <p className="mt-1 text-xs text-[#8c8d89]">DGWv3</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Transactions</p>
            <p className="mt-2 text-sm font-medium text-white">
              {block.tx_count.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs text-[#8c8d89]">Ordered by block index</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Block Size</p>
            <p className="mt-2 text-sm font-medium text-white">{formatBytes(block.size)}</p>
            <p className="mt-1 text-xs text-[#8c8d89]">
              Weight {block.weight.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="border-b border-[#292820] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#efefec]">Block Details</h2>
        </div>

        <dl className="divide-y divide-[#24251f]">
          {[
            ["Hash", block.hash],
            ["Previous Block", block.previous_hash ?? "Genesis"],
            ["Next Block", block.next_hash ?? "Chain tip"],
            ["Median Time", `${formatTimestamp(block.median_time)} UTC`],
            ["Bits", block.bits],
            ["Target", block.target],
            ["Chainwork", block.chainwork],
            ["Stripped Size", formatBytes(block.stripped_size)],
            ["Serialized Size", formatBytes(block.size)],
            ["Weight", block.weight.toLocaleString("en-US")],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[170px_1fr] sm:px-6">
              <dt className="text-xs text-[#858783]">{label}</dt>
              <dd className="break-all font-mono text-xs text-[#c7c8c4]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap justify-between gap-3 border-t border-[#292820] px-5 py-4 sm:px-6">
          {previousHref === null ? (
            <span className="text-xs text-[#555752]">← Previous Block</span>
          ) : (
            <Link
              href={previousHref}
              title={block.previous_hash ?? undefined}
              className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
            >
              ← Previous Block
            </Link>
          )}

          {nextHref === null ? (
            <span className="text-xs text-[#555752]">Next Block →</span>
          ) : (
            <Link
              href={nextHref}
              title={block.next_hash ?? undefined}
              className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
            >
              Next Block →
            </Link>
          )}
        </div>
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="flex items-center justify-between border-b border-[#292820] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#efefec]">Transactions</h2>

          <span className="text-xs text-[#858783]">
            {transactions.length.toLocaleString("en-US")} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
              <tr>
                <th className="px-5 py-3 font-medium">Index</th>
                <th className="px-5 py-3 font-medium">Transaction ID</th>
                <th className="px-5 py-3 font-medium">Fee</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Weight</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.txid} className="border-t border-[#24251f]">
                  <td className="px-5 py-3 text-xs text-[#8d8e8a]">{transaction.block_index}</td>

                  <td className="px-5 py-3 font-mono text-xs">
                    <Link
                      href={`/tx/${transaction.txid}?network=${network}`}
                      title={transaction.txid}
                      className="text-[#d8a33a] hover:text-[#edbe5b]"
                    >
                      {shortHash(transaction.txid)}
                    </Link>
                  </td>

                  <td className="px-5 py-3 text-xs text-[#c4c5c1]">
                    {transaction.fee_base_units === null
                      ? transaction.block_index === 0
                        ? "Coinbase"
                        : "Unavailable"
                      : formatMca(transaction.fee_base_units)}
                  </td>

                  <td className="px-5 py-3 text-xs text-[#999a96]">
                    {formatBytes(transaction.size)}
                  </td>

                  <td className="px-5 py-3 text-xs text-[#999a96]">
                    {transaction.weight.toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
