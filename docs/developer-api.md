# Mercatura Explorer read-only developer API

The explorer frontend exposes a **GET-only** proxy on the same origin as the explorer:

```
/api/explorer/mainnet/{endpoint}
/api/explorer/testnet/{endpoint}
```

For example, after deploying the explorer to `https://EXPLORER_HOST`:

```
GET https://EXPLORER_HOST/api/explorer/mainnet/blocks
GET https://EXPLORER_HOST/api/explorer/mainnet/mining?window=30d
GET https://EXPLORER_HOST/api/explorer/mainnet/network
GET https://EXPLORER_HOST/api/explorer/mainnet/emission?limit=100
GET https://EXPLORER_HOST/api/explorer/mainnet/statistics
GET https://EXPLORER_HOST/api/explorer/mainnet/core/status
```

These examples describe **routes in the source**, not independently verified public uptime or availability.
See `apps/api/src/routes/` for the concrete endpoint set and query parameters. Use the
appropriate network (`mainnet` or `testnet`). All routes are read-only and the proxy does
not expose arbitrary Core RPC commands. There is no write API.

Before publishing the API as a supported service, configure the frontend's
`MERCATURA_EXPLORER_MAINNET_API_URL` / `MERCATURA_EXPLORER_TESTNET_API_URL`, confirm
which public routes are intended, add reverse-proxy rate limiting and request monitoring,
and verify that the public network endpoint's geolocation and IP-address disclosure fit
your privacy policy. Availability and service-level guarantees have not been established.

Node mapping additionally needs a licensed GeoIP City MMDB database configured via
`MERCATURA_GEOIP_CITY_DB` on the backend. The geography image itself is bundled with
the frontend, but node locations cannot be inferred when that provider is missing.
