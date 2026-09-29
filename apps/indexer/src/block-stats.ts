import type { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

export interface StoredBlockStats {
  block_hash: string;
  subsidy_base_units: number;
  total_fee_base_units: number;
  total_out_base_units: number;
  transaction_count: number;
  input_count: number;
  output_count: number;
  total_size: number;
  total_weight: number;
  utxo_increase: number;
  utxo_increase_actual: number;
}

function requireSafeInteger(name: string, value: number, allowNegative = false): void {
  if (!Number.isSafeInteger(value) || (!allowNegative && value < 0)) {
    throw new Error(`Invalid Mercatura block statistic ${name}: ${value}`);
  }
}

export async function fetchValidatedBlockStats(
  rpc: MercaturaRpcClient,
  blockHash: string,
  height: number,
  transactionCount: number
): Promise<StoredBlockStats> {
  const stats = await rpc.getBlockStats(blockHash);

  if (stats.blockhash !== blockHash) {
    throw new Error(
      `Block stats hash mismatch: requested ${blockHash}, received ${stats.blockhash}`
    );
  }

  if (stats.height !== height) {
    throw new Error(
      `Block stats height mismatch for ${blockHash}: expected ${height}, received ${stats.height}`
    );
  }

  if (stats.txs !== transactionCount) {
    throw new Error(
      `Block stats transaction count mismatch for ${blockHash}: expected ${transactionCount}, received ${stats.txs}`
    );
  }

  requireSafeInteger("subsidy", stats.subsidy);
  requireSafeInteger("totalfee", stats.totalfee);
  requireSafeInteger("total_out", stats.total_out);
  requireSafeInteger("txs", stats.txs);
  requireSafeInteger("ins", stats.ins);
  requireSafeInteger("outs", stats.outs);
  requireSafeInteger("total_size", stats.total_size);
  requireSafeInteger("total_weight", stats.total_weight);
  requireSafeInteger("utxo_increase", stats.utxo_increase, true);
  requireSafeInteger("utxo_increase_actual", stats.utxo_increase_actual, true);

  return {
    block_hash: blockHash,
    subsidy_base_units: stats.subsidy,
    total_fee_base_units: stats.totalfee,
    total_out_base_units: stats.total_out,
    transaction_count: stats.txs,
    input_count: stats.ins,
    output_count: stats.outs,
    total_size: stats.total_size,
    total_weight: stats.total_weight,
    utxo_increase: stats.utxo_increase,
    utxo_increase_actual: stats.utxo_increase_actual,
  };
}
