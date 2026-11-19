// Aplica db/schema.sql no banco do DATABASE_URL.  Uso: DATABASE_URL=... npm run db:migrate
import { readFileSync, existsSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL (ou crie .env.local).')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const statements = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean)

for (const s of statements) await sql.query(s)
console.log(`Schema aplicado (${statements.length} comandos).`)
