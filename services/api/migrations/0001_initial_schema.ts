import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Create enum for video statuses
  await db.schema
    .createType('video_status')
    .asEnum(['UPLOADED', 'TRANSCODING', 'TRANSCODED', 'PACKAGING', 'PACKAGED', 'READY_TO_PUBLISH', 'PUBLISHED'])
    .execute()

  await db.schema
    .createTable('videos')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('filename', 'varchar(255)', (col) => col.notNull())
    .addColumn('gcs_path', 'text', (col) => col.notNull())
    .addColumn('size_bytes', 'bigint', (col) => col.notNull())
    .addColumn('resolution', 'varchar(50)')
    .addColumn('metadata', 'jsonb', (col) => col.defaultTo('{}').notNull())
    .addColumn('status', sql`video_status`, (col) => col.defaultTo('UPLOADED').notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute()

  await db.schema
    .createTable('pipeline_history')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('video_id', 'uuid', (col) => col.references('videos.id').onDelete('cascade').notNull())
    .addColumn('status', sql`video_status`, (col) => col.notNull())
    .addColumn('timestamp', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('details', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pipeline_history').execute()
  await db.schema.dropTable('videos').execute()
  await db.schema.dropType('video_status').execute()
}
