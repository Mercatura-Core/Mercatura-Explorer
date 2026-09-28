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

  it("reads live Mercatura block and transaction data", async () => {
    const blockHash = await client.getBlockHash(103);

    expect(blockHash).toBe("dafc4c0ab7696f18a8bda4d32f323430ec946bf3bdbe3c6ea138a9b7a1aa02de");

    const block = await client.getBlock(blockHash);

    expect(block.height).toBe(103);
    expect(block.hash).toBe(blockHash);
    expect(block.nTx).toBe(2);
    expect(block.tx).toHaveLength(2);

    const txid = "54968d4b8dc8441a9187d23ed887b6ab01b1ba2759d491359051b7fedde70138";

    const transaction = await client.getRawTransaction(txid, blockHash);

    expect(transaction.txid).toBe(txid);
    expect(transaction.blockhash).toBe(blockHash);
    expect(transaction.size).toBe(5450);
    expect(transaction.vsize).toBe(5450);
    expect(transaction.fee).toBeUndefined();

    expect(transaction.vout[0]?.scriptPubKey.type).toBe("witness_v2_mercatura_pq");

    const blockTransaction = block.tx.find((tx) => tx.txid === txid);

    expect(blockTransaction).toBeDefined();
    expect(blockTransaction?.fee).toBe(0.06);

    const stats = await client.getBlockStats(103);

    expect(stats.height).toBe(103);
    expect(stats.blockhash).toBe(blockHash);
    expect(stats.subsidy).toBe(2378234);
    expect(stats.totalfee).toBe(6);
    expect(stats.txs).toBe(2);
  });
});
