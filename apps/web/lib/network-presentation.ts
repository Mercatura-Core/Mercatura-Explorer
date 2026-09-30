export function formatNetworkName(network: string): string {
  switch (network.toLowerCase()) {
    case "ipv4":
      return "IPv4";
    case "ipv6":
      return "IPv6";
    case "onion":
      return "Tor / Onion";
    case "i2p":
      return "I2P";
    case "cjdns":
      return "CJDNS";
    default:
      return network.length === 0 ? "Unknown" : network;
  }
}

export function formatNetworkEndpoint(address: string, port: number | null): string {
  if (port === null) {
    return address;
  }

  if (address.includes(":") && !address.startsWith("[")) {
    return `[${address}]:${port}`;
  }

  return `${address}:${port}`;
}

export function formatPeerSoftware(subversion: string): string {
  const trimmed = subversion.replace(/^\/+|\/+$/g, "").trim();

  return trimmed.length === 0 ? "Unknown" : trimmed;
}
