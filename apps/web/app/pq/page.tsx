import Link from "next/link";

import { fetchExplorerApi } from "../../lib/explorer-server-api";
import { parseExplorerNetwork } from "../../lib/explorer-network";
import {
  MERCATURA_PQ_SCRIPT_TYPE,
  ML_DSA_65_PUBLIC_KEY_BYTES,
  ML_DSA_65_SIGNATURE_BYTES,
} from "../../lib/mercatura-pq";

type StatisticsResponse = {
  chain: {
    indexedHeight: number | null;
    indexedTip: string | null;
    activeBlocks: string;
    transactions: string;
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
  outputTypes: Array<{
    scriptType: string;
    outputCount: string;
    addressedOutputCount: string;
    totalValueBaseUnits: string;
  }>;
};

function formatInteger(value: string): string {
  if (!/^\d+$/.test(value)) {
    return "Unavailable";
  }

  return BigInt(value).toLocaleString("en-US");
}

function formatMca(value: string): string {
  if (!/^\d+$/.test(value)) {
    return "Unavailable";
  }

  const baseUnits = BigInt(value);
  const whole = baseUnits / BigInt(100);
  const fraction = (baseUnits % BigInt(100)).toString().padStart(2, "0");

  return `${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

export default async function PqPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const requestedNetwork = Array.isArray(query.network) ? query.network[0] : query.network;

  const network = parseExplorerNetwork(requestedNetwork);
  const statistics = await fetchExplorerApi<StatisticsResponse>(network, "statistics");

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
            Native Post-Quantum Authorization
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-[#f1f1ee] sm:text-3xl">Mercatura PQ</h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#969894]">
            Mercatura uses native witness-v2 post-quantum outputs with ML-DSA-65 authorization. This
            page reports active-chain PQ activity indexed by the selected explorer network.
          </p>
        </div>

        <div className="grid gap-px bg-[#25251f] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">
              Signature Scheme
            </p>
            <p className="mt-2 text-sm font-medium text-[#e3ae43]">ML-DSA-65</p>
            <p className="mt-1 text-xs text-[#8c8d89]">PQ Authorization v1</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Output Type</p>
            <p className="mt-2 text-sm font-medium text-white">Native Witness v2</p>
            <p className="mt-1 font-mono text-[10px] text-[#8c8d89]">{MERCATURA_PQ_SCRIPT_TYPE}</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Signature</p>
            <p className="mt-2 text-sm font-medium text-white">
              {ML_DSA_65_SIGNATURE_BYTES.toLocaleString("en-US")} bytes
            </p>
            <p className="mt-1 text-xs text-[#8c8d89]">Raw ML-DSA-65 signature</p>
          </div>

          <div className="bg-[#0b0c0b] px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#777975]">Public Key</p>
            <p className="mt-2 text-sm font-medium text-white">
              {ML_DSA_65_PUBLIC_KEY_BYTES.toLocaleString("en-US")} bytes
            </p>
            <p className="mt-1 text-xs text-[#8c8d89]">Second witness item</p>
          </div>
        </div>
      </section>

      {statistics === null ? (
        <section className="gold-panel mt-4 rounded-[10px] px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-white">
            PQ network statistics are unavailable
          </h2>

          <p className="mt-3 text-sm text-[#8f918d]">
            The selected {network === "mainnet" ? "Mainnet" : "Testnet"} explorer backend is not
            currently available.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["PQ Outputs", formatInteger(statistics.pq.outputCount)],
              ["PQ Authorization Inputs", formatInteger(statistics.pq.authorizationInputCount)],
              ["PQ Spending Transactions", formatInteger(statistics.pq.spendingTransactionCount)],
              ["Active PQ UTXOs", formatInteger(statistics.pq.activeUtxoCount)],
              ["Active PQ UTXO Value", formatMca(statistics.pq.activeUtxoValueBaseUnits)],
              ["PQ Output Value", formatMca(statistics.pq.outputValueBaseUnits)],
            ].map(([label, value]) => (
              <article key={label} className="gold-panel rounded-[10px] px-5 py-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#898b87]">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#e5b348]">{value}</p>
              </article>
            ))}
          </section>

          <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
            <div className="border-b border-[#292820] px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold text-[#efefec]">Indexed PQ Activity</h2>
              <p className="mt-1 text-xs text-[#777975]">
                Active-chain observations from the selected explorer database
              </p>
            </div>

            <dl className="divide-y divide-[#24251f]">
              {[
                [
                  "Indexed Height",
                  statistics.chain.indexedHeight === null
                    ? "Unavailable"
                    : statistics.chain.indexedHeight.toLocaleString("en-US"),
                ],
                ["Script Type", statistics.pq.scriptType],
                ["Addressed PQ Outputs", formatInteger(statistics.pq.addressedOutputCount)],
                ["All Active UTXOs", formatInteger(statistics.utxos.count)],
                ["All Active UTXO Value", formatMca(statistics.utxos.valueBaseUnits)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-2 px-5 py-3.5 sm:grid-cols-[210px_1fr] sm:px-6"
                >
                  <dt className="text-xs text-[#858783]">{label}</dt>
                  <dd className="break-all font-mono text-xs text-[#c7c8c4]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="gold-panel mt-4 rounded-[10px] px-5 py-5 sm:px-6">
            <h2 className="text-[15px] font-semibold text-[#efefec]">Authorization Structure</h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#969894]">
              A Mercatura PQ Authorization v1 spend uses exactly two witness items: the raw{" "}
              <span className="font-medium text-[#d8d9d4]">
                {ML_DSA_65_SIGNATURE_BYTES.toLocaleString("en-US")}-byte ML-DSA-65 signature
              </span>{" "}
              followed by the exact{" "}
              <span className="font-medium text-[#d8d9d4]">
                {ML_DSA_65_PUBLIC_KEY_BYTES.toLocaleString("en-US")}-byte ML-DSA-65 public key
              </span>
              . Transaction pages expose the observed witness shape for PQ inputs without replacing
              consensus validation.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
