"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";

export interface DailyTransactionPoint {
  date: string;
  nonCoinbaseTransactions: string;
}

interface ChartPoint {
  date: string;
  value: number;
}

const WIDTH = 1000;
const HEIGHT = 300;

const LEFT = 64;
const RIGHT = 24;
const TOP = 22;
const BOTTOM = 46;

const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function TransactionsPerDayChart({ rows }: { rows: DailyTransactionPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const points = useMemo<ChartPoint[]>(
    () =>
      rows
        .map((row) => ({
          date: row.date,
          value: Number(row.nonCoinbaseTransactions),
        }))
        .filter((row) => Number.isFinite(row.value) && row.value >= 0),
    [rows]
  );

  if (points.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center px-5 text-sm text-[#777975]">
        Daily transaction history is unavailable.
      </div>
    );
  }

  const maximum = Math.max(1, ...points.map((point) => point.value));

  function xFor(index: number): number {
    if (points.length === 1) {
      return LEFT + PLOT_WIDTH / 2;
    }

    return LEFT + (index / (points.length - 1)) * PLOT_WIDTH;
  }

  function yFor(value: number): number {
    return TOP + (1 - value / maximum) * PLOT_HEIGHT;
  }

  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command}${xFor(index).toFixed(2)},${yFor(point.value).toFixed(2)}`;
    })
    .join(" ");

  const areaPath =
    `${linePath} ` +
    `L${xFor(points.length - 1).toFixed(2)},${(TOP + PLOT_HEIGHT).toFixed(2)} ` +
    `L${xFor(0).toFixed(2)},${(TOP + PLOT_HEIGHT).toFixed(2)} Z`;

  const labelIndexes = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])
  );

  const activeIndex = hoverIndex ?? selectedIndex;

  const activePoint = activeIndex === null ? null : (points[activeIndex] ?? null);

  function indexFromPointer(event: PointerEvent<HTMLDivElement>): number {
    const container = containerRef.current;

    if (container === null || points.length === 1) {
      return 0;
    }

    const rect = container.getBoundingClientRect();

    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;

    const ratio = Math.min(1, Math.max(0, (svgX - LEFT) / PLOT_WIDTH));

    return Math.round(ratio * (points.length - 1));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    setHoverIndex(indexFromPointer(event));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const index = indexFromPointer(event);

    setSelectedIndex(index);
    setHoverIndex(index);
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative touch-pan-y"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Confirmed non-coinbase Mercatura transactions per UTC day"
          className="h-[300px] w-full select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mercatura-transaction-activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d5a33d" stopOpacity="0.22" />

              <stop offset="100%" stopColor="#d5a33d" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = TOP + fraction * PLOT_HEIGHT;

            return (
              <line
                key={fraction}
                x1={LEFT}
                y1={y}
                x2={WIDTH - RIGHT}
                y2={y}
                stroke="#28271f"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          <path d={areaPath} fill="url(#mercatura-transaction-activity-fill)" />

          <path
            d={linePath}
            fill="none"
            stroke="#d6a33d"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {activeIndex !== null && activePoint !== null ? (
            <>
              <line
                x1={xFor(activeIndex)}
                y1={TOP}
                x2={xFor(activeIndex)}
                y2={TOP + PLOT_HEIGHT}
                stroke="#77612f"
                strokeWidth="1"
                strokeDasharray="4 5"
                vectorEffect="non-scaling-stroke"
              />

              <circle
                cx={xFor(activeIndex)}
                cy={yFor(activePoint.value)}
                r="5"
                fill="#e0af48"
                stroke="#0b0c0b"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}

          <text x={LEFT - 10} y={TOP + 4} textAnchor="end" fill="#73746f" fontSize="11">
            {formatCount(maximum)}
          </text>

          <text
            x={LEFT - 10}
            y={TOP + PLOT_HEIGHT / 2 + 4}
            textAnchor="end"
            fill="#73746f"
            fontSize="11"
          >
            {formatCount(Math.round(maximum / 2))}
          </text>

          <text
            x={LEFT - 10}
            y={TOP + PLOT_HEIGHT + 4}
            textAnchor="end"
            fill="#73746f"
            fontSize="11"
          >
            0
          </text>

          {labelIndexes.map((index) => (
            <text
              key={index}
              x={xFor(index)}
              y={HEIGHT - 14}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              fill="#73746f"
              fontSize="11"
            >
              {formatShortDate(points[index]!.date)}
            </text>
          ))}
        </svg>

        {activeIndex !== null && activePoint !== null ? (
          <div
            className="pointer-events-none absolute top-4 z-10 -translate-x-1/2 rounded-md border border-[#57421e] bg-[#11110e]/95 px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(xFor(activeIndex) / WIDTH) * 100}%`,
            }}
          >
            <div className="whitespace-nowrap text-[#92938f]">{formatDate(activePoint.date)}</div>

            <div className="mt-1 whitespace-nowrap font-semibold text-[#e6b44c]">
              {formatCount(activePoint.value)} transactions
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#696b67]">
        <span>Confirmed non-coinbase transactions · UTC</span>

        <span>Hover or tap the graph for an exact daily count</span>
      </div>
    </div>
  );
}
