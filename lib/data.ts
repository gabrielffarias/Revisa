import 'server-only'
import { q } from './db'
import { DEFAULT_PLAN } from './defaultPlan'
import type { PlanDraftItem, PlanItem, Reading, Service } from './types'

export async function readingsOf(vehicleId: string) {
  return q<Reading>`select id, km, to_char(read_at, 'YYYY-MM-DD') as read_at from odometer_readings
    where vehicle_id = ${vehicleId} order by read_at desc, km desc`
}

export async function servicesOf(vehicleId: string) {
  return q<Service>`select id, plan_item_id, title, to_char(done_at, 'YYYY-MM-DD') as done_at, km, cost::float8 as cost, shop, notes
    from services where vehicle_id = ${vehicleId} order by done_at desc, km desc nulls last, created_at desc`
}

export async function planOf(vehicleId: string) {
  return q<PlanItem>`select id, name, category, interval_km, interval_months, notes, source, position
    from plan_items where vehicle_id = ${vehicleId} order by position, created_at`
}

export async function vehicleData(vehicleId: string) {
  const [readings, services, items] = await Promise.all([readingsOf(vehicleId), servicesOf(vehicleId), planOf(vehicleId)])
  return { readings, services, items }
}

export async function insertPlan(vehicleId: string, items: PlanDraftItem[], source: PlanItem['source'], startPos = 0) {
  if (!items.length) return
  const payload = JSON.stringify(items.map((i, n) => ({ ...i, position: startPos + n })))
  await q`insert into plan_items (vehicle_id, name, category, interval_km, interval_months, notes, source, position)
    select ${vehicleId}, x.name, x.category, x.interval_km, x.interval_months, x.notes, ${source}, x.position
    from jsonb_to_recordset(${payload}::jsonb) as x(name text, category text, interval_km int, interval_months int, notes text, position int)`
}

export const insertDefaultPlan = (vehicleId: string) => insertPlan(vehicleId, DEFAULT_PLAN, 'padrao')

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a', 'os', 'as', 'troca', 'substituicao', 'verificacao', 'inspecao'])
const key = (s: string) =>
  norm(s)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .slice(0, 2)
    .join(' ')

/**
 * Troca o plano por um novo sem perder o histórico: itens com o mesmo nome (ou mesma ideia)
 * são atualizados no lugar, os serviços continuam ligados a eles. Itens criados pelo usuário ficam.
 */
export async function replacePlan(vehicleId: string, draft: PlanDraftItem[], source: 'ia' | 'manual' | 'padrao') {
  const current = await planOf(vehicleId)
  const replaceable = current.filter((i) => i.source !== 'usuario')
  const used = new Set<string>()
  const toInsert: PlanDraftItem[] = []
  const updates: { id: string; d: PlanDraftItem; pos: number }[] = []

  draft.forEach((d, pos) => {
    const match =
      replaceable.find((i) => !used.has(i.id) && norm(i.name) === norm(d.name)) ??
      replaceable.find((i) => !used.has(i.id) && i.category === d.category && key(i.name) === key(d.name))
    if (match) {
      used.add(match.id)
      updates.push({ id: match.id, d, pos })
    } else toInsert.push({ ...d, position: pos } as PlanDraftItem & { position: number })
  })

  const removeIds = replaceable.filter((i) => !used.has(i.id)).map((i) => i.id)
  for (const u of updates) {
    await q`update plan_items set name = ${u.d.name}, category = ${u.d.category}, interval_km = ${u.d.interval_km},
      interval_months = ${u.d.interval_months}, notes = ${u.d.notes}, source = ${source}, position = ${u.pos} where id = ${u.id}`
  }
  if (removeIds.length) await q`delete from plan_items where id = any(${removeIds}::uuid[])`
  if (toInsert.length) {
    const payload = JSON.stringify(toInsert)
    await q`insert into plan_items (vehicle_id, name, category, interval_km, interval_months, notes, source, position)
      select ${vehicleId}, x.name, x.category, x.interval_km, x.interval_months, x.notes, ${source}, x.position
      from jsonb_to_recordset(${payload}::jsonb) as x(name text, category text, interval_km int, interval_months int, notes text, position int)`
  }
  // itens do usuário vão para o fim da lista
  await q`update plan_items set position = 1000 + position where vehicle_id = ${vehicleId} and source = 'usuario' and position < 1000`
}
