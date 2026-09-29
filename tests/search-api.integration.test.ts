import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

const PQ_TXID = "54968d4b8dc8441a9187d23ed887b6ab01b1ba2759d491359051b7fedde70138";

const MINING_ADDRESS = "mcrt1zjdztnl9x5cuem3purjtqa2764n2ccckuq07natwsmta8cmv6nh5s5u2xng";

describe.runIf(integrationEnabled)("Mercatura search API integration", () => {
  it("finds blocks by height and hash", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const state = await db
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow();

      if (state.tip_height === null || state.tip_hash === null) {
        throw new Error("Search integration test requires an indexed chain");
      }

      const byHeight = await app.inject({
        method: "GET",
        url: `/api/v1/search?q=${state.tip_height}`,
      });

      expect(byHeight.statusCode).toBe(200);
      expect(byHeight.json()).toEqual({
        query: String(state.tip_height),
        matches: [
          {
            type: "block",
            hash: state.tip_hash,
            height: state.tip_height,
          },
        ],
      });

      const byHash = await app.inject({
        method: "GET",
        url: `/api/v1/search?q=${state.tip_hash}`,
      });

      expect(byHash.statusCode).toBe(200);

      expect(byHash.json()).toEqual({
        query: state.tip_hash,
        matches: [
          {
            type: "block",
            hash: state.tip_hash,
            height: state.tip_height,
          },
        ],
      });
    } finally {
      await app.close();
      await db.destroy();
    }
  });

  it("finds transactions and addresses", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const expectedAddress = await db
        .selectFrom("active_address_balances")
        .select(["balance_base_units", "utxo_count"])
        .where("address", "=", MINING_ADDRESS)
        .executeTakeFirstOrThrow();

      const transaction = await app.inject({
        method: "GET",
        url: `/api/v1/search?q=${PQ_TXID}`,
      });

      expect(transaction.statusCode).toBe(200);

      expect(transaction.json()).toMatchObject({
        query: PQ_TXID,
        matches: [
          {
            type: "transaction",
            txid: PQ_TXID,
            blockHeight: 103,
          },
        ],
      });

      const address = await app.inject({
        method: "GET",
        url: `/api/v1/search?q=${MINING_ADDRESS}`,
      });

      expect(address.statusCode).toBe(200);

      expect(address.json()).toMatchObject({
        query: MINING_ADDRESS,
        matches: [
          {
            type: "address",
            address: MINING_ADDRESS,
            balanceBaseUnits: expectedAddress.balance_base_units,
            utxoCount: expectedAddress.utxo_count,
          },
        ],
      });
    } finally {
      await app.close();
      await db.destroy();
    }
  });

  it("returns no matches for unknown values and rejects empty input", async () => {
    const app = buildApi();

    try {
      const unknownHash = await app.inject({
        method: "GET",
        url: `/api/v1/search?q=${"0".repeat(64)}`,
      });

      expect(unknownHash.statusCode).toBe(200);
      expect(unknownHash.json()).toEqual({
        query: "0".repeat(64),
        matches: [],
      });

      const unknownText = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=notarealmercaturaobject",
      });

      expect(unknownText.statusCode).toBe(200);
      expect(unknownText.json()).toEqual({
        query: "notarealmercaturaobject",
        matches: [],
      });

      const empty = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=",
      });

      expect(empty.statusCode).toBe(400);
      expect(empty.json()).toMatchObject({
        error: "invalid_request",
      });
    } finally {
      await app.close();
    }
  });
});
