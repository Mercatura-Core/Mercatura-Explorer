import { createDatabase } from "@mercatura/database";

import { findCommonAncestor } from "./common-ancestor.js";
import { rewindToCommonAncestor } from "./rewind.js";
import { createRpcClient } from "./rpc.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const ancestor = await findCommonAncestor(db, rpc);

  if (ancestor === null) {
    throw new Error("No common ancestor found; refusing to rewind the explorer database");
  }

  const rewoundBlocks = await rewindToCommonAncestor(db, ancestor);

  console.log(`Rewind complete: ancestor height=${ancestor.height} hash=${ancestor.hash}`);
  console.log(`Blocks deactivated: ${rewoundBlocks}`);
} finally {
  await db.destroy();
}
