import type { FastifyInstance } from "fastify";
import { sql } from "kysely";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

type MiningWindow = "4h" | "1d" | "3d" | "7d" | "30d" | "90d" | "180d" | "365d" | "all";

// Retain the three inherited block-count values only for API callers that still use them.
type LegacyMiningWindow = 144 | 1000 | 4032;
type AcceptedMiningWindow = MiningWindow | LegacyMiningWindow;

const RECENT_PAGE_SIZE = 20;

function parseRecentPage(value: string | undefined): number {
  if (value === undefined) return 1;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
    throw new Error("recentPage must be an integer from 1 to 1000000");
  }
  return page;
}

const MINING_WINDOW_DAYS: Record<Exclude<MiningWindow, "all">, number> = {
  "4h": 1 / 6,
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

function parseWindow(value: string | undefined): AcceptedMiningWindow {
  if (value === undefined) return "1d";
  if (value === "144") return 144;
  if (value === "1000") return 1000;
  if (value === "4032") return 4032;
  if (value === "all" || Object.hasOwn(MINING_WINDOW_DAYS, value)) {
    return value as MiningWindow;
  }
  throw new Error("window must be one of 4h, 1d, 3d, 7d, 30d, 90d, 180d, 365d, all, 144, 1000, or 4032");
}

function observedHashrate(
  earliest: { chainwork: string; time: string } | undefined,
  latest: { chainwork: string; time: string } | undefined
): number | null {
  if (!earliest || !latest) return null;
  const elapsed = Number(latest.time) - Number(earliest.time);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return null;
  try {
    const work = BigInt(`0x${latest.chainwork}`) - BigInt(`0x${earliest.chainwork}`);
    const result = Number(work) / elapsed;
    return work > 0n && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

interface Aggregation {
  count: string;
  average_difficulty: number | null;
  minimum_difficulty: number | null;
  maximum_difficulty: number | null;
  total_fees: string;
  total_subsidy: string;
  total_transactions: string;
  total_bytes: string;
  total_weight: string;
}

interface PayoutRow { payout_address: string | null; blocks: string }
interface MiningHistoryRow {
  hash: string;
  height: number;
  time: string;
  bits: string;
  target: string;
  difficulty: number;
  tx_count: number;
  size: number;
  weight: number;
  subsidy_base_units: string;
  total_fee_base_units: string;
}

async function extendedWindowResult(
  database: ExplorerDatabase,
  state: { tip_height: number; tip_hash: string },
  window: MiningWindow,
  recentPage: number
) {
  const latest = await database.selectFrom("blocks")
    .select(["height", "time", "chainwork"])
    .where("hash", "=", state.tip_hash).executeTakeFirstOrThrow();

  const days = window === "all" ? null : MINING_WINDOW_DAYS[window];
  let minHeight = 0;
  if (days !== null) {
    // Anchor the range to the indexed tip, not the API server wall clock.
    const cutoff = String(Math.floor(Number(latest.time) - days * 86400));
    const firstInRange = await database.selectFrom("blocks")
      .select("height").where("active", "=", true)
      .where("time", ">=", cutoff)
      .orderBy("height", "asc").limit(1).executeTakeFirst();
    minHeight = firstInRange?.height ?? state.tip_height;
  }

  const baseFilter = sql`block.active = TRUE AND block.height >= ${minHeight}`;
  const aggregate = await sql<Aggregation>`
    SELECT COUNT(*)::text AS count, AVG(block.difficulty) AS average_difficulty,
      MIN(block.difficulty) AS minimum_difficulty,
      MAX(block.difficulty) AS maximum_difficulty,
      COALESCE(SUM(stats.total_fee_base_units),0)::text AS total_fees,
      COALESCE(SUM(stats.subsidy_base_units),0)::text AS total_subsidy,
      COALESCE(SUM(block.tx_count),0)::text AS total_transactions,
      COALESCE(SUM(block.size),0)::text AS total_bytes,
      COALESCE(SUM(block.weight),0)::text AS total_weight
    FROM blocks AS block JOIN block_stats AS stats ON stats.block_hash = block.hash
    WHERE ${baseFilter}
  `.execute(database);
  const summary = aggregate.rows[0];
  if (!summary) throw new Error("Mining summary aggregation returned no row");
  const actualBlocks = Number(summary.count);

  const [firstBlock, lastBlock, payoutResult, historyResult, recentBlocks] = await Promise.all([
    database.selectFrom("blocks").select(["time", "chainwork"]).where("active", "=", true)
      .where("height", ">=", minHeight).orderBy("height", "asc").limit(1).executeTakeFirst(),
    database.selectFrom("blocks").select(["time", "chainwork"]).where("active", "=", true)
      .where("height", ">=", minHeight).orderBy("height", "desc").limit(1).executeTakeFirst(),
    sql<PayoutRow>`
      WITH block_payouts AS (
        SELECT block.hash,
          CASE WHEN COUNT(DISTINCT output.address) = 1 THEN MIN(output.address) ELSE NULL END AS payout_address
        FROM blocks AS block
        LEFT JOIN transactions AS tx ON tx.block_hash = block.hash AND tx.block_index = 0
        LEFT JOIN transaction_outputs AS output ON output.transaction_id = tx.id
        WHERE ${baseFilter}
        GROUP BY block.hash
      )
      SELECT payout_address, COUNT(*)::text AS blocks
      FROM block_payouts GROUP BY payout_address ORDER BY COUNT(*) DESC
    `.execute(database),
    sql<MiningHistoryRow>`
      WITH samples AS (
        SELECT block.hash, block.height, block.time::text AS time, block.bits,
          block.target, block.difficulty, block.tx_count, block.size, block.weight,
          stats.subsidy_base_units::text, stats.total_fee_base_units::text,
          ROW_NUMBER() OVER (
            PARTITION BY FLOOR((block.height - ${minHeight})::numeric * 119 /
              GREATEST(${state.tip_height - minHeight}, 1))
            ORDER BY block.height DESC
          ) AS sample_rank
        FROM blocks AS block JOIN block_stats AS stats ON stats.block_hash = block.hash
        WHERE ${baseFilter}
      )
      SELECT hash, height, time, bits, target, difficulty, tx_count, size, weight,
        subsidy_base_units, total_fee_base_units
      FROM samples WHERE sample_rank = 1 ORDER BY height DESC
    `.execute(database),
    database.selectFrom("blocks as block")
      .innerJoin("block_stats as stats", "stats.block_hash", "block.hash")
      .select([
        "block.hash", "block.height", "block.time", "block.bits", "block.target",
        "block.difficulty", "block.tx_count", "block.size", "block.weight",
        "stats.subsidy_base_units", "stats.total_fee_base_units",
      ])
      .where("block.active", "=", true)
      .where("block.height", ">=", minHeight)
      .orderBy("block.height", "desc")
      .limit(RECENT_PAGE_SIZE)
      .offset((recentPage - 1) * RECENT_PAGE_SIZE)
      .execute(),
  ]);

  const averageDifficulty = summary.average_difficulty === null ? null : Number(summary.average_difficulty);
  const minimumDifficulty = summary.minimum_difficulty === null ? null : Number(summary.minimum_difficulty);
  const maximumDifficulty = summary.maximum_difficulty === null ? null : Number(summary.maximum_difficulty);
  const elapsed = firstBlock && lastBlock ? Number(lastBlock.time) - Number(firstBlock.time) : 0;
  const totalBytes = Number(summary.total_bytes);
  const totalWeight = Number(summary.total_weight);
  const groups = payoutResult.rows.map((row) => ({
    attribution: row.payout_address === null ? "unidentified" as const : "pseudonymous" as const,
    payoutAddress: row.payout_address,
    blocks: Number(row.blocks),
    sharePercent: actualBlocks === 0 ? 0 : Number(row.blocks) * 100 / actualBlocks,
  }));

  return {
    chain: { indexedHeight: state.tip_height, indexedTip: state.tip_hash },
    window: { requestedBlocks: null, actualBlocks },
    summary: {
      averageDifficulty, minimumDifficulty, maximumDifficulty,
      averageBlockIntervalSeconds: elapsed > 0 && actualBlocks > 1 ? elapsed / (actualBlocks - 1) : null,
      averageHashrateHps: observedHashrate(firstBlock, lastBlock),
      totalFeesBaseUnits: summary.total_fees, totalSubsidyBaseUnits: summary.total_subsidy,
      totalTransactions: Number(summary.total_transactions), totalBlockBytes: totalBytes,
      totalBlockWeight: totalWeight, averageBlockSizeBytes: actualBlocks ? totalBytes / actualBlocks : null,
      averageBlockWeight: actualBlocks ? totalWeight / actualBlocks : null,
    },
    payoutGroups: groups,
    recentPagination: {
      currentPage: recentPage,
      pageSize: RECENT_PAGE_SIZE,
      totalItems: actualBlocks,
      totalPages: Math.max(1, Math.ceil(actualBlocks / RECENT_PAGE_SIZE)),
    },
    recentBlocks: recentBlocks.map((block) => ({
      height: block.height, hash: block.hash, time: block.time, bits: block.bits,
      target: block.target, difficulty: block.difficulty, transactionCount: block.tx_count,
      size: block.size, weight: block.weight, subsidyBaseUnits: block.subsidy_base_units,
      feesBaseUnits: block.total_fee_base_units,
    })),
    history: historyResult.rows.map((block) => ({
      height: block.height, hash: block.hash, time: block.time, bits: block.bits,
      target: block.target, difficulty: block.difficulty, transactionCount: block.tx_count,
      size: block.size, weight: block.weight, subsidyBaseUnits: block.subsidy_base_units,
      feesBaseUnits: block.total_fee_base_units,
    })),
  };
}

export function registerMiningRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Querystring: {
      window?: string;
      recentPage?: string;
    };
  }>("/api/v1/mining", async (request, reply) => {
    let window: AcceptedMiningWindow;
    let recentPage: number;

    try {
      window = parseWindow(request.query.window);
      recentPage = parseRecentPage(request.query.recentPage);
    } catch (error) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid mining window",
      });
    }

    const state = await database
      .selectFrom("chain_state")
      .select(["tip_height", "tip_hash"])
      .where("id", "=", 1)
      .executeTakeFirstOrThrow();

    if (state.tip_height === null || state.tip_hash === null) {
      return {
        chain: {
          indexedHeight: null,
          indexedTip: null,
        },
        window: {
          requestedBlocks: window,
          actualBlocks: 0,
        },
        summary: {
          averageDifficulty: null,
          minimumDifficulty: null,
          maximumDifficulty: null,
          averageBlockIntervalSeconds: null,
          averageHashrateHps: null,
          totalFeesBaseUnits: "0",
          totalSubsidyBaseUnits: "0",
          totalTransactions: 0,
          totalBlockBytes: 0,
          totalBlockWeight: 0,
          averageBlockSizeBytes: null,
          averageBlockWeight: null,
        },
        payoutGroups: [],
        history: [],
      };
    }

    if (typeof window === "string") {
      return extendedWindowResult(database, {
        tip_height: state.tip_height,
        tip_hash: state.tip_hash,
      }, window, recentPage);
    }

    const blocks = await database
      .selectFrom("blocks as block")
      .innerJoin("block_stats as stats", "stats.block_hash", "block.hash")
      .select([
        "block.hash",
        "block.height",
        "block.chainwork",
        "block.time",
        "block.bits",
        "block.target",
        "block.difficulty",
        "block.tx_count",
        "block.size",
        "block.weight",
        "stats.subsidy_base_units",
        "stats.total_fee_base_units",
      ])
      .where("block.active", "=", true)
      .orderBy("block.height", "desc")
      .limit(window)
      .execute();

    const actualBlocks = blocks.length;

    if (actualBlocks === 0) {
      throw new Error("Indexed chain state has a tip but no active blocks");
    }

    let totalFees = 0n;
    let totalSubsidy = 0n;
    let totalTransactions = 0;
    let totalBlockBytes = 0;
    let totalBlockWeight = 0;
    let totalDifficulty = 0;
    let minimumDifficulty = Number.POSITIVE_INFINITY;
    let maximumDifficulty = Number.NEGATIVE_INFINITY;

    for (const block of blocks) {
      totalFees += BigInt(block.total_fee_base_units);
      totalSubsidy += BigInt(block.subsidy_base_units);
      totalTransactions += block.tx_count;
      totalBlockBytes += block.size;
      totalBlockWeight += block.weight;
      totalDifficulty += block.difficulty;

      minimumDifficulty = Math.min(minimumDifficulty, block.difficulty);

      maximumDifficulty = Math.max(maximumDifficulty, block.difficulty);
    }

    const ascendingBlocks = [...blocks].reverse();

    let intervalTotal = 0;
    let intervalCount = 0;

    for (let index = 1; index < ascendingBlocks.length; index++) {
      const previous = ascendingBlocks[index - 1]!;
      const current = ascendingBlocks[index]!;

      intervalTotal += Number(current.time) - Number(previous.time);

      intervalCount += 1;
    }

    const minimumHeight = blocks.at(-1)!.height;

    const coinbaseOutputs = await database
      .selectFrom("blocks as block")
      .innerJoin("transactions as tx", "tx.block_hash", "block.hash")
      .innerJoin("transaction_outputs as output", "output.transaction_id", "tx.id")
      .select(["block.hash as block_hash", "output.address"])
      .where("block.active", "=", true)
      .where("block.height", ">=", minimumHeight)
      .where("tx.block_index", "=", 0)
      .execute();

    const addressesByBlock = new Map<string, Set<string>>();

    for (const block of blocks) {
      addressesByBlock.set(block.hash, new Set());
    }

    for (const output of coinbaseOutputs) {
      if (output.address !== null) {
        addressesByBlock.get(output.block_hash)?.add(output.address);
      }
    }

    const payoutCounts = new Map<string | null, number>();

    for (const block of blocks) {
      const addresses = addressesByBlock.get(block.hash);

      const payoutAddress =
        addresses !== undefined && addresses.size === 1 ? [...addresses][0]! : null;

      payoutCounts.set(payoutAddress, (payoutCounts.get(payoutAddress) ?? 0) + 1);
    }

    const payoutGroups = [...payoutCounts.entries()]
      .map(([payoutAddress, blockCount]) => ({
        attribution: payoutAddress === null ? ("unidentified" as const) : ("pseudonymous" as const),
        payoutAddress,
        blocks: blockCount,
        sharePercent: (blockCount * 100) / actualBlocks,
      }))
      .sort((left, right) => right.blocks - left.blocks);

    return {
      chain: {
        indexedHeight: state.tip_height,
        indexedTip: state.tip_hash,
      },

      window: {
        requestedBlocks: window,
        actualBlocks,
      },

      summary: {
        averageDifficulty: totalDifficulty / actualBlocks,
        minimumDifficulty,
        maximumDifficulty,
        averageBlockIntervalSeconds: intervalCount === 0 ? null : intervalTotal / intervalCount,
        averageHashrateHps: observedHashrate(ascendingBlocks[0], ascendingBlocks.at(-1)),
        totalFeesBaseUnits: totalFees.toString(),
        totalSubsidyBaseUnits: totalSubsidy.toString(),
        totalTransactions,
        totalBlockBytes,
        totalBlockWeight,
        averageBlockSizeBytes: totalBlockBytes / actualBlocks,
        averageBlockWeight: totalBlockWeight / actualBlocks,
      },

      payoutGroups,

      history: blocks.map((block) => ({
        height: block.height,
        hash: block.hash,
        time: block.time,
        bits: block.bits,
        target: block.target,
        difficulty: block.difficulty,
        transactionCount: block.tx_count,
        size: block.size,
        weight: block.weight,
        subsidyBaseUnits: block.subsidy_base_units,
        feesBaseUnits: block.total_fee_base_units,
      })),
    };
  });
}
