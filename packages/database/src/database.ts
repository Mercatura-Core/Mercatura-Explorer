import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "./schema.js";

const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;

function statementTimeoutMs(): number {
  const raw = process.env.MERCATURA_DB_STATEMENT_TIMEOUT_MS;

  if (raw === undefined) {
    return DEFAULT_STATEMENT_TIMEOUT_MS;
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("MERCATURA_DB_STATEMENT_TIMEOUT_MS must be a positive integer");
  }

  return parsed;
}

export function createDatabase(): Kysely<Database> {
  const pool = new Pool({
    host: process.env.PGHOST ?? "/var/run/postgresql",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? "mercatura_explorer",
    user: process.env.PGUSER ?? process.env.USER,
    password: process.env.PGPASSWORD,
    statement_timeout: statementTimeoutMs(),
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool,
    }),
  });
}
