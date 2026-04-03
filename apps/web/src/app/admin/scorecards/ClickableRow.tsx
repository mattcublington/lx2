'use client'

import { useRouter } from 'next/navigation'

interface Props {
  href: string
  children: React.ReactNode
  className?: string
}

export default function ClickableRow({ href, children, className }: Props) {
  const router = useRouter()
  return (
    <tr
      className={className}
      onClick={() => router.push(href)}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </tr>
  )
}
