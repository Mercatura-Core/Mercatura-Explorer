import { describe, expect, it } from "vitest";

import { buildApi } from "./app.js";
import type { NetworkRpc } from "./routes/network.js";

describe("Mercatura Network API", () => {
  it("filters private network addresses from the public response", async () => {
    const networkRpc = {
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
          localaddresses: [],
          warnings: [],
        };
      },

      async getPeerInfo() {
        return [
          {
            id: 1,
            addr: "8.8.8.8:27780",
            network: "ipv4",
            services: "0000000000000001",
            servicesnames: ["NETWORK"],
            relaytxes: true,
            lastsend: 100,
            lastrecv: 101,
            last_transaction: 90,
            last_block: 95,
            bytessent: 1000,
            bytesrecv: 2000,
            conntime: 50,
            timeoffset: 0,
            pingtime: 0.02,
            minping: 0.01,
            version: 70017,
            subver: "/MercaturaCore:0.1.0/",
            inbound: false,
            presynced_headers: -1,
            synced_headers: 104,
            synced_blocks: 104,
            addr_relay_enabled: true,
            addr_processed: 5,
            addr_rate_limited: 0,
            permissions: [],
            minfeefilter: 0.01,
            connection_type: "outbound-full-relay",
            transport_protocol_type: "v2",
            session_id: "public-session",
          },
          {
            id: 2,
            addr: "127.0.0.1:27780",
            network: "ipv4",
            services: "0000000000000001",
            servicesnames: ["NETWORK"],
            relaytxes: true,
            lastsend: 100,
            lastrecv: 101,
            last_transaction: 90,
            last_block: 95,
            bytessent: 100,
            bytesrecv: 200,
            conntime: 50,
            timeoffset: 0,
            version: 70017,
            subver: "/MercaturaCore:0.1.0/",
            inbound: true,
            presynced_headers: -1,
            synced_headers: 104,
            synced_blocks: 104,
            addr_relay_enabled: true,
            addr_processed: 0,
            addr_rate_limited: 0,
            permissions: [],
            minfeefilter: 0.01,
            connection_type: "inbound",
            transport_protocol_type: "v1",
            session_id: "",
          },
          {
            id: 3,
            addr: "10.0.0.5:27780",
            network: "ipv4",
            services: "0000000000000001",
            servicesnames: ["NETWORK"],
            relaytxes: true,
            lastsend: 100,
            lastrecv: 101,
            last_transaction: 90,
            last_block: 95,
            bytessent: 100,
            bytesrecv: 200,
            conntime: 50,
            timeoffset: 0,
            version: 70017,
            subver: "/MercaturaCore:0.1.0/",
            inbound: false,
            presynced_headers: -1,
            synced_headers: 104,
            synced_blocks: 104,
            addr_relay_enabled: true,
            addr_processed: 0,
            addr_rate_limited: 0,
            permissions: [],
            minfeefilter: 0.01,
            connection_type: "manual",
            transport_protocol_type: "v1",
            session_id: "",
          },
        ];
      },

      async getNodeAddresses() {
        return [
          {
            time: 100,
            services: 1,
            address: "1.1.1.1",
            port: 27780,
            network: "ipv4",
          },
          {
            time: 90,
            services: 1,
            address: "192.168.1.25",
            port: 27780,
            network: "ipv4",
          },
        ];
      },

      async getAddrManInfo() {
        return {
          ipv4: {
            new: 1,
            tried: 1,
            total: 2,
          },
          all_networks: {
            new: 1,
            tried: 1,
            total: 2,
          },
        };
      },
    } satisfies NetworkRpc;

    const app = buildApi({
      networkRpc,
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/network",
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        peers: {
          reportedCount: number;
          publicCount: number;
          items: Array<{
            address: string;
            port: number | null;
            geolocationEligible: boolean;
            location: null;
          }>;
        };
        discovered: {
          reportedCount: number;
          publicCount: number;
          items: Array<{
            address: string;
            port: number;
            geolocationEligible: boolean;
            location: null;
          }>;
        };
        geolocation: {
          providerConfigured: boolean;
          eligibleAddressCount: number;
        };
      }>();

      expect(body.peers.reportedCount).toBe(3);
      expect(body.peers.publicCount).toBe(1);
      expect(body.peers.items).toHaveLength(1);

      expect(body.peers.items[0]).toMatchObject({
        address: "8.8.8.8",
        port: 27780,
        geolocationEligible: true,
        location: null,
      });

      expect(body.discovered.reportedCount).toBe(2);
      expect(body.discovered.publicCount).toBe(1);

      expect(body.discovered.items[0]).toMatchObject({
        address: "1.1.1.1",
        port: 27780,
        geolocationEligible: true,
        location: null,
      });

      expect(body.geolocation).toEqual({
        providerConfigured: false,
        eligibleAddressCount: 2,
      });

      expect(response.body).not.toContain("127.0.0.1");
      expect(response.body).not.toContain("10.0.0.5");
      expect(response.body).not.toContain("192.168.1.25");
    } finally {
      await app.close();
    }
  });
});
