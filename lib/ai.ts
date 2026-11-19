import 'server-only'
import type { Category, PlanDraftItem, Vehicle } from './types'
import { CATEGORIES } from './types'

// Gemini (Google AI Studio): tem cota gratuita e devolve JSON no formato pedido.
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export type PlanDraft = { summary: string; items: PlanDraftItem[]; fromManual: boolean }

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    resumo: { type: 'STRING', description: 'Uma ou duas frases: de onde vieram os intervalos e o que conferir.' },
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nome: { type: 'STRING' },
          categoria: { type: 'STRING', enum: Object.keys(CATEGORIES) },
          intervalo_km: { type: 'INTEGER', nullable: true },
          intervalo_meses: { type: 'INTEGER', nullable: true },
          observacao: { type: 'STRING', nullable: true },
        },
        required: ['nome', 'categoria'],
      },
    },
  },
  required: ['resumo', 'itens'],
}

function prompt(v: Vehicle, manual: string | null) {
  const car = [
    `Marca: ${v.brand}`,
    `Modelo: ${v.model}`,
    v.version && `Versão: ${v.version}`,
    v.model_year && `Ano modelo: ${v.model_year}`,
    v.manufacture_year && `Ano de fabricação: ${v.manufacture_year}`,
    v.fuel && `Combustível: ${v.fuel}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `Você é um mecânico experiente no mercado brasileiro. Monte o plano de manutenção preventiva deste carro, em português do Brasil.

${car}

Regras:
- Cada item vence pelo que vier primeiro: quilometragem (intervalo_km) ou tempo (intervalo_meses). Use null quando o item não tiver um dos dois.
- Use os intervalos de USO NORMAL da montadora para esse motor e ano. Se o uso severo for diferente, diga na observação (ex.: "Uso severo: 5.000 km ou 6 meses").
- Inclua óleo e filtro, filtros (ar, combustível, cabine), velas, correia dentada ou corrente de comando (diga qual o motor usa), correia de acessórios, fluido de freio, freios, arrefecimento, câmbio, suspensão, pneus (alinhamento, rodízio), bateria e o que mais o manual previr.
- Itens de inspeção devem ter "(inspeção)" no nome.
- Observações curtas (até 120 caracteres), práticas, sem repetir o nome do item.
- Não invente: quando não tiver certeza de um intervalo específico do modelo, use o valor mais comum para carros parecidos e diga "confira no manual" na observação.
${
  manual
    ? `\nAbaixo está o texto extraído do MANUAL DO PROPRIETÁRIO deste carro. Ele manda: use exatamente os intervalos do plano de revisões dele e só complete com conhecimento geral o que faltar (dizendo isso no resumo).\n\n<manual>\n${manual}\n</manual>`
    : ''
}`
}

const clampInt = (v: unknown, max: number) => {
  const n = typeof v === 'number' ? Math.round(v) : Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) && n > 0 && n <= max ? n : null
}

export async function generatePlan(vehicle: Vehicle, manualText: string | null): Promise<{ ok: true; draft: PlanDraft } | { ok: false; error: string }> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { ok: false, error: 'IA não configurada (GEMINI_API_KEY).' }
  const manual = manualText?.trim() ? manualText.trim().slice(0, 80000) : null

  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(vehicle, manual) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
      signal: AbortSignal.timeout(55000),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, error: 'A IA demorou demais para responder. Tente de novo.' }
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    return { ok: false, error: res.status === 429 ? 'Cota gratuita da IA esgotada por agora. Tente mais tarde.' : `IA falhou (${res.status}): ${err?.error?.message ?? 'erro desconhecido'}` }
  }

  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  let parsed: { resumo?: string; itens?: Record<string, unknown>[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'A IA respondeu num formato inesperado. Tente de novo.' }
  }

  const items: PlanDraftItem[] = (parsed.itens ?? [])
    .map((i) => ({
      name: String(i.nome ?? '').trim().slice(0, 120),
      category: (Object.keys(CATEGORIES).includes(String(i.categoria)) ? i.categoria : 'outros') as Category,
      interval_km: clampInt(i.intervalo_km, 500000),
      interval_months: clampInt(i.intervalo_meses, 240),
      notes: i.observacao ? String(i.observacao).trim().slice(0, 300) : null,
    }))
    .filter((i) => i.name && (i.interval_km || i.interval_months))

  if (!items.length) return { ok: false, error: 'A IA não devolveu nenhum item válido. Tente de novo.' }
  return { ok: true, draft: { summary: String(parsed.resumo ?? '').slice(0, 500), items, fromManual: !!manual } }
}
