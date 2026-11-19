'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gauge, Home, ListChecks, Settings, Wrench } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/km', label: 'Km', icon: Gauge },
  { href: '/servicos', label: 'Serviços', icon: Wrench },
  { href: '/plano', label: 'Plano', icon: ListChecks },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function Nav() {
  const path = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <li key={href}>
              <Link href={href} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-accent' : 'text-mute'}`}>
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
