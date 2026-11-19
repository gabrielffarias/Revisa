import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let client: NeonQueryFunction<false, false> | null = null

function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada')
    client = neon(process.env.DATABASE_URL)
  }
  return client
}

/** Consulta com template string (parâmetros sempre escapados): await q<Linha>`select ... where id = ${id}` */
export async function q<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  return (await db()(strings, ...values)) as T[]
}

/** Várias consultas numa transação só. */
export async function tx(build: (sql: NeonQueryFunction<false, false>) => ReturnType<NeonQueryFunction<false, false>>[]) {
  const sql = db()
  return sql.transaction(build(sql))
}
