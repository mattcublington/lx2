import type { Metadata } from 'next'
import {
  DM_Sans,
  DM_Serif_Display,
  Manrope,
  Lexend,
  Cormorant_Garamond,
} from 'next/font/google'
import './globals.css'

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

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
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
        cormorant.variable,
      ].join(' ')}
    >
      <body>{children}</body>
    </html>
  )
}
