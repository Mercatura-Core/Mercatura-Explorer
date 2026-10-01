import { describe, expect, it } from "vitest";
import { sql } from "kysely";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura emission API integration", () => {
  it("serves authoritative emission totals and history", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const state = await db
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      if (state.tip_height === null || state.tip_hash === null) {
        throw new Error("Emission integration test requires an indexed chain");
      }

      const currentStats = await db
        .selectFrom("block_stats")
        .select(["subsidy_base_units", "total_fee_base_units"])
        .where("block_hash", "=", state.tip_hash)
        .executeTakeFirstOrThrow();

      const spendable = await db
        .selectFrom("active_utxos")
        .select(
          sql<string>`
              COALESCE(
                SUM(value_base_units),
                0
              )::text
            `.as("value")
        )
        .executeTakeFirstOrThrow();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/emission?limit=2",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        chain: {
          indexedHeight: number;
          indexedTip: string;
        };
        totals: {
          consensusSubsidyIncludingGenesisBaseUnits: string;
          consensusSubsidyExcludingGenesisBaseUnits: string;
          actualIssuedIncludingGenesisBaseUnits: string;
          actualIssuedExcludingGenesisBaseUnits: string;
          genesisUnspendableBaseUnits: string;
          transactionFeesBaseUnits: string;
          spendableUtxoValueBaseUnits: string;
        };
        current: {
          height: number;
          hash: string;
          subsidyBaseUnits: string;
          feesBaseUnits: string;
        } | null;
        history: Array<{
          height: number;
          hash: string;
          subsidy_base_units: string;
          total_fee_base_units: string;
          coinbase_payout_base_units: string;
          actual_issuance_base_units: string;
          cumulative_issued_base_units: string;
        }>;
        pagination: {
          limit: number;
          nextBeforeHeight: number | null;
        };
      }>();

      expect(body.chain).toEqual({
        indexedHeight: state.tip_height,
        indexedTip: state.tip_hash,
      });

      expect(body.current).toEqual({
        height: state.tip_height,
        hash: state.tip_hash,
        subsidyBaseUnits: currentStats.subsidy_base_units,
        feesBaseUnits: currentStats.total_fee_base_units,
      });

      expect(body.totals.genesisUnspendableBaseUnits).toBe("5000");

      expect(body.totals.spendableUtxoValueBaseUnits).toBe(spendable.value);

      expect(
        BigInt(body.totals.consensusSubsidyIncludingGenesisBaseUnits) -
          BigInt(body.totals.consensusSubsidyExcludingGenesisBaseUnits)
      ).toBe(5000n);

      expect(
        BigInt(body.totals.actualIssuedIncludingGenesisBaseUnits) -
          BigInt(body.totals.actualIssuedExcludingGenesisBaseUnits)
      ).toBe(5000n);

      expect(body.history).toHaveLength(2);
      expect(body.history[0]?.height).toBe(state.tip_height);
      expect(body.history[1]?.height).toBe(state.tip_height - 1);

      expect(body.history[0]?.cumulative_issued_base_units).toBe(
        body.totals.actualIssuedExcludingGenesisBaseUnits
      );

      expect(body.pagination.limit).toBe(2);
      expect(body.pagination.nextBeforeHeight).toBe(state.tip_height - 1);
    } finally {
      await app.close();
      await db.destroy();
    }
  });

  it("paginates emission history without repeating rows", async () => {
    const app = buildApi();

    try {
      const first = await app.inject({
        method: "GET",
        url: "/api/v1/emission?limit=2",
      });

      expect(first.statusCode).toBe(200);

      const firstBody = first.json<{
        history: Array<{ height: number }>;
        pagination: {
          nextBeforeHeight: number | null;
        };
      }>();

      expect(firstBody.history).toHaveLength(2);

      const nextBeforeHeight = firstBody.pagination.nextBeforeHeight;

      expect(nextBeforeHeight).not.toBeNull();

      const second = await app.inject({
        method: "GET",
        url: `/api/v1/emission?limit=2&beforeHeight=` + nextBeforeHeight,
      });

      expect(second.statusCode).toBe(200);

      const secondBody = second.json<{
        history: Array<{ height: number }>;
      }>();

      expect(secondBody.history).toHaveLength(2);

      expect(secondBody.history[0]!.height).toBeLessThan(firstBody.history.at(-1)!.height);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid emission pagination", async () => {
    const app = buildApi();

    try {
      const badLimit = await app.inject({
        method: "GET",
        url: "/api/v1/emission?limit=1001",
      });

      expect(badLimit.statusCode).toBe(400);
      expect(badLimit.json()).toMatchObject({
        error: "invalid_request",
      });

      const badHeight = await app.inject({
        method: "GET",
        url: "/api/v1/emission?beforeHeight=-1",
      });

      expect(badHeight.statusCode).toBe(400);
      expect(badHeight.json()).toMatchObject({
        error: "invalid_request",
      });

      const withoutSpendable = await app.inject({
        method: "GET",
        url: "/api/v1/emission?limit=2&includeSpendable=false",
      });

      expect(withoutSpendable.statusCode).toBe(200);

      expect(withoutSpendable.json()).toMatchObject({
        totals: {
          spendableUtxoValueBaseUnits: null,
        },
      });

      const badIncludeSpendable = await app.inject({
        method: "GET",
        url: "/api/v1/emission?includeSpendable=invalid",
      });

      expect(badIncludeSpendable.statusCode).toBe(400);

      expect(badIncludeSpendable.json()).toMatchObject({
        error: "invalid_request",
      });
    } finally {
      await app.close();
    }
  });
});
