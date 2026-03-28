import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',       label: 'Dashboard',     icon: '⌂' },
  { href: '/teesheet',        label: 'Tee Sheet',     icon: '⛳' },
  { href: '/members',         label: 'Members',       icon: '👥' },
  { href: '/competitions',    label: 'Competitions',  icon: '🏆' },
  { href: '/courses',         label: 'Courses',       icon: '🗺' },
  { href: '/teesheet/config', label: 'Sheet Config',  icon: '⚙' },
]

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', color: '#F1F5F9' }}>
      <aside style={{ width: 220, background: '#1E293B', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#93C5FD', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Club Console</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Cumberwell Park</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, color: '#CBD5E1', textDecoration: 'none', fontSize: 14 }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #334155' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
