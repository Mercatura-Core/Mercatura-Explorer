import { createDatabase } from "@mercatura/database";

import { createRpcClient } from "./rpc.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const [blockchain, state] = await Promise.all([
    rpc.getBlockchainInfo(),
    db.selectFrom("chain_state").selectAll().where("id", "=", 1).executeTakeFirstOrThrow(),
  ]);

  const indexedHeight = state.tip_height ?? -1;
  const blocksBehind = blockchain.blocks - indexedHeight;

  console.log("Mercatura Explorer Indexer Status");
  console.log("--------------------------------");
  console.log(`Core chain:       ${blockchain.chain}`);
  console.log(`Core height:      ${blockchain.blocks}`);
  console.log(`Core tip:         ${blockchain.bestblockhash}`);
  console.log(`Indexed height:   ${state.tip_height ?? "none"}`);
  console.log(`Indexed tip:      ${state.tip_hash ?? "none"}`);
  console.log(`Blocks behind:    ${blocksBehind}`);
} finally {
  await db.destroy();
}
