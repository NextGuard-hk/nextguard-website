'use client'
import React, { useState } from 'react'

interface MaturityDomain {
  name: string
  currentLevel: number
  targetLevel: number
  score: number
  subdomains: { name: string; score: number }[]
}

interface Framework {
  name: string
  compliance: number
  lastAssessment: string
  nextAssessment: string
}

const mockDomains: MaturityDomain[] = [
  {
    name: 'Threat Detection',
    currentLevel: 4,
    targetLevel: 5,
    score: 82,
    subdomains: [
      { name: 'SIEM Integration', score: 90 },
      { name: 'Behavioral Analysis', score: 78 },
      { name: 'Threat Hunting', score: 75 },
      { name: 'IoC Detection', score: 85 }
    ]
  },
  {
    name: 'Incident Response',
    currentLevel: 3,
    targetLevel: 5,
    score: 71,
    subdomains: [
      { name: 'Playbook Maturity', score: 80 },
      { name: 'Response Time', score: 65 },
      { name: 'Containment', score: 73 },
      { name: 'Recovery', score: 66 }
    ]
  },
  {
    name: 'Vulnerability Mgmt',
    currentLevel: 4,
    targetLevel: 5,
    score: 78,
    subdomains: [
      { name: 'Scan Coverage', score: 92 },
      { name: 'Patch Velocity', score: 68 },
      { name: 'Risk Prioritization', score: 80 },
      { name: 'Remediation SLA', score: 72 }
    ]
  },
  {
    name: 'Identity & Access',
    currentLevel: 3,
    targetLevel: 4,
    score: 68,
    subdomains: [
      { name: 'MFA Coverage', score: 85 },
      { name: 'Privilege Mgmt', score: 60 },
      { name: 'Access Review', score: 55 },
      { name: 'SSO Adoption', score: 72 }
    ]
  },
  {
    name: 'Data Protection',
    currentLevel: 4,
    targetLevel: 5,
    score: 85,
    subdomains: [
      { name: 'DLP Coverage', score: 92 },
      { name: 'Encryption', score: 88 },
      { name: 'Classification', score: 78 },
      { name: 'Backup & Recovery', score: 82 }
    ]
  },
  {
    name: 'Security Operations',
    currentLevel: 3,
    targetLevel: 5,
    score: 74,
    subdomains: [
      { name: 'SOC Efficiency', score: 80 },
      { name: 'SOAR Automation', score: 70 },
      { name: 'Threat Intel Integration', score: 76 },
      { name: 'Reporting', score: 70 }
    ]
  }
]

const mockFrameworks: Framework[] = [
  { name: 'NIST CSF', compliance: 82, lastAssessment: '2024-11-15', nextAssessment: '2025-05-15' },
  { name: 'ISO 27001', compliance: 88, lastAssessment: '2024-10-01', nextAssessment: '2025-04-01' },
  { name: 'MITRE ATT&CK', compliance: 76, lastAssessment: '2024-12-01', nextAssessment: '2025-06-01' },
  { name: 'CIS Controls', compliance: 79, lastAssessment: '2024-09-20', nextAssessment: '2025-03-20' }
]

const styles = `
  .ms-card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a4a; }
  .ms-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .ms-title { font-size: 16px; font-weight: 700; color: #e0e0e0; display: flex; align-items: center; gap: 8px; }
  .ms-overall { display: flex; align-items: center; gap: 16px; background: #12122a; border-radius: 10px; padding: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .ms-score-ring { width: 80px; height: 80px; position: relative; flex-shrink: 0; }
  .ms-score-ring svg { transform: rotate(-90deg); }
  .ms-score-val { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; font-weight: 800; color: #e0e0e0; }
  .ms-overall-meta { flex: 1; min-width: 150px; }
  .ms-level { font-size: 12px; color: #888; margin-bottom: 4px; }
  .ms-level-bar { display: flex; gap: 3px; margin-top: 4px; }
  .ms-level-dot { width: 16px; height: 6px; border-radius: 3px; }
  .ms-domains { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .ms-domain { background: #12122a; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; cursor: pointer; transition: border-color 0.2s; }
  .ms-domain:hover { border-color: #4a4a8a; }
  .ms-domain.selected { border-color: #3b82f6; }
  .ms-domain-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .ms-domain-name { font-size: 12px; font-weight: 600; color: #e0e0e0; }
  .ms-domain-score { font-size: 14px; font-weight: 800; }
  .ms-bar { height: 4px; background: #2a2a4a; border-radius: 2px; overflow: hidden; }
  .ms-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
  .ms-subdomain { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px; }
  .ms-detail { background: #12122a; border-radius: 8px; padding: 14px; border: 1px solid #2a2a4a; margin-bottom: 16px; }
  .ms-frameworks { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .ms-fw { background: #12122a; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; }
  .ms-fw-name { font-size: 12px; font-weight: 700; color: #e0e0e0; margin-bottom: 6px; }
  .ms-fw-bar { height: 4px; background: #2a2a4a; border-radius: 2px; overflow: hidden; margin: 6px 0; }
  .ms-fw-fill { height: 100%; border-radius: 2px; }
  @media (max-width: 600px) { .ms-domains { grid-template-columns: 1fr; } .ms-frameworks { grid-template-columns: 1fr; } }
`

const getScoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'

export default function MaturityScorecard() {
  const [selected, setSelected] = useState<MaturityDomain>(mockDomains[0])

  const overallScore = Math.round(mockDomains.reduce((a, d) => a + d.score, 0) / mockDomains.length)
  const overallLevel = Math.round(mockDomains.reduce((a, d) => a + d.currentLevel, 0) / mockDomains.length)

  const circumference = 2 * Math.PI * 34
  const offset = circumference - (overallScore / 100) * circumference

  return (
    <div className="ms-card">
      <style>{styles}</style>
      <div className="ms-header">
        <div className="ms-title">
          <span style={{fontSize:18}}>&#127942;</span>
          Security Maturity Scorecard
        </div>
        <span style={{fontSize:10,color:'#888'}}>Last Updated: Today</span>
      </div>
      <div className="ms-overall">
        <div className="ms-score-ring">
          <svg width="80" height="80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#2a2a4a" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={getScoreColor(overallScore)} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div className="ms-score-val">{overallScore}</div>
        </div>
        <div className="ms-overall-meta">
          <div style={{fontSize:14,fontWeight:700,color:'#e0e0e0'}}>Overall Maturity</div>
          <div className="ms-level">Level {overallLevel}/5 - Advanced</div>
          <div className="ms-level-bar">
            {[1,2,3,4,5].map(l => (
              <div key={l} className="ms-level-dot" style={{background: l <= overallLevel ? getScoreColor(overallScore) : '#2a2a4a'}} />
            ))}
          </div>
        </div>
      </div>
      <div className="ms-domains">
        {mockDomains.map(d => (
          <div key={d.name} className={`ms-domain${selected.name === d.name ? ' selected' : ''}`} onClick={() => setSelected(d)}>
            <div className="ms-domain-header">
              <div className="ms-domain-name">{d.name}</div>
              <div className="ms-domain-score" style={{color:getScoreColor(d.score)}}>{d.score}</div>
            </div>
            <div className="ms-bar">
              <div className="ms-bar-fill" style={{width:`${d.score}%`,background:getScoreColor(d.score)}} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              <span style={{fontSize:10,color:'#888'}}>Level {d.currentLevel}/{d.targetLevel}</span>
              <span style={{fontSize:10,color:getScoreColor(d.score)}}>{d.score >= 80 ? 'On Track' : 'Needs Work'}</span>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="ms-detail">
          <div style={{fontWeight:700,color:'#e0e0e0',marginBottom:10,fontSize:13}}>{selected.name} - Subdomain Breakdown</div>
          {selected.subdomains.map(sd => (
            <div key={sd.name} className="ms-subdomain">
              <span style={{color:'#ccc'}}>{sd.name}</span>
              <div style={{display:'flex',alignItems:'center',gap:8,flex:1,marginLeft:12}}>
                <div className="ms-bar" style={{flex:1}}>
                  <div className="ms-bar-fill" style={{width:`${sd.score}%`,background:getScoreColor(sd.score)}} />
                </div>
                <span style={{fontSize:11,fontWeight:700,color:getScoreColor(sd.score),minWidth:30,textAlign:'right'}}>{sd.score}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{fontSize:12,color:'#888',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Framework Compliance</div>
      <div className="ms-frameworks">
        {mockFrameworks.map(fw => (
          <div key={fw.name} className="ms-fw">
            <div className="ms-fw-name">{fw.name}</div>
            <div className="ms-fw-bar">
              <div className="ms-fw-fill" style={{width:`${fw.compliance}%`,background:getScoreColor(fw.compliance)}} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
              <span style={{color:getScoreColor(fw.compliance),fontWeight:700}}>{fw.compliance}%</span>
              <span style={{color:'#888'}}>Next: {fw.nextAssessment}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
