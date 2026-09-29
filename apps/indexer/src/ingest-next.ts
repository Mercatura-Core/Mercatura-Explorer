import { createDatabase } from "@mercatura/database";

import { ingestBlock } from "./ingest-block.js";
import { createRpcClient } from "./rpc.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const state = await db
    .selectFrom("chain_state")
    .select("tip_height")
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();

  const nextHeight = state.tip_height === null ? 0 : state.tip_height + 1;

  const hash = await ingestBlock(db, rpc, nextHeight);

  console.log(`Indexed block ${nextHeight}: ${hash}`);
} finally {
  await db.destroy();
}
