import { createServer, type Socket } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase } from "../packages/database/src/index.js";

const originalEnvironment = {
  PGHOST: process.env.PGHOST,
  PGPORT: process.env.PGPORT,
  MERCATURA_DB_CONNECTION_TIMEOUT_MS: process.env.MERCATURA_DB_CONNECTION_TIMEOUT_MS,
};

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe("Mercatura database connection timeout", () => {
  it("rejects invalid connection timeout configuration", () => {
    process.env.MERCATURA_DB_CONNECTION_TIMEOUT_MS = "0";

    expect(() => createDatabase()).toThrow(
      "MERCATURA_DB_CONNECTION_TIMEOUT_MS must be a positive integer"
    );
  });

  it("bounds a stalled PostgreSQL connection", async () => {
    const sockets = new Set<Socket>();

    const server = createServer((socket) => {
      sockets.add(socket);

      socket.once("close", () => {
        sockets.delete(socket);
      });

      // Intentionally accept the TCP connection without speaking PostgreSQL.
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();

    if (address === null || typeof address === "string") {
      server.close();
      throw new Error("Could not determine temporary TCP server port");
    }

    process.env.PGHOST = "127.0.0.1";
    process.env.PGPORT = String(address.port);
    process.env.MERCATURA_DB_CONNECTION_TIMEOUT_MS = "50";

    const db = createDatabase();

    try {
      const started = Date.now();

      await expect(db.selectFrom("chain_state").select("id").limit(1).execute()).rejects.toThrow();

      expect(Date.now() - started).toBeLessThan(2_000);
    } finally {
      await db.destroy();

      for (const socket of sockets) {
        socket.destroy();
      }

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  });
});
