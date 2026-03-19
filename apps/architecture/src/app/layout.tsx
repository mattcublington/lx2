import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LX2 — Architecture',
  description: 'Platform architecture and module registry',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#fafaf9', margin: 0 }}>{children}</body>
    </html>
  )
}
