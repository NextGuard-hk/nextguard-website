'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/console', icon: '📊' },
  { label: 'Agents', path: '/console/agents', icon: '🖥️' },
  { label: 'Policies', path: '/console/policies', icon: '📋' },
  { label: 'Incidents', path: '/console/incidents', icon: '🚨' },
  { label: 'Logs', path: '/console/logs', icon: '📝' },
  { label: 'Syslog', path: '/console/syslog', icon: '📡' },
  { label: 'Reports', path: '/console/reports', icon: '📈' },
  { label: 'App Monitor', path: '/console/app-monitor', icon: '👁️' },
  { label: 'Settings', path: '/console/settings', icon: '⚙️' },
  { label: 'Tenants', path: '/console/tenants', icon: '🏢' },
]

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const header = document.querySelector('header')
    const footer = document.querySelector('footer')
    const main = document.querySelector('main')
    if (header) header.style.display = 'none'
    if (footer) footer.style.display = 'none'
    if (main) { main.style.minHeight = '100vh'; main.style.padding = '0' }
    return () => {
      if (header) header.style.display = ''
      if (footer) footer.style.display = ''
      if (main) { main.style.minHeight = ''; main.style.padding = '' }
    }
  }, [])

  if (pathname === '/console/login') return <>{children}</>

  const sidebarWidth = 220

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0' }}>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}

      <div style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: 48, zIndex: 30,
        background: '#0f1629', borderBottom: '1px solid #1e293b',
        alignItems: 'center', padding: '0 16px', gap: 12
      }} className="mobile-topbar">
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>☰</button>
        <span style={{ fontWeight: 600, color: '#00ffc8', fontSize: 14 }}>
          {NAV_ITEMS.find(n => n.path === pathname || (n.path !== '/console' && pathname?.startsWith(n.path)))?.label || 'Console'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e' }}>● Online</span>
      </div>

      <aside style={{
        width: sidebarWidth, minWidth: sidebarWidth, background: '#0f1629',
        borderRight: '1px solid #1e293b', padding: '20px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
        position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.2s ease', overflowY: 'auto'
      }} className="console-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 20px', borderBottom: '1px solid #1e293b', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #00ffc8, #0066ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>NG</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>NextGuard</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>DLP Console</div>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.path || (item.path !== '/console' && pathname?.startsWith(item.path))
            return (
              <button key={item.path} onClick={() => { router.push(item.path); setMobileOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#00ffc8' : '#94a3b8',
                background: isActive ? 'rgba(0,255,200,0.08)' : 'transparent',
                transition: 'all 0.15s ease', width: '100%', textAlign: 'left'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ fontSize: 10, color: '#475569', textAlign: 'center', padding: '12px 0', borderTop: '1px solid #1e293b' }}>
          NextGuard DLP v2.0<br/>Enterprise Management
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: sidebarWidth, minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="console-main">
        <div style={{
          height: 48, borderBottom: '1px solid #1e293b', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
          background: '#0f1629', position: 'sticky', top: 0, zIndex: 20
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#e2e8f0' }}>
            {NAV_ITEMS.find(n => n.path === pathname || (n.path !== '/console' && pathname?.startsWith(n.path)))?.label || 'Console'}
          </span>
          <span style={{ fontSize: 11, color: '#22c55e' }}>● System Online</span>
        </div>
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .console-sidebar { transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'} !important; }
          .console-main { margin-left: 0 !important; }
          .mobile-topbar { display: flex !important; }
          .console-main > div:first-child { display: none !important; }
          .console-main > div:last-child { padding-top: 60px !important; }
        }
      `}</style>
    </div>
  )
}
