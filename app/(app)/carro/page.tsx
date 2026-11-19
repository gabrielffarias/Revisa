import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { activeVehicle, requireUser } from '@/lib/auth'
import { fmtMoney } from '@/lib/maintenance'
import { vehicleName } from '@/lib/types'
import { ActionForm } from '@/components/ActionForm'
import { Submit } from '@/components/Submit'
import { Card, Field, Notice, PageTitle } from '@/components/ui'
import { excluirVeiculo, salvarApelido, trocarVeiculo } from '../actions'

export const metadata = { title: 'Carro · Revisa' }

export default async function CarroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  const user = await requireUser()
  const { vehicle, all } = await activeVehicle(user.id)
  if (!vehicle) redirect('/carro/novo')

  const rows: [string, string | number | null][] = [
    ['Marca', vehicle.brand],
    ['Modelo', vehicle.model],
    ['Versão', vehicle.version],
    ['Ano', vehicle.manufacture_year && vehicle.model_year ? `${vehicle.manufacture_year}/${vehicle.model_year}` : vehicle.model_year],
    ['Combustível', vehicle.fuel],
    ['Placa', vehicle.plate ? `${vehicle.plate.slice(0, 3)}-${vehicle.plate.slice(3)}` : null],
    ['Código FIPE', vehicle.fipe_code],
    ['Valor FIPE (no cadastro)', vehicle.fipe_amount != null ? fmtMoney(vehicle.fipe_amount) : null],
  ]

  return (
    <div className="space-y-4">
      <PageTitle title="Carro" sub={vehicleName(vehicle)} />

      <Card title="Dados">
        <dl className="divide-y divide-line text-sm">
          {rows
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-mute">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
        </dl>
      </Card>

      <Card title="Personalizar">
        <ActionForm action={salvarApelido} reset={false}>
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Apelido">
              <input name="nickname" defaultValue={vehicle.nickname ?? ''} maxLength={40} />
            </Field>
            <Field label="Cor">
              <input name="color" defaultValue={vehicle.color ?? ''} maxLength={30} />
            </Field>
          </div>
          <Submit variant="ghost" className="w-full">
            Salvar
          </Submit>
        </ActionForm>
      </Card>

      <Card title="Seus carros">
        <ul className="space-y-2">
          {all.map((v) => (
            <li key={v.id}>
              <form action={trocarVeiculo}>
                <input type="hidden" name="vehicle_id" value={v.id} />
                <button className={`w-full rounded-xl border p-3 text-left text-sm font-semibold ${v.id === vehicle.id ? 'border-accent bg-accent/10' : 'border-line'}`}>
                  {vehicleName(v)}
                  {v.id === vehicle.id && <span className="ml-2 text-xs font-normal text-accent">ativo</span>}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <Link href="/carro/novo" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold">
          <Plus size={18} /> Cadastrar outro carro
        </Link>
      </Card>

      <Card title="Excluir este carro">
        <form action={excluirVeiculo} className="space-y-3">
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <p className="text-xs text-mute">Apaga o carro, o plano, as leituras de km e os serviços. Não tem volta.</p>
          {erro === 'confirmar' && <Notice tone="bad">Digite EXCLUIR para confirmar.</Notice>}
          <Field label='Digite "EXCLUIR" para confirmar'>
            <input name="confirm" autoComplete="off" />
          </Field>
          <Submit variant="danger" className="w-full" pending="Excluindo…">
            Excluir carro
          </Submit>
        </form>
      </Card>
    </div>
  )
}
