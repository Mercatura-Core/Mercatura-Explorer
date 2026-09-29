import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE VIEW active_address_transactions AS
    WITH address_movements AS (
      SELECT
        output.address,
        tx.id AS transaction_id,
        tx.txid,
        tx.block_hash,
        tx.block_index,
        block.height AS block_height,
        block.time AS block_time,
        output.value_base_units AS received_base_units,
        0::bigint AS spent_base_units
      FROM transaction_outputs AS output
      JOIN transactions AS tx
        ON tx.id = output.transaction_id
      JOIN blocks AS block
        ON block.hash = tx.block_hash
      WHERE block.active = TRUE
        AND output.address IS NOT NULL

      UNION ALL

      SELECT
        previous_output.address,
        spending_tx.id AS transaction_id,
        spending_tx.txid,
        spending_tx.block_hash,
        spending_tx.block_index,
        spending_block.height AS block_height,
        spending_block.time AS block_time,
        0::bigint AS received_base_units,
        previous_output.value_base_units AS spent_base_units
      FROM transaction_inputs AS input
      JOIN transactions AS spending_tx
        ON spending_tx.id = input.transaction_id
      JOIN blocks AS spending_block
        ON spending_block.hash = spending_tx.block_hash
      JOIN transaction_outputs AS previous_output
        ON previous_output.transaction_id =
           input.resolved_prev_transaction_id
       AND previous_output.vout = input.prev_vout
      JOIN transactions AS previous_tx
        ON previous_tx.id = previous_output.transaction_id
      JOIN blocks AS previous_block
        ON previous_block.hash = previous_tx.block_hash
      WHERE spending_block.active = TRUE
        AND previous_block.active = TRUE
        AND previous_output.address IS NOT NULL
    )
    SELECT
      address,
      transaction_id,
      txid,
      block_hash,
      block_height,
      block_time,
      block_index,
      SUM(received_base_units)::bigint AS received_base_units,
      SUM(spent_base_units)::bigint AS spent_base_units,
      (
        SUM(received_base_units) -
        SUM(spent_base_units)
      )::bigint AS net_base_units
    FROM address_movements
    GROUP BY
      address,
      transaction_id,
      txid,
      block_hash,
      block_height,
      block_time,
      block_index
  `.execute(db);

  await sql`
    CREATE VIEW active_address_balances AS
    WITH history AS (
      SELECT
        address,
        COUNT(*)::bigint AS transaction_count,
        SUM(received_base_units)::bigint AS total_received_base_units,
        SUM(spent_base_units)::bigint AS total_spent_base_units,
        SUM(net_base_units)::bigint AS balance_base_units
      FROM active_address_transactions
      GROUP BY address
    ),
    utxos AS (
      SELECT
        address,
        COUNT(*)::bigint AS utxo_count
      FROM active_utxos
      WHERE address IS NOT NULL
      GROUP BY address
    )
    SELECT
      history.address,
      history.transaction_count,
      history.total_received_base_units,
      history.total_spent_base_units,
      history.balance_base_units,
      COALESCE(utxos.utxo_count, 0::bigint) AS utxo_count
    FROM history
    LEFT JOIN utxos
      ON utxos.address = history.address
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP VIEW IF EXISTS active_address_balances`.execute(db);
  await sql`DROP VIEW IF EXISTS active_address_transactions`.execute(db);
}
