'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { delItem, salvarItem } from '../actions'
import { ActionForm } from '@/components/ActionForm'
import { Submit } from '@/components/Submit'
import { Button, Field } from '@/components/ui'
import { intervalLabel } from '@/lib/maintenance'
import { CATEGORIES, type PlanItem } from '@/lib/types'

function Fields({ item }: { item?: PlanItem }) {
  return (
    <>
      <Field label="Item">
        <input name="name" defaultValue={item?.name} required maxLength={120} placeholder="ex.: Troca do óleo do câmbio" />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="A cada (km)">
          <input name="interval_km" inputMode="numeric" defaultValue={item?.interval_km ?? ''} placeholder="10000" />
        </Field>
        <Field label="ou (meses)">
          <input name="interval_months" inputMode="numeric" defaultValue={item?.interval_months ?? ''} placeholder="12" />
        </Field>
        <Field label="Categoria">
          <select name="category" defaultValue={item?.category ?? 'outros'}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Observação">
        <input name="notes" defaultValue={item?.notes ?? ''} maxLength={300} />
      </Field>
    </>
  )
}

export function ItemLine({ item, vehicleId }: { item: PlanItem; vehicleId: string }) {
  const [edit, setEdit] = useState(false)
  if (edit)
    return (
      <li className="rounded-xl border border-accent/50 bg-panel-2 p-3">
        <ActionForm action={salvarItem} reset={false} onDone={() => setEdit(false)}>
          <input type="hidden" name="vehicle_id" value={vehicleId} />
          <input type="hidden" name="id" value={item.id} />
          <Fields item={item} />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => setEdit(false)}>
              Cancelar
            </Button>
            <Submit>Salvar</Submit>
          </div>
        </ActionForm>
      </li>
    )
  return (
    <li className="flex items-start gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{item.name}</div>
        <div className="text-xs text-accent">{intervalLabel(item)}</div>
        {item.notes && <div className="text-xs text-mute">{item.notes}</div>}
      </div>
      <button type="button" onClick={() => setEdit(true)} aria-label="Editar" className="p-2 text-mute hover:text-ink">
        <Pencil size={16} />
      </button>
      <form
        action={delItem}
        onSubmit={(e) => {
          if (!confirm(`Remover "${item.name}" do plano? O histórico de serviços continua.`)) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={item.id} />
        <button aria-label="Remover" className="p-2 text-mute hover:text-bad">
          <Trash2 size={16} />
        </button>
      </form>
    </li>
  )
}

export function NewItem({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <Button variant="ghost" className="w-full" onClick={() => setOpen(true)}>
        <Plus size={18} /> Adicionar item
      </Button>
    )
  return (
    <div className="rounded-xl border border-line bg-panel-2 p-3">
      <ActionForm action={salvarItem} onDone={() => setOpen(false)}>
        <input type="hidden" name="vehicle_id" value={vehicleId} />
        <Fields />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Submit>Adicionar</Submit>
        </div>
      </ActionForm>
    </div>
  )
}
