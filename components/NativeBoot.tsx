'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNative, LocalNotifications, scheduleReminders } from '@/lib/native'

/** No app Android: reagenda os lembretes a cada abertura/mudança e abre a tela certa ao tocar na notificação. */
export function NativeBoot({ stamp }: { stamp: string }) {
  const router = useRouter()
  useEffect(() => {
    if (!isNative()) return
    let remove: (() => void) | undefined
    LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
      const url = a.notification.extra?.url
      if (url) router.push(url)
    })
      .then((h) => (remove = h.remove))
      .catch(() => {})
    return () => remove?.()
  }, [router])

  // "stamp" muda quando os dados mudam (nova km, serviço, plano): reagenda
  useEffect(() => {
    scheduleReminders()
  }, [stamp])
  return null
}
