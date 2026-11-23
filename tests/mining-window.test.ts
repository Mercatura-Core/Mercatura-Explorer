import { describe, expect, it } from "vitest";

import {
  DEFAULT_MINING_WINDOW,
  MINING_WINDOWS,
  parseMiningWindow,
} from "../apps/web/lib/mining-window.js";

describe("Mercatura mining window selection", () => {
  it("presents the nine requested observation periods", () => {
    expect(MINING_WINDOWS).toEqual(["4h", "1d", "3d", "7d", "30d", "90d", "180d", "365d", "all"]);
  });

  it("accepts every supported mining window", () => {
    for (const window of MINING_WINDOWS) {
      expect(parseMiningWindow(window.toString())).toBe(window);
    }
  });

  it("uses the default for missing or unsupported values", () => {
    expect(parseMiningWindow(undefined)).toBe(DEFAULT_MINING_WINDOW);
    expect(parseMiningWindow("145")).toBe(DEFAULT_MINING_WINDOW);
    expect(parseMiningWindow("not-a-window")).toBe(DEFAULT_MINING_WINDOW);
  });

  it("uses the first value for repeated query parameters", () => {
    expect(parseMiningWindow(["30d", "all"])).toBe("30d");
  });
});
