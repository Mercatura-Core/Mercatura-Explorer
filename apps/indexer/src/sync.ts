import { createDatabase } from "@mercatura/database";

import { ingestBlock } from "./ingest-block.js";
import { createRpcClient } from "./rpc.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const blockchain = await rpc.getBlockchainInfo();

  const state = await db
    .selectFrom("chain_state")
    .select(["tip_height", "tip_hash"])
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  const targetHeight = blockchain.blocks;
  const startHeight = state.tip_height === null ? 0 : state.tip_height + 1;

  console.log("Mercatura Explorer Sync");
  console.log("-----------------------");
  console.log(`Core target height: ${targetHeight}`);
  console.log(`Indexed height:     ${state.tip_height ?? "none"}`);
  console.log(`Starting height:    ${startHeight}`);

  if (startHeight > targetHeight) {
    console.log("Database is already synchronized.");
    process.exitCode = 0;
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
