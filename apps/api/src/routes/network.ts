import { isIP } from "node:net";

import type { FastifyInstance } from "fastify";

import type { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

import type { NetworkGeolocator, NetworkLocation } from "../network-geolocation.js";

export type NetworkRpc = Pick<
  MercaturaRpcClient,
  "getNetworkInfo" | "getPeerInfo" | "getNodeAddresses" | "getAddrManInfo"
>;

interface NetworkMapPoint extends NetworkLocation {
  address: string;
  port: number | null;
  network: string;
  connected: boolean;
  discovered: boolean;
}

function splitPeerAddress(value: string): {
  address: string;
  port: number | null;
} {
  if (value.startsWith("[")) {
    const closing = value.indexOf("]");

    if (closing !== -1) {
      const address = value.slice(1, closing);
      const suffix = value.slice(closing + 1);

      const port =
        suffix.startsWith(":") && Number.isSafeInteger(Number(suffix.slice(1)))
          ? Number(suffix.slice(1))
          : null;

      return {
        address,
        port,
      };
    }
  }

  const firstColon = value.indexOf(":");
  const lastColon = value.lastIndexOf(":");

  if (firstColon !== -1 && firstColon === lastColon) {
    const address = value.slice(0, lastColon);
    const parsedPort = Number(value.slice(lastColon + 1));

    return {
      address,
      port:
        Number.isSafeInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535
          ? parsedPort
          : null,
    };
  }

  return {
    address: value,
    port: null,
  };
}

function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts as [number, number, number, number];

  if (a === 0 || a === 10 || a === 127) {
    return false;
  }

  if (a === 100 && b >= 64 && b <= 127) {
    return false;
  }

  if (a === 169 && b === 254) {
    return false;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return false;
  }

  if (a === 192 && b === 168) {
    return false;
  }

  if (a === 198 && (b === 18 || b === 19)) {
    return false;
  }

  if (a >= 224) {
    return false;
  }

  return true;
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return false;
  }

  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  ) {
    return false;
  }

  if (normalized.startsWith("2001:db8:")) {
    return false;
  }

  return true;
}

function isPublicNetworkAddress(network: string, address: string): boolean {
  if (network === "ipv4") {
    return isIP(address) === 4 && isPublicIpv4(address);
  }

  if (network === "ipv6") {
    return isIP(address) === 6 && isPublicIpv6(address);
  }

  if (network === "onion" || network === "i2p" || network === "cjdns") {
    return address.length > 0;
  }

  return false;
}

function geolocationEligible(network: string, address: string): boolean {
  return (network === "ipv4" && isIP(address) === 4) || (network === "ipv6" && isIP(address) === 6);
}

export function registerNetworkRoutes(
  app: FastifyInstance,
  getRpc: () => NetworkRpc,
  geolocator: NetworkGeolocator
): void {
  app.get("/api/v1/network", async () => {
    const rpc = getRpc();

    const [network, peers, discovered, addrman] = await Promise.all([
      rpc.getNetworkInfo(),
      rpc.getPeerInfo(),
      rpc.getNodeAddresses(0),
      rpc.getAddrManInfo(),
    ]);

    const publicPeers = peers.flatMap((peer) => {
      const parsed = splitPeerAddress(peer.addr);

      if (!isPublicNetworkAddress(peer.network, parsed.address)) {
        return [];
      }

      return [
        {
          address: parsed.address,
          port: parsed.port,
          network: peer.network,
          services: peer.servicesnames,
          version: peer.version,
          subversion: peer.subver,
          inbound: peer.inbound,
          connectionType: peer.connection_type,
          transportProtocol: peer.transport_protocol_type,
          connectedSince: peer.conntime,
          lastSend: peer.lastsend,
          lastReceive: peer.lastrecv,
          lastTransaction: peer.last_transaction,
          lastBlock: peer.last_block,
          bytesSent: peer.bytessent,
          bytesReceived: peer.bytesrecv,
          pingSeconds: peer.pingtime ?? null,
          minimumPingSeconds: peer.minping ?? null,
          syncedHeaders: peer.synced_headers,
          syncedBlocks: peer.synced_blocks,
          mappedAs: peer.mapped_as ?? null,
          geolocationEligible: geolocationEligible(peer.network, parsed.address),
          location: geolocationEligible(peer.network, parsed.address)
            ? geolocator.lookup(parsed.address)
            : null,
        },
      ];
    });

    const publicDiscovered = discovered.flatMap((node) => {
      if (!isPublicNetworkAddress(node.network, node.address)) {
        return [];
      }

      return [
        {
          address: node.address,
          port: node.port,
          network: node.network,
          lastSeen: node.time,
          services: node.services,
          geolocationEligible: geolocationEligible(node.network, node.address),
          location: geolocationEligible(node.network, node.address)
            ? geolocator.lookup(node.address)
            : null,
        },
      ];
    });

    const versionCounts = new Map<string, number>();

    for (const peer of publicPeers) {
      const key = peer.subversion.length === 0 ? "unknown" : peer.subversion;

      versionCounts.set(key, (versionCounts.get(key) ?? 0) + 1);
    }

    const networkCounts = new Map<string, number>();

    for (const node of publicDiscovered) {
      networkCounts.set(node.network, (networkCounts.get(node.network) ?? 0) + 1);
    }

    const mapPointsByEndpoint = new Map<string, NetworkMapPoint>();

    for (const peer of publicPeers) {
      if (peer.location === null) {
        continue;
      }

      const key = `${peer.network}:${peer.address}:${peer.port ?? ""}`;

      mapPointsByEndpoint.set(key, {
        address: peer.address,
        port: peer.port,
        network: peer.network,
        connected: true,
        discovered: false,
        ...peer.location,
      });
    }

    for (const node of publicDiscovered) {
      if (node.location === null) {
        continue;
      }

      const key = `${node.network}:${node.address}:${node.port}`;
      const existing = mapPointsByEndpoint.get(key);

      if (existing !== undefined) {
        mapPointsByEndpoint.set(key, {
          ...existing,
          discovered: true,
        });

        continue;
      }

      mapPointsByEndpoint.set(key, {
        address: node.address,
        port: node.port,
        network: node.network,
        connected: false,
        discovered: true,
        ...node.location,
      });
    }

    const mapPoints = [...mapPointsByEndpoint.values()];

    const countryCounts = new Map<
      string,
      {
        countryCode: string | null;
        countryName: string;
        count: number;
      }
    >();

    for (const point of mapPoints) {
      const countryName = point.countryName ?? "Unknown";
      const key = point.countryCode ?? `unknown:${countryName}`;
      const existing = countryCounts.get(key);

      countryCounts.set(key, {
        countryCode: point.countryCode,
        countryName,
        count: (existing?.count ?? 0) + 1,
      });
    }

    const countries = [...countryCounts.values()].sort(
      (left, right) => right.count - left.count || left.countryName.localeCompare(right.countryName)
    );

    return {
      node: {
        networkActive: network.networkactive,
        version: network.version,
        subversion: network.subversion,
        protocolVersion: network.protocolversion,
        connections: network.connections,
        connectionsIn: network.connections_in,
        connectionsOut: network.connections_out,
      },

      peers: {
        reportedCount: peers.length,
        publicCount: publicPeers.length,
        items: publicPeers,
      },

      discovered: {
        reportedCount: discovered.length,
        publicCount: publicDiscovered.length,
        items: publicDiscovered,
      },

      addrman,

      distributions: {
        peerVersions: [...versionCounts.entries()]
          .map(([subversion, count]) => ({
            subversion,
            count,
          }))
          .sort((left, right) => right.count - left.count),

        discoveredNetworks: [...networkCounts.entries()]
          .map(([networkName, count]) => ({
            network: networkName,
            count,
          }))
          .sort((left, right) => right.count - left.count),
      },

      geolocation: {
        providerConfigured: geolocator.configured,
        provider: geolocator.provider,
        eligibleAddressCount:
          publicPeers.filter((peer) => peer.geolocationEligible).length +
          publicDiscovered.filter((node) => node.geolocationEligible).length,
        locatedAddressCount: mapPoints.length,
        countries,
        points: mapPoints,
      },
    };
  });
}
