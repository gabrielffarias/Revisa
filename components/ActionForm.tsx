'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Notice } from './ui'

type State = { ok?: boolean; error?: string; message?: string } | undefined

/** Formulário com server action que mostra erro/sucesso e limpa os campos quando dá certo. */
export function ActionForm({
  action,
  children,
  className = 'space-y-3',
  reset = true,
  onDone,
}: {
  action: (s: State, f: FormData) => Promise<State>
  children: React.ReactNode
  className?: string
  reset?: boolean
  onDone?: () => void
}) {
  const [state, run] = useActionState(action, undefined)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) {
      if (reset) ref.current?.reset()
      onDone?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      {state?.ok && state.message && <Notice tone="good">{state.message}</Notice>}
    </form>
  )
}
