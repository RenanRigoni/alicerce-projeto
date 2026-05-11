import type { Metadata, Viewport } from 'next'
import { Lora, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora-var',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans-var',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Alicerce — Espaço Terapêutico',
  description: 'Portal de acompanhamento terapêutico infantil',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alicerce',
  },
  icons: {
    apple: '/logo_ico.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#D4716A',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${lora.variable} ${dmSans.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo_ico.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js') }`}
        </Script>
      </body>
    </html>
  )
}
