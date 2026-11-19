'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { isNative, LocalNotifications, remindPrefs, saveRemindPrefs, scheduleReminders, type RemindPrefs } from '@/lib/native'

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function NotifSettings() {
  const [native, setNative] = useState<boolean | null>(null)
  const [granted, setGranted] = useState<boolean | null>(null)
  const [p, setP] = useState<RemindPrefs | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const n = isNative()
    setNative(n)
    setP(remindPrefs())
    if (n)
      LocalNotifications.checkPermissions()
        .then((r) => setGranted(r.display === 'granted'))
        .catch(() => setGranted(false))
  }, [])

  if (native === null || !p) return <p className="text-sm text-mute">Carregando…</p>

  if (!native)
    return (
      <div className="space-y-2 text-sm text-mute">
        <p>No navegador, o Revisa avisa na tela inicial quando faz uma semana sem atualizar a km e mostra os itens vencendo.</p>
        <p>As notificações no celular (mesmo com o app fechado) funcionam no app Android do Revisa.</p>
      </div>
    )

  const update = async (next: RemindPrefs) => {
    setP(next)
    saveRemindPrefs(next)
    await scheduleReminders()
    setMsg('Lembretes reagendados.')
  }

  const ask = async () => {
    const r = await LocalNotifications.requestPermissions().catch(() => null)
    const ok = r?.display === 'granted'
    setGranted(ok)
    if (ok) await scheduleReminders()
    else setMsg('Bloqueado. Libere em Configurações › Apps › Revisa › Notificações.')
  }

  const test = async () => {
    await LocalNotifications.schedule({
      notifications: [{ id: 7, title: 'Revisa', body: 'Notificações ligadas. É assim que o lembrete vai chegar.', smallIcon: 'ic_stat_revisa', iconColor: '#FFB020', schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true } }],
    }).catch(() => {})
    setMsg('Enviada! Chega em 3 segundos.')
  }

  if (!granted)
    return (
      <div className="space-y-2">
        <button type="button" onClick={ask} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink">
          <Bell size={18} /> Ligar notificações
        </button>
        {msg && <p className="text-xs text-warn">{msg}</p>}
      </div>
    )

  return (
    <div className="space-y-4">
      <label className="!m-0 flex items-start gap-3 !text-sm !text-ink">
        <input type="checkbox" checked={p.weekly} onChange={() => update({ ...p, weekly: !p.weekly })} className="mt-0.5 !w-auto" />
        <span>
          Lembrete semanal da quilometragem
          <span className="block text-xs text-mute">Pede para você anotar quanto marca o painel.</span>
        </span>
      </label>
      {p.weekly && (
        <div className="grid grid-cols-2 gap-3 pl-7">
          <div>
            <label>Dia</label>
            <select value={p.weekday} onChange={(e) => update({ ...p, weekday: Number(e.target.value) })}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Hora</label>
            <select value={p.hour} onChange={(e) => update({ ...p, hour: Number(e.target.value) })}>
              {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <label className="!m-0 flex items-start gap-3 !text-sm !text-ink">
        <input type="checkbox" checked={p.due} onChange={() => update({ ...p, due: !p.due })} className="mt-0.5 !w-auto" />
        <span>
          Aviso de manutenção chegando
          <span className="block text-xs text-mute">Uma semana antes e no dia previsto, às 9h.</span>
        </span>
      </label>
      <button type="button" onClick={test} className="min-h-10 w-full rounded-xl border border-line text-sm font-semibold">
        Enviar teste
      </button>
      {msg && <p className="text-xs text-good">{msg}</p>}
    </div>
  )
}
