import type { FastifyInstance } from "fastify";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100_000;

function parsePagination(
  limitValue: string | undefined,
  offsetValue: string | undefined
): {
  limit: number;
  offset: number;
} {
  const limit = limitValue === undefined ? DEFAULT_LIMIT : Number(limitValue);
  const offset = offsetValue === undefined ? 0 : Number(offsetValue);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${MAX_LIMIT}`);
  }

  if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new Error(`offset must be a non-negative integer not exceeding ${MAX_OFFSET}`);
  }

  return {
    limit,
    offset,
  };
}

function validateAddress(address: string): boolean {
  return address.length >= 8 && address.length <= 128 && !/\s/.test(address);
}

export function registerAddressRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Params: {
      address: string;
    };
  }>("/api/v1/addresses/:address", async (request, reply) => {
    const address = request.params.address;

    if (!validateAddress(address)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Address is invalid",
      });
    }

    const balance = await database
      .selectFrom("active_address_balances")
      .selectAll()
      .where("address", "=", address)
      .executeTakeFirst();

    if (balance === undefined) {
      return reply.code(404).send({
        error: "not_found",
        message: "Address not found",
      });
    }

    return {
      address: balance.address,
      transactionCount: balance.transaction_count,
      totalReceivedBaseUnits: balance.total_received_base_units,
      totalSpentBaseUnits: balance.total_spent_base_units,
      balanceBaseUnits: balance.balance_base_units,
      utxoCount: balance.utxo_count,
    };
  });

  app.get<{
    Params: {
      address: string;
    };
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/api/v1/addresses/:address/utxos", async (request, reply) => {
    const address = request.params.address;

    if (!validateAddress(address)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Address is invalid",
      });
    }

    let pagination;

    try {
      pagination = parsePagination(request.query.limit, request.query.offset);
    } catch (error) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid pagination",
      });
    }

    const addressExists = await database
      .selectFrom("active_address_balances")
      .select("address")
      .where("address", "=", address)
      .executeTakeFirst();

    if (addressExists === undefined) {
      return reply.code(404).send({
        error: "not_found",
        message: "Address not found",
      });
    }

    const utxos = await database
      .selectFrom("active_utxos")
      .selectAll()
      .where("address", "=", address)
      .orderBy("block_height", "desc")
      .orderBy("transaction_id", "desc")
      .orderBy("vout", "desc")
      .limit(pagination.limit)
      .offset(pagination.offset)
      .execute();

    return {
      address,
      utxos,
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        nextOffset: utxos.length < pagination.limit ? null : pagination.offset + utxos.length,
      },
    };
  });

  app.get<{
    Params: {
      address: string;
    };
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/api/v1/addresses/:address/transactions", async (request, reply) => {
    const address = request.params.address;

    if (!validateAddress(address)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Address is invalid",
      });
    }

    let pagination;

    try {
      pagination = parsePagination(request.query.limit, request.query.offset);
    } catch (error) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid pagination",
      });
    }

    const addressExists = await database
      .selectFrom("active_address_balances")
      .select("address")
      .where("address", "=", address)
      .executeTakeFirst();

    if (addressExists === undefined) {
      return reply.code(404).send({
        error: "not_found",
        message: "Address not found",
      });
    }

    const transactions = await database
      .selectFrom("active_address_transactions")
      .select([
        "txid",
        "block_hash",
        "block_height",
        "block_time",
        "block_index",
        "received_base_units",
        "spent_base_units",
        "net_base_units",
      ])
      .where("address", "=", address)
      .orderBy("block_height", "desc")
      .orderBy("block_index", "desc")
      .limit(pagination.limit)
      .offset(pagination.offset)
      .execute();

    return {
      address,
      transactions,
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        nextOffset:
          transactions.length < pagination.limit ? null : pagination.offset + transactions.length,
      },
    };
  });
}
