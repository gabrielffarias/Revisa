export type Vehicle = {
  id: string
  nickname: string | null
  plate: string | null
  brand: string
  model: string
  version: string | null
  manufacture_year: number | null
  model_year: number | null
  fuel: string | null
  color: string | null
  fipe_code: string | null
  fipe_amount: number | null
  plan_source: 'padrao' | 'ia' | 'manual'
  plan_summary: string | null
}

export type Reading = { id: string; km: number; read_at: string }

export type Category = 'motor' | 'filtros' | 'freios' | 'suspensao' | 'pneus' | 'arrefecimento' | 'eletrica' | 'transmissao' | 'outros'

export type PlanItem = {
  id: string
  name: string
  category: Category
  interval_km: number | null
  interval_months: number | null
  notes: string | null
  source: 'padrao' | 'ia' | 'manual' | 'usuario'
  position: number
}

export type PlanDraftItem = Pick<PlanItem, 'name' | 'category' | 'interval_km' | 'interval_months' | 'notes'>

export type Service = {
  id: string
  plan_item_id: string | null
  title: string
  done_at: string
  km: number | null
  cost: number | null
  shop: string | null
  notes: string | null
}

export const CATEGORIES: Record<Category, string> = {
  motor: 'Motor',
  filtros: 'Filtros',
  freios: 'Freios',
  suspensao: 'Suspensão',
  pneus: 'Pneus e rodas',
  arrefecimento: 'Arrefecimento',
  eletrica: 'Elétrica',
  transmissao: 'Transmissão',
  outros: 'Outros',
}

export const vehicleName = (v: Pick<Vehicle, 'nickname' | 'brand' | 'model' | 'model_year'>) =>
  v.nickname || `${titleCase(v.brand)} ${titleCase(v.model)}${v.model_year ? ` ${v.model_year}` : ''}`

export function titleCase(s: string) {
  if (!s) return s
  // só mexe em texto todo maiúsculo (como vem da consulta de placa); preserva siglas curtas (VW, GM, 16V)
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .split(/(\s+|\/|-)/)
    .map((w) => (/^\d/.test(w) || w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
}
