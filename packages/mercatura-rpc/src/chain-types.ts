export interface ScriptSig {
  asm: string;
  hex: string;
}

export interface ScriptPubKey {
  asm: string;
  desc: string;
  hex: string;
  address?: string;
  type: string;
}

export interface CoinbaseTransactionInput {
  coinbase: string;
  txinwitness?: string[];
  sequence: number;
}

export interface StandardTransactionInput {
  txid: string;
  vout: number;
  scriptSig: ScriptSig;
  txinwitness?: string[];
  sequence: number;
}

export type TransactionInput = CoinbaseTransactionInput | StandardTransactionInput;

export interface TransactionOutput {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

export interface RpcTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: TransactionInput[];
  vout: TransactionOutput[];
  fee?: number;
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface CoinbaseTransactionSummary {
  version: number;
  locktime: number;
  sequence: number;
  coinbase: string;
  witness: string;
}

export interface VerboseBlock {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  target: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash?: string;
  nextblockhash?: string;
  strippedsize: number;
  size: number;
  weight: number;
  coinbase_tx: CoinbaseTransactionSummary;
  tx: RpcTransaction[];
}

export interface BlockStats {
  avgfee: number;
  avgfeerate: number;
  avgtxsize: number;
  blockhash: string;
  feerate_percentiles: number[];
  height: number;
  ins: number;
  maxfee: number;
  maxfeerate: number;
  maxtxsize: number;
  medianfee: number;
  mediantime: number;
  mediantxsize: number;
  minfee: number;
  minfeerate: number;
  mintxsize: number;
  outs: number;
  subsidy: number;
  swtotal_size: number;
  swtotal_weight: number;
  swtxs: number;
  time: number;
  total_out: number;
  total_size: number;
  total_weight: number;
  totalfee: number;
  txs: number;
  utxo_increase: number;
  utxo_size_inc: number;
  utxo_increase_actual: number;
  utxo_size_inc_actual: number;
}
