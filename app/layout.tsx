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
    startupImage: [
      { url: '/icons/splash-iphonese.png',        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/icons/splash-iphonexr.png',         media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/icons/splash-iphone12.png',         media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/icons/splash-iphone14-pro.png',     media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/icons/splash-iphone13-promax.png',  media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/icons/splash-iphone14-promax.png',  media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/icons/splash-ipad.png',             media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/icons/splash-ipad-pro-11.png',      media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/icons/splash-ipad-pro-12.png',      media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
    ],
  },
  icons: {
    apple: [
      { url: '/icons/icon-180.png', sizes: '180x180' },
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/icon-167.png', sizes: '167x167' },
    ],
    icon: [
      { url: '/icons/icon-96.png',  sizes: '96x96',  type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
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
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }) }`}
        </Script>
      </body>
    </html>
  )
}
