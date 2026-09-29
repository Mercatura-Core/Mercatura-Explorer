import type { Kysely } from "kysely";

import type { Database } from "@mercatura/database";

export async function resolvePrevoutTransactionId(
  db: Kysely<Database>,
  txid: string,
  vout: number,
  spendingHeight: number,
  spendingBlockIndex: number
): Promise<string> {
  const candidates = await db
    .selectFrom("transaction_outputs as previous_output")
    .innerJoin(
      "transactions as previous_transaction",
      "previous_transaction.id",
      "previous_output.transaction_id"
    )
    .innerJoin("blocks as previous_block", "previous_block.hash", "previous_transaction.block_hash")
    .select([
      "previous_output.transaction_id as transaction_id",
      "previous_block.height as block_height",
      "previous_transaction.block_index as block_index",
    ])
    .where("previous_transaction.txid", "=", txid)
    .where("previous_output.vout", "=", vout)
    .where("previous_block.active", "=", true)
    .execute();

  const eligible = candidates.filter(
    (candidate) =>
      candidate.block_height < spendingHeight ||
      (candidate.block_height === spendingHeight && candidate.block_index < spendingBlockIndex)
  );

  if (eligible.length === 0) {
    throw new Error(
      `Unable to resolve prevout ${txid}:${vout} before block position ${spendingHeight}:${spendingBlockIndex}`
    );
  }

  if (eligible.length !== 1) {
    throw new Error(
      `Ambiguous prevout ${txid}:${vout}: found ${eligible.length} eligible active-chain outputs`
    );
  }

  return eligible[0]!.transaction_id;
}
