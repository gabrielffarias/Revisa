'use client'

import { useState, useTransition } from 'react'
import { ArrowLeft, Check, Search } from 'lucide-react'
import { buscarFipe, consultarPlaca, criarVeiculo } from '../../actions'
import { ActionForm } from '@/components/ActionForm'
import { Submit } from '@/components/Submit'
import { Button, Card, Field, Notice } from '@/components/ui'
import type { FipeModel, PlateVehicle } from '@/lib/placa'
import { titleCase } from '@/lib/types'

type Draft = {
  plate: string | null
  brand: string
  model: string
  version: string | null
  manufacture_year: number | null
  model_year: number | null
  fuel: string | null
  color: string | null
  fipe_code: string | null
  fipe_amount: number | null
}

const money = (n: number | null) => (n == null ? null : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const fmtPlate = (p: string) => (p.length === 7 ? `${p.slice(0, 3)}-${p.slice(3)}` : p)

export function CarWizard({ placaOn }: { placaOn: boolean }) {
  const [step, setStep] = useState<'placa' | 'confirmar' | 'manual' | 'km'>(placaOn ? 'placa' : 'manual')
  const [plate, setPlate] = useState('')
  const [found, setFound] = useState<PlateVehicle | null>(null)
  const [version, setVersion] = useState<string | null>(null) // código FIPE escolhido
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()

  const consultar = () =>
    start(async () => {
      setError(null)
      const r = await consultarPlaca(plate)
      if (!r.ok) return setError(r.error)
      if (!r.vehicle) {
        setError('Placa não encontrada na base. Busque o modelo pela Tabela FIPE.')
        setStep('manual')
        return
      }
      setFound(r.vehicle)
      const best = [...r.vehicle.fipe_versions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
      setVersion(best?.code ?? r.vehicle.fipe_code)
      setStep('confirmar')
    })

  const confirmar = () => {
    if (!found) return
    const v = found.fipe_versions.find((x) => x.code === version)
    setDraft({
      plate: found.plate,
      brand: titleCase(found.brand),
      model: titleCase(found.model ?? ''),
      version: v?.version ?? found.version,
      manufacture_year: found.manufacture_year,
      model_year: found.model_year,
      fuel: v?.fuel ?? found.fuel,
      color: found.color ? titleCase(found.color) : null,
      fipe_code: v?.code ?? found.fipe_code,
      fipe_amount: v?.amount ?? found.fipe_amount,
    })
    setStep('km')
  }

  return (
    <div className="space-y-4">
      {step === 'placa' && (
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              consultar()
            }}
            className="space-y-3"
          >
            <Field label="Placa">
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                placeholder="ABC1D23"
                autoCapitalize="characters"
                autoComplete="off"
                className="display !text-center !text-3xl !font-bold !tracking-[0.2em]"
              />
            </Field>
            {error && <Notice tone="bad">{error}</Notice>}
            <Button type="submit" className="w-full" disabled={busy || plate.length !== 7}>
              <Search size={18} /> {busy ? 'Consultando…' : 'Consultar placa'}
            </Button>
          </form>
          <button type="button" onClick={() => setStep('manual')} className="mt-3 w-full text-center text-sm text-mute underline">
            Prefiro escolher marca e modelo
          </button>
        </Card>
      )}

      {step === 'confirmar' && found && (
        <Card title="É esse o seu carro?">
          <div className="mb-4">
            <div className="display text-3xl font-bold leading-tight">
              {titleCase(found.brand)} {titleCase(found.model ?? '')}
            </div>
            <div className="text-sm text-mute">
              {[found.manufacture_year && found.model_year ? `${found.manufacture_year}/${found.model_year}` : found.model_year, found.fuel && titleCase(found.fuel), found.color && titleCase(found.color)]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="mt-1 text-xs text-mute">
              Placa {fmtPlate(found.plate)}
              {found.city ? ` · ${titleCase(found.city)}/${found.state}` : ''}
            </div>
          </div>

          {found.fipe_versions.length > 1 ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-mute">A placa bate com mais de uma versão. Qual é a sua?</p>
              {found.fipe_versions.map((v) => (
                <label key={v.code} className={`!m-0 flex cursor-pointer items-center gap-3 rounded-xl border p-3 !text-sm !text-ink ${version === v.code ? 'border-accent bg-accent/10' : 'border-line'}`}>
                  <input type="radio" name="v" checked={version === v.code} onChange={() => setVersion(v.code)} className="!w-auto accent-[var(--color-accent)]" />
                  <span className="flex-1">
                    {v.version}
                    <span className="block text-xs text-mute">
                      {[v.fuel, money(v.amount) && `FIPE ${money(v.amount)}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            (found.version || found.fipe_amount) && (
              <p className="mb-4 text-sm">
                {found.fipe_versions[0]?.version ?? found.version}
                {found.fipe_amount != null && <span className="block text-xs text-mute">FIPE {money(found.fipe_amount)}</span>}
              </p>
            )
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setStep('manual')}>
              Não é esse
            </Button>
            <Button onClick={confirmar}>
              <Check size={18} /> É esse!
            </Button>
          </div>
        </Card>
      )}

      {step === 'manual' && (
        <ManualPick
          initial={found ? `${titleCase(found.brand)} ${titleCase(found.model ?? '')}`.trim() : ''}
          initialYear={found?.model_year ?? null}
          plate={found?.plate ?? (plate.length === 7 ? plate : null)}
          error={step === 'manual' ? error : null}
          onBack={placaOn ? () => (setError(null), setStep('placa')) : undefined}
          onPick={(d) => {
            setDraft({ ...d, color: found?.color ? titleCase(found.color) : null })
            setStep('km')
          }}
        />
      )}

      {step === 'km' && draft && (
        <Card title="Último passo">
          <div className="mb-4 rounded-xl bg-panel-2 p-3">
            <div className="font-semibold">
              {draft.brand} {draft.model} {draft.model_year ?? ''}
            </div>
            {draft.version && <div className="text-xs text-mute">{draft.version}</div>}
          </div>
          <ActionForm action={criarVeiculo} reset={false}>
            {Object.entries(draft).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v == null ? '' : String(v)} />
            ))}
            <Field label="Quantos km está marcando o painel agora?">
              <input name="km" inputMode="numeric" placeholder="ex.: 87.450" required autoFocus />
            </Field>
            <Field label="Apelido (opcional)">
              <input name="nickname" placeholder="ex.: Clio prata" maxLength={40} />
            </Field>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(found ? 'confirmar' : 'manual')}>
                <ArrowLeft size={18} />
              </Button>
              <Submit pending="Cadastrando…">Cadastrar carro</Submit>
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  )
}

function ManualPick({
  initial,
  initialYear,
  plate,
  error,
  onBack,
  onPick,
}: {
  initial: string
  initialYear: number | null
  plate: string | null
  error: string | null
  onBack?: () => void
  onPick: (d: Omit<Draft, 'color'>) => void
}) {
  const [text, setText] = useState(initial)
  const [year, setYear] = useState(initialYear ? String(initialYear) : '')
  const [models, setModels] = useState<FipeModel[] | null>(null)
  const [msg, setMsg] = useState<string | null>(error)
  const [byHand, setByHand] = useState(false)
  const [busy, start] = useTransition()

  const search = () =>
    start(async () => {
      setMsg(null)
      const r = await buscarFipe(text, year ? Number(year) : null)
      if (!r.ok) {
        setMsg(r.error)
        setByHand(true)
        return
      }
      setModels(r.models)
      if (!r.models.length) setMsg('Nada encontrado. Tente só marca e modelo (ex.: "clio 1.0") ou preencha à mão.')
    })

  if (byHand)
    return (
      <Card title="Dados do carro">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            const s = (k: string) => String(f.get(k) ?? '').trim() || null
            const y = Number(f.get('model_year')) || null
            onPick({ plate, brand: s('brand') ?? '', model: s('model') ?? '', version: s('version'), manufacture_year: y, model_year: y, fuel: s('fuel'), fipe_code: null, fipe_amount: null })
          }}
          className="space-y-3"
        >
          {msg && <Notice tone="muted">{msg}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <input name="brand" required placeholder="Renault" />
            </Field>
            <Field label="Modelo">
              <input name="model" required placeholder="Clio" />
            </Field>
          </div>
          <Field label="Versão / motor">
            <input name="version" placeholder="1.0 16V Expression" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano modelo">
              <input name="model_year" inputMode="numeric" maxLength={4} defaultValue={year} />
            </Field>
            <Field label="Combustível">
              <select name="fuel" defaultValue="Flex">
                <option>Flex</option>
                <option>Gasolina</option>
                <option>Etanol</option>
                <option>Diesel</option>
                <option>Híbrido</option>
                <option>Elétrico</option>
              </select>
            </Field>
          </div>
          <Button type="submit" className="w-full">
            Continuar
          </Button>
          {!msg?.includes('configurada') && (
            <button type="button" onClick={() => setByHand(false)} className="w-full text-center text-sm text-mute underline">
              Voltar para a busca FIPE
            </button>
          )}
        </form>
      </Card>
    )

  return (
    <Card title="Buscar na Tabela FIPE">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Field label="Marca e modelo">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="ex.: clio 1.0 16v" />
          </Field>
          <Field label="Ano">
            <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="2012" />
          </Field>
        </div>
        {msg && <Notice tone="muted">{msg}</Notice>}
        <Button type="submit" className="w-full" disabled={busy || text.trim().length < 2}>
          <Search size={18} /> {busy ? 'Buscando…' : 'Buscar'}
        </Button>
      </form>

      {models && models.length > 0 && (
        <ul className="mt-4 space-y-2">
          {models.map((m) => {
            const years = m.years.filter((y) => !y.zero_km && y.year)
            const chosenYear = year ? Number(year) : null
            const y = years.find((x) => x.year === chosenYear) ?? null
            return (
              <li key={m.fipe_code} className="rounded-xl border border-line p-3">
                <div className="text-sm font-semibold">
                  {m.brand} {m.name}
                </div>
                <div className="mb-2 text-xs text-mute">FIPE {m.fipe_code}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(y ? [y] : years.slice(0, 12)).map((yy) => (
                    <button
                      key={`${yy.year}-${yy.fuel}`}
                      type="button"
                      onClick={() =>
                        onPick({
                          plate,
                          brand: m.brand,
                          model: m.name.split(' ')[0],
                          version: m.name,
                          manufacture_year: yy.year,
                          model_year: yy.year,
                          fuel: yy.fuel,
                          fipe_code: m.fipe_code,
                          fipe_amount: null,
                        })
                      }
                      className="rounded-lg bg-panel-2 px-3 py-1.5 text-sm font-semibold hover:bg-accent hover:text-accent-ink"
                    >
                      {yy.year}
                      {yy.fuel ? ` · ${yy.fuel}` : ''}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex justify-between text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-mute underline">
            Voltar para a placa
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => setByHand(true)} className="text-mute underline">
          Preencher à mão
        </button>
      </div>
    </Card>
  )
}
