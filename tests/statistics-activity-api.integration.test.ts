import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

interface ActivityResponse {
  transactions: {
    nonCoinbase: string;
  };

  activity: {
    range: string;

    dailyTransactions: Array<{
      date: string;
      nonCoinbaseTransactions: string;
    }>;
  };
}

describe.runIf(integrationEnabled)("Mercatura daily transaction statistics API integration", () => {
  it("returns contiguous UTC non-coinbase daily activity", async () => {
    const app = buildApi();

    try {
      const defaultResponse = await app.inject({
        method: "GET",
        url: "/api/v1/statistics",
      });

      expect(defaultResponse.statusCode).toBe(200);

      const defaultBody = defaultResponse.json<ActivityResponse>();

      expect(defaultBody.activity.range).toBe("30d");

      for (const row of defaultBody.activity.dailyTransactions) {
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(BigInt(row.nonCoinbaseTransactions)).toBeGreaterThanOrEqual(BigInt(0));
      }

      for (let index = 1; index < defaultBody.activity.dailyTransactions.length; index += 1) {
        const previous = defaultBody.activity.dailyTransactions[index - 1];

        const current = defaultBody.activity.dailyTransactions[index];

        expect(previous).toBeDefined();
        expect(current).toBeDefined();

        const previousTime = Date.parse(`${previous!.date}T00:00:00Z`);
        const currentTime = Date.parse(`${current!.date}T00:00:00Z`);

        expect(currentTime - previousTime).toBe(86_400_000);
      }

      const allResponse = await app.inject({
        method: "GET",
        url: "/api/v1/statistics?range=all",
      });

      expect(allResponse.statusCode).toBe(200);

      const allBody = allResponse.json<ActivityResponse>();

      expect(allBody.activity.range).toBe("all");

      const allDailyTotal = allBody.activity.dailyTransactions.reduce(
        (total, row) => total + BigInt(row.nonCoinbaseTransactions),
        BigInt(0)
      );

      expect(allDailyTotal.toString()).toBe(allBody.transactions.nonCoinbase);

      const invalidResponse = await app.inject({
        method: "GET",
        url: "/api/v1/statistics?range=invalid",
      });

      expect(invalidResponse.statusCode).toBe(200);

      expect(invalidResponse.json<ActivityResponse>().activity.range).toBe("30d");
    } finally {
      await app.close();
    }
  });
});
