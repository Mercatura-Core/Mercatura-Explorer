import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

const WINDOWS = [144, 1000, 4032] as const;

describe.runIf(integrationEnabled)("Mercatura mining API integration", () => {
  for (const window of WINDOWS) {
    it(`serves and reconciles the ${window}-block mining window`, async () => {
      const app = buildApi();
      const db = createDatabase();

      try {
        const state = await db
          .selectFrom("chain_state")
          .select(["tip_height", "tip_hash"])
          .where("id", "=", 1)
          .executeTakeFirstOrThrow();

        if (state.tip_height === null || state.tip_hash === null) {
          throw new Error("Mining integration test requires an indexed chain");
        }

        const expectedBlocks = await db
          .selectFrom("blocks as block")
          .innerJoin("block_stats as stats", "stats.block_hash", "block.hash")
          .select([
            "block.hash",
            "block.height",
            "block.tx_count",
            "block.size",
            "block.weight",
            "block.difficulty",
            "stats.subsidy_base_units",
            "stats.total_fee_base_units",
          ])
          .where("block.active", "=", true)
          .orderBy("block.height", "desc")
          .limit(window)
          .execute();

        const response = await app.inject({
          method: "GET",
          url: `/api/v1/mining?window=${window}`,
        });

        expect(response.statusCode).toBe(200);

        const body = response.json<{
          chain: {
            indexedHeight: number;
            indexedTip: string;
          };
          window: {
            requestedBlocks: number;
            actualBlocks: number;
          };
          summary: {
            averageDifficulty: number;
            minimumDifficulty: number;
            maximumDifficulty: number;
            averageBlockIntervalSeconds: number | null;
            totalFeesBaseUnits: string;
            totalSubsidyBaseUnits: string;
            totalTransactions: number;
            totalBlockBytes: number;
            totalBlockWeight: number;
            averageBlockSizeBytes: number;
            averageBlockWeight: number;
          };
          payoutGroups: Array<{
            attribution: "pseudonymous" | "unidentified";
            payoutAddress: string | null;
            blocks: number;
            sharePercent: number;
          }>;
          history: Array<{
            height: number;
            hash: string;
            difficulty: number;
            transactionCount: number;
            size: number;
            weight: number;
            subsidyBaseUnits: string;
            feesBaseUnits: string;
          }>;
        }>();

        expect(body.chain).toEqual({
          indexedHeight: state.tip_height,
          indexedTip: state.tip_hash,
        });

        expect(body.window).toEqual({
          requestedBlocks: window,
          actualBlocks: expectedBlocks.length,
        });

        expect(body.history).toHaveLength(expectedBlocks.length);

        expect(body.history[0]?.height).toBe(state.tip_height);

        let expectedFees = 0n;
        let expectedSubsidy = 0n;
        let expectedTransactions = 0;
        let expectedBytes = 0;
        let expectedWeight = 0;

        for (const block of expectedBlocks) {
          expectedFees += BigInt(block.total_fee_base_units);

          expectedSubsidy += BigInt(block.subsidy_base_units);

          expectedTransactions += block.tx_count;
          expectedBytes += block.size;
          expectedWeight += block.weight;
        }

        expect(body.summary.totalFeesBaseUnits).toBe(expectedFees.toString());

        expect(body.summary.totalSubsidyBaseUnits).toBe(expectedSubsidy.toString());

        expect(body.summary.totalTransactions).toBe(expectedTransactions);

        expect(body.summary.totalBlockBytes).toBe(expectedBytes);

        expect(body.summary.totalBlockWeight).toBe(expectedWeight);

        for (let index = 1; index < body.history.length; index++) {
          expect(body.history[index - 1]!.height).toBeGreaterThan(body.history[index]!.height);
        }

        const attributedBlockCount = body.payoutGroups.reduce(
          (sum, group) => sum + group.blocks,
          0
        );

        expect(attributedBlockCount).toBe(expectedBlocks.length);

        const shareTotal = body.payoutGroups.reduce((sum, group) => sum + group.sharePercent, 0);

        expect(shareTotal).toBeCloseTo(100, 8);

        for (const group of body.payoutGroups) {
          if (group.attribution === "pseudonymous") {
            expect(group.payoutAddress).not.toBeNull();
          } else {
            expect(group.payoutAddress).toBeNull();
          }
        }

        expect(body.summary.averageDifficulty).toBeGreaterThanOrEqual(0);

        expect(body.summary.minimumDifficulty).toBeLessThanOrEqual(body.summary.maximumDifficulty);
      } finally {
        await app.close();
        await db.destroy();
      }
    });
  }

  it("rejects unsupported mining windows", async () => {
    const app = buildApi();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/mining?window=145",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "invalid_request",
      });
    } finally {
      await app.close();
    }
  });
});
