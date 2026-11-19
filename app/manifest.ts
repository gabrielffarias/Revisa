import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Revisa — manutenção do carro',
    short_name: 'Revisa',
    description: 'Plano de revisão, quilometragem, serviços e lembretes do seu carro',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0d10',
    theme_color: '#0c0d10',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
