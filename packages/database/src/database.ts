import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "./schema.js";

export function createDatabase(): Kysely<Database> {
  const pool = new Pool({
    host: process.env.PGHOST ?? "/var/run/postgresql",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? "mercatura_explorer",
    user: process.env.PGUSER ?? process.env.USER,
    password: process.env.PGPASSWORD,
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool,
    }),
  });
}
