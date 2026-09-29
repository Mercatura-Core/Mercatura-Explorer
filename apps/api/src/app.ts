import Fastify from "fastify";

import { createDatabase } from "@mercatura/database";
import { createRpcClient } from "@mercatura/mercatura-rpc";

import { registerAddressRoutes } from "./routes/addresses.js";
import { registerBlockRoutes } from "./routes/blocks.js";
import { registerCoreStatusRoutes, type CoreStatusRpc } from "./routes/core-status.js";
import { registerEmissionRoutes } from "./routes/emission.js";
import { registerSearchRoutes } from "./routes/search.js";
import { registerSummaryRoutes } from "./routes/summary.js";
import { registerTransactionRoutes } from "./routes/transactions.js";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

export interface BuildApiOptions {
  database?: ExplorerDatabase;
  rpc?: CoreStatusRpc;
  logger?: boolean;
}

export function buildApi(options: BuildApiOptions = {}) {
  const ownsDatabase = options.database === undefined;
  const database = options.database ?? createDatabase();

  let rpc: CoreStatusRpc | undefined = options.rpc;

  const getRpc = (): CoreStatusRpc => {
    if (rpc === undefined) {
      rpc = createRpcClient();
    }

    return rpc;
  };

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

  if (ownsDatabase) {
    app.addHook("onClose", async () => {
      await database.destroy();
    });
  }

  return app;
}
