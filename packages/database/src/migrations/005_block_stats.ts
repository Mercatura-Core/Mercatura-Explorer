import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE block_stats (
      block_hash TEXT PRIMARY KEY
        REFERENCES blocks(hash)
        ON DELETE CASCADE,

      subsidy_base_units BIGINT NOT NULL,
      total_fee_base_units BIGINT NOT NULL,
      total_out_base_units BIGINT NOT NULL,

      transaction_count INTEGER NOT NULL,
      input_count INTEGER NOT NULL,
      output_count INTEGER NOT NULL,

      total_size INTEGER NOT NULL,
      total_weight INTEGER NOT NULL,

      utxo_increase INTEGER NOT NULL,
      utxo_increase_actual INTEGER NOT NULL
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS block_stats`.execute(db);
}
