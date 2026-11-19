/**
 * Notificações locais quando o Revisa roda dentro do app Android (Capacitor, repositório Revisa_APP).
 * São agendadas no próprio celular: não precisam de servidor nem de internet na hora de tocar.
 * No navegador nada disso roda; o aviso aparece dentro do app.
 */
import { Capacitor, registerPlugin } from '@capacitor/core'

export const isNative = () => typeof window !== 'undefined' && Capacitor.isNativePlatform()

type PermState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
export type LocalNotif = { id: number; title: string; body: string; schedule?: { at: Date; allowWhileIdle?: boolean }; smallIcon?: string; iconColor?: string; extra?: Record<string, string> }
type LN = {
  checkPermissions(): Promise<{ display: PermState }>
  requestPermissions(): Promise<{ display: PermState }>
  schedule(o: { notifications: LocalNotif[] }): Promise<unknown>
  getPending(): Promise<{ notifications: { id: number }[] }>
  cancel(o: { notifications: { id: number }[] }): Promise<void>
  addListener(ev: 'localNotificationActionPerformed', cb: (a: { notification: { extra?: Record<string, string> } }) => void): Promise<{ remove: () => void }>
}
export const LocalNotifications = registerPlugin<LN>('LocalNotifications')

export const LS_REMIND = 'revisa-lembretes'
/** weekday: 0 = domingo … 6 = sábado */
export type RemindPrefs = { weekly: boolean; weekday: number; hour: number; due: boolean }
const DEFAULT_PREFS: RemindPrefs = { weekly: true, weekday: 0, hour: 19, due: true }

export const remindPrefs = (): RemindPrefs => {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(LS_REMIND) ?? '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}
export const saveRemindPrefs = (p: RemindPrefs) => {
  try {
    localStorage.setItem(LS_REMIND, JSON.stringify(p))
  } catch {}
}

export type ReminderData = {
  vehicles: { id: string; name: string; daysSinceReading: number | null; due: { id: string; name: string; estDate: string; status: string }[] }[]
}

const BASE = { smallIcon: 'ic_stat_revisa', iconColor: '#FFB020' }
const at = (date: string, hh: number) => new Date(`${date}T${String(hh).padStart(2, '0')}:00:00-03:00`)
const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

/** Monta a lista de notificações das próximas semanas (puro, para dar para testar). */
export function buildNotifications(data: ReminderData, p: RemindPrefs, now = new Date()): LocalNotif[] {
  const list: LocalNotif[] = []
  if (p.weekly) {
    // próximos 6 lembretes semanais de quilometragem
    for (let i = 0, made = 0; i < 50 && made < 6; i++) {
      const d = new Date(now.getTime() + i * 86400000)
      const day = ymd(d)
      if (new Date(`${day}T12:00:00-03:00`).getUTCDay() !== p.weekday) continue
      const when = at(day, p.hour)
      if (when.getTime() <= now.getTime() + 60000) continue
      const names = data.vehicles.map((v) => v.name)
      list.push({
        ...BASE,
        id: 100 + made,
        title: 'Bora atualizar a quilometragem?',
        body: names.length > 1 ? `Anota quanto marca o painel de: ${names.join(', ')}.` : `Anota quanto está marcando o painel${names[0] ? ` do ${names[0]}` : ''}. Leva 5 segundos.`,
        schedule: { at: when, allowWhileIdle: true },
        extra: { url: '/km' },
      })
      made++
    }
  }
  if (p.due) {
    let n = 0
    for (const v of data.vehicles) {
      for (const it of v.due) {
        if (n >= 40) break
        // uma semana antes e no dia previsto, às 9h
        for (const [offset, title] of [
          [-7, `${it.name}: vence em ~1 semana`],
          [0, `${it.name}: vence hoje`],
        ] as const) {
          const d = ymd(new Date(at(it.estDate, 12).getTime() + offset * 86400000))
          const when = at(d, 9)
          if (when.getTime() <= now.getTime() + 60000) continue
          list.push({ ...BASE, id: 1000 + n++, title, body: `${v.name} — toque para ver o plano ou registrar o serviço.`, schedule: { at: when, allowWhileIdle: true }, extra: { url: '/' } })
        }
      }
    }
  }
  return list
}

/** Refaz a agenda de notificações no celular (chamado sempre que o app abre e quando muda algo). */
export async function scheduleReminders() {
  if (!isNative()) return
  try {
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
    const r = await fetch('/api/lembretes', { cache: 'no-store' })
    if (!r.ok) return
    const list = buildNotifications((await r.json()) as ReminderData, remindPrefs())
    const pending = (await LocalNotifications.getPending()).notifications
    if (pending.length) await LocalNotifications.cancel({ notifications: pending.map((x) => ({ id: x.id })) })
    if (list.length) await LocalNotifications.schedule({ notifications: list })
  } catch {}
}
