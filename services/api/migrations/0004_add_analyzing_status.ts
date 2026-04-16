import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'ANALYZING' AFTER 'UPLOADED'`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  console.warn("Cannot rollback enum ADD VALUE dynamically without a full recreation block!");
}
