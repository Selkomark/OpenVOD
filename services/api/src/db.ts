import { Kysely, PostgresDialect } from 'kysely'
import pkg from 'pg'
const { Pool } = pkg

import type { Database } from './db/types'

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres'
    })
  })
})
