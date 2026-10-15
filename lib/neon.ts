import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não está definida. Configure a ligação à Neon DB em .env.local (ver .env.example).'
    )
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: true },
  })
}

// Reutiliza o pool entre hot-reloads em desenvolvimento para não esgotar ligações à Neon.
const pool = global.__pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool
}

export const db = drizzle(pool, { schema })
