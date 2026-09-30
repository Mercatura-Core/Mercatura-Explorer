import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Reader } from "@maxmind/geoip2-node";

export interface NetworkLocation {
  latitude: number;
  longitude: number;
  countryCode: string | null;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
}

export interface NetworkGeolocator {
  configured: boolean;
  provider: string | null;
  lookup(address: string): NetworkLocation | null;
}

export const DISABLED_NETWORK_GEOLOCATOR: NetworkGeolocator = {
  configured: false,
  provider: null,
  lookup() {
    return null;
  },
};

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createNetworkGeolocatorFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): NetworkGeolocator {
  const configuredPath = environment.MERCATURA_GEOIP_CITY_DB?.trim();

  if (configuredPath === undefined || configuredPath.length === 0) {
    return DISABLED_NETWORK_GEOLOCATOR;
  }

  const databasePath = resolve(configuredPath);

  let reader: ReturnType<typeof Reader.openBuffer>;

  try {
    reader = Reader.openBuffer(readFileSync(databasePath));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GeoIP database error";

    throw new Error(`Unable to load MERCATURA_GEOIP_CITY_DB at ${databasePath}: ${message}`);
  }

  return {
    configured: true,
    provider: "MaxMind City MMDB",

    lookup(address: string): NetworkLocation | null {
      try {
        const response = reader.city(address);
        const latitude = response.location?.latitude;
        const longitude = response.location?.longitude;

        if (
          latitude === undefined ||
          longitude === undefined ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        return {
          latitude: roundCoordinate(latitude),
          longitude: roundCoordinate(longitude),
          countryCode: response.country?.isoCode ?? null,
          countryName: response.country?.names.en ?? null,
          regionName: response.subdivisions?.[0]?.names.en ?? null,
          cityName: response.city?.names.en ?? null,
        };
      } catch {
        return null;
      }
    },
  };
}
