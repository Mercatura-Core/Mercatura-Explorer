import Link from "next/link";

import { parseExplorerNetwork, type ExplorerNetwork } from "../../lib/explorer-network";
import { fetchExplorerApi } from "../../lib/explorer-server-api";

const PAGE_SIZE = 25;
const MAX_OFFSET = 100_000;

interface TransactionListResponse {
  transactions: Array<{
    txid: string;
    wtxid: string;
    blockHash: string;
    blockHeight: number;
    blockTime: string;
    blockIndex: number;
    version: number;
    locktime: string;
    size: number;
    vsize: number;
    weight: number;
    feeBaseUnits: string | null;
    coinbase: boolean;
    inputAddresses: string[];
    outputAddresses: string[];
    totalOutputBaseUnits: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
  };
}

function parseOffset(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return 0;
  }

  const parsed = Number(candidate);

  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_OFFSET) {
    return 0;
  }

  return parsed;
}

function networkLabel(network: ExplorerNetwork): string {
  return network === "mainnet" ? "Mainnet" : "Testnet";
}

function listHref(network: ExplorerNetwork, offset: number): string {
  const params = new URLSearchParams({ network });

  if (offset > 0) {
    params.set("offset", String(offset));
  }

  return `/transactions?${params.toString()}`;
}

function formatRelativeTime(value: string): string {
  if (!/^\d+$/.test(value)) {
    return "Unavailable";
  }

  const seconds = Number(value);

  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    return "Unavailable";
  }

  const elapsed = Math.max(0, Math.floor((Date.now() - seconds * 1000) / 1000));

  if (elapsed < 60) return `${elapsed}s ago`;

  const minutes = Math.floor(elapsed / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function formatMca(value: string | null | undefined): string {
  if (value === null || value === undefined || !/^-?\d+$/.test(value)) {
    return "—";
  }

  const amount = BigInt(value);
  const negative = amount < BigInt(0);
  const absolute = negative ? -amount : amount;
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");

  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function shortenAddress(address: string): string {
  if (address.length <= 20) {
    return address;
  }

  return `${address.slice(0, 10)}…${address.slice(-7)}`;
}

function TransactionParty({
  addresses,
  network,
  coinbase = false,
}: {
  addresses: string[];
  network: ExplorerNetwork;
  coinbase?: boolean;
}) {
  if (coinbase) {
    return <span className="text-[#9b9c98]">Coinbase</span>;
  }

  if (addresses.length === 0) {
    return <span className="text-[#777975]">Unresolved</span>;
  }

  if (addresses.length === 1) {
    const address = addresses[0]!;

    return (
      <Link
        href={`/address/${encodeURIComponent(address)}?network=${network}`}
        title={address}
        className="font-mono text-[#c3a45f] transition hover:text-[#edbe5b]"
      >
        {shortenAddress(address)}
      </Link>
    );
  }

  return (
    <span className="text-[#9b9c98]" title={addresses.join(", ")}>
      {addresses.length.toLocaleString("en-US")} addresses
    </span>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
    offset?: string | string[];
  }>;
}) {
  const parameters = await searchParams;
  const requestedNetwork = Array.isArray(parameters.network)
    ? parameters.network[0]
    : parameters.network;

  const network = parseExplorerNetwork(requestedNetwork);
  const offset = parseOffset(parameters.offset);

  const response = await fetchExplorerApi<TransactionListResponse>(
    network,
    `transactions?limit=${PAGE_SIZE}&offset=${offset}`
  );

  const transactions = response?.transactions ?? [];
  const previousOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = response?.pagination.nextOffset ?? null;

  return (
    <main className="mx-auto max-w-[1540px] px-5 py-8 sm:px-8">
      <section className="gold-panel rounded-[10px] px-5 py-6 sm:px-7">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a77c2d]">
          Active chain
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#f3f3ef]">
              Transactions
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#888985]">
              Indexed {networkLabel(network)} transaction history, newest first.
            </p>
          </div>

          <Link
            href={`/?network=${network}`}
            className="text-xs font-medium text-[#d8a33a] transition hover:text-[#efbd57]"
          >
            ← Back to Explorer
          </Link>
        </div>
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#efefec]">Transaction History</h2>

            <p className="mt-1 text-xs text-[#777975]">
              {transactions.length.toLocaleString("en-US")} transactions shown
            </p>
          </div>

          <Link
            href={listHref(network, 0)}
            className="text-xs font-medium text-[#d7a33c] transition hover:text-[#efbd57]"
          >
            Latest
          </Link>
        </div>

        {response === null ? (
          <div className="px-5 py-12 text-center text-xs text-[#777975]">
            {networkLabel(network)} transaction history is unavailable.
          </div>
        ) : (
          <div className="overflow-x-auto px-4 py-4">
            <table className="table-shell w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="bg-[#151717] text-[11px] font-normal text-[#90918f]">
                  <th className="rounded-l-md px-3 py-2 font-normal">Transaction</th>
                  <th className="px-3 py-2 font-normal">Block</th>
                  <th className="px-3 py-2 font-normal">From</th>
                  <th className="px-3 py-2 font-normal">To</th>
                  <th className="px-3 py-2 font-normal">Amount</th>
                  <th className="px-3 py-2 font-normal">Fee</th>
                  <th className="rounded-r-md px-3 py-2 font-normal">Time</th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-xs text-[#777975]">
                      No transactions were returned for this page.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.txid}>
                      <td className="border-b border-[#242625] px-3 py-3">
                        <Link
                          href={`/tx/${transaction.txid}?network=${network}`}
                          title={transaction.txid}
                          className="font-mono text-xs text-[#d8a33a] transition hover:text-[#edbe5b]"
                        >
                          {transaction.txid.slice(0, 14)}…
                        </Link>
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs">
                        <Link
                          href={`/block/${transaction.blockHeight}?network=${network}`}
                          className="font-medium text-[#d8a33a] transition hover:text-[#edbe5b]"
                        >
                          {transaction.blockHeight.toLocaleString("en-US")}
                        </Link>
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs">
                        <TransactionParty
                          addresses={transaction.inputAddresses}
                          network={network}
                          coinbase={transaction.coinbase}
                        />
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs">
                        <TransactionParty
                          addresses={transaction.outputAddresses}
                          network={network}
                        />
                      </td>

                      <td
                        className="border-b border-[#242625] px-3 py-3 text-xs font-medium text-[#d8a33a]"
                        title="Total value of all transaction outputs"
                      >
                        {formatMca(transaction.totalOutputBaseUnits)}
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#c2c3bf]">
                        {transaction.coinbase ? "—" : formatMca(transaction.feeBaseUnits)}
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#a2a3a0]">
                        {formatRelativeTime(transaction.blockTime)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292820] px-5 py-4">
          {offset > 0 ? (
            <Link
              href={listHref(network, previousOffset)}
              className="inline-flex items-center rounded-md border border-[#4a391a] bg-[#12110d] px-4 py-2 text-xs font-medium text-[#d8a33a] transition hover:border-[#775921] hover:text-[#efbd57]"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}

          {nextOffset !== null ? (
            <Link
              href={listHref(network, nextOffset)}
              className="inline-flex items-center rounded-md border border-[#4a391a] bg-[#12110d] px-4 py-2 text-xs font-medium text-[#d8a33a] transition hover:border-[#775921] hover:text-[#efbd57]"
            >
              Older →
            </Link>
          ) : (
            <span className="text-xs text-[#686965]">End of indexed history</span>
          )}
        </div>
      </section>
    </main>
  );
}
