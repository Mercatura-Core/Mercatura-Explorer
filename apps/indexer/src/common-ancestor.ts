import type { Kysely } from "kysely";

import type { Database } from "@mercatura/database";
import type { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

export interface CommonAncestor {
  height: number;
  hash: string;
}

export async function findCommonAncestor(
  db: Kysely<Database>,
  rpc: MercaturaRpcClient
): Promise<CommonAncestor | null> {
  const state = await db
    .selectFrom("chain_state")
    .select(["tip_height", "tip_hash"])
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  if (state.tip_height === null && state.tip_hash === null) {
    return null;
  }

  if (state.tip_height === null || state.tip_hash === null) {
    throw new Error(
      "Explorer chain_state is inconsistent: tip height and tip hash must both be null or both be set"
    );
  }

  const coreHeight = await rpc.getBlockCount();
  const startHeight = Math.min(state.tip_height, coreHeight);

  for (let height = startHeight; height >= 0; height--) {
    const indexed = await db
      .selectFrom("blocks")
      .select("hash")
      .where("height", "=", height)
      .where("active", "=", true)
      .executeTakeFirst();

    if (indexed === undefined) {
      continue;
    }

    const coreHash = await rpc.getBlockHash(height);

    if (indexed.hash === coreHash) {
      return {
        height,
        hash: indexed.hash,
      };
    }
  }

  return null;
}
