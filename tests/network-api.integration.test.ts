import { describe, expect, it } from "vitest";

import { buildApi } from "../apps/api/src/app.js";
import { createRpcClient } from "../packages/mercatura-rpc/src/index.js";

const integrationEnabled = process.env.MERCATURA_API_INTEGRATION === "1";

describe.runIf(integrationEnabled)("Mercatura Network API integration", () => {
  it("reconciles live peer and addrman state with Core", async () => {
    const app = buildApi();
    const rpc = createRpcClient();

    try {
      const [peers, addresses, addrman] = await Promise.all([
        rpc.getPeerInfo(),
        rpc.getNodeAddresses(0),
        rpc.getAddrManInfo(),
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/network",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        node: {
          networkActive: boolean;
          version: number;
          subversion: string;
          protocolVersion: number;
          connections: number;
          connectionsIn: number;
          connectionsOut: number;
        };
        peers: {
          reportedCount: number;
          publicCount: number;
          items: unknown[];
        };
        discovered: {
          reportedCount: number;
          publicCount: number;
          items: unknown[];
        };
        addrman: Record<
          string,
          {
            new: number;
            tried: number;
            total: number;
          }
        >;
        geolocation: {
          providerConfigured: boolean;
          eligibleAddressCount: number;
        };
      }>();

      expect(body.peers.reportedCount).toBe(peers.length);

      expect(body.discovered.reportedCount).toBe(addresses.length);

      expect(body.peers.publicCount).toBeLessThanOrEqual(body.peers.reportedCount);

      expect(body.discovered.publicCount).toBeLessThanOrEqual(body.discovered.reportedCount);

      expect(body.addrman).toEqual(addrman);

      expect(body.node.subversion).toContain("MercaturaCore");

      expect(body.node.protocolVersion).toBeGreaterThan(0);

      expect(body.geolocation.providerConfigured).toBe(false);

      expect(body.geolocation.eligibleAddressCount).toBeGreaterThanOrEqual(0);
    } finally {
      await app.close();
    }
  });
});
