'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Sparkles, X } from 'lucide-react'
import { aplicarPlano, gerarPlano } from '../actions'
import { Button, Notice } from '@/components/ui'
import type { PlanDraft } from '@/lib/ai'
import { intervalLabel } from '@/lib/maintenance'
import { CATEGORIES } from '@/lib/types'

export function PlanGenerator({ vehicleId, aiOn }: { vehicleId: string; aiOn: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const [busy, start] = useTransition()

  if (!aiOn)
    return <Notice tone="muted">Para gerar o plano do seu modelo, configure a chave GEMINI_API_KEY na Vercel (é grátis no Google AI Studio).</Notice>

  const gerar = () =>
    start(async () => {
      setError(null)
      setInfo(null)
      setDraft(null)
      let manual: string | null = null
      if (file) {
        try {
          setPhase('Lendo o manual… 0%')
          const { extractManualText } = await import('@/lib/pdfText')
          const r = await extractManualText(file, (p) => setPhase(`Lendo o manual… ${Math.round(p * 100)}%`))
          if (r.scanned || !r.text) {
            setInfo('Esse PDF parece ser escaneado (só imagem), então não deu para ler o texto. Gerei pelo modelo do carro.')
          } else {
            manual = r.text
            setInfo(`Usei ${r.usedPages} de ${r.pages} páginas do manual (as que falam de revisão).`)
          }
        } catch {
          setInfo('Não consegui abrir o PDF. Gerei pelo modelo do carro.')
        }
      }
      setPhase(manual ? 'A IA está montando o plano a partir do manual…' : 'A IA está montando o plano do seu modelo…')
      const r = await gerarPlano(vehicleId, manual)
      setPhase(null)
      if (!r.ok) return setError(r.error)
      setDraft(r.draft)
    })

  const aplicar = () =>
    start(async () => {
      if (!draft) return
      setPhase('Salvando plano…')
      const r = await aplicarPlano(vehicleId, draft)
      setPhase(null)
      if (!r.ok) return setError(r.error)
      setDraft(null)
      setFile(null)
      setInfo('Plano atualizado! Os serviços que você já registrou continuam ligados aos itens.')
    })

  return (
    <div className="space-y-3">
      {!draft && (
        <>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-panel-2 p-3 text-sm">
              <FileText size={18} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" aria-label="Remover PDF" onClick={() => (setFile(null), fileRef.current && (fileRef.current.value = ''))} className="p-1 text-mute">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line p-3 text-left text-sm text-mute">
              <FileText size={18} className="shrink-0" />
              <span>
                Tem o PDF do manual? <span className="text-ink underline">Anexar</span>
                <span className="block text-xs">Opcional. Com ele, a IA usa os intervalos oficiais da montadora.</span>
              </span>
            </button>
          )}
          <Button onClick={gerar} disabled={busy} className="w-full">
            <Sparkles size={18} /> {busy ? (phase ?? 'Gerando…') : file ? 'Gerar plano pelo manual' : 'Gerar plano do meu carro com IA'}
          </Button>
        </>
      )}

      {error && <Notice tone="bad">{error}</Notice>}
      {info && <Notice tone="muted">{info}</Notice>}

      {draft && (
        <div className="space-y-3">
          <Notice tone="good">
            <b>{draft.items.length} itens</b> {draft.fromManual ? 'tirados do manual' : 'para o seu modelo'}. Confira antes de aplicar.
            {draft.summary && <span className="mt-1 block text-xs opacity-90">{draft.summary}</span>}
          </Notice>
          <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto rounded-xl border border-line p-2">
            {draft.items.map((i, n) => (
              <li key={n} className="rounded-lg bg-panel-2 p-2.5">
                <div className="flex justify-between gap-2 text-sm font-semibold">
                  <span>{i.name}</span>
                  <span className="shrink-0 text-[11px] font-normal text-mute">{CATEGORIES[i.category]}</span>
                </div>
                <div className="text-xs text-accent">{intervalLabel(i)}</div>
                {i.notes && <div className="text-xs text-mute">{i.notes}</div>}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
              Descartar
            </Button>
            <Button onClick={aplicar} disabled={busy}>
              {busy ? 'Salvando…' : 'Aplicar plano'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
