import type { Kysely } from "kysely";

import type { Database } from "@mercatura/database";
import type { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

export class IndexedChainDivergenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexedChainDivergenceError";
  }
}

export async function assertIndexedTipMatchesCore(
  db: Kysely<Database>,
  rpc: MercaturaRpcClient
): Promise<void> {
  const state = await db
    .selectFrom("chain_state")
    .select(["tip_hash", "tip_height"])
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  if (state.tip_height === null && state.tip_hash === null) {
    return;
  }

  if (state.tip_height === null || state.tip_hash === null) {
    throw new Error(
      "Explorer chain_state is inconsistent: tip height and tip hash must both be null or both be set"
    );
  }

  const coreHeight = await rpc.getBlockCount();

  if (state.tip_height > coreHeight) {
    throw new IndexedChainDivergenceError(
      `Indexed tip height ${state.tip_height} is above Core height ${coreHeight}`
    );
  }

  const activeHash = await rpc.getBlockHash(state.tip_height);

  if (activeHash !== state.tip_hash) {
    throw new IndexedChainDivergenceError(
      `Indexed tip is not on Core's active chain at height ${state.tip_height}: database=${state.tip_hash}, core=${activeHash}`
    );
  }
}
