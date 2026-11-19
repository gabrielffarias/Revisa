'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { q } from '@/lib/db'
import { currentUserId, ownVehicle } from '@/lib/auth'
import { insertDefaultPlan, replacePlan } from '@/lib/data'
import { DEFAULT_PLAN } from '@/lib/defaultPlan'
import { generatePlan, type PlanDraft } from '@/lib/ai'
import { lookupPlate, searchFipe, normalizePlate } from '@/lib/placa'
import { VEHICLE_COOKIE } from '@/lib/session'
import { todayISO } from '@/lib/maintenance'
import { CATEGORIES, type Category, type PlanDraftItem, type Vehicle } from '@/lib/types'

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined

async function uid() {
  const id = await currentUserId()
  if (!id) redirect('/login')
  return id
}

const str = (f: FormData, k: string, max = 200) => {
  const v = String(f.get(k) ?? '').trim()
  return v ? v.slice(0, max) : null
}
const int = (f: FormData, k: string) => {
  const raw = String(f.get(k) ?? '').replace(/\D/g, '')
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}
const money = (f: FormData, k: string) => {
  const raw = String(f.get(k) ?? '').trim()
  if (!raw) return null
  // aceita "1.234,56", "1234,56" e "1234.56"
  const n = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}
const date = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '')
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= todayISO() ? v : todayISO()
}

function refresh() {
  revalidatePath('/', 'layout')
}

/* ---------- carro ---------- */

export async function consultarPlaca(plate: string) {
  await uid()
  return lookupPlate(plate)
}

export async function buscarFipe(text: string, year: number | null) {
  await uid()
  return searchFipe(text, year)
}

export async function criarVeiculo(_: FormState, f: FormData): Promise<FormState> {
  const user = await uid()
  const brand = str(f, 'brand', 60)
  const model = str(f, 'model', 80)
  const km = int(f, 'km')
  if (!brand || !model) return { error: 'Informe marca e modelo.' }
  if (km == null) return { error: 'Informe a quilometragem atual do painel.' }
  const plate = str(f, 'plate', 10)

  const [v] = await q<{ id: string }>`insert into vehicles
    (user_id, nickname, plate, brand, model, version, manufacture_year, model_year, fuel, color, fipe_code, fipe_amount)
    values (${user}, ${str(f, 'nickname', 40)}, ${plate ? normalizePlate(plate) : null}, ${brand}, ${model}, ${str(f, 'version', 120)},
      ${int(f, 'manufacture_year')}, ${int(f, 'model_year')}, ${str(f, 'fuel', 40)}, ${str(f, 'color', 30)}, ${str(f, 'fipe_code', 12)}, ${money(f, 'fipe_amount')})
    returning id`
  await q`insert into odometer_readings (vehicle_id, km, read_at) values (${v.id}, ${km}, ${todayISO()})`
  await insertDefaultPlan(v.id)
  ;(await cookies()).set(VEHICLE_COOKIE, v.id, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  refresh()
  redirect('/plano?novo=1')
}

export async function trocarVeiculo(f: FormData) {
  const user = await uid()
  const id = await ownVehicle(user, String(f.get('vehicle_id')))
  ;(await cookies()).set(VEHICLE_COOKIE, id, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  refresh()
  redirect('/')
}

export async function salvarApelido(_: FormState, f: FormData): Promise<FormState> {
  const user = await uid()
  const id = await ownVehicle(user, String(f.get('vehicle_id')))
  await q`update vehicles set nickname = ${str(f, 'nickname', 40)}, color = ${str(f, 'color', 30)} where id = ${id}`
  refresh()
  return { ok: true, message: 'Salvo.' }
}

export async function excluirVeiculo(f: FormData) {
  const user = await uid()
  const id = await ownVehicle(user, String(f.get('vehicle_id')))
  if (String(f.get('confirm') ?? '').trim().toUpperCase() !== 'EXCLUIR') redirect('/carro?erro=confirmar')
  await q`delete from vehicles where id = ${id}`
  ;(await cookies()).delete(VEHICLE_COOKIE)
  refresh()
  redirect('/')
}

/* ---------- quilometragem ---------- */

export async function addLeitura(_: FormState, f: FormData): Promise<FormState> {
  const user = await uid()
  const id = await ownVehicle(user, String(f.get('vehicle_id')))
  const km = int(f, 'km')
  const at = date(f, 'read_at')
  if (km == null) return { error: 'Digite a quilometragem do painel.' }
  if (km > 2000000) return { error: 'Quilometragem fora do normal. Confere o número?' }

  const [before] = await q<{ km: number; at: string }>`select km, to_char(read_at, 'DD/MM/YYYY') as at from odometer_readings
    where vehicle_id = ${id} and read_at <= ${at} order by km desc limit 1`
  if (before && km < before.km) return { error: `Menor que a leitura de ${before.at} (${before.km.toLocaleString('pt-BR')} km). Confere o número?` }

  await q`insert into odometer_readings (vehicle_id, km, read_at) values (${id}, ${km}, ${at})`
  refresh()
  return { ok: true, message: 'Quilometragem registrada.' }
}

export async function delLeitura(f: FormData) {
  const user = await uid()
  await q`delete from odometer_readings r using vehicles v where r.id = ${String(f.get('id'))} and r.vehicle_id = v.id and v.user_id = ${user}`
  refresh()
}

/* ---------- serviços ---------- */

export async function addServico(_: FormState, f: FormData): Promise<FormState> {
  const user = await uid()
  const id = await ownVehicle(user, String(f.get('vehicle_id')))
  const itemId = str(f, 'plan_item_id', 40)
  let title = str(f, 'title', 120)
  if (itemId) {
    const [item] = await q<{ name: string }>`select name from plan_items where id = ${itemId} and vehicle_id = ${id}`
    if (!item) return { error: 'Item do plano não encontrado.' }
    title = title || item.name
  }
  if (!title) return { error: 'Escolha um item do plano ou escreva o que foi feito.' }
  const km = int(f, 'km')
  const at = date(f, 'done_at')

  await q`insert into services (vehicle_id, plan_item_id, title, done_at, km, cost, shop, notes)
    values (${id}, ${itemId}, ${title}, ${at}, ${km}, ${money(f, 'cost')}, ${str(f, 'shop', 80)}, ${str(f, 'notes', 500)})`
  refresh()
  return { ok: true, message: 'Serviço registrado.' }
}

export async function delServico(f: FormData) {
  const user = await uid()
  await q`delete from services s using vehicles v where s.id = ${String(f.get('id'))} and s.vehicle_id = v.id and v.user_id = ${user}`
  refresh()
}

/* ---------- plano ---------- */

export async function salvarItem(_: FormState, f: FormData): Promise<FormState> {
  const user = await uid()
  const vehicleId = await ownVehicle(user, String(f.get('vehicle_id')))
  const name = str(f, 'name', 120)
  const category = (Object.keys(CATEGORIES).includes(String(f.get('category'))) ? f.get('category') : 'outros') as Category
  const km = int(f, 'interval_km')
  const months = int(f, 'interval_months')
  if (!name) return { error: 'Dê um nome ao item.' }
  if (!km && !months) return { error: 'Informe o intervalo em km, em meses ou os dois.' }
  const notes = str(f, 'notes', 300)
  const itemId = str(f, 'id', 40)

  if (itemId) {
    await q`update plan_items set name = ${name}, category = ${category}, interval_km = ${km || null}, interval_months = ${months || null}, notes = ${notes}
      where id = ${itemId} and vehicle_id = ${vehicleId}`
  } else {
    await q`insert into plan_items (vehicle_id, name, category, interval_km, interval_months, notes, source, position)
      values (${vehicleId}, ${name}, ${category}, ${km || null}, ${months || null}, ${notes}, 'usuario',
        coalesce((select max(position) + 1 from plan_items where vehicle_id = ${vehicleId}), 0))`
  }
  refresh()
  return { ok: true, message: itemId ? 'Item atualizado.' : 'Item adicionado.' }
}

export async function delItem(f: FormData) {
  const user = await uid()
  await q`delete from plan_items p using vehicles v where p.id = ${String(f.get('id'))} and p.vehicle_id = v.id and v.user_id = ${user}`
  refresh()
}

export async function restaurarPadrao(f: FormData) {
  const user = await uid()
  const id = await ownVehicle(user, String(f.get('vehicle_id')))
  await replacePlan(id, DEFAULT_PLAN, 'padrao')
  await q`update vehicles set plan_source = 'padrao', plan_summary = null where id = ${id}`
  refresh()
}

export async function gerarPlano(vehicleId: string, manualText: string | null) {
  const user = await uid()
  const id = await ownVehicle(user, vehicleId)
  const [v] = await q<Vehicle>`select id, nickname, plate, brand, model, version, manufacture_year, model_year, fuel, color, fipe_code,
    fipe_amount::float8 as fipe_amount, plan_source, plan_summary from vehicles where id = ${id}`
  return generatePlan(v, manualText)
}

export async function aplicarPlano(vehicleId: string, draft: PlanDraft) {
  const user = await uid()
  const id = await ownVehicle(user, vehicleId)
  const items: PlanDraftItem[] = (draft.items ?? []).slice(0, 60).map((i) => ({
    name: String(i.name).slice(0, 120),
    category: (Object.keys(CATEGORIES).includes(i.category) ? i.category : 'outros') as Category,
    interval_km: i.interval_km && i.interval_km > 0 ? Math.round(i.interval_km) : null,
    interval_months: i.interval_months && i.interval_months > 0 ? Math.round(i.interval_months) : null,
    notes: i.notes ? String(i.notes).slice(0, 300) : null,
  }))
  if (!items.length) return { ok: false as const, error: 'Plano vazio.' }
  const source = draft.fromManual ? 'manual' : 'ia'
  await replacePlan(id, items, source)
  await q`update vehicles set plan_source = ${source}, plan_summary = ${String(draft.summary ?? '').slice(0, 500) || null} where id = ${id}`
  refresh()
  return { ok: true as const }
}
