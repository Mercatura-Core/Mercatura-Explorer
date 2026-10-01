import Link from "next/link";

import { fetchExplorerApi } from "../../../lib/explorer-server-api";
import { parseExplorerNetwork, type ExplorerNetwork } from "../../../lib/explorer-network";
import { formatMercaturaScriptType, isMercaturaPqScriptType } from "../../../lib/mercatura-pq";

const PAGE_SIZE = 20;

type AddressSummary = {
  address: string;
  transactionCount: string;
  totalReceivedBaseUnits: string;
  totalSpentBaseUnits: string;
  balanceBaseUnits: string;
  utxoCount: string;
};

type AddressTransaction = {
  txid: string;
  block_hash: string;
  block_height: number;
  block_time: string;
  block_index: number;
  received_base_units: string;
  spent_base_units: string;
  net_base_units: string;
};

const MAX_ADDRESS_OFFSET = 100_000;

type AddressTransactionsResponse = {
  address: string;
  transactions: AddressTransaction[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
  };
};

type AddressUtxo = {
  transaction_id: string;
  txid: string;
  vout: number;
  value_base_units: string;
  script_asm: string;
  script_desc: string;
  script_hex: string;
  address: string | null;
  script_type: string;
  block_hash: string;
  block_height: number;
  block_time: string;
  is_coinbase: boolean;
};

type AddressUtxosResponse = {
  address: string;
  utxos: AddressUtxo[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
  };
};

function parseOffset(value: string | string[] | undefined): number {
  const selected = Array.isArray(value) ? value[0] : value;

  if (selected === undefined || !/^\d+$/.test(selected)) {
    return 0;
  }

  const offset = Number(selected);

  if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_ADDRESS_OFFSET) {
    return 0;
  }

  return offset;
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

function formatMca(
  baseUnits: string,
  options: {
    showPlus?: boolean;
  } = {}
): string {
  if (!/^-?\d+$/.test(baseUnits)) {
    return "Unavailable";
  }

  const value = BigInt(baseUnits);
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");

  const sign = negative ? "-" : options.showPlus && value > BigInt(0) ? "+" : "";

  return `${sign}${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function formatInteger(value: string): string {
  if (!/^\d+$/.test(value)) {
    return value;
  }

  return BigInt(value).toLocaleString("en-US");
}

function shortHash(value: string): string {
  if (value.length <= 30) {
    return value;
  }

  return `${value.slice(0, 14)}…${value.slice(-12)}`;
}

function addressHref(
  address: string,
  network: ExplorerNetwork,
  txOffset: number,
  utxoOffset: number
): string {
  const parameters = new URLSearchParams({
    network,
  });

  if (txOffset > 0) {
    parameters.set("txOffset", txOffset.toString());
  }

  if (utxoOffset > 0) {
    parameters.set("utxoOffset", utxoOffset.toString());
  }

  return `/address/${encodeURIComponent(address)}?${parameters.toString()}`;
}

export default async function AddressDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    address: string;
  }>;
  searchParams: Promise<{
    network?: string | string[];
    txOffset?: string | string[];
    utxoOffset?: string | string[];
  }>;
}) {
  const { address } = await params;
  const query = await searchParams;

  const requestedNetwork = Array.isArray(query.network) ? query.network[0] : query.network;

  const network = parseExplorerNetwork(requestedNetwork);
  const txOffset = parseOffset(query.txOffset);
  const utxoOffset = parseOffset(query.utxoOffset);
  const encodedAddress = encodeURIComponent(address);

  const [summary, history, utxos] = await Promise.all([
    fetchExplorerApi<AddressSummary>(network, `addresses/${encodedAddress}`),
    fetchExplorerApi<AddressTransactionsResponse>(
      network,
      `addresses/${encodedAddress}/transactions?limit=${PAGE_SIZE}&offset=${txOffset}`
    ),
    fetchExplorerApi<AddressUtxosResponse>(
      network,
      `addresses/${encodedAddress}/utxos?limit=${PAGE_SIZE}&offset=${utxoOffset}`
    ),
  ]);

  if (summary === null) {
    return (
      <main className="mx-auto max-w-[1540px] px-5 py-10 sm:px-8">
        <Link
          href={`/?network=${network}`}
          className="text-sm font-medium text-[#d8a33a] hover:text-[#edbe5b]"
        >
          ← Back to Explorer
        </Link>

        <section className="gold-panel mt-6 rounded-[10px] px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-white">Address could not be loaded</h1>

          <p className="mt-3 text-sm text-[#8f918d]">
            The address was not found or the selected{" "}
            {network === "mainnet" ? "Mainnet" : "Testnet"} explorer backend is unavailable.
          </p>
        </section>
      </main>
    );
  }

  const previousTxOffset = Math.max(0, txOffset - PAGE_SIZE);
  const previousUtxoOffset = Math.max(0, utxoOffset - PAGE_SIZE);

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
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9a9a96]">
            Mercatura Address
          </p>

          <h1 className="mt-2 text-xl font-semibold text-[#f1f1ee] sm:text-2xl">Address</h1>

          <p className="mt-2 break-all font-mono text-xs text-[#b89246] sm:text-sm">
            {summary.address}
          </p>
        </div>

        <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-5">
          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Balance</p>
            <p className="mt-2 text-sm font-medium text-[#e3ae43]">
              {formatMca(summary.balanceBaseUnits)}
            </p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Received</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatMca(summary.totalReceivedBaseUnits)}
            </p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Spent</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatMca(summary.totalSpentBaseUnits)}
            </p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Transactions</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatInteger(summary.transactionCount)}
            </p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">UTXOs</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatInteger(summary.utxoCount)}
            </p>
          </div>
        </div>
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#efefec]">Transaction History</h2>
            <p className="mt-1 text-xs text-[#777975]">Active-chain activity for this address</p>
          </div>

          <span className="text-xs text-[#858783]">Offset {txOffset.toLocaleString("en-US")}</span>
        </div>

        {history === null ? (
          <div className="px-5 py-10 text-center text-xs text-[#777975]">
            Transaction history is unavailable.
          </div>
        ) : history.transactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#777975]">
            No transactions at this offset.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                <tr>
                  <th className="px-5 py-3 font-medium">Transaction</th>
                  <th className="px-5 py-3 font-medium">Block</th>
                  <th className="px-5 py-3 font-medium">Received</th>
                  <th className="px-5 py-3 font-medium">Spent</th>
                  <th className="px-5 py-3 font-medium">Net</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>

              <tbody>
                {history.transactions.map((transaction) => (
                  <tr
                    key={`${transaction.txid}:${transaction.block_index}`}
                    className="border-t border-[#24251f]"
                  >
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link
                        href={`/tx/${transaction.txid}?network=${network}`}
                        title={transaction.txid}
                        className="text-[#d8a33a] hover:text-[#edbe5b]"
                      >
                        {shortHash(transaction.txid)}
                      </Link>
                    </td>

                    <td className="px-5 py-3 text-xs">
                      <Link
                        href={`/block/${transaction.block_hash}?network=${network}`}
                        className="text-[#d8a33a] hover:text-[#edbe5b]"
                      >
                        #{transaction.block_height.toLocaleString("en-US")}
                      </Link>
                    </td>

                    <td className="px-5 py-3 text-xs text-[#c7c8c4]">
                      {formatMca(transaction.received_base_units)}
                    </td>

                    <td className="px-5 py-3 text-xs text-[#c7c8c4]">
                      {formatMca(transaction.spent_base_units)}
                    </td>

                    <td className="px-5 py-3 text-xs font-medium text-[#e3ae43]">
                      {formatMca(transaction.net_base_units, {
                        showPlus: true,
                      })}
                    </td>

                    <td className="px-5 py-3 text-xs text-[#8f918d]">
                      <span title={`${formatTimestamp(transaction.block_time)} UTC`}>
                        {formatRelativeTime(transaction.block_time)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {history !== null && (
          <div className="flex items-center justify-between border-t border-[#292820] px-5 py-4">
            {txOffset === 0 ? (
              <span className="text-xs text-[#555752]">← Newer</span>
            ) : (
              <Link
                href={addressHref(summary.address, network, previousTxOffset, utxoOffset)}
                className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
              >
                ← Newer
              </Link>
            )}

            {history.pagination.nextOffset === null ? (
              <span className="text-xs text-[#555752]">Older →</span>
            ) : (
              <Link
                href={addressHref(
                  summary.address,
                  network,
                  history.pagination.nextOffset,
                  utxoOffset
                )}
                className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
              >
                Older →
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#efefec]">Unspent Outputs</h2>
            <p className="mt-1 text-xs text-[#777975]">Current active-chain UTXOs</p>
          </div>

          <span className="text-xs text-[#858783]">{formatInteger(summary.utxoCount)} total</span>
        </div>

        {utxos === null ? (
          <div className="px-5 py-10 text-center text-xs text-[#777975]">
            UTXO data is unavailable.
          </div>
        ) : utxos.utxos.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-[#777975]">
            This address currently has no unspent outputs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                <tr>
                  <th className="px-5 py-3 font-medium">Outpoint</th>
                  <th className="px-5 py-3 font-medium">Value</th>
                  <th className="px-5 py-3 font-medium">Block</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>

              <tbody>
                {utxos.utxos.map((utxo) => (
                  <tr key={`${utxo.txid}:${utxo.vout}`} className="border-t border-[#24251f]">
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link
                        href={`/tx/${utxo.txid}?network=${network}`}
                        title={`${utxo.txid}:${utxo.vout}`}
                        className="text-[#d8a33a] hover:text-[#edbe5b]"
                      >
                        {shortHash(utxo.txid)}:{utxo.vout}
                      </Link>
                      {utxo.is_coinbase && (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.06em] text-[#858783]">
                          Coinbase
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-xs font-medium text-[#e3ae43]">
                      {formatMca(utxo.value_base_units)}
                    </td>

                    <td className="px-5 py-3 text-xs">
                      <Link
                        href={`/block/${utxo.block_hash}?network=${network}`}
                        className="text-[#d8a33a] hover:text-[#edbe5b]"
                      >
                        #{utxo.block_height.toLocaleString("en-US")}
                      </Link>
                    </td>

                    <td className="px-5 py-3 text-xs text-[#a5a6a2]">
                      <span>{formatMercaturaScriptType(utxo.script_type)}</span>
                      {isMercaturaPqScriptType(utxo.script_type) && (
                        <span className="ml-2 inline-flex rounded-full border border-[#665020] bg-[#17140c] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#e3ae43]">
                          PQ
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-xs text-[#8f918d]">
                      <span title={`${formatTimestamp(utxo.block_time)} UTC`}>
                        {formatRelativeTime(utxo.block_time)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {utxos !== null && (
          <div className="flex items-center justify-between border-t border-[#292820] px-5 py-4">
            {utxoOffset === 0 ? (
              <span className="text-xs text-[#555752]">← Newer</span>
            ) : (
              <Link
                href={addressHref(summary.address, network, txOffset, previousUtxoOffset)}
                className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
              >
                ← Newer
              </Link>
            )}

            {utxos.pagination.nextOffset === null ? (
              <span className="text-xs text-[#555752]">Older →</span>
            ) : (
              <Link
                href={addressHref(summary.address, network, txOffset, utxos.pagination.nextOffset)}
                className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
              >
                Older →
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
