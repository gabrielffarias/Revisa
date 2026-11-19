'use client'

import { useActionState, useState } from 'react'
import { cadastrar, entrar } from './actions'
import { Submit } from '@/components/Submit'
import { Field, Notice } from '@/components/ui'

export function LoginForm() {
  const [mode, setMode] = useState<'entrar' | 'cadastrar'>('entrar')
  const [loginState, loginAction] = useActionState(entrar, undefined)
  const [signupState, signupAction] = useActionState(cadastrar, undefined)
  const state = mode === 'entrar' ? loginState : signupState

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-panel-2 p-1 text-sm font-semibold">
        {(['entrar', 'cadastrar'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`min-h-10 rounded-lg ${mode === m ? 'bg-accent text-accent-ink' : 'text-mute'}`}>
            {m === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>
      <form action={mode === 'entrar' ? loginAction : signupAction} className="space-y-3">
        {mode === 'cadastrar' && (
          <Field label="Nome">
            <input name="name" autoComplete="given-name" />
          </Field>
        )}
        <Field label="E-mail">
          <input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} minLength={mode === 'cadastrar' ? 8 : undefined} required />
        </Field>
        {state?.error && <Notice tone="bad">{state.error}</Notice>}
        <Submit className="w-full" pending={mode === 'entrar' ? 'Entrando…' : 'Criando…'}>
          {mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Submit>
      </form>
    </div>
  )
}
