import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { q } from './db'
import { readSession, SESSION_COOKIE, VEHICLE_COOKIE } from './session'
import type { Vehicle } from './types'

export async function currentUserId() {
  const jar = await cookies()
  return readSession(jar.get(SESSION_COOKIE)?.value)
}

export async function requireUser() {
  const uid = await currentUserId()
  if (!uid) redirect('/login')
  const [user] = await q<{ id: string; name: string | null; email: string }>`select id, name, email from users where id = ${uid}`
  if (!user) redirect('/login')
  return user
}

export async function listVehicles(uid: string) {
  return q<Vehicle>`select id, nickname, plate, brand, model, version, manufacture_year, model_year, fuel, color, fipe_code,
    fipe_amount::float8 as fipe_amount, plan_source, plan_summary from vehicles where user_id = ${uid} order by created_at`
}

/** Carro escolhido (cookie) ou o primeiro cadastrado. */
export async function activeVehicle(uid: string) {
  const all = await listVehicles(uid)
  const chosen = (await cookies()).get(VEHICLE_COOKIE)?.value
  return { vehicle: all.find((v) => v.id === chosen) ?? all[0] ?? null, all }
}

/** Garante que o carro é do usuário logado; devolve o id ou redireciona. */
export async function ownVehicle(uid: string, vehicleId: string) {
  const [v] = await q<{ id: string }>`select id from vehicles where id = ${vehicleId} and user_id = ${uid}`
  if (!v) redirect('/')
  return v.id
}
