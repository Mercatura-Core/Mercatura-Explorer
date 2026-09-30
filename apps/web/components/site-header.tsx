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
import { NetworkSelector } from "./network-selector";

const navigation = [
  { label: "Explorer", href: "/" },
  { label: "Network", href: "/network" },
  { label: "Mining", href: "/mining" },
  { label: "Emission", href: "/emission" },
  { label: "Statistics", href: "/#statistics" },
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

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.08-1l2.05-1.6-2-3.46-2.48 1a7 7 0 0 0-1.73-1L14.4 3h-4.8l-.36 2.94a7 7 0 0 0-1.73 1l-2.48-1-2 3.46L5.08 11a7 7 0 0 0 0 2l-2.05 1.6 2 3.46 2.48-1a7 7 0 0 0 1.73 1L9.6 21h4.8l.36-2.94a7 7 0 0 0 1.73-1l2.48 1 2-3.46L18.92 13a7 7 0 0 0 .08-1Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
    </svg>
  );
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

        <div className="order-2 ml-auto hidden min-w-[110px] items-center justify-end gap-1.5 sm:flex md:order-3">
          <button
            type="button"
            aria-label="Explorer settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4b3718] bg-[#12110d] text-[#d9aa45]"
          >
            <SettingsIcon />
          </button>

          <button
            type="button"
            aria-label="Dark theme"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#332816] bg-[#0b0b0a] text-[#8e6e2e]"
          >
            <MoonIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
