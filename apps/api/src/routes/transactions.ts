import type { FastifyInstance } from "fastify";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

export function registerTransactionRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Params: {
      txid: string;
    };
  }>("/api/v1/transactions/:txid", async (request, reply) => {
    const txid = request.params.txid;

    if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Transaction ID must be 64 hexadecimal characters",
      });
    }

    const transaction = await database
      .selectFrom("transactions as tx")
      .innerJoin("blocks as block", "block.hash", "tx.block_hash")
      .select([
        "tx.id",
        "tx.txid",
        "tx.wtxid",
        "tx.block_hash",
        "tx.block_index",
        "tx.version",
        "tx.locktime",
        "tx.size",
        "tx.vsize",
        "tx.weight",
        "tx.fee_base_units",
        "tx.hex",
        "block.height as block_height",
        "block.time as block_time",
      ])
      .where("tx.txid", "=", txid.toLowerCase())
      .where("block.active", "=", true)
      .executeTakeFirst();

    if (transaction === undefined) {
      return reply.code(404).send({
        error: "not_found",
        message: "Transaction not found",
      });
    }

    const inputs = await database
      .selectFrom("transaction_inputs as input")
      .leftJoin(
        "transactions as previous_tx",
        "previous_tx.id",
        "input.resolved_prev_transaction_id"
      )
      .leftJoin("transaction_outputs as previous_output", (join) =>
        join
          .onRef("previous_output.transaction_id", "=", "input.resolved_prev_transaction_id")
          .onRef("previous_output.vout", "=", "input.prev_vout")
      )
      .select([
        "input.vin",
        "input.prev_txid",
        "input.prev_vout",
        "input.sequence",
        "input.coinbase",
        "input.script_sig_asm",
        "input.script_sig_hex",
        "input.witness",
        "input.resolved_prev_transaction_id",
        "previous_tx.txid as resolved_prev_txid",
        "previous_output.value_base_units as prev_value_base_units",
        "previous_output.address as prev_address",
        "previous_output.script_type as prev_script_type",
      ])
      .where("input.transaction_id", "=", transaction.id)
      .orderBy("input.vin")
      .execute();

    const outputs = await database
      .selectFrom("transaction_outputs")
      .select([
        "vout",
        "value_base_units",
        "script_asm",
        "script_desc",
        "script_hex",
        "address",
        "script_type",
      ])
      .where("transaction_id", "=", transaction.id)
      .orderBy("vout")
      .execute();

    const activeSpends = await database
      .selectFrom("transaction_inputs as spending_input")
      .innerJoin("transactions as spending_tx", "spending_tx.id", "spending_input.transaction_id")
      .innerJoin("blocks as spending_block", "spending_block.hash", "spending_tx.block_hash")
      .select([
        "spending_input.prev_vout",
        "spending_input.vin as spending_vin",
        "spending_tx.txid as spending_txid",
      ])
      .where("spending_input.resolved_prev_transaction_id", "=", transaction.id)
      .where("spending_input.prev_vout", "is not", null)
      .where("spending_block.active", "=", true)
      .execute();

    const spendByVout = new Map<
      number,
      {
        txid: string;
        vin: number;
      }
    >();

    for (const spend of activeSpends) {
      if (spend.prev_vout === null) {
        continue;
      }

      if (spendByVout.has(spend.prev_vout)) {
        throw new Error(`Multiple active spends found for ${transaction.txid}:${spend.prev_vout}`);
      }

      spendByVout.set(spend.prev_vout, {
        txid: spend.spending_txid,
        vin: spend.spending_vin,
      });
    }

    return {
      transaction: {
        txid: transaction.txid,
        wtxid: transaction.wtxid,
        blockHash: transaction.block_hash,
        blockHeight: transaction.block_height,
        blockTime: transaction.block_time,
        blockIndex: transaction.block_index,
        version: transaction.version,
        locktime: transaction.locktime,
        size: transaction.size,
        vsize: transaction.vsize,
        weight: transaction.weight,
        feeBaseUnits: transaction.fee_base_units,
        hex: transaction.hex,
      },
      inputs,
      outputs: outputs.map((output) => ({
        ...output,
        spentBy: spendByVout.get(output.vout) ?? null,
      })),
    };
  });
}
