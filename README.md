# Mercatura Explorer

Mercatura-native blockchain explorer for the Mercatura (MCA) network.

The public Explorer is live at:

https://explorer.mercaturacore.com

Public testnet:

https://explorer.mercaturacore.com/?network=testnet

The Explorer combines authoritative Mercatura Core RPC data, indexed blockchain data, and Mercatura-specific analytics in a custom web interface.

## Public Testnet

Mercatura's public testnet is live.

- Website: https://mercaturacore.com
- Explorer: https://explorer.mercaturacore.com/?network=testnet
- Bootstrap peer: `node1.mercaturacore.com:27778`
- Mercatura Core release: https://github.com/Mercatura-Core/Mercatura-Core/releases/tag/v0.1.1-testnet
- MercaMiner release: https://github.com/Mercatura-Core/MercaMiner/releases/tag/v0.1.0-testnet2

**Testnet MCA is for testing only and has no monetary value.**

Mercatura mainnet has not launched.

## Features

The Explorer currently provides:

- block and transaction lookup
- address and UTXO information
- network statistics
- mining and MercaHash analytics
- miner payout distribution
- difficulty and block-production history
- adaptive-emission information
- witness v2/v3 post-quantum transaction and UTXO statistics
- public connected-peer and discovered-node listings
- separate mainnet and testnet views

Mainnet and testnet data are kept isolated so blocks, transactions, addresses, statistics, mining data, and other indexed state are never mixed.

## Changes — November 22, 2026

The following explorer refinements were completed on **November 22, 2026**, and recorded in commit `740ddf5`:

- **Explorer overview:** Aligned the Mining Distribution chart with the Mining page: up to ten leading identified payout addresses, plus **Other** only when there are additional or unidentified payouts.
- **Mining:** Added `4H`, `1D`, `3D`, `1W`, `1M`, `3M`, `6M`, `1Y`, and `ALL` history windows; improved mining analytics; and added 20-block pagination to Recent Block Production.
- **Emission:** Added the same history windows and 20-row pagination to Block-by-Block Issuance.
- **Network:** Added numbered, 20-entry pagination with Previous/Next controls to Public Connected Peers and Public Discovered Nodes.
- **Live metrics:** Added periodic refreshes of Mercatura Core's current difficulty and estimated network hashrate on the overview page (approximately every 30 seconds).
- **Post-quantum statistics:** Consolidated witness v2/v3 comparisons into Statistics and removed the separate PQ page.
- **Maintenance:** Removed obsolete frontend assets, updated dependencies, and refreshed developer/API documentation.
- **Validation:** TypeScript, ESLint, and the production web build passed; the dependency audit reported zero vulnerabilities at the time of testing. The available test run passed 23 tests; 28 integration tests were skipped and the regtest-dependent RPC test was excluded because its test node was unavailable.

These changes were validated locally; a Git commit does not by itself deploy them to the public explorer.

## Architecture

The Explorer uses a hybrid architecture consisting of:

- `apps/web` — public Next.js explorer frontend
- `apps/api` — explorer API
- `apps/indexer` — blockchain indexer
- `packages/mercatura-rpc` — Mercatura Core JSON-RPC client
- `packages/database` — database schema and queries
- `packages/shared` — shared TypeScript types and utilities
- `packages/ui` — shared Mercatura UI components
- `infrastructure` — deployment and operational configuration
- `docs` — architecture and project documentation
- `tests` — cross-component and integration tests

Indexed blockchain data is stored in PostgreSQL while Mercatura Core remains the authoritative source for live chain and node information.

## Development Status

The Explorer is deployed and actively serving the Mercatura public testnet.

Development continues as Mercatura moves through public-testnet testing and toward mainnet launch.
