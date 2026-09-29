import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

const FIRST_PQ_TXID = "1318a60b3b340a91495093325f788c8c88b36ba99ae7af320bcdc732f57a0e3a";

const SECOND_PQ_TXID = "54968d4b8dc8441a9187d23ed887b6ab01b1ba2759d491359051b7fedde70138";

describe.runIf(integrationEnabled)("Mercatura transaction API integration", () => {
  it("serves PQ transaction detail with resolved prevouts and spends", async () => {
    const app = buildApi();

    try {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/transactions/${FIRST_PQ_TXID}`,
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        transaction: {
          txid: string;
          blockHeight: number;
          feeBaseUnits: string | null;
          size: number;
          vsize: number;
          weight: number;
        };
        inputs: Array<{
          vin: number;
          prev_txid: string | null;
          prev_vout: number | null;
          witness: string[] | null;
          resolved_prev_txid: string | null;
          prev_value_base_units: string | null;
          prev_address: string | null;
          prev_script_type: string | null;
        }>;
        outputs: Array<{
          vout: number;
          value_base_units: string;
          address: string | null;
          script_type: string;
          spentBy: {
            txid: string;
            vin: number;
          } | null;
        }>;
      }>();

      expect(body.transaction.txid).toBe(FIRST_PQ_TXID);
      expect(body.transaction.blockHeight).toBe(102);
      expect(body.transaction.feeBaseUnits).toBe("6");

      expect(body.inputs).toHaveLength(1);

      const input = body.inputs[0]!;

      expect(input.vin).toBe(0);
      expect(input.resolved_prev_txid).toBe(input.prev_txid);
      expect(input.prev_vout).toBe(0);
      expect(input.prev_value_base_units).toBe("2378234");
      expect(input.prev_script_type).toBe("witness_v2_mercatura_pq");
      expect(input.prev_address).not.toBeNull();

      expect(input.witness).not.toBeNull();
      expect(input.witness).toHaveLength(2);

      const witness = input.witness!;

      expect(witness[0]!.length / 2).toBe(3309);
      expect(witness[1]!.length / 2).toBe(1952);

      expect(body.outputs).toHaveLength(2);

      expect(body.outputs[0]?.script_type).toBe("witness_v2_mercatura_pq");
      expect(body.outputs[0]?.spentBy).toBeNull();

      expect(body.outputs[1]?.value_base_units).toBe("2368228");
      expect(body.outputs[1]?.spentBy).toEqual({
        txid: SECOND_PQ_TXID,
        vin: 0,
      });
    } finally {
      await app.close();
    }
  });

  it("serves the later PQ spend and current unspent outputs", async () => {
    const app = buildApi();

    try {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/transactions/${SECOND_PQ_TXID}`,
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        transaction: {
          txid: string;
          blockHeight: number;
          feeBaseUnits: string | null;
        };
        inputs: Array<{
          prev_txid: string | null;
          prev_vout: number | null;
          resolved_prev_txid: string | null;
          prev_value_base_units: string | null;
          witness: string[] | null;
        }>;
        outputs: Array<{
          spentBy: {
            txid: string;
            vin: number;
          } | null;
        }>;
      }>();

      expect(body.transaction.txid).toBe(SECOND_PQ_TXID);
      expect(body.transaction.blockHeight).toBe(103);
      expect(body.transaction.feeBaseUnits).toBe("6");

      expect(body.inputs).toHaveLength(1);
      expect(body.inputs[0]?.prev_txid).toBe(FIRST_PQ_TXID);
      expect(body.inputs[0]?.resolved_prev_txid).toBe(FIRST_PQ_TXID);
      expect(body.inputs[0]?.prev_vout).toBe(1);
      expect(body.inputs[0]?.prev_value_base_units).toBe("2368228");

      expect(body.inputs[0]?.witness).toHaveLength(2);

      for (const output of body.outputs) {
        expect(output.spentBy).toBeNull();
      }
    } finally {
      await app.close();
    }
  });

  it("rejects malformed transaction IDs and reports missing transactions", async () => {
    const app = buildApi();

    try {
      const malformed = await app.inject({
        method: "GET",
        url: "/api/v1/transactions/not-a-txid",
      });

      expect(malformed.statusCode).toBe(400);
      expect(malformed.json()).toMatchObject({
        error: "invalid_request",
      });

      const missing = await app.inject({
        method: "GET",
        url: `/api/v1/transactions/${"0".repeat(64)}`,
      });

      expect(missing.statusCode).toBe(404);
      expect(missing.json()).toMatchObject({
        error: "not_found",
      });
    } finally {
      await app.close();
    }
  });
});
