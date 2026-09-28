# Mercatura Explorer

Mercatura-native blockchain explorer for the Mercatura (MCA) network.

The explorer is being built as a hybrid system combining:

- authoritative Mercatura Core RPC data
- indexed blockchain, address, and UTXO data
- derived Mercatura analytics
- a custom Mercatura web frontend

## Planned Components

- `apps/web` — public explorer frontend
- `apps/api` — explorer API
- `apps/indexer` — blockchain indexer
- `packages/mercatura-rpc` — Mercatura Core JSON-RPC client
- `packages/database` — database schema and queries
- `packages/shared` — shared TypeScript types and utilities
- `packages/ui` — shared Mercatura UI components
- `infrastructure` — deployment and operational configuration
- `docs` — architecture and project documentation
- `tests` — cross-component and integration tests

## Development Status

Phase 17 — Mercatura Explorer development.
