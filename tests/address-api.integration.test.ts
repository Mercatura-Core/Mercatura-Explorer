import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";
import { createDatabase } from "../packages/database/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

const MINING_ADDRESS = "mcrt1zjdztnl9x5cuem3purjtqa2764n2ccckuq07natwsmta8cmv6nh5s5u2xng";

const ZERO_BALANCE_ADDRESS = "mcrt1zek2wa30hxu8qxfkj4fr93q3h86lk38szgthj4rpcv35h6spv52qq9wv4my";

describe.runIf(integrationEnabled)("Mercatura address API integration", () => {
  it("serves current balance and UTXOs for the mining address", async () => {
    const app = buildApi();
    const db = createDatabase();

    try {
      const expected = await db
        .selectFrom("active_address_balances")
        .select([
          "address",
          "transaction_count",
          "total_received_base_units",
          "total_spent_base_units",
          "balance_base_units",
          "utxo_count",
        ])
        .where("address", "=", MINING_ADDRESS)
        .executeTakeFirstOrThrow();

      const summaryResponse = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${MINING_ADDRESS}`,
      });

      expect(summaryResponse.statusCode).toBe(200);

      expect(summaryResponse.json()).toEqual({
        address: expected.address,
        transactionCount: expected.transaction_count,
        totalReceivedBaseUnits: expected.total_received_base_units,
        totalSpentBaseUnits: expected.total_spent_base_units,
        balanceBaseUnits: expected.balance_base_units,
        utxoCount: expected.utxo_count,
      });

      const utxoResponse = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${MINING_ADDRESS}/utxos?limit=5`,
      });

      expect(utxoResponse.statusCode).toBe(200);

      const body = utxoResponse.json<{
        address: string;
        utxos: Array<{
          txid: string;
          vout: number;
          value_base_units: string;
          address: string | null;
          script_type: string;
        }>;
        pagination: {
          limit: number;
          offset: number;
          nextOffset: number | null;
        };
      }>();

      expect(body.address).toBe(MINING_ADDRESS);
      expect(body.utxos).toHaveLength(5);
      expect(body.pagination).toEqual({
        limit: 5,
        offset: 0,
        nextOffset: 5,
      });

      for (const utxo of body.utxos) {
        expect(utxo.address).toBe(MINING_ADDRESS);
        expect(utxo.script_type).toBe("witness_v2_mercatura_pq");
        expect(Number(utxo.value_base_units)).toBeGreaterThan(0);
      }
    } finally {
      await app.close();
      await db.destroy();
    }
  });

  it("preserves transaction history for a zero-balance address", async () => {
    const app = buildApi();

    try {
      const summaryResponse = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${ZERO_BALANCE_ADDRESS}`,
      });

      expect(summaryResponse.statusCode).toBe(200);

      expect(summaryResponse.json()).toEqual({
        address: ZERO_BALANCE_ADDRESS,
        transactionCount: "2",
        totalReceivedBaseUnits: "2368228",
        totalSpentBaseUnits: "2368228",
        balanceBaseUnits: "0",
        utxoCount: "0",
      });

      const historyResponse = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${ZERO_BALANCE_ADDRESS}/transactions`,
      });

      expect(historyResponse.statusCode).toBe(200);

      const history = historyResponse.json<{
        transactions: Array<{
          block_height: number;
          received_base_units: string;
          spent_base_units: string;
          net_base_units: string;
        }>;
      }>();

      expect(history.transactions).toHaveLength(2);

      expect(history.transactions[0]).toMatchObject({
        block_height: 103,
        received_base_units: "0",
        spent_base_units: "2368228",
        net_base_units: "-2368228",
      });

      expect(history.transactions[1]).toMatchObject({
        block_height: 102,
        received_base_units: "2368228",
        spent_base_units: "0",
        net_base_units: "2368228",
      });

      const utxoResponse = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${ZERO_BALANCE_ADDRESS}/utxos`,
      });

      expect(utxoResponse.statusCode).toBe(200);

      const utxos = utxoResponse.json<{
        utxos: unknown[];
        pagination: {
          nextOffset: number | null;
        };
      }>();

      expect(utxos.utxos).toEqual([]);
      expect(utxos.pagination.nextOffset).toBeNull();
    } finally {
      await app.close();
    }
  });

  it("validates addresses, pagination, and unknown addresses", async () => {
    const app = buildApi();

    try {
      const malformed = await app.inject({
        method: "GET",
        url: "/api/v1/addresses/bad",
      });

      expect(malformed.statusCode).toBe(400);

      const missing = await app.inject({
        method: "GET",
        url: "/api/v1/addresses/mcrt1zdoesnotexist",
      });

      expect(missing.statusCode).toBe(404);

      const badLimit = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${MINING_ADDRESS}/utxos?limit=101`,
      });

      expect(badLimit.statusCode).toBe(400);

      const badOffset = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${MINING_ADDRESS}/transactions?offset=-1`,
      });

      expect(badOffset.statusCode).toBe(400);

      const excessiveOffset = await app.inject({
        method: "GET",
        url: `/api/v1/addresses/${MINING_ADDRESS}/transactions?offset=100001`,
      });

      expect(excessiveOffset.statusCode).toBe(400);

      expect(excessiveOffset.json()).toMatchObject({
        error: "invalid_request",
      });
    } finally {
      await app.close();
    }
  });
});
