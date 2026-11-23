// Every selection denotes elapsed wall-clock time measured back from the indexed chain tip,
// not a fixed number of blocks. "all" covers the whole active indexed chain.
export const MINING_WINDOW_OPTIONS = [
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "1W" },
  { value: "30d", label: "1M" },
  { value: "90d", label: "3M" },
  { value: "180d", label: "6M" },
  { value: "365d", label: "1Y" },
  { value: "all", label: "ALL" },
] as const;

export const MINING_WINDOWS = MINING_WINDOW_OPTIONS.map((option) => option.value);
export type MiningWindow = (typeof MINING_WINDOW_OPTIONS)[number]["value"];
export const DEFAULT_MINING_WINDOW: MiningWindow = "1d";

export function parseMiningWindow(value: string | string[] | undefined): MiningWindow {
  const selected = Array.isArray(value) ? value[0] : value;
  return MINING_WINDOWS.find((candidate) => candidate === selected) ?? DEFAULT_MINING_WINDOW;
}
