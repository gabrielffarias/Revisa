import { PageTitle } from '@/components/ui'
import { CarWizard } from './CarWizard'

export const metadata = { title: 'Cadastrar carro · Revisa' }

export default function NovoCarro() {
  return (
    <>
      <PageTitle title="Seu carro" sub="Digite a placa: a gente puxa marca, modelo, ano e FIPE." />
      <CarWizard placaOn={!!process.env.CONSULTA_PLACA_KEY} />
    </>
  )
}
