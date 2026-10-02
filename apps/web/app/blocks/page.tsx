import Link from "next/link";

import { parseExplorerNetwork, type ExplorerNetwork } from "../../lib/explorer-network";
import { fetchExplorerApi } from "../../lib/explorer-server-api";

const PAGE_SIZE = 25;

interface BlockListResponse {
  blocks: Array<{
    hash: string;
    height: number;
    previous_hash: string | null;
    time: string;
    median_time: string;
    bits: string;
    difficulty: number;
    tx_count: number;
    stripped_size: number;
    size: number;
    weight: number;
  }>;
  pagination: {
    limit: number;
    nextBeforeHeight: number | null;
  };
}

interface EmissionHistoryResponse {
  history: Array<{
    height: number;
    hash: string;
    subsidy_base_units: string;
  }>;
}

function parseBeforeHeight(value: string | string[] | undefined): number | null {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return null;
  }

  const parsed = Number(candidate);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function networkLabel(network: ExplorerNetwork): string {
  return network === "mainnet" ? "Mainnet" : "Testnet";
}

function listHref(network: ExplorerNetwork, beforeHeight?: number | null): string {
  const params = new URLSearchParams({ network });

  if (beforeHeight !== null && beforeHeight !== undefined) {
    params.set("beforeHeight", String(beforeHeight));
  }

  return `/blocks?${params.toString()}`;
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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unavailable";
  }

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatDifficulty(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "Unavailable";
  }

  if (value === 0) {
    return "0";
  }

  if (value >= 1_000_000) {
    return value.toExponential(3);
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 6,
    });
  }

  return value.toPrecision(6);
}

function formatMca(value: string | undefined): string {
  if (value === undefined || !/^\d+$/.test(value)) {
    return "Unavailable";
  }

  const amount = BigInt(value);
  const whole = amount / BigInt(100);
  const fraction = (amount % BigInt(100)).toString().padStart(2, "0");

  return `${whole.toLocaleString("en-US")}.${fraction} MCA`;
}

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{
    network?: string | string[];
    beforeHeight?: string | string[];
  }>;
}) {
  const parameters = await searchParams;
  const requestedNetwork = Array.isArray(parameters.network)
    ? parameters.network[0]
    : parameters.network;

  const network = parseExplorerNetwork(requestedNetwork);
  const beforeHeight = parseBeforeHeight(parameters.beforeHeight);

  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
  });

  if (beforeHeight !== null) {
    query.set("beforeHeight", String(beforeHeight));
  }

  const [blockList, emission] = await Promise.all([
    fetchExplorerApi<BlockListResponse>(network, `blocks?${query.toString()}`),
    fetchExplorerApi<EmissionHistoryResponse>(
      network,
      `emission?${query.toString()}&includeSpendable=false`
    ),
  ]);

  const blocks = blockList?.blocks ?? [];
  const subsidyByHash = new Map(
    (emission?.history ?? []).map((row) => [row.hash, row.subsidy_base_units])
  );

  const nextBeforeHeight =
    blocks.length === PAGE_SIZE ? (blockList?.pagination.nextBeforeHeight ?? null) : null;

  const newerBeforeHeight = beforeHeight === null ? null : beforeHeight + PAGE_SIZE;

  return (
    <main className="mx-auto max-w-[1540px] px-5 py-8 sm:px-8">
      <section className="gold-panel rounded-[10px] px-5 py-6 sm:px-7">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a77c2d]">
          Active chain
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#f3f3ef]">Blocks</h1>

            <p className="mt-2 text-sm leading-6 text-[#888985]">
              Indexed {networkLabel(network)} block history, newest first.
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
            <h2 className="text-[15px] font-semibold text-[#efefec]">Block History</h2>
            <p className="mt-1 text-xs text-[#777975]">
              {blocks.length.toLocaleString("en-US")} blocks shown
            </p>
          </div>

          <Link
            href={listHref(network)}
            className="text-xs font-medium text-[#d7a33c] transition hover:text-[#efbd57]"
          >
            Latest
          </Link>
        </div>

        {blockList === null ? (
          <div className="px-5 py-12 text-center text-xs text-[#777975]">
            {networkLabel(network)} block history is unavailable.
          </div>
        ) : (
          <div className="overflow-x-auto px-4 py-4">
            <table className="table-shell w-full min-w-[950px] border-collapse text-left">
              <thead>
                <tr className="bg-[#151717] text-[11px] font-normal text-[#90918f]">
                  <th className="rounded-l-md px-3 py-2 font-normal">Hash</th>
                  <th className="px-3 py-2 font-normal">Height</th>
                  <th className="px-3 py-2 font-normal">Mined At</th>
                  <th className="px-3 py-2 font-normal">Transactions</th>
                  <th className="px-3 py-2 font-normal">Reward</th>
                  <th className="px-3 py-2 font-normal">Difficulty</th>
                  <th className="rounded-r-md px-3 py-2 font-normal">Size</th>
                </tr>
              </thead>

              <tbody>
                {blocks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-xs text-[#777975]">
                      No blocks were returned for this page.
                    </td>
                  </tr>
                ) : (
                  blocks.map((block) => (
                    <tr key={block.hash}>
                      <td className="border-b border-[#242625] px-3 py-3">
                        <Link
                          href={`/block/${block.hash}?network=${network}`}
                          title={block.hash}
                          className="font-mono text-xs text-[#d8a33a] transition hover:text-[#edbe5b]"
                        >
                          {block.hash.slice(0, 12)}…
                        </Link>
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs">
                        <Link
                          href={`/block/${block.height}?network=${network}`}
                          className="font-medium text-[#d8a33a] transition hover:text-[#edbe5b]"
                        >
                          {block.height.toLocaleString("en-US")}
                        </Link>
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#a2a3a0]">
                        {formatRelativeTime(block.time)}
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#c2c3bf]">
                        {block.tx_count.toLocaleString("en-US")}
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs font-medium text-[#d8a33a]">
                        {formatMca(subsidyByHash.get(block.hash))}
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#c2c3bf]">
                        {formatDifficulty(block.difficulty)}
                      </td>

                      <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#a2a3a0]">
                        {formatBytes(block.size)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292820] px-5 py-4">
          <div>
            {beforeHeight !== null ? (
              <Link
                href={listHref(network, newerBeforeHeight)}
                className="inline-flex items-center rounded-md border border-[#4a391a] bg-[#12110d] px-4 py-2 text-xs font-medium text-[#d8a33a] transition hover:border-[#775921] hover:text-[#efbd57]"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
          </div>

          {nextBeforeHeight !== null && nextBeforeHeight > 0 ? (
            <Link
              href={listHref(network, nextBeforeHeight)}
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
