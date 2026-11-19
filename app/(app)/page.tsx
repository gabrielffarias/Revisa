import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Gauge, Sparkles, Wrench } from 'lucide-react'
import { activeVehicle, requireUser } from '@/lib/auth'
import { vehicleData } from '@/lib/data'
import { fmtDate, fmtKm, fmtMoney, kmStats, planStatus } from '@/lib/maintenance'
import { vehicleName } from '@/lib/types'
import { ItemRow } from '@/components/ItemRow'
import { Card, Notice, Stat } from '@/components/ui'
import { trocarVeiculo } from './actions'

export default async function Painel() {
  const user = await requireUser()
  const { vehicle, all } = await activeVehicle(user.id)
  if (!vehicle) redirect('/carro/novo')

  const { readings, services, items } = await vehicleData(vehicle.id)
  const km = kmStats(readings, services)
  const status = planStatus(items, services, km)
  const counts = { vencido: 0, proximo: 0, 'sem-registro': 0, ok: 0 }
  status.forEach((s) => counts[s.status]++)
  const year = new Date().getFullYear()
  const spentYear = services.filter((s) => s.done_at.startsWith(String(year))).reduce((a, s) => a + (s.cost ?? 0), 0)
  const stale = km.daysSinceReading == null || km.daysSinceReading >= 7

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-mute">Olá{user.name ? `, ${user.name.split(' ')[0]}` : ''}</p>
          <h1 className="display truncate text-4xl font-extrabold uppercase leading-none">{vehicleName(vehicle)}</h1>
          {vehicle.version && <p className="truncate text-xs text-mute">{vehicle.version}</p>}
        </div>
        <Link href="/carro" className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">
          {all.length > 1 ? 'Trocar' : 'Carro'}
        </Link>
      </header>

      {all.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {all.map((v) => (
            <form key={v.id} action={trocarVeiculo}>
              <input type="hidden" name="vehicle_id" value={v.id} />
              <button className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${v.id === vehicle.id ? 'bg-accent text-accent-ink' : 'border border-line text-mute'}`}>{vehicleName(v)}</button>
            </form>
          ))}
        </div>
      )}

      {stale && (
        <Link href="/km" className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <Gauge className="shrink-0 text-accent" />
          <div>
            <div className="text-sm font-semibold">Atualize a quilometragem</div>
            <div className="text-xs text-mute">
              {km.daysSinceReading == null ? 'Nenhuma leitura ainda.' : `Última leitura há ${km.daysSinceReading} dias.`} Leva 5 segundos e deixa as previsões certas.
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label={km.avgPerDay ? 'Km estimada hoje' : 'Última km'} value={km.estimated?.toLocaleString('pt-BR') ?? '—'} unit="km" hint={km.lastAt ? `Informada em ${fmtDate(km.lastAt)}` : undefined} />
        <Stat
          label="Média"
          value={km.avgPerDay ? Math.round(km.avgPerDay * 30).toLocaleString('pt-BR') : '—'}
          unit="km/mês"
          hint={km.avgPerDay ? `${km.avgPerDay.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km por dia` : 'Precisa de 2 leituras com 1 semana de diferença'}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-bad/10 p-2">
          <div className="display text-3xl font-bold text-bad">{counts.vencido}</div>
          <div className="text-[11px] text-mute">vencidos</div>
        </div>
        <div className="rounded-xl bg-warn/10 p-2">
          <div className="display text-3xl font-bold text-warn">{counts.proximo}</div>
          <div className="text-[11px] text-mute">chegando</div>
        </div>
        <div className="rounded-xl bg-good/10 p-2">
          <div className="display text-3xl font-bold text-good">{counts.ok}</div>
          <div className="text-[11px] text-mute">em dia</div>
        </div>
      </div>

      {vehicle.plan_source === 'padrao' && (
        <Link href="/plano" className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
          <Sparkles className="shrink-0 text-accent" />
          <div>
            <div className="text-sm font-semibold">Plano genérico em uso</div>
            <div className="text-xs text-mute">Gere o plano do seu modelo com IA ou mande o PDF do manual.</div>
          </div>
        </Link>
      )}

      {counts['sem-registro'] > 0 && counts['sem-registro'] === items.length && (
        <Notice tone="muted">
          Para começar, registre quando você fez as últimas trocas (óleo, filtros, correia…). Toque em <b>Registrar</b> em cada item que souber. O que não souber, faça na próxima revisão.
        </Notice>
      )}

      <Card title="Manutenção" action={<Link href="/plano" className="text-xs text-accent">Ver plano</Link>}>
        <ul className="space-y-2">
          {status.map((s) => (
            <ItemRow key={s.item.id} s={s} vehicleId={vehicle.id} />
          ))}
        </ul>
      </Card>

      <Link href="/servicos" className="flex items-center justify-between rounded-2xl border border-line bg-panel p-4">
        <span className="flex items-center gap-3">
          <Wrench className="text-mute" size={20} />
          <span className="text-sm">
            Gasto em {year}
            <span className="block text-xs text-mute">
              {services.length} serviço{services.length === 1 ? '' : 's'} registrado{services.length === 1 ? '' : 's'} · {fmtKm(km.lastKm)}
            </span>
          </span>
        </span>
        <span className="display text-2xl font-bold">{fmtMoney(spentYear)}</span>
      </Link>
    </div>
  )
}
