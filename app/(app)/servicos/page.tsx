import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { activeVehicle, requireUser } from '@/lib/auth'
import { vehicleData } from '@/lib/data'
import { fmtDate, fmtKm, fmtMoney, kmStats, todayISO } from '@/lib/maintenance'
import { CATEGORIES, vehicleName, type Category } from '@/lib/types'
import { ActionForm } from '@/components/ActionForm'
import { Submit } from '@/components/Submit'
import { Card, Empty, Field, PageTitle } from '@/components/ui'
import { addServico, delServico } from '../actions'

export const metadata = { title: 'Serviços · Revisa' }

export default async function ServicosPage({ searchParams }: { searchParams: Promise<{ item?: string; carro?: string }> }) {
  const sp = await searchParams
  const user = await requireUser()
  const { vehicle } = await activeVehicle(user.id)
  if (!vehicle) redirect('/carro/novo')
  const { readings, services, items } = await vehicleData(vehicle.id)
  const km = kmStats(readings, services)
  const today = todayISO()
  const preset = items.find((i) => i.id === sp.item)
  const total = services.reduce((a, s) => a + (s.cost ?? 0), 0)
  const itemName = new Map(items.map((i) => [i.id, i.name]))

  const grouped = Object.entries(
    items.reduce<Record<string, typeof items>>((acc, i) => {
      ;(acc[i.category] ??= []).push(i)
      return acc
    }, {}),
  )

  return (
    <div className="space-y-4">
      <PageTitle title="Serviços" sub={vehicleName(vehicle)} />

      <Card title={preset ? `Registrar: ${preset.name}` : 'Registrar serviço'}>
        <ActionForm action={addServico} key={preset?.id ?? 'novo'}>
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <Field label="O que foi feito">
            <select name="plan_item_id" defaultValue={preset?.id ?? ''}>
              <option value="">Outro (escrever abaixo)</option>
              {grouped.map(([cat, list]) => (
                <optgroup key={cat} label={CATEGORIES[cat as Category] ?? cat}>
                  {list.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Descrição (opcional se escolheu um item)">
            <input name="title" placeholder="ex.: Troca da lâmpada do farol" maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" name="done_at" defaultValue={today} max={today} />
            </Field>
            <Field label="Km no dia">
              <input name="km" inputMode="numeric" placeholder={km.estimated ? km.estimated.toLocaleString('pt-BR') : ''} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input name="cost" inputMode="decimal" placeholder="0,00" />
            </Field>
            <Field label="Oficina">
              <input name="shop" maxLength={80} />
            </Field>
          </div>
          <Field label="Observações">
            <textarea name="notes" rows={2} maxLength={500} placeholder="Marca do óleo, peça usada…" />
          </Field>
          <Submit className="w-full">Salvar serviço</Submit>
          <p className="text-xs text-mute">Sem a km do dia, o item só vence pelo tempo. Se não lembrar exato, um valor aproximado já ajuda.</p>
        </ActionForm>
      </Card>

      <Card title="Histórico" action={<span className="text-xs text-mute">Total {fmtMoney(total)}</span>}>
        {services.length === 0 ? (
          <Empty>Nenhum serviço registrado.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {services.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-mute">
                    {[fmtDate(s.done_at), s.km != null && fmtKm(s.km), s.shop].filter(Boolean).join(' · ')}
                    {s.plan_item_id && itemName.get(s.plan_item_id) !== s.title && <span className="block">Item: {itemName.get(s.plan_item_id)}</span>}
                    {s.notes && <span className="block">{s.notes}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {s.cost != null && <span className="text-sm font-semibold">{fmtMoney(s.cost)}</span>}
                  <form action={delServico}>
                    <input type="hidden" name="id" value={s.id} />
                    <button aria-label="Apagar serviço" className="p-2 text-mute hover:text-bad">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
