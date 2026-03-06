'use client';
import { useState, useRef } from 'react';

const TEST_SCENARIOS = [
  { id: 'proxy-allow', name: 'Web Proxy - Allow (Safe URL)', mode: 'proxy', targetUrl: 'https://www.example.com', content: '', expect: 'ALLOW' },
  { id: 'proxy-block-cat', name: 'URL Category Block (Malware)', mode: 'proxy', targetUrl: 'https://evil.com/malware', content: '', expect: 'BLOCKED' },
  { id: 'dlp-cc', name: 'Network DLP - Credit Card', mode: 'dlp-scan', targetUrl: '', content: 'Payment info: 4111-1111-1111-1111 expires 12/26', expect: 'BLOCK' },
  { id: 'dlp-hkid', name: 'Network DLP - HKID', mode: 'dlp-scan', targetUrl: '', content: 'Applicant HKID: A123456(7) DOB: 1990-01-01', expect: 'BLOCK' },
  { id: 'dlp-phone', name: 'Network DLP - HK Phone', mode: 'dlp-scan', targetUrl: '', content: 'Call me at +852 6789 0123 for details', expect: 'AUDIT' },
  { id: 'dlp-apikey', name: 'Network DLP - API Key Leak', mode: 'dlp-scan', targetUrl: '', content: 'config: sk-proj-abcdefghijklmnopqrstuvwxyz123456', expect: 'BLOCK' },
  { id: 'dlp-iban', name: 'Network DLP - IBAN', mode: 'dlp-scan', targetUrl: '', content: 'Wire to GB29NWBK60161331926819 ref: invoice', expect: 'QUARANTINE' },
  { id: 'dlp-keywords', name: 'Network DLP - Sensitive Keywords', mode: 'dlp-scan', targetUrl: '', content: 'This document is confidential and contains proprietary trade secret information', expect: 'QUARANTINE' },
  { id: 'dlp-multi', name: 'Network DLP - Multi Pattern', mode: 'dlp-scan', targetUrl: '', content: 'Name: Chan Wing Kei\nHKID: A123456(7)\nPhone: +852 6789 0123\nEmail: chan@company.com\nCard: 4111111111111111\nSSN: 123-45-6789', expect: 'BLOCK' },
  { id: 'dlp-clean', name: 'Network DLP - Clean Content', mode: 'dlp-scan', targetUrl: '', content: 'Hello, this is a normal business email about the Q3 report.', expect: 'ALLOW' },
  { id: 'url-social', name: 'URL Check - Social Media', mode: 'url-check', targetUrl: 'https://facebook.com/profile', content: '', expect: 'social_media' },
  { id: 'url-genai', name: 'URL Check - GenAI App', mode: 'url-check', targetUrl: 'https://chat.openai.com', content: '', expect: 'genai' },
];

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  known_malicious: { bg: 'bg-red-900/60', text: 'text-red-300', border: 'border-red-600' },
  high_risk: { bg: 'bg-orange-900/60', text: 'text-orange-300', border: 'border-orange-600' },
  medium_risk: { bg: 'bg-yellow-900/60', text: 'text-yellow-300', border: 'border-yellow-600' },
  low_risk: { bg: 'bg-green-900/60', text: 'text-green-300', border: 'border-green-600' },   clean: { bg: 'bg-cyan-900/60', text: 'text-cyan-300', border: 'border-cyan-600' },
  unknown: { bg: 'bg-gray-800/60', text: 'text-gray-400', border: 'border-gray-600' },
};

const RISK_LABELS: Record<string, string> = {
  known_malicious: 'Malicious',
  high_risk: 'High Risk',
  medium_risk: 'Medium Risk',
  low_risk: 'Low Risk',   clean: 'Clean',
  unknown: 'Unknown',
};

type TestResult = { id: string; status: string; pass: boolean; latency: number; details: any };

// Visual risk badge component
function RiskBadge({ level }: { level: string }) {
  const c = RISK_COLORS[level] || RISK_COLORS.unknown;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
      {RISK_LABELS[level] || level}
    </span>
  );
}

// Summary donut chart (pure CSS)
function RiskDonut({ summary }: { summary: any }) {
  const total = summary.total || 1;
  const segments = [
    { key: 'known_malicious', count: summary.known_malicious, color: '#ef4444' },
    { key: 'high_risk', count: summary.high_risk, color: '#f97316' },
    { key: 'medium_risk', count: summary.medium_risk, color: '#eab308' },
    { key: 'low_risk', count: summary.low_risk, color: '#22c55e' },     { key: 'clean', count: summary.clean || 0, color: '#06b6d4' },
    { key: 'unknown', count: summary.unknown, color: '#6b7280' },
  ];
  let cumulative = 0;
  const gradientParts: string[] = [];
  segments.forEach(s => {
    if (s.count > 0) {
      const start = (cumulative / total) * 100;
      const end = ((cumulative + s.count) / total) * 100;
      gradientParts.push(`${s.color} ${start}% ${end}%`);
      cumulative += s.count;
    }
  });
  const gradient = gradientParts.length > 0
    ? `conic-gradient(${gradientParts.join(', ')})`
    : 'conic-gradient(#374151 0% 100%)';
  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: gradient }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{total}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {segments.filter(s => s.count > 0).map(s => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-300">{RISK_LABELS[s.key]}: <strong className="text-white">{s.count}</strong> ({((s.count / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Batch results table with visual display
function BatchResultsTable({ results, sortBy, setSortBy }: { results: any[]; sortBy: string; setSortBy: (s: string) => void }) {
  const riskOrder: Record<string, number> = { known_malicious: 0, high_risk: 1, medium_risk: 2, low_risk: 3, clean: 4, unknown: 5 };
  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'risk') return (riskOrder[a.risk_level] ?? 5) - (riskOrder[b.risk_level] ?? 5);
    if (sortBy === 'url') return a.url.localeCompare(b.url);
    return 0;
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left">
            <th className="py-2 px-3 text-gray-400 font-medium w-8">#</th>
            <th className="py-2 px-3 text-gray-400 font-medium cursor-pointer hover:text-white" onClick={() => setSortBy('url')}>URL {sortBy === 'url' && '↑'}</th>
            <th className="py-2 px-3 text-gray-400 font-medium cursor-pointer hover:text-white" onClick={() => setSortBy('risk')}>Risk {sortBy === 'risk' && '↑'}</th>
            <th className="py-2 px-3 text-gray-400 font-medium">Categories</th>
            <th className="py-2 px-3 text-gray-400 font-medium">Intel Sources</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r: any, i: number) => {
            const rc = RISK_COLORS[r.risk_level] || RISK_COLORS.unknown;
            return (
              <tr key={i} className={`border-b border-gray-800 hover:bg-gray-800/50 ${rc.bg}`}>
                <td className="py-2 px-3 text-gray-500 font-mono text-xs">{i + 1}</td>
                <td className="py-2 px-3">
                  <div className="text-white text-xs font-mono break-all max-w-xs" title={r.url}>{r.url.length > 60 ? r.url.slice(0, 60) + '...' : r.url}</div>
                  {r.reason && <div className="text-gray-500 text-xs mt-0.5">{r.reason}</div>}
                </td>
                <td className="py-2 px-3"><RiskBadge level={r.risk_level} /></td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.categories || []).map((c: string, ci: number) => (
                      <span key={ci} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.flags || []).map((f: string, fi: number) => (
                      <span key={fi} className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">{f}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Feed status display
function FeedStatusDisplay({ feedStatus }: { feedStatus: any }) {
  if (!feedStatus) return null;
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {Object.entries(feedStatus).map(([key, val]: [string, any]) => (
        <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-xs">
          <div className={`w-2 h-2 rounded-full ${val.loaded ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-300 font-medium">{key}</span>
          {val.count !== undefined && <span className="text-gray-500">({val.count.toLocaleString()} entries)</span>}
          {val.lastUpdate && <span className="text-gray-600">{new Date(val.lastUpdate).toLocaleTimeString()}</span>}
        </div>
      ))}
    </div>
  );
}

export default function SWGLiveTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTest, setActiveTest] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customMode, setCustomMode] = useState('dlp-scan');
  const [customResult, setCustomResult] = useState<any>(null);
  const [batchUrls, setBatchUrls] = useState('');
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [batchElapsed, setBatchElapsed] = useState<number | null>(null);
  const [pacVisible, setPacVisible] = useState(false);
  const [pacContent, setPacContent] = useState('');
  const [swgStatus, setSwgStatus] = useState<any>(null);
  const [batchView, setBatchView] = useState<'table' | 'json'>('table');
  const [batchSortBy, setBatchSortBy] = useState('risk');
  const [batchFilter, setBatchFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runSingleTest = async (scenario: typeof TEST_SCENARIOS[0]): Promise<TestResult> => {
    const start = Date.now();
    try {
      const resp = await fetch('/api/proxy-scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: scenario.mode, targetUrl: scenario.targetUrl, content: scenario.content }) });
      const data = await resp.json();
      const status = data.status || data.categories?.[0] || 'unknown';
      const pass = status.toLowerCase().includes(scenario.expect.toLowerCase()) || JSON.stringify(data).toLowerCase().includes(scenario.expect.toLowerCase());
      return { id: scenario.id, status, pass, latency: Date.now() - start, details: data };
    } catch (e: any) { return { id: scenario.id, status: 'ERROR', pass: false, latency: Date.now() - start, details: { error: e.message } }; }
  };

  const runAllTests = async () => {
    setRunning(true); setResults([]);
    for (const sc of TEST_SCENARIOS) { setActiveTest(sc.id); const r = await runSingleTest(sc); setResults(prev => [...prev, r]); }
    setActiveTest(''); setRunning(false);
  };

  const runCustomTest = async () => {
    setCustomResult(null);
    try { const resp = await fetch('/api/proxy-scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: customMode, targetUrl: customUrl, content: customContent }) }); setCustomResult(await resp.json()); }
    catch (e: any) { setCustomResult({ error: e.message }); }
  };

  const fetchPac = async () => { try { const r = await fetch('/api/pac'); setPacContent(await r.text()); setPacVisible(true); } catch (e: any) { setPacContent('Error: ' + e.message); setPacVisible(true); } };
  const fetchStatus = async () => { try { const r = await fetch('/api/proxy-scan'); setSwgStatus(await r.json()); } catch (e: any) { setSwgStatus({ error: e.message }); } };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const urls: string[] = [];
      rows.forEach((row: any) => {
        Object.values(row).forEach((val: any) => {
          const s = String(val).trim();
          if (s.match(/^https?:\/\//)) urls.push(s);
        });
      });
      setBatchUrls([...new Set(urls)].join('\n'));
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split(/[\r\n]+/).map(l => l.split(',')[0].trim().replace(/^"|"$/g, '')).filter(l => l.startsWith('http'));
        setBatchUrls(lines.join('\n'));
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runBatchCheck = async () => {
    setBatchLoading(true); setBatchResult(null); setBatchProgress(''); setBatchElapsed(null);
    const startTime = Date.now();
    try {
      const urls = batchUrls.split('\n').map((u: string) => u.trim()).filter((u: string) => u.length > 0);
      if (urls.length === 0) { setBatchLoading(false); return; }
      const CHUNK = 100;
      const allResults: any[] = [];
      for (let i = 0; i < urls.length; i += CHUNK) {
        const chunk = urls.slice(i, i + CHUNK);
        setBatchProgress(`Processing ${i + 1}-${Math.min(i + CHUNK, urls.length)} of ${urls.length} URLs...`);
        const resp = await fetch('/api/proxy-scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'batch-url-check', urls: chunk }) });
        const data = await resp.json();
        if (data.results) allResults.push(...data.results);
      }
      const elapsed = (Date.now() - startTime) / 1000;
      setBatchElapsed(elapsed);
      const summary = { total: allResults.length, known_malicious: 0, high_risk: 0, medium_risk: 0, low_risk: 0, clean: 0, unknown: 0 };
      allResults.forEach((r: any) => {
        if (r.risk_level === 'known_malicious') summary.known_malicious++;
        else if (r.risk_level === 'high_risk') summary.high_risk++;
        else if (r.risk_level === 'medium_risk') summary.medium_risk++;
        else if (r.risk_level === 'low_risk') summary.low_risk++;     else if (r.risk_level === 'clean') summary.clean++;
        else summary.unknown++;
      });
      setBatchResult({ mode: 'batch-url-check', summary, results: allResults, elapsed_seconds: elapsed, feedStatus: allResults[0]?.feedStatus });
      setBatchProgress(`Done. ${allResults.length} URLs checked in ${elapsed.toFixed(1)}s`);
    } catch (e: any) { setBatchResult({ error: e.message }); }
    setBatchLoading(false);
  };

  const exportCSV = () => {
    if (!batchResult?.results) return;
    const header = 'URL,Risk Level,Categories,Flags,Reason,Sources';
    const rows = batchResult.results.map((r: any) => `"${r.url}","${r.risk_level}","${(r.categories||[]).join('; ')}","${(r.flags||[]).join('; ')}","${(r.reason||'').replace(/"/g,'""')}","${(r.sources||[]).join('; ')}"`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `nextguard-url-check-${new Date().toISOString().slice(0,10)}.csv`; link.click();
  };

  const exportExcel = () => {
    if (!batchResult?.results) return;
    const hdr = '<tr><th>URL</th><th>Risk Level</th><th>Categories</th><th>Flags</th><th>Reason</th><th>Sources</th></tr>';
    const rows = batchResult.results.map((r: any) => `<tr><td>${r.url}</td><td>${r.risk_level}</td><td>${(r.categories||[]).join(', ')}</td><td>${(r.flags||[]).join(', ')}</td><td>${r.reason||''}</td><td>${(r.sources||[]).join(', ')}</td></tr>`).join('');
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${hdr}${rows}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `nextguard-url-check-${new Date().toISOString().slice(0,10)}.xls`; link.click();
  };

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  // Filter batch results
  const filteredBatchResults = batchResult?.results
    ? batchFilter === 'all'
      ? batchResult.results
      : batchResult.results.filter((r: any) => r.risk_level === batchFilter)
    : [];

  return (
    <div className="space-y-6">
      <div className="border border-emerald-700 rounded-xl p-6 bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Cloud SWG Live Testing Console</h2>
          <div className="flex gap-2">
            <button onClick={fetchStatus} className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm">Service Status</button>
            <button onClick={fetchPac} className="px-3 py-1 bg-blue-700 text-white rounded text-sm">View PAC File</button>
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-4">Real API-based testing: Web Proxy + Web DLP + Network DLP + URL Filtering + SSL Inspection</p>
        {swgStatus && (<div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm"><span className="text-emerald-400 font-bold">{swgStatus.service} v{swgStatus.version}</span>{swgStatus.threatIntel && <FeedStatusDisplay feedStatus={swgStatus.threatIntel} />}<p className="text-gray-400 mt-1">Capabilities: {swgStatus.capabilities?.join(', ')}</p></div>)}
        {pacVisible && (<div className="bg-gray-800 rounded-lg p-3 mb-4"><div className="flex justify-between items-center mb-2"><span className="text-white font-bold">PAC File</span><button onClick={() => setPacVisible(false)} className="text-gray-500 text-xs">Close</button></div><pre className="text-xs text-gray-300 overflow-auto max-h-48">{pacContent}</pre></div>)}
        <button onClick={runAllTests} disabled={running} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 mb-4">{running ? `Running... (${results.length}/${TEST_SCENARIOS.length})` : 'Run All Tests'}</button>
        {results.length > 0 && (<div className="mb-4 text-sm"><span className="text-green-400">Pass: {passed}</span>&nbsp;&nbsp;<span className="text-red-400">Fail: {failed}</span>&nbsp;&nbsp;<span className="text-gray-400">Total: {results.length}</span></div>)}
        {results.length > 0 && (<div className="space-y-1 mb-4">{TEST_SCENARIOS.map(sc => { const r = results.find(x => x.id === sc.id); const isActive = activeTest === sc.id; return (<div key={sc.id} className="flex items-center gap-2 text-sm py-1"><span>{isActive ? '\u23F3' : r ? (r.pass ? '\u2705' : '\u274C') : '\u2B1C'}</span><span className="text-white">{sc.name}</span><span className="text-gray-500">{r ? `${r.status} (${r.latency}ms)` : 'pending'}</span></div>); })}</div>)}

        <hr className="border-gray-700 my-4" />
        <h3 className="text-lg font-semibold text-white mb-3">Custom Test</h3>       <p className="text-gray-400 text-sm mb-3">Single-URL deep analysis. Performs full URL canonicalization, redirect unfolding, live content fetch, and explainable threat verdicts for validation and investigation.</p>
        <div className="flex gap-2 mb-3">{['dlp-scan','proxy','url-check'].map(m => (<button key={m} onClick={() => setCustomMode(m)} className={`px-3 py-1 rounded text-sm ${customMode === m ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400'}`}>{m === 'dlp-scan' ? 'Network DLP Scan' : m === 'proxy' ? 'Web Proxy' : 'URL Check'}</button>))}</div>
        {(customMode === 'proxy' || customMode === 'url-check') && (<input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://target-url.com" className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm" />)}
        {customMode === 'dlp-scan' && (<textarea value={customContent} onChange={e => setCustomContent(e.target.value)} placeholder="Paste content to scan..." rows={3} className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm" />)}
        <button onClick={runCustomTest} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500">Run Custom Test</button>
        {customResult && (customMode === 'url-check' && customResult.risk_level ? (
          <div className="mt-3 space-y-3">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <RiskBadge level={customResult.risk_level} />
                  <span className="text-white font-mono text-sm">{customResult.url || customResult.domain}</span>
                </div>
                {customResult.overall_score !== undefined && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{customResult.overall_score}<span className="text-sm text-gray-400">/100</span></div>
                    <div className="text-xs text-gray-500">Risk Score</div>
                  </div>
                )}
              </div>
              {(customResult.categories?.length > 0 || customResult.flags?.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {(customResult.categories || []).map((c: string, i: number) => (
                    <span key={`cat-${i}`} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">{c}</span>
                  ))}
                  {(customResult.flags || []).map((f: string, i: number) => (
                    <span key={`flag-${i}`} className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">{f}</span>
                  ))}
                </div>
              )}
              {customResult.sources && (
                <div className="border-t border-gray-700 pt-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">Threat Intel Sources</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {customResult.sources.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 px-2 rounded text-xs hover:bg-gray-700/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.hit ? 'bg-red-500' : 'bg-green-500'}`} />
                          <span className="text-gray-300 font-medium">{s.name}</span>
                        </div>
                        <span className="text-gray-500">{s.detail || (s.hit ? 'Detected' : 'Clean')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {customResult.tlsInspection && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-1">TLS Inspection</h4>
                  <div className="text-xs text-gray-500">Protocol: {customResult.tlsInspection.protocol} | Inspected: {customResult.tlsInspection.inspected ? 'Yes' : 'No'}</div>
                </div>
              )}
              {customResult.feedStatus && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">Feed Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(customResult.feedStatus.feeds || {}).map(([k, v]: [string, any]) => (
                      <span key={k} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{k}: <strong className="text-white">{typeof v === 'number' ? v.toLocaleString() : v}</strong></span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <details className="text-xs">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-300">View Raw JSON</summary>
              <pre className="mt-2 bg-gray-800 rounded-lg p-3 text-gray-300 overflow-auto max-h-48 whitespace-pre-wrap">{JSON.stringify(customResult, null, 2)}</pre>
            </details>
          </div>
        ) : (
          <pre className="mt-3 bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify(customResult, null, 2)}</pre>
        ))}

        <hr className="border-gray-700 my-4" />
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Batch URL Check</h3>
        <p className="text-gray-400 text-sm mb-3">High-throughput batch screening for large URL lists. Optimized for fast triage using reputation feeds (PhishTank, URLhaus, Phishing Army), heuristic rules, and scalable batch processing. Results may differ from Custom Test as Batch Check prioritizes speed over deep analysis. For definitive single-URL verdicts, use Custom Test above.</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-600">Import CSV / Excel</button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileImport} className="hidden" />
          {batchUrls && <span className="text-gray-400 text-sm self-center">{batchUrls.split('\n').filter(l => l.trim()).length} URLs loaded</span>}
        </div>
        <textarea value={batchUrls} onChange={e => setBatchUrls(e.target.value)} placeholder={"https://example.com\nhttps://evil-phishing.com\nhttps://facebook.com"} rows={8} className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm font-mono" />
        <div className="flex gap-2 items-center flex-wrap mb-3">
          <button onClick={runBatchCheck} disabled={batchLoading || !batchUrls.trim()} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 disabled:opacity-50">{batchLoading ? 'Checking...' : 'Run Batch Check'}</button>
          {batchResult?.results && (<>
            <button onClick={exportCSV} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600">Export CSV</button>
            <button onClick={exportExcel} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-600">Export Excel</button>
          </>)}
          {batchProgress && <span className="text-yellow-400 text-sm">{batchProgress}</span>}
        </div>

        {/* Progress bar */}
        {batchLoading && (
          <div className="mb-4">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {batchElapsed !== null && (<div className="mb-3 px-3 py-2 bg-gray-800 rounded-lg inline-block"><span className="text-cyan-300 font-bold text-sm">Total Query Time: {batchElapsed.toFixed(2)} seconds</span></div>)}

        {batchResult && (
          <div className="mt-2">
            {/* Summary with donut chart */}
            {batchResult.summary && (
              <div className="bg-gray-800/50 rounded-xl p-5 mb-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                  <RiskDonut summary={batchResult.summary} />
                  <div className="flex-1">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-400">{batchResult.summary.known_malicious}</div>
                        <div className="text-xs text-red-300">Malicious</div>
                      </div>
                      <div className="bg-orange-900/30 border border-orange-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-400">{batchResult.summary.high_risk}</div>
                        <div className="text-xs text-orange-300">High Risk</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">{(batchResult.summary.low_risk || 0) + (batchResult.summary.clean || 0)}</div>
                        <div className="text-xs text-green-300">Safe / Clean</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View toggle & filter */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                <button onClick={() => setBatchView('table')} className={`px-3 py-1 rounded text-xs font-medium ${batchView === 'table' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>Table View</button>
                <button onClick={() => setBatchView('json')} className={`px-3 py-1 rounded text-xs font-medium ${batchView === 'json' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>JSON</button>
              </div>
              {batchView === 'table' && (
                <div className="flex gap-1">
                  {['all', 'known_malicious', 'high_risk', 'medium_risk', 'low_risk', 'clean', 'unknown'].map(f => (
                    <button key={f} onClick={() => setBatchFilter(f)} className={`px-2 py-1 rounded text-xs ${batchFilter === f ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                      {f === 'all' ? `All (${batchResult.summary.total})` : `${RISK_LABELS[f]} (${batchResult.summary[f] || 0})`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results display */}
            {batchView === 'table' ? (
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                <BatchResultsTable results={filteredBatchResults} sortBy={batchSortBy} setSortBy={setBatchSortBy} />
              </div>
            ) : (
              <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(batchResult, null, 2)}</pre>
            )}

            {/* Feed status */}
            {batchResult.feedStatus && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Threat Intel Feed Status</h4>
                <FeedStatusDisplay feedStatus={batchResult.feedStatus} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
