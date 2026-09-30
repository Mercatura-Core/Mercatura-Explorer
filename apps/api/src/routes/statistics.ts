import type { FastifyInstance } from "fastify";
import { sql } from "kysely";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

const PQ_SCRIPT_TYPE = "witness_v2_mercatura_pq";

type StatisticsActivityRange = "30d" | "90d" | "180d" | "365d" | "1095d" | "all";

const STATISTICS_ACTIVITY_DAYS = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
  "1095d": 1095,
} as const;

function parseStatisticsActivityRange(value: string | undefined): StatisticsActivityRange {
  switch (value) {
    case "90d":
    case "180d":
    case "365d":
    case "1095d":
    case "all":
      return value;

    default:
      return "30d";
  }
}

interface BlockSummaryRow {
  active_blocks: string;
  transaction_count: string;
  total_block_bytes: string;
  total_block_weight: string;
  average_block_bytes: string | null;
  average_block_weight: string | null;
}

interface TransactionSummaryRow {
  non_coinbase_transactions: string;
  average_transaction_size: string | null;
  average_transaction_weight: string | null;
}

interface FeeSummaryRow {
  total_fees_base_units: string;
  total_subsidy_base_units: string;
}

interface AddressSummaryRow {
  address_count: string;
  zero_balance_addresses: string;
}

interface UtxoSummaryRow {
  utxo_count: string;
  utxo_value_base_units: string;
}

interface OutputDistributionRow {
  script_type: string;
  output_count: string;
  addressed_output_count: string;
  total_value_base_units: string;
}

interface PqAuthorizationRow {
  input_count: string;
  transaction_count: string;
}

interface PqUtxoRow {
  utxo_count: string;
  value_base_units: string;
}

interface DailyTransactionsRow {
  day: string;
  non_coinbase_transactions: string;
}

function firstRow<T>(rows: T[], name: string): T {
  const row = rows[0];

  if (row === undefined) {
    throw new Error(`${name} aggregation returned no row`);
  }

  return row;
}

export function registerStatisticsRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{ Querystring: { range?: string } }>("/api/v1/statistics", async (request) => {
    const activityRange = parseStatisticsActivityRange(request.query.range);

    const activityDays = activityRange === "all" ? null : STATISTICS_ACTIVITY_DAYS[activityRange];

    const [
      state,
      blockResult,
      transactionResult,
      feeResult,
      addressResult,
      utxoResult,
      outputDistributionResult,
      pqAuthorizationResult,
      pqUtxoResult,
      dailyTransactionsResult,
    ] = await Promise.all([
      database
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow(),

      sql<BlockSummaryRow>`
        SELECT
          COUNT(*)::text AS active_blocks,
          COALESCE(SUM(tx_count), 0)::text
            AS transaction_count,
          COALESCE(SUM(size), 0)::text
            AS total_block_bytes,
          COALESCE(SUM(weight), 0)::text
            AS total_block_weight,
          AVG(size)::text AS average_block_bytes,
          AVG(weight)::text AS average_block_weight
        FROM blocks
        WHERE active = TRUE
      `.execute(database),

      sql<TransactionSummaryRow>`
        SELECT
          COUNT(*) FILTER (
            WHERE tx.block_index > 0
          )::text AS non_coinbase_transactions,

          AVG(tx.size) FILTER (
            WHERE tx.block_index > 0
          )::text AS average_transaction_size,

          AVG(tx.weight) FILTER (
            WHERE tx.block_index > 0
          )::text AS average_transaction_weight
        FROM transactions AS tx
        JOIN blocks AS block
          ON block.hash = tx.block_hash
        WHERE block.active = TRUE
      `.execute(database),

      sql<FeeSummaryRow>`
        SELECT
          COALESCE(
            SUM(stats.total_fee_base_units),
            0
          )::text AS total_fees_base_units,

          COALESCE(
            SUM(stats.subsidy_base_units),
            0
          )::text AS total_subsidy_base_units
        FROM block_stats AS stats
        JOIN blocks AS block
          ON block.hash = stats.block_hash
        WHERE block.active = TRUE
      `.execute(database),

      sql<AddressSummaryRow>`
        SELECT
          COUNT(*)::text AS address_count,
          COUNT(*) FILTER (
            WHERE balance_base_units = 0
          )::text AS zero_balance_addresses
        FROM active_address_balances
      `.execute(database),

      sql<UtxoSummaryRow>`
        SELECT
          COUNT(*)::text AS utxo_count,
          COALESCE(
            SUM(value_base_units),
            0
          )::text AS utxo_value_base_units
        FROM active_utxos
      `.execute(database),

      sql<OutputDistributionRow>`
        SELECT
          output.script_type,
          COUNT(*)::text AS output_count,
          COUNT(*) FILTER (
            WHERE output.address IS NOT NULL
          )::text AS addressed_output_count,
          COALESCE(
            SUM(output.value_base_units),
            0
          )::text AS total_value_base_units
        FROM transaction_outputs AS output
        JOIN transactions AS tx
          ON tx.id = output.transaction_id
        JOIN blocks AS block
          ON block.hash = tx.block_hash
        WHERE block.active = TRUE
        GROUP BY output.script_type
        ORDER BY COUNT(*) DESC, output.script_type ASC
      `.execute(database),

      sql<PqAuthorizationRow>`
        SELECT
          COUNT(*)::text AS input_count,
          COUNT(DISTINCT spending_tx.id)::text
            AS transaction_count
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
          ON previous_tx.id =
             previous_output.transaction_id
        JOIN blocks AS previous_block
          ON previous_block.hash = previous_tx.block_hash
        WHERE spending_block.active = TRUE
          AND previous_block.active = TRUE
          AND previous_output.script_type =
              ${PQ_SCRIPT_TYPE}
      `.execute(database),

      sql<PqUtxoRow>`
        SELECT
          COUNT(*)::text AS utxo_count,
          COALESCE(
            SUM(value_base_units),
            0
          )::text AS value_base_units
        FROM active_utxos
        WHERE script_type = ${PQ_SCRIPT_TYPE}
      `.execute(database),

      sql<DailyTransactionsRow>`
        WITH bounds AS (
          SELECT
            MIN(
              (
                to_timestamp(block.time::double precision)
                AT TIME ZONE 'UTC'
              )::date
            ) AS first_day,

            MAX(
              (
                to_timestamp(block.time::double precision)
                AT TIME ZONE 'UTC'
              )::date
            ) AS last_day
          FROM blocks AS block
          WHERE block.active = TRUE
        ),

        activity_window AS (
          SELECT
            first_day,
            last_day,

            CASE
              WHEN last_day IS NULL THEN NULL

              WHEN ${activityDays}::integer IS NULL
                THEN first_day

              ELSE GREATEST(
                first_day,
                last_day
                  - (
                      (${activityDays}::integer - 1)
                      * INTERVAL '1 day'
                    )
              )::date
            END AS start_day
          FROM bounds
        ),

        calendar AS (
          SELECT
            generate_series(
              activity_window.start_day,
              activity_window.last_day,
              INTERVAL '1 day'
            )::date AS day
          FROM activity_window
          WHERE activity_window.start_day IS NOT NULL
            AND activity_window.last_day IS NOT NULL
        ),

        daily_counts AS (
          SELECT
            (
              to_timestamp(block.time::double precision)
              AT TIME ZONE 'UTC'
            )::date AS day,

            COUNT(*) FILTER (
              WHERE tx.block_index > 0
            )::text AS non_coinbase_transactions
          FROM blocks AS block

          JOIN transactions AS tx
            ON tx.block_hash = block.hash

          CROSS JOIN activity_window

          WHERE block.active = TRUE
            AND activity_window.start_day IS NOT NULL
            AND block.time >= EXTRACT(
              EPOCH FROM (
                activity_window.start_day::timestamp
                AT TIME ZONE 'UTC'
              )
            )::bigint

            AND block.time < EXTRACT(
              EPOCH FROM (
                (activity_window.last_day + 1)::timestamp
                AT TIME ZONE 'UTC'
              )
            )::bigint

          GROUP BY 1
        )

        SELECT
          TO_CHAR(calendar.day, 'YYYY-MM-DD') AS day,

          COALESCE(
            daily_counts.non_coinbase_transactions,
            '0'
          )::text AS non_coinbase_transactions

        FROM calendar

        LEFT JOIN daily_counts
          ON daily_counts.day = calendar.day

        ORDER BY calendar.day ASC
      `.execute(database),
    ]);

    const blocks = firstRow(blockResult.rows, "Block statistics");

    const transactions = firstRow(transactionResult.rows, "Transaction statistics");

    const fees = firstRow(feeResult.rows, "Fee statistics");

    const addresses = firstRow(addressResult.rows, "Address statistics");

    const utxos = firstRow(utxoResult.rows, "UTXO statistics");

    const pqAuthorization = firstRow(pqAuthorizationResult.rows, "PQ authorization statistics");

    const pqUtxos = firstRow(pqUtxoResult.rows, "PQ UTXO statistics");

    const pqOutputs = outputDistributionResult.rows.find(
      (row) => row.script_type === PQ_SCRIPT_TYPE
    );

    return {
      chain: {
        indexedHeight: state.tip_height,
        indexedTip: state.tip_hash,
        activeBlocks: blocks.active_blocks,
        transactions: blocks.transaction_count,
      },

      blocks: {
        totalBytes: blocks.total_block_bytes,
        totalWeight: blocks.total_block_weight,
        averageBytes: blocks.average_block_bytes,
        averageWeight: blocks.average_block_weight,
      },

      transactions: {
        total: blocks.transaction_count,
        nonCoinbase: transactions.non_coinbase_transactions,
        averageNonCoinbaseSize: transactions.average_transaction_size,
        averageNonCoinbaseWeight: transactions.average_transaction_weight,
        feesBaseUnits: fees.total_fees_base_units,
      },

      emission: {
        consensusSubsidyBaseUnits: fees.total_subsidy_base_units,
      },

      addresses: {
        count: addresses.address_count,
        zeroBalanceCount: addresses.zero_balance_addresses,
      },

      utxos: {
        count: utxos.utxo_count,
        valueBaseUnits: utxos.utxo_value_base_units,
      },

      pq: {
        scriptType: PQ_SCRIPT_TYPE,
        outputCount: pqOutputs?.output_count ?? "0",
        addressedOutputCount: pqOutputs?.addressed_output_count ?? "0",
        outputValueBaseUnits: pqOutputs?.total_value_base_units ?? "0",
        authorizationInputCount: pqAuthorization.input_count,
        spendingTransactionCount: pqAuthorization.transaction_count,
        activeUtxoCount: pqUtxos.utxo_count,
        activeUtxoValueBaseUnits: pqUtxos.value_base_units,
      },

      activity: {
        range: activityRange,

        dailyTransactions: dailyTransactionsResult.rows.map((row) => ({
          date: row.day,
          nonCoinbaseTransactions: row.non_coinbase_transactions,
        })),
      },

      outputTypes: outputDistributionResult.rows.map((row) => ({
        scriptType: row.script_type,
        outputCount: row.output_count,
        addressedOutputCount: row.addressed_output_count,
        totalValueBaseUnits: row.total_value_base_units,
      })),
    };
  });
}
