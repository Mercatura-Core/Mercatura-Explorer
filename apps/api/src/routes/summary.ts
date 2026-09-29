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
      recentTransactionsRaw,
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
          "tx.id",
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

    const recentTransactionIds = recentTransactionsRaw.map((transaction) => transaction.id);

    const [recentInputs, recentOutputs] =
      recentTransactionIds.length === 0
        ? [[], []]
        : await Promise.all([
            database
              .selectFrom("transaction_inputs as input")
              .leftJoin("transaction_outputs as previous_output", (join) =>
                join
                  .onRef(
                    "previous_output.transaction_id",
                    "=",
                    "input.resolved_prev_transaction_id"
                  )
                  .onRef("previous_output.vout", "=", "input.prev_vout")
              )
              .select([
                "input.transaction_id",
                "input.vin",
                "input.coinbase",
                "previous_output.address as previous_address",
              ])
              .where("input.transaction_id", "in", recentTransactionIds)
              .orderBy("input.transaction_id")
              .orderBy("input.vin")
              .execute(),

            database
              .selectFrom("transaction_outputs as output")
              .select([
                "output.transaction_id",
                "output.vout",
                "output.address",
                "output.value_base_units",
              ])
              .where("output.transaction_id", "in", recentTransactionIds)
              .orderBy("output.transaction_id")
              .orderBy("output.vout")
              .execute(),
          ]);

    const transactionSummaries = new Map<
      string,
      {
        coinbase: boolean;
        inputAddresses: Set<string>;
        outputAddresses: Set<string>;
        totalOutputBaseUnits: bigint;
      }
    >();

    for (const transaction of recentTransactionsRaw) {
      transactionSummaries.set(transaction.id, {
        coinbase: false,
        inputAddresses: new Set(),
        outputAddresses: new Set(),
        totalOutputBaseUnits: BigInt(0),
      });
    }

    for (const input of recentInputs) {
      const summary = transactionSummaries.get(input.transaction_id);

      if (summary === undefined) {
        continue;
      }

      if (input.coinbase !== null) {
        summary.coinbase = true;
      }

      if (input.previous_address !== null) {
        summary.inputAddresses.add(input.previous_address);
      }
    }

    for (const output of recentOutputs) {
      const summary = transactionSummaries.get(output.transaction_id);

      if (summary === undefined) {
        continue;
      }

      summary.totalOutputBaseUnits += BigInt(output.value_base_units);

      if (output.address !== null) {
        summary.outputAddresses.add(output.address);
      }
    }

    const recentTransactions = recentTransactionsRaw.map((row) => {
      const summary = transactionSummaries.get(row.id);

      if (summary === undefined) {
        throw new Error(`Missing recent transaction summary for ${row.txid}`);
      }

      return {
        txid: row.txid,
        wtxid: row.wtxid,
        block_index: row.block_index,
        size: row.size,
        vsize: row.vsize,
        weight: row.weight,
        fee_base_units: row.fee_base_units,
        block_hash: row.block_hash,
        block_height: row.block_height,
        block_time: row.block_time,
        coinbase: summary.coinbase,
        inputAddresses: [...summary.inputAddresses],
        outputAddresses: [...summary.outputAddresses],
        totalOutputBaseUnits: summary.totalOutputBaseUnits.toString(),
      };
    });

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
