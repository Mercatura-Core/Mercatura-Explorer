import { describe, expect, it } from "vitest";

import {
  formatNetworkEndpoint,
  formatNetworkName,
  formatPeerSoftware,
} from "../apps/web/lib/network-presentation.js";

describe("Mercatura network presentation helpers", () => {
  it("formats supported network names", () => {
    expect(formatNetworkName("ipv4")).toBe("IPv4");
    expect(formatNetworkName("ipv6")).toBe("IPv6");
    expect(formatNetworkName("onion")).toBe("Tor / Onion");
    expect(formatNetworkName("i2p")).toBe("I2P");
    expect(formatNetworkName("cjdns")).toBe("CJDNS");
  });

  it("formats IPv4 and IPv6 endpoints correctly", () => {
    expect(formatNetworkEndpoint("8.8.8.8", 27777)).toBe("8.8.8.8:27777");

    expect(formatNetworkEndpoint("2001:4860:4860::8888", 27777)).toBe(
      "[2001:4860:4860::8888]:27777"
    );

    expect(formatNetworkEndpoint("example.onion", null)).toBe("example.onion");
  });

  it("normalizes Core subversion labels for display", () => {
    expect(formatPeerSoftware("/MercaturaCore:0.1.0/")).toBe("MercaturaCore:0.1.0");
    expect(formatPeerSoftware("")).toBe("Unknown");
  });
});
