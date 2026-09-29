import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE VIEW active_utxos AS
    SELECT
      output.transaction_id,
      creating_tx.txid,
      output.vout,
      output.value_base_units,
      output.script_asm,
      output.script_desc,
      output.script_hex,
      output.address,
      output.script_type,
      creating_tx.block_hash,
      creating_block.height AS block_height,
      creating_block.time AS block_time,
      EXISTS (
        SELECT 1
        FROM transaction_inputs AS coinbase_input
        WHERE coinbase_input.transaction_id = creating_tx.id
          AND coinbase_input.coinbase IS NOT NULL
      ) AS is_coinbase
    FROM transaction_outputs AS output
    JOIN transactions AS creating_tx
      ON creating_tx.id = output.transaction_id
    JOIN blocks AS creating_block
      ON creating_block.hash = creating_tx.block_hash
    WHERE creating_block.active = TRUE
      AND output.script_type <> 'nulldata'
      AND NOT EXISTS (
        SELECT 1
        FROM transaction_inputs AS spending_input
        JOIN transactions AS spending_tx
          ON spending_tx.id = spending_input.transaction_id
        JOIN blocks AS spending_block
          ON spending_block.hash = spending_tx.block_hash
        WHERE spending_input.resolved_prev_transaction_id =
              output.transaction_id
          AND spending_input.prev_vout = output.vout
          AND spending_block.active = TRUE
      )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP VIEW IF EXISTS active_utxos`.execute(db);
}
