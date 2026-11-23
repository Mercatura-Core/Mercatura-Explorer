"use client";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  busy?: boolean;
  label: string;
};

export function TablePageControls({ page, totalPages, onPageChange, busy = false, label }: Props) {
  const safeTotal = Math.max(1, totalPages);
  const first = Math.max(1, Math.min(page - 2, safeTotal - 4));
  const pages = Array.from({ length: Math.min(5, safeTotal) }, (_, index) => first + index);

  const inactive = "rounded border border-[#42361e] px-3 py-2 text-xs text-[#d8a33a] disabled:opacity-35";

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292820] px-5 py-4">
      <span aria-live="polite" className="text-xs text-[#858783]">Page {page} of {safeTotal}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={inactive} disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={`Page ${number}`}
            aria-current={number === page ? "page" : undefined}
            disabled={busy}
            className={number === page
              ? "rounded border border-[#d8a33a] bg-[#d8a33a] px-3 py-2 text-xs text-[#15120b] disabled:opacity-55"
              : inactive}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button type="button" className={inactive} disabled={busy || page >= safeTotal} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </nav>
  );
}
