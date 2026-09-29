import type { FastifyInstance } from "fastify";

import type { MercaturaRpcClient } from "@mercatura/mercatura-rpc";

export type CoreStatusRpc = Pick<
  MercaturaRpcClient,
  "getBlockchainInfo" | "getNetworkInfo" | "getMiningInfo" | "getMempoolInfo"
>;

export function registerCoreStatusRoutes(app: FastifyInstance, getRpc: () => CoreStatusRpc): void {
  app.get("/api/v1/core/status", async () => {
    const rpc = getRpc();

    const [blockchain, network, mining, mempool] = await Promise.all([
      rpc.getBlockchainInfo(),
      rpc.getNetworkInfo(),
      rpc.getMiningInfo(),
      rpc.getMempoolInfo(),
    ]);

    return {
      blockchain: {
        chain: blockchain.chain,
        blocks: blockchain.blocks,
        headers: blockchain.headers,
        bestBlockHash: blockchain.bestblockhash,
        bits: blockchain.bits,
        target: blockchain.target,
        difficulty: blockchain.difficulty,
        time: blockchain.time,
        medianTime: blockchain.mediantime,
        verificationProgress: blockchain.verificationprogress,
        initialBlockDownload: blockchain.initialblockdownload,
        chainwork: blockchain.chainwork,
        sizeOnDisk: blockchain.size_on_disk,
        pruned: blockchain.pruned,
        warnings: blockchain.warnings,
      },

      network: {
        version: network.version,
        subversion: network.subversion,
        protocolVersion: network.protocolversion,
        networkActive: network.networkactive,
        connections: network.connections,
        connectionsIn: network.connections_in,
        connectionsOut: network.connections_out,
        relayFee: network.relayfee,
        incrementalFee: network.incrementalfee,
        warnings: network.warnings,
      },

      mining: {
        blocks: mining.blocks,
        currentBlockWeight: mining.currentblockweight,
        currentBlockTransactions: mining.currentblocktx,
        bits: mining.bits,
        difficulty: mining.difficulty,
        target: mining.target,
        networkHashPerSecond: mining.networkhashps,
        pooledTransactions: mining.pooledtx,
        blockMinTxFee: mining.blockmintxfee,
        chain: mining.chain,
        next: {
          height: mining.next.height,
          bits: mining.next.bits,
          difficulty: mining.next.difficulty,
          target: mining.next.target,
        },
        warnings: mining.warnings,
      },

      mempool: {
        loaded: mempool.loaded,
        size: mempool.size,
        bytes: mempool.bytes,
        usage: mempool.usage,
        totalFee: mempool.total_fee,
        maxMempool: mempool.maxmempool,
        mempoolMinFee: mempool.mempoolminfee,
        minRelayTxFee: mempool.minrelaytxfee,
        incrementalRelayFee: mempool.incrementalrelayfee,
        unbroadcastCount: mempool.unbroadcastcount,
        fullRbf: mempool.fullrbf,
        optimal: mempool.optimal,
      },
    };
  });
}
