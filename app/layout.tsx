import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revisa',
  description: 'Manutenção do carro em dia: plano de revisão por km e tempo, histórico e lembretes',
  appleWebApp: { capable: true, title: 'Revisa', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0c0d10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap" />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
