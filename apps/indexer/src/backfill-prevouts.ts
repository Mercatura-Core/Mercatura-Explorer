import { createDatabase } from "@mercatura/database";

import { resolvePrevoutTransactionId } from "./prevout.js";

const db = createDatabase();

try {
  const resolvedCount = await db.transaction().execute(async (trx) => {
    const inputs = await trx
      .selectFrom("transaction_inputs as input")
      .innerJoin(
        "transactions as spending_transaction",
        "spending_transaction.id",
        "input.transaction_id"
      )
      .innerJoin(
        "blocks as spending_block",
        "spending_block.hash",
        "spending_transaction.block_hash"
      )
      .select([
        "input.transaction_id",
        "input.vin",
        "input.prev_txid",
        "input.prev_vout",
        "spending_block.height as spending_height",
        "spending_transaction.block_index as spending_block_index",
      ])
      .where("input.coinbase", "is", null)
      .where("input.resolved_prev_transaction_id", "is", null)
      .where("spending_block.active", "=", true)
      .orderBy("spending_block.height")
      .orderBy("spending_transaction.block_index")
      .orderBy("input.vin")
      .execute();

    let count = 0;

    for (const input of inputs) {
      if (input.prev_txid === null || input.prev_vout === null) {
        throw new Error(
          `Non-coinbase input ${input.transaction_id}:${input.vin} is missing its raw prevout reference`
        );
      }

      const resolvedPrevTransactionId = await resolvePrevoutTransactionId(
        trx,
        input.prev_txid,
        input.prev_vout,
        input.spending_height,
        input.spending_block_index
      );

      await trx
        .updateTable("transaction_inputs")
        .set({
          resolved_prev_transaction_id: resolvedPrevTransactionId,
        })
        .where("transaction_id", "=", input.transaction_id)
        .where("vin", "=", input.vin)
        .executeTakeFirstOrThrow();

      count++;
    }

    return count;
  });

  console.log(`Resolved prevouts: ${resolvedCount}`);
} finally {
  await db.destroy();
}
