// components/threat-intel/tip-export-manager.tsx
'use client';
import React, { useState } from 'react';

interface ExportJob {
  id: string;
  name: string;
  format: 'STIX 2.1' | 'MISP' | 'CSV' | 'OpenIOC' | 'YARA';
  status: 'completed' | 'running' | 'scheduled' | 'failed';
  records: number;
  size: string;
  destination: string;
  lastRun: string;
  schedule: string;
}

const tipStyles = `
.tip-card {
  background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #06b6d444;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.tip-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6);
}
.tip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.tip-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #06b6d422;
  border: 1px solid #06b6d444;
  color: #06b6d4;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.tip-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.tip-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.tip-stat-num { font-size: 20px; font-weight: 700; color: #06b6d4; }
.tip-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.tip-formats {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.tip-format {
  padding: 4px 10px;
  border-radius: 6px;
  background: #12122a;
  border: 1px solid #2a2a4a;
  font-size: 9px;
  font-weight: 700;
  color: #06b6d4;
  font-family: monospace;
}
.tip-jobs { display: flex; flex-direction: column; gap: 8px; }
.tip-job {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #12122a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
  flex-wrap: wrap;
  gap: 6px;
}
.tip-job-name { color: #e0e0e0; font-size: 11px; font-weight: 600; }
.tip-job-format {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 8px;
  font-weight: 700;
  background: #06b6d422;
  color: #06b6d4;
  font-family: monospace;
}
.tip-job-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.tip-js-completed { background: #22c55e22; color: #22c55e; }
.tip-js-running { background: #3b82f622; color: #60a5fa; }
.tip-js-scheduled { background: #64748b22; color: #94a3b8; }
.tip-js-failed { background: #ef444422; color: #ef4444; }
@media (max-width: 480px) {
  .tip-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_JOBS: ExportJob[] = [
  { id: 'EX-001', name: 'Daily STIX Bundle Export', format: 'STIX 2.1', status: 'completed', records: 12450, size: '4.2 MB', destination: 'TAXII Server (FS-ISAC)', lastRun: '1 hr ago', schedule: 'Daily 00:00 UTC' },
  { id: 'EX-002', name: 'MISP Feed Sync', format: 'MISP', status: 'running', records: 8920, size: '2.8 MB', destination: 'MISP Instance (internal)', lastRun: 'Now', schedule: 'Every 4 hours' },
  { id: 'EX-003', name: 'IOC CSV for SIEM', format: 'CSV', status: 'completed', records: 45600, size: '12.1 MB', destination: 'Splunk via S3', lastRun: '30 min ago', schedule: 'Hourly' },
  { id: 'EX-004', name: 'YARA Rules Export', format: 'YARA', status: 'scheduled', records: 234, size: '156 KB', destination: 'EDR Agent Distribution', lastRun: '6 hr ago', schedule: 'Daily 06:00 UTC' },
  { id: 'EX-005', name: 'OpenIOC for Legacy Systems', format: 'OpenIOC', status: 'completed', records: 3200, size: '890 KB', destination: 'On-prem SIEM', lastRun: '2 hr ago', schedule: 'Every 6 hours' },
];

export default function TIPExportManager() {
  const totalRecords = MOCK_JOBS.reduce((a, b) => a + b.records, 0);
  const completedJobs = MOCK_JOBS.filter(j => j.status === 'completed').length;
  const formats = [...new Set(MOCK_JOBS.map(j => j.format))];

  return (
    <>
      <style>{tipStyles}</style>
      <div className="tip-card">
        <div className="tip-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>TIP Export Manager</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>Threat Intelligence Platform Export &amp; Distribution</p>
          </div>
          <span className="tip-badge">Multi-Format</span>
        </div>

        <div className="tip-stats">
          <div className="tip-stat"><div className="tip-stat-num">{MOCK_JOBS.length}</div><div className="tip-stat-label">Export Jobs</div></div>
          <div className="tip-stat"><div className="tip-stat-num" style={{ color: '#22c55e' }}>{completedJobs}</div><div className="tip-stat-label">Completed</div></div>
          <div className="tip-stat"><div className="tip-stat-num">{(totalRecords / 1000).toFixed(1)}K</div><div className="tip-stat-label">Total Records</div></div>
          <div className="tip-stat"><div className="tip-stat-num">{formats.length}</div><div className="tip-stat-label">Formats</div></div>
        </div>

        <div className="tip-formats">
          {formats.map(f => (
            <span key={f} className="tip-format">{f}</span>
          ))}
        </div>

        <div className="tip-jobs">
          {MOCK_JOBS.map(job => (
            <div key={job.id} className="tip-job">
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="tip-job-name">{job.name}</span>
                  <span className="tip-job-format">{job.format}</span>
                </div>
                <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                  {job.destination} | {job.records.toLocaleString()} records ({job.size}) | Schedule: {job.schedule}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ color: '#666', fontSize: 9 }}>{job.lastRun}</span>
                <span className={`tip-job-status tip-js-${job.status}`}>{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
