// components/threat-intel/ai-report-generator.tsx
'use client';
import React, { useState } from 'react';

interface ReportData {
  title: string;
  executive_summary: string;
  threat_landscape?: {
    overview: string;
    top_threats: { name: string; severity: string; description: string; affected_sectors: string[] }[];
    emerging_trends: string[];
  };
  statistics?: {
    total_iocs_processed: number;
    critical_alerts: number;
    blocked_threats: number;
    top_attack_vectors: { vector: string; percentage: number }[];
  };
  recommendations?: { priority: string; action: string; detail: string }[];
  apac_focus?: string;
  conclusion?: string;
}

const reportStyles = `
  .ai-report-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #22d3ee44; position: relative; overflow: hidden; margin-bottom: 16px; }
  .ai-report-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #22d3ee, #6366f1, #f59e0b); }
  .ai-report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .ai-report-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #22d3ee22; border: 1px solid #22d3ee44; color: #22d3ee; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .ai-report-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #22d3ee; animation: reportPulse 2s ease-in-out infinite; }
  @keyframes reportPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .ai-report-controls { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .ai-report-select { background: #12122a; border: 1px solid #2a2a4a; border-radius: 8px; padding: 8px 12px; color: #c8c8e0; font-size: 12px; outline: none; min-width: 140px; }
  .ai-report-select:focus { border-color: #22d3ee; }
  .ai-report-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #22d3ee44; background: #22d3ee22; color: #22d3ee; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .ai-report-btn:hover { background: #22d3ee33; border-color: #22d3ee; }
  .ai-report-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai-report-content { margin-top: 14px; }
  .ai-report-section { background: #12122a88; border-radius: 8px; padding: 14px; border: 1px solid #2a2a4a; margin-bottom: 10px; }
  .ai-report-section h4 { color: #22d3ee; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; }
  .ai-report-section p { color: #c8c8e0; font-size: 12px; line-height: 1.7; margin: 0 0 8px 0; }
  .ai-report-title { color: #e0e0e0; font-size: 17px; font-weight: 700; margin: 0 0 12px 0; }
  .ai-report-threat-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #1a1a3a; }
  .ai-report-threat-name { color: #c8c8e0; font-size: 12px; }
  .ai-report-severity { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .sev-critical { background: #ef444433; color: #fca5a5; }
  .sev-high { background: #f59e0b33; color: #fbbf24; }
  .sev-medium { background: #3b82f633; color: #93c5fd; }
  .sev-low { background: #22c55e33; color: #86efac; }
  .ai-report-stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1a1a3a; }
  .ai-report-stat-label { color: #888; font-size: 11px; }
  .ai-report-stat-value { color: #e0e0e0; font-size: 12px; font-weight: 600; }
  .ai-report-rec { padding: 8px; margin-bottom: 6px; border-radius: 6px; border-left: 3px solid #22d3ee; background: #22d3ee08; }
  .ai-report-rec-action { color: #e0e0e0; font-size: 12px; font-weight: 600; }
  .ai-report-rec-detail { color: #888; font-size: 11px; margin-top: 2px; }
  .ai-report-loading { display: flex; align-items: center; justify-content: center; padding: 40px; color: #888; font-size: 13px; gap: 10px; }
  .ai-report-loading .spinner { width: 20px; height: 20px; border: 2px solid #333; border-top-color: #22d3ee; border-radius: 50%; animation: reportSpin 0.8s linear infinite; }
  @keyframes reportSpin { to { transform: rotate(360deg); } }
  .ai-report-export { display: flex; gap: 6px; margin-top: 12px; }
  .ai-report-export-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid #333; background: transparent; color: #888; font-size: 10px; cursor: pointer; transition: all 0.2s; }
  .ai-report-export-btn:hover { border-color: #22d3ee; color: #22d3ee; }
`;

export default function AIReportGenerator() {
  const [reportType, setReportType] = useState('weekly');
  const [timeRange, setTimeRange] = useState('7d');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/threat-intel/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          time_range: timeRange,
          language: language === 'zh' ? 'zh-CN' : 'English',
          include_sections: ['executive_summary', 'threat_landscape', 'statistics', 'recommendations', 'apac_focus'],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.data.report);
        setGeneratedAt(data.data.generated_at);
      } else {
        setError(data.error || 'Report generation failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = [
      report.title,
      '',
      report.executive_summary,
      '',
      report.apac_focus ? 'APAC Focus: ' + report.apac_focus : '',
      '',
      report.conclusion || '',
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  const getSevClass = (sev: string) => {
    const s = sev.toLowerCase();
    if (s.includes('critical')) return 'sev-critical';
    if (s.includes('high')) return 'sev-high';
    if (s.includes('medium')) return 'sev-medium';
    return 'sev-low';
  };

  return (
    <>
      <style>{reportStyles}</style>
      <div className="ai-report-card">
        <div className="ai-report-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ai-report-badge"><span className="pulse" /> AI Report Generator</span>
            <span style={{ color: '#555', fontSize: '10px' }}>Executive Intelligence Reports</span>
          </div>
        </div>

        <div className="ai-report-controls">
          <select className="ai-report-select" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="daily">Daily Brief</option>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="executive">Executive Summary</option>
          </select>
          <select className="ai-report-select" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter</option>
          </select>
          <select className="ai-report-select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
          </select>
          <button className="ai-report-btn" onClick={generateReport} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {loading && (
          <div className="ai-report-loading"><div className="spinner" />Generating executive threat intelligence report...</div>
        )}

        {error && !loading && (
          <div style={{ color: '#ef4444', fontSize: '12px', padding: '10px' }}>
            Error: {error}
            <button className="ai-report-btn" onClick={generateReport} style={{ marginLeft: '10px', fontSize: '10px' }}>Retry</button>
          </div>
        )}

        {report && !loading && (
          <div className="ai-report-content">
            <h3 className="ai-report-title">{report.title}</h3>

            <div className="ai-report-section">
              <h4>Executive Summary</h4>
              <p>{report.executive_summary}</p>
            </div>

            {report.threat_landscape && (
              <div className="ai-report-section">
                <h4>Threat Landscape</h4>
                <p>{report.threat_landscape.overview}</p>
                {report.threat_landscape.top_threats?.map((t, i) => (
                  <div key={i} className="ai-report-threat-item">
                    <span className="ai-report-threat-name">{t.name}: {t.description}</span>
                    <span className={`ai-report-severity ${getSevClass(t.severity)}`}>{t.severity}</span>
                  </div>
                ))}
              </div>
            )}

            {report.statistics && (
              <div className="ai-report-section">
                <h4>Statistics</h4>
                <div className="ai-report-stat"><span className="ai-report-stat-label">IOCs Processed</span><span className="ai-report-stat-value">{report.statistics.total_iocs_processed?.toLocaleString()}</span></div>
                <div className="ai-report-stat"><span className="ai-report-stat-label">Critical Alerts</span><span className="ai-report-stat-value">{report.statistics.critical_alerts}</span></div>
                <div className="ai-report-stat"><span className="ai-report-stat-label">Blocked Threats</span><span className="ai-report-stat-value">{report.statistics.blocked_threats?.toLocaleString()}</span></div>
              </div>
            )}

            {report.recommendations && report.recommendations.length > 0 && (
              <div className="ai-report-section">
                <h4>Recommendations</h4>
                {report.recommendations.map((r, i) => (
                  <div key={i} className="ai-report-rec">
                    <div className="ai-report-rec-action">[{r.priority}] {r.action}</div>
                    <div className="ai-report-rec-detail">{r.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {report.apac_focus && (
              <div className="ai-report-section">
                <h4>APAC Regional Focus</h4>
                <p>{report.apac_focus}</p>
              </div>
            )}

            {report.conclusion && (
              <div className="ai-report-section">
                <h4>Conclusion</h4>
                <p>{report.conclusion}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ color: '#555', fontSize: '10px' }}>Generated: {generatedAt ? new Date(generatedAt).toLocaleString() : '-'}</span>
              <div className="ai-report-export">
                <button className="ai-report-export-btn" onClick={handleCopyReport}>Copy Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
