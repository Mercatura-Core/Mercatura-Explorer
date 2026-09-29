import { createDatabase } from "@mercatura/database";

import { createRpcClient } from "./rpc.js";
import { synchronizeChain } from "./sync-chain.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  await synchronizeChain(db, rpc);
} finally {
  await db.destroy();
}
