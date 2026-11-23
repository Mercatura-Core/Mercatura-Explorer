"use client";

import { useState } from "react";
import { formatNetworkEndpoint, formatNetworkName, formatPeerSoftware } from "../lib/network-presentation";

export type PublicPeer = {
  address: string;
  port: number | null;
  network: string;
  services: string[];
  version: number;
  subversion: string;
  inbound: boolean;
  connectionType: string;
  transportProtocol: string;
  connectedSince: number;
  lastSend: number;
  lastReceive: number;
  lastTransaction: number;
  lastBlock: number;
  bytesSent: number;
  bytesReceived: number;
  pingSeconds: number | null;
  minimumPingSeconds: number | null;
  syncedHeaders: number;
  syncedBlocks: number;
  mappedAs: number | null;
  geolocationEligible: boolean;
  location: unknown;
};

const PAGE_SIZE = 20;

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "Unavailable";
  if (value < 1024) return `${value.toLocaleString("en-US")} B`;
  if (value < 1048576) return `${(value / 1024).toFixed(1)} KiB`;
  if (value < 1073741824) return `${(value / 1048576).toFixed(1)} MiB`;
  return `${(value / 1073741824).toFixed(2)} GiB`;
}

function formatPing(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "Unavailable";
  return `${(seconds * 1000).toFixed(seconds < 0.1 ? 1 : 0)} ms`;
}

export function PublicConnectedPeersTable({ peers, publicCount }: { peers: PublicPeer[]; publicCount: number }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(peers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePeers = peers.slice(firstIndex, firstIndex + PAGE_SIZE);
  const firstPageLink = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageLinks = Array.from({ length: Math.min(5, totalPages) }, (_, i) => firstPageLink + i);

  return (
    <section className="gold-panel mt-4 overflow-hidden rounded-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292820] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#efefec]">Public Connected Peers</h2>
          <p className="mt-1 text-xs text-[#777975]">Up to 20 observed public connections per page; private and local endpoints excluded</p>
        </div>
        <span className="text-xs text-[#858783]">
          {peers.length === 0 ? "Showing 0" : `Showing ${firstIndex + 1}–${firstIndex + visiblePeers.length}`} of {publicCount.toLocaleString("en-US")} public peers
        </span>
      </div>
      {visiblePeers.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-[#777975]">No public connected peers are currently observable.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-[#101210] text-[10px] uppercase tracking-[0.08em] text-[#777975]">
                <tr>
                  <th className="px-5 py-3 font-medium">Endpoint</th>
                  <th className="px-5 py-3 font-medium">Network</th>
                  <th className="px-5 py-3 font-medium">Software</th>
                  <th className="px-5 py-3 font-medium">Direction</th>
                  <th className="px-5 py-3 font-medium">Connection</th>
                  <th className="px-5 py-3 font-medium">Transport</th>
                  <th className="px-5 py-3 font-medium">Ping</th>
                  <th className="px-5 py-3 font-medium">Synced</th>
                  <th className="px-5 py-3 font-medium">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeers.map((peer) => (
                  <tr key={`${peer.network}:${peer.address}:${peer.port ?? "none"}`} className="border-t border-[#24251f]">
                    <td className="px-5 py-3 font-mono text-xs text-[#d8a33a]" title={formatNetworkEndpoint(peer.address, peer.port)}>{formatNetworkEndpoint(peer.address, peer.port)}</td>
                    <td className="px-5 py-3 text-xs text-[#c5c6c1]">{formatNetworkName(peer.network)}</td>
                    <td className="px-5 py-3 text-xs text-[#c5c6c1]" title={peer.subversion}>{formatPeerSoftware(peer.subversion)}</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">{peer.inbound ? "Inbound" : "Outbound"}</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">{peer.connectionType}</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">{peer.transportProtocol}</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">{formatPing(peer.pingSeconds)}</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">{peer.syncedBlocks.toLocaleString("en-US")} blocks</td>
                    <td className="px-5 py-3 text-xs text-[#9b9d98]">↑ {formatBytes(peer.bytesSent)}<br />↓ {formatBytes(peer.bytesReceived)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Connected peers pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292820] px-5 py-4">
              <span className="text-xs text-[#858783]">Page {currentPage} of {totalPages}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] disabled:opacity-35">Previous</button>
                {pageLinks.map((number) => (
                  <button key={number} type="button" aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)} className={`rounded border px-3 py-2 text-xs ${number === currentPage ? "border-[#d8a33a] bg-[#d8a33a] text-[#15120b]" : "border-[#42361e] text-[#d8a33a]"}`}>{number}</button>
                ))}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] disabled:opacity-35">Next</button>
              </div>
          </nav>
        </>
      )}
      {visiblePeers.length === 0 ? (
        <nav aria-label="Connected peers pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292820] px-5 py-4">
          <span className="text-xs text-[#858783]">Page 1 of 1</span>
          <div className="flex gap-1.5">
            <button disabled className="rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] opacity-35">Previous</button>
            <button aria-current="page" className="rounded border border-[#d8a33a] bg-[#d8a33a] px-3 py-2 text-xs text-[#15120b]">1</button>
            <button disabled className="rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] opacity-35">Next</button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
