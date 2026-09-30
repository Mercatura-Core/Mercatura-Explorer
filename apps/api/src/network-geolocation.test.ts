import { describe, expect, it } from "vitest";

import {
  createNetworkGeolocatorFromEnvironment,
  DISABLED_NETWORK_GEOLOCATOR,
} from "./network-geolocation.js";

describe("Mercatura network geolocation", () => {
  it("is disabled when no MMDB path is configured", () => {
    const geolocator = createNetworkGeolocatorFromEnvironment({});

    expect(geolocator).toBe(DISABLED_NETWORK_GEOLOCATOR);
    expect(geolocator.configured).toBe(false);
    expect(geolocator.provider).toBeNull();
    expect(geolocator.lookup("8.8.8.8")).toBeNull();
  });

  it("fails clearly when a configured database cannot be loaded", () => {
    expect(() =>
      createNetworkGeolocatorFromEnvironment({
        MERCATURA_GEOIP_CITY_DB: "/definitely/not/a/real/mercatura/GeoLite2-City.mmdb",
      })
    ).toThrow(/Unable to load MERCATURA_GEOIP_CITY_DB/);
  });
});
