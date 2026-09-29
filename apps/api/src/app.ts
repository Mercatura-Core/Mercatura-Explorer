import Fastify from "fastify";

import { createDatabase } from "@mercatura/database";

import { registerBlockRoutes } from "./routes/blocks.js";
import { registerTransactionRoutes } from "./routes/transactions.js";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

export interface BuildApiOptions {
  database?: ExplorerDatabase;
  logger?: boolean;
}

export function buildApi(options: BuildApiOptions = {}) {
  const ownsDatabase = options.database === undefined;
  const database = options.database ?? createDatabase();

  const app = Fastify({
    logger: options.logger ?? false,
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

  if (ownsDatabase) {
    app.addHook("onClose", async () => {
      await database.destroy();
    });
  }

  return app;
}
