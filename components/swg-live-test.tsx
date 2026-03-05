'use client';
import { useState } from 'react';

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

type TestResult = { id: string; status: string; pass: boolean; latency: number; details: any };

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
  const [pacVisible, setPacVisible] = useState(false);
  const [pacContent, setPacContent] = useState('');
  const [swgStatus, setSwgStatus] = useState<any>(null);

  const runSingleTest = async (scenario: typeof TEST_SCENARIOS[0]): Promise<TestResult> => {
    const start = Date.now();
    try {
      const resp = await fetch('/api/proxy-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: scenario.mode, targetUrl: scenario.targetUrl, content: scenario.content }),
      });
      const data = await resp.json();
      const status = data.status || data.categories?.[0] || 'unknown';
      const pass = status.toLowerCase().includes(scenario.expect.toLowerCase()) || JSON.stringify(data).toLowerCase().includes(scenario.expect.toLowerCase());
      return { id: scenario.id, status, pass, latency: Date.now() - start, details: data };
    } catch (e: any) {
      return { id: scenario.id, status: 'ERROR', pass: false, latency: Date.now() - start, details: { error: e.message } };
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    setResults([]);
    for (const sc of TEST_SCENARIOS) {
      setActiveTest(sc.id);
      const r = await runSingleTest(sc);
      setResults(prev => [...prev, r]);
    }
    setActiveTest('');
    setRunning(false);
  };

  const runCustomTest = async () => {
    setCustomResult(null);
    try {
      const resp = await fetch('/api/proxy-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: customMode, targetUrl: customUrl, content: customContent }),
      });
      setCustomResult(await resp.json());
    } catch (e: any) {
      setCustomResult({ error: e.message });
    }
  };

  const fetchPac = async () => {
    try {
      const resp = await fetch('/api/pac');
      setPacContent(await resp.text());
      setPacVisible(true);
    } catch (e: any) {
      setPacContent('Error: ' + e.message);
      setPacVisible(true);
    }
  };

  const fetchStatus = async () => {
    try {
      const resp = await fetch('/api/proxy-scan');
      setSwgStatus(await resp.json());
    } catch (e: any) {
      setSwgStatus({ error: e.message });
    }
  };

  const runBatchCheck = async () => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const urls = batchUrls.split('\n').map((u: string) => u.trim()).filter((u: string) => u.length > 0);
      const resp = await fetch('/api/proxy-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'batch-url-check', urls }),
      });
      setBatchResult(await resp.json());
    } catch (e: any) {
      setBatchResult({ error: e.message });
    }
    setBatchLoading(false);
  };

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

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

        {swgStatus && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm">
            <span className="text-emerald-400 font-bold">{swgStatus.service} v{swgStatus.version}</span>
            <p className="text-gray-400 mt-1">Capabilities: {swgStatus.capabilities?.join(', ')}</p>
            <p className="text-gray-400">Proxy Nodes: {swgStatus.proxyNodes?.map((n: any) => `${n.location} (${n.status})`).join(' | ')}</p>
          </div>
        )}

        {pacVisible && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold">PAC File</span>
              <button onClick={() => setPacVisible(false)} className="text-gray-500 text-xs">Close</button>
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-48">{pacContent}</pre>
          </div>
        )}

        <button onClick={runAllTests} disabled={running} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 mb-4">
          {running ? `Running... (${results.length}/${TEST_SCENARIOS.length})` : 'Run All Tests'}
        </button>

        {results.length > 0 && (
          <div className="mb-4 text-sm">
            <span className="text-green-400">Pass: {passed}</span>&nbsp;&nbsp;
            <span className="text-red-400">Fail: {failed}</span>&nbsp;&nbsp;
            <span className="text-gray-400">Total: {results.length}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1 mb-4">
            {TEST_SCENARIOS.map(sc => {
              const r = results.find(x => x.id === sc.id);
              const isActive = activeTest === sc.id;
              return (
                <div key={sc.id} className="flex items-center gap-2 text-sm py-1">
                  <span>{isActive ? '\u23F3' : r ? (r.pass ? '\u2705' : '\u274C') : '\u2B1C'}</span>
                  <span className="text-white">{sc.name}</span>
                  <span className="text-gray-500">{r ? `${r.status} (${r.latency}ms)` : 'pending'}</span>
                  <span className="text-gray-600 text-xs">expect: {sc.expect}</span>
                </div>
              );
            })}
          </div>
        )}

        <hr className="border-gray-700 my-4" />
        <h3 className="text-lg font-semibold text-white mb-3">Custom Test</h3>
        <div className="flex gap-2 mb-3">
          {['dlp-scan', 'proxy', 'url-check'].map(m => (
            <button key={m} onClick={() => setCustomMode(m)} className={`px-3 py-1 rounded text-sm ${customMode === m ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {m === 'dlp-scan' ? 'Network DLP Scan' : m === 'proxy' ? 'Web Proxy' : 'URL Check'}
            </button>
          ))}
        </div>

        {(customMode === 'proxy' || customMode === 'url-check') && (
          <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://target-url.com" className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm" />
        )}
        {customMode === 'dlp-scan' && (
          <textarea value={customContent} onChange={e => setCustomContent(e.target.value)} placeholder="Paste content to scan for sensitive data..." rows={3} className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm" />
        )}
        <button onClick={runCustomTest} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500">
          Run Custom Test
        </button>
        {customResult && (
          <div className="mt-3">
            <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(customResult, null, 2)}
            </pre>
          </div>
        )}

        <hr className="border-gray-700 my-4" />
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Batch URL Check</h3>
        <p className="text-gray-400 text-sm mb-3">Enter one URL per line (max 500). All URLs will be checked simultaneously.</p>
        <textarea
          value={batchUrls}
          onChange={e => setBatchUrls(e.target.value)}
          placeholder={"https://example.com\nhttps://evil-phishing.com\nhttps://facebook.com"}
          rows={6}
          className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm font-mono"
        />
        <button
          onClick={runBatchCheck}
          disabled={batchLoading || !batchUrls.trim()}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 disabled:opacity-50"
        >
          {batchLoading ? 'Checking...' : 'Run Batch Check'}
        </button>
        {batchResult && (
          <div className="mt-4">
            {batchResult.summary && (
              <div className="flex flex-wrap gap-3 mb-3 text-sm">
                <span className="text-white">Total: {batchResult.summary.total}</span>
                <span className="text-red-400">Malicious: {batchResult.summary.known_malicious}</span>
                <span className="text-orange-400">High: {batchResult.summary.high_risk}</span>
                <span className="text-yellow-400">Medium: {batchResult.summary.medium_risk}</span>
                <span className="text-green-400">Low: {batchResult.summary.low_risk}</span>
                <span className="text-gray-400">Unknown: {batchResult.summary.unknown}</span>
              </div>
            )}
            <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(batchResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
