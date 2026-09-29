import type { FastifyInstance } from "fastify";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseInteger(value: string | undefined, name: string, minimum: number): number | null {
  if (value === undefined) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} must be at least ${minimum}`);
  }

  return parsed;
}

export function registerBlockRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Querystring: {
      limit?: string;
      beforeHeight?: string;
    };
  }>("/api/v1/blocks", async (request, reply) => {
    let limit: number;
    let beforeHeight: number | null;

    try {
      limit = parseInteger(request.query.limit, "limit", 1) ?? DEFAULT_LIMIT;

      beforeHeight = parseInteger(request.query.beforeHeight, "beforeHeight", 0);
    } catch (error) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid block-list request",
      });
    }

    if (limit > MAX_LIMIT) {
      return reply.code(400).send({
        error: "invalid_request",
        message: `limit must not exceed ${MAX_LIMIT}`,
      });
    }

    let query = database
      .selectFrom("blocks")
      .select([
        "hash",
        "height",
        "previous_hash",
        "time",
        "median_time",
        "bits",
        "difficulty",
        "tx_count",
        "stripped_size",
        "size",
        "weight",
      ])
      .where("active", "=", true);

    if (beforeHeight !== null) {
      query = query.where("height", "<", beforeHeight);
    }

    const blocks = await query.orderBy("height", "desc").limit(limit).execute();

    return {
      blocks,
      pagination: {
        limit,
        nextBeforeHeight: blocks.length === 0 ? null : blocks[blocks.length - 1]!.height,
      },
    };
  });

  app.get<{
    Params: {
      heightOrHash: string;
    };
  }>("/api/v1/blocks/:heightOrHash", async (request, reply) => {
    const value = request.params.heightOrHash;

    let query = database.selectFrom("blocks").selectAll().where("active", "=", true);

    if (/^[0-9a-fA-F]{64}$/.test(value)) {
      query = query.where("hash", "=", value.toLowerCase());
    } else if (/^\d+$/.test(value)) {
      const height = Number(value);

      if (!Number.isSafeInteger(height)) {
        return reply.code(400).send({
          error: "invalid_request",
          message: "Block height is invalid",
        });
      }

      query = query.where("height", "=", height);
    } else {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Block identifier must be a height or 64-character hexadecimal hash",
      });
    }

    const block = await query.executeTakeFirst();

    if (block === undefined) {
      return reply.code(404).send({
        error: "not_found",
        message: "Block not found",
      });
    }

    const transactions = await database
      .selectFrom("transactions")
      .select([
        "txid",
        "wtxid",
        "block_index",
        "version",
        "locktime",
        "size",
        "vsize",
        "weight",
        "fee_base_units",
      ])
      .where("block_hash", "=", block.hash)
      .orderBy("block_index")
      .execute();

    const nextBlock = await database
      .selectFrom("blocks")
      .select("hash")
      .where("active", "=", true)
      .where("height", "=", block.height + 1)
      .executeTakeFirst();

    return {
      block: {
        ...block,
        next_hash: nextBlock?.hash ?? null,
      },
      transactions,
    };
  });
}
