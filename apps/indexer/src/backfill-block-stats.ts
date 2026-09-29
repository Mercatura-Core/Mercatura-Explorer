import { createDatabase } from "@mercatura/database";
import { createRpcClient } from "@mercatura/mercatura-rpc";

import { fetchValidatedBlockStats } from "./block-stats.js";

const db = createDatabase();
const rpc = createRpcClient();

try {
  const blocks = await db
    .selectFrom("blocks")
    .select(["hash", "height", "tx_count"])
    .orderBy("height", "asc")
    .execute();

  let completed = 0;

  for (const block of blocks) {
    const stats = await fetchValidatedBlockStats(rpc, block.hash, block.height, block.tx_count);

    await db
      .insertInto("block_stats")
      .values(stats)
      .onConflict((conflict) =>
        conflict.column("block_hash").doUpdateSet({
          subsidy_base_units: stats.subsidy_base_units,
          total_fee_base_units: stats.total_fee_base_units,
          total_out_base_units: stats.total_out_base_units,
          transaction_count: stats.transaction_count,
          input_count: stats.input_count,
          output_count: stats.output_count,
          total_size: stats.total_size,
          total_weight: stats.total_weight,
          utxo_increase: stats.utxo_increase,
          utxo_increase_actual: stats.utxo_increase_actual,
        })
      )
      .execute();

    completed += 1;
  }

  console.log(`Backfilled block stats for ${completed} blocks`);
} finally {
  await db.destroy();
}
