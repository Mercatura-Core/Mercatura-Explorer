import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("transaction_inputs")
    .addColumn("resolved_prev_transaction_id", "bigint")
    .execute();

  await db.schema
    .alterTable("transaction_inputs")
    .addForeignKeyConstraint(
      "transaction_inputs_resolved_prev_transaction_fk",
      ["resolved_prev_transaction_id"],
      "transactions",
      ["id"],
      (constraint) => constraint.onDelete("set null")
    )
    .execute();

  await db.schema
    .createIndex("transaction_inputs_resolved_prevout_index")
    .on("transaction_inputs")
    .columns(["resolved_prev_transaction_id", "prev_vout"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("transaction_inputs_resolved_prevout_index").ifExists().execute();

  await db.schema
    .alterTable("transaction_inputs")
    .dropConstraint("transaction_inputs_resolved_prev_transaction_fk")
    .execute();

  await db.schema
    .alterTable("transaction_inputs")
    .dropColumn("resolved_prev_transaction_id")
    .execute();
}
