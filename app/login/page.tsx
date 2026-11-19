import { LoginForm } from './LoginForm'

export const metadata = { title: 'Entrar · Revisa' }

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <img src="/icon.svg" alt="" className="mx-auto mb-3 h-16 w-16" />
        <h1 className="display text-5xl font-extrabold uppercase">
          Revi<span className="text-accent">sa</span>
        </h1>
        <p className="mt-1 text-sm text-mute">A manutenção do carro em dia, sem planilha.</p>
      </div>
      <LoginForm />
    </main>
  )
}
