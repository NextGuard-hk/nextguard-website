// components/threat-intel/soar-playbook-engine.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface Playbook {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'paused' | 'draft';
  lastRun: string;
  runCount: number;
  avgDuration: string;
  steps: { name: string; type: string; status: string }[];
}

const playbookStyles = `
  .soar-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #10b98144; position: relative; overflow: hidden; margin-bottom: 16px; }
  .soar-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #10b981, #22d3ee, #6366f1); }
  .soar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .soar-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #10b98122; border: 1px solid #10b98144; color: #10b981; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .soar-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: soarPulse 2s ease-in-out infinite; }
  @keyframes soarPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .soar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .soar-playbook { background: #12122a; border-radius: 10px; padding: 14px; border: 1px solid #2a2a4a; transition: all 0.2s; cursor: pointer; }
  .soar-playbook:hover { border-color: #10b981; transform: translateY(-1px); }
  .soar-playbook-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .soar-playbook-name { color: #e0e0e0; font-size: 13px; font-weight: 600; margin: 0; }
  .soar-playbook-desc { color: #888; font-size: 11px; margin: 0 0 10px 0; line-height: 1.4; }
  .soar-status { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .soar-status-active { background: #10b98122; color: #10b981; border: 1px solid #10b98144; }
  .soar-status-paused { background: #eab30822; color: #eab308; border: 1px solid #eab30844; }
  .soar-status-draft { background: #64748b22; color: #94a3b8; border: 1px solid #64748b44; }
  .soar-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  .soar-meta-item { color: #666; font-size: 10px; }
  .soar-meta-item span { color: #c0c0c0; font-weight: 600; }
  .soar-steps { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .soar-step { padding: 2px 8px; border-radius: 4px; font-size: 9px; background: #1a1a3e; border: 1px solid #2a2a4a; color: #888; }
  .soar-step-done { background: #10b98115; border-color: #10b98133; color: #10b981; }
  .soar-step-arrow { color: #444; font-size: 10px; }
  .soar-controls { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .soar-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid #10b98144; background: #10b98122; color: #10b981; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .soar-btn:hover { background: #10b98133; }
  .soar-btn-secondary { border-color: #333; background: transparent; color: #888; }
  .soar-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .soar-stat { background: #12122a; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #2a2a4a; }
  .soar-stat-num { font-size: 20px; font-weight: 700; color: #10b981; }
  .soar-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
`;

const MOCK_PLAYBOOKS: Playbook[] = [
  { id: 'pb-1', name: 'Phishing Response', description: 'Auto-triage phishing emails, extract IOCs, enrich and block malicious indicators', trigger: 'Email Alert', status: 'active', lastRun: '2 min ago', runCount: 1247, avgDuration: '45s', steps: [
    { name: 'Extract IOCs', type: 'extract', status: 'done' },
    { name: 'Enrich', type: 'enrich', status: 'done' },
    { name: 'Block', type: 'action', status: 'done' },
    { name: 'Notify', type: 'notify', status: 'done' },
  ]},
  { id: 'pb-2', name: 'Ransomware Containment', description: 'Isolate infected endpoints, kill processes, collect forensics and alert SOC', trigger: 'EDR Alert', status: 'active', lastRun: '1h ago', runCount: 89, avgDuration: '12s', steps: [
    { name: 'Isolate Host', type: 'action', status: 'done' },
    { name: 'Kill Process', type: 'action', status: 'done' },
    { name: 'Forensics', type: 'collect', status: 'running' },
    { name: 'Alert SOC', type: 'notify', status: 'pending' },
  ]},
  { id: 'pb-3', name: 'Malware Sandbox Analysis', description: 'Submit suspicious files to sandbox, analyze behavior, update threat intel feeds', trigger: 'File Upload', status: 'active', lastRun: '30m ago', runCount: 456, avgDuration: '3m', steps: [
    { name: 'Submit', type: 'action', status: 'done' },
    { name: 'Analyze', type: 'enrich', status: 'done' },
    { name: 'Update Feeds', type: 'action', status: 'done' },
  ]},
  { id: 'pb-4', name: 'Vulnerability Triage', description: 'Auto-prioritize CVEs based on asset criticality and exploit availability', trigger: 'CVE Alert', status: 'paused', lastRun: '2d ago', runCount: 234, avgDuration: '1m', steps: [
    { name: 'Scan Assets', type: 'collect', status: 'done' },
    { name: 'Prioritize', type: 'enrich', status: 'done' },
    { name: 'Create Ticket', type: 'action', status: 'pending' },
  ]},
  { id: 'pb-5', name: 'DLP Incident Response', description: 'Auto-classify data exfiltration alerts, collect evidence, notify compliance', trigger: 'DLP Alert', status: 'draft', lastRun: 'Never', runCount: 0, avgDuration: '-', steps: [
    { name: 'Classify', type: 'enrich', status: 'pending' },
    { name: 'Evidence', type: 'collect', status: 'pending' },
    { name: 'Notify', type: 'notify', status: 'pending' },
  ]},
];

export default function SOARPlaybookEngine() {
  const [playbooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const filtered = filter === 'all' ? playbooks : playbooks.filter(p => p.status === filter);
  const totalRuns = playbooks.reduce((a, b) => a + b.runCount, 0);
  const activeCount = playbooks.filter(p => p.status === 'active').length;

  return (
    <>
      <style>{playbookStyles}</style>
      <div className="soar-card">
        <div className="soar-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 4px 0', fontSize: '16px' }}>SOAR Playbook Engine</h3>
            <p style={{ color: '#888', margin: 0, fontSize: '11px' }}>Automated Incident Response Orchestration</p>
          </div>
          <div className="soar-badge"><span className="pulse" /> SOAR</div>
        </div>

        <div className="soar-stats">
          <div className="soar-stat"><div className="soar-stat-num">{playbooks.length}</div><div className="soar-stat-label">Playbooks</div></div>
          <div className="soar-stat"><div className="soar-stat-num">{activeCount}</div><div className="soar-stat-label">Active</div></div>
          <div className="soar-stat"><div className="soar-stat-num">{totalRuns.toLocaleString()}</div><div className="soar-stat-label">Total Runs</div></div>
          <div className="soar-stat"><div className="soar-stat-num">98.5%</div><div className="soar-stat-label">Success Rate</div></div>
        </div>

        <div className="soar-controls">
          {(['all', 'active', 'paused', 'draft'] as const).map(f => (
            <button key={f} className={`soar-btn ${filter === f ? '' : 'soar-btn-secondary'}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="soar-grid">
          {filtered.map(pb => (
            <div key={pb.id} className="soar-playbook">
              <div className="soar-playbook-header">
                <h4 className="soar-playbook-name">{pb.name}</h4>
                <span className={`soar-status soar-status-${pb.status}`}>{pb.status}</span>
              </div>
              <p className="soar-playbook-desc">{pb.description}</p>
              <div className="soar-meta">
                <div className="soar-meta-item">Trigger: <span>{pb.trigger}</span></div>
                <div className="soar-meta-item">Last: <span>{pb.lastRun}</span></div>
                <div className="soar-meta-item">Runs: <span>{pb.runCount}</span></div>
                <div className="soar-meta-item">Avg: <span>{pb.avgDuration}</span></div>
              </div>
              <div className="soar-steps">
                {pb.steps.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="soar-step-arrow">→</span>}
                    <span className={`soar-step ${s.status === 'done' ? 'soar-step-done' : ''}`}>{s.name}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
