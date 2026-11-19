import { redirect } from 'next/navigation'
import { activeVehicle, requireUser } from '@/lib/auth'
import { planOf } from '@/lib/data'
import { CATEGORIES, vehicleName, type Category } from '@/lib/types'
import { Card, Notice, PageTitle } from '@/components/ui'
import { restaurarPadrao } from '../actions'
import { ItemLine, NewItem } from './ItemEditor'
import { PlanGenerator } from './PlanGenerator'

export const metadata = { title: 'Plano de manutenção · Revisa' }
export const maxDuration = 60 // a IA pode levar uns segundos

const SOURCE = { padrao: 'Plano genérico', ia: 'Gerado por IA para o seu modelo', manual: 'Tirado do manual do carro' }

export default async function PlanoPage({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const { novo } = await searchParams
  const user = await requireUser()
  const { vehicle } = await activeVehicle(user.id)
  if (!vehicle) redirect('/carro/novo')
  const items = await planOf(vehicle.id)
  const groups = (Object.keys(CATEGORIES) as Category[]).map((c) => [c, items.filter((i) => i.category === c)] as const).filter(([, l]) => l.length)

  return (
    <div className="space-y-4">
      <PageTitle title="Plano" sub={`${vehicleName(vehicle)} · ${SOURCE[vehicle.plan_source]}`} />

      {novo && (
        <Notice tone="good">
          Carro cadastrado! Começamos com um plano genérico. Agora gere o plano certo do seu modelo (ou pelo manual) e depois registre as últimas trocas que você lembra.
        </Notice>
      )}

      <Card title={vehicle.plan_source === 'padrao' ? 'Plano do seu modelo' : 'Gerar de novo'}>
        {vehicle.plan_summary && <p className="mb-3 text-xs text-mute">{vehicle.plan_summary}</p>}
        <PlanGenerator vehicleId={vehicle.id} aiOn={!!process.env.GEMINI_API_KEY} />
        <p className="mt-3 text-[11px] leading-snug text-mute">
          A IA pode errar. Na dúvida, o manual e a concessionária mandam. Você pode editar qualquer item abaixo.
        </p>
      </Card>

      {groups.map(([cat, list]) => (
        <Card key={cat} title={CATEGORIES[cat]}>
          <ul className="divide-y divide-line">
            {list.map((i) => (
              <ItemLine key={i.id} item={i} vehicleId={vehicle.id} />
            ))}
          </ul>
        </Card>
      ))}

      <NewItem vehicleId={vehicle.id} />

      {vehicle.plan_source !== 'padrao' && (
        <form action={restaurarPadrao} className="text-center">
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <button className="text-xs text-mute underline">Voltar para o plano genérico</button>
        </form>
      )}
    </div>
  )
}
