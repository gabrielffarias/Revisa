import type { PlanDraftItem } from './types'

/**
 * Plano genérico para carro de passeio flex no Brasil (uso normal).
 * É só o ponto de partida: o certo é gerar o plano do modelo (IA) ou pelo manual do carro.
 */
export const DEFAULT_PLAN: PlanDraftItem[] = [
  { name: 'Óleo do motor e filtro de óleo', category: 'motor', interval_km: 10000, interval_months: 12, notes: 'Uso severo (trânsito pesado, trechos curtos, poeira): metade do intervalo.' },
  { name: 'Filtro de ar do motor', category: 'filtros', interval_km: 20000, interval_months: 24, notes: 'Em estrada de terra, verifique a cada troca de óleo.' },
  { name: 'Filtro de combustível', category: 'filtros', interval_km: 20000, interval_months: 24, notes: null },
  { name: 'Filtro do ar-condicionado (cabine)', category: 'filtros', interval_km: 15000, interval_months: 12, notes: null },
  { name: 'Velas de ignição', category: 'motor', interval_km: 30000, interval_months: 36, notes: null },
  { name: 'Correia dentada e tensor', category: 'motor', interval_km: 50000, interval_months: 48, notes: 'Item crítico: se romper, pode danificar o motor. Confirme o intervalo no manual do seu motor.' },
  { name: 'Correia de acessórios (alternador)', category: 'motor', interval_km: 50000, interval_months: 48, notes: null },
  { name: 'Fluido de freio', category: 'freios', interval_km: null, interval_months: 24, notes: 'Absorve umidade com o tempo, por isso vence por data.' },
  { name: 'Pastilhas e discos de freio (inspeção)', category: 'freios', interval_km: 10000, interval_months: 12, notes: null },
  { name: 'Líquido de arrefecimento', category: 'arrefecimento', interval_km: 40000, interval_months: 24, notes: 'Use o aditivo indicado pela montadora.' },
  { name: 'Alinhamento e balanceamento', category: 'pneus', interval_km: 10000, interval_months: 12, notes: 'Faça também depois de bater forte em buraco.' },
  { name: 'Rodízio dos pneus', category: 'pneus', interval_km: 10000, interval_months: null, notes: null },
  { name: 'Amortecedores e suspensão (inspeção)', category: 'suspensao', interval_km: 40000, interval_months: null, notes: null },
  { name: 'Óleo do câmbio (verificação)', category: 'transmissao', interval_km: 60000, interval_months: null, notes: 'Muitos câmbios manuais não têm troca prevista, só verificação de nível.' },
  { name: 'Bateria (teste de carga)', category: 'eletrica', interval_km: null, interval_months: 12, notes: 'Dura em média de 2 a 4 anos.' },
  { name: 'Palhetas do limpador', category: 'outros', interval_km: null, interval_months: 12, notes: null },
]
