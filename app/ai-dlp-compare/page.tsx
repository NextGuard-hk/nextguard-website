'use client'
import { useState } from 'react'

const SAMPLES = [
  { name: 'Standard PII', content: 'Customer Record:\nName: John Chan Wing Kei\nHKID: A123456(7)\nPhone: +852 6789 0000\nCredit Card: 5407 1234 5678 9012\nEmail: john.chan@example.com' },
  { name: 'Obfuscated PII', content: 'Jo&&@hn Ch&&@an W&&@ing K&&@ei\nHK&&@ID: A1&&@23&&@456(7)\n+85&&@2 678&&@9 00&&@00\n54&&@07 12&&@34 56&&@78 90&&@12' },
  { name: 'Sensitive Keywords', content: 'CONFIDENTIAL - This document is classified as SECRET.\nDo not distribute. Internal only.\nPassword: Admin123!' },
  { name: 'Financial Data', content: 'Wire Transfer: HKD 2,500,000\nAccount: 012-345-678901-234\nSWIFT: HSBCHKHH\nAuthorized by CFO James Wong (Staff ID: FIN-0042)' },
  { name: 'Clean Text', content: 'Q4 2025 Performance Summary:\nRevenue grew 15.3% YoY to HKD 127M.\nNew enterprise clients: 23.\nCustomer retention: 94.2%.' },
]

export default function AICompare() {
  const [content, setContent] = useState('')
  const [perplexityResult, setPerplexityResult] = useState<any>(null)
  const [cloudflareResult, setCloudflareResult] = useState<any>(null)
  const [perplexityLoading, setPerplexityLoading] = useState(false)
  const [cloudflareLoading, setCloudflareLoading] = useState(false)
  const [perplexityLatency, setPerplexityLatency] = useState<number | null>(null)
  const [cloudflareLatency, setCloudflareLatency] = useState<number | null>(null)
  const [perplexityError, setPerplexityError] = useState('')
  const [cloudflareError, setCloudflareError] = useState('')

  async function runCompare() {
    if (!content.trim()) return
    setPerplexityResult(null); setCloudflareResult(null)
    setPerplexityLatency(null); setCloudflareLatency(null)
    setPerplexityError(''); setCloudflareError('')
    setPerplexityLoading(true); setCloudflareLoading(true)

    // Run both in parallel
    ;(async () => {
      const start = Date.now()
      try {
        const res = await fetch('/api/ai-dlp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, mode: 'ai' })
        })
        const data = await res.json()
        setPerplexityLatency(Date.now() - start)
        setPerplexityResult(data)
      } catch (e: any) { setPerplexityError(e.message) }
      finally { setPerplexityLoading(false) }
    })()

    ;(async () => {
      const start = Date.now()
      try {
        const res = await fetch('/api/ai-dlp-cloudflare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })
        const data = await res.json()
        setCloudflareLatency(data.latency_ms || (Date.now() - start))
        setCloudflareResult(data)
      } catch (e: any) { setCloudflareError(e.message) }
      finally { setCloudflareLoading(false) }
    })()
  }

  function ResultCard({ title, result, loading, error, latency, color, icon }: any) {
    return (
      <div className={`bg-zinc-900 border rounded-xl p-6 ${color}`}>
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">{icon} {title}</h3>
        {latency !== null && (
          <div className={`text-2xl font-mono font-bold mb-3 ${latency < 3000 ? 'text-green-400' : latency < 8000 ? 'text-yellow-400' : 'text-red-400'}`}>
            {(latency / 1000).toFixed(2)}s
            <span className="text-sm font-normal text-zinc-400 ml-2">({latency}ms)</span>
          </div>
        )}
        {loading && <div className="text-cyan-400 animate-pulse text-lg">Analyzing...</div>}
        {error && <div className="text-red-400">{error}</div>}
        {result && !loading && (
          <div>
            <div className={`text-lg font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
              {result.detected ? '\u26a0\ufe0f DETECTED' : '\u2705 CLEAN'}
            </div>
            {result.risk_level && <div className="text-sm text-zinc-400 mt-1">Risk: <span className="text-white font-bold">{result.risk_level?.toUpperCase()}</span></div>}
            {result.summary && <p className="text-sm text-zinc-300 mt-2">{result.summary}</p>}
            {result.evasion_detected && <div className="text-yellow-400 text-sm mt-1 font-bold">Evasion Detected!</div>}
            {result.findings && result.findings.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-zinc-500 mb-1">Findings ({result.findings.length}):</div>
                {result.findings.slice(0, 8).map((f: any, i: number) => (
                  <div key={i} className="text-xs bg-zinc-800 rounded p-2 mb-1">
                    <span className="text-cyan-400 font-bold">{f.type}</span>
                    {f.original_text && <span className="text-zinc-400"> - {f.original_text}</span>}
                    {f.decoded_value && <span className="text-green-400"> = {f.decoded_value}</span>}
                    {f.confidence !== undefined && <span className="text-zinc-500"> ({f.confidence}%)</span>}
                  </div>
                ))}
              </div>
            )}
            {result.method && <div className="text-xs text-zinc-600 mt-2">{result.method}</div>}
          </div>
        )}
        {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
      </div>
    )
  }

  const speedDiff = perplexityLatency && cloudflareLatency
    ? ((perplexityLatency - cloudflareLatency) / perplexityLatency * 100).toFixed(0)
    : null

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">AI DLP Latency Comparison</h1>
          <h2 className="text-xl text-zinc-300 mt-2">Perplexity Sonar (Cloud) vs Cloudflare Workers AI (Edge)</h2>
          <p className="text-zinc-500 mt-1">Side-by-side comparison showing response time and detection accuracy</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => { setContent(s.content); setPerplexityResult(null); setCloudflareResult(null); setPerplexityLatency(null); setCloudflareLatency(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${content === s.content ? 'bg-cyan-700 text-white ring-2 ring-cyan-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>{s.name}</button>
          ))}
        </div>

        <textarea value={content} onChange={e => setContent(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none font-mono text-sm min-h-[100px] mb-4"
          placeholder="Select a sample or paste content to compare AI engines..." />

        <button onClick={runCompare} disabled={!content.trim() || perplexityLoading || cloudflareLoading}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold transition-colors mb-6">
          {perplexityLoading || cloudflareLoading ? 'Comparing...' : 'Compare AI Engines'}
        </button>

        {speedDiff && Number(speedDiff) > 0 && (
          <div className="bg-gradient-to-r from-green-900/50 to-cyan-900/50 border border-green-700 rounded-xl p-4 mb-6 text-center">
            <div className="text-2xl font-bold text-green-400">Cloudflare Workers AI is ~{speedDiff}% faster</div>
            <div className="text-sm text-zinc-400">Perplexity: {((perplexityLatency || 0) / 1000).toFixed(2)}s vs Cloudflare: {((cloudflareLatency || 0) / 1000).toFixed(2)}s</div>
          </div>
        )}
        {speedDiff && Number(speedDiff) <= 0 && (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700 rounded-xl p-4 mb-6 text-center">
            <div className="text-2xl font-bold text-blue-400">Perplexity Sonar is ~{Math.abs(Number(speedDiff))}% faster this time</div>
            <div className="text-sm text-zinc-400">Perplexity: {((perplexityLatency || 0) / 1000).toFixed(2)}s vs Cloudflare: {((cloudflareLatency || 0) / 1000).toFixed(2)}s</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResultCard title="Perplexity Sonar" result={perplexityResult} loading={perplexityLoading} error={perplexityError} latency={perplexityLatency} color="border-purple-700" icon="\ud83c\udf10" />
          <ResultCard title="Cloudflare Workers AI" result={cloudflareResult} loading={cloudflareLoading} error={cloudflareError} latency={cloudflareLatency} color="border-orange-700" icon="\u26a1" />
        </div>

        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Architecture Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-purple-400 font-bold mb-2">\ud83c\udf10 Perplexity Sonar (Cloud AI)</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- Cloud-hosted LLM with internet access</li>
                <li>- Higher accuracy for complex evasion</li>
                <li>- Higher latency (5-15 seconds typical)</li>
                <li>- Pay per token pricing</li>
                <li className="text-yellow-400">- Best for: Deep analysis, compliance auditing</li>
              </ul>
            </div>
            <div>
              <h4 className="text-orange-400 font-bold mb-2">\u26a1 Cloudflare Workers AI (Edge)</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- Edge-deployed Llama 3.1 8B model</li>
                <li>- Lower latency (1-5 seconds typical)</li>
                <li>- Runs on Cloudflare global network</li>
                <li>- Free tier: 10,000 neurons/day</li>
                <li className="text-green-400">- Best for: Real-time DLP, endpoint agents</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/ai-dlp-demo" className="text-cyan-400 hover:text-cyan-300 text-sm">\u2190 Back to Full AI DLP Demo</a>
        </div>
      </div>
    </div>
  )
}
