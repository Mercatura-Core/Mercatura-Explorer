# Local Explorer: real testnet data readiness

The map, Mining/Emission graphs, and witness details depend on **the API instance the
frontend is actually connected to**, not just the frontend source code. Do not treat a
successful TypeScript check as proof those data sources work.

## Quick read-only check

Run from the repository root (requires Node.js 20+):

```sh
node scripts/check-explorer-data.mjs http://127.0.0.1:8787/api/v1/
```

`8787` is the temporary proxy that forwards to the public testnet API. Alternatively,
use `http://127.0.0.1:3001/api/v1/` after starting the **updated local API**. The
script performs only GET requests. It prints whether the API accepts `1d` and `30d`,
provides witness breakdown fields, and has a geolocation provider configured.

## Missing node markers

The world outline is bundled in the frontend. Real node marker positions require a
server-side MaxMind **GeoLite2 City** MMDB (or an appropriately licensed compatible
City MMDB), obtained by the operator in accordance with its license. Configure a local
file readable by the API process, for example:

```sh
MERCATURA_GEOIP_CITY_DB=/absolute/path/to/GeoLite2-City.mmdb npm run dev -w @mercatura/api
```

The environment variable belongs on the **API server**, not the frontend or the
browser. A remote API reporting `geolocation.providerConfigured: false` has no
positions, regardless of the local frontend. Do not invent node locations or send
peer IPs to a third-party geolocation service without a separate privacy decision.
IPv4/IPv6 public addresses are geolocatable; Tor/I2P endpoints generally are not.

## Missing historical charts and witness fields

The deployed testnet API may still accept only `mining?window=144`, `1000`, or `4032`.
The updated frontend needs API support for `4h`, `1d`, `3d`, `7d`, `30d`, `90d`, `180d`,
`365d`, and `all`. The Emission subsidy trend uses that same Mining history API.
The detailed Witness v2/v3 spent-input and UTXO breakdown requires the API to return
`statistics.witnessBreakdown`. Until then, the frontend shows only verifiable output
counts and output values; absent data is **not** equivalent to zero.

Run the updated API from this source against a **populated, matching-network** Postgres
index and compatible Mercatura Core RPC. The local database previously observed with
117 block records is not a replacement for the public testnet's >26,000 indexed blocks.
Do not run database migrations, chain rewind, indexer sync, or a dump restore without
first verifying chain genesis and preserving the existing database. A safe initial
read-only inventory is:

```sql
SELECT MIN(height), MAX(height), COUNT(*) FROM blocks WHERE active;
SELECT hash FROM blocks WHERE active AND height = 0;
SELECT COUNT(*) FROM block_stats;
SELECT tip_height, tip_hash FROM chain_state WHERE id = 1;
```

Once matching genesis/chain state and RPC connectivity have been verified, an operator
can plan a **separate development database** or approved indexer catch-up. Avoid
pointing an experimental indexer at the public production database.

The default local API address is `http://127.0.0.1:3001`. To connect the local web UI
*after the API is running and the database is qualified*:

```sh
MERCATURA_EXPLORER_TESTNET_API_URL=http://127.0.0.1:3001 npm run dev -w @mercatura/web
```

## Connected-peer pagination

Both Connected Peers and Discovered Nodes are paginated at **20 rows per page**. Page
navigation remains visible on a one-page list (with disabled Previous/Next) to make
this explicit. Having only seven public connected peers produces just one page; the
explorer must not pad the list with invented peers.
