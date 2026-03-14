'use client'
import React, { useState, useEffect } from 'react'

interface ThreatPrediction {
  id: string
  threatType: string
  probability: number
  confidence: number
  timeframe: string
  targetSectors: string[]
  indicators: string[]
  mitigation: string
  trend: 'rising' | 'stable' | 'declining'
}

interface MLModel {
  name: string
  accuracy: number
  lastTrained: string
  predictions: number
  status: 'active' | 'training' | 'idle'
}

const mockPredictions: ThreatPrediction[] = [
  {
    id: 'pred-001',
    threatType: 'Ransomware Campaign',
    probability: 87,
    confidence: 92,
    timeframe: '7-14 days',
    targetSectors: ['Healthcare', 'Finance', 'Energy'],
    indicators: ['Emotet C2 activity', 'Cobalt Strike beacons', 'LOLBins usage'],
    mitigation: 'Patch MS Exchange CVE-2024-21410, enforce MFA, backup critical data',
    trend: 'rising'
  },
  {
    id: 'pred-002',
    threatType: 'Supply Chain Attack',
    probability: 64,
    confidence: 78,
    timeframe: '30-60 days',
    targetSectors: ['Technology', 'Government', 'Defense'],
    indicators: ['CI/CD pipeline probing', 'npm package typosquatting', 'Dev account targeting'],
    mitigation: 'Audit third-party dependencies, implement SBOM, enforce code signing',
    trend: 'rising'
  },
  {
    id: 'pred-003',
    threatType: 'DDoS Infrastructure Attack',
    probability: 71,
    confidence: 85,
    timeframe: '3-7 days',
    targetSectors: ['Telecom', 'ISP', 'Cloud'],
    indicators: ['Botnet C2 expansion', 'IoT device scanning', 'UDP flood patterns'],
    mitigation: 'Enable DDoS protection, rate limiting, upstream filtering',
    trend: 'stable'
  },
  {
    id: 'pred-004',
    threatType: 'Zero-Day Exploit',
    probability: 43,
    confidence: 67,
    timeframe: '14-30 days',
    targetSectors: ['Enterprise', 'Critical Infrastructure'],
    indicators: ['Dark web exploit sales', 'PoC code fragments', 'Targeted reconnaissance'],
    mitigation: 'Enable virtual patching, monitor exploit brokers, isolate critical systems',
    trend: 'rising'
  }
]

const mockModels: MLModel[] = [
  { name: 'ThreatForecaster v3.2', accuracy: 91.4, lastTrained: '2h ago', predictions: 1842, status: 'active' },
  { name: 'CampaignPredictor v2.1', accuracy: 87.9, lastTrained: '6h ago', predictions: 934, status: 'active' },
  { name: 'AnomalyDetector v1.8', accuracy: 94.2, lastTrained: '1h ago', predictions: 3201, status: 'active' },
  { name: 'TTPredictor v4.0', accuracy: 89.1, lastTrained: 'Training...', predictions: 0, status: 'training' }
]

const styles = `
  .pta-card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a4a; }
  .pta-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .pta-title { font-size: 16px; font-weight: 700; color: #e0e0e0; display: flex; align-items: center; gap: 8px; }
  .pta-badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .pta-badge-ai { background: #7c3aed20; color: #a78bfa; border: 1px solid #7c3aed44; }
  .pta-badge-live { background: #22c55e20; color: #22c55e; border: 1px solid #22c55e44; }
  .pta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .pta-pred-card { background: #12122a; border-radius: 8px; padding: 14px; border: 1px solid #2a2a4a; cursor: pointer; transition: border-color 0.2s; }
  .pta-pred-card:hover { border-color: #4a4a8a; }
  .pta-pred-card.selected { border-color: #7c3aed; }
  .pta-pred-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
  .pta-pred-type { font-size: 13px; font-weight: 600; color: #e0e0e0; }
  .pta-prob-bar { height: 4px; background: #2a2a4a; border-radius: 2px; margin: 6px 0; overflow: hidden; }
  .pta-prob-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }
  .pta-trend { font-size: 10px; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
  .pta-trend-rising { background: #ef444420; color: #ef4444; }
  .pta-trend-stable { background: #f59e0b20; color: #f59e0b; }
  .pta-trend-declining { background: #22c55e20; color: #22c55e; }
  .pta-detail { background: #12122a; border-radius: 8px; padding: 16px; border: 1px solid #2a2a4a; margin-top: 12px; }
  .pta-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pta-detail-section h4 { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0; }
  .pta-tag { display: inline-block; padding: 2px 8px; background: #7c3aed20; color: #a78bfa; border-radius: 3px; font-size: 11px; margin: 2px; border: 1px solid #7c3aed30; }
  .pta-mitigation { font-size: 12px; color: #22c55e; background: #22c55e10; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #22c55e; }
  .pta-models { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 16px; }
  .pta-model { background: #12122a; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; }
  .pta-model-name { font-size: 12px; font-weight: 600; color: #e0e0e0; margin-bottom: 6px; }
  .pta-accuracy { display: flex; align-items: center; gap: 8px; }
  .pta-accuracy-bar { flex: 1; height: 3px; background: #2a2a4a; border-radius: 2px; overflow: hidden; }
  .pta-accuracy-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius: 2px; }
  .pta-stat-row { display: flex; justify-content: space-between; margin-top: 4px; }
  @media (max-width: 600px) { .pta-grid { grid-template-columns: 1fr; } .pta-detail-grid { grid-template-columns: 1fr; } .pta-models { grid-template-columns: 1fr; } }
`

export default function PredictiveThreatAnalytics() {
  const [selected, setSelected] = useState<ThreatPrediction>(mockPredictions[0])
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    setAnimating(true)
    const t = setTimeout(() => setAnimating(false), 1100)
    return () => clearTimeout(t)
  }, [selected])

  const getProbColor = (p: number) => p >= 80 ? '#ef4444' : p >= 60 ? '#f59e0b' : '#22c55e'

  return (
    <div className="pta-card">
      <style>{styles}</style>
      <div className="pta-header">
        <div className="pta-title">
          <span style={{fontSize:18}}>&#129302;</span>
          Predictive Threat Analytics
          <span className="pta-badge pta-badge-ai">AI Engine</span>
        </div>
        <span className="pta-badge pta-badge-live">Live</span>
      </div>
      <div className="pta-grid">
        {mockPredictions.map(pred => (
          <div
            key={pred.id}
            className={`pta-pred-card${selected.id === pred.id ? ' selected' : ''}`}
            onClick={() => setSelected(pred)}
          >
            <div className="pta-pred-header">
              <div className="pta-pred-type">{pred.threatType}</div>
              <span className={`pta-trend pta-trend-${pred.trend}`}>
                {pred.trend === 'rising' ? '&#8679;' : pred.trend === 'declining' ? '&#8681;' : '&#8680;'} {pred.trend}
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,color:'#888'}}>Probability</span>
              <span style={{fontSize:13,fontWeight:700,color:getProbColor(pred.probability)}}>{pred.probability}%</span>
            </div>
            <div className="pta-prob-bar">
              <div className="pta-prob-fill" style={{width:`${pred.probability}%`,background:getProbColor(pred.probability)}} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              <span style={{fontSize:10,color:'#888'}}>Confidence: <span style={{color:'#a78bfa'}}>{pred.confidence}%</span></span>
              <span style={{fontSize:10,color:'#888'}}>{pred.timeframe}</span>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="pta-detail">
          <div style={{fontWeight:700,color:'#e0e0e0',marginBottom:12,fontSize:14}}>
            &#128269; Analysis: {selected.threatType}
          </div>
          <div className="pta-detail-grid">
            <div className="pta-detail-section">
              <h4>Target Sectors</h4>
              {selected.targetSectors.map(s => <span key={s} className="pta-tag">{s}</span>)}
            </div>
            <div className="pta-detail-section">
              <h4>Key Indicators</h4>
              {selected.indicators.map(i => <div key={i} style={{fontSize:11,color:'#ccc',padding:'2px 0'}}>&#9679; {i}</div>)}
            </div>
          </div>
          <div style={{marginTop:12}}>
            <h4 style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 6px 0'}}>Recommended Mitigation</h4>
            <div className="pta-mitigation">{selected.mitigation}</div>
          </div>
        </div>
      )}
      <div style={{marginTop:16,marginBottom:8,fontSize:12,color:'#888',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>ML Models</div>
      <div className="pta-models">
        {mockModels.map(m => (
          <div key={m.name} className="pta-model">
            <div className="pta-model-name">{m.name}</div>
            <div className="pta-accuracy">
              <div className="pta-accuracy-bar">
                <div className="pta-accuracy-fill" style={{width:`${m.accuracy}%`}} />
              </div>
              <span style={{fontSize:12,color:'#a78bfa',fontWeight:700}}>{m.accuracy}%</span>
            </div>
            <div className="pta-stat-row">
              <span style={{fontSize:10,color:'#888'}}>{m.predictions.toLocaleString()} predictions</span>
              <span style={{fontSize:10,color:m.status==='training'?'#f59e0b':'#22c55e'}}>
                {m.status === 'training' ? 'Training...' : m.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
