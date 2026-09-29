import type { FastifyInstance } from "fastify";

import { createDatabase } from "@mercatura/database";

type ExplorerDatabase = ReturnType<typeof createDatabase>;

type MiningWindow = 144 | 1000 | 4032;

function parseWindow(value: string | undefined): MiningWindow {
  if (value === undefined) {
    return 144;
  }

  const window = Number(value);

  if (window === 144 || window === 1000 || window === 4032) {
    return window;
  }

  throw new Error("window must be one of 144, 1000, or 4032");
}

export function registerMiningRoutes(app: FastifyInstance, database: ExplorerDatabase): void {
  app.get<{
    Querystring: {
      window?: string;
    };
  }>("/api/v1/mining", async (request, reply) => {
    let window: MiningWindow;

    try {
      window = parseWindow(request.query.window);
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

    const blocks = await database
      .selectFrom("blocks as block")
      .innerJoin("block_stats as stats", "stats.block_hash", "block.hash")
      .select([
        "block.hash",
        "block.height",
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
