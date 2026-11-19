import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { activeVehicle, requireUser } from '@/lib/auth'
import { vehicleData } from '@/lib/data'
import { diffDays, fmtDate, kmStats, todayISO } from '@/lib/maintenance'
import { vehicleName } from '@/lib/types'
import { ActionForm } from '@/components/ActionForm'
import { Submit } from '@/components/Submit'
import { Card, Empty, Field, PageTitle, Stat } from '@/components/ui'
import { addLeitura, delLeitura } from '../actions'

export const metadata = { title: 'Quilometragem · Revisa' }

export default async function KmPage() {
  const user = await requireUser()
  const { vehicle } = await activeVehicle(user.id)
  if (!vehicle) redirect('/carro/novo')
  const { readings, services } = await vehicleData(vehicle.id)
  const km = kmStats(readings, services)
  const today = todayISO()

  return (
    <div className="space-y-4">
      <PageTitle title="Quilometragem" sub={vehicleName(vehicle)} />

      <Card>
        <ActionForm action={addLeitura}>
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <Field label="Quanto marca o painel agora?">
            <input name="km" inputMode="numeric" placeholder={km.estimated ? `por volta de ${km.estimated.toLocaleString('pt-BR')}` : 'ex.: 87.450'} className="display !text-3xl !font-bold" required />
          </Field>
          <details className="text-xs text-mute">
            <summary className="cursor-pointer">Foi em outro dia?</summary>
            <div className="mt-2">
              <input type="date" name="read_at" defaultValue={today} max={today} />
            </div>
          </details>
          <Submit className="w-full">Salvar km</Submit>
        </ActionForm>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Média por mês" value={km.avgPerDay ? Math.round(km.avgPerDay * 30).toLocaleString('pt-BR') : '—'} unit="km" />
        <Stat label="Por ano (ritmo atual)" value={km.avgPerDay ? Math.round(km.avgPerDay * 365).toLocaleString('pt-BR') : '—'} unit="km" />
      </div>

      <Card title="Histórico">
        {readings.length === 0 ? (
          <Empty>Nenhuma leitura ainda.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {readings.map((r, i) => {
              const prev = readings[i + 1]
              const delta = prev ? r.km - prev.km : null
              const days = prev ? diffDays(prev.read_at, r.read_at) : null
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="font-semibold">{r.km.toLocaleString('pt-BR')} km</div>
                    <div className="text-xs text-mute">
                      {fmtDate(r.read_at)}
                      {delta != null && days != null && ` · +${delta.toLocaleString('pt-BR')} km em ${days} dia${days === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <form action={delLeitura}>
                    <input type="hidden" name="id" value={r.id} />
                    <button aria-label="Apagar leitura" className="p-2 text-mute hover:text-bad">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
