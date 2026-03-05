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
      const pass = status.toLowerCase().includes(scenario.expect.toLowerCase()) ||
        JSON.stringify(data).toLowerCase().includes(scenario.expect.toLowerCase());
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

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  return (
    <div className="mt-8 border border-emerald-700 rounded-xl p-6 bg-gray-900/80">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-white">Cloud SWG Live Testing Console</h2>
        <div className="flex gap-2">
          <button onClick={fetchStatus} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Service Status</button>
          <button onClick={fetchPac} className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-600">View PAC File</button>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-4">Real API-based testing: Web Proxy + Web DLP + Network DLP + URL Filtering + SSL Inspection</p>

      {swgStatus && (
        <div className="mb-4 bg-gray-800 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${swgStatus.status === 'operational' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-white font-medium">{swgStatus.service} v{swgStatus.version}</span>
          </div>
          <div className="text-gray-400">Capabilities: {swgStatus.capabilities?.join(', ')}</div>
          <div className="text-gray-400">Proxy Nodes: {swgStatus.proxyNodes?.map((n: any) => `${n.location} (${n.status})`).join(' | ')}</div>
        </div>
      )}

      {pacVisible && (
        <div className="mb-4 bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 font-medium text-sm">PAC File (https://next-guard.com/api/pac)</span>
            <button onClick={() => setPacVisible(false)} className="text-gray-500 text-xs">Close</button>
          </div>
          <pre className="text-green-400 text-xs overflow-auto max-h-48 whitespace-pre-wrap">{pacContent}</pre>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={runAllTests} disabled={running}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${running ? 'bg-gray-600 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
          {running ? `Running... (${results.length}/${TEST_SCENARIOS.length})` : 'Run All Tests'}
        </button>
        {results.length > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400">Pass: {passed}</span>
            <span className="text-red-400">Fail: {failed}</span>
            <span className="text-gray-400">Total: {results.length}</span>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="mb-6 space-y-1">
          {TEST_SCENARIOS.map(sc => {
            const r = results.find(x => x.id === sc.id);
            const isActive = activeTest === sc.id;
            return (
              <div key={sc.id} className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${isActive ? 'bg-yellow-900/30' : r ? (r.pass ? 'bg-green-900/20' : 'bg-red-900/20') : 'bg-gray-800/50'}`}>
                <span className="w-5 text-center">
                  {isActive ? '\u23F3' : r ? (r.pass ? '\u2705' : '\u274C') : '\u2B1C'}
                </span>
                <span className="text-gray-300 flex-1">{sc.name}</span>
                <span className={`text-xs font-mono ${r?.pass ? 'text-green-400' : r ? 'text-red-400' : 'text-gray-600'}`}>
                  {r ? `${r.status} (${r.latency}ms)` : 'pending'}
                </span>
                <span className="text-gray-500 text-xs">expect: {sc.expect}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-white mb-3">Custom Test</h3>
        <div className="flex gap-2 mb-3">
          {['dlp-scan', 'proxy', 'url-check'].map(m => (
            <button key={m} onClick={() => setCustomMode(m)}
              className={`px-3 py-1 rounded text-sm ${customMode === m ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {m === 'dlp-scan' ? 'Network DLP Scan' : m === 'proxy' ? 'Web Proxy' : 'URL Check'}
            </button>
          ))}
        </div>
        {(customMode === 'proxy' || customMode === 'url-check') && (
          <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
            placeholder="https://target-url.com" className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm" />
        )}
        {customMode === 'dlp-scan' && (
          <textarea value={customContent} onChange={e => setCustomContent(e.target.value)}
            placeholder="Paste content to scan for sensitive data..." rows={3}
            className="w-full mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm" />
        )}
        <button onClick={runCustomTest} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500">
          {customResult && (
          <div className="mt-3 space-y-2">
            {/* URL Check 專用可視化面板 */}
            {customMode === 'url-check' ? (
              <div className="bg-gray-800 rounded-lg p-4 text-sm">
                {/* Risk Level Banner */}
                <div className={`flex items-center gap-3 p-3 rounded-lg mb-3 ${
                  customResult.risk_level === 'known_malicious' ? 'bg-red-900/50 border border-red-600' :
                  customResult.risk_level === 'high_risk' ? 'bg-orange-900/50 border border-orange-600' :
                  customResult.risk_level === 'medium_risk' ? 'bg-yellow-900/50 border border-yellow-600' :
                  customResult.risk_level === 'low_risk' ? 'bg-green-900/50 border border-green-600' :
                  'bg-gray-700 border border-gray-600'
                }`}>
                  <span className="text-2xl">
                    {customResult.risk_level === 'known_malicious' ? '🔴' :
                     customResult.risk_level === 'high_risk' ? '🟠' :
                     customResult.risk_level === 'medium_risk' ? '🟡' :
                     customResult.risk_level === 'low_risk' ? '🟢' : '⚪'}
                  </span>
                  <div>
                    <div className="text-white font-bold text-base">
                      {customResult.risk_level?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                    </div>
                    <div className="text-gray-300 text-xs">{customResult.url}</div>
                  </div>
                </div>
                {/* Categories & Flags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {customResult.categories?.map((c: string) => (
                    <span key={c} className="px-2 py-0.5 bg-blue-800 text-blue-200 rounded text-xs font-mono">{c}</span>
                  ))}
                  {customResult.flags?.map((f: string) => (
                    <span key={f} className="px-2 py-0.5 bg-purple-800 text-purple-200 rounded text-xs font-mono">{f}</span>
                  ))}
                </div>
                {/* Reason */}
                {customResult.reason && (
                  <div className="text-gray-300 text-xs mb-3 p-2 bg-gray-700 rounded">
                    <span className="text-gray-500">Reason: </span>{customResult.reason}
                  </div>
                )}
                {/* Sources */}
                {customResult.sources?.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-xs font-semibold mb-1">THREAT INTEL SOURCES</div>
                    <div className="space-y-1">
                      {customResult.sources.map((src: any) => (
                        <div key={src.name} className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                          src.hit ? 'bg-red-900/40 border border-red-800' : 'bg-gray-700'
                        }`}>
                          <span className="text-gray-300 font-mono">{src.name}</span>
                          <div className="flex items-center gap-2">
                            {src.hit && src.categories?.map((c: string) => (
                              <span key={c} className="text-orange-300">{c}</span>
                            ))}
                            <span className={src.hit ? 'text-red-400 font-bold' : 'text-gray-500'}>
                              {src.hit ? '● HIT' : '○ miss'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Feed Status */}
                {customResult.feedStatus && (
                  <div className="mt-3 text-xs text-gray-500">
                    Feed counts — URLhaus: {customResult.feedStatus.counts?.urlhaus} | Phishing Army: {customResult.feedStatus.counts?.phishingArmy} | OpenPhish: {customResult.feedStatus.counts?.openphish} | Local IOC: {customResult.feedStatus.counts?.localIoc}
                  </div>
                )}
              </div>
            ) : (
              <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(customResult, null, 2)}
              </pre>
            )}
          </div>
        )}
        )}
      </div>
    </div>
  );
}
