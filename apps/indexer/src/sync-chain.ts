import type { Kysely } from "kysely";

import type { Database } from "@mercatura/database";
import type { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

import { assertIndexedTipMatchesCore, IndexedChainDivergenceError } from "./chain-consistency.js";
import { findCommonAncestor } from "./common-ancestor.js";
import { ingestBlock } from "./ingest-block.js";
import { rewindToCommonAncestor } from "./rewind.js";

export interface SyncResult {
  targetHeight: number;
  startHeight: number;
  finalHeight: number | null;
  recoveredReorg: boolean;
  rewoundBlocks: number;
}

export async function synchronizeChain(
  db: Kysely<Database>,
  rpc: MercaturaRpcClient,
  log: (message: string) => void = console.log
): Promise<SyncResult> {
  const blockchain = await rpc.getBlockchainInfo();
  const targetHeight = blockchain.blocks;

  let recoveredReorg = false;
  let rewoundBlocks = 0;

  try {
    await assertIndexedTipMatchesCore(db, rpc);
  } catch (error) {
    if (!(error instanceof IndexedChainDivergenceError)) {
      throw error;
    }

    recoveredReorg = true;

    log("Indexed chain divergence detected.");
    log(error.message);

    const ancestor = await findCommonAncestor(db, rpc);

    if (ancestor === null) {
      throw new Error("No common ancestor found; refusing automatic reorg recovery");
    }

    rewoundBlocks = await rewindToCommonAncestor(db, ancestor);

    log(`Rewound to common ancestor height ${ancestor.height}: ${ancestor.hash}`);
    log(`Blocks deactivated: ${rewoundBlocks}`);
  }

  const state = await db
    .selectFrom("chain_state")
    .select(["tip_height", "tip_hash"])
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  const startHeight = state.tip_height === null ? 0 : state.tip_height + 1;

  log("Mercatura Explorer Sync");
  log("-----------------------");
  log(`Core target height: ${targetHeight}`);
  log(`Indexed height:     ${state.tip_height ?? "none"}`);
  log(`Starting height:    ${startHeight}`);

  if (startHeight > targetHeight) {
    log("Database is already synchronized.");
  } else {
    for (let height = startHeight; height <= targetHeight; height++) {
      const hash = await ingestBlock(db, rpc, height);
      log(`Indexed block ${height}: ${hash}`);
    }

    log(`Synchronization complete at height ${targetHeight}`);
  }

  const finalState = await db
    .selectFrom("chain_state")
    .select("tip_height")
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  return {
    targetHeight,
    startHeight,
    finalHeight: finalState.tip_height,
    recoveredReorg,
    rewoundBlocks,
  };
}
