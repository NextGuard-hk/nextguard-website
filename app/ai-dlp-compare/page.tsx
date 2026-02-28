'use client'
import { useState } from 'react'

const SAMPLES = [
  { name: 'Standard PII', content: 'Customer Record:\nName: John Chan Wing Kei\nHKID: A123456(7)\nPhone: +852 6789 0000\nCredit Card: 5407 1234 5678 9012\nEmail: john.chan@example.com' },
  { name: 'Obfuscated PII', content: 'Jo&&@hn Ch&&@an W&&@ing K&&@ei\nHK&&@ID: A1&&@23&&@456(7)\n+85&&@2 678&&@9 00&&@00\n54&&@07 12&&@34 56&&@78 90&&@12' },
  { name: 'Sensitive Keywords', content: 'CONFIDENTIAL - This document is classified as SECRET.\nDo not distribute. Internal only.\nPassword: Admin123!' },
  { name: 'Financial Data', content: 'Wire Transfer: HKD 2,500,000\nBeneficiary: Chan Wing Kei Holdings\nAccount: 012-345-678901-234\nSWIFT: HSBCHKHH\nAuthorized by CFO James Wong\nEmail: james.wong@example.com' },
  { name: 'Base64 Encoded', content: 'Please process this customer record:\nData: Sm9obiBDaGFuLCBIS0lEOiBBMTIzNDU2KDcpLCBDQzogNTQwNy0xMjM0LTU2NzgtOTAxMg==\n(This is base64 encoded PII that pattern-based DLP cannot read)' },
  { name: 'Clean Text', content: 'Q4 2025 Performance Summary:\nRevenue grew 15.3% YoY to HKD 127M.\nNew enterprise clients: 23.\nCustomer retention: 94.2%.\nNo material compliance incidents reported.' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TradResultCard({ result, loading, error, latency }: any) {
  return (
    <div className="bg-zinc-900 border border-orange-600 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-1">Traditional DLP (Regex + Dictionary)</h3>
      {latency !== null && (
        <div className="text-2xl font-mono font-bold mb-3 text-green-400">
          {latency < 1 ? '<1' : latency}ms
          <span className="text-sm font-normal text-zinc-400 ml-2">(instant)</span>
        </div>
      )}
      {loading && <div className="text-cyan-400 animate-pulse">Scanning...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {result && !loading && (
        <div>
          <div className={`text-lg font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
            {result.detected ? '\u26a0\ufe0f VIOLATION DETECTED' : '\u2705 CLEAN'}
          </div>
          <div className="text-sm text-zinc-400 mt-1">Method: {result.method}</div>
          {result.totalMatches !== undefined && <div className="text-sm text-zinc-400">Total Matches: {result.totalMatches}</div>}
          {result.findings && result.findings.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-zinc-500 mb-1">Findings ({result.findings.length}):</div>
              {result.findings.map((f: any, i: number) => (
                <div key={i} className="text-xs bg-zinc-800 rounded p-2 mb-1">
                  <span className="text-orange-400 font-bold">{f.rule}</span>
                  <span className={`ml-2 px-1 rounded text-xs ${f.action === 'BLOCK' ? 'bg-red-900 text-red-300' : f.action === 'QUARANTINE' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{f.action}</span>
                  <span className="text-zinc-500 ml-1">({f.severity})</span>
                  <div className="text-zinc-400 mt-0.5">Matches: {f.matches?.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
          {!result.detected && <div className="text-zinc-500 mt-2">No pattern matches found.</div>}
        </div>
      )}
      {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AIResultCard({ title, color, result, loading, error, latency }: any) {
  return (
    <div className={`bg-zinc-900 border ${color} rounded-xl p-6`}>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      {latency !== null && (
        <div className="text-2xl font-mono font-bold mb-3 text-white">
          {latency < 1000 ? latency + 'ms' : (latency / 1000).toFixed(2) + 's'}
        </div>
      )}
      {loading && <div className="text-cyan-400 animate-pulse">Analyzing with AI...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {result && !loading && (
        <div>
          <div className={`text-lg font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
            {result.detected ? '\u26a0\ufe0f VIOLATION DETECTED' : '\u2705 CLEAN'}
          </div>
          {result.confidence && <div className="text-sm text-zinc-400 mt-1">Confidence: {result.confidence}</div>}
          {result.categories && result.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {result.categories.map((c: string, i: number) => (
                <span key={i} className="text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-0.5">{c}</span>
              ))}
            </div>
          )}
          {result.reasoning && (
            <div className="mt-3 text-xs text-zinc-400 bg-zinc-800 rounded p-3 max-h-40 overflow-y-auto">
              {result.reasoning}
            </div>
          )}
        </div>
      )}
      {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
    </div>
  )
}

export default function ComparePage() {
  const [text, setText] = useState('')
  const [tradResult, setTradResult] = useState<any>(null)
  const [tradLoading, setTradLoading] = useState(false)
  const [tradError, setTradError] = useState('')
  const [tradLatency, setTradLatency] = useState<number | null>(null)
  const [pplxResult, setPplxResult] = useState<any>(null)
  const [pplxLoading, setPplxLoading] = useState(false)
  const [pplxError, setPplxError] = useState('')
  const [pplxLatency, setPplxLatency] = useState<number | null>(null)
  const [cfResult, setCfResult] = useState<any>(null)
  const [cfLoading, setCfLoading] = useState(false)
  const [cfError, setCfError] = useState('')
  const [cfLatency, setCfLatency] = useState<number | null>(null)

  const runCompare = async () => {
    if (!text.trim()) return
    setTradResult(null); setTradError(''); setTradLatency(null); setTradLoading(true)
    setPplxResult(null); setPplxError(''); setPplxLatency(null); setPplxLoading(true)
    setCfResult(null); setCfError(''); setCfLatency(null); setCfLoading(true)

    // Run all 3 engines in PARALLEL so timing is accurate
    const tradPromise = (async () => {
      const t0 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp-traditional', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })
        const data = await res.json()
        setTradLatency(Math.round(performance.now() - t0))
        setTradResult(data)
      } catch { setTradError('Traditional DLP scan failed') }
      setTradLoading(false)
    })()

    const pplxPromise = (async () => {
      const t1 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })
        const data = await res.json()
        setPplxLatency(Math.round(performance.now() - t1))
        setPplxResult(data)
      } catch { setPplxError('Perplexity API error') }
      setPplxLoading(false)
    })()

    const cfPromise = (async () => {
      const t2 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp-cloudflare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) })
        const data = await res.json()
        setCfLatency(Math.round(performance.now() - t2))
        setCfResult(data)
      } catch { setCfError('Cloudflare AI error') }
      setCfLoading(false)
    })()

    await Promise.all([tradPromise, pplxPromise, cfPromise])
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">NextGuard DLP Engine Comparison</h1>
        <p className="text-zinc-400 mb-6">Compare Traditional DLP vs AI-Powered DLP (Perplexity Sonar vs Cloudflare Workers AI)</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLES.map((s) => (
            <button key={s.name} onClick={() => setText(s.content)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-3 py-1.5 transition">{s.name}</button>
          ))}
        </div>

        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste or type content to scan..." className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-cyan-500" />

        <button onClick={runCompare} disabled={!text.trim() || (tradLoading && pplxLoading && cfLoading)} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl mb-6 transition">
          Compare All 3 Engines
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TradResultCard result={tradResult} loading={tradLoading} error={tradError} latency={tradLatency} />
          <AIResultCard title="Perplexity Sonar (Cloud AI)" color="border-cyan-600" result={pplxResult} loading={pplxLoading} error={pplxError} latency={pplxLatency} />
          <AIResultCard title="Cloudflare Workers AI (Edge)" color="border-purple-600" result={cfResult} loading={cfLoading} error={cfError} latency={cfLatency} />
        </div>

        {tradLatency !== null && pplxLatency !== null && cfLatency !== null && (
          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Performance Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-mono font-bold text-green-400">{tradLatency < 1 ? '<1' : tradLatency}ms</div>
                <div className="text-sm text-zinc-400">Traditional DLP</div>
                <div className="text-xs text-orange-400 mt-1">Regex only - misses obfuscated data</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-cyan-400">{(pplxLatency / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Perplexity Sonar</div>
                <div className="text-xs text-cyan-400 mt-1">Cloud AI - high accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-purple-400">{(cfLatency / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Cloudflare Workers AI</div>
                <div className="text-xs text-purple-400 mt-1">Edge AI - faster inference</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-zinc-500 text-center">
              Traditional DLP is fastest but cannot detect obfuscated, encoded, or context-based violations. AI DLP catches what regex misses.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
