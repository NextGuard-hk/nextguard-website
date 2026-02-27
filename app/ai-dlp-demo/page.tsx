'use client'
import { useState } from 'react'

const SAMPLES = [
  { name: 'Normal PII', content: 'Customer: John Chan\nPhone: +852 6789 0000\nCredit Card: 5407 1234 5678 9012\nEmail: john.chan@example.com' },
  { name: 'Obfuscated PII (Evasion)', content: 'Jo&&@hn Ch&&@an +85&&@2 678&&@9 0000 54&&@07 12&&@34 56&&@78 90&&@12' },
  { name: 'Mixed Evasion', content: 'N-a-m-e: J*o*h*n C#h#a#n\nP.h.o" + "n.e: +8_5_2 6_7_8_9 0_0_0_0\nC.C: 5~4~0~7 1~2~3~4 5~6~7~8 9~0~1~2' },
  { name: 'Clean Text (No PII)', content: 'The quarterly report shows revenue growth of 15% in APAC region.\nNew product launch scheduled for Q3.' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultPanel({ title, result, loading, error, color }: { title: string; result: any; loading: boolean; error: string; color: string }) {
  if (loading) return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-lg font-bold mb-4 ${color}`}>{title}</h3>
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 animate-pulse">Analyzing...</div>
      </div>
    </div>
  )
  if (error) return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-lg font-bold mb-4 ${color}`}>{title}</h3>
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">{error}</div>
    </div>
  )
  if (!result) return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-lg font-bold mb-4 ${color}`}>{title}</h3>
      <div className="text-zinc-500 text-center py-16">Click &quot;Scan Content&quot; to analyze</div>
    </div>
  )
  const isTraditional = title.includes('Traditional')
  return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-lg font-bold mb-4 ${color}`}>{title}</h3>
      <div className={`rounded-lg p-4 mb-4 ${result.detected ? 'bg-red-900/30 border border-red-700' : 'bg-green-900/30 border border-green-700'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-2xl ${result.detected ? 'text-red-400' : 'text-green-400'}`}>{result.detected ? '\u26A0\uFE0F' : '\u2705'}</span>
          <span className={`text-xl font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>{result.verdict || (result.detected ? 'DETECTED' : 'CLEAN')}</span>
        </div>
        {result.method && <div className="text-xs text-zinc-400 mb-2">Method: {result.method}</div>}
        {!isTraditional && result.risk_level && <div className="text-sm text-zinc-300 mb-1">Risk Level: <span className={`font-bold ${result.risk_level === 'critical' ? 'text-red-400' : result.risk_level === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>{result.risk_level?.toUpperCase()}</span></div>}
        {!isTraditional && result.evasion_detected && <div className="text-sm text-orange-400 font-bold mb-1">\u26A0\uFE0F Evasion Technique Detected!</div>}
        {!isTraditional && result.summary && <div className="text-sm text-zinc-300 mt-2">{result.summary}</div>}
        {isTraditional && !result.detected && <div className="text-sm text-zinc-300 mt-2">No pattern matches found. Content appears clean.</div>}
        {isTraditional && result.totalMatches !== undefined && <div className="text-sm text-zinc-300">Total Matches: {result.totalMatches}</div>}
      </div>
      {result.findings && result.findings.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-zinc-300 mb-2">Findings ({result.findings.length}):</div>
          {result.findings.map((f: any, i: number) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
              {isTraditional ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-cyan-400">{f.rule}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${f.action === 'BLOCK' ? 'bg-red-600 text-white' : f.action === 'QUARANTINE' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-black'}`}>{f.action}</span>
                  </div>
                  <div className="text-xs text-zinc-400">Type: {f.type}</div>
                  <div className="text-xs text-zinc-300 mt-1">Matches: {f.matches?.join(', ')}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-cyan-400">{f.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${f.action === 'BLOCK' ? 'bg-red-600 text-white' : f.action === 'QUARANTINE' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-black'}`}>{f.action}</span>
                  </div>
                  {f.original_text && <div className="text-xs text-zinc-400">Found: <code className="bg-zinc-900 px-1 rounded">{f.original_text}</code></div>}
                  {f.decoded_value && <div className="text-xs text-green-400 mt-1">Decoded: <code className="bg-zinc-900 px-1 rounded font-bold">{f.decoded_value}</code></div>}
                  {f.confidence !== undefined && <div className="text-xs text-zinc-400 mt-1">Confidence: {f.confidence}%</div>}
                  {f.evasion_technique && f.evasion_technique !== 'none' && <div className="text-xs text-orange-400 mt-1">Evasion: {f.evasion_technique}</div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AIDLPDemo() {
  const [content, setContent] = useState('')
  const [tradResult, setTradResult] = useState<any>(null)
  const [aiResult, setAiResult] = useState<any>(null)
  const [tradLoading, setTradLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [tradError, setTradError] = useState('')
  const [aiError, setAiError] = useState('')

  async function runScan() {
    if (!content.trim()) return
    setTradResult(null); setAiResult(null)
    setTradError(''); setAiError('')
    setTradLoading(true); setAiLoading(true)
    try {
      const r1 = await fetch('/api/ai-dlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, mode: 'traditional' }) })
      const d1 = await r1.json()
      setTradResult(d1)
    } catch (e: any) { setTradError(e.message) } finally { setTradLoading(false) }
    try {
      const r2 = await fetch('/api/ai-dlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, mode: 'ai' }) })
      const d2 = await r2.json()
      setAiResult(d2)
    } catch (e: any) { setAiError(e.message) } finally { setAiLoading(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <span className="inline-block bg-cyan-900/50 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full mb-4">AI DLP Demo</span>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Traditional DLP vs AI-Powered DLP</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">See how traditional pattern-based DLP fails to detect obfuscated PII, while AI LLM detection identifies evasion attempts</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {SAMPLES.map((s, i) => (
              <button key={i} onClick={() => setContent(s.content)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm transition-colors">{s.name}</button>
            ))}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none font-mono text-sm min-h-[120px] mb-4" placeholder="Enter or paste content to scan for PII..." />
          <button onClick={runScan} disabled={!content.trim() || tradLoading || aiLoading} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold transition-colors">{tradLoading || aiLoading ? 'Scanning...' : 'Scan Content'}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <ResultPanel title="Traditional DLP (Pattern-Based)" result={tradResult} loading={tradLoading} error={tradError} color="text-orange-400" />
          </div>
          <div className="bg-zinc-900 border border-cyan-800 rounded-xl p-6">
            <ResultPanel title="AI LLM Detection (NextGuard)" result={aiResult} loading={aiLoading} error={aiError} color="text-cyan-400" />
          </div>
        </div>
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-orange-400 font-bold mb-2">Traditional DLP</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- Uses Regex patterns to match credit cards, phones, IDs</li>
                <li>- Dictionary-based keyword matching</li>
                <li>- Phrase detection for known patterns</li>
                <li className="text-red-400 font-bold">- CANNOT detect obfuscated data (e.g., Jo&&@hn)</li>
                <li className="text-red-400 font-bold">- Easily bypassed with character insertion</li>
              </ul>
            </div>
            <div>
              <h4 className="text-cyan-400 font-bold mb-2">AI-Powered DLP (NextGuard)</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- Uses LLM to understand context and meaning</li>
                <li>- Detects PII even with obfuscation characters</li>
                <li>- Identifies evasion techniques automatically</li>
                <li className="text-green-400 font-bold">- CAN detect Jo&&@hn as &quot;John&quot;</li>
                <li className="text-green-400 font-bold">- Understands intent, not just patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
