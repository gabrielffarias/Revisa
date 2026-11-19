'use client'

import { useFormStatus } from 'react-dom'
import { Button } from './ui'

/** Botão de envio que mostra "Salvando…" enquanto a ação roda. */
export function Submit({ children, pending = 'Salvando…', variant = 'primary', className = '' }: { children: React.ReactNode; pending?: string; variant?: 'primary' | 'ghost' | 'danger'; className?: string }) {
  const { pending: busy } = useFormStatus()
  return (
    <Button type="submit" disabled={busy} variant={variant} className={className}>
      {busy ? pending : children}
    </Button>
  )
}
