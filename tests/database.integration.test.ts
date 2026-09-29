import { describe, expect, it } from "vitest";

import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_DB_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura database integration", () => {
  it("reads a consistent chain state", async () => {
    const db = createDatabase();

    try {
      const state = await db
        .selectFrom("chain_state")
        .selectAll()
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      expect(state.id).toBe(1);
      expect(state.updated_at).toBeInstanceOf(Date);

      const tipIsEmpty = state.tip_hash === null && state.tip_height === null;

      const tipIsSet = state.tip_hash !== null && state.tip_height !== null;

      expect(tipIsEmpty || tipIsSet).toBe(true);

      if (state.tip_hash !== null && state.tip_height !== null) {
        expect(state.tip_height).toBeGreaterThanOrEqual(0);

        const activeTip = await db
          .selectFrom("blocks")
          .select(["hash", "height"])
          .where("hash", "=", state.tip_hash)
          .where("height", "=", state.tip_height)
          .where("active", "=", true)
          .executeTakeFirstOrThrow();

        expect(activeTip.hash).toBe(state.tip_hash);
        expect(activeTip.height).toBe(state.tip_height);
      }
    } finally {
      await db.destroy();
    }
  });
});
