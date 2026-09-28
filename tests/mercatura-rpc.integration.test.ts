import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MercaturaRpcClient } from "../packages/mercatura-rpc/src/index.js";

const integrationEnabled = process.env.MERCATURA_RPC_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura RPC integration", () => {
  const datadir = process.env.MERCATURA_DATADIR ?? join(homedir(), "mercatura-explorer-regtest");

  const cookiePath = join(datadir, "regtest", ".cookie");
  const cookie = readFileSync(cookiePath, "utf8").trim();

  const separator = cookie.indexOf(":");

  if (separator === -1) {
    throw new Error(`Invalid Mercatura RPC cookie: ${cookiePath}`);
  }

  const username = cookie.slice(0, separator);
  const password = cookie.slice(separator + 1);

  const client = new MercaturaRpcClient({
    url: process.env.MERCATURA_RPC_URL ?? "http://127.0.0.1:27773",
    credentials: {
      username,
      password,
    },
  });

  it("reads live Mercatura regtest status", async () => {
    const [blockchain, network, mining, mempool, blockCount] = await Promise.all([
      client.getBlockchainInfo(),
      client.getNetworkInfo(),
      client.getMiningInfo(),
      client.getMempoolInfo(),
      client.getBlockCount(),
    ]);

    expect(blockchain.chain).toBe("regtest");
    expect(blockchain.blocks).toBe(blockCount);
    expect(blockchain.headers).toBeGreaterThanOrEqual(blockCount);
    expect(blockchain.pruned).toBe(false);

    expect(network.subversion).toContain("MercaturaCore");
    expect(network.protocolversion).toBeGreaterThan(0);

    expect(mining.chain).toBe("regtest");
    expect(mining.blocks).toBe(blockCount);
    expect(mining.next.height).toBe(blockCount + 1);

    expect(mempool.loaded).toBe(true);
  });
});
