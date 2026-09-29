import { sql, type Kysely } from "kysely";

import type { Database } from "@mercatura/database";
import type { MercaturaRpcClient, TransactionInput } from "@mercatura/mercatura-rpc";

import { mcaToBaseUnits } from "./amount.js";

function isCoinbaseInput(
  input: TransactionInput
): input is Extract<TransactionInput, { coinbase: string }> {
  return "coinbase" in input;
}

export async function ingestBlock(
  db: Kysely<Database>,
  rpc: MercaturaRpcClient,
  height: number
): Promise<string> {
  const blockHash = await rpc.getBlockHash(height);
  const block = await rpc.getBlock(blockHash);

  if (block.height !== height) {
    throw new Error(`Block height mismatch: requested ${height}, received ${block.height}`);
  }

  if (block.hash !== blockHash) {
    throw new Error(`Block hash mismatch: requested ${blockHash}, received ${block.hash}`);
  }

  await db.transaction().execute(async (trx) => {
    const state = await trx
      .selectFrom("chain_state")
      .select(["tip_hash", "tip_height"])
      .where("id", "=", 1)
      .executeTakeFirstOrThrow();

    const expectedHeight = state.tip_height === null ? 0 : state.tip_height + 1;

    if (height !== expectedHeight) {
      throw new Error(`Expected next block height ${expectedHeight}, received ${height}`);
    }

    if (height === 0) {
      if (state.tip_hash !== null || state.tip_height !== null) {
        throw new Error("Genesis can only be indexed into an empty chain state");
      }

      if (block.previousblockhash !== undefined) {
        throw new Error("Genesis block unexpectedly has a previous block hash");
      }
    } else {
      if (state.tip_hash === null) {
        throw new Error("Missing indexed tip hash");
      }

      if (block.previousblockhash !== state.tip_hash) {
        throw new Error(
          `Chain continuity failure at height ${height}: expected previous hash ${state.tip_hash}, received ${block.previousblockhash ?? "none"}`
        );
      }
    }

    const existingBlock = await trx
      .selectFrom("blocks")
      .select(["height", "previous_hash", "tx_count", "active"])
      .where("hash", "=", block.hash)
      .executeTakeFirst();

    if (existingBlock !== undefined) {
      const expectedPreviousHash = block.previousblockhash ?? null;

      if (existingBlock.height !== block.height) {
        throw new Error(
          `Stored block ${block.hash} has height ${existingBlock.height}, expected ${block.height}`
        );
      }

      if (existingBlock.previous_hash !== expectedPreviousHash) {
        throw new Error(`Stored block ${block.hash} has unexpected previous hash`);
      }

      if (existingBlock.tx_count !== block.nTx) {
        throw new Error(
          `Stored block ${block.hash} has transaction count ${existingBlock.tx_count}, expected ${block.nTx}`
        );
      }

      if (existingBlock.active) {
        throw new Error(`Block ${block.hash} at height ${block.height} is already active`);
      }

      await trx
        .updateTable("blocks")
        .set({ active: true })
        .where("hash", "=", block.hash)
        .executeTakeFirstOrThrow();
    } else {
      await trx
        .insertInto("blocks")
        .values({
          hash: block.hash,
          height: block.height,
          previous_hash: block.previousblockhash ?? null,
          time: block.time,
          median_time: block.mediantime,
          bits: block.bits,
          target: block.target,
          difficulty: block.difficulty,
          chainwork: block.chainwork,
          tx_count: block.nTx,
          stripped_size: block.strippedsize,
          size: block.size,
          weight: block.weight,
          active: true,
        })
        .execute();

      for (const [blockIndex, tx] of block.tx.entries()) {
        const inserted = await trx
          .insertInto("transactions")
          .values({
            txid: tx.txid,
            wtxid: tx.hash,
            block_hash: block.hash,
            block_index: blockIndex,
            version: tx.version,
            locktime: tx.locktime,
            size: tx.size,
            vsize: tx.vsize,
            weight: tx.weight,
            fee_base_units: tx.fee === undefined ? null : mcaToBaseUnits(tx.fee),
            hex: tx.hex,
          })
          .returning("id")
          .executeTakeFirstOrThrow();

        for (const [vin, input] of tx.vin.entries()) {
          const coinbase = isCoinbaseInput(input);

          await trx
            .insertInto("transaction_inputs")
            .values({
              transaction_id: inserted.id,
              vin,
              prev_txid: coinbase ? null : input.txid,
              prev_vout: coinbase ? null : input.vout,
              sequence: input.sequence,
              coinbase: coinbase ? input.coinbase : null,
              script_sig_asm: coinbase ? null : input.scriptSig.asm,
              script_sig_hex: coinbase ? null : input.scriptSig.hex,
              witness:
                input.txinwitness === undefined
                  ? null
                  : sql<string[]>`${JSON.stringify(input.txinwitness)}::jsonb`,
            })
            .execute();
        }

        for (const output of tx.vout) {
          await trx
            .insertInto("transaction_outputs")
            .values({
              transaction_id: inserted.id,
              vout: output.n,
              value_base_units: mcaToBaseUnits(output.value),
              script_asm: output.scriptPubKey.asm,
              script_desc: output.scriptPubKey.desc,
              script_hex: output.scriptPubKey.hex,
              address: output.scriptPubKey.address ?? null,
              script_type: output.scriptPubKey.type,
            })
            .execute();
        }
      }
    }

    await trx
      .updateTable("chain_state")
      .set({
        tip_hash: block.hash,
        tip_height: block.height,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", 1)
      .executeTakeFirstOrThrow();
  });

  return block.hash;
}
