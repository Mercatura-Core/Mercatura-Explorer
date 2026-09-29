import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura Explorer API integration", () => {
  it("reports the indexed chain state", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const state = await db
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash", "updated_at"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/status",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: "ok",
        chain: {
          indexedHeight: state.tip_height,
          indexedTip: state.tip_hash,
          updatedAt: state.updated_at.toISOString(),
        },
      });
    } finally {
      await app.close();
      await db.destroy();
    }
  });

  it("serves active-chain block list and detail endpoints", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const state = await db
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      if (state.tip_height === null || state.tip_hash === null) {
        throw new Error("Block API integration test requires an indexed chain");
      }

      if (state.tip_height < 2) {
        throw new Error("Block API integration test requires at least three indexed blocks");
      }

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/v1/blocks?limit=2",
      });

      expect(listResponse.statusCode).toBe(200);

      const list = listResponse.json<{
        blocks: Array<{
          hash: string;
          height: number;
          tx_count: number;
        }>;
        pagination: {
          limit: number;
          nextBeforeHeight: number | null;
        };
      }>();

      expect(list.blocks).toHaveLength(2);
      expect(list.blocks[0]?.height).toBe(state.tip_height);
      expect(list.blocks[0]?.hash).toBe(state.tip_hash);
      expect(list.blocks[1]!.height).toBeLessThan(list.blocks[0]!.height);
      expect(list.pagination.limit).toBe(2);
      expect(list.pagination.nextBeforeHeight).toBe(list.blocks[1]!.height);

      const cursor = list.pagination.nextBeforeHeight;

      if (cursor === null) {
        throw new Error("Expected block-list pagination cursor");
      }

      const nextPageResponse = await app.inject({
        method: "GET",
        url: `/api/v1/blocks?limit=2&beforeHeight=${cursor}`,
      });

      expect(nextPageResponse.statusCode).toBe(200);

      const nextPage = nextPageResponse.json<{
        blocks: Array<{
          height: number;
        }>;
      }>();

      expect(nextPage.blocks.length).toBeGreaterThan(0);

      for (const block of nextPage.blocks) {
        expect(block.height).toBeLessThan(cursor);
      }

      const heightResponse = await app.inject({
        method: "GET",
        url: `/api/v1/blocks/${state.tip_height}`,
      });

      expect(heightResponse.statusCode).toBe(200);

      const heightDetail = heightResponse.json<{
        block: {
          hash: string;
          height: number;
          tx_count: number;
          next_hash: string | null;
        };
        transactions: Array<{
          txid: string;
          block_index: number;
        }>;
      }>();

      expect(heightDetail.block.height).toBe(state.tip_height);
      expect(heightDetail.block.hash).toBe(state.tip_hash);
      expect(heightDetail.block.next_hash).toBeNull();
      expect(heightDetail.transactions).toHaveLength(heightDetail.block.tx_count);

      for (let index = 0; index < heightDetail.transactions.length; index++) {
        expect(heightDetail.transactions[index]?.block_index).toBe(index);
      }

      const hashResponse = await app.inject({
        method: "GET",
        url: `/api/v1/blocks/${state.tip_hash}`,
      });

      expect(hashResponse.statusCode).toBe(200);

      const hashDetail = hashResponse.json<{
        block: {
          hash: string;
          height: number;
        };
      }>();

      expect(hashDetail.block.hash).toBe(state.tip_hash);
      expect(hashDetail.block.height).toBe(state.tip_height);

      const malformedResponse = await app.inject({
        method: "GET",
        url: "/api/v1/blocks/not-a-block",
      });

      expect(malformedResponse.statusCode).toBe(400);
      expect(malformedResponse.json()).toMatchObject({
        error: "invalid_request",
      });

      const missingResponse = await app.inject({
        method: "GET",
        url: `/api/v1/blocks/${"0".repeat(64)}`,
      });

      expect(missingResponse.statusCode).toBe(404);
      expect(missingResponse.json()).toMatchObject({
        error: "not_found",
      });

      const badLimitResponse = await app.inject({
        method: "GET",
        url: "/api/v1/blocks?limit=101",
      });

      expect(badLimitResponse.statusCode).toBe(400);
    } finally {
      await app.close();
      await db.destroy();
    }
  });
});
