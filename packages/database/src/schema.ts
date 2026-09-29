import type { ColumnType, Generated } from "kysely";

export type Int8 = ColumnType<string, string | number, string | number>;

export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface BlocksTable {
  hash: string;
  height: number;
  previous_hash: string | null;
  time: Int8;
  median_time: Int8;
  bits: string;
  target: string;
  difficulty: number;
  chainwork: string;
  tx_count: number;
  stripped_size: number;
  size: number;
  weight: number;
  active: ColumnType<boolean, boolean | undefined, boolean>;
}

export interface TransactionsTable {
  id: Generated<string>;
  txid: string;
  wtxid: string;
  block_hash: string;
  block_index: number;
  version: number;
  locktime: Int8;
  size: number;
  vsize: number;
  weight: number;
  fee_base_units: Int8 | null;
  hex: string;
}

export interface TransactionInputsTable {
  transaction_id: Int8;
  vin: number;
  prev_txid: string | null;
  prev_vout: number | null;
  resolved_prev_transaction_id: Int8 | null;
  sequence: Int8;
  coinbase: string | null;
  script_sig_asm: string | null;
  script_sig_hex: string | null;
  witness: string[] | null;
}

export interface TransactionOutputsTable {
  transaction_id: Int8;
  vout: number;
  value_base_units: Int8;
  script_asm: string;
  script_desc: string;
  script_hex: string;
  address: string | null;
  script_type: string;
}

export interface ChainStateTable {
  id: number;
  tip_hash: string | null;
  tip_height: number | null;
  updated_at: Timestamp;
}

export interface ActiveUtxosView {
  transaction_id: string;
  txid: string;
  vout: number;
  value_base_units: Int8;
  script_asm: string;
  script_desc: string;
  script_hex: string;
  address: string | null;
  script_type: string;
  block_hash: string;
  block_height: number;
  block_time: Int8;
  is_coinbase: boolean;
}

export interface ActiveAddressTransactionsView {
  address: string;
  transaction_id: string;
  txid: string;
  block_hash: string;
  block_height: number;
  block_time: Int8;
  block_index: number;
  received_base_units: Int8;
  spent_base_units: Int8;
  net_base_units: Int8;
}

export interface ActiveAddressBalancesView {
  address: string;
  transaction_count: Int8;
  total_received_base_units: Int8;
  total_spent_base_units: Int8;
  balance_base_units: Int8;
  utxo_count: Int8;
}

export interface Database {
  blocks: BlocksTable;
  transactions: TransactionsTable;
  transaction_inputs: TransactionInputsTable;
  transaction_outputs: TransactionOutputsTable;
  active_utxos: ActiveUtxosView;
  active_address_transactions: ActiveAddressTransactionsView;
  active_address_balances: ActiveAddressBalancesView;
  chain_state: ChainStateTable;
}
