import Fastify from "fastify";

import { createDatabase } from "@mercatura/database";
import { createRpcClient } from "@mercatura/mercatura-rpc";

import {
  createNetworkGeolocatorFromEnvironment,
  type NetworkGeolocator,
} from "./network-geolocation.js";
import { registerAddressRoutes } from "./routes/addresses.js";
import { registerBlockRoutes } from "./routes/blocks.js";
import { registerCoreStatusRoutes, type CoreStatusRpc } from "./routes/core-status.js";
import { registerEmissionRoutes } from "./routes/emission.js";
import { registerMiningRoutes } from "./routes/mining.js";
import { registerNetworkRoutes, type NetworkRpc } from "./routes/network.js";
import { registerSearchRoutes } from "./routes/search.js";
import { registerStatisticsRoutes } from "./routes/statistics.js";
import { registerSummaryRoutes } from "./routes/summary.js";
import { registerTransactionRoutes } from "./routes/transactions.js";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

export interface BuildApiOptions {
  database?: ExplorerDatabase;
  rpc?: CoreStatusRpc;
  networkRpc?: NetworkRpc;
  networkGeolocator?: NetworkGeolocator;
  logger?: boolean;
}

export function buildApi(options: BuildApiOptions = {}) {
  const ownsDatabase = options.database === undefined;
  const database = options.database ?? createDatabase();

  let defaultRpc: ReturnType<typeof createRpcClient> | undefined;

  const getDefaultRpc = () => {
    if (defaultRpc === undefined) {
      defaultRpc = createRpcClient();
    }

    return defaultRpc;
  };

  let rpc: CoreStatusRpc | undefined = options.rpc;
  let networkRpc: NetworkRpc | undefined = options.networkRpc;

  const getRpc = (): CoreStatusRpc => {
    if (rpc === undefined) {
      rpc = getDefaultRpc();
    }

    return rpc;
  };

  const getNetworkRpc = (): NetworkRpc => {
    if (networkRpc === undefined) {
      networkRpc = getDefaultRpc();
    }

    return networkRpc;
  };

  const networkGeolocator = options.networkGeolocator ?? createNetworkGeolocatorFromEnvironment();

  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.code(404).send({
      error: "not_found",
      message: "Route not found",
    });
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);

    if (reply.statusCode >= 400 && reply.statusCode < 500) {
      return reply.send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid request",
      });
    }

    return reply.code(500).send({
      error: "internal_error",
      message: "An internal server error occurred",
    });
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "mercatura-explorer-api",
    };
  });

  app.get("/api/v1/status", async () => {
    const state = await database
      .selectFrom("chain_state")
      .select(["tip_height", "tip_hash", "updated_at"])
      .where("id", "=", 1)
      .executeTakeFirstOrThrow();

    return {
      status: "ok",
      chain: {
        indexedHeight: state.tip_height,
        indexedTip: state.tip_hash,
        updatedAt: state.updated_at,
      },
    };
  });

  registerBlockRoutes(app, database);
  registerTransactionRoutes(app, database);
  registerAddressRoutes(app, database);
  registerSearchRoutes(app, database);
  registerSummaryRoutes(app, database);
  registerCoreStatusRoutes(app, getRpc);
  registerEmissionRoutes(app, database);
  registerMiningRoutes(app, database);
  registerStatisticsRoutes(app, database);
  registerNetworkRoutes(app, getNetworkRpc, networkGeolocator);

  if (ownsDatabase) {
    app.addHook("onClose", async () => {
      await database.destroy();
    });
  }

  return app;
}
