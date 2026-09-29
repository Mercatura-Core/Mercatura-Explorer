import { sql } from "kysely";
import { describe, expect, it } from "vitest";

import { createDatabase } from "../packages/database/src/index.js";
import { createRpcClient } from "../apps/indexer/src/rpc.js";
import { synchronizeChain } from "../apps/indexer/src/sync-chain.js";

const integrationEnabled = process.env.MERCATURA_REORG_INTEGRATION === "1";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

async function readCounts(db: ExplorerDatabase) {
  const [blocks, transactions, inputs, outputs] = await Promise.all([
    db
      .selectFrom("blocks")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("transactions")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("transaction_inputs")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("transaction_outputs")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    blocks: Number(blocks.count),
    transactions: Number(transactions.count),
    inputs: Number(inputs.count),
    outputs: Number(outputs.count),
  };
}

describe.runIf(integrationEnabled)("Mercatura reorg integration", () => {
  it("recovers automatically from a synthetic three-block fork", async () => {
    const db = createDatabase();
    const rpc = createRpcClient();

    try {
      const blockchain = await rpc.getBlockchainInfo();
      const tipHeight = blockchain.blocks;

      if (tipHeight < 3) {
        throw new Error(
          `Reorg integration test requires at least 4 blocks; Core height is ${tipHeight}`
        );
      }

      const forkStart = tipHeight - 2;
      const ancestorHeight = tipHeight - 3;

      const [ancestorHash, realHash1, realHash2, realHash3] = await Promise.all([
        rpc.getBlockHash(ancestorHeight),
        rpc.getBlockHash(forkStart),
        rpc.getBlockHash(forkStart + 1),
        rpc.getBlockHash(forkStart + 2),
      ]);

      const state = await db
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      if (state.tip_height !== tipHeight || state.tip_hash !== realHash3) {
        throw new Error(
          `Reorg integration test requires a synchronized explorer: Core height=${tipHeight}, DB height=${state.tip_height}`
        );
      }

      const realBlocks = await db
        .selectFrom("blocks")
        .selectAll()
        .where("height", ">=", forkStart)
        .where("height", "<=", tipHeight)
        .where("active", "=", true)
        .orderBy("height")
        .execute();

      const [real1, real2, real3] = realBlocks;

      if (
        realBlocks.length !== 3 ||
        real1 === undefined ||
        real2 === undefined ||
        real3 === undefined
      ) {
        throw new Error("Expected exactly three active indexed blocks for the reorg test");
      }

      expect(real1.hash).toBe(realHash1);
      expect(real2.hash).toBe(realHash2);
      expect(real3.hash).toBe(realHash3);
      expect(real1.previous_hash).toBe(ancestorHash);

      const fakeHash1 = "1".repeat(64);
      const fakeHash2 = "2".repeat(64);
      const fakeHash3 = "3".repeat(64);

      const fakeHashes = [fakeHash1, fakeHash2, fakeHash3];

      const realHashes = [realHash1, realHash2, realHash3];

      const residue = await db
        .selectFrom("blocks")
        .select("hash")
        .where("hash", "in", fakeHashes)
        .execute();

      expect(residue).toHaveLength(0);

      const originalCounts = await readCounts(db);

      const cleanup = async () => {
        await db.transaction().execute(async (trx) => {
          await trx.deleteFrom("blocks").where("hash", "in", fakeHashes).execute();

          await trx
            .updateTable("blocks")
            .set({ active: true })
            .where("hash", "in", realHashes)
            .execute();

          await trx
            .updateTable("chain_state")
            .set({
              tip_height: tipHeight,
              tip_hash: realHash3,
              updated_at: sql`CURRENT_TIMESTAMP`,
            })
            .where("id", "=", 1)
            .executeTakeFirstOrThrow();
        });
      };

      try {
        await db.transaction().execute(async (trx) => {
          await trx
            .updateTable("blocks")
            .set({ active: false })
            .where("hash", "in", realHashes)
            .execute();

          await trx
            .insertInto("blocks")
            .values([
              {
                ...real1,
                hash: fakeHash1,
                previous_hash: ancestorHash,
                tx_count: 0,
                active: true,
              },
              {
                ...real2,
                hash: fakeHash2,
                previous_hash: fakeHash1,
                tx_count: 0,
                active: true,
              },
              {
                ...real3,
                hash: fakeHash3,
                previous_hash: fakeHash2,
                tx_count: 0,
                active: true,
              },
            ])
            .execute();

          await trx
            .updateTable("chain_state")
            .set({
              tip_height: tipHeight,
              tip_hash: fakeHash3,
              updated_at: sql`CURRENT_TIMESTAMP`,
            })
            .where("id", "=", 1)
            .executeTakeFirstOrThrow();
        });

        const result = await synchronizeChain(db, rpc, () => undefined);

        expect(result.recoveredReorg).toBe(true);
        expect(result.rewoundBlocks).toBe(3);
        expect(result.startHeight).toBe(forkStart);
        expect(result.targetHeight).toBe(tipHeight);
        expect(result.finalHeight).toBe(tipHeight);

        const recoveredState = await db
          .selectFrom("chain_state")
          .select(["tip_height", "tip_hash"])
          .where("id", "=", 1)
          .executeTakeFirstOrThrow();

        expect(recoveredState.tip_height).toBe(tipHeight);
        expect(recoveredState.tip_hash).toBe(realHash3);

        const recoveredBlocks = await db
          .selectFrom("blocks")
          .select(["hash", "active"])
          .where("height", ">=", forkStart)
          .where("height", "<=", tipHeight)
          .execute();

        for (const hash of realHashes) {
          expect(recoveredBlocks.find((block) => block.hash === hash)?.active).toBe(true);
        }

        for (const hash of fakeHashes) {
          expect(recoveredBlocks.find((block) => block.hash === hash)?.active).toBe(false);
        }

        const recoveredCounts = await readCounts(db);

        expect(recoveredCounts.blocks).toBe(originalCounts.blocks + 3);
        expect(recoveredCounts.transactions).toBe(originalCounts.transactions);
        expect(recoveredCounts.inputs).toBe(originalCounts.inputs);
        expect(recoveredCounts.outputs).toBe(originalCounts.outputs);
      } finally {
        await cleanup();
      }

      const finalCounts = await readCounts(db);

      expect(finalCounts).toEqual(originalCounts);
    } finally {
      await db.destroy();
    }
  }, 20_000);
});
