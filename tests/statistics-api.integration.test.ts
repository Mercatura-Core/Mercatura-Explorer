import { describe, expect, it } from "vitest";
import { sql } from "kysely";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

const PQ_SCRIPT_TYPE = "witness_v2_mercatura_pq";

describe.runIf(integrationEnabled)("Mercatura statistics API integration", () => {
  it("reconciles chain, UTXO, and PQ statistics", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const [state, pqOutputs, pqAuthorizations, pqUtxos, allUtxos] = await Promise.all([
        db
          .selectFrom("chain_state")
          .select(["tip_height", "tip_hash"])
          .where("id", "=", 1)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("transaction_outputs as output")
          .innerJoin("transactions as tx", "tx.id", "output.transaction_id")
          .innerJoin("blocks as block", "block.hash", "tx.block_hash")
          .select([
            sql<string>`COUNT(*)::text`.as("output_count"),
            sql<string>`
                COUNT(*) FILTER (
                  WHERE output.address IS NOT NULL
                )::text
              `.as("addressed_output_count"),
            sql<string>`
                COALESCE(
                  SUM(output.value_base_units),
                  0
                )::text
              `.as("value"),
          ])
          .where("block.active", "=", true)
          .where("output.script_type", "=", PQ_SCRIPT_TYPE)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("transaction_inputs as input")
          .innerJoin("transactions as spending_tx", "spending_tx.id", "input.transaction_id")
          .innerJoin("blocks as spending_block", "spending_block.hash", "spending_tx.block_hash")
          .innerJoin("transaction_outputs as previous_output", (join) =>
            join
              .onRef("previous_output.transaction_id", "=", "input.resolved_prev_transaction_id")
              .onRef("previous_output.vout", "=", "input.prev_vout")
          )
          .innerJoin(
            "transactions as previous_tx",
            "previous_tx.id",
            "previous_output.transaction_id"
          )
          .innerJoin("blocks as previous_block", "previous_block.hash", "previous_tx.block_hash")
          .select([
            sql<string>`COUNT(*)::text`.as("input_count"),
            sql<string>`
                COUNT(DISTINCT spending_tx.id)::text
              `.as("transaction_count"),
          ])
          .where("spending_block.active", "=", true)
          .where("previous_block.active", "=", true)
          .where("previous_output.script_type", "=", PQ_SCRIPT_TYPE)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("active_utxos")
          .select([
            sql<string>`COUNT(*)::text`.as("count"),
            sql<string>`
                COALESCE(
                  SUM(value_base_units),
                  0
                )::text
              `.as("value"),
          ])
          .where("script_type", "=", PQ_SCRIPT_TYPE)
          .executeTakeFirstOrThrow(),

        db
          .selectFrom("active_utxos")
          .select([
            sql<string>`COUNT(*)::text`.as("count"),
            sql<string>`
                COALESCE(
                  SUM(value_base_units),
                  0
                )::text
              `.as("value"),
          ])
          .executeTakeFirstOrThrow(),
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/statistics",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        chain: {
          indexedHeight: number | null;
          indexedTip: string | null;
          activeBlocks: string;
          transactions: string;
        };
        transactions: {
          total: string;
          nonCoinbase: string;
          feesBaseUnits: string;
        };
        addresses: {
          count: string;
          zeroBalanceCount: string;
        };
        utxos: {
          count: string;
          valueBaseUnits: string;
        };
        pq: {
          scriptType: string;
          outputCount: string;
          addressedOutputCount: string;
          outputValueBaseUnits: string;
          authorizationInputCount: string;
          spendingTransactionCount: string;
          activeUtxoCount: string;
          activeUtxoValueBaseUnits: string;
        };
        outputTypes: Array<{
          scriptType: string;
          outputCount: string;
          addressedOutputCount: string;
          totalValueBaseUnits: string;
        }>;
      }>();

      expect(body.chain.indexedHeight).toBe(state.tip_height);

      expect(body.chain.indexedTip).toBe(state.tip_hash);

      expect(body.pq.scriptType).toBe(PQ_SCRIPT_TYPE);

      expect(body.pq.outputCount).toBe(pqOutputs.output_count);

      expect(body.pq.addressedOutputCount).toBe(pqOutputs.addressed_output_count);

      expect(body.pq.outputValueBaseUnits).toBe(pqOutputs.value);

      expect(body.pq.authorizationInputCount).toBe(pqAuthorizations.input_count);

      expect(body.pq.spendingTransactionCount).toBe(pqAuthorizations.transaction_count);

      expect(body.pq.activeUtxoCount).toBe(pqUtxos.count);

      expect(body.pq.activeUtxoValueBaseUnits).toBe(pqUtxos.value);

      expect(body.utxos.count).toBe(allUtxos.count);

      expect(body.utxos.valueBaseUnits).toBe(allUtxos.value);

      expect(body.pq.activeUtxoValueBaseUnits).toBe(body.utxos.valueBaseUnits);

      const pqDistribution = body.outputTypes.find((row) => row.scriptType === PQ_SCRIPT_TYPE);

      expect(pqDistribution).toEqual({
        scriptType: PQ_SCRIPT_TYPE,
        outputCount: pqOutputs.output_count,
        addressedOutputCount: pqOutputs.addressed_output_count,
        totalValueBaseUnits: pqOutputs.value,
      });

      expect(Number(body.pq.authorizationInputCount)).toBeGreaterThan(0);

      expect(Number(body.pq.spendingTransactionCount)).toBeGreaterThan(0);
    } finally {
      await app.close();
      await db.destroy();
    }
  });
});
