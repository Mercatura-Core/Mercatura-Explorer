"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DEFAULT_EXPLORER_NETWORK,
  parseExplorerNetwork,
  type ExplorerNetwork,
} from "../lib/explorer-network";
import { HeaderActions } from "./header-actions";
import { NetworkSelector } from "./network-selector";

const navigation = [
  { label: "Explorer", href: "/" },
  { label: "Network", href: "/network" },
  { label: "Mining", href: "/mining" },
  { label: "Emission", href: "/emission" },
  { label: "Statistics", href: "/statistics" },
  { label: "PQ", href: "/pq" },
];

function networkHref(network: ExplorerNetwork, href = "/"): string {
  if (href.startsWith("/#")) {
    return `/?network=${network}${href.slice(1)}`;
  }

  return `${href}?network=${network}`;
}

function isNavigationActive(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) {
    return false;
  }

  return pathname === href;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [network, setNetwork] = useState<ExplorerNetwork>(DEFAULT_EXPLORER_NETWORK);

  useEffect(() => {
    const url = new URL(window.location.href);
    setNetwork(parseExplorerNetwork(url.searchParams.get("network")));
  }, []);

  return (
    <header className="relative z-30 border-b border-[#3a2b11] bg-[#070807]/98">
      <div className="mx-auto flex min-h-[72px] max-w-[1540px] flex-wrap items-center px-5 sm:px-8">
        <Link
          href={networkHref(network)}
          aria-label="Mercatura Explorer home"
          className="flex items-center gap-3"
        >
          <Image
            src="/mercatura-logo.webp"
            alt=""
            width={52}
            height={52}
            priority
            className="rounded-full"
          />

          <div className="leading-none">
            <div className="text-[17px] font-semibold uppercase tracking-[0.24em] text-[#e6b54e]">
              Mercatura
            </div>
            <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.52em] text-[#ba8b35]">
              Explorer
            </div>
          </div>
        </Link>

        <NetworkSelector />

        <nav
          aria-label="Primary navigation"
          className="order-3 flex w-full items-center justify-start gap-2 overflow-x-auto py-2 md:order-2 md:w-auto md:flex-1 md:justify-center md:gap-7 md:py-0"
        >
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={networkHref(network, item.href)}
              className={[
                "relative whitespace-nowrap px-2 py-5 text-sm transition",
                isNavigationActive(pathname, item.href)
                  ? "font-medium text-[#e5b348]"
                  : "text-[#a4a4a4] hover:text-white",
              ].join(" ")}
            >
              {item.label}

              {isNavigationActive(pathname, item.href) ? (
                <span className="absolute inset-x-1 bottom-3 h-[2px] bg-[#e3b049]" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="order-2 ml-auto hidden min-w-[110px] items-center justify-end sm:flex md:order-3">
          <HeaderActions />
        </div>
      </div>

      {network === "testnet" ? (
        <div className="border-t border-[#551c1c] bg-[#170909]">
          <div className="mx-auto max-w-[1540px] px-5 py-2 text-center sm:px-8">
            <p className="text-[11px] font-medium tracking-[0.02em] text-[#e97878] sm:text-xs">
              <span className="font-bold uppercase tracking-[0.12em] text-[#ff8585]">
                Testnet
              </span>
              <span className="mx-2 text-[#843737]">•</span>
              Test MCA has no monetary value and is intended for testing only.
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
