import 'server-only'
import { q } from './db'

// API: https://consultadeplaca.net/desenvolvedores — consulta básica paga por placa, FIPE grátis.
const BASE = 'https://consultadeplaca.net/api/v1'

export type FipeVersion = { code: string; version: string; amount: number | null; fuel: string | null; score: number | null }

export type PlateVehicle = {
  plate: string
  brand: string
  model: string | null
  version: string | null
  manufacture_year: number | null
  model_year: number | null
  color: string | null
  fuel: string | null
  type: string | null
  city: string | null
  state: string | null
  fipe_code: string | null
  fipe_amount: number | null
  fipe_versions: FipeVersion[]
}

export type PlateResult = { ok: true; vehicle: PlateVehicle | null } | { ok: false; error: string }

export const normalizePlate = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, '')
export const validPlate = (p: string) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)

const num = (v: unknown) => (v == null || v === '' ? null : Number(v))

function headers(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${process.env.CONSULTA_PLACA_KEY}`, Accept: 'application/json', ...extra }
}

const ERRORS: Record<string, string> = {
  insufficient_balance: 'Sem saldo na conta da consulta de placa.',
  test_plate_required: 'A chave de teste só aceita as placas TST0001, TST0002 e TST0003.',
  invalid_api_key: 'Chave da consulta de placa inválida.',
  missing_api_key: 'Chave da consulta de placa não configurada.',
  rate_limited: 'Muitas consultas seguidas. Tente de novo em instantes.',
  daily_limit_exceeded: 'Limite diário de consultas atingido.',
  service_unavailable: 'Serviço de consulta fora do ar agora (nada foi cobrado). Tente mais tarde ou cadastre manualmente.',
  validation_failed: 'Placa inválida.',
}

export async function lookupPlate(raw: string): Promise<PlateResult> {
  const plate = normalizePlate(raw)
  if (!validPlate(plate)) return { ok: false, error: 'Placa inválida. Use o formato ABC1234 ou ABC1D23.' }

  // cache: a mesma placa não é paga duas vezes
  const [cached] = await q<{ found: boolean; data: PlateVehicle | null }>`
    select found, data from plate_lookups where plate = ${plate} and created_at > now() - interval '365 days'`
  if (cached) return { ok: true, vehicle: cached.found ? cached.data : null }

  if (!process.env.CONSULTA_PLACA_KEY) return { ok: false, error: 'Consulta por placa não configurada (CONSULTA_PLACA_KEY). Cadastre manualmente.' }

  let res: Response
  try {
    res = await fetch(`${BASE}/lookups`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }),
      body: JSON.stringify({ plate }),
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, error: 'Não consegui falar com o serviço de consulta. Tente de novo.' }
  }

  const body = (await res.json().catch(() => null)) as Record<string, any> | null
  if (!res.ok || !body) {
    const code = body?.code as string | undefined
    return { ok: false, error: (code && ERRORS[code]) || body?.detail || `Erro na consulta (${res.status}).` }
  }

  const v = body.vehicle as Record<string, any> | null
  const vehicle: PlateVehicle | null =
    body.result === 'found' && v
      ? {
          plate,
          brand: v.brand ?? '',
          model: v.model ?? null,
          version: v.version ?? null,
          manufacture_year: num(v.manufacture_year),
          model_year: num(v.model_year),
          color: v.color ?? null,
          fuel: v.fuel ?? null,
          type: v.type ?? null,
          city: v.city ?? null,
          state: v.state ?? null,
          fipe_code: v.fipe?.code ?? null,
          fipe_amount: num(v.fipe?.amount),
          fipe_versions: ((v.fipe?.versions ?? []) as Record<string, any>[]).map((x) => ({
            code: x.code,
            version: x.version,
            amount: num(x.amount),
            fuel: x.fuel ?? null,
            score: num(x.score),
          })),
        }
      : null

  await q`insert into plate_lookups (plate, found, data) values (${plate}, ${!!vehicle}, ${vehicle ? JSON.stringify(vehicle) : null}::jsonb)
    on conflict (plate) do update set found = excluded.found, data = excluded.data, created_at = now()`
  return { ok: true, vehicle }
}

export type FipeModel = { fipe_code: string; brand: string; name: string; years: { year: number | null; zero_km: boolean; fuel: string | null }[] }

/** Busca de modelos na Tabela FIPE (grátis na mesma API). */
export async function searchFipe(text: string, year?: number | null): Promise<{ ok: true; models: FipeModel[] } | { ok: false; error: string }> {
  const term = text.trim().slice(0, 60)
  if (term.length < 2) return { ok: true, models: [] }
  if (!process.env.CONSULTA_PLACA_KEY) return { ok: false, error: 'Busca FIPE não configurada. Preencha os dados à mão.' }
  const params = new URLSearchParams({ q: term, type: 'car', limit: '12' })
  if (year) params.set('year', String(year))
  try {
    const res = await fetch(`${BASE}/fipe/models?${params}`, { headers: headers(), signal: AbortSignal.timeout(15000), next: { revalidate: 86400 } })
    if (!res.ok) return { ok: false, error: `Busca FIPE falhou (${res.status}).` }
    const body = (await res.json()) as { data?: Record<string, any>[] }
    return {
      ok: true,
      models: (body.data ?? []).map((m) => ({
        fipe_code: m.fipe_code,
        brand: m.brand?.name ?? '',
        name: m.name,
        years: ((m.years ?? []) as Record<string, any>[]).map((y) => ({ year: num(y.year), zero_km: !!y.zero_km, fuel: y.fuel ?? null })),
      })),
    }
  } catch {
    return { ok: false, error: 'Busca FIPE indisponível agora.' }
  }
}
