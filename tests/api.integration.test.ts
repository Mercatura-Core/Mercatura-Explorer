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
});
