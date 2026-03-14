'use client'
import React, { useState } from 'react'

interface HoneyPot {
  id: string
  name: string
  type: 'server' | 'endpoint' | 'database' | 'credential' | 'file'
  status: 'active' | 'triggered' | 'idle'
  interactions: number
  lastActivity: string
  attackerIP: string
  decoySector: string
}

interface BreadCrumb {
  id: string
  name: string
  planted: string
  triggered: boolean
  location: string
  attractiveness: number
}

interface AttackerSession {
  id: string
  ip: string
  country: string
  startTime: string
  duration: string
  honeypotName: string
  commands: string[]
  phase: string
}

const mockHoneypots: HoneyPot[] = [
  { id: 'hp-001', name: 'PROD-DC-FAKE-01', type: 'server', status: 'triggered', interactions: 47, lastActivity: '3m ago', attackerIP: '45.33.32.156', decoySector: 'Domain Controller' },
  { id: 'hp-002', name: 'HR-DB-DECOY', type: 'database', status: 'active', interactions: 12, lastActivity: '1h ago', attackerIP: '192.168.1.45', decoySector: 'HR Database' },
  { id: 'hp-003', name: 'CEO-CREDS-FAKE', type: 'credential', status: 'triggered', interactions: 8, lastActivity: '15m ago', attackerIP: '103.21.244.0', decoySector: 'Executive Credentials' },
  { id: 'hp-004', name: 'FINANCE-SRV-02', type: 'server', status: 'active', interactions: 3, lastActivity: '2h ago', attackerIP: '', decoySector: 'Finance Server' },
  { id: 'hp-005', name: 'PAYROLL-FILE-DECOY', type: 'file', status: 'idle', interactions: 0, lastActivity: 'Never', attackerIP: '', decoySector: 'Payroll Data' },
  { id: 'hp-006', name: 'ENDPOINT-WIN11-X7', type: 'endpoint', status: 'active', interactions: 21, lastActivity: '45m ago', attackerIP: '185.220.101.47', decoySector: 'Developer Workstation' }
]

const mockBreadcrumbs: BreadCrumb[] = [
  { id: 'bc-001', name: 'Fake AWS Keys', planted: '2d ago', triggered: true, location: '.aws/credentials', attractiveness: 95 },
  { id: 'bc-002', name: 'VPN Config File', planted: '5d ago', triggered: false, location: 'Desktop/vpn-config.ovpn', attractiveness: 87 },
  { id: 'bc-003', name: 'DB Password File', planted: '1d ago', triggered: true, location: 'Documents/passwords.txt', attractiveness: 92 },
  { id: 'bc-004', name: 'Internal API Docs', planted: '7d ago', triggered: false, location: 'Dev Share/internal-api.pdf', attractiveness: 78 }
]

const mockSession: AttackerSession = {
  id: 'sess-001',
  ip: '45.33.32.156',
  country: 'Russia',
  startTime: '14:23:07',
  duration: '18m 34s',
  honeypotName: 'PROD-DC-FAKE-01',
  commands: [
    'net user /domain',
    'whoami /priv',
    'ipconfig /all',
    'net view',
    'dir C:\\Users',
    'reg query HKLM\\SAM'
  ],
  phase: 'Privilege Escalation'
}

const styles = `
  .dt-card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a4a; }
  .dt-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .dt-title { font-size: 16px; font-weight: 700; color: #e0e0e0; display: flex; align-items: center; gap: 8px; }
  .dt-badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .dt-badge-active { background: #f59e0b20; color: #f59e0b; border: 1px solid #f59e0b44; }
  .dt-badge-alert { background: #ef444420; color: #ef4444; border: 1px solid #ef444444; animation: dtPulse 1.5s infinite; }
  @keyframes dtPulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  .dt-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .dt-stat { background: #12122a; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; text-align: center; }
  .dt-stat-val { font-size: 22px; font-weight: 800; }
  .dt-stat-label { font-size: 10px; color: #888; margin-top: 2px; }
  .dt-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
  .dt-tab { padding: 5px 12px; border-radius: 6px; border: 1px solid #333; background: transparent; color: #888; font-size: 11px; cursor: pointer; }
  .dt-tab-active { background: #f59e0b15; border-color: #f59e0b44; color: #f59e0b; }
  .dt-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .dt-table th { color: #888; text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a2a4a; font-weight: 600; font-size: 10px; text-transform: uppercase; }
  .dt-table td { padding: 7px 8px; border-bottom: 1px solid #1a1a3a; color: #ccc; }
  .dt-status { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  .dt-status-triggered { background: #ef444420; color: #ef4444; }
  .dt-status-active { background: #22c55e20; color: #22c55e; }
  .dt-status-idle { background: #88888820; color: #888; }
  .dt-icon { font-size: 13px; }
  .dt-session { background: #12122a; border-radius: 8px; padding: 14px; border: 1px solid #ef444430; margin-top: 12px; }
  .dt-cmd { font-family: monospace; font-size: 11px; color: #ef4444; background: #2a0a0a; padding: 3px 8px; border-radius: 3px; margin: 2px 0; display: block; }
  .dt-bc-bar { height: 4px; background: #2a2a4a; border-radius: 2px; overflow: hidden; margin-top: 4px; }
  .dt-bc-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 2px; }
`

const TYPE_ICONS: Record<string, string> = {
  server: '&#128421;',
  endpoint: '&#128187;',
  database: '&#128202;',
  credential: '&#128273;',
  file: '&#128196;'
}

export default function DeceptionTechnology() {
  const [tab, setTab] = useState<'honeypots' | 'breadcrumbs' | 'session'>('honeypots')

  const triggered = mockHoneypots.filter(h => h.status === 'triggered').length
  const active = mockHoneypots.filter(h => h.status === 'active').length
  const totalInteractions = mockHoneypots.reduce((a, h) => a + h.interactions, 0)

  return (
    <div className="dt-card">
      <style>{styles}</style>
      <div className="dt-header">
        <div className="dt-title">
          <span style={{fontSize:18}}>&#127519;</span>
          Deception Technology
        </div>
        {triggered > 0 && <span className="dt-badge dt-badge-alert">&#9888; {triggered} Triggered</span>}
      </div>
      <div className="dt-stats">
        <div className="dt-stat">
          <div className="dt-stat-val" style={{color:'#f59e0b'}}>{mockHoneypots.length}</div>
          <div className="dt-stat-label">Honeypots</div>
        </div>
        <div className="dt-stat">
          <div className="dt-stat-val" style={{color:'#ef4444'}}>{triggered}</div>
          <div className="dt-stat-label">Triggered</div>
        </div>
        <div className="dt-stat">
          <div className="dt-stat-val" style={{color:'#22c55e'}}>{totalInteractions}</div>
          <div className="dt-stat-label">Interactions</div>
        </div>
      </div>
      <div className="dt-tabs">
        {(['honeypots', 'breadcrumbs', 'session'] as const).map(t => (
          <button key={t} className={`dt-tab${tab === t ? ' dt-tab-active' : ''}`} onClick={() => setTab(t)}>
            {t === 'honeypots' ? '&#127857; Honeypots' : t === 'breadcrumbs' ? '&#127828; Breadcrumbs' : '&#128269; Live Session'}
          </button>
        ))}
      </div>
      {tab === 'honeypots' && (
        <table className="dt-table">
          <thead><tr><th>Type</th><th>Name</th><th>Status</th><th>Interactions</th><th>Last Activity</th></tr></thead>
          <tbody>
            {mockHoneypots.map(h => (
              <tr key={h.id}>
                <td><span className="dt-icon" dangerouslySetInnerHTML={{__html: TYPE_ICONS[h.type]}} /></td>
                <td style={{fontFamily:'monospace'}}>{h.name}</td>
                <td><span className={`dt-status dt-status-${h.status}`}>{h.status}</span></td>
                <td style={{color: h.interactions > 0 ? '#f59e0b' : '#888'}}>{h.interactions}</td>
                <td style={{color:'#888'}}>{h.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === 'breadcrumbs' && (
        <table className="dt-table">
          <thead><tr><th>Name</th><th>Location</th><th>Attractiveness</th><th>Planted</th><th>Status</th></tr></thead>
          <tbody>
            {mockBreadcrumbs.map(bc => (
              <tr key={bc.id}>
                <td style={{fontWeight:600}}>{bc.name}</td>
                <td style={{fontFamily:'monospace',color:'#888',fontSize:10}}>{bc.location}</td>
                <td style={{width:80}}>
                  <div className="dt-bc-bar"><div className="dt-bc-fill" style={{width:`${bc.attractiveness}%`}} /></div>
                  <span style={{fontSize:10,color:'#f59e0b'}}>{bc.attractiveness}%</span>
                </td>
                <td style={{color:'#888'}}>{bc.planted}</td>
                <td><span className={`dt-status ${bc.triggered ? 'dt-status-triggered' : 'dt-status-active'}`}>{bc.triggered ? 'Triggered' : 'Waiting'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === 'session' && (
        <div className="dt-session">
          <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12}}>
            <div>
              <div style={{fontWeight:700,color:'#ef4444',fontSize:13}}>&#9888; Active Attacker Session</div>
              <div style={{fontSize:11,color:'#888',marginTop:2}}>Honeypot: {mockSession.honeypotName} | {mockSession.ip} ({mockSession.country})</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11,color:'#ccc'}}>Duration: {mockSession.duration}</div>
              <div style={{fontSize:11,color:'#f59e0b'}}>Phase: {mockSession.phase}</div>
            </div>
          </div>
          <div style={{fontSize:11,color:'#888',marginBottom:6}}>Captured Commands:</div>
          {mockSession.commands.map((cmd, i) => (
            <span key={i} className="dt-cmd">&gt; {cmd}</span>
          ))}
        </div>
      )}
    </div>
  )
}
