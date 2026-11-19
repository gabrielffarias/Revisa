import type { ReactNode } from 'react'

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, unit, delta, hint, tone }: { label: string; value: ReactNode; unit?: string; delta?: number | null; hint?: ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  const toneCls = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink'
  return (
    <div className="rounded-xl bg-panel-2 p-3">
      <div className="text-xs text-mute">{label}</div>
      <div className={`display mt-1 text-3xl font-bold leading-none ${toneCls}`}>
        {value ?? '—'}
        {unit && value !== null && value !== undefined && value !== '—' && <span className="ml-1 text-base font-medium text-mute">{unit}</span>}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={`mt-1 text-xs ${delta < 0 ? 'text-good' : delta > 0 ? 'text-warn' : 'text-mute'}`}>
          {delta > 0 ? '+' : ''}
          {delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} desde o início
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v =
    variant === 'primary'
      ? 'bg-accent text-accent-ink hover:brightness-110'
      : variant === 'danger'
        ? 'bg-transparent text-bad border border-bad/40 hover:bg-bad/10'
          : 'bg-panel-2 text-ink border border-line hover:border-mute'
  return (
    <button {...rest} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${v} ${className}`}>
      {children}
    </button>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-mute">{children}</p>
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="display text-4xl font-extrabold uppercase">{title}</h1>
        {sub && <p className="text-sm text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'bad' | 'good' | 'muted'; children: ReactNode }) {
  const c =
    tone === 'bad' ? 'border-bad/40 bg-bad/10 text-bad' : tone === 'good' ? 'border-good/40 bg-good/10 text-good' : tone === 'muted' ? 'border-line bg-panel-2 text-mute' : 'border-warn/40 bg-warn/10 text-warn'
  return <div className={`rounded-xl border p-3 text-sm ${c}`}>{children}</div>
}
