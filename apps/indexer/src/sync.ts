import { createDatabase } from "@mercatura/database";

import { assertIndexedTipMatchesCore, IndexedChainDivergenceError } from "./chain-consistency.js";
import { findCommonAncestor } from "./common-ancestor.js";
import { ingestBlock } from "./ingest-block.js";
import { rewindToCommonAncestor } from "./rewind.js";
import { createRpcClient } from "./rpc.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const blockchain = await rpc.getBlockchainInfo();
  const targetHeight = blockchain.blocks;

  try {
    await assertIndexedTipMatchesCore(db, rpc);
  } catch (error) {
    if (!(error instanceof IndexedChainDivergenceError)) {
      throw error;
    }

    console.log("Indexed chain divergence detected.");
    console.log(error.message);

    const ancestor = await findCommonAncestor(db, rpc);

    if (ancestor === null) {
      throw new Error("No common ancestor found; refusing automatic reorg recovery");
    }

    const rewoundBlocks = await rewindToCommonAncestor(db, ancestor);

    console.log(`Rewound to common ancestor height ${ancestor.height}: ${ancestor.hash}`);
    console.log(`Blocks deactivated: ${rewoundBlocks}`);
  }

  const state = await db
    .selectFrom("chain_state")
    .select(["tip_height", "tip_hash"])
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  const startHeight = state.tip_height === null ? 0 : state.tip_height + 1;

  console.log("Mercatura Explorer Sync");
  console.log("-----------------------");
  console.log(`Core target height: ${targetHeight}`);
  console.log(`Indexed height:     ${state.tip_height ?? "none"}`);
  console.log(`Starting height:    ${startHeight}`);

  if (startHeight > targetHeight) {
    console.log("Database is already synchronized.");
  } else {
    for (let height = startHeight; height <= targetHeight; height++) {
      const hash = await ingestBlock(db, rpc, height);
      console.log(`Indexed block ${height}: ${hash}`);
    }

    console.log(`Synchronization complete at height ${targetHeight}`);
  }
} finally {
  await db.destroy();
}
