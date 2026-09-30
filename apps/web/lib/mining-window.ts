export const MINING_WINDOWS = [144, 1000, 4032] as const;

export type MiningWindow = (typeof MINING_WINDOWS)[number];

export const DEFAULT_MINING_WINDOW: MiningWindow = 144;

export function parseMiningWindow(value: string | string[] | undefined): MiningWindow {
  const selected = Array.isArray(value) ? value[0] : value;

  if (selected === undefined) {
    return DEFAULT_MINING_WINDOW;
  }

  const parsed = Number(selected);

  if (parsed === 144 || parsed === 1000 || parsed === 4032) {
    return parsed;
  }

  return DEFAULT_MINING_WINDOW;
}
