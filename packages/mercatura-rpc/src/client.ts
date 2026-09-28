import { type BlockStats, type RpcTransaction, type VerboseBlock } from "./chain-types.js";

import {
  MercaturaRpcError,
  type BlockchainInfo,
  type MempoolInfo,
  type MiningInfo,
  type NetworkInfo,
  type RpcClientOptions,
  type RpcResponse,
} from "./types.js";

export class MercaturaRpcClient {
  private readonly url: string;
  private readonly authorization: string;
  private nextRequestId = 1;

  constructor(options: RpcClientOptions) {
    this.url = options.url;

    const credentials = `${options.credentials.username}:${options.credentials.password}`;

    this.authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  async call<T>(method: string, params: readonly unknown[] = []): Promise<T> {
    const id = this.nextRequestId++;

    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        authorization: this.authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mercatura RPC HTTP error ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as RpcResponse<T>;

    if (body.error != null) {
      throw new MercaturaRpcError(body.error.code, body.error.message);
    }

    if (body.result == null) {
      throw new Error(`Mercatura RPC method ${method} returned a null result`);
    }

    return body.result;
  }

  getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.call<BlockchainInfo>("getblockchaininfo");
  }

  getNetworkInfo(): Promise<NetworkInfo> {
    return this.call<NetworkInfo>("getnetworkinfo");
  }

  getMiningInfo(): Promise<MiningInfo> {
    return this.call<MiningInfo>("getmininginfo");
  }

  getMempoolInfo(): Promise<MempoolInfo> {
    return this.call<MempoolInfo>("getmempoolinfo");
  }

  getBlockCount(): Promise<number> {
    return this.call<number>("getblockcount");
  }

  getBlockHash(height: number): Promise<string> {
    return this.call<string>("getblockhash", [height]);
  }

  getBlock(hash: string): Promise<VerboseBlock> {
    return this.call<VerboseBlock>("getblock", [hash, 2]);
  }

  getRawTransaction(txid: string, blockHash?: string): Promise<RpcTransaction> {
    const params: unknown[] = [txid, true];

    if (blockHash !== undefined) {
      params.push(blockHash);
    }

    return this.call<RpcTransaction>("getrawtransaction", params);
  }

  getBlockStats(block: number | string): Promise<BlockStats> {
    return this.call<BlockStats>("getblockstats", [block]);
  }
}
