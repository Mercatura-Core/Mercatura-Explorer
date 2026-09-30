export const MERCATURA_PQ_SCRIPT_TYPE = "witness_v2_mercatura_pq";

export const ML_DSA_65_SIGNATURE_BYTES = 3309;
export const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;

export type MercaturaPqWitnessAnalysis = {
  present: boolean;
  itemCount: number;
  itemSizes: number[];
  matchesV1Shape: boolean;
};

export function isMercaturaPqScriptType(type: string | null | undefined): boolean {
  return type === MERCATURA_PQ_SCRIPT_TYPE;
}

export function formatMercaturaScriptType(type: string | null | undefined): string {
  if (type === null || type === undefined) {
    return "Unavailable";
  }

  if (isMercaturaPqScriptType(type)) {
    return "Mercatura PQ · Witness v2";
  }

  return type.replaceAll("_", " ");
}

export function analyzeMercaturaPqWitness(witness: string[] | null): MercaturaPqWitnessAnalysis {
  if (witness === null || witness.length === 0) {
    return {
      present: false,
      itemCount: 0,
      itemSizes: [],
      matchesV1Shape: false,
    };
  }

  const itemSizes = witness.map((item) => (item.length % 2 === 0 ? item.length / 2 : Number.NaN));

  return {
    present: true,
    itemCount: witness.length,
    itemSizes,
    matchesV1Shape:
      witness.length === 2 &&
      itemSizes[0] === ML_DSA_65_SIGNATURE_BYTES &&
      itemSizes[1] === ML_DSA_65_PUBLIC_KEY_BYTES,
  };
}

export function formatMercaturaPqWitness(witness: string[] | null): string {
  const analysis = analyzeMercaturaPqWitness(witness);

  if (!analysis.present) {
    return "None";
  }

  const sizes = analysis.itemSizes.map((size) =>
    Number.isFinite(size) ? `${size.toLocaleString("en-US")} B` : "Malformed"
  );

  return `${analysis.itemCount} item${analysis.itemCount === 1 ? "" : "s"} · ${sizes.join(" + ")}`;
}
