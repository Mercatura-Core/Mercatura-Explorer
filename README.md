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
- post-quantum network information
- node and geographic network analytics
- separate mainnet and testnet views

Mainnet and testnet data are kept isolated so blocks, transactions, addresses, statistics, mining data, and other indexed state are never mixed.

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
