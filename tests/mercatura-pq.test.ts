import { describe, expect, it } from "vitest";

import {
  analyzeMercaturaPqWitness,
  formatMercaturaScriptType,
  isMercaturaPqScriptType,
  ML_DSA_65_PUBLIC_KEY_BYTES,
  ML_DSA_65_SIGNATURE_BYTES,
} from "../apps/web/lib/mercatura-pq.js";

describe("Mercatura PQ presentation helpers", () => {
  it("recognizes the native Mercatura PQ script type", () => {
    expect(isMercaturaPqScriptType("witness_v2_mercatura_pq")).toBe(true);
    expect(isMercaturaPqScriptType("witness_v1_taproot")).toBe(false);
    expect(formatMercaturaScriptType("witness_v2_mercatura_pq")).toBe("Mercatura PQ · Witness v2");
  });

  it("recognizes the exact PQ Authorization v1 witness shape", () => {
    const witness = [
      "00".repeat(ML_DSA_65_SIGNATURE_BYTES),
      "11".repeat(ML_DSA_65_PUBLIC_KEY_BYTES),
    ];

    expect(analyzeMercaturaPqWitness(witness)).toEqual({
      present: true,
      itemCount: 2,
      itemSizes: [ML_DSA_65_SIGNATURE_BYTES, ML_DSA_65_PUBLIC_KEY_BYTES],
      matchesV1Shape: true,
    });
  });

  it("does not label malformed or reordered witnesses as PQ v1 shape", () => {
    expect(
      analyzeMercaturaPqWitness([
        "00".repeat(ML_DSA_65_PUBLIC_KEY_BYTES),
        "11".repeat(ML_DSA_65_SIGNATURE_BYTES),
      ]).matchesV1Shape
    ).toBe(false);

    expect(analyzeMercaturaPqWitness(null).matchesV1Shape).toBe(false);
  });
});
