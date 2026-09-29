import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { MercaturaRpcClient } from "./client.js";

export function createRpcClient(): MercaturaRpcClient {
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
