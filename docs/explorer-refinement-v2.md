# Explorer refinement v2: deployment and local review

This change separates the world-map background from geolocation records. The vector world
map is bundled with the frontend; **node markers require real GeoIP data**. The API server
must have a licensed MaxMind GeoLite2 City MMDB configured via
`MERCATURA_GEOIP_CITY_DB=/absolute/path/to/GeoLite2-City.mmdb` and be restarted with that
environment variable. The browser and frontend proxy cannot derive a node's position from
an IP address without the server-side GeoIP provider. Verify via the read-only API:

```
GET /api/v1/network
```

Check `geolocation.providerConfigured`, `geolocation.locatedAddressCount`, and
`geolocation.points`. A world outline without markers is expected when the provider is
unconfigured or no observed public endpoint resolves to a usable location. Positions
are approximate and cannot identify node operators.

Mining/Emission now use the same nine tip-relative windows:
`4h`, `1d`, `3d`, `7d`, `30d`, `90d`, `180d`, `365d`, and `all`.
The corresponding endpoint is:

```
GET /api/v1/mining?window=90d
```

The frontend also supports the deployed explorer's read-only API proxy, but the **remote
backend must be updated to handle the new windows** before the long-window charts will
populate. The UI explicitly reports an unsupported remote API instead of silently
pretending a short sample covers months or a year. API results are tip-relative and
long histories are sampled to at most 120 plotted points; summary aggregates and mining
attribution count the entire selected observation, not just plotted samples.

The explorer home page polls read-only `core/status` through its same-origin
`/api/live-core?network=testnet` route every 30 seconds for the latest Core-reported
hashrate estimate and current difficulty. Neither value is an instantaneous measurement
of global work; network hashrate is inferred from observed work over an interval.

Witness v2/v3 counts are based on indexed output script types; spending-input and UTXO
breakdowns are available when the updated API returns `witnessBreakdown`. An unknown v3
program is not assumed to use a known PQ authorization scheme.
