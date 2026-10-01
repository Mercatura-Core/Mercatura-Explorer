import type { FastifyInstance } from "fastify";
import { sql } from "kysely";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

interface EmissionHistoryRow {
  height: number;
  hash: string;
  time: string;
  subsidy_base_units: string;
  total_fee_base_units: string;
  coinbase_payout_base_units: string;
  actual_issuance_base_units: string;
  cumulative_issued_base_units: string;
}

function parseLimit(value: string | undefined): number {
  const limit = value === undefined ? DEFAULT_LIMIT : Number(value);

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${MAX_LIMIT}`);
  }

  return limit;
}

function parseIncludeSpendable(value: string | undefined): boolean {
  if (value === undefined || value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error("includeSpendable must be true or false");
}

function parseBeforeHeight(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const height = Number(value);

  if (!Number.isSafeInteger(height) || height < 0) {
    throw new Error("beforeHeight must be a non-negative integer");
  }

  return height;
}

export function registerEmissionRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Querystring: {
      limit?: string;
      beforeHeight?: string;
      includeSpendable?: string;
    };
  }>("/api/v1/emission", async (request, reply) => {
    let limit: number;
    let beforeHeight: number | undefined;
    let includeSpendable: boolean;

    try {
      limit = parseLimit(request.query.limit);
      beforeHeight = parseBeforeHeight(request.query.beforeHeight);
      includeSpendable = parseIncludeSpendable(request.query.includeSpendable);
    } catch (error) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid emission query",
      });
    }

    const [state, subsidyTotals, issuanceResult, spendableResult, current] = await Promise.all([
      database
        .selectFrom("chain_state")
        .select(["tip_height", "tip_hash"])
        .where("id", "=", 1)
        .executeTakeFirstOrThrow(),

      database
        .selectFrom("block_stats as stats")
        .innerJoin("blocks as block", "block.hash", "stats.block_hash")
        .select([
          sql<string>`
            COALESCE(
              SUM(stats.subsidy_base_units),
              0
            )::text
          `.as("subsidy_including_genesis"),
          sql<string>`
            COALESCE(
              SUM(stats.subsidy_base_units)
                FILTER (WHERE block.height > 0),
              0
            )::text
          `.as("subsidy_excluding_genesis"),
          sql<string>`
            COALESCE(
              SUM(stats.total_fee_base_units),
              0
            )::text
          `.as("fee_total"),
        ])
        .where("block.active", "=", true)
        .executeTakeFirstOrThrow(),

      sql<{
        actual_issued_including_genesis: string;
        actual_issued_excluding_genesis: string;
        genesis_coinbase_payout: string;
      }>`
        WITH coinbase_totals AS (
          SELECT
            block.hash,
            block.height,
            SUM(output.value_base_units)::bigint
              AS coinbase_payout
          FROM blocks AS block
          JOIN transactions AS tx
            ON tx.block_hash = block.hash
           AND tx.block_index = 0
          JOIN transaction_outputs AS output
            ON output.transaction_id = tx.id
          WHERE block.active = TRUE
          GROUP BY block.hash, block.height
        )
        SELECT
          COALESCE(
            SUM(
              coinbase.coinbase_payout -
              stats.total_fee_base_units
            ),
            0
          )::text AS actual_issued_including_genesis,

          COALESCE(
            SUM(
              coinbase.coinbase_payout -
              stats.total_fee_base_units
            ) FILTER (
              WHERE coinbase.height > 0
            ),
            0
          )::text AS actual_issued_excluding_genesis,

          COALESCE(
            MAX(coinbase.coinbase_payout)
              FILTER (WHERE coinbase.height = 0),
            0
          )::text AS genesis_coinbase_payout
        FROM coinbase_totals AS coinbase
        JOIN block_stats AS stats
          ON stats.block_hash = coinbase.hash
      `.execute(database),

      includeSpendable
        ? database
            .selectFrom("active_utxos")
            .select(
              sql<string>`
                COALESCE(
                  SUM(value_base_units),
                  0
                )::text
              `.as("value")
            )
            .executeTakeFirstOrThrow()
        : Promise.resolve({ value: null }),

      database
        .selectFrom("blocks as block")
        .innerJoin("block_stats as stats", "stats.block_hash", "block.hash")
        .select([
          "block.height",
          "block.hash",
          "stats.subsidy_base_units",
          "stats.total_fee_base_units",
        ])
        .where("block.active", "=", true)
        .orderBy("block.height", "desc")
        .limit(1)
        .executeTakeFirst(),
    ]);

    const issuance = issuanceResult.rows[0];

    if (issuance === undefined) {
      throw new Error("Emission issuance aggregation returned no row");
    }

    const beforeFilter = beforeHeight === undefined ? sql`` : sql`WHERE height < ${beforeHeight}`;

    const history = await sql<EmissionHistoryRow>`
      WITH coinbase_totals AS (
        SELECT
          block.hash,
          block.height,
          SUM(output.value_base_units)::bigint
            AS coinbase_payout
        FROM blocks AS block
        JOIN transactions AS tx
          ON tx.block_hash = block.hash
         AND tx.block_index = 0
        JOIN transaction_outputs AS output
          ON output.transaction_id = tx.id
        WHERE block.active = TRUE
        GROUP BY block.hash, block.height
      ),
      emission_rows AS (
        SELECT
          block.height,
          block.hash,
          block.time::text AS time,
          stats.subsidy_base_units::text
            AS subsidy_base_units,
          stats.total_fee_base_units::text
            AS total_fee_base_units,
          coinbase.coinbase_payout::text
            AS coinbase_payout_base_units,
          (
            coinbase.coinbase_payout -
            stats.total_fee_base_units
          )::text AS actual_issuance_base_units,
          SUM(
            CASE
              WHEN block.height > 0
                THEN
                  coinbase.coinbase_payout -
                  stats.total_fee_base_units
              ELSE 0
            END
          ) OVER (
            ORDER BY block.height
            ROWS BETWEEN UNBOUNDED PRECEDING
            AND CURRENT ROW
          )::text AS cumulative_issued_base_units
        FROM blocks AS block
        JOIN block_stats AS stats
          ON stats.block_hash = block.hash
        JOIN coinbase_totals AS coinbase
          ON coinbase.hash = block.hash
        WHERE block.active = TRUE
      )
      SELECT *
      FROM emission_rows
      ${beforeFilter}
      ORDER BY height DESC
      LIMIT ${limit}
    `.execute(database);

    return {
      chain: {
        indexedHeight: state.tip_height,
        indexedTip: state.tip_hash,
      },

      totals: {
        consensusSubsidyIncludingGenesisBaseUnits: subsidyTotals.subsidy_including_genesis,
        consensusSubsidyExcludingGenesisBaseUnits: subsidyTotals.subsidy_excluding_genesis,
        actualIssuedIncludingGenesisBaseUnits: issuance.actual_issued_including_genesis,
        actualIssuedExcludingGenesisBaseUnits: issuance.actual_issued_excluding_genesis,
        genesisUnspendableBaseUnits: issuance.genesis_coinbase_payout,
        transactionFeesBaseUnits: subsidyTotals.fee_total,
        spendableUtxoValueBaseUnits: spendableResult.value,
      },

      current:
        current === undefined
          ? null
          : {
              height: current.height,
              hash: current.hash,
              subsidyBaseUnits: current.subsidy_base_units,
              feesBaseUnits: current.total_fee_base_units,
            },

      history: history.rows,

      pagination: {
        limit,
        nextBeforeHeight:
          history.rows.length < limit ? null : (history.rows.at(-1)?.height ?? null),
      },
    };
  });
}
