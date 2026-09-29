import { createDatabase } from "@mercatura/database";

import { findCommonAncestor } from "./common-ancestor.js";
import { createRpcClient } from "./rpc.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const ancestor = await findCommonAncestor(db, rpc);

  if (ancestor === null) {
    console.log("No common ancestor found.");
  } else {
    console.log(`Common ancestor: height=${ancestor.height} hash=${ancestor.hash}`);
  }
} finally {
  await db.destroy();
}
