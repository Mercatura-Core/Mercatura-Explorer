import type { FastifyInstance } from "fastify";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;
const MAX_LIST_OFFSET = 100_000;

function parseListInteger(
  value: string | undefined,
  name: string,
  minimum: number,
  maximum: number
): number {
  if (value === undefined) {
    return name === "limit" ? DEFAULT_LIST_LIMIT : 0;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }

  return parsed;
}

export function registerTransactionRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/api/v1/transactions", async (request, reply) => {
    let limit: number;
    let offset: number;

    try {
      limit = parseListInteger(request.query.limit, "limit", 1, MAX_LIST_LIMIT);
      offset = parseListInteger(request.query.offset, "offset", 0, MAX_LIST_OFFSET);
    } catch (error) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid transaction-list request",
      });
    }

    const transactions = await database
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
        "block.height as block_height",
        "block.time as block_time",
      ])
      .where("block.active", "=", true)
      .orderBy("block.height", "desc")
      .orderBy("tx.block_index", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    if (transactions.length === 0) {
      return {
        transactions: [],
        pagination: {
          limit,
          offset,
          nextOffset: null,
        },
      };
    }

    const transactionIds = transactions.map((transaction) => transaction.id);

    const [inputs, outputs] = await Promise.all([
      database
        .selectFrom("transaction_inputs as input")
        .leftJoin("transaction_outputs as previous_output", (join) =>
          join
            .onRef("previous_output.transaction_id", "=", "input.resolved_prev_transaction_id")
            .onRef("previous_output.vout", "=", "input.prev_vout")
        )
        .select([
          "input.transaction_id",
          "input.coinbase",
          "previous_output.address as prev_address",
        ])
        .where("input.transaction_id", "in", transactionIds)
        .execute(),

      database
        .selectFrom("transaction_outputs")
        .select(["transaction_id", "value_base_units", "address"])
        .where("transaction_id", "in", transactionIds)
        .execute(),
    ]);

    const inputAddresses = new Map<string, Set<string>>();
    const outputAddresses = new Map<string, Set<string>>();
    const outputTotals = new Map<string, bigint>();
    const coinbaseTransactions = new Set<string>();

    for (const transaction of transactions) {
      const key = String(transaction.id);

      inputAddresses.set(key, new Set());
      outputAddresses.set(key, new Set());
      outputTotals.set(key, 0n);
    }

    for (const input of inputs) {
      const key = String(input.transaction_id);

      if (input.coinbase !== null) {
        coinbaseTransactions.add(key);
      }

      if (input.prev_address !== null) {
        inputAddresses.get(key)?.add(input.prev_address);
      }
    }

    for (const output of outputs) {
      const key = String(output.transaction_id);

      if (output.address !== null) {
        outputAddresses.get(key)?.add(output.address);
      }

      outputTotals.set(key, (outputTotals.get(key) ?? 0n) + BigInt(output.value_base_units));
    }

    return {
      transactions: transactions.map((transaction) => {
        const key = String(transaction.id);

        return {
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
          coinbase: coinbaseTransactions.has(key),
          inputAddresses: [...(inputAddresses.get(key) ?? [])],
          outputAddresses: [...(outputAddresses.get(key) ?? [])],
          totalOutputBaseUnits: (outputTotals.get(key) ?? 0n).toString(),
        };
      }),
      pagination: {
        limit,
        offset,
        nextOffset: transactions.length < limit ? null : offset + transactions.length,
      },
    };
  });

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
