import { describe, expect, it } from "vitest";

import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_DB_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura database integration", () => {
  it("reads the seeded chain state", async () => {
    const db = createDatabase();

    try {
      const state = await db
        .selectFrom("chain_state")
        .selectAll()
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      expect(state.id).toBe(1);
      expect(state.tip_hash).toBeNull();
      expect(state.tip_height).toBeNull();
      expect(state.updated_at).toBeInstanceOf(Date);
    } finally {
      await db.destroy();
    }
  });
});
