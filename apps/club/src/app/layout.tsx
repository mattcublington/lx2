import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Club Console — LX2',
  description: 'Run your club better.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
