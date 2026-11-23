"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { TablePageControls } from "./table-page-controls";
import type { MiningWindow } from "../lib/mining-window";

type BlockRow = {
  height: number;
  hash: string;
  time: string;
  difficulty: number;
  transactionCount: number;
  size: number;
  subsidyBaseUnits: string;
  feesBaseUnits: string;
};

type Pagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

function formatMca(value: string): string {
  try {
    const amount = BigInt(value);
    return `${(amount / BigInt(100)).toLocaleString("en-US")}.${(amount % BigInt(100)).toString().padStart(2, "0")} MCA`;
  } catch {
    return "Unavailable";
  }
}

function formatTime(value: string): string {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function formatSize(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "Unavailable";
  return value >= 1048576 ? `${(value / 1048576).toFixed(2)} MiB` : `${(value / 1024).toFixed(1)} KiB`;
}

export function RecentBlockProductionTable({
  network, window, initialRows, initialPagination, indexedHeight,
}: {
  network: "testnet" | "mainnet";
  window: MiningWindow;
  initialRows: BlockRow[];
  initialPagination: Pagination;
  indexedHeight: number | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [pagination, setPagination] = useState(initialPagination);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  async function loadPage(page: number) {
    if (busy || page < 1 || page > pagination.totalPages || page === pagination.currentPage) return;
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/explorer/${network}/mining?window=${encodeURIComponent(window)}&recentPage=${page}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json() as { recentBlocks?: BlockRow[]; recentPagination?: Pagination };
      if (!data.recentBlocks || !data.recentPagination || data.recentPagination.currentPage !== page) {
        throw new Error("This API does not support recent-block pagination");
      }
      if (id !== requestId.current) return;
      setRows(data.recentBlocks);
      setPagination(data.recentPagination);
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : "Page unavailable");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  return (
    <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#efefec]">Recent Block Production</h2>
          <p className="mt-1 text-xs text-[#777975]">20 blocks per page from the selected observation window</p>
        </div>
        <span className="text-xs text-[#858783]">Indexed tip {indexedHeight === null ? "Unavailable" : `#${indexedHeight.toLocaleString("en-US")}`}</span>
      </div>
      {error ? <p role="alert" className="px-5 py-2 text-xs text-[#e0aa40]">{error}</p> : null}
      <div className="overflow-x-auto" aria-busy={busy}>
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
            <tr>{["Block", "Time (UTC)", "Difficulty", "TXs", "Size", "Subsidy", "Fees"].map((name) => <th key={name} className="px-5 py-3 font-medium">{name}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-[#777975]">No indexed blocks in this window.</td></tr>
            ) : rows.map((block) => (
              <tr key={block.hash} className="border-t border-[#24251f]">
                <td className="px-5 py-3 font-mono text-xs text-[#d8a33a]">
                  <Link href={`/block/${block.hash}?network=${network}`} title={block.hash} className="hover:text-[#edbe5b]">#{block.height.toLocaleString("en-US")} · {block.hash.slice(0, 12)}…{block.hash.slice(-10)}</Link>
                </td>
                <td className="px-5 py-3 text-xs text-[#8f918d]">{formatTime(block.time)}</td>
                <td className="px-5 py-3 text-xs text-[#c5c6c1]">{block.difficulty.toPrecision(5)}</td>
                <td className="px-5 py-3 text-xs text-[#c5c6c1]">{block.transactionCount.toLocaleString("en-US")}</td>
                <td className="px-5 py-3 text-xs text-[#9b9d98]">{formatSize(block.size)}</td>
                <td className="px-5 py-3 text-xs text-[#e3ae43]">{formatMca(block.subsidyBaseUnits)}</td>
                <td className="px-5 py-3 text-xs text-[#c5c6c1]">{formatMca(block.feesBaseUnits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePageControls page={pagination.currentPage} totalPages={pagination.totalPages} busy={busy} onPageChange={loadPage} label="Recent block production pages" />
    </section>
  );
}
