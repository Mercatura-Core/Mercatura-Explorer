import type { FastifyInstance } from "fastify";
import { sql } from "kysely";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

export function registerSummaryRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get("/api/v1/summary", async () => {
    const [
      state,
      activeBlockCount,
      activeTransactionCount,
      addressSummary,
      utxoSummary,
      recentBlocks,
      recentTransactions,
    ] = await Promise.all([
      database
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash", "updated_at"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow(),

      database
        .selectFrom("blocks")
        .select(({ fn }) => fn.countAll<string>().as("count"))
        .where("active", "=", true)
        .executeTakeFirstOrThrow(),

      database
        .selectFrom("transactions as tx")
        .innerJoin("blocks as block", "block.hash", "tx.block_hash")
        .select(({ fn }) => fn.countAll<string>().as("count"))
        .where("block.active", "=", true)
        .executeTakeFirstOrThrow(),

      database
        .selectFrom("active_address_balances")
        .select([
          sql<string>`COUNT(*)::text`.as("address_count"),
          sql<string>`COALESCE(SUM(balance_base_units), 0)::text`.as("balance_total_base_units"),
        ])
        .executeTakeFirstOrThrow(),

      database
        .selectFrom("active_utxos")
        .select([
          sql<string>`COUNT(*)::text`.as("utxo_count"),
          sql<string>`COALESCE(SUM(value_base_units), 0)::text`.as("utxo_total_base_units"),
        ])
        .executeTakeFirstOrThrow(),

      database
        .selectFrom("blocks")
        .select(["hash", "height", "time", "tx_count", "size", "weight", "difficulty"])
        .where("active", "=", true)
        .orderBy("height", "desc")
        .limit(10)
        .execute(),

      database
        .selectFrom("transactions as tx")
        .innerJoin("blocks as block", "block.hash", "tx.block_hash")
        .select([
          "tx.txid",
          "tx.wtxid",
          "tx.block_index",
          "tx.size",
          "tx.vsize",
          "tx.weight",
          "tx.fee_base_units",
          "block.hash as block_hash",
          "block.height as block_height",
          "block.time as block_time",
        ])
        .where("block.active", "=", true)
        .orderBy("block.height", "desc")
        .orderBy("tx.block_index", "desc")
        .limit(10)
        .execute(),
    ]);

    if (addressSummary.balance_total_base_units !== utxoSummary.utxo_total_base_units) {
      throw new Error("Address balance total does not match active UTXO total");
    }

    return {
      chain: {
        indexedHeight: state.tip_height,
        indexedTip: state.tip_hash,
        updatedAt: state.updated_at,
        activeBlocks: activeBlockCount.count,
        activeTransactions: activeTransactionCount.count,
      },
      addresses: {
        count: addressSummary.address_count,
        balanceTotalBaseUnits: addressSummary.balance_total_base_units,
      },
      utxos: {
        count: utxoSummary.utxo_count,
        valueBaseUnits: utxoSummary.utxo_total_base_units,
      },
      recentBlocks,
      recentTransactions,
    };
  });
}
