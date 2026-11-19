import { NextResponse } from 'next/server'
import { currentUserId, listVehicles } from '@/lib/auth'
import { vehicleData } from '@/lib/data'
import { kmStats, planStatus } from '@/lib/maintenance'
import { vehicleName } from '@/lib/types'
import type { ReminderData } from '@/lib/native'

export const dynamic = 'force-dynamic'

/** Dados para o celular agendar as notificações locais. */
export async function GET() {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  const vehicles = await listVehicles(uid)
  const out: ReminderData = { vehicles: [] }
  for (const v of vehicles) {
    const { readings, services, items } = await vehicleData(v.id)
    const km = kmStats(readings, services)
    const due = planStatus(items, services, km)
      .filter((s) => s.estDate && (s.status === 'proximo' || s.status === 'ok'))
      .map((s) => ({ id: s.item.id, name: s.item.name, estDate: s.estDate as string, status: s.status }))
      .slice(0, 15)
    out.vehicles.push({ id: v.id, name: vehicleName(v), daysSinceReading: km.daysSinceReading, due })
  }
  return NextResponse.json(out)
}
