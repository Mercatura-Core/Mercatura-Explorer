const BASE_UNITS_PER_MCA = 100;

export function mcaToBaseUnits(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid MCA amount: ${value}`);
  }

  const scaled = Math.round(value * BASE_UNITS_PER_MCA);

  if (Math.abs(value - scaled / BASE_UNITS_PER_MCA) > 1e-9) {
    throw new Error(`MCA amount has more than 2 decimal places: ${value}`);
  }

  return scaled.toString();
}
