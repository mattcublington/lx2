import type { Metadata } from 'next'
import {
  DM_Sans,
  DM_Serif_Display,
  Manrope,
  Lexend,
} from 'next/font/google'
import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration'
import OfflineBanner from '@/components/pwa/OfflineBanner'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-lexend',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LX2',
  description: 'Golf scoring, stats and society management',
  openGraph: {
    title: 'LX2',
    description: 'Golf scoring, stats and society management',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LX2',
  },
  other: {
    'theme-color': '#0D631B',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={[
        dmSans.variable,
        dmSerifDisplay.variable,
        manrope.variable,
        lexend.variable,
      ].join(' ')}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch.png" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <OfflineBanner />
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
