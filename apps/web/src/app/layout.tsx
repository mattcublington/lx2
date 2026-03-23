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
      <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Lexend:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
