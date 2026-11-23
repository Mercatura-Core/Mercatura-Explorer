type AxisPoint = {
  x: number;
  y: number;
  title: string;
};

export function AxisLineChart({
  points,
  xLabel = "Block height",
  yLabel,
  formatY,
}: {
  points: AxisPoint[];
  xLabel?: string;
  yLabel: string;
  formatY: (value: number) => string;
}) {
  if (points.length < 2) {
    return <div className="flex h-64 items-center justify-center text-xs text-[#777975]">Not enough indexed blocks for this chart.</div>;
  }

  const width = 1000;
  const height = 290;
  const left = 112;
  const right = 22;
  const top = 22;
  const bottom = 235;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const values = points.map((point) => point.y);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const naturalRange = maxY - minY;
  const pad = naturalRange === 0 ? Math.max(1, Math.abs(minY) * 0.02) : naturalRange * 0.06;
  const axisMin = minY - pad;
  const axisMax = maxY + pad;
  const toX = (value: number) => left + ((value - minX) / Math.max(1, maxX - minX)) * (width - right - left);
  const toY = (value: number) => bottom - ((value - axisMin) / (axisMax - axisMin)) * (bottom - top);
  const polyline = points.map((point) => `${toX(point.x).toFixed(2)},${toY(point.y).toFixed(2)}`).join(" ");
  const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${yLabel} by ${xLabel}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: 5 }, (_, index) => {
          const value = axisMin + ((axisMax - axisMin) * (4 - index)) / 4;
          const y = top + ((bottom - top) * index) / 4;
          return (
            <g key={index}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#292922" strokeWidth="1" />
              <text x={left - 10} y={y + 4} fill="#989a94" fontSize="12" textAnchor="end">{formatY(value)}</text>
            </g>
          );
        })}
        {[0, 0.5, 1].map((fraction) => {
          const value = minX + (maxX - minX) * fraction;
          const x = left + (width - right - left) * fraction;
          return <text key={fraction} x={x} y={bottom + 19} fill="#989a94" fontSize="12" textAnchor={fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}>{integer.format(value)}</text>;
        })}
        <polyline points={polyline} fill="none" stroke="#e3ae43" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => (
          <circle key={`${point.x}:${index}`} cx={toX(point.x)} cy={toY(point.y)} r="2.5" fill="#e3ae43">
            <title>{point.title}</title>
          </circle>
        ))}
        <text x={width / 2} y={height - 9} textAnchor="middle" fontSize="13" fill="#a5a69f">{xLabel}</text>
        <text transform={`translate(17 ${height / 2}) rotate(-90)`} textAnchor="middle" fontSize="13" fill="#a5a69f">{yLabel}</text>
      </svg>
      <div className="mt-1 flex justify-between gap-3 border-t border-[#24251f] pt-2 text-[10px] text-[#858783]">
        <span>Oldest block {integer.format(minX)}</span>
        <span>{points.length.toLocaleString("en-US")} plotted samples</span>
        <span>Newest block {integer.format(maxX)}</span>
      </div>
    </div>
  );
}
