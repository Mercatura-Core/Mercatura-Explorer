import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura summary API integration", () => {
  it("reconciles explorer summary with active indexed state", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const [state, blockCount, transactionCount, addressTotals, utxoTotals] = await Promise.all([
        db
          .selectFrom("chain_state")
          .select(["tip_height", "tip_hash"])
          .where("id", "=", 1)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("blocks")
          .select(({ fn }) => fn.countAll<string>().as("count"))
          .where("active", "=", true)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("transactions as tx")
          .innerJoin("blocks as block", "block.hash", "tx.block_hash")
          .select(({ fn }) => fn.countAll<string>().as("count"))
          .where("block.active", "=", true)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("active_address_balances")
          .select(({ fn }) => [
            fn.countAll<string>().as("count"),
            fn.sum<string>("balance_base_units").as("balance_total"),
          ])
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("active_utxos")
          .select(({ fn }) => [
            fn.countAll<string>().as("count"),
            fn.sum<string>("value_base_units").as("value_total"),
          ])
          .executeTakeFirstOrThrow(),
      ]);

      if (state.tip_height === null || state.tip_hash === null) {
        throw new Error("Summary integration test requires an indexed chain");
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/summary",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        chain: {
          indexedHeight: number | null;
          indexedTip: string | null;
          updatedAt: string;
          activeBlocks: string;
          activeTransactions: string;
        };
        addresses: {
          count: string;
          balanceTotalBaseUnits: string;
        };
        utxos: {
          count: string;
          valueBaseUnits: string;
        };
        recentBlocks: Array<{
          hash: string;
          height: number;
          tx_count: number;
        }>;
        recentTransactions: Array<{
          txid: string;
          block_height: number;
          block_index: number;
        }>;
      }>();

      expect(body.chain.indexedHeight).toBe(state.tip_height);
      expect(body.chain.indexedTip).toBe(state.tip_hash);
      expect(body.chain.activeBlocks).toBe(blockCount.count);
      expect(body.chain.activeTransactions).toBe(transactionCount.count);

      expect(body.addresses.count).toBe(addressTotals.count);
      expect(body.utxos.count).toBe(utxoTotals.count);

      expect(body.addresses.balanceTotalBaseUnits).toBe(addressTotals.balance_total ?? "0");

      expect(body.utxos.valueBaseUnits).toBe(utxoTotals.value_total ?? "0");

      expect(body.addresses.balanceTotalBaseUnits).toBe(body.utxos.valueBaseUnits);

      expect(body.recentBlocks.length).toBeGreaterThan(0);
      expect(body.recentBlocks.length).toBeLessThanOrEqual(10);
      expect(body.recentBlocks[0]?.height).toBe(state.tip_height);

      for (let index = 1; index < body.recentBlocks.length; index++) {
        expect(body.recentBlocks[index - 1]!.height).toBeGreaterThan(
          body.recentBlocks[index]!.height
        );
      }

      expect(body.recentTransactions.length).toBeGreaterThan(0);
      expect(body.recentTransactions.length).toBeLessThanOrEqual(10);

      for (let index = 1; index < body.recentTransactions.length; index++) {
        const previous = body.recentTransactions[index - 1]!;
        const current = body.recentTransactions[index]!;

        expect(
          previous.block_height > current.block_height ||
            (previous.block_height === current.block_height &&
              previous.block_index >= current.block_index)
        ).toBe(true);
      }

      expect(Number(body.chain.activeBlocks)).toBeGreaterThan(0);
      expect(Number(body.chain.activeTransactions)).toBeGreaterThan(0);
      expect(Number(body.utxos.count)).toBeGreaterThan(0);
    } finally {
      await app.close();
      await db.destroy();
    }
  });
});
