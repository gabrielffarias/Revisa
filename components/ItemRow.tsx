import Link from 'next/link'
import type { ItemStatus, Status } from '@/lib/maintenance'
import { fmtDate, fmtKm, intervalLabel } from '@/lib/maintenance'

export const STATUS: Record<Status, { label: string; cls: string; bar: string }> = {
  vencido: { label: 'Vencido', cls: 'bg-bad/15 text-bad', bar: 'bg-bad' },
  proximo: { label: 'Chegando', cls: 'bg-warn/15 text-warn', bar: 'bg-warn' },
  ok: { label: 'Em dia', cls: 'bg-good/15 text-good', bar: 'bg-good' },
  'sem-registro': { label: 'Sem registro', cls: 'bg-panel-2 text-mute', bar: 'bg-line' },
}

function whenText(s: ItemStatus) {
  if (s.status === 'sem-registro') return 'Quando foi feito pela última vez? Registre para o app calcular.'
  const parts: string[] = []
  if (s.kmLeft != null) parts.push(s.kmLeft <= 0 ? `passou ${fmtKm(-s.kmLeft)}` : `faltam ${fmtKm(s.kmLeft)}`)
  if (s.daysLeft != null) {
    const d = s.daysLeft
    parts.push(d <= 0 ? `venceu em ${fmtDate(s.dueDate)}` : d <= 60 ? `${d} dia${d === 1 ? '' : 's'}` : `até ${fmtDate(s.dueDate)}`)
  }
  return parts.join(' · ')
}

export function ItemRow({ s, vehicleId }: { s: ItemStatus; vehicleId: string }) {
  const st = STATUS[s.status]
  return (
    <li className="rounded-xl border border-line bg-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-snug">{s.item.name}</div>
          <div className="text-xs text-mute">{intervalLabel(s.item)}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
      </div>
      {s.progress != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2">
          <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${Math.max(4, s.progress * 100)}%` }} />
        </div>
      )}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-xs text-mute">
          {whenText(s)}
          {s.estDate && s.status !== 'vencido' && s.kmLeft != null && <span className="block">Previsão: {fmtDate(s.estDate)}</span>}
          {s.last && (
            <span className="block">
              Último: {fmtDate(s.last.done_at)}
              {s.last.km != null ? ` com ${fmtKm(s.last.km)}` : ''}
            </span>
          )}
        </div>
        <Link
          href={`/servicos?item=${s.item.id}&carro=${vehicleId}`}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${s.status === 'vencido' || s.status === 'proximo' ? 'bg-accent text-accent-ink' : 'border border-line'}`}
        >
          {s.status === 'sem-registro' ? 'Registrar' : 'Fiz agora'}
        </Link>
      </div>
    </li>
  )
}
