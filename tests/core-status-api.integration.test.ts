import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura Core status API integration", () => {
  it("serves live Mercatura Core status", async () => {
    const app = buildApi();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/core/status",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        blockchain: {
          chain: string;
          blocks: number;
          headers: number;
          bestBlockHash: string;
          difficulty: number;
          pruned: boolean;
        };
        network: {
          version: number;
          subversion: string;
          protocolVersion: number;
          networkActive: boolean;
          connections: number;
          relayFee: number;
          incrementalFee: number;
        };
        mining: {
          blocks: number;
          bits: string;
          difficulty: number;
          networkHashPerSecond: number;
          chain: string;
          next: {
            height: number;
            bits: string;
            difficulty: number;
            target: string;
          };
        };
        mempool: {
          loaded: boolean;
          size: number;
          bytes: number;
          minRelayTxFee: number;
          incrementalRelayFee: number;
        };
      }>();

      expect(body.blockchain.chain).toBe("regtest");
      expect(body.blockchain.blocks).toBeGreaterThanOrEqual(0);
      expect(body.blockchain.headers).toBeGreaterThanOrEqual(body.blockchain.blocks);
      expect(body.blockchain.bestBlockHash).toMatch(/^[0-9a-f]{64}$/);

      expect(body.network.subversion).toContain("MercaturaCore");
      expect(body.network.protocolVersion).toBeGreaterThan(0);
      expect(body.network.networkActive).toBe(true);

      expect(body.mining.chain).toBe("regtest");
      expect(body.mining.blocks).toBe(body.blockchain.blocks);
      expect(body.mining.next.height).toBe(body.blockchain.blocks + 1);
      expect(body.mining.bits).toMatch(/^[0-9a-f]{8}$/);
      expect(body.mining.next.bits).toMatch(/^[0-9a-f]{8}$/);
      expect(body.mining.next.target.length).toBeGreaterThan(0);

      expect(body.mempool.loaded).toBe(true);
      expect(body.mempool.size).toBeGreaterThanOrEqual(0);
      expect(body.mempool.bytes).toBeGreaterThanOrEqual(0);
    } finally {
      await app.close();
    }
  });
});
