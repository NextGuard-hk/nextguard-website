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
]

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
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

  // Don't show sidebar on login page
  if (pathname === '/console/login') return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e1a' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 240,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d1321 0%, #0a0e1a 100%)',
        borderRight: '1px solid rgba(0,255,200,0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : undefined,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 8px' : '20px 16px',
          borderBottom: '1px solid rgba(0,255,200,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }} onClick={() => setCollapsed(!collapsed)}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #00ffc8, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#0a0e1a',
            flexShrink: 0,
          }}>NG</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>NextGuard</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>DLP Console</div>
            </div>
          )}
        </div>
        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.path || (item.path !== '/console' && pathname?.startsWith(item.path))
            return (
              <button
                key={item.path}
                onClick={() => { router.push(item.path); setMobileOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#00ffc8' : '#94a3b8',
                  background: isActive ? 'rgba(0,255,200,0.08)' : 'transparent',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>
        {/* Bottom */}
        {!collapsed && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(0,255,200,0.1)',
            fontSize: 11,
            color: '#475569',
          }}>
            NextGuard DLP v2.0<br />Enterprise Management
          </div>
        )}
      </aside>
      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: collapsed ? 64 : 240,
        transition: 'margin-left 0.2s ease',
        minHeight: '100vh',
        background: '#0a0e1a',
      }}>
        {/* Top bar */}
        <div style={{
          height: 48,
          borderBottom: '1px solid rgba(0,255,200,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          justifyContent: 'space-between',
          background: 'rgba(13,19,33,0.8)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, display: 'none' }}
            >
              ☰
            </button>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              {NAV_ITEMS.find(n => n.path === pathname || (n.path !== '/console' && pathname?.startsWith(n.path)))?.label || 'Console'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#22c55e', fontSize: 11 }}>● System Online</span>
          </div>
        </div>
        {/* Page content */}
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
