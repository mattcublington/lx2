import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
