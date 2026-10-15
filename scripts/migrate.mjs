// Aplica db/schema.sql contra a base de dados indicada em DATABASE_URL.
// Uso: npm run db:migrate
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL não está definida. Configure-a em .env.local (ver .env.example).')
    process.exit(1)
  }

  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf-8')

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: true },
  })

  await client.connect()
  try {
    console.log('A aplicar db/schema.sql...')
    await client.query(sql)
    console.log('Esquema aplicado com sucesso.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Erro ao aplicar o esquema:', err.message)
  process.exit(1)
})
