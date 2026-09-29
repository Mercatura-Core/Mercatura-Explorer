export interface RpcCredentials {
  username: string;
  password: string;
}

export interface RpcClientOptions {
  url: string;
  credentials: RpcCredentials;
}

export interface RpcErrorData {
  code: number;
  message: string;
}

export interface RpcResponse<T> {
  result?: T | null;
  error?: RpcErrorData | null;
  id?: number | string | null;
}

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  bits: string;
  target: string;
  difficulty: number;
  time: number;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  chainwork: string;
  size_on_disk: number;
  pruned: boolean;
  warnings: string[];
}

export interface NetworkDefinition {
  name: string;
  limited: boolean;
  reachable: boolean;
  proxy: string;
  proxy_randomize_credentials: boolean;
}

export interface LocalAddress {
  address: string;
  port: number;
  score: number;
}

export interface NetworkInfo {
  version: number;
  subversion: string;
  protocolversion: number;
  localservices: string;
  localservicesnames: string[];
  localrelay: boolean;
  timeoffset: number;
  networkactive: boolean;
  connections: number;
  connections_in: number;
  connections_out: number;
  networks: NetworkDefinition[];
  relayfee: number;
  incrementalfee: number;
  localaddresses: LocalAddress[];
  warnings: string[];
}

export interface NextMiningInfo {
  height: number;
  bits: string;
  difficulty: number;
  target: string;
}

export interface MiningInfo {
  blocks: number;
  currentblockweight: number;
  currentblocktx: number;
  bits: string;
  difficulty: number;
  target: string;
  networkhashps: number;
  pooledtx: number;
  blockmintxfee: number;
  chain: string;
  next: NextMiningInfo;
  warnings: string[];
}

export interface MempoolInfo {
  loaded: boolean;
  size: number;
  bytes: number;
  usage: number;
  total_fee: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
  incrementalrelayfee: number;
  unbroadcastcount: number;
  fullrbf: boolean;
  permitbaremultisig: boolean;
  maxdatacarriersize: number;
  limitclustercount: number;
  limitclustersize: number;
  optimal: boolean;
}

export class MercaturaRpcError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "MercaturaRpcError";
    this.code = code;
  }
}

export interface PeerInfo {
  id: number;
  addr: string;
  network: string;
  services: string;
  servicesnames: string[];
  relaytxes: boolean;
  lastsend: number;
  lastrecv: number;
  last_transaction: number;
  last_block: number;
  bytessent: number;
  bytesrecv: number;
  conntime: number;
  timeoffset: number;
  pingtime?: number;
  minping?: number;
  version: number;
  subver: string;
  inbound: boolean;
  presynced_headers: number;
  synced_headers: number;
  synced_blocks: number;
  addr_relay_enabled: boolean;
  addr_processed: number;
  addr_rate_limited: number;
  permissions: string[];
  minfeefilter: number;
  connection_type: string;
  transport_protocol_type: string;
  session_id: string;
  mapped_as?: number;
}

export interface NodeAddress {
  time: number;
  services: number;
  address: string;
  port: number;
  network: string;
}

export interface AddrManNetworkInfo {
  new: number;
  tried: number;
  total: number;
}

export type AddrManInfo = Record<string, AddrManNetworkInfo>;
