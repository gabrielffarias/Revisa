import { requireUser } from '@/lib/auth'
import { NotifSettings } from '@/components/NotifSettings'
import { Submit } from '@/components/Submit'
import { Card, PageTitle } from '@/components/ui'
import { sair } from '../../login/actions'

export const metadata = { title: 'Ajustes · Revisa' }

export default async function AjustesPage() {
  const user = await requireUser()
  return (
    <div className="space-y-4">
      <PageTitle title="Ajustes" sub={user.email} />
      <Card title="Lembretes">
        <NotifSettings />
      </Card>
      <Card title="Conta">
        <form action={sair}>
          <Submit variant="ghost" className="w-full" pending="Saindo…">
            Sair
          </Submit>
        </form>
      </Card>
      <p className="text-center text-xs text-mute">
        Revisa · código aberto (MIT) ·{' '}
        <a href="https://github.com/gabrielffarias/Revisa" className="underline">
          GitHub
        </a>
      </p>
    </div>
  )
}
