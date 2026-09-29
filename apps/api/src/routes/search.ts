import type { FastifyInstance } from "fastify";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

export function registerSearchRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Querystring: {
      q?: string;
    };
  }>("/api/v1/search", async (request, reply) => {
    const query = request.query.q?.trim();

    if (query === undefined || query.length === 0) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Search query is required",
      });
    }

    if (query.length > 128) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Search query is too long",
      });
    }

    if (/^[0-9a-fA-F]{64}$/.test(query)) {
      const normalized = query.toLowerCase();

      const [block, transaction] = await Promise.all([
        database
          .selectFrom("blocks")
          .select(["hash", "height"])
          .where("active", "=", true)
          .where("hash", "=", normalized)
          .executeTakeFirst(),

        database
          .selectFrom("transactions as tx")
          .innerJoin("blocks as block", "block.hash", "tx.block_hash")
          .select(["tx.txid", "block.hash as block_hash", "block.height as block_height"])
          .where("block.active", "=", true)
          .where("tx.txid", "=", normalized)
          .executeTakeFirst(),
      ]);

      const matches: Array<
        | {
            type: "block";
            hash: string;
            height: number;
          }
        | {
            type: "transaction";
            txid: string;
            blockHash: string;
            blockHeight: number;
          }
      > = [];

      if (block !== undefined) {
        matches.push({
          type: "block",
          hash: block.hash,
          height: block.height,
        });
      }

      if (transaction !== undefined) {
        matches.push({
          type: "transaction",
          txid: transaction.txid,
          blockHash: transaction.block_hash,
          blockHeight: transaction.block_height,
        });
      }

      return {
        query,
        matches,
      };
    }

    if (/^\d+$/.test(query)) {
      const height = Number(query);

      if (!Number.isSafeInteger(height)) {
        return reply.code(400).send({
          error: "invalid_request",
          message: "Block height is invalid",
        });
      }

      const block = await database
        .selectFrom("blocks")
        .select(["hash", "height"])
        .where("active", "=", true)
        .where("height", "=", height)
        .executeTakeFirst();

      return {
        query,
        matches:
          block === undefined
            ? []
            : [
                {
                  type: "block" as const,
                  hash: block.hash,
                  height: block.height,
                },
              ],
      };
    }

    if (query.length >= 8 && query.length <= 128 && !/\s/.test(query)) {
      const address = await database
        .selectFrom("active_address_balances")
        .select(["address", "transaction_count", "balance_base_units", "utxo_count"])
        .where("address", "=", query)
        .executeTakeFirst();

      return {
        query,
        matches:
          address === undefined
            ? []
            : [
                {
                  type: "address" as const,
                  address: address.address,
                  transactionCount: address.transaction_count,
                  balanceBaseUnits: address.balance_base_units,
                  utxoCount: address.utxo_count,
                },
              ],
      };
    }

    return {
      query,
      matches: [],
    };
  });
}
