import { describe, expect, it } from "vitest";

import { buildApi } from "./app.js";
import type { CoreStatusRpc } from "./routes/core-status.js";

describe("Mercatura Core status API", () => {
  it("serves injected Core status without exposing private RPC details", async () => {
    const rpc = {
      async getBlockchainInfo() {
        return {
          chain: "regtest",
          blocks: 103,
          headers: 103,
          bestblockhash: "a".repeat(64),
          bits: "207fffff",
          target: "7fffff",
          difficulty: 1,
          time: 1_700_000_000,
          mediantime: 1_699_999_900,
          verificationprogress: 1,
          initialblockdownload: false,
          chainwork: "01",
          size_on_disk: 123456,
          pruned: false,
          warnings: [],
        };
      },

      async getNetworkInfo() {
        return {
          version: 310100,
          subversion: "/MercaturaCore:0.1.0/",
          protocolversion: 70017,
          localservices: "0000000000000000",
          localservicesnames: [],
          localrelay: true,
          timeoffset: 0,
          networkactive: true,
          connections: 3,
          connections_in: 1,
          connections_out: 2,
          networks: [],
          relayfee: 0.01,
          incrementalfee: 0.01,
          localaddresses: [
            {
              address: "127.0.0.1",
              port: 27780,
              score: 1,
            },
          ],
          warnings: [],
        };
      },

      async getMiningInfo() {
        return {
          blocks: 103,
          currentblockweight: 4000,
          currentblocktx: 1,
          bits: "207fffff",
          difficulty: 1,
          target: "7fffff",
          networkhashps: 40,
          pooledtx: 0,
          blockmintxfee: 0.01,
          chain: "regtest",
          next: {
            height: 104,
            bits: "207fffff",
            difficulty: 1,
            target: "7fffff",
          },
          warnings: [],
        };
      },

      async getMempoolInfo() {
        return {
          loaded: true,
          size: 0,
          bytes: 0,
          usage: 0,
          total_fee: 0,
          maxmempool: 300000000,
          mempoolminfee: 0.01,
          minrelaytxfee: 0.01,
          incrementalrelayfee: 0.01,
          unbroadcastcount: 0,
          fullrbf: true,
          permitbaremultisig: false,
          maxdatacarriersize: 83,
          limitclustercount: 64,
          limitclustersize: 101,
          optimal: true,
        };
      },
    } satisfies CoreStatusRpc;

    const app = buildApi({
      rpc,
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/core/status",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();

      expect(body).toMatchObject({
        blockchain: {
          chain: "regtest",
          blocks: 103,
          bestBlockHash: "a".repeat(64),
          pruned: false,
        },
        network: {
          version: 310100,
          subversion: "/MercaturaCore:0.1.0/",
          protocolVersion: 70017,
          connections: 3,
        },
        mining: {
          blocks: 103,
          networkHashPerSecond: 40,
          next: {
            height: 104,
            bits: "207fffff",
          },
        },
        mempool: {
          loaded: true,
          size: 0,
          minRelayTxFee: 0.01,
        },
      });

      expect(body.network).not.toHaveProperty("localaddresses");
      expect(body.network).not.toHaveProperty("networks");
      expect(body).not.toHaveProperty("credentials");
    } finally {
      await app.close();
    }
  });
});

describe("Mercatura Core status API errors", () => {
  it("does not expose internal upstream error details", async () => {
    const fail = async (): Promise<never> => {
      throw new Error("sensitive upstream RPC detail");
    };

    const rpc = {
      getBlockchainInfo: fail,
      getNetworkInfo: fail,
      getMiningInfo: fail,
      getMempoolInfo: fail,
    } satisfies CoreStatusRpc;

    const app = buildApi({
      rpc,
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/core/status",
      });

      expect(response.statusCode).toBe(500);

      expect(response.json()).toEqual({
        error: "internal_error",
        message: "An internal server error occurred",
      });

      expect(response.body).not.toContain("sensitive upstream RPC detail");
    } finally {
      await app.close();
    }
  });
});
