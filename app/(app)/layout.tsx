import { Nav } from '@/components/Nav'
import { NativeBoot } from '@/components/NativeBoot'
import { requireUser } from '@/lib/auth'
import { q } from '@/lib/db'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  // muda sempre que algo relevante para os lembretes muda
  const [{ stamp }] = await q<{ stamp: string }>`
    select concat_ws('|',
      (select count(*) || ':' || coalesce(max(r.created_at)::text, '') from odometer_readings r join vehicles v on v.id = r.vehicle_id where v.user_id = ${user.id}),
      (select count(*) || ':' || coalesce(max(s.created_at)::text, '') from services s join vehicles v on v.id = s.vehicle_id where v.user_id = ${user.id}),
      (select count(*) || ':' || coalesce(sum(coalesce(p.interval_km, 0) + coalesce(p.interval_months, 0)), 0) from plan_items p join vehicles v on v.id = p.vehicle_id where v.user_id = ${user.id})
    ) as stamp`
  return (
    <>
      <main className="mx-auto max-w-xl px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
      <Nav />
      <NativeBoot stamp={stamp} />
    </>
  )
}
