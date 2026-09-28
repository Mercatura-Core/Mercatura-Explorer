import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { createDatabase } from "@mercatura/database";
import { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

function createRpcClient(): MercaturaRpcClient {
  const datadir = process.env.MERCATURA_DATADIR ?? join(homedir(), "mercatura-explorer-regtest");

  const cookiePath = process.env.MERCATURA_RPC_COOKIE ?? join(datadir, "regtest", ".cookie");

  const cookie = readFileSync(cookiePath, "utf8").trim();
  const separator = cookie.indexOf(":");

  if (separator === -1) {
    throw new Error(`Invalid Mercatura RPC cookie: ${cookiePath}`);
  }

  return new MercaturaRpcClient({
    url: process.env.MERCATURA_RPC_URL ?? "http://127.0.0.1:27773",
    credentials: {
      username: cookie.slice(0, separator),
      password: cookie.slice(separator + 1),
    },
  });
}

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
