// Regras do plano: média de km/dia, km atual estimado e situação de cada item.
// Puro (sem banco): usado nas páginas e no agendamento de notificações.
import type { PlanItem, Reading, Service } from './types'

export type Status = 'vencido' | 'proximo' | 'ok' | 'sem-registro'

export type KmStats = {
  lastKm: number | null // última km informada (leitura ou serviço)
  lastAt: string | null
  avgPerDay: number | null
  estimated: number | null // km estimada para hoje, pela média
  daysSinceReading: number | null // dias desde a última leitura do odômetro
}

export type ItemStatus = {
  item: PlanItem
  status: Status
  last: Service | null
  dueKm: number | null
  dueDate: string | null
  kmLeft: number | null
  daysLeft: number | null
  estDate: string | null // quando deve vencer (o que vier primeiro: km pela média ou data)
  progress: number | null // 0..1 do intervalo já consumido
}

const DAY = 86400000
const toUTC = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
export const diffDays = (from: string, to: string) => Math.round((toUTC(to) - toUTC(from)) / DAY)
export const addDays = (iso: string, n: number) => new Date(toUTC(iso) + n * DAY).toISOString().slice(0, 10)

export function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(d, lastDay))
  return first.toISOString().slice(0, 10)
}

/** Média de km/dia usando leituras e serviços com km, olhando até 1 ano para trás. */
export function kmStats(readings: Pick<Reading, 'km' | 'read_at'>[], services: Pick<Service, 'km' | 'done_at'>[], today = todayISO()): KmStats {
  const points = [
    ...readings.map((r) => ({ km: r.km, at: r.read_at })),
    ...services.filter((s) => s.km != null).map((s) => ({ km: s.km as number, at: s.done_at })),
  ].sort((a, b) => (a.at === b.at ? a.km - b.km : a.at < b.at ? -1 : 1))

  const lastReading = [...readings].sort((a, b) => (a.read_at < b.read_at ? 1 : -1))[0]
  const daysSinceReading = lastReading ? diffDays(lastReading.read_at, today) : null
  if (!points.length) return { lastKm: null, lastAt: null, avgPerDay: null, estimated: null, daysSinceReading }

  // a maior km é a mais confiável como "última" (alguém pode registrar um serviço antigo depois)
  const last = points.reduce((a, b) => (b.km > a.km || (b.km === a.km && b.at > a.at) ? b : a))
  const windowStart = addDays(last.at, -365)
  let used = points.filter((p) => p.at >= windowStart && p.at <= last.at)
  if (used.length < 2) used = points.filter((p) => p.at <= last.at)
  const first = used[0]
  const span = diffDays(first.at, last.at)

  let avgPerDay: number | null = null
  if (used.length >= 2 && span >= 7 && last.km > first.km) avgPerDay = (last.km - first.km) / span

  const since = Math.max(0, diffDays(last.at, today))
  const estimated = avgPerDay ? Math.round(last.km + avgPerDay * since) : last.km
  return { lastKm: last.km, lastAt: last.at, avgPerDay, estimated, daysSinceReading }
}

export function itemStatus(item: PlanItem, services: Service[], km: KmStats, today = todayISO()): ItemStatus {
  const last =
    services
      .filter((s) => s.plan_item_id === item.id)
      .sort((a, b) => (a.done_at === b.done_at ? (b.km ?? 0) - (a.km ?? 0) : a.done_at < b.done_at ? 1 : -1))[0] ?? null

  const base: ItemStatus = { item, status: 'sem-registro', last, dueKm: null, dueDate: null, kmLeft: null, daysLeft: null, estDate: null, progress: null }
  if (!last) return base

  const cur = km.estimated
  const dueKm = item.interval_km && last.km != null ? last.km + item.interval_km : null
  const dueDate = item.interval_months ? addMonths(last.done_at, item.interval_months) : null
  if (dueKm == null && dueDate == null) return base

  const kmLeft = dueKm != null && cur != null ? dueKm - cur : null
  const daysLeft = dueDate ? diffDays(today, dueDate) : null
  const byKm = kmLeft != null && km.avgPerDay ? addDays(today, Math.max(0, Math.round(kmLeft / km.avgPerDay))) : null
  const estDate = [dueDate, byKm].filter(Boolean).sort()[0] ?? null

  const parts: number[] = []
  if (kmLeft != null && item.interval_km) parts.push(1 - kmLeft / item.interval_km)
  if (daysLeft != null && item.interval_months) parts.push(1 - daysLeft / (item.interval_months * 30.44))
  const progress = parts.length ? Math.min(1, Math.max(0, Math.max(...parts))) : null

  let status: Status = 'ok'
  if ((kmLeft != null && kmLeft <= 0) || (daysLeft != null && daysLeft <= 0)) status = 'vencido'
  else if (
    (kmLeft != null && item.interval_km && kmLeft <= Math.max(500, item.interval_km * 0.1)) ||
    (estDate && diffDays(today, estDate) <= 30)
  )
    status = 'proximo'

  return { ...base, status, dueKm, dueDate, kmLeft, daysLeft, estDate, progress }
}

const ORDER: Record<Status, number> = { vencido: 0, proximo: 1, 'sem-registro': 2, ok: 3 }

export function planStatus(items: PlanItem[], services: Service[], km: KmStats, today = todayISO()) {
  return items
    .map((i) => itemStatus(i, services, km, today))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.estDate ?? '9999').localeCompare(b.estDate ?? '9999') || a.item.position - b.item.position)
}

export const fmtKm = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n).toLocaleString('pt-BR')} km`)
export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—')
export const fmtMoney = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

export function intervalLabel(i: Pick<PlanItem, 'interval_km' | 'interval_months'>) {
  const km = i.interval_km ? `${i.interval_km.toLocaleString('pt-BR')} km` : null
  const t = i.interval_months ? (i.interval_months % 12 === 0 ? `${i.interval_months / 12} ano${i.interval_months > 12 ? 's' : ''}` : `${i.interval_months} meses`) : null
  if (km && t) return `A cada ${km} ou ${t}`
  return `A cada ${km ?? t ?? '—'}`
}
