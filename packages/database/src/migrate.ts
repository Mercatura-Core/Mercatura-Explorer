import { FileMigrationProvider, Migrator } from "kysely";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDatabase } from "./database.js";

const db = createDatabase();

const migrationFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

const { error, results } = await migrator.migrateToLatest();

for (const result of results ?? []) {
  console.log(`${result.status}: ${result.migrationName}`);
}

if (error) {
  console.error("Migration failed");
  console.error(error);
  process.exitCode = 1;
}

await db.destroy();
