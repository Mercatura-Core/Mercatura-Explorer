import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("blocks")
    .addColumn("hash", "text", (col) => col.primaryKey())
    .addColumn("height", "integer", (col) => col.notNull())
    .addColumn("previous_hash", "text")
    .addColumn("time", "bigint", (col) => col.notNull())
    .addColumn("median_time", "bigint", (col) => col.notNull())
    .addColumn("bits", "text", (col) => col.notNull())
    .addColumn("target", "text", (col) => col.notNull())
    .addColumn("difficulty", "double precision", (col) => col.notNull())
    .addColumn("chainwork", "text", (col) => col.notNull())
    .addColumn("tx_count", "integer", (col) => col.notNull())
    .addColumn("stripped_size", "integer", (col) => col.notNull())
    .addColumn("size", "integer", (col) => col.notNull())
    .addColumn("weight", "integer", (col) => col.notNull())
    .addColumn("active", "boolean", (col) => col.notNull().defaultTo(true))
    .execute();

  await sql`
    CREATE UNIQUE INDEX blocks_active_height_unique
    ON blocks (height)
    WHERE active = TRUE
  `.execute(db);

  await db.schema
    .createIndex("blocks_previous_hash_index")
    .on("blocks")
    .column("previous_hash")
    .execute();

  await db.schema
    .createTable("transactions")
    .addColumn("id", "bigserial", (col) => col.primaryKey())
    .addColumn("txid", "text", (col) => col.notNull())
    .addColumn("wtxid", "text", (col) => col.notNull())
    .addColumn("block_hash", "text", (col) =>
      col.notNull().references("blocks.hash").onDelete("cascade")
    )
    .addColumn("block_index", "integer", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addColumn("locktime", "bigint", (col) => col.notNull())
    .addColumn("size", "integer", (col) => col.notNull())
    .addColumn("vsize", "integer", (col) => col.notNull())
    .addColumn("weight", "integer", (col) => col.notNull())
    .addColumn("fee_base_units", "bigint")
    .addColumn("hex", "text", (col) => col.notNull())
    .addUniqueConstraint("transactions_block_txid_unique", ["block_hash", "txid"])
    .addUniqueConstraint("transactions_block_index_unique", ["block_hash", "block_index"])
    .execute();

  await db.schema
    .createIndex("transactions_txid_index")
    .on("transactions")
    .column("txid")
    .execute();

  await db.schema
    .createTable("transaction_inputs")
    .addColumn("transaction_id", "bigint", (col) =>
      col.notNull().references("transactions.id").onDelete("cascade")
    )
    .addColumn("vin", "integer", (col) => col.notNull())
    .addColumn("prev_txid", "text")
    .addColumn("prev_vout", "integer")
    .addColumn("sequence", "bigint", (col) => col.notNull())
    .addColumn("coinbase", "text")
    .addColumn("script_sig_asm", "text")
    .addColumn("script_sig_hex", "text")
    .addColumn("witness", "jsonb")
    .addPrimaryKeyConstraint("transaction_inputs_pk", ["transaction_id", "vin"])
    .execute();

  await db.schema
    .createIndex("transaction_inputs_prevout_index")
    .on("transaction_inputs")
    .columns(["prev_txid", "prev_vout"])
    .execute();

  await db.schema
    .createTable("transaction_outputs")
    .addColumn("transaction_id", "bigint", (col) =>
      col.notNull().references("transactions.id").onDelete("cascade")
    )
    .addColumn("vout", "integer", (col) => col.notNull())
    .addColumn("value_base_units", "bigint", (col) => col.notNull())
    .addColumn("script_asm", "text", (col) => col.notNull())
    .addColumn("script_desc", "text", (col) => col.notNull())
    .addColumn("script_hex", "text", (col) => col.notNull())
    .addColumn("address", "text")
    .addColumn("script_type", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("transaction_outputs_pk", ["transaction_id", "vout"])
    .execute();

  await db.schema
    .createIndex("transaction_outputs_address_index")
    .on("transaction_outputs")
    .column("address")
    .execute();

  await db.schema
    .createTable("chain_state")
    .addColumn("id", "integer", (col) => col.primaryKey())
    .addColumn("tip_hash", "text")
    .addColumn("tip_height", "integer")
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await sql`
    INSERT INTO chain_state (id, tip_hash, tip_height)
    VALUES (1, NULL, NULL)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("chain_state").ifExists().execute();
  await db.schema.dropTable("transaction_outputs").ifExists().execute();
  await db.schema.dropTable("transaction_inputs").ifExists().execute();
  await db.schema.dropTable("transactions").ifExists().execute();
  await db.schema.dropTable("blocks").ifExists().execute();
}
