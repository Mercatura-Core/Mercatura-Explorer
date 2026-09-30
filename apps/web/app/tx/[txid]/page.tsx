import Link from "next/link";

import { fetchExplorerApi } from "../../../lib/explorer-server-api";
import { parseExplorerNetwork } from "../../../lib/explorer-network";
import {
  analyzeMercaturaPqWitness,
  formatMercaturaPqWitness,
  formatMercaturaScriptType,
  isMercaturaPqScriptType,
  ML_DSA_65_PUBLIC_KEY_BYTES,
  ML_DSA_65_SIGNATURE_BYTES,
} from "../../../lib/mercatura-pq";

type TransactionDetailResponse = {
  transaction: {
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
    hex: string;
  };
  inputs: Array<{
    vin: number;
    prev_txid: string | null;
    prev_vout: number | null;
    sequence: string;
    coinbase: string | null;
    script_sig_asm: string | null;
    script_sig_hex: string | null;
    witness: string[] | null;
    resolved_prev_transaction_id: string | null;
    resolved_prev_txid: string | null;
    prev_value_base_units: string | null;
    prev_address: string | null;
    prev_script_type: string | null;
  }>;
  outputs: Array<{
    vout: number;
    value_base_units: string;
    script_asm: string;
    script_desc: string;
    script_hex: string;
    address: string | null;
    script_type: string;
    spentBy: {
      txid: string;
      vin: number;
    } | null;
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

function formatMca(baseUnits: string | null): string {
  if (baseUnits === null) {
    return "Unavailable";
  }

  const value = BigInt(baseUnits);
  const baseUnitsPerMca = BigInt(100);
  const whole = value / baseUnitsPerMca;
  const fraction = (value % baseUnitsPerMca).toString().padStart(2, "0");

  return `${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

function shortHash(value: string): string {
  if (value.length <= 30) {
    return value;
  }

  return `${value.slice(0, 14)}…${value.slice(-12)}`;
}

export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    txid: string;
  }>;
  searchParams: Promise<{
    network?: string | string[];
  }>;
}) {
  const { txid } = await params;
  const query = await searchParams;

  const requestedNetwork = Array.isArray(query.network) ? query.network[0] : query.network;

  const network = parseExplorerNetwork(requestedNetwork);

  const detail = await fetchExplorerApi<TransactionDetailResponse>(
    network,
    `transactions/${encodeURIComponent(txid)}`
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
          <h1 className="text-xl font-semibold text-white">Transaction could not be loaded</h1>

          <p className="mt-3 text-sm text-[#8f918d]">
            The transaction was not found or the selected{" "}
            {network === "mainnet" ? "Mainnet" : "Testnet"} explorer backend is unavailable.
          </p>
        </section>
      </main>
    );
  }

  const { transaction, inputs, outputs } = detail;
  const coinbase = inputs.some((input) => input.coinbase !== null);
  const pqInputs = inputs.filter((input) => isMercaturaPqScriptType(input.prev_script_type));
  const pqOutputs = outputs.filter((output) => isMercaturaPqScriptType(output.script_type));
  const hasPqActivity = pqInputs.length > 0 || pqOutputs.length > 0;
  const pqWitnessesMatchingV1 = pqInputs.filter(
    (input) => analyzeMercaturaPqWitness(input.witness).matchesV1Shape
  ).length;

  return (
    <main className="mx-auto max-w-[1540px] px-5 py-8 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/block/${transaction.blockHash}?network=${network}`}
          className="text-sm font-medium text-[#d8a33a] hover:text-[#edbe5b]"
        >
          ← Block #{transaction.blockHeight.toLocaleString("en-US")}
        </Link>

        <span className="rounded-full border border-[#55401d] bg-[#0d0e0c] px-3 py-1.5 text-xs font-medium text-[#dfb04a]">
          {network === "mainnet" ? "Mainnet" : "Testnet"}
        </span>
      </div>

      <section className="gold-panel overflow-hidden rounded-[10px]">
        <div className="border-b border-[#292820] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9a9a96]">
                Mercatura Transaction
              </p>

              <h1 className="mt-2 text-xl font-semibold text-[#f1f1ee] sm:text-2xl">Transaction</h1>

              <p className="mt-2 break-all font-mono text-xs text-[#b89246] sm:text-sm">
                {transaction.txid}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#665020] bg-[#17140c] px-3 py-1.5 text-xs font-medium text-[#e3ae43]">
                {coinbase ? "Coinbase" : "Confirmed"}
              </span>

              {hasPqActivity && (
                <span className="rounded-full border border-[#7a5b20] bg-[#1c170b] px-3 py-1.5 text-xs font-semibold text-[#efbc50]">
                  PQ · ML-DSA-65
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Block</p>
            <Link
              href={`/block/${transaction.blockHash}?network=${network}`}
              className="mt-2 block text-sm font-medium text-[#e3ae43] hover:text-[#edbe5b]"
            >
              #{transaction.blockHeight.toLocaleString("en-US")}
            </Link>
            <p className="mt-1 text-xs text-[#8c8d89]">Index {transaction.blockIndex}</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Timestamp</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatTimestamp(transaction.blockTime)}
            </p>
            <p className="mt-1 text-xs text-[#8c8d89]">
              {formatRelativeTime(transaction.blockTime)} · UTC
            </p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Fee</p>
            <p className="mt-2 text-sm font-medium text-[#e3ae43]">
              {coinbase ? "Coinbase" : formatMca(transaction.feeBaseUnits)}
            </p>
            <p className="mt-1 text-xs text-[#8c8d89]">Mercatura full-byte fees</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Size</p>
            <p className="mt-2 text-sm font-medium text-white">{formatBytes(transaction.size)}</p>
            <p className="mt-1 text-xs text-[#8c8d89]">
              Weight {transaction.weight.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </section>

      {hasPqActivity && (
        <section id="pq" className="gold-panel mt-4 overflow-hidden rounded-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#d8a33a]">
                Post-Quantum
              </p>
              <h2 className="mt-1 text-[15px] font-semibold text-[#efefec]">
                Mercatura PQ Authorization
              </h2>
            </div>

            <Link
              href={`/pq?network=${network}`}
              className="text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
            >
              PQ Network Overview →
            </Link>
          </div>

          <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-[#0b0c0b] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                Authorization
              </p>
              <p className="mt-2 text-sm font-medium text-[#e3ae43]">ML-DSA-65</p>
              <p className="mt-1 text-xs text-[#8c8d89]">Mercatura PQ Authorization v1</p>
            </div>

            <div className="bg-[#0b0c0b] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Output Type</p>
              <p className="mt-2 text-sm font-medium text-white">Native Witness v2</p>
              <p className="mt-1 font-mono text-[10px] text-[#8c8d89]">witness_v2_mercatura_pq</p>
            </div>

            <div className="bg-[#0b0c0b] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">PQ Inputs</p>
              <p className="mt-2 text-sm font-medium text-white">
                {pqInputs.length.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-[#8c8d89]">
                {pqWitnessesMatchingV1.toLocaleString("en-US")} match v1 witness shape
              </p>
            </div>

            <div className="bg-[#0b0c0b] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">PQ Outputs</p>
              <p className="mt-2 text-sm font-medium text-white">
                {pqOutputs.length.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-[#8c8d89]">Native post-quantum outputs</p>
            </div>
          </div>

          <div className="px-5 py-4 text-xs leading-6 text-[#999b96] sm:px-6">
            Mercatura PQ Authorization v1 uses a two-item witness for a PQ spend: a{" "}
            <span className="font-medium text-[#d4d5d0]">
              {ML_DSA_65_SIGNATURE_BYTES.toLocaleString("en-US")}-byte ML-DSA-65 signature
            </span>{" "}
            followed by the{" "}
            <span className="font-medium text-[#d4d5d0]">
              {ML_DSA_65_PUBLIC_KEY_BYTES.toLocaleString("en-US")}-byte public key
            </span>
            . The explorer reports observed structure; consensus validation remains authoritative.
          </div>

          {pqInputs.length > 0 && (
            <div className="divide-y divide-[#24251f] border-t border-[#292820]">
              {pqInputs.map((input) => {
                const analysis = analyzeMercaturaPqWitness(input.witness);

                return (
                  <div
                    key={`pq-input:${input.vin}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                  >
                    <div>
                      <span className="text-xs font-medium text-[#d8a33a]">Input #{input.vin}</span>
                      <span className="ml-3 text-xs text-[#92938f]">
                        {formatMercaturaPqWitness(input.witness)}
                      </span>
                    </div>

                    <span
                      className={
                        analysis.matchesV1Shape
                          ? "text-xs font-medium text-[#c8c9c4]"
                          : "text-xs font-medium text-[#c28d55]"
                      }
                    >
                      {analysis.matchesV1Shape
                        ? "Matches PQ v1 structure"
                        : "Non-standard PQ witness shape"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="border-b border-[#292820] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#efefec]">Transaction Details</h2>
        </div>

        <dl className="divide-y divide-[#24251f]">
          {[
            ["TXID", transaction.txid],
            ["Witness TXID", transaction.wtxid],
            ["Block Hash", transaction.blockHash],
            ["Version", transaction.version.toString()],
            ["Locktime", transaction.locktime],
            ["Serialized Size", formatBytes(transaction.size)],
            ["Virtual Size", formatBytes(transaction.vsize)],
            ["Weight", transaction.weight.toLocaleString("en-US")],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[170px_1fr] sm:px-6">
              <dt className="text-xs text-[#858783]">{label}</dt>
              <dd className="break-all font-mono text-xs text-[#c7c8c4]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="flex items-center justify-between border-b border-[#292820] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#efefec]">Inputs</h2>

          <span className="text-xs text-[#858783]">
            {inputs.length.toLocaleString("en-US")} total
          </span>
        </div>

        <div className="divide-y divide-[#24251f]">
          {inputs.map((input) => (
            <article key={input.vin} className="px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#d8a33a]">Input #{input.vin}</span>

                <span className="text-xs text-[#858783]">Sequence {input.sequence}</span>
              </div>

              {input.coinbase !== null ? (
                <div className="mt-4 rounded-lg border border-[#34352f] bg-[#101210] px-4 py-4">
                  <p className="text-xs font-medium text-[#e3ae43]">Coinbase input</p>
                  <p className="mt-2 break-all font-mono text-xs text-[#8f918d]">
                    {input.coinbase}
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                      Previous Output
                    </p>

                    {input.prev_txid === null ? (
                      <p className="mt-2 text-xs text-[#858783]">Unresolved</p>
                    ) : (
                      <Link
                        href={`/tx/${input.prev_txid}?network=${network}`}
                        title={input.prev_txid}
                        className="mt-2 block font-mono text-xs text-[#d8a33a] hover:text-[#edbe5b]"
                      >
                        {shortHash(input.prev_txid)}
                        {input.prev_vout === null ? "" : `:${input.prev_vout}`}
                      </Link>
                    )}

                    <p className="mt-2 text-xs text-[#aaa]">
                      {formatMca(input.prev_value_base_units)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                      Previous Address
                    </p>
                    {input.prev_address === null ? (
                      <p className="mt-2 text-xs text-[#858783]">Unavailable</p>
                    ) : (
                      <Link
                        href={`/address/${encodeURIComponent(input.prev_address)}?network=${network}`}
                        className="mt-2 block break-all font-mono text-xs text-[#c7c8c4] hover:text-[#edbe5b]"
                      >
                        {input.prev_address}
                      </Link>
                    )}
                    <p className="mt-2 text-xs text-[#8f918d]">
                      {formatMercaturaScriptType(input.prev_script_type)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-[#24251f] pt-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Witness</p>
                <p className="mt-2 text-xs text-[#aaa]">
                  {formatMercaturaPqWitness(input.witness)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
        <div className="flex items-center justify-between border-b border-[#292820] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#efefec]">Outputs</h2>

          <span className="text-xs text-[#858783]">
            {outputs.length.toLocaleString("en-US")} total
          </span>
        </div>

        <div className="divide-y divide-[#24251f]">
          {outputs.map((output) => (
            <article key={output.vout} className="px-5 py-5 sm:px-6">
              <div className="grid gap-4 lg:grid-cols-[90px_1fr_180px_180px] lg:items-start">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Output</p>
                  <p className="mt-2 text-xs font-medium text-[#d8a33a]">#{output.vout}</p>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Address</p>
                  {output.address === null ? (
                    <p className="mt-2 text-xs text-[#858783]">No address</p>
                  ) : (
                    <Link
                      href={`/address/${encodeURIComponent(output.address)}?network=${network}`}
                      className="mt-2 block break-all font-mono text-xs text-[#c7c8c4] hover:text-[#edbe5b]"
                    >
                      {output.address}
                    </Link>
                  )}
                  <p className="mt-2 text-xs text-[#8f918d]">
                    {formatMercaturaScriptType(output.script_type)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Value</p>
                  <p className="mt-2 text-xs font-medium text-[#e3ae43]">
                    {formatMca(output.value_base_units)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Status</p>

                  {output.spentBy === null ? (
                    <p className="mt-2 text-xs font-medium text-[#c7c8c4]">Unspent</p>
                  ) : (
                    <Link
                      href={`/tx/${output.spentBy.txid}?network=${network}`}
                      title={output.spentBy.txid}
                      className="mt-2 block text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]"
                    >
                      Spent in {shortHash(output.spentBy.txid)}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
