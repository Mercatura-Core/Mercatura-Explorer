"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { TablePageControls } from "./table-page-controls";

type EmissionRow = {
  height: number;
  hash: string;
  time: string;
  subsidy_base_units: string;
  total_fee_base_units: string;
  coinbase_payout_base_units: string;
  actual_issuance_base_units: string;
  cumulative_issued_base_units: string;
};

function formatMca(value: string): string {
  try {
    const number = BigInt(value);
    const abs = number < BigInt(0) ? -number : number;
    return `${number < BigInt(0) ? "-" : ""}${(abs / BigInt(100)).toLocaleString("en-US")}.${(abs % BigInt(100)).toString().padStart(2, "0")} MCA`;
  } catch {
    return "Unavailable";
  }
}

function formatDate(value: string): string {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(seconds * 1000));
}

export function EmissionHistoryTable({ network, initialRows, totalItems }: {
  network: "testnet" | "mainnet";
  initialRows: EmissionRow[];
  totalItems: number;
}) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const totalPages = Math.max(1, Math.ceil(totalItems / 20));

  async function loadPage(next: number) {
    if (busy || next === page || next < 1 || next > totalPages) return;
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/explorer/${network}/emission?limit=20&page=${next}&includeSpendable=false`, { cache: "no-store" });
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json() as { history?: EmissionRow[]; pagination?: { page?: number } };
      if (!Array.isArray(data.history) || data.pagination?.page !== next) {
        throw new Error("This API does not support emission page numbers");
      }
      if (id !== requestId.current) return;
      setRows(data.history);
      setPage(next);
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : "Page unavailable");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  return (
    <section className="gold-panel mt-7 overflow-hidden rounded-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8e8a]">Emission history</div>
          <h2 className="mt-2 text-xl font-semibold text-[#eeeeea]">Block-by-block issuance</h2>
          <p className="mt-1 text-xs text-[#777975]">20 blocks per page · {totalItems.toLocaleString("en-US")} indexed blocks</p>
        </div>
      </div>
      {error ? <p role="alert" className="px-5 py-2 text-xs text-[#e0aa40]">{error}</p> : null}
      <div className="overflow-x-auto px-4 pb-5 sm:px-5" aria-busy={busy}>
        <table className="table-shell w-full min-w-[980px] border-collapse text-left">
          <thead><tr className="bg-[#151717] text-[11px] text-[#90918f]">
            {["Height", "Mined At", "Subsidy", "Fees", "Coinbase Payout", "Actual Issuance", "Cumulative Issued"].map((name) => (
              <th key={name} className="px-3 py-2 font-normal">{name}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-xs text-[#777975]">No emission history available.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.hash}>
                <td className="border-b border-[#242625] px-3 py-3"><Link href={`/block/${row.height}?network=${network}`} className="font-mono text-xs font-medium text-[#d8a33a] hover:text-[#edbe5b]">{row.height.toLocaleString("en-US")}</Link></td>
                <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#9c9d99]">{formatDate(row.time)}</td>
                <td className="border-b border-[#242625] px-3 py-3 text-xs font-medium text-[#d8a33a]">{formatMca(row.subsidy_base_units)}</td>
                <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#b8b9b5]">{formatMca(row.total_fee_base_units)}</td>
                <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#b8b9b5]">{formatMca(row.coinbase_payout_base_units)}</td>
                <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#d2d2ce]">{formatMca(row.actual_issuance_base_units)}</td>
                <td className="border-b border-[#242625] px-3 py-3 text-xs text-[#d2d2ce]">{formatMca(row.cumulative_issued_base_units)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePageControls page={page} totalPages={totalPages} busy={busy} onPageChange={loadPage} label="Emission history pages" />
    </section>
  );
}
