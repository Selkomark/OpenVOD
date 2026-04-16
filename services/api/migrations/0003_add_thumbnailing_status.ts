import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Add THUMBNAILING into the video_status enum natively safely mapping lifecycle
  await sql`ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'THUMBNAILING' AFTER 'PACKAGED'`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Enum values cannot be dropped natively in Postgres safely within a transaction
  console.warn("Cannot rollback enum ADD VALUE dynamically without a full recreation block!");
}
