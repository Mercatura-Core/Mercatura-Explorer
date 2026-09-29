"use client";

import { type ChangeEvent, useEffect, useRef } from "react";

import { DEFAULT_EXPLORER_NETWORK, parseExplorerNetwork } from "../lib/explorer-network";

export function NetworkSelector() {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const network = parseExplorerNetwork(url.searchParams.get("network"));

    if (selectRef.current !== null) {
      selectRef.current.value = network;
    }
  }, []);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const network = parseExplorerNetwork(event.target.value);
    const url = new URL(window.location.href);

    url.searchParams.set("network", network);

    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <label className="relative ml-3">
      <span className="sr-only">Explorer network</span>

      <select
        ref={selectRef}
        aria-label="Explorer network"
        defaultValue={DEFAULT_EXPLORER_NETWORK}
        onChange={handleChange}
        className="appearance-none rounded-full border border-[#55401d] bg-[#0d0e0c] py-2 pl-3 pr-8 text-xs font-medium text-[#dfb04a] outline-none transition hover:border-[#8a6729] focus:border-[#c39336]"
      >
        <option value="mainnet">Mainnet</option>
        <option value="testnet">Testnet</option>
      </select>

      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#a27a32]"
        fill="currentColor"
      >
        <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
      </svg>
    </label>
  );
}
