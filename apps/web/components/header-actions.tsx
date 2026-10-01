"use client";

import { useEffect, useRef, useState } from "react";

function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 0 1 4.62.92c0 1.76-2.42 2.08-2.42 3.83" />
      <path d="M12 17.25h.01" />
    </svg>
  );
}

export function HeaderActions() {
  const [helpOpen, setHelpOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        helpOpen &&
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setHelpOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHelpOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [helpOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-end">
      <button
        type="button"
        aria-label="Explorer help"
        aria-expanded={helpOpen}
        aria-controls="mercatura-explorer-help"
        onClick={() => setHelpOpen((open) => !open)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4b3718] bg-[#12110d] text-[#d9aa45] transition hover:border-[#765622] hover:text-[#e6b54e]"
      >
        <HelpIcon />
      </button>

      {helpOpen ? (
        <div
          id="mercatura-explorer-help"
          role="dialog"
          aria-label="Mercatura Explorer help"
          className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#3a2b11] bg-[#0b0c0b] shadow-2xl"
        >
          <div className="border-b border-[#29271f] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#99732b]">
              Explorer help
            </div>

            <div className="mt-1 text-sm font-semibold text-[#efefec]">
              Mercatura blockchain navigation
            </div>
          </div>

          <div className="space-y-4 px-5 py-4 text-xs leading-5 text-[#8d8e8a]">
            <div>
              <div className="font-semibold text-[#c8c8c4]">Search</div>
              <p className="mt-1">
                Search the Explorer home page using a block height, block hash, transaction ID, or
                exact Mercatura address.
              </p>
            </div>

            <div>
              <div className="font-semibold text-[#c8c8c4]">Networks</div>
              <p className="mt-1">
                Mainnet and Testnet are separate Explorer datasets. Use the network selector to
                switch between them.
              </p>
            </div>

            <div>
              <div className="font-semibold text-[#c8c8c4]">Network statistics</div>
              <p className="mt-1">
                Peer and country information reflects observations available to the Explorer
                infrastructure and should not be interpreted as a guaranteed count of every
                Mercatura node worldwide.
              </p>
            </div>

            <div>
              <div className="font-semibold text-[#c8c8c4]">Transactions per day</div>
              <p className="mt-1">
                The Statistics activity chart counts confirmed non-coinbase transactions by UTC day
                so block creation itself does not inflate the activity series.
              </p>
            </div>

            <div>
              <div className="font-semibold text-[#c8c8c4]">Post-quantum data</div>
              <p className="mt-1">
                PQ pages and labels expose Mercatura-native post-quantum ownership and authorization
                data as first-class Explorer information.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
