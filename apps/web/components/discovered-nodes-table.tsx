"use client";

import { useState } from "react";

import { formatNetworkEndpoint, formatNetworkName } from "../lib/network-presentation";

export type DiscoveredNode = {
  address: string;
  port: number;
  network: string;
  lastSeen: number;
  services: number;
};

const PAGE_SIZE = 20;

function formatRelativeUnixTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Unavailable";
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000 - value));
  if (elapsed < 60) return `${elapsed}s ago`;
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
  return `${Math.floor(elapsed / 86400)}d ago`;
}

export function DiscoveredNodesTable({
  nodes,
  publicCount,
}: {
  nodes: DiscoveredNode[];
  publicCount: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(nodes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const currentNodes = nodes.slice(firstIndex, firstIndex + PAGE_SIZE);
  const firstPageLink = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageLinks = Array.from({ length: Math.min(5, totalPages) }, (_, i) => firstPageLink + i);

  return (
    <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#efefec]">Public Discovered Nodes</h2>
          <p className="mt-1 text-xs text-[#777975]">
            Most recently seen public addresses from the bounded Core sample · 20 per page
          </p>
        </div>
        <span className="text-xs text-[#858783]">
          {nodes.length === 0 ? "Showing 0" : `Showing ${firstIndex + 1}–${firstIndex + currentNodes.length}`} of {publicCount.toLocaleString("en-US")} sampled public
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-[#777975]">
          No public discovered nodes are observable from this explorer node. An offline snapshot has no live peer discovery; connect a networked node to populate this list.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                <tr>
                  <th className="px-5 py-3 font-medium">Endpoint</th>
                  <th className="px-5 py-3 font-medium">Network</th>
                  <th className="px-5 py-3 font-medium">Last Seen</th>
                  <th className="px-5 py-3 font-medium">Services</th>
                </tr>
              </thead>
              <tbody>
                {currentNodes.map((node) => (
                  <tr key={`${node.network}:${node.address}:${node.port}`} className="border-t border-[#24251f]">
                    <td className="px-5 py-3 font-mono text-xs text-[#d8a33a]" title={formatNetworkEndpoint(node.address, node.port)}>
                      {formatNetworkEndpoint(node.address, node.port)}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#c5c6c1]">{formatNetworkName(node.network)}</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">{formatRelativeUnixTime(node.lastSeen)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#9b9d98]">{node.services.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292820] px-5 py-4" aria-label="Discovered nodes pages">
        <span className="text-xs text-[#858783]">Page {currentPage} of {totalPages}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] disabled:opacity-35">Previous</button>
          {pageLinks.map((number) => (
            <button key={number} type="button" aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)} className={`rounded border px-3 py-2 text-xs ${number === currentPage ? "border-[#d8a33a] bg-[#d8a33a] text-[#15120b]" : "border-[#42361e] text-[#d8a33a]"}`}>
              {number}
            </button>
          ))}
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] disabled:opacity-35">Next</button>
        </div>
      </nav>
    </section>
  );
}
