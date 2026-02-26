"use client"
import { useState, useEffect } from "react"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, FileText, Search, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"

interface AnalysisResult {
  id: string
  eventId: string
  verdict: string
  confidence: number
  reasoning: string
  recommendation: string
  analyzedAt: string
  reviewedBy?: string
  reviewedAt?: string
  socOverride?: string
  socNotes?: string
}

interface SyslogEvent {
  id: string
  timestamp: string
  facility: string
  severity: string
  host: string
  message: string
  raw: string
}

interface SyslogAnalysis {
  id: string
  fileName: string
  filePath: string
  analyzedAt: string
  totalEvents: number
  falsePositives: number
  truePositives: number
  needsReview: number
  events: SyslogEvent[]
  results: AnalysisResult[]
  status: string
}

const verdictConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  false_positive: { label: 'False Positive', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle },
  true_positive: { label: 'True Positive', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle },
  needs_review: { label: 'Needs Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle },
}

export function SocReviewPage() {
  const [analyses, setAnalyses] = useState<SyslogAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<SyslogAnalysis | null>(null)
  const [filter, setFilter] = useState<'all' | 'false_positive' | 'true_positive' | 'needs_review'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  useEffect(() => { fetchAnalyses() }, [])

  async function fetchAnalyses() {
    setLoading(true)
    try {
      const r = await fetch('/api/syslog-analysis?action=results')
      if (r.ok) {
        const d = await r.json()
        setAnalyses(d.analyses || [])
        if (d.analyses?.length > 0 && !selectedAnalysis) setSelectedAnalysis(d.analyses[d.analyses.length - 1])
      }
    } catch {}
    finally { setLoading(false) }
  }

  async function handleOverride(analysisId: string, resultId: string, verdict: string, notes: string) {
    try {
      const r = await fetch('/api/syslog-analysis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, resultId, socOverride: verdict, socNotes: notes, reviewedBy: 'SOC Analyst' }),
      })
      if (r.ok) fetchAnalyses()
    } catch {}
  }

  function toggleEvent(id: string) {
    setExpandedEvents(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filteredResults = selectedAnalysis?.results.filter(r => {
    if (filter !== 'all' && (r.socOverride || r.verdict) !== filter) return false
    if (searchTerm) {
      const evt = selectedAnalysis.events.find(e => e.id === r.eventId)
      if (!evt?.raw.toLowerCase().includes(searchTerm.toLowerCase()) && !r.reasoning.toLowerCase().includes(searchTerm.toLowerCase())) return false
    }
    return true
  }) || []

  return (
    <>
      <PageHeader badge="SOC Review" headline="Syslog Analysis Dashboard" subheadline="AI-powered false positive detection for SOC analysts" />
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-6">
          {/* Stats Summary */}
          {selectedAnalysis && (
            <AnimateIn>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Events', value: selectedAnalysis.totalEvents, icon: FileText, color: 'text-cyan-400' },
                  { label: 'False Positives', value: selectedAnalysis.falsePositives, icon: CheckCircle, color: 'text-green-400' },
                  { label: 'True Positives', value: selectedAnalysis.truePositives, icon: XCircle, color: 'text-red-400' },
                  { label: 'Needs Review', value: selectedAnalysis.needsReview, icon: AlertTriangle, color: 'text-yellow-400' },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </AnimateIn>
          )}

          {/* Analysis Selector + Filters */}
          <AnimateIn delay={100}>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <select value={selectedAnalysis?.id || ''} onChange={e => setSelectedAnalysis(analyses.find(a => a.id === e.target.value) || null)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none">
                {analyses.map(a => (
                  <option key={a.id} value={a.id}>{a.fileName} - {new Date(a.analyzedAt).toLocaleDateString()}</option>
                ))}
              </select>
              <div className="flex gap-2">
                {(['all', 'false_positive', 'true_positive', 'needs_review'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    {f === 'all' ? 'All' : verdictConfig[f]?.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search events..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <button onClick={fetchAnalyses} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </AnimateIn>

          {/* Results List */}
          <AnimateIn delay={200}>
            {loading ? (
              <div className="text-center py-12 text-zinc-500">Loading analysis results...</div>
            ) : analyses.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500">No syslog analyses available yet.</p>
                <p className="text-zinc-600 text-sm mt-2">Upload syslog files via Admin and run analysis.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResults.map(result => {
                  const evt = selectedAnalysis?.events.find(e => e.id === result.eventId)
                  const vc = verdictConfig[result.socOverride || result.verdict] || verdictConfig.needs_review
                  const VIcon = vc.icon
                  const isExpanded = expandedEvents.has(result.id)
                  return (
                    <div key={result.id} className={`rounded-xl border ${vc.bg} p-4 transition-all`}>
                      <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleEvent(result.id)}>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-400 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-400 mt-1 shrink-0" />}
                        <VIcon className={`h-5 w-5 ${vc.color} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${vc.bg} ${vc.color}`}>{vc.label}</span>
                            <span className="text-xs text-zinc-500">Confidence: {result.confidence}%</span>
                            {result.reviewedBy && <span className="text-xs text-cyan-400">Reviewed by {result.reviewedBy}</span>}
                          </div>
                          <p className="text-sm text-zinc-300 mt-1 truncate">{evt?.raw || 'Event data unavailable'}</p>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 ml-12 space-y-3">
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <div className="text-xs text-zinc-500 mb-1">Raw Event</div>
                            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all font-mono">{evt?.raw}</pre>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><div className="text-xs text-zinc-500 mb-1">AI Reasoning</div><p className="text-sm text-zinc-300">{result.reasoning}</p></div>
                            <div><div className="text-xs text-zinc-500 mb-1">Recommendation</div><p className="text-sm text-zinc-300">{result.recommendation}</p></div>
                          </div>
                          {evt && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div><span className="text-zinc-500">Host:</span> <span className="text-zinc-300">{evt.host}</span></div>
                              <div><span className="text-zinc-500">Facility:</span> <span className="text-zinc-300">{evt.facility}</span></div>
                              <div><span className="text-zinc-500">Severity:</span> <span className="text-zinc-300">{evt.severity}</span></div>
                              <div><span className="text-zinc-500">Time:</span> <span className="text-zinc-300">{evt.timestamp}</span></div>
                            </div>
                          )}
                          {result.socNotes && <div><div className="text-xs text-zinc-500 mb-1">SOC Notes</div><p className="text-sm text-cyan-300">{result.socNotes}</p></div>}
                          <div className="flex gap-2 pt-2 border-t border-zinc-700/50">
                            <button onClick={() => handleOverride(selectedAnalysis!.id, result.id, 'false_positive', '')} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium">Mark False Positive</button>
                            <button onClick={() => handleOverride(selectedAnalysis!.id, result.id, 'true_positive', '')} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium">Mark True Positive</button>
                            <button onClick={() => { const n = prompt('SOC Notes:'); if (n) handleOverride(selectedAnalysis!.id, result.id, result.socOverride || result.verdict, n) }} className="bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium">Add Notes</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {filteredResults.length === 0 && <div className="text-center py-8 text-zinc-500">No events match your filters.</div>}
              </div>
            )}
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
