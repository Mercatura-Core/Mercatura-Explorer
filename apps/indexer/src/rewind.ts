import { sql, type Kysely } from "kysely";

import type { Database } from "@mercatura/database";

import type { CommonAncestor } from "./common-ancestor.js";

export async function rewindToCommonAncestor(
  db: Kysely<Database>,
  ancestor: CommonAncestor
): Promise<number> {
  return db.transaction().execute(async (trx) => {
    const state = await trx
      .selectFrom("chain_state")
      .select(["tip_height", "tip_hash"])
      .where("id", "=", 1)
      .forUpdate()
      .executeTakeFirstOrThrow();

    if (state.tip_height === null || state.tip_hash === null) {
      throw new Error("Cannot rewind an empty explorer chain");
    }

    if (ancestor.height > state.tip_height) {
      throw new Error(
        `Cannot rewind from height ${state.tip_height} forward to ${ancestor.height}`
      );
    }

    const activeAncestor = await trx
      .selectFrom("blocks")
      .select("hash")
      .where("height", "=", ancestor.height)
      .where("active", "=", true)
      .executeTakeFirst();

    if (activeAncestor === undefined) {
      throw new Error(`No active indexed block exists at ancestor height ${ancestor.height}`);
    }

    if (activeAncestor.hash !== ancestor.hash) {
      throw new Error(
        `Ancestor hash mismatch at height ${ancestor.height}: expected ${ancestor.hash}, found ${activeAncestor.hash}`
      );
    }

    if (state.tip_height === ancestor.height) {
      if (state.tip_hash !== ancestor.hash) {
        throw new Error(
          `chain_state tip hash does not match ancestor hash at height ${ancestor.height}`
        );
      }

      return 0;
    }

    const rewoundBlocks = state.tip_height - ancestor.height;

    await trx
      .updateTable("blocks")
      .set({ active: false })
      .where("active", "=", true)
      .where("height", ">", ancestor.height)
      .execute();

    await trx
      .updateTable("chain_state")
      .set({
        tip_height: ancestor.height,
        tip_hash: ancestor.hash,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where("id", "=", 1)
      .executeTakeFirstOrThrow();

    return rewoundBlocks;
  });
}
